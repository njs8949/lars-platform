"""LARS 모델 API.

- 외부 호출: /v1/chat/completions, /v1/models  (Authorization: Bearer lars_...)
  OpenAI 호환 형식을 따른다. 모델은 LARS 엔진(Native, Cosmos, Prime)과 확장 모델을 고른다.
  각 모델은 model_router의 엔진 정의와 같은 역할 프롬프트·폴백 경로를 쓴다.
- 키 관리: /api/console/keys  (로그인 토큰으로만 접근, 본인 키만 보인다)

키 비밀값과 메시지 내용은 로그에 남기지 않는다. 사용량(토큰 수, 키 ID)만 원장에 기록한다.
"""

import asyncio
import time
import uuid
from typing import List, Optional

import hashlib
import json
import logging
import os
from typing import Iterator

import requests
from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import JSONResponse, Response, StreamingResponse
import requests
from pydantic import BaseModel, Field

from src.api.feature_routes import _signed_in_email
from src.core import agent_vault, api_keys, console_store, prism_features, usage_ledger
from src.core.llm_provider import bedrock_stream, is_production
from src.core.model_router import (
    ENGINES,
    OLLAMA_TIMEOUT,
    OLLAMA_URL,
    _call_claude,
    _ollama_available,
    iter_exaone_stream,
    run_engine,
)

DEFAULT_MODEL = "lars-native"
# API 모델 ID -> 표시 이름. ID는 model_router.ENGINES 키와 같다.
MODELS = {
    "lars-native": "LARS Native",
    "lars-cosmos": "LARS Cosmos",
    "lars-prime": "LARS Prime",
    "rekora": "Rekora",
    "synzora": "Synzora",
    "aivora": "Aivora",
    "exaone": "K-EXAONE 2.5",
}
MAX_MESSAGES = 40
MAX_CHARS_PER_MESSAGE = 20000
MAX_TOKENS_CAP = 4096
ALLOWED_ROLES = {"system", "user", "assistant"}

v1 = APIRouter(prefix="/v1", tags=["lars-api"])
keys_router = APIRouter(prefix="/api/console/keys", tags=["lars-api-keys"])
console_router = APIRouter(prefix="/api/console", tags=["console"])


def _error(status: int, message: str, kind: str = "invalid_request_error") -> JSONResponse:
    return JSONResponse(status_code=status, content={"error": {"message": message, "type": kind}})


def _bearer(request: Request) -> str:
    header = request.headers.get("authorization") or ""
    return header[7:].strip() if header.lower().startswith("bearer ") else ""


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    model: str = DEFAULT_MODEL
    messages: List[ChatMessage] = Field(..., min_length=1)
    max_tokens: Optional[int] = Field(default=1024, ge=1, le=MAX_TOKENS_CAP)
    stream: bool = False


@v1.get("/models")
async def list_models(request: Request):
    key = api_keys.verify(_bearer(request))
    if key is None:
        return _error(401, "API 키가 없거나 올바르지 않습니다.", "authentication_error")
    return {"object": "list", "data": [
        {"id": mid, "object": "model", "owned_by": "lars", "name": name} for mid, name in MODELS.items() if mid in ENGINES
    ]}


@v1.post("/chat/completions")
async def chat_completions(body: ChatRequest, request: Request):
    secret = _bearer(request)
    key = api_keys.verify(secret)
    if key is None:
        return _error(401, "API 키가 없거나 올바르지 않습니다.", "authentication_error")
    if not api_keys.allow_request(key["id"]):
        return _error(429, f"요청이 너무 많습니다. 분당 {api_keys.RATE_LIMIT_PER_MIN}회까지 보낼 수 있습니다.", "rate_limit_error")
    if body.model not in MODELS:
        return _error(404, f"모델 '{body.model}'을(를) 찾을 수 없습니다. 사용 가능한 모델: {', '.join(MODELS)}")
    if len(body.messages) > MAX_MESSAGES:
        return _error(400, f"메시지는 최대 {MAX_MESSAGES}개까지 보낼 수 있습니다.")
    messages = []
    for m in body.messages:
        if m.role not in ALLOWED_ROLES:
            return _error(400, f"지원하지 않는 role입니다: {m.role}. system, user, assistant 중 하나를 써 주세요.")
        if len(m.content) > MAX_CHARS_PER_MESSAGE:
            return _error(400, f"메시지 한 개는 {MAX_CHARS_PER_MESSAGE}자를 넘을 수 없습니다.")
        messages.append({"role": m.role, "content": m.content})

    # 마지막 user 메시지를 질문으로, 그 앞의 대화를 기록으로 넘긴다.
    last_user = next((i for i in range(len(messages) - 1, -1, -1) if messages[i]["role"] == "user"), None)
    if last_user is None:
        return _error(400, "user 메시지가 최소 한 개 필요합니다.")
    question = messages[last_user]["content"]
    history = [m for m in messages[:last_user] if m["content"].strip()]

    engine = ENGINES[body.model]
    full_messages = [{"role": "system", "content": engine.role}] + [m for m in messages]
    max_tokens = body.max_tokens or 1024

    if body.stream:
        return StreamingResponse(
            _stream_response(engine, full_messages, max_tokens, key["id"], body.model),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )

    try:
        result = await asyncio.to_thread(run_engine, engine, question, history)
    except Exception:
        return _error(502, "모델 호출에 실패했습니다. 잠시 후 다시 시도해 주세요.", "api_error")
    text = result.get("reply") or ""

    # 토큰 수는 백엔드마다 정확히 알 수 없어서 글자 수로 추정하고, 원장에는 '토큰 미확인'으로 남긴다.
    est_in = sum(len(m["content"]) for m in messages) // 3 + 1
    est_out = len(text) // 3 + 1
    await asyncio.to_thread(usage_ledger.record, result.get("backend", "lars"), body.model, "api", 0, 0, False, key["id"])
    await asyncio.to_thread(api_keys.touch, key["id"])
    return {
        "id": f"chatcmpl-{uuid.uuid4().hex[:24]}",
        "object": "chat.completion",
        "created": int(time.time()),
        "model": body.model,
        "choices": [{"index": 0, "message": {"role": "assistant", "content": text}, "finish_reason": "stop"}],
        "usage": {"prompt_tokens": est_in, "completion_tokens": est_out, "total_tokens": est_in + est_out, "estimated": True},
    }


def _chunk(cid: str, model: str, delta: dict, finish: Optional[str] = None) -> str:
    body = {
        "id": cid,
        "object": "chat.completion.chunk",
        "created": int(time.time()),
        "model": model,
        "choices": [{"index": 0, "delta": delta, "finish_reason": finish}],
    }
    return "data: " + json.dumps(body, ensure_ascii=False) + "\n\n"


def _ollama_stream(engine, messages: List[dict], usage: dict) -> Iterator[str]:
    """Ollama 응답을 조각 단위로 받는다. 끝의 done 조각에 토큰 수가 들어 있다."""
    with requests.post(
        OLLAMA_URL,
        json={"model": engine.model, "messages": messages, "stream": True, "options": {"temperature": 0.3}},
        stream=True,
        timeout=OLLAMA_TIMEOUT,
    ) as response:
        response.raise_for_status()
        for line in response.iter_lines():
            if not line:
                continue
            obj = json.loads(line)
            piece = (obj.get("message") or {}).get("content", "")
            if piece:
                yield piece
            if obj.get("done"):
                usage["inputTokens"] = obj.get("prompt_eval_count") or 0
                usage["outputTokens"] = obj.get("eval_count") or 0


def _engine_stream(engine, messages: List[dict], max_tokens: int, usage: dict) -> Iterator[tuple]:
    """(backend, 조각) 을 차례로 낸다. 실제 토큰 조각이 도착하는 대로 보낸다."""
    if engine.backend == "exaone":
        yield "exaone-api", None
        for piece in iter_exaone_stream(messages, usage):
            yield "exaone-api", piece
        return
    if engine.backend == "ollama" and _ollama_available(engine.model):
        yield "ollama", None
        for piece in _ollama_stream(engine, messages, usage):
            yield "ollama", piece
        return
    if is_production():
        yield "bedrock", None
        for piece in bedrock_stream(messages, max_tokens=max_tokens, usage_out=usage):
            yield "bedrock", piece
        return
    # 개발 환경(Claude 키 사용)은 조각 스트림이 없으므로 한 번에 받아 한 조각으로 보낸다.
    yield "claude-fallback", None
    yield "claude-fallback", _call_claude(engine, messages)


def _stream_response(engine, messages: List[dict], max_tokens: int, key_id: str, model: str) -> Iterator[str]:
    cid = f"chatcmpl-{uuid.uuid4().hex[:24]}"
    usage: dict = {}
    backend = "lars"
    sent_any = False
    try:
        yield _chunk(cid, model, {"role": "assistant", "content": ""})
        for backend, piece in _engine_stream(engine, messages, max_tokens, usage):
            if piece:
                sent_any = True
                yield _chunk(cid, model, {"content": piece})
        yield _chunk(cid, model, {}, finish="stop")
    except Exception:
        message = "모델 호출 중 오류가 났습니다." if sent_any else "모델 호출에 실패했습니다. 잠시 후 다시 시도해 주세요."
        yield "data: " + json.dumps({"error": {"message": message, "type": "api_error"}}, ensure_ascii=False) + "\n\n"
    finally:
        # 토큰 수를 알 수 있으면(Bedrock, Ollama) 정확히, 아니면 호출 횟수만 남긴다.
        known = bool(usage.get("inputTokens") or usage.get("outputTokens"))
        usage_ledger.record(backend, model, "api", int(usage.get("inputTokens") or 0), int(usage.get("outputTokens") or 0), known, key_id)
        api_keys.touch(key_id)
    yield "data: [DONE]\n\n"


# ---------- 키 관리 (콘솔, 로그인 필요) ----------

class CreateKeyRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=60)


@keys_router.get("")
async def list_keys(request: Request):
    owner = _signed_in_email(request)
    return {"keys": await asyncio.to_thread(api_keys.list_for, owner), "models": MODELS, "default_model": DEFAULT_MODEL}


@keys_router.post("")
async def create_key(body: CreateKeyRequest, request: Request):
    owner = _signed_in_email(request)
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="키 이름을 입력해 주세요.")
    try:
        info, secret = await asyncio.to_thread(api_keys.create, owner, name)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    # 비밀값은 이 응답에서만 돌려준다. 이후에는 다시 볼 수 없다.
    return {"key": info, "secret": secret}


@keys_router.delete("/{key_id}")
async def revoke_key(key_id: str, request: Request):
    owner = _signed_in_email(request)
    ok = await asyncio.to_thread(api_keys.revoke, owner, key_id)
    if not ok:
        raise HTTPException(status_code=404, detail="폐기할 키를 찾을 수 없습니다.")
    return {"ok": True}


# ---------- 콘솔: 플레이그라운드, 한도, 데이터 제어 ----------

def _admins() -> set:
    raw = os.getenv("PRISM_CONSOLE_ADMINS", "lars@lars-technologies.com")
    return {e.strip().lower() for e in raw.split(",") if e.strip()}


def _require_admin(request: Request) -> str:
    owner = _signed_in_email(request)
    if owner.lower() not in _admins():
        raise HTTPException(status_code=403, detail="관리자만 할 수 있는 작업입니다.")
    return owner


class PlaygroundRequest(BaseModel):
    model: str = DEFAULT_MODEL
    messages: List[ChatMessage] = Field(..., min_length=1)
    max_tokens: Optional[int] = Field(default=1024, ge=1, le=MAX_TOKENS_CAP)


@console_router.post("/playground")
async def playground(body: PlaygroundRequest, request: Request):
    """콘솔에서 프리즘 모델을 직접 호출한다. 로그인한 사용자만 쓸 수 있고, 호출은 사용량에 기록된다."""
    owner = _signed_in_email(request)
    if not api_keys.allow_request("playground:" + owner):
        raise HTTPException(status_code=429, detail="요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.")
    if body.model not in MODELS:
        raise HTTPException(status_code=404, detail=f"모델 '{body.model}'을(를) 찾을 수 없습니다.")
    if len(body.messages) > MAX_MESSAGES:
        raise HTTPException(status_code=400, detail=f"메시지는 최대 {MAX_MESSAGES}개까지 보낼 수 있습니다.")
    messages = []
    for m in body.messages:
        if m.role not in ALLOWED_ROLES:
            raise HTTPException(status_code=400, detail=f"지원하지 않는 role입니다: {m.role}")
        if len(m.content) > MAX_CHARS_PER_MESSAGE:
            raise HTTPException(status_code=400, detail=f"메시지 한 개는 {MAX_CHARS_PER_MESSAGE}자를 넘을 수 없습니다.")
        messages.append({"role": m.role, "content": m.content})
    last_user = next((i for i in range(len(messages) - 1, -1, -1) if messages[i]["role"] == "user"), None)
    if last_user is None:
        raise HTTPException(status_code=400, detail="user 메시지가 최소 한 개 필요합니다.")
    question = messages[last_user]["content"]
    history = [m for m in messages[:last_user] if m["content"].strip()]
    try:
        result = await asyncio.to_thread(run_engine, ENGINES[body.model], question, history)
    except Exception:
        raise HTTPException(status_code=502, detail="모델 호출에 실패했습니다. 잠시 후 다시 시도해 주세요.")
    await asyncio.to_thread(usage_ledger.record, result.get("backend", "lars"), body.model, "playground", 0, 0, False)
    return {"reply": result.get("reply") or "", "model": body.model, "name": MODELS[body.model], "backend": result.get("backend")}


@console_router.get("/limits")
async def get_limits(request: Request):
    owner = _signed_in_email(request)
    return {"limits": usage_ledger.limits(), "is_admin": owner.lower() in _admins()}


class LimitsRequest(BaseModel):
    monthly_tokens: Optional[int] = Field(default=None, ge=0)
    weekly_tokens: Optional[int] = Field(default=None, ge=0)
    session_tokens: Optional[int] = Field(default=None, ge=0)


@console_router.put("/limits")
async def put_limits(body: LimitsRequest, request: Request):
    _require_admin(request)
    try:
        saved = await asyncio.to_thread(usage_ledger.set_limits, body.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"limits": saved}


@console_router.get("/data")
async def get_data(request: Request):
    owner = _signed_in_email(request)
    info = await asyncio.to_thread(usage_ledger.storage_info)
    return {**info, "is_admin": owner.lower() in _admins()}


class RetentionRequest(BaseModel):
    days: int = Field(..., ge=0, le=3650)


@console_router.put("/data/retention")
async def put_retention(body: RetentionRequest, request: Request):
    _require_admin(request)
    try:
        saved = await asyncio.to_thread(usage_ledger.set_retention, body.days)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return saved


@console_router.post("/data/prune")
async def prune_data(request: Request):
    _require_admin(request)
    removed = await asyncio.to_thread(usage_ledger.prune)
    return {"removed": removed, "retention_days": usage_ledger.get_settings()["retention_days"]}


@console_router.get("/usage.csv")
async def export_usage(request: Request):
    _require_admin(request)
    text = await asyncio.to_thread(usage_ledger.export_csv)
    return Response(content=text.encode("utf-8"), media_type="text/csv",
                    headers={"Content-Disposition": "attachment; filename=prism-usage.csv"})


# ---------- 콘솔: 파일, 스킬, 웹훅, 배치, 팀 ----------

def _not_found(what: str):
    raise HTTPException(status_code=404, detail=f"{what}을(를) 찾을 수 없습니다.")


@console_router.get("/files")
async def files_list(request: Request):
    owner = _signed_in_email(request)
    return {"files": await asyncio.to_thread(console_store.list_files, owner), "limit_mb": 10,
            "allowed": sorted(console_store.ALLOWED_EXT)}


@console_router.post("/files")
async def files_upload(request: Request, file: UploadFile = File(...)):
    owner = _signed_in_email(request)
    data = await file.read(console_store.FILE_LIMIT_BYTES + 1)
    try:
        meta = await asyncio.to_thread(console_store.add_file, owner, file.filename or "file", data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"file": meta}


@console_router.get("/files/{fid}/content")
async def files_download(fid: str, request: Request):
    owner = _signed_in_email(request)
    found = await asyncio.to_thread(console_store.get_file_bytes, owner, fid)
    if found is None:
        _not_found("파일")
    name, data = found
    return Response(content=data, media_type="application/octet-stream",
                    headers={"Content-Disposition": f'attachment; filename="{name}"'})


@console_router.delete("/files/{fid}")
async def files_delete(fid: str, request: Request):
    owner = _signed_in_email(request)
    if not await asyncio.to_thread(console_store.delete_file, owner, fid):
        _not_found("파일")
    return {"ok": True}


@console_router.get("/skills")
async def skills_list(request: Request):
    _signed_in_email(request)
    from src.core import skills as skills_engine
    return {"skills": await asyncio.to_thread(skills_engine.list_installed)}


class WebhookRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=60)
    url: str = Field(..., min_length=8, max_length=500)
    events: List[str] = Field(..., min_length=1)


@console_router.get("/webhooks")
async def webhooks_list(request: Request):
    owner = _signed_in_email(request)
    return {"webhooks": await asyncio.to_thread(console_store.list_webhooks, owner),
            "events": sorted(console_store.WEBHOOK_EVENTS)}


@console_router.post("/webhooks")
async def webhooks_create(body: WebhookRequest, request: Request):
    owner = _signed_in_email(request)
    try:
        hook = await asyncio.to_thread(console_store.add_webhook, owner, body.name.strip(), body.url.strip(), body.events)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    # 서명 비밀값은 이 응답에서만 돌려준다.
    return {"webhook": hook}


@console_router.delete("/webhooks/{hid}")
async def webhooks_delete(hid: str, request: Request):
    owner = _signed_in_email(request)
    if not await asyncio.to_thread(console_store.delete_webhook, owner, hid):
        _not_found("웹훅")
    return {"ok": True}


@console_router.post("/webhooks/{hid}/test")
async def webhooks_test(hid: str, request: Request):
    owner = _signed_in_email(request)
    status = await asyncio.to_thread(console_store.test_webhook, owner, hid)
    if status is None:
        _not_found("웹훅")
    return {"status": status, "ok": 200 <= status < 300}


class BatchRequest(BaseModel):
    model: str = DEFAULT_MODEL
    prompts: List[str] = Field(..., min_length=1)
    max_tokens: Optional[int] = Field(default=1024, ge=1, le=MAX_TOKENS_CAP)


@console_router.get("/batches")
async def batches_list(request: Request):
    owner = _signed_in_email(request)
    return {"batches": await asyncio.to_thread(console_store.list_batches, owner)}


@console_router.post("/batches")
async def batches_create(body: BatchRequest, request: Request):
    owner = _signed_in_email(request)
    if body.model not in MODELS:
        raise HTTPException(status_code=404, detail=f"모델 '{body.model}'을(를) 찾을 수 없습니다.")
    if not api_keys.allow_request("batch:" + owner):
        raise HTTPException(status_code=429, detail="배치 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.")
    try:
        job = await asyncio.to_thread(console_store.create_batch, owner, body.model, body.prompts, body.max_tokens or 1024)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"batch": job}


@console_router.get("/batches/{bid}")
async def batches_get(bid: str, request: Request):
    owner = _signed_in_email(request)
    job = await asyncio.to_thread(console_store.get_batch, owner, bid)
    if job is None:
        _not_found("배치")
    return {"batch": job}


class TeamRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=60)


class MemberRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=200)


@console_router.get("/teams")
async def teams_list(request: Request):
    owner = _signed_in_email(request)
    teams = await asyncio.to_thread(console_store.teams_for, owner)
    return {"teams": [{"id": t["id"], "name": t["name"], "owner": t["owner"], "members": len(t["members"]) + 1,
                       "is_owner": t["owner"] == owner.lower()} for t in teams]}


@console_router.post("/teams")
async def teams_create(body: TeamRequest, request: Request):
    owner = _signed_in_email(request)
    try:
        team = await asyncio.to_thread(console_store.create_team, owner, body.name.strip())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"team": {"id": team["id"], "name": team["name"]}}


@console_router.get("/teams/{tid}")
async def teams_get(tid: str, request: Request):
    email = _signed_in_email(request)
    team = await asyncio.to_thread(console_store.get_team, email, tid)
    if team is None:
        _not_found("팀")
    usage = await asyncio.to_thread(console_store.team_usage, team)
    return {"team": {"id": team["id"], "name": team["name"], "owner": team["owner"],
                     "members": team["members"], "is_owner": team["owner"] == email.lower()},
            "usage": usage}


@console_router.post("/teams/{tid}/members")
async def teams_add_member(tid: str, body: MemberRequest, request: Request):
    owner = _signed_in_email(request)
    try:
        member = await asyncio.to_thread(console_store.add_member, owner, tid, body.email, "member")
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"member": member}


@console_router.delete("/teams/{tid}/members/{email}")
async def teams_remove_member(tid: str, email: str, request: Request):
    owner = _signed_in_email(request)
    try:
        ok = await asyncio.to_thread(console_store.remove_member, owner, tid, email)
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    if not ok:
        _not_found("멤버")
    return {"ok": True}


# ---------- 외부 에이전트: 키 금고와 서버 중계 호출 ----------

agents_router = APIRouter(prefix="/api/agents", tags=["agents"])
_agent_log = logging.getLogger("prism.agents")
AGENT_LABEL = {"anthropic": "Claude", "openai": "GPT"}
AGENT_MODEL = {"anthropic": "claude-sonnet-5-5", "openai": "gpt-4o"}
AGENT_MESSAGE_LIMIT = 40


def _vault_error(err: Exception) -> JSONResponse:
    return _error(503, str(err), "vault_unavailable")


@agents_router.get("/keys")
async def agent_keys_status(request: Request):
    owner = _signed_in_email(request)
    return await asyncio.to_thread(agent_vault.status, owner)


class AgentKeyRequest(BaseModel):
    key: str = Field(..., min_length=10, max_length=320)


@agents_router.put("/keys/{provider}")
async def agent_key_set(provider: str, body: AgentKeyRequest, request: Request):
    owner = _signed_in_email(request)
    if not api_keys.allow_request("vault:" + owner):
        raise HTTPException(status_code=429, detail="요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.")
    try:
        result = await asyncio.to_thread(agent_vault.set_key, owner, provider, body.key)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except agent_vault.VaultUnavailable as e:
        raise HTTPException(status_code=503, detail=str(e))
    # 키 값은 응답에 넣지 않는다. 뒤 4자리만 돌려준다.
    _agent_log.info("agent key stored provider=%s owner_hash=%s", provider, hashlib.sha256(owner.lower().encode()).hexdigest()[:10])
    return result


@agents_router.delete("/keys/{provider}")
async def agent_key_delete(provider: str, request: Request):
    owner = _signed_in_email(request)
    if provider not in agent_vault.PROVIDERS:
        raise HTTPException(status_code=400, detail="지원하지 않는 에이전트입니다.")
    return await asyncio.to_thread(agent_vault.delete_key, owner, provider)


class PreferredRequest(BaseModel):
    preferred: str = Field(..., max_length=20)


@agents_router.put("/preferred")
async def agent_preferred(body: PreferredRequest, request: Request):
    owner = _signed_in_email(request)
    try:
        return await asyncio.to_thread(agent_vault.set_preferred, owner, body.preferred)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


class AgentChatRequest(BaseModel):
    messages: List[ChatMessage] = Field(..., min_length=1)
    provider: Optional[str] = None
    max_tokens: Optional[int] = Field(default=2048, ge=1, le=MAX_TOKENS_CAP)


def _agent_stream(provider: str, key: str, messages: List[dict], max_tokens: int, owner_hash: str):
    """외부 제공자 주소로 스트리밍 호출하고 조각을 낸다. 키와 응답 본문은 오류 메시지에 넣지 않는다."""
    host = agent_vault.PROVIDER_HOST[provider]
    if provider == "anthropic":
        url = f"https://{host}/v1/messages"
        headers = {"content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01"}
        system = "\n\n".join(m["content"] for m in messages if m["role"] == "system")
        body = {"model": AGENT_MODEL[provider], "max_tokens": max_tokens, "stream": True,
                "messages": [m for m in messages if m["role"] != "system"]}
        if system:
            body["system"] = system
    else:
        url = f"https://{host}/v1/chat/completions"
        headers = {"content-type": "application/json", "authorization": f"Bearer {key}"}
        body = {"model": AGENT_MODEL[provider], "stream": True, "messages": messages}
    try:
        res = requests.post(url, headers=headers, json=body, stream=True, timeout=(5, 120), allow_redirects=False)
    except requests.RequestException:
        _agent_log.warning("agent call network error provider=%s owner_hash=%s", provider, owner_hash)
        raise RuntimeError(f"{AGENT_LABEL[provider]}에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.")
    if res.status_code != 200:
        _agent_log.warning("agent call failed provider=%s status=%s owner_hash=%s", provider, res.status_code, owner_hash)
        res.close()
        if res.status_code in (401, 403):
            raise RuntimeError(f"{AGENT_LABEL[provider]} 키가 유효하지 않습니다. 설정에서 키를 다시 넣어 주세요.")
        raise RuntimeError(f"{AGENT_LABEL[provider]} 호출에 실패했습니다 (HTTP {res.status_code}).")
    text_parts: List[str] = []
    try:
        for raw in res.iter_lines(decode_unicode=True):
            if not raw or not raw.startswith("data:"):
                continue
            data = raw[5:].strip()
            if not data or data == "[DONE]":
                continue
            try:
                obj = json.loads(data)
            except ValueError:
                continue
            if provider == "anthropic":
                piece = (obj.get("delta") or {}).get("text", "") if obj.get("type") == "content_block_delta" else ""
            else:
                piece = ((obj.get("choices") or [{}])[0].get("delta") or {}).get("content", "") or ""
            if piece:
                text_parts.append(piece)
                yield piece
    finally:
        res.close()
    usage_ledger.record(f"external-{provider}", AGENT_MODEL[provider], "agent", 0, 0, False)


@agents_router.post("/chat/stream")
async def agent_chat_stream(body: AgentChatRequest, request: Request):
    """저장된 외부 에이전트 키로 서버가 대신 호출한다. 브라우저는 키를 보지 않고 답변 조각만 받는다."""
    owner = _signed_in_email(request)
    if not api_keys.allow_request("agent:" + owner):
        raise HTTPException(status_code=429, detail="요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.")
    if len(body.messages) > AGENT_MESSAGE_LIMIT:
        raise HTTPException(status_code=400, detail=f"메시지는 최대 {AGENT_MESSAGE_LIMIT}개까지 보낼 수 있습니다.")
    messages = []
    for m in body.messages:
        if m.role not in ALLOWED_ROLES:
            raise HTTPException(status_code=400, detail=f"지원하지 않는 role입니다: {m.role}")
        if len(m.content) > MAX_CHARS_PER_MESSAGE:
            raise HTTPException(status_code=400, detail=f"메시지 한 개는 {MAX_CHARS_PER_MESSAGE}자를 넘을 수 없습니다.")
        messages.append({"role": m.role, "content": m.content})
    try:
        picked = await asyncio.to_thread(agent_vault.pick, owner, body.provider)
    except agent_vault.VaultUnavailable as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception:
        raise HTTPException(status_code=503, detail="저장된 키를 읽지 못했습니다. 설정에서 키를 다시 넣어 주세요.")
    if picked is None:
        raise HTTPException(status_code=404, detail="연결된 외부 에이전트가 없습니다. 설정에서 Claude 또는 GPT 키를 넣어 주세요.")
    provider, key = picked
    owner_hash = hashlib.sha256(owner.lower().encode()).hexdigest()[:10]

    def events():
        yield "data: " + json.dumps({"type": "start", "provider": provider, "label": AGENT_LABEL[provider]}, ensure_ascii=False) + "\n\n"
        try:
            for piece in _agent_stream(provider, key, messages, body.max_tokens or 2048, owner_hash):
                yield "data: " + json.dumps({"type": "delta", "text": piece}, ensure_ascii=False) + "\n\n"
            yield "data: " + json.dumps({"type": "done", "engine_used": f"connected-{provider}"}, ensure_ascii=False) + "\n\n"
        except RuntimeError as e:
            yield "data: " + json.dumps({"type": "error", "message": str(e)}, ensure_ascii=False) + "\n\n"

    return StreamingResponse(events(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


# ---------- Prism 기능 호출 (API 키: /v1/prism, 콘솔 로그인: /api/console/prism) ----------

prism_router = APIRouter(prefix="/v1/prism", tags=["prism"])
_console_prism = APIRouter(prefix="/api/console/prism", tags=["console"])


def _run_prism(feature: str, params: dict) -> JSONResponse:
    """기능을 실행하고 응답 모양을 맞춘다. 키·외부 응답 본문은 오류 메시지에 넣지 않는다."""
    from fastapi import HTTPException as _HTTPException
    try:
        result = prism_features.run(feature, params)
        return JSONResponse(content={"object": "prism.result", "feature": feature, "result": result})
    except ValueError as e:
        return _error(400, str(e))
    except RuntimeError as e:
        return _error(503, str(e), "upstream_error")
    except _HTTPException as e:
        return _error(e.status_code, str(e.detail), "upstream_error" if e.status_code >= 500 else "invalid_request_error")


@prism_router.get("/features")
async def prism_features_list(request: Request):
    key = api_keys.verify(_bearer(request))
    if key is None:
        return _error(401, "API 키가 없거나 올바르지 않습니다.", "authentication_error")
    return {"object": "list", "data": prism_features.FEATURES}


@prism_router.post("/{feature}")
async def prism_call(feature: str, request: Request):
    key = api_keys.verify(_bearer(request))
    if key is None:
        return _error(401, "API 키가 없거나 올바르지 않습니다.", "authentication_error")
    if not api_keys.allow_request(key["id"]):
        return _error(429, f"요청이 너무 많습니다. 분당 {api_keys.RATE_LIMIT_PER_MIN}회까지 보낼 수 있습니다.", "rate_limit_error")
    if feature not in prism_features.RUNNERS:
        return _error(404, f"기능 '{feature}'을(를) 찾을 수 없습니다. GET /v1/prism/features 로 목록을 확인하세요.")
    try:
        params = await request.json()
    except ValueError:
        return _error(400, "요청 본문은 JSON 객체여야 합니다.")
    api_keys.touch(key["id"])
    return await asyncio.to_thread(_run_prism, feature, params)


@_console_prism.get("/features")
async def console_prism_features(request: Request):
    _signed_in_email(request)
    return {"object": "list", "data": prism_features.FEATURES}


@_console_prism.post("/{feature}")
async def console_prism_call(feature: str, request: Request):
    owner = _signed_in_email(request)
    if not api_keys.allow_request("prism-console:" + owner):
        return _error(429, "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.", "rate_limit_error")
    if feature not in prism_features.RUNNERS:
        return _error(404, f"기능 '{feature}'을(를) 찾을 수 없습니다.")
    try:
        params = await request.json()
    except ValueError:
        return _error(400, "요청 본문은 JSON 객체여야 합니다.")
    return await asyncio.to_thread(_run_prism, feature, params)
