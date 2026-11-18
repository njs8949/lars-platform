"""화면 기능에 필요한 API: 사용자 프로필, 파일 내보내기, 템플릿 일괄 다운로드, 배포 상태 확인."""

import io
import json
import re
import time
import zipfile
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List
from urllib.parse import quote

import httpx
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import Response
from pydantic import BaseModel

from src.core.artifact_generator import ArtifactGenerationRequest, ArtifactGenerator
from src.core.artifact_ir import ArtifactType
from src.core.web_tools import _is_public_host

router = APIRouter()
PROFILE_FILE = Path(".lars") / "profile.json"

FILE_TYPES = {"pptx": "presentation", "presentation": "presentation", "docx": "document", "document": "document",
              "html": "website", "website": "website", "pdf": "pdf"}
EXTENSIONS = {"presentation": "pptx", "document": "docx", "website": "html", "pdf": "pdf"}
MEDIA = {
    "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "html": "text/html; charset=utf-8",
    "pdf": "application/pdf",
}


def _artifact(title: str, artifact_type: str, style: str = "business") -> bytes:
    request = ArtifactGenerationRequest(title=title, description=f"{title} 문서", targetTypes=[ArtifactType(artifact_type)],
                                        designStyle=style or "business", metadata={})
    result = ArtifactGenerator().generate(request)
    output = result.outputs.get(ArtifactType(artifact_type))
    if output is None:
        raise ValueError("파일을 만들지 못했습니다.")
    data = output.getvalue() if hasattr(output, "getvalue") else output
    if isinstance(data, str):
        data = data.encode("utf-8")
    if not data:
        raise ValueError("파일 내용이 비어 있습니다.")
    return bytes(data)


# ---------- 프로필 / 설정 (사용자별 저장) ----------
# 예전에는 모든 사용자가 .lars/profile.json 한 파일을 함께 썼다. 이제 로그인한 계정마다 따로 저장한다.
PROFILE_DIR = Path(".lars") / "profiles"
PROFILE_FIELDS = {"displayName": 80, "phone": 40, "companyName": 120, "businessNumber": 40, "address": 200, "avatarUrl": 400_000}
SETTING_FIELDS = {"modelType": 40, "securityLevel": 20, "ollamaEndpoint": 200, "theme": 20, "language": 10,
                  "piiScrubbingLevel": 20, "terminalShell": 60}
SETTING_FLAGS = {"useLocalModel", "enableTokenOptimization", "enableMemory", "enableNotifications",
                 "encryptionEnabled", "enableOmniControl", "autoApplyPatches"}


def _profile_path(email: str) -> Path:
    import hashlib

    key = hashlib.sha256(email.strip().lower().encode("utf-8")).hexdigest()[:24]
    return PROFILE_DIR / f"{key}.json"


def _signed_in_email(request: Request) -> str:
    from src.api.auth_routes import verify_jwt_token

    header = request.headers.get("authorization") or ""
    token = header.replace("Bearer ", "", 1).strip()
    email = verify_jwt_token(token) if token else None
    if not email:
        raise HTTPException(status_code=401, detail="로그인이 필요합니다.")
    return email


def _read_profile(email: str) -> Dict[str, Any]:
    try:
        return json.loads(_profile_path(email).read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {"profile": {}, "settings": {}}


def _clean(values: Any, allowed: Dict[str, Any]) -> Dict[str, Any]:
    """허용된 키만 남기고 형식을 맞춘다. 비밀 키(API 키 등)는 여기서 걸러져 서버에 남지 않는다."""
    out: Dict[str, Any] = {}
    if not isinstance(values, dict):
        return out
    for key, rule in allowed.items():
        if key not in values:
            continue
        value = values[key]
        if rule is bool:
            out[key] = bool(value)
        elif isinstance(rule, int):
            if isinstance(value, str) and len(value) > rule:
                raise HTTPException(status_code=413, detail=f"{key} 값이 너무 깁니다.")
            out[key] = str(value)[:rule]
    return out


@router.get("/api/auth/profile")
async def get_profile(request: Request):
    email = _signed_in_email(request)
    data = _read_profile(email)
    return {"success": True, "profile": data.get("profile", {}), "settings": data.get("settings", {})}


@router.put("/api/auth/profile")
async def update_profile(request: Request):
    email = _signed_in_email(request)
    body = await request.json()
    data = _read_profile(email)
    # 새 형식({profile, settings})과 예전 형식(평면 키)을 모두 받는다
    incoming_profile = body.get("profile") if isinstance(body.get("profile"), dict) else body
    incoming_settings = body.get("settings") if isinstance(body.get("settings"), dict) else {}
    profile_rule = dict(PROFILE_FIELDS)
    setting_rule: Dict[str, Any] = dict(SETTING_FIELDS)
    setting_rule.update({flag: bool for flag in SETTING_FLAGS})
    data.setdefault("profile", {}).update(_clean(incoming_profile, profile_rule))
    data.setdefault("settings", {}).update(_clean(incoming_settings, setting_rule))
    data["updatedAt"] = datetime.now().isoformat(timespec="seconds")
    PROFILE_DIR.mkdir(parents=True, exist_ok=True)
    _profile_path(email).write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    return {"success": True, "profile": data["profile"], "settings": data["settings"]}


# ---------- 파일 내보내기 (템플릿 사용자 지정 화면) ----------
class ExportRequest(BaseModel):
    file_type: str = "pptx"
    theme_name: str = "business"
    title: str = "문서"
    company_name: str = ""


@router.post("/api/export/{file_type}")
async def export_file(file_type: str, req: ExportRequest):
    key = FILE_TYPES.get(file_type.lower())
    if not key:
        raise HTTPException(status_code=400, detail=f"지원하지 않는 형식입니다: {file_type}")
    try:
        data = _artifact(req.title or "문서", key, req.theme_name)
    except ValueError as err:
        raise HTTPException(status_code=500, detail=str(err))
    ext = EXTENSIONS[key]
    filename = f"{req.title or 'document'}.{ext}"
    ascii_name = re.sub(r"[^A-Za-z0-9._-]+", "_", filename) or f"document.{ext}"
    disposition = f"attachment; filename=\"{ascii_name}\"; filename*=UTF-8''{quote(filename)}"
    return Response(content=data, media_type=MEDIA.get(ext, "application/octet-stream"),
                    headers={"Content-Disposition": disposition})


# ---------- 템플릿 일괄 다운로드 ----------
class BatchTemplate(BaseModel):
    type: str = "presentation"
    name: str = "템플릿"


class BatchRequest(BaseModel):
    templates: List[BatchTemplate]


@router.post("/api/template/batch-download")
async def batch_download(req: BatchRequest):
    if not req.templates or len(req.templates) > 20:
        raise HTTPException(status_code=400, detail="템플릿은 1~20개여야 합니다.")
    buffer = io.BytesIO()
    used: Dict[str, int] = {}
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        for item in req.templates:
            key = FILE_TYPES.get(item.type.lower(), "presentation")
            ext = EXTENSIONS[key]
            base = re.sub(r"[^0-9A-Za-z가-힣_-]+", "_", item.name)[:60] or "template"
            used[base] = used.get(base, 0) + 1
            name = f"{base}{'' if used[base] == 1 else '_' + str(used[base])}.{ext}"
            try:
                archive.writestr(name, _artifact(item.name, key))
            except ValueError as err:
                raise HTTPException(status_code=500, detail=f"{item.name}: {err}")
    return Response(content=buffer.getvalue(), media_type="application/zip",
                    headers={"Content-Disposition": 'attachment; filename="templates.zip"'})


# ---------- 배포 상태 (클라우드 배포 작업 기준) ----------
def _job_url(job_id: str) -> str:
    from src.core.cloud_deploy import get_job
    job = get_job(job_id)
    if not job:
        raise KeyError(job_id)
    return job.get("url", "")


@router.get("/api/deployment/health/{deployment_id}")
async def deployment_health(deployment_id: str):
    try:
        url = _job_url(deployment_id)
    except KeyError:
        return {"success": False, "error": "배포를 찾을 수 없습니다.", "health_checks": []}
    if not url:
        return {"success": True, "health_checks": [], "note": "아직 배포 주소가 없습니다."}
    host = url.split("//", 1)[-1].split("/", 1)[0].split(":")[0]
    if not url.startswith(("http://", "https://")) or not _is_public_host(host):
        return {"success": False, "error": "공개 주소가 아니라서 확인할 수 없습니다.", "health_checks": []}
    started = time.time()
    try:
        response = httpx.get(url, timeout=10, follow_redirects=False)
        status = "healthy" if response.status_code < 400 else "unhealthy"
        code = response.status_code
    except httpx.HTTPError as err:
        status, code = "unreachable", 0
    latency = round((time.time() - started) * 1000)
    return {"success": True, "health_checks": [{
        "name": "HTTP 응답", "url": url, "status": status, "status_code": code,
        "latency_ms": latency, "checked_at": datetime.now().isoformat(timespec="seconds")}]}


@router.get("/api/deployment/metrics/{deployment_id}")
async def deployment_metrics(deployment_id: str):
    # 배포 서비스가 수집한 지표는 아직 없다. 가짜 값을 만들지 않고 빈 목록을 돌려준다.
    try:
        _job_url(deployment_id)
    except KeyError:
        return {"success": False, "error": "배포를 찾을 수 없습니다.", "metrics": []}
    return {"success": True, "metrics": [], "note": "이 배포의 지표 수집은 아직 연결되지 않았습니다."}


# ---------- 웹 검색 (채팅의 "웹 검색" 기능) ----------
@router.api_route("/api/search/web", methods=["GET", "POST"])
async def search_web_endpoint(request: Request, query: str = "", limit: int = 5):
    from src.core.web_tools import WebToolError, search_web
    body = {}
    if request.method == "POST":
        try:
            body = await request.json()
        except ValueError:
            body = {}
    text = str(body.get("query") or query or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="검색어를 입력해 주세요.")
    count = max(1, min(int(body.get("limit") or limit or 5), 10))
    import asyncio
    try:
        results = await asyncio.to_thread(search_web, text, count)
    except WebToolError as err:
        raise HTTPException(status_code=503, detail=str(err))
    return {"success": True, "query": text, "results": results}
