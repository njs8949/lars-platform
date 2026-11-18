"""LARS 모델 API 키 저장소.

- 키 비밀값은 생성할 때 한 번만 돌려주고, 파일에는 SHA-256 해시만 남긴다.
- 키는 만든 사용자(owner 이메일) 단위로 관리한다. 목록·폐기는 본인 키에만 된다.
- 분당 요청 수 제한은 프로세스 메모리에서 센다 (단일 서버 기준).
"""

import hashlib
import hmac
import json
import secrets
import threading
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

STORE = Path(".lars") / "api" / "keys.json"
KEY_PREFIX = "lars_"
MAX_KEYS_PER_OWNER = 10
RATE_LIMIT_PER_MIN = 60

_lock = threading.Lock()
_windows: dict = {}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _hash(secret: str) -> str:
    return hashlib.sha256(secret.encode("utf-8")).hexdigest()


def _load() -> list:
    try:
        return json.loads(STORE.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return []


def _save(rows: list) -> None:
    STORE.parent.mkdir(parents=True, exist_ok=True)
    tmp = STORE.with_suffix(".tmp")
    tmp.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(STORE)


def _public(row: dict) -> dict:
    return {k: row.get(k) for k in ("id", "name", "prefix", "created_at", "last_used_at", "revoked_at", "request_count")}


def create(owner: str, name: str) -> tuple:
    """새 키를 만든다. (공개 정보, 비밀값) 을 돌려준다. 비밀값은 여기서만 볼 수 있다."""
    with _lock:
        rows = _load()
        active = [r for r in rows if r["owner"] == owner and not r.get("revoked_at")]
        if len(active) >= MAX_KEYS_PER_OWNER:
            raise ValueError(f"키는 최대 {MAX_KEYS_PER_OWNER}개까지 만들 수 있습니다. 쓰지 않는 키를 폐기해 주세요.")
        secret = KEY_PREFIX + secrets.token_urlsafe(32)
        row = {
            "id": secrets.token_hex(8),
            "owner": owner,
            "name": name,
            "prefix": secret[:12] + "…",
            "hash": _hash(secret),
            "created_at": _now(),
            "last_used_at": None,
            "revoked_at": None,
            "request_count": 0,
        }
        rows.append(row)
        _save(rows)
        return _public(row), secret


def list_for(owner: str) -> list:
    return [_public(r) for r in _load() if r["owner"] == owner]


def revoke(owner: str, key_id: str) -> bool:
    with _lock:
        rows = _load()
        for r in rows:
            if r["id"] == key_id and r["owner"] == owner and not r.get("revoked_at"):
                r["revoked_at"] = _now()
                _save(rows)
                return True
        return False


def verify(secret: Optional[str]) -> Optional[dict]:
    """비밀값이 유효하면 키 정보를 돌려준다. 폐기된 키·없는 키는 None."""
    if not secret or not secret.startswith(KEY_PREFIX):
        return None
    digest = _hash(secret)
    for r in _load():
        if not r.get("revoked_at") and hmac.compare_digest(r["hash"], digest):
            return r
    return None


def touch(key_id: str) -> None:
    with _lock:
        rows = _load()
        for r in rows:
            if r["id"] == key_id:
                r["last_used_at"] = _now()
                r["request_count"] = int(r.get("request_count") or 0) + 1
                break
        _save(rows)


def allow_request(key_id: str) -> bool:
    """분당 RATE_LIMIT_PER_MIN 회까지 허용한다."""
    now = time.time()
    with _lock:
        window = [t for t in _windows.get(key_id, []) if now - t < 60]
        if len(window) >= RATE_LIMIT_PER_MIN:
            _windows[key_id] = window
            return False
        window.append(now)
        _windows[key_id] = window
        return True


def owner_by_key_id() -> dict:
    """키 ID -> 만든 사람 이메일. 폐기된 키도 포함한다 (과거 사용량을 팀에 귀속하기 위해)."""
    return {r["id"]: r["owner"] for r in _load()}
