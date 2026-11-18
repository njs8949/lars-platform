"""콘솔 저장소: 파일, 배치 작업, 웹훅, 팀.

모두 .lars/console/ 아래에 JSON과 파일로 저장한다 (단일 서버 기준).
- 파일·배치·웹훅은 만든 사용자(owner 이메일) 단위로 나뉘고, 다른 사용자에게 보이지 않는다.
- 팀은 팀장과 멤버 목록을 가진다. 멤버는 팀의 API 사용량을 볼 수 있다.
- 웹훅 주소는 https만 허용하고, 사설·루프백 주소로 보내지 않는다.
"""

import hashlib
import hmac
import ipaddress
import json
import queue
import re
import secrets
import socket
import threading
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional
from urllib.parse import urlparse

import requests

BASE = Path(".lars") / "console"
FILE_LIMIT_BYTES = 10 * 1024 * 1024
ALLOWED_EXT = {".txt", ".md", ".csv", ".json", ".pdf", ".png", ".jpg", ".jpeg", ".docx", ".xlsx"}
BATCH_MAX_PROMPTS = 50
BATCH_MAX_CHARS = 4000
TEAM_MAX_MEMBERS = 50
WEBHOOK_MAX = 10
WEBHOOK_EVENTS = {"limit.reached"}

_lock = threading.Lock()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _owner_dir(kind: str, owner: str) -> Path:
    key = hashlib.sha256(owner.lower().encode("utf-8")).hexdigest()[:24]
    folder = BASE / kind / key
    folder.mkdir(parents=True, exist_ok=True)
    return folder


def _read_json(path: Path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return default


def _write_json(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(path)


# ---------- 파일 ----------

def _safe_name(name: str) -> str:
    base = Path(name).name
    cleaned = re.sub(r"[^\w.\-가-힣]", "_", base)[:120].strip("._")
    return cleaned or "file"


def add_file(owner: str, name: str, data: bytes) -> dict:
    ext = Path(name).suffix.lower()
    if ext not in ALLOWED_EXT:
        raise ValueError(f"허용하지 않는 파일 형식입니다. 가능한 형식: {', '.join(sorted(ALLOWED_EXT))}")
    if not data:
        raise ValueError("빈 파일은 올릴 수 없습니다.")
    if len(data) > FILE_LIMIT_BYTES:
        raise ValueError("파일은 10MB까지 올릴 수 있습니다.")
    folder = _owner_dir("files", owner)
    with _lock:
        fid = secrets.token_hex(8)
        stored = folder / f"{fid}__{_safe_name(name)}"
        stored.write_bytes(data)
        index = _read_json(folder / "index.json", [])
        meta = {"id": fid, "name": _safe_name(name), "size": len(data), "created_at": _now(), "file": stored.name}
        index.append(meta)
        _write_json(folder / "index.json", index)
    return _public_file(meta)


def _public_file(meta: dict) -> dict:
    return {k: meta[k] for k in ("id", "name", "size", "created_at")}


def list_files(owner: str) -> List[dict]:
    folder = _owner_dir("files", owner)
    return [_public_file(m) for m in _read_json(folder / "index.json", [])]


def get_file_bytes(owner: str, fid: str) -> Optional[tuple]:
    folder = _owner_dir("files", owner)
    for meta in _read_json(folder / "index.json", []):
        if meta["id"] == fid:
            return meta["name"], (folder / meta["file"]).read_bytes()
    return None


def delete_file(owner: str, fid: str) -> bool:
    folder = _owner_dir("files", owner)
    with _lock:
        index = _read_json(folder / "index.json", [])
        target = next((m for m in index if m["id"] == fid), None)
        if target is None:
            return False
        (folder / target["file"]).unlink(missing_ok=True)
        _write_json(folder / "index.json", [m for m in index if m["id"] != fid])
    return True


# ---------- 배치 ----------

_queue: "queue.Queue[tuple]" = queue.Queue()
_worker_started = False


def _ensure_worker() -> None:
    global _worker_started
    with _lock:
        if not _worker_started:
            threading.Thread(target=_batch_worker, name="console-batch", daemon=True).start()
            _worker_started = True


def _batch_path(owner: str, bid: str):
    return _owner_dir("batches", owner) / f"{bid}.json"


def create_batch(owner: str, model: str, prompts: List[str], max_tokens: int) -> dict:
    if not prompts or len(prompts) > BATCH_MAX_PROMPTS:
        raise ValueError(f"프롬프트는 1개부터 {BATCH_MAX_PROMPTS}개까지 넣을 수 있습니다.")
    if any(not p.strip() for p in prompts):
        raise ValueError("빈 줄은 프롬프트로 쓸 수 없습니다.")
    if any(len(p) > BATCH_MAX_CHARS for p in prompts):
        raise ValueError(f"프롬프트 한 개는 {BATCH_MAX_CHARS}자를 넘을 수 없습니다.")
    bid = secrets.token_hex(8)
    job = {"id": bid, "model": model, "max_tokens": max_tokens, "status": "queued", "total": len(prompts),
           "done": 0, "created_at": _now(), "finished_at": None,
           "prompts": prompts, "results": []}
    _write_json(_batch_path(owner, bid), job)
    _ensure_worker()
    _queue.put((owner, bid))
    return _public_batch(job)


def _public_batch(job: dict, with_results: bool = False) -> dict:
    out = {k: job[k] for k in ("id", "model", "status", "total", "done", "created_at", "finished_at")}
    if with_results:
        out["results"] = job["results"]
    return out


def list_batches(owner: str) -> List[dict]:
    folder = _owner_dir("batches", owner)
    jobs = [_read_json(p, None) for p in folder.glob("*.json")]
    jobs = [j for j in jobs if j]
    jobs.sort(key=lambda j: j["created_at"], reverse=True)
    return [_public_batch(j) for j in jobs[:50]]


def get_batch(owner: str, bid: str) -> Optional[dict]:
    if not re.fullmatch(r"[0-9a-f]{16}", bid):
        return None
    job = _read_json(_batch_path(owner, bid), None)
    return _public_batch(job, with_results=True) if job else None


def _batch_worker() -> None:
    """작업을 한 번에 하나씩 처리한다. 프롬프트 하나마다 결과를 저장해 진행률을 보여 준다."""
    from src.core import usage_ledger
    from src.core.model_router import ENGINES, run_engine

    while True:
        owner, bid = _queue.get()
        path = _batch_path(owner, bid)
        job = _read_json(path, None)
        if not job:
            continue
        job["status"] = "running"
        _write_json(path, job)
        engine = ENGINES.get(job["model"])
        for i, prompt in enumerate(job["prompts"]):
            try:
                if engine is None:
                    raise RuntimeError("모델을 찾을 수 없습니다.")
                reply = run_engine(engine, prompt, [])
                job["results"].append({"index": i, "output": reply.get("reply") or ""})
                usage_ledger.record(reply.get("backend", "lars"), job["model"], "batch", 0, 0, False)
            except Exception:
                job["results"].append({"index": i, "error": "이 프롬프트는 처리하지 못했습니다."})
            job["done"] = i + 1
            _write_json(path, job)
        job["status"] = "done" if all("output" in r for r in job["results"]) else "partial"
        job["finished_at"] = _now()
        _write_json(path, job)


# ---------- 웹훅 ----------

def _check_url(url: str) -> None:
    parsed = urlparse(url)
    if parsed.scheme != "https" or not parsed.hostname:
        raise ValueError("웹훅 주소는 https://로 시작해야 합니다.")
    try:
        infos = socket.getaddrinfo(parsed.hostname, 443)
    except socket.gaierror:
        raise ValueError("웹훅 주소의 호스트를 찾을 수 없습니다.")
    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_multicast or ip.is_reserved or ip.is_unspecified:
            raise ValueError("내부 네트워크 주소로는 웹훅을 보낼 수 없습니다.")


def add_webhook(owner: str, name: str, url: str, events: List[str]) -> dict:
    bad = [e for e in events if e not in WEBHOOK_EVENTS]
    if bad or not events:
        raise ValueError(f"이벤트를 골라 주세요. 가능한 이벤트: {', '.join(sorted(WEBHOOK_EVENTS))}")
    _check_url(url)
    folder = _owner_dir("webhooks", owner)
    with _lock:
        hooks = _read_json(folder / "hooks.json", [])
        if len(hooks) >= WEBHOOK_MAX:
            raise ValueError(f"웹훅은 최대 {WEBHOOK_MAX}개까지 만들 수 있습니다.")
        secret = "whsec_" + secrets.token_urlsafe(24)
        hook = {"id": secrets.token_hex(8), "name": name, "url": url, "events": events,
                "secret": secret, "created_at": _now(), "notified": {}}
        hooks.append(hook)
        _write_json(folder / "hooks.json", hooks)
    return {**_public_hook(hook), "secret": secret}


def _public_hook(hook: dict) -> dict:
    return {k: hook[k] for k in ("id", "name", "url", "events", "created_at")}


def list_webhooks(owner: str) -> List[dict]:
    return [_public_hook(h) for h in _read_json(_owner_dir("webhooks", owner) / "hooks.json", [])]


def delete_webhook(owner: str, hid: str) -> bool:
    folder = _owner_dir("webhooks", owner)
    with _lock:
        hooks = _read_json(folder / "hooks.json", [])
        keep = [h for h in hooks if h["id"] != hid]
        if len(keep) == len(hooks):
            return False
        _write_json(folder / "hooks.json", keep)
    return True


def _send(hook: dict, payload: dict) -> int:
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    sig = hmac.new(hook["secret"].encode("utf-8"), body, hashlib.sha256).hexdigest()
    try:
        _check_url(hook["url"])
        res = requests.post(hook["url"], data=body, timeout=5, allow_redirects=False,
                            headers={"Content-Type": "application/json", "X-Prism-Signature": f"sha256={sig}"})
        return res.status_code
    except (requests.RequestException, ValueError):
        return 0


def test_webhook(owner: str, hid: str) -> Optional[int]:
    folder = _owner_dir("webhooks", owner)
    hook = next((h for h in _read_json(folder / "hooks.json", []) if h["id"] == hid), None)
    if hook is None:
        return None
    return _send(hook, {"type": "test", "created_at": _now()})


def notify_limit_reached(owner: str, kind: str, period: str, used: int, limit: int) -> None:
    """한도에 닿으면 웹훅을 보낸다. 같은 기간·같은 한도에는 한 번만 보낸다. 백그라운드에서 보낸다."""
    folder = _owner_dir("webhooks", owner)
    with _lock:
        hooks = _read_json(folder / "hooks.json", [])
        changed = False
        due = []
        for h in hooks:
            if "limit.reached" in h["events"] and h["notified"].get(kind) != period:
                h["notified"][kind] = period
                changed = True
                due.append(dict(h))
        if changed:
            _write_json(folder / "hooks.json", hooks)
    if not due:
        return
    payload = {"type": "limit.reached", "limit": kind, "period": period, "used": used, "max": limit, "created_at": _now()}
    threading.Thread(target=lambda: [_send(h, payload) for h in due], daemon=True).start()


# ---------- 팀 ----------

def _teams() -> List[dict]:
    return _read_json(BASE / "teams.json", [])


def _save_teams(teams: List[dict]) -> None:
    _write_json(BASE / "teams.json", teams)


def _is_member(team: dict, email: str) -> bool:
    e = email.lower()
    return team["owner"] == e or any(m["email"] == e for m in team["members"])


def create_team(owner: str, name: str) -> dict:
    with _lock:
        teams = _teams()
        if sum(1 for t in teams if t["owner"] == owner.lower()) >= 5:
            raise ValueError("팀은 한 사람이 최대 5개까지 만들 수 있습니다.")
        team = {"id": secrets.token_hex(8), "name": name, "owner": owner.lower(), "created_at": _now(), "members": []}
        teams.append(team)
        _save_teams(teams)
    return team


def teams_for(email: str) -> List[dict]:
    return [t for t in _teams() if _is_member(t, email)]


def get_team(email: str, tid: str) -> Optional[dict]:
    team = next((t for t in _teams() if t["id"] == tid), None)
    if team is None or not _is_member(team, email):
        return None
    return team


def add_member(owner: str, tid: str, email: str, role: str) -> dict:
    e = email.strip().lower()
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", e):
        raise ValueError("이메일 형식이 올바르지 않습니다.")
    if role != "member":
        raise ValueError("팀 멤버의 역할은 member입니다.")
    with _lock:
        teams = _teams()
        team = next((t for t in teams if t["id"] == tid), None)
        if team is None or team["owner"] != owner.lower():
            raise PermissionError("팀장만 멤버를 추가할 수 있습니다.")
        if e == team["owner"] or any(m["email"] == e for m in team["members"]):
            raise ValueError("이미 팀에 있는 사람입니다.")
        if len(team["members"]) >= TEAM_MAX_MEMBERS:
            raise ValueError(f"팀 멤버는 최대 {TEAM_MAX_MEMBERS}명입니다.")
        member = {"email": e, "role": role, "added_at": _now()}
        team["members"].append(member)
        _save_teams(teams)
    return member


def remove_member(owner: str, tid: str, email: str) -> bool:
    e = email.strip().lower()
    with _lock:
        teams = _teams()
        team = next((t for t in teams if t["id"] == tid), None)
        if team is None or team["owner"] != owner.lower():
            raise PermissionError("팀장만 멤버를 뺄 수 있습니다.")
        before = len(team["members"])
        team["members"] = [m for m in team["members"] if m["email"] != e]
        if len(team["members"]) == before:
            return False
        _save_teams(teams)
    return True


def team_usage(team: dict) -> List[dict]:
    """팀원별 API 사용량. 팀원이 만든 API 키의 호출을 합산한다."""
    from src.core import api_keys, usage_ledger

    owners = api_keys.owner_by_key_id()
    members = [team["owner"]] + [m["email"] for m in team["members"]]
    totals = {m: {"email": m, "requests": 0, "input_tokens": 0, "output_tokens": 0, "last_call": None} for m in members}
    for row in usage_ledger.all_rows():
        kid = row.get("key_id")
        owner = owners.get(kid) if kid else None
        if owner not in totals:
            continue
        t = totals[owner]
        t["requests"] += 1
        t["input_tokens"] += int(row.get("input_tokens") or 0)
        t["output_tokens"] += int(row.get("output_tokens") or 0)
        if not t["last_call"] or row["ts"] > t["last_call"]:
            t["last_call"] = row["ts"]
    return list(totals.values())
