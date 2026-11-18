"""발표 자료 편집 API: 저장된 장표를 고치고, 테마를 바꾸고, 자연어로 디자인을 수정하고, .pptx로 다시 만든다.

저장 위치: .lars/decks/<id>.json (장표 목록, 테마, 되돌리기 기록)
"""

import base64
import json
import re
import secrets
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from src.core.deck_builder import design_edit, generate_outline_slides, sanitize_slide
from src.core.pptx_writer import PALETTE_KEYS, THEMES, write_pptx

router = APIRouter(prefix="/api/decks", tags=["decks"])

DECK_DIR = Path(".lars") / "decks"
PPT_DIR = Path(".lars") / "ppt"
HISTORY_LIMIT = 10
_ID = re.compile(r"^[a-f0-9]{12}$")
_HEX = re.compile(r"^#?[0-9A-Fa-f]{6}$")


class GenerateDeckRequest(BaseModel):
    topic: str
    audience: str = "general"
    num_slides: int = 8
    file_content: str = ""


class DeckUpdate(BaseModel):
    title: Optional[str] = None
    theme: Optional[Dict[str, Any]] = None
    slides: Optional[List[Dict[str, Any]]] = None


class AssistRequest(BaseModel):
    instruction: str


def _path(deck_id: str) -> Path:
    if not _ID.match(deck_id):
        raise HTTPException(status_code=400, detail="잘못된 발표 자료 번호입니다.")
    return DECK_DIR / f"{deck_id}.json"


def _load(deck_id: str) -> Dict[str, Any]:
    path = _path(deck_id)
    if not path.exists():
        raise HTTPException(status_code=404, detail="발표 자료를 찾을 수 없습니다.")
    return json.loads(path.read_text(encoding="utf-8"))


def _save(deck: Dict[str, Any]) -> Dict[str, Any]:
    deck["updated"] = time.strftime("%Y-%m-%dT%H:%M:%S")
    DECK_DIR.mkdir(parents=True, exist_ok=True)
    _path(deck["id"]).write_text(json.dumps(deck, ensure_ascii=False, indent=2), encoding="utf-8")
    return deck


def _clean_theme(raw: Any) -> Dict[str, Any]:
    """테마 입력을 정리한다. 없는 프리셋이나 잘못된 색 값은 기본값으로 바꾼다."""
    raw = raw if isinstance(raw, dict) else {}
    preset = str(raw.get("preset", "corporate"))
    if preset not in THEMES:
        preset = "corporate"
    overrides = {}
    for key, value in (raw.get("overrides") or {}).items():
        if key in PALETTE_KEYS and isinstance(value, str) and _HEX.match(value):
            overrides[key] = value.lstrip("#").upper()
    font = str(raw.get("font") or "")[:60]
    return {"preset": preset, "font": font, "overrides": overrides}


def _remember(deck: Dict[str, Any]) -> None:
    """수정 전 상태를 되돌리기 기록에 남긴다."""
    history = deck.setdefault("history", [])
    history.append({"slides": deck.get("slides", []), "theme": deck.get("theme", {}), "at": time.strftime("%H:%M:%S")})
    del history[:-HISTORY_LIMIT]


@router.post("/generate")
async def generate(req: GenerateDeckRequest):
    """주제로 장표 목록을 만들고 편집 가능한 발표 자료로 저장한다."""
    import asyncio

    topic = req.topic.strip()
    if not topic:
        raise HTTPException(status_code=400, detail="주제를 입력해 주세요.")
    slide_count = max(4, min(req.num_slides, 15))
    context = req.file_content[:12000] if req.file_content else ""
    try:
        built = await asyncio.to_thread(generate_outline_slides, topic, req.audience, slide_count, context)
    except ValueError as err:
        raise HTTPException(status_code=502, detail=str(err))
    deck = {
        "id": secrets.token_hex(6),
        "title": built["title"],
        "theme": {"preset": "corporate", "font": "", "overrides": {}},
        "slides": built["slides"],
        "created": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "history": [],
    }
    return _save(deck)


def _sse(payload: dict) -> str:
    return "data: " + json.dumps(payload, ensure_ascii=False) + "\n\n"


def _generate_stream(req: "GenerateDeckRequest"):
    """장표를 만드는 동안 슬라이드 이벤트를 보내고, 끝나면 발표 자료로 저장한다."""
    from src.core.deck_builder import stream_deck

    topic = req.topic.strip()
    slide_count = max(4, min(req.num_slides, 15))
    context = req.file_content[:12000] if req.file_content else ""
    try:
        for event in stream_deck(topic, req.audience, slide_count, context):
            if event["type"] != "built":
                yield _sse(event)
                continue
            built = event["built"]
            deck = {
                "id": secrets.token_hex(6),
                "title": built["title"],
                "theme": {"preset": "corporate", "font": "", "overrides": {}},
                "slides": built["slides"],
                "created": time.strftime("%Y-%m-%dT%H:%M:%S"),
                "history": [],
            }
            saved = _save(deck)
            yield _sse({"type": "done", "deck_id": saved["id"], "title": saved["title"], "slides_count": len(saved["slides"])})
    except ValueError as err:
        yield _sse({"type": "error", "message": str(err)[:300]})


@router.post("/generate/stream")
async def generate_stream(req: GenerateDeckRequest):
    """발표 자료를 만들면서 슬라이드가 완성되는 대로 이벤트(SSE)를 보낸다. 마지막 done 이벤트에 저장된 발표 id가 있다."""
    if not req.topic.strip():
        raise HTTPException(status_code=400, detail="주제를 입력해 주세요.")
    return StreamingResponse(_generate_stream(req), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@router.get("")
async def list_decks():
    DECK_DIR.mkdir(parents=True, exist_ok=True)
    rows = []
    for path in sorted(DECK_DIR.glob("*.json"), key=lambda p: p.stat().st_mtime, reverse=True)[:100]:
        try:
            deck = json.loads(path.read_text(encoding="utf-8"))
        except ValueError:
            continue
        rows.append({"id": deck.get("id"), "title": deck.get("title", ""), "slides": len(deck.get("slides", [])),
                     "updated": deck.get("updated", "")})
    return {"decks": rows}


@router.get("/{deck_id}")
async def get_deck(deck_id: str):
    return _load(deck_id)


@router.put("/{deck_id}")
async def update_deck(deck_id: str, req: DeckUpdate):
    deck = _load(deck_id)
    _remember(deck)
    if req.title is not None:
        deck["title"] = req.title.strip()[:120] or deck.get("title", "")
    if req.theme is not None:
        deck["theme"] = _clean_theme(req.theme)
    if req.slides is not None:
        cleaned = [s for s in (sanitize_slide(x) for x in req.slides) if s]
        if not cleaned:
            raise HTTPException(status_code=400, detail="장표가 비어 있습니다.")
        deck["slides"] = cleaned[:30]
    return _save(deck)


@router.delete("/{deck_id}")
async def delete_deck(deck_id: str):
    path = _path(deck_id)
    if not path.exists():
        raise HTTPException(status_code=404, detail="발표 자료를 찾을 수 없습니다.")
    path.unlink()
    return {"deleted": deck_id}


@router.post("/{deck_id}/undo")
async def undo(deck_id: str):
    deck = _load(deck_id)
    history = deck.get("history", [])
    if not history:
        raise HTTPException(status_code=400, detail="되돌릴 수 있는 기록이 없습니다.")
    last = history.pop()
    deck["slides"] = last.get("slides", deck.get("slides", []))
    deck["theme"] = last.get("theme", deck.get("theme", {}))
    return _save(deck)


@router.post("/{deck_id}/assist")
async def assist(deck_id: str, req: AssistRequest):
    """자연어 요청(예: '어둡게 바꾸고 강조색은 초록으로')을 반영해 테마와 장표를 고친다."""
    import asyncio

    if not req.instruction.strip():
        raise HTTPException(status_code=400, detail="바꾸고 싶은 디자인을 입력해 주세요.")
    deck = _load(deck_id)
    try:
        result = await asyncio.to_thread(design_edit, deck, req.instruction)
    except ValueError as err:
        raise HTTPException(status_code=502, detail=str(err))
    _remember(deck)
    deck["slides"] = result["slides"]
    if result.get("theme"):
        deck["theme"] = _clean_theme(result["theme"])
    _save(deck)
    return {"summary": result["summary"], "deck": deck}


@router.post("/{deck_id}/render")
async def render(deck_id: str):
    """현재 장표와 테마로 .pptx를 만든다."""
    import asyncio

    deck = _load(deck_id)
    theme = _clean_theme(deck.get("theme"))
    PPT_DIR.mkdir(parents=True, exist_ok=True)
    path = PPT_DIR / f"deck-{deck_id}.pptx"
    try:
        await asyncio.to_thread(write_pptx, deck.get("slides", []), path, deck.get("title", ""), "", "", "", "",
                                theme["font"], theme["preset"], theme["overrides"])
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"발표 자료 파일을 만들지 못했습니다: {type(err).__name__}")
    data = path.read_bytes()
    return {"file": str(path), "slides_count": len(deck.get("slides", [])), "pptx_base64": base64.b64encode(data).decode("ascii"),
            "filename": f"{deck.get('title', 'presentation')}.pptx"}


@router.get("/meta/themes")
async def themes():
    """편집기에서 고를 수 있는 테마 목록과 바꿀 수 있는 색 항목."""
    return {"presets": [{"id": key, "palette": value} for key, value in THEMES.items()], "color_keys": list(PALETTE_KEYS)}
