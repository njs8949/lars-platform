"""외부 에이전트 키 금고 (AWS KMS 봉투 암호화).

- 키 값은 AES-256-GCM으로 암호화해 파일에 저장한다.
- 그 AES 데이터 키는 AWS KMS가 만든 것이고, KMS 키(PRISM_VAULT_KMS_KEY_ID)로 감싸진 형태만 파일에 남는다.
  즉 파일이 유출되어도 KMS 권한 없이는 키를 풀 수 없다. 평문 데이터 키는 디스크에 쓰지 않는다.
- 복호화한 데이터 키는 메모리에 최대 5분 동안만 두고 재사용한다. 채팅 요청마다 KMS를 부르지 않아 응답이 늦어지지 않는다.
- 호출하는 쪽은 서버 인스턴스 역할(IAM)로 KMS에 접근한다. 이 키에 대해 GenerateDataKey와 Decrypt만 허용한다.
- 키 값은 상태 응답, 로그, 오류 메시지에 넣지 않는다. 화면에는 뒤 4자리만 보인다.
- 호출 주소는 고정 목록(api.anthropic.com, api.openai.com)만 허용한다.
"""

import base64
import hashlib
import json
import os
import re
import threading
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

BASE = Path(".lars") / "vault"
PROVIDERS = ("anthropic", "openai")
PROVIDER_HOST = {"anthropic": "api.anthropic.com", "openai": "api.openai.com"}
KEY_PATTERN = {
    "anthropic": re.compile(r"^sk-ant-[A-Za-z0-9_\-]{20,300}$"),
    "openai": re.compile(r"^sk-[A-Za-z0-9_\-]{20,300}$"),
}
DATA_KEY_TTL_SECONDS = 300
DATA_KEY_CACHE_MAX = 256
_lock = threading.Lock()
_dk_cache: dict = {}  # 암호화된 데이터 키(base64) -> (평문 데이터 키, 만료 시각)
_kms_client = None


class VaultUnavailable(RuntimeError):
    """KMS 설정이 없거나 KMS 호출이 실패해서 금고를 쓸 수 없다."""


def _key_id() -> str:
    key_id = os.getenv("PRISM_VAULT_KMS_KEY_ID", "").strip()
    if not key_id:
        raise VaultUnavailable("서버에 키 보관 설정(PRISM_VAULT_KMS_KEY_ID)이 없어서 외부 에이전트 키를 저장할 수 없습니다.")
    return key_id


def _kms():
    global _kms_client
    if _kms_client is None:
        import boto3
        region = os.getenv("PRISM_VAULT_REGION", "").strip() or os.getenv("AWS_REGION", "").strip() or "ap-northeast-2"
        _kms_client = boto3.client("kms", region_name=region)
    return _kms_client


def _new_data_key() -> tuple:
    """KMS에서 새 데이터 키를 받는다. (평문 키 bytes, KMS로 감싼 키 bytes)."""
    try:
        resp = _kms().generate_data_key(KeyId=_key_id(), KeySpec="AES_256")
    except VaultUnavailable:
        raise
    except Exception:
        raise VaultUnavailable("키 보관 서비스(KMS) 호출에 실패했습니다. 잠시 후 다시 시도해 주세요.")
    return resp["Plaintext"], resp["CiphertextBlob"]


def _data_key_from_blob(blob_b64: str) -> bytes:
    """감싸진 데이터 키를 풀어 쓴다. 최근에 푼 키는 TTL 동안 메모리에서 재사용한다."""
    now = time.time()
    with _lock:
        hit = _dk_cache.get(blob_b64)
        if hit and hit[1] > now:
            return hit[0]
    try:
        resp = _kms().decrypt(CiphertextBlob=base64.b64decode(blob_b64))
    except Exception:
        raise VaultUnavailable("키 보관 서비스(KMS)에서 키를 풀지 못했습니다. 권한과 키 설정을 확인해 주세요.")
    plain = resp["Plaintext"]
    with _lock:
        if len(_dk_cache) >= DATA_KEY_CACHE_MAX:
            _dk_cache.clear()
        _dk_cache[blob_b64] = (plain, now + DATA_KEY_TTL_SECONDS)
    return plain


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _owner_hash(owner: str) -> str:
    return hashlib.sha256(owner.lower().encode("utf-8")).hexdigest()[:24]


def _path(owner: str) -> Path:
    return BASE / f"{_owner_hash(owner)}.json"


def _load(owner: str) -> dict:
    try:
        return json.loads(_path(owner).read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {"keys": {}, "preferred": "auto"}


def _save(owner: str, data: dict) -> None:
    path = _path(owner)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    tmp.replace(path)


def _aad(owner: str, provider: str) -> bytes:
    # 암호문을 다른 사용자나 다른 제공자 자리로 옮겨 붙이지 못하도록 묶는다.
    return f"prism-agent-vault|{_owner_hash(owner)}|{provider}".encode("utf-8")


def validate(provider: str, key: str) -> str:
    if provider not in PROVIDERS:
        raise ValueError("지원하지 않는 에이전트입니다.")
    clean = (key or "").strip()
    if not KEY_PATTERN[provider].match(clean):
        raise ValueError("키 형식이 올바르지 않습니다. 제공자 콘솔에서 복사한 키인지 확인해 주세요.")
    return clean


def set_key(owner: str, provider: str, key: str) -> dict:
    clean = validate(provider, key)
    plain_dk, wrapped = _new_data_key()
    nonce = os.urandom(12)
    ct = AESGCM(plain_dk).encrypt(nonce, clean.encode("utf-8"), _aad(owner, provider))
    del plain_dk  # 평문 데이터 키는 메모리에서 바로 버린다
    record = {
        "dek": base64.b64encode(wrapped).decode("ascii"),
        "nonce": base64.b64encode(nonce).decode("ascii"),
        "ct": base64.b64encode(ct).decode("ascii"),
        "last4": clean[-4:],
        "updated_at": _now(),
    }
    with _lock:
        data = _load(owner)
        data["keys"][provider] = record
        _save(owner, data)
    return status(owner)


def delete_key(owner: str, provider: str) -> dict:
    with _lock:
        data = _load(owner)
        data["keys"].pop(provider, None)
        _save(owner, data)
    return status(owner)


def set_preferred(owner: str, preferred: str) -> dict:
    if preferred not in ("auto",) + PROVIDERS:
        raise ValueError("우선 사용할 에이전트는 auto, anthropic, openai 중 하나입니다.")
    with _lock:
        data = _load(owner)
        data["preferred"] = preferred
        _save(owner, data)
    return status(owner)


def status(owner: str) -> dict:
    """화면에 보여도 되는 정보만 돌려준다. KMS를 부르지 않고 설정 여부만 본다."""
    data = _load(owner)
    keys = {p: {"configured": True, "last4": data["keys"][p]["last4"], "updated_at": data["keys"][p]["updated_at"]}
            for p in PROVIDERS if p in data["keys"]}
    return {"keys": keys, "preferred": data.get("preferred", "auto"), "vault_ready": ready()}


def ready() -> bool:
    return bool(os.getenv("PRISM_VAULT_KMS_KEY_ID", "").strip())


def _open(owner: str, provider: str, record: dict) -> str:
    dk = _data_key_from_blob(record["dek"])
    try:
        plain = AESGCM(dk).decrypt(base64.b64decode(record["nonce"]), base64.b64decode(record["ct"]), _aad(owner, provider))
    except (InvalidTag, ValueError):
        raise VaultUnavailable("저장된 키가 손상되었거나 다른 계정의 것입니다. 설정에서 키를 다시 넣어 주세요.")
    return plain.decode("utf-8")


def pick(owner: str, requested: Optional[str] = None) -> Optional[tuple]:
    """호출할 (제공자, 키)를 고른다. 키 값은 서버 안에서만 쓰고 밖으로 내보내지 않는다."""
    data = _load(owner)
    available = [p for p in PROVIDERS if p in data["keys"]]
    if not available:
        return None
    choice = requested if requested in PROVIDERS else data.get("preferred", "auto")
    if choice not in available:
        choice = available[0]
    return choice, _open(owner, choice, data["keys"][choice])
