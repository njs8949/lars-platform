"""지능형 생성 API (/api/generation/*). 요청을 분류하고, 로컬 모델로 문서를 쓰고, 형식을 바꾼다."""

import html
import json
import os
import re
from datetime import datetime
from typing import Any, Dict, List, Optional

import requests
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from src.core import usage_ledger
from src.core.llm_provider import is_production

router = APIRouter(prefix="/api/generation", tags=["generation"])
OLLAMA = "http://localhost:11434/api/chat"
MODEL = os.getenv("ASSISTANT_OLLAMA_MODEL", "gemma4:31b")

FORMATS: Dict[str, Dict[str, Any]] = {
    "pptx": {"label": "PowerPoint", "extension": "pptx", "types": ["presentation"]},
    "docx": {"label": "Word 문서", "extension": "docx", "types": ["document"]},
    "html": {"label": "웹 페이지", "extension": "html", "types": ["website"]},
    "markdown": {"label": "마크다운", "extension": "md", "types": ["document", "text"]},
    "text": {"label": "텍스트", "extension": "txt", "types": ["text"]},
}

RULES = [
    ("presentation", "pptx", ["발표", "슬라이드", "ppt", "프레젠테이션", "presentation", "slide"]),
    ("website", "html", ["웹사이트", "랜딩", "웹페이지", "html", "landing"]),
    ("document", "docx", ["보고서", "문서", "기획서", "제안서", "계획서", "레포트", "report", "proposal", "docx", "워드"]),
    ("text", "markdown", []),
]

SYSTEM = {
    "presentation": "발표 자료를 쓴다. 각 슬라이드는 '## 슬라이드 제목'으로 시작하고, 그 아래 핵심 문장을 '- '로 3개 안팎 쓴다. 한국어로 쓴다.",
    "document": "문서를 마크다운으로 쓴다. 제목은 '#', 소제목은 '##'로 구분하고, 구체적인 문장으로 한국어로 쓴다.",
    "website": "웹 페이지 내용을 마크다운으로 쓴다. 제목, 소개, 주요 기능, 문의 섹션을 포함하고 한국어로 쓴다.",
    "text": "요청에 맞는 글을 마크다운으로 한국어로 쓴다.",
}


class GenerateRequest(BaseModel):
    message: str
    context: Optional[List[Dict[str, Any]]] = None
    language: str = "ko"
    stream: bool = False


class DetectRequest(BaseModel):
    message: str
    context: Optional[List[Dict[str, Any]]] = None
    language: str = "ko"


class PreviewRequest(BaseModel):
    content: str
    generation_type: str = "text"
    output_format: str = "markdown"


class ConvertRequest(BaseModel):
    content: str
    from_format: str = "markdown"
    to_format: str = "text"


class BatchRequest(BaseModel):
    messages: List[str]
    language: str = "ko"


def detect(message: str) -> Dict[str, Any]:
    lowered = message.lower()
    best = None
    for gen_type, primary, keywords in RULES:
        hits = [k for k in keywords if k in lowered]
        if hits and (best is None or len(hits) > best[2]):
            best = (gen_type, primary, len(hits), hits)
    if best is None:
        gen_type, primary, hits = "text", "markdown", []
    else:
        gen_type, primary, _, hits = best
    alternatives = [f for f in ("pptx", "docx", "html", "markdown") if f != primary][:3]
    confidence = min(0.95, 0.55 + 0.15 * len(hits)) if hits else 0.4
    return {
        "generation_type": gen_type, "primary_format": primary, "alternative_formats": alternatives,
        "confidence": round(confidence, 2),
        "reasoning": f"키워드 {', '.join(hits)}" if hits else "특정 형식 키워드가 없어 텍스트로 분류했습니다.",
        "metadata": {"matched_keywords": hits},
    }


def _meta(message: str, language: str) -> Dict[str, Any]:
    info = detect(message)
    return {"type": info["generation_type"], "primary_format": info["primary_format"],
            "alternative_formats": info["alternative_formats"], "confidence": info["confidence"],
            "language": language, "metadata": info["metadata"], "timestamp": datetime.now().isoformat(timespec="seconds")}


def _messages(message: str, gen_type: str, context: Optional[List[Dict[str, Any]]]) -> List[Dict[str, str]]:
    history = []
    for item in (context or [])[-6:]:
        role = item.get("role", "user")
        content = str(item.get("content", ""))[:4000]
        if content:
            history.append({"role": "assistant" if role == "assistant" else "user", "content": content})
    return [{"role": "system", "content": SYSTEM.get(gen_type, SYSTEM["text"])}, *history, {"role": "user", "content": message}]


def _chat(messages: List[Dict[str, str]], stream: bool):
    return requests.post(OLLAMA, timeout=600, stream=stream, json={
        "model": MODEL, "think": False, "stream": stream, "messages": messages,
        "options": {"temperature": 0.5, "num_predict": 3000}})


def _generate_text(message: str, gen_type: str, context) -> str:
    if is_production():
        from src.core.llm_provider import bedrock_complete, bedrock_model_name
        text, tin, tout = bedrock_complete(_messages(message, gen_type, context), 3000)
        usage_ledger.record("bedrock", bedrock_model_name(), "generation", tin, tout)
        return text.strip()
    response = _chat(_messages(message, gen_type, context), stream=False)
    response.raise_for_status()
    body = response.json()
    usage_ledger.record("ollama", MODEL, "generation", body.get("prompt_eval_count") or 0, body.get("eval_count") or 0)
    return (body.get("message", {}).get("content") or "").strip()


@router.post("/auto-detect")
async def auto_detect(req: DetectRequest):
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="message가 비어 있습니다.")
    return detect(req.message)


@router.post("/generate")
async def generate(req: GenerateRequest):
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="message가 비어 있습니다.")
    meta = _meta(req.message, req.language)
    if not req.stream:
        try:
            content = _generate_text(req.message, meta["type"], req.context)
        except requests.RequestException as err:
            raise HTTPException(status_code=503, detail=f"로컬 모델을 호출하지 못했습니다: {str(err)[:200]}")
        return {"content": content, "metadata": meta}

    def events():
        yield f"[META]{json.dumps(meta, ensure_ascii=False)}[/META]\n"
        if is_production():
            from src.core.llm_provider import bedrock_stream, bedrock_model_name
            try:
                for piece in bedrock_stream(_messages(req.message, meta["type"], req.context), 3000):
                    yield "[C]" + json.dumps(piece, ensure_ascii=False) + "\n"
            except Exception as err:
                yield "[C]" + json.dumps(f"\n\n[오류] Bedrock 모델을 호출하지 못했습니다: {str(err)[:120]}", ensure_ascii=False) + "\n"
            return
        try:
            response = _chat(_messages(req.message, meta["type"], req.context), stream=True)
            response.raise_for_status()
            for raw in response.iter_lines():
                if not raw:
                    continue
                chunk = json.loads(raw)
                piece = chunk.get("message", {}).get("content", "")
                if piece:
                    # 줄바꿈이 섞인 조각도 한 줄로 보내기 위해 JSON 문자열로 감싼다
                    yield "[C]" + json.dumps(piece, ensure_ascii=False) + "\n"
                if chunk.get("done"):
                    usage_ledger.record("ollama", MODEL, "generation", chunk.get("prompt_eval_count") or 0, chunk.get("eval_count") or 0)
                    break
        except requests.RequestException as err:
            yield "[C]" + json.dumps(f"\n\n[오류] 로컬 모델을 호출하지 못했습니다: {str(err)[:120]}", ensure_ascii=False) + "\n"

    return StreamingResponse(events(), media_type="text/plain; charset=utf-8")


@router.post("/preview")
async def preview(req: PreviewRequest):
    text = req.content.strip()
    title_match = re.search(r"^#\s+(.+)$", text, re.M)
    slides = len(re.findall(r"^##\s+", text, re.M)) if req.generation_type == "presentation" else None
    return {"preview": {
        "title": title_match.group(1).strip() if title_match else (text.splitlines()[0][:60] if text else ""),
        "summary": re.sub(r"[#*\-]", "", text)[:300],
        "word_count": len(text.split()),
        "format": req.output_format,
        "slide_count": slides,
    }}


def _md_to_html(text: str) -> str:
    out = []
    in_list = False
    for line in html.escape(text).splitlines():
        stripped = line.strip()
        if stripped.startswith(("- ", "* ")):
            if not in_list:
                out.append("<ul>")
                in_list = True
            out.append(f"<li>{stripped[2:]}</li>")
            continue
        if in_list:
            out.append("</ul>")
            in_list = False
        heading = re.match(r"^(#{1,6})\s+(.*)$", stripped)
        if heading:
            level = len(heading.group(1))
            out.append(f"<h{level}>{heading.group(2)}</h{level}>")
        elif stripped:
            out.append(f"<p>{stripped}</p>")
    if in_list:
        out.append("</ul>")
    body = "\n".join(out)
    body = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", body)
    return f"<!doctype html><html lang=\"ko\"><meta charset=\"utf-8\"><body>\n{body}\n</body></html>"


def _md_to_text(text: str) -> str:
    text = re.sub(r"^#{1,6}\s+", "", text, flags=re.M)
    text = re.sub(r"\*\*(.+?)\*\*", r"\1", text)
    text = re.sub(r"^[\-\*]\s+", "• ", text, flags=re.M)
    return text


@router.post("/convert")
async def convert(req: ConvertRequest):
    source, target = req.from_format, req.to_format
    if target not in ("markdown", "text", "html"):
        raise HTTPException(status_code=400, detail=f"지원하지 않는 변환 대상입니다: {target}")
    if target == "markdown":
        converted = req.content
    elif target == "text":
        converted = _md_to_text(req.content)
    else:
        converted = _md_to_html(req.content)
    return {"content": converted, "from_format": source, "to_format": target}


@router.get("/formats")
async def formats():
    return {"formats": FORMATS, "default": "markdown"}


@router.post("/batch-generate")
async def batch_generate(req: BatchRequest):
    if not req.messages or len(req.messages) > 10:
        raise HTTPException(status_code=400, detail="메시지는 1~10개여야 합니다.")
    results = []
    for message in req.messages:
        meta = _meta(message, req.language)
        try:
            content = _generate_text(message, meta["type"], None)
        except requests.RequestException as err:
            content = f"[오류] {str(err)[:120]}"
        results.append({"message": message, "content": content, "metadata": meta})
    return {"results": results}
