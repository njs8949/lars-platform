"""AI 문서·발표·코드 분석 API (/api/ai/*). 로컬 모델(Ollama)로 실제 생성한다. 로그인 토큰이 있어야 한다."""

import json
import os
from typing import Optional

import requests
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from src.api.auth_routes import verify_jwt_token
from src.core import usage_ledger
from src.core.llm_provider import is_production

router = APIRouter(prefix="/api/ai", tags=["ai"])
OLLAMA = "http://localhost:11434/api/chat"
MODEL = os.getenv("ASSISTANT_OLLAMA_MODEL", "gemma4:31b")
DOC_TYPES = {"report": "보고서", "memo": "메모", "proposal": "제안서", "summary": "요약문", "email": "이메일"}


def _auth(authorization: Optional[str]) -> None:
    token = (authorization or "").replace("Bearer ", "", 1).strip()
    if not token or not verify_jwt_token(token):
        raise HTTPException(status_code=401, detail="로그인이 필요합니다.")


def _ask(system: str, user: str, json_mode: bool = False, tokens: int = 2400) -> str:
    if is_production():
        from src.core.llm_provider import bedrock_complete, bedrock_model_name
        try:
            text, tin, tout = bedrock_complete([{"role": "system", "content": system}, {"role": "user", "content": user}], tokens)
        except Exception as err:
            raise HTTPException(status_code=503, detail=f"Bedrock 모델을 호출하지 못했습니다: {str(err)[:150]}")
        usage_ledger.record("bedrock", bedrock_model_name(), "ai", tin, tout)
        return text.strip(), tin + tout
    payload = {"model": MODEL, "think": False, "stream": False,
               "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
               "options": {"temperature": 0.4, "num_predict": tokens}}
    if json_mode:
        payload["format"] = "json"
    try:
        response = requests.post(OLLAMA, json=payload, timeout=600)
        response.raise_for_status()
    except requests.RequestException as err:
        raise HTTPException(status_code=503, detail=f"로컬 모델을 호출하지 못했습니다: {str(err)[:150]}")
    body = response.json()
    usage_ledger.record("ollama", MODEL, "ai", body.get("prompt_eval_count") or 0, body.get("eval_count") or 0)
    return (body.get("message", {}).get("content") or "").strip(), (body.get("prompt_eval_count") or 0) + (body.get("eval_count") or 0)


class DocumentRequest(BaseModel):
    title: str
    content_type: str = "report"
    prompt: str
    language: str = "ko"


class PresentationRequest(BaseModel):
    title: str
    topic: str
    num_slides: int = 8
    language: str = "ko"


class CodeRequest(BaseModel):
    code: str
    analysis_type: str = "general"
    language: str = "ko"


class MarkdownRequest(BaseModel):
    title: str
    content: str


@router.post("/generate/document")
async def generate_document(req: DocumentRequest, authorization: Optional[str] = Header(None)):
    _auth(authorization)
    if req.content_type not in DOC_TYPES:
        raise HTTPException(status_code=400, detail="지원하지 않는 문서 종류입니다.")
    if not req.prompt.strip():
        raise HTTPException(status_code=400, detail="요청 내용을 입력해 주세요.")
    system = (f"너는 전문 문서 작성자다. {DOC_TYPES[req.content_type]}를 마크다운으로 쓴다. "
              "제목은 #, 소제목은 ##으로 구분하고, 근거 없는 수치는 쓰지 않는다. "
              f"{'한국어' if req.language == 'ko' else 'English'}로 쓴다.")
    content, tokens = _ask(system, f"제목: {req.title}\n요청: {req.prompt}")
    return {"title": req.title, "content": content, "format": "markdown", "language": req.language,
            "type": req.content_type, "tokens_used": tokens}


@router.post("/generate/presentation")
async def generate_presentation(req: PresentationRequest, authorization: Optional[str] = Header(None)):
    _auth(authorization)
    if not req.topic.strip():
        raise HTTPException(status_code=400, detail="발표 주제를 입력해 주세요.")
    count = max(3, min(req.num_slides, 15))
    system = ('발표 자료를 JSON으로만 쓴다. 형식: {"slides": [{"title": "슬라이드 제목", "content": "핵심 내용 3문장 이내", '
              '"speaker_notes": "발표자 메모"}]}. ' f"슬라이드는 {count}장이다. "
              f"{'한국어' if req.language == 'ko' else 'English'}로 쓴다.")
    raw, tokens = _ask(system, f"제목: {req.title}\n주제: {req.topic}", json_mode=True, tokens=3000)
    try:
        slides_in = json.loads(raw).get("slides", [])
    except ValueError:
        raise HTTPException(status_code=502, detail="발표 구성을 만들지 못했습니다. 주제를 더 구체적으로 적어 주세요.")
    slides = []
    for i, s in enumerate(slides_in[:count], start=1):
        slides.append({"slide_num": i, "title": str(s.get("title", ""))[:120], "content": str(s.get("content", ""))[:800],
                       "speaker_notes": str(s.get("speaker_notes", ""))[:800]})
    if not slides:
        raise HTTPException(status_code=502, detail="슬라이드를 만들지 못했습니다.")
    return {"title": req.title, "slides": slides, "num_slides": len(slides), "language": req.language, "tokens_used": tokens}


@router.post("/analyze/code")
async def analyze_code(req: CodeRequest, authorization: Optional[str] = Header(None)):
    _auth(authorization)
    if not req.code.strip():
        raise HTTPException(status_code=400, detail="분석할 코드를 입력해 주세요.")
    focus = {"bugs": "버그", "improvements": "개선점", "security": "보안 문제", "performance": "성능 문제"}.get(req.analysis_type, "전반적인 품질")
    system = (f"너는 코드 리뷰어다. 코드에서 {focus}를 찾아 마크다운으로 정리한다. "
              "각 항목은 위치, 문제, 개선 방법을 적고, 확실하지 않은 것은 확실하지 않다고 쓴다. "
              f"{'한국어' if req.language == 'ko' else 'English'}로 쓴다.")
    content, tokens = _ask(system, req.code[:12000])
    return {"analysis_type": req.analysis_type, "content": content, "language": req.language, "tokens_used": tokens}


@router.post("/export/markdown")
async def export_markdown(req: MarkdownRequest, authorization: Optional[str] = Header(None)):
    _auth(authorization)
    return {"content": f"# {req.title}\n\n{req.content.strip()}\n"}
