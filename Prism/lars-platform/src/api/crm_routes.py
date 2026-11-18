"""CRM (/api/crm/*). 연락처와 거래 단계를 파일(.lars/crm/contacts.json)에 저장하고, 집계는 저장된 데이터로만 계산한다."""

import json
import re
import secrets
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/crm", tags=["crm"])
STORE = Path(".lars") / "crm" / "contacts.json"
STAGES = ["Lead", "Prospect", "Negotiation", "Closed"]
DEFAULT_PROBABILITY = {"Lead": 10, "Prospect": 30, "Negotiation": 60, "Closed": 100}
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class ContactCreate(BaseModel):
    name: str
    email: str = ""
    company: str = ""
    phone: str = ""
    stage: str = "Lead"
    value: float = 0
    probability: Optional[int] = None


class ContactUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    company: Optional[str] = None
    phone: Optional[str] = None
    stage: Optional[str] = None
    value: Optional[float] = None
    probability: Optional[int] = None


def _load() -> List[Dict]:
    try:
        return json.loads(STORE.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return []


def _save(rows: List[Dict]) -> None:
    STORE.parent.mkdir(parents=True, exist_ok=True)
    STORE.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")


def _validate(data: Dict) -> None:
    if "stage" in data and data["stage"] not in STAGES:
        raise HTTPException(status_code=400, detail=f"단계는 {', '.join(STAGES)} 중 하나여야 합니다.")
    if data.get("email") and not EMAIL_RE.match(data["email"]):
        raise HTTPException(status_code=400, detail="이메일 형식이 올바르지 않습니다.")
    if "value" in data and (data["value"] is None or data["value"] < 0):
        raise HTTPException(status_code=400, detail="거래 가치는 0 이상이어야 합니다.")
    if "probability" in data and data["probability"] is not None and not (0 <= data["probability"] <= 100):
        raise HTTPException(status_code=400, detail="확률은 0~100 사이여야 합니다.")


@router.get("/contacts/")
async def list_contacts():
    return {"success": True, "data": _load()}


@router.post("/contacts/")
async def create_contact(req: ContactCreate):
    if not req.name.strip():
        raise HTTPException(status_code=400, detail="이름을 입력해 주세요.")
    data = req.model_dump()
    _validate(data)
    rows = _load()
    now = datetime.now().isoformat(timespec="seconds")
    contact = {"id": secrets.token_hex(5), "name": req.name.strip()[:80], "email": req.email.strip(), "company": req.company.strip()[:80],
               "phone": req.phone.strip(), "stage": req.stage, "value": req.value,
               "probability": req.probability if req.probability is not None else DEFAULT_PROBABILITY[req.stage],
               "created_at": now, "updated_at": now}
    rows.insert(0, contact)
    _save(rows)
    return {"success": True, "data": contact}


@router.put("/contacts/{contact_id}")
async def update_contact(contact_id: str, req: ContactUpdate):
    rows = _load()
    contact = next((c for c in rows if c["id"] == contact_id), None)
    if not contact:
        raise HTTPException(status_code=404, detail="연락처를 찾을 수 없습니다.")
    changes = {k: v for k, v in req.model_dump().items() if v is not None}
    _validate(changes)
    contact.update(changes)
    contact["updated_at"] = datetime.now().isoformat(timespec="seconds")
    _save(rows)
    return {"success": True, "data": contact}


@router.delete("/contacts/{contact_id}")
async def delete_contact(contact_id: str):
    rows = _load()
    kept = [c for c in rows if c["id"] != contact_id]
    if len(kept) == len(rows):
        raise HTTPException(status_code=404, detail="연락처를 찾을 수 없습니다.")
    _save(kept)
    return {"success": True}


@router.get("/stats")
async def stats():
    rows = _load()
    by_stage = {s: {"count": 0, "value": 0.0} for s in STAGES}
    for c in rows:
        bucket = by_stage.get(c.get("stage"))
        if bucket:
            bucket["count"] += 1
            bucket["value"] += float(c.get("value") or 0)
    weighted = sum(float(c.get("value") or 0) * float(c.get("probability") or 0) / 100 for c in rows)
    return {"success": True, "data": {"contacts": len(rows), "by_stage": by_stage,
                                       "pipeline_value": sum(float(c.get("value") or 0) for c in rows),
                                       "weighted_value": round(weighted, 2)}}
