"""변경 감지 (/api/change-detection/*). 페이지를 다시 읽어 이전 기록과 비교한다.

첫 확인은 기준선으로만 저장하고, 두 번째부터 제목·제목 구조·본문이 달라지면 변경으로 기록한다.
"""

import difflib
import secrets
from datetime import datetime
from typing import Any, Dict, List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from src.api.scraping_routes import _read, _write, fetch_page, parse_page
from src.core.web_tools import _is_public_host  # noqa: F401  (주소 검사는 fetch_page가 한다)

router = APIRouter(prefix="/api/change-detection", tags=["change-detection"])
STORE = ".lars/change_detection/watches.json"


class WatchCreate(BaseModel):
    url: str
    name: str = ""


def _snapshot(url: str) -> Dict[str, Any]:
    page = fetch_page(url)
    parsed = parse_page(page["html"], page["final_url"])
    return {"title": parsed["title"], "headings": parsed["headings"], "text": parsed["text_excerpt"],
            "fetched_at": datetime.now().isoformat(timespec="seconds"), "final_url": page["final_url"]}


def _describe(old: Dict[str, Any], new: Dict[str, Any]) -> List[Dict[str, str]]:
    changes = []
    if old["title"] != new["title"]:
        changes.append({"type": "제목 변경", "section": "Title",
                        "description": f"제목이 '{old['title'] or '(없음)'}'에서 '{new['title'] or '(없음)'}'(으)로 바뀌었습니다."})
    if old["headings"] != new["headings"]:
        added = [h for h in new["headings"] if h not in old["headings"]][:3]
        removed = [h for h in old["headings"] if h not in new["headings"]][:3]
        detail = " / ".join(filter(None, [f"추가: {', '.join(added)}" if added else "", f"삭제: {', '.join(removed)}" if removed else ""]))
        changes.append({"type": "구조 변경", "section": "Header", "description": f"제목 구조가 바뀌었습니다. {detail}".strip()})
    if old["text"] != new["text"]:
        matcher = difflib.SequenceMatcher(None, old["text"], new["text"])
        ratio = round(matcher.ratio() * 100)
        changes.append({"type": "본문 변경", "section": "Body",
                        "description": f"본문이 바뀌었습니다. 유사도 {ratio}%."})
    return changes


def _public(watch: Dict[str, Any]) -> Dict[str, Any]:
    changes = watch.get("changes", [])
    last = changes[-1]["timestamp"] if changes else ""
    return {"id": watch["id"], "url": watch["url"], "name": watch["name"], "status": watch.get("status", "monitoring"),
            "lastChange": last or "변경 없음", "changeCount": len(changes), "changeFreq": watch.get("changeFreq", "수동"),
            "responseTime": watch.get("responseTime", 0), "lastCheck": watch.get("lastCheck", "")}


@router.get("/")
async def list_watches():
    return {"success": True, "data": [_public(w) for w in _read(STORE, [])]}


@router.get("/changes")
async def list_changes():
    rows = []
    for watch in _read(STORE, []):
        for change in watch.get("changes", []):
            rows.append({**change, "siteId": watch["id"]})
    rows.sort(key=lambda r: r["timestamp"], reverse=True)
    return {"success": True, "data": rows[:300]}


@router.post("/")
async def create_watch(req: WatchCreate):
    from urllib.parse import urlparse
    try:
        started = datetime.now()
        snapshot = _snapshot(req.url)
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))
    except Exception as err:
        raise HTTPException(status_code=400, detail=f"페이지를 읽지 못했습니다: {str(err)[:200]}")
    watches = _read(STORE, [])
    watch = {"id": secrets.token_hex(5), "url": req.url.strip(), "name": (req.name or urlparse(req.url).hostname or req.url)[:80],
             "status": "monitoring", "snapshot": snapshot, "changes": [], "lastCheck": "방금",
             "responseTime": round((datetime.now() - started).total_seconds() * 1000)}
    watches.insert(0, watch)
    _write(STORE, watches)
    return {"success": True, "data": _public(watch)}


@router.post("/{watch_id}/check")
async def check_watch(watch_id: str):
    watches = _read(STORE, [])
    watch = next((w for w in watches if w["id"] == watch_id), None)
    if not watch:
        raise HTTPException(status_code=404, detail="감시 대상을 찾을 수 없습니다.")
    started = datetime.now()
    try:
        new = _snapshot(watch["url"])
    except Exception as err:
        watch["status"] = "error"
        watch["lastCheck"] = datetime.now().strftime("%H:%M")
        _write(STORE, watches)
        raise HTTPException(status_code=502, detail=f"페이지를 읽지 못했습니다: {str(err)[:200]}")
    old = watch.get("snapshot")
    found = _describe(old, new) if old else []
    stamp = datetime.now().strftime("%Y-%m-%d %H:%M")
    for item in found:
        watch.setdefault("changes", []).append({"id": secrets.token_hex(4), "timestamp": stamp, **item})
    watch["changes"] = watch.get("changes", [])[-200:]
    watch["snapshot"] = new
    watch["status"] = "alert" if found else "monitoring"
    watch["lastCheck"] = datetime.now().strftime("%H:%M")
    watch["responseTime"] = round((datetime.now() - started).total_seconds() * 1000)
    _write(STORE, watches)
    return {"success": True, "data": _public(watch), "new_changes": found, "baseline": old is None}


@router.delete("/{watch_id}")
async def delete_watch(watch_id: str):
    watches = _read(STORE, [])
    kept = [w for w in watches if w["id"] != watch_id]
    if len(kept) == len(watches):
        raise HTTPException(status_code=404, detail="감시 대상을 찾을 수 없습니다.")
    _write(STORE, kept)
    return {"success": True}
