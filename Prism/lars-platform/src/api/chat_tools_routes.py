"""채팅 입력창의 기능: 첨부 파일 읽기와 모드별 실행 (웹 검색, 심층 리서치, 발표 자료, 문서, 웹 페이지 읽기, SEO 진단, 데이터 분석).

모든 결과는 실제 기능으로 만든다. 첨부 파일은 서버 메모리에 잠시 두고 질문과 함께 쓴다.
"""

import asyncio
import logging
import base64
import csv
import io
import json
import re
import secrets
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

import requests
from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

from src.core import usage_ledger
from src.core.llm_provider import is_production

router = APIRouter(prefix="/api/chat", tags=["chat-tools"])
logger = logging.getLogger("chat_tools")

def _self_url(path: str) -> str:
    """이 서버 자신의 주소. 운영 컨테이너는 8000, 로컬 개발은 8001에서 돌므로 실행 포트를 따른다."""
    import os
    port = os.getenv("PORT") or os.getenv("PRISM_PORT") or "8001"
    return f"http://127.0.0.1:{port}{path}"

OLLAMA = "http://localhost:11434/api/chat"
MODEL = __import__("os").getenv("ASSISTANT_OLLAMA_MODEL", "gemma4:31b")
TEXT_SUFFIXES = {".txt", ".md", ".csv", ".json", ".py", ".js", ".ts", ".tsx", ".html", ".xml", ".log", ".yaml", ".yml"}
IMAGE_SUFFIXES = {".png", ".jpg", ".jpeg", ".tif", ".tiff", ".bmp", ".webp"}
MAX_BYTES = 20 * 1024 * 1024
MAX_TEXT = 30000
ATTACHMENTS: Dict[str, Dict[str, Any]] = {}
TTL = 3600


class RunRequest(BaseModel):
    tool: str = "chat"
    message: str = ""
    attachment_ids: List[str] = []
    history: List[Dict[str, str]] = []


def _gc() -> None:
    now = time.time()
    for key in [k for k, v in ATTACHMENTS.items() if now - v["created"] > TTL]:
        ATTACHMENTS.pop(key, None)


def _ask(system: str, user: str, tokens: int = 2000) -> str:
    if is_production():
        from src.core.llm_provider import bedrock_complete, bedrock_model_name
        try:
            text, tin, tout = bedrock_complete([{"role": "system", "content": system}, {"role": "user", "content": user}], tokens)
        except Exception as err:
            raise HTTPException(status_code=503, detail=f"Bedrock 모델을 호출하지 못했습니다: {str(err)[:150]}")
        usage_ledger.record("bedrock", bedrock_model_name(), "chat-tool", tin, tout)
        return text.strip()
    try:
        response = requests.post(OLLAMA, timeout=600, json={
            "model": MODEL, "think": False, "stream": False,
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
            "options": {"temperature": 0.4, "num_predict": tokens}})
        response.raise_for_status()
    except requests.RequestException as err:
        raise HTTPException(status_code=503, detail=f"로컬 모델을 호출하지 못했습니다: {str(err)[:150]}")
    body = response.json()
    usage_ledger.record("ollama", MODEL, "chat-tool", body.get("prompt_eval_count") or 0, body.get("eval_count") or 0)
    return (body.get("message", {}).get("content") or "").strip()


def _extract(name: str, data: bytes) -> Dict[str, Any]:
    suffix = Path(name).suffix.lower()
    if suffix in TEXT_SUFFIXES:
        text = data.decode("utf-8", errors="replace")
        kind = "text"
    elif suffix == ".pdf":
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(data))
        text = "\n\n".join((p.extract_text() or "").strip() for p in reader.pages).strip()
        kind = "pdf"
        if not text:
            raise HTTPException(status_code=400, detail="글자가 없는 스캔 PDF입니다. 페이지를 이미지로 올려 주세요.")
    elif suffix in (".xlsx", ".xls"):
        import pandas as pd
        table = pd.read_excel(io.BytesIO(data), sheet_name=0)
        text = table.to_csv(index=False)
        kind = "table"
    elif suffix == ".docx":
        import docx
        document = docx.Document(io.BytesIO(data))
        text = "\n".join(p.text for p in document.paragraphs).strip()
        kind = "docx"
    elif suffix in IMAGE_SUFFIXES:
        from src.api.ocr_routes import run_tesseract
        UPLOAD = Path(".lars") / "chat" / "uploads"
        UPLOAD.mkdir(parents=True, exist_ok=True)
        path = UPLOAD / f"{secrets.token_hex(6)}{suffix}"
        path.write_bytes(data)
        try:
            text = run_tesseract(path, "kor+eng")["text"]
        finally:
            path.unlink(missing_ok=True)
        kind = "image-ocr"
    else:
        raise HTTPException(status_code=400, detail=f"지원하지 않는 형식입니다: {suffix or name}")
    return {"text": text[:MAX_TEXT], "truncated": len(text) > MAX_TEXT, "kind": kind}


@router.post("/attachments")
async def upload_attachment(file: UploadFile = File(...)):
    _gc()
    data = await file.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=400, detail="파일이 20MB를 넘습니다.")
    if not file.filename:
        raise HTTPException(status_code=400, detail="파일 이름이 없습니다.")
    extracted = _extract(file.filename, data)
    attachment_id = secrets.token_hex(8)
    ATTACHMENTS[attachment_id] = {"id": attachment_id, "name": file.filename, "created": time.time(), **extracted}
    return {"id": attachment_id, "name": file.filename, "kind": extracted["kind"], "chars": len(extracted["text"]),
            "truncated": extracted["truncated"], "preview": extracted["text"][:200]}


@router.delete("/attachments/{attachment_id}")
async def delete_attachment(attachment_id: str):
    ATTACHMENTS.pop(attachment_id, None)
    return {"ok": True}


def _urls(text: str) -> List[str]:
    return re.findall(r"https?://[^\s)>\"']+", text)


def _history_text(history: List[Dict[str, str]]) -> str:
    return "\n".join(f"{h.get('role', 'user')}: {h.get('content', '')[:800]}" for h in history[-6:])


def _attached_text(attachments: List[Dict[str, Any]]) -> str:
    blocks = []
    for a in attachments:
        note = " (일부만 포함)" if a["truncated"] else ""
        blocks.append(f"[첨부: {a['name']}{note}]\n{a['text']}")
    return "\n\n".join(blocks)


def _web(message: str) -> Dict[str, Any]:
    from src.core.web_tools import WebToolError, search_web
    try:
        results = search_web(message, 5)
    except WebToolError as err:
        raise HTTPException(status_code=503, detail=str(err))
    if not results:
        return {"reply": "검색 결과가 없습니다. 질문을 다르게 적어 주세요.", "sources": []}
    context = "\n\n".join(f"[{i + 1}] {r['title']}\n{r['snippet']}\n{r['url']}" for i, r in enumerate(results))
    reply = _ask("검색 결과만 근거로 한국어로 답한다. 근거 문장 뒤에 [번호]를 붙이고, 결과에 없으면 없다고 쓴다.",
                 f"질문: {message}\n\n검색 결과:\n{context}")
    return {"reply": reply, "sources": [{"title": r["title"], "url": r["url"]} for r in results]}


def _research(message: str) -> Dict[str, Any]:
    from src.core.web_tools import WebToolError, search_web
    from src.api.scraping_routes import fetch_page, parse_page
    queries = [message, f"{message} 최신 자료", f"{message} 장단점 비교"]
    seen, picked = set(), []
    for q in queries:
        try:
            for r in search_web(q, 3):
                if r["url"] not in seen:
                    seen.add(r["url"])
                    picked.append(r)
        except WebToolError:
            continue
    if not picked:
        raise HTTPException(status_code=503, detail="검색 결과를 가져오지 못했습니다. 검색 설정을 확인해 주세요.")
    pages = []
    for r in picked[:6]:
        try:
            page = fetch_page(r["url"])
            parsed = parse_page(page["html"], page["final_url"])
            pages.append({"title": parsed["title"] or r["title"], "url": r["url"], "text": parsed["text_excerpt"][:2500]})
        except Exception:
            pages.append({"title": r["title"], "url": r["url"], "text": r.get("snippet", "")})
    context = "\n\n".join(f"[{i + 1}] {p['title']}\n{p['text']}" for i, p in enumerate(pages))
    reply = _ask("심층 리서치 보고서를 한국어 마크다운으로 쓴다. 구성: 요약, 주요 내용(항목별), 상충되는 정보, 한계. "
                 "각 사실 뒤에 출처 [번호]를 붙이고, 자료에 없는 내용은 쓰지 않는다.",
                 f"리서치 질문: {message}\n\n수집한 자료:\n{context}", tokens=3000)
    return {"reply": reply, "sources": [{"title": p["title"], "url": p["url"]} for p in pages]}


def _requested_slides(message: str, default: int = 8) -> int:
    """요청 문장의 장수(예: 10장, 10개, 10 slides)를 읽는다. 없으면 기본값을 쓴다."""
    match = re.search(r"(\d{1,2})\s*(?:장|개|슬라이드|slides?|페이지)", message, re.IGNORECASE)
    return max(4, min(int(match.group(1)), 15)) if match else default


def _presentation(message: str) -> Dict[str, Any]:
    response = requests.post(_self_url("/api/presentation/generate"), timeout=900,
                             json={"topic": message, "audience": "general", "num_slides": _requested_slides(message)})
    result = response.json()
    if not result.get("success"):
        logger.error("[chat-tools] 발표 자료 생성 실패: %s", result)
        raise HTTPException(status_code=502, detail=result.get("error") or result.get("detail") or "발표 자료를 만들지 못했습니다.")
    return {"reply": f"발표 자료를 만들었습니다. ({result.get('slides_count')}장) 아래에서 내려받을 수 있습니다.", "sources": [],
            "artifact": {"name": f"{result.get('title', 'presentation')}.pptx",
                         "mime": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                         "base64": result["pptx_base64"]}}


def _document(message: str, attached: str) -> Dict[str, Any]:
    content = _ask("요청에 맞는 문서를 마크다운으로 쓴다. 제목은 #, 소제목은 ##으로 구분하고 한국어로 쓴다. 근거 없는 수치는 쓰지 않는다.",
                   f"요청: {message}" + (f"\n\n참고 자료:\n{attached[:12000]}" if attached else ""), tokens=3000)
    return {"reply": content, "sources": [],
            "artifact": {"name": "document.md", "mime": "text/markdown;charset=utf-8",
                         "base64": base64.b64encode(content.encode("utf-8")).decode("ascii")}}


def _scrape(message: str) -> Dict[str, Any]:
    from src.api.scraping_routes import fetch_page, parse_page
    urls = _urls(message)
    if not urls:
        raise HTTPException(status_code=400, detail="읽을 웹 페이지 주소(https://...)를 함께 적어 주세요.")
    page = fetch_page(urls[0])
    parsed = parse_page(page["html"], page["final_url"])
    reply = _ask("웹 페이지 내용만 근거로 한국어로 요약한다. 핵심 내용, 주요 항목, 페이지 목적 순으로 쓴다.",
                 f"질문: {message}\n\n제목: {parsed['title']}\n설명: {parsed['description']}\n제목 구조: {', '.join(parsed['headings'][:15])}\n본문:\n{parsed['text_excerpt']}")
    return {"reply": reply, "sources": [{"title": parsed["title"] or page["final_url"], "url": page["final_url"]}]}


def _seo(message: str) -> Dict[str, Any]:
    from src.api.seo_routes import audit
    urls = _urls(message)
    if not urls:
        raise HTTPException(status_code=400, detail="진단할 주소(https://...)를 함께 적어 주세요.")
    result = audit(urls[0])
    lines = [f"SEO 종합 점수: {result['score']}점 ({result['url']})", ""]
    for c in result["checks"]:
        mark = {"excellent": "✅", "warning": "⚠️", "fail": "❌"}.get(c["status"], "")
        lines.append(f"{mark} {c['check']}: {c['detail']}")
    keywords = ", ".join(k["keyword"] for k in result["keywords"][:10])
    lines += ["", f"본문 키워드: {keywords}"]
    return {"reply": "\n".join(lines), "sources": [{"title": result["url"], "url": result["url"]}]}


def _data(message: str, attachments: List[Dict[str, Any]]) -> Dict[str, Any]:
    from src.core.prism_statistics_layer import prism_statistics_layer
    csv_files = [a for a in attachments if a["name"].lower().endswith((".csv", ".xlsx", ".xls"))]
    if not csv_files:
        raise HTTPException(status_code=400, detail="분석할 CSV 또는 엑셀 파일을 첨부해 주세요. 파일을 먼저 첨부한 뒤 질문을 보내 주세요.")
    rows = list(csv.DictReader(io.StringIO(csv_files[0]["text"])))
    if not rows:
        raise HTTPException(status_code=400, detail="CSV에 데이터 행이 없습니다.")
    summary: Dict[str, Any] = {"행 수": len(rows), "열": list(rows[0].keys())[:20], "열별 통계": {}}
    for column in list(rows[0].keys())[:20]:
        values = []
        for r in rows:
            try:
                values.append(float(str(r[column]).replace(",", "")))
            except (TypeError, ValueError):
                values = None
                break
        if values:
            stats = prism_statistics_layer.descriptive_statistics(values)
            summary["열별 통계"][column] = {k: stats.get(k) for k in ("mean", "median", "std", "min", "max") if k in stats}
    reply = _ask("CSV 요약 통계를 바탕으로 한국어로 분석한다. 눈에 띄는 점, 이상치 가능성, 다음 확인 사항을 쓴다. 통계에 없는 수치는 만들지 않는다.",
                 f"질문: {message or '데이터를 분석해 주세요.'}\n\n요약 통계(JSON):\n{json.dumps(summary, ensure_ascii=False, default=str)[:8000]}")
    return {"reply": reply, "sources": []}


@router.post("/run")
async def run_tool(req: RunRequest):
    """모드별 기능을 실행한다. 무거운 작업은 스레드에서 돌려서 서버가 다른 요청(발표 자료 생성 등)을 계속 처리하게 한다."""
    _gc()
    attachments = [ATTACHMENTS[i] for i in req.attachment_ids if i in ATTACHMENTS]
    message = req.message.strip()
    if not message and req.tool not in ("data",):
        raise HTTPException(status_code=400, detail="질문을 입력해 주세요.")
    try:
        return await _dispatch(req, attachments, message)
    except HTTPException:
        raise
    except Exception as err:
        logger.exception("[chat-tools] %s 처리 실패", req.tool)
        raise HTTPException(status_code=502, detail=f"처리 중 오류가 났습니다 ({type(err).__name__}: {str(err)[:200]}). 다시 시도해 주세요.")


async def _dispatch(req: "RunRequest", attachments: list, message: str):
    if req.tool == "web":
        return await asyncio.to_thread(_web, message)
    if req.tool == "research":
        return await asyncio.to_thread(_research, message)
    if req.tool == "ppt":
        return await asyncio.to_thread(_presentation, message)
    if req.tool == "doc":
        return await asyncio.to_thread(_document, message, _attached_text(attachments))
    if req.tool == "scrape":
        return await asyncio.to_thread(_scrape, message)
    if req.tool == "seo":
        return await asyncio.to_thread(_seo, message)
    if req.tool == "data":
        return await asyncio.to_thread(_data, message, attachments)
    # 일반 대화: 첨부 파일 내용을 근거로 답한다
    context = _attached_text(attachments)
    prompt = message + (f"\n\n{context}" if context else "")
    reply = await asyncio.to_thread(
        _ask, "한국어로 친절하게 답한다. 첨부 자료가 있으면 그 내용을 근거로 답한다.",
        f"{_history_text(req.history)}\n\n{prompt}".strip(), 2400)
    return {"reply": reply, "sources": []}
