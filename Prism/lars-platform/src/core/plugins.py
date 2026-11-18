"""플러그인: 외부 서비스의 도구를 연결한다. 매니페스트(JSON)에 서비스 주소와 도구 목록을 적는다.

안전 규칙
- 설치 목록과 토큰은 계정마다 따로 저장한다(.lars/plugins/<계정 해시>/). 다른 계정에는 보이지 않는다.
- 서비스 주소는 https만 허용하고, 내부망·로컬 주소는 막는다 (설치 때와 호출 때 모두 검사).
- 도구 호출은 사용자가 전송 내용을 확인하고 실행을 누를 때만 일어난다 (confirmed 필수).
  채팅에서 모델이 도구를 고르면 바로 보내지 않고, 승인 카드(proposal)를 먼저 보여 준다.
- 토큰은 계정 폴더의 secrets.json(권한 600)에 저장하고, 화면에는 다시 보여 주지 않는다.
- 리다이렉트를 따르지 않고, 응답 크기는 64KB로 자른다. 쿠키와 다른 자격 증명은 보내지 않는다.
"""

import hashlib
import json
import os
import re
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urlparse

import httpx

from src.core.web_tools import _is_public_host

ROOT = Path(".lars") / "plugins"
ID_RE = re.compile(r"^[a-z][a-z0-9-]{2,39}$")
PARAM_TYPES = {"string", "number", "boolean"}
MAX_RESPONSE = 64 * 1024
TIMEOUT = 20
MAX_PLUGINS_PER_ACCOUNT = 20
LLM_PREFIX = "plg_"


def _account_dir(email: str) -> Path:
    key = hashlib.sha256(email.strip().lower().encode("utf-8")).hexdigest()[:24]
    return ROOT / key


def _registry_path(email: str) -> Path:
    return _account_dir(email) / "plugins.json"


def _secrets_path(email: str) -> Path:
    return _account_dir(email) / "secrets.json"


def _load(path: Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}


def _save(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    if path.name == "secrets.json":
        os.chmod(path, 0o600)


def check_endpoint(url: str) -> str:
    parsed = urlparse(url)
    if parsed.scheme != "https" or not parsed.hostname:
        raise ValueError("서비스 주소는 https:// 로 시작해야 합니다.")
    if not _is_public_host(parsed.hostname):
        raise ValueError(f"내부망 또는 로컬 주소는 연결할 수 없습니다: {parsed.hostname}")
    return f"{parsed.scheme}://{parsed.netloc}"


def validate(manifest: Dict[str, Any]) -> Dict[str, Any]:
    if not isinstance(manifest, dict):
        raise ValueError("매니페스트는 JSON 객체여야 합니다.")
    pid = str(manifest.get("id", "")).strip().lower()
    if not ID_RE.match(pid):
        raise ValueError("id는 영문 소문자, 숫자, 하이픈으로 3~40자, 문자로 시작해야 합니다.")
    display = str(manifest.get("name", "")).strip()[:60]
    description = str(manifest.get("description", "")).strip()[:500]
    if not display or len(description) < 5:
        raise ValueError("name(표시 이름)과 description(설명 5자 이상)이 필요합니다.")
    endpoint = check_endpoint(str(manifest.get("endpoint", "")).strip())
    auth = str((manifest.get("auth") or {}).get("type", "none"))
    if auth not in ("none", "bearer"):
        raise ValueError("auth.type은 none 또는 bearer 여야 합니다.")
    tools_in = manifest.get("tools") or []
    if not isinstance(tools_in, list) or not (1 <= len(tools_in) <= 20):
        raise ValueError("tools는 1~20개의 도구 목록이어야 합니다.")
    tools: List[Dict[str, Any]] = []
    names = set()
    for tool in tools_in:
        name = str(tool.get("name", "")).strip()
        if not re.match(r"^[a-z][a-z0-9_]{1,40}$", name) or name in names:
            raise ValueError(f"도구 이름이 올바르지 않거나 중복입니다: {name}")
        names.add(name)
        method = str(tool.get("method", "POST")).upper()
        if method not in ("GET", "POST"):
            raise ValueError(f"{name}: method는 GET 또는 POST 여야 합니다.")
        path = str(tool.get("path", "/")).strip()
        if not path.startswith("/") or ".." in path or "?" in path or "#" in path:
            raise ValueError(f"{name}: path는 /로 시작하는 단순 경로여야 합니다.")
        params = tool.get("parameters") or {}
        if not isinstance(params, dict) or len(params) > 10:
            raise ValueError(f"{name}: parameters는 최대 10개입니다.")
        for pname, ptype in params.items():
            if not re.match(r"^[A-Za-z][A-Za-z0-9_]{0,30}$", pname) or ptype not in PARAM_TYPES:
                raise ValueError(f"{name}: 매개변수 {pname}의 이름 또는 타입(string/number/boolean)이 올바르지 않습니다.")
        tools.append({"name": name, "description": str(tool.get("description", ""))[:300], "method": method,
                      "path": path, "parameters": {k: v for k, v in params.items()}})
    return {"id": pid, "name": display, "description": description, "version": str(manifest.get("version", "1.0.0"))[:20],
            "endpoint": endpoint, "auth": auth, "tools": tools}


def preview(email: str, manifest: Dict[str, Any]) -> Dict[str, Any]:
    clean = validate(manifest)
    exists = clean["id"] in _load(_registry_path(email))
    warnings = [f"이 플러그인을 쓰면 입력한 내용이 {urlparse(clean['endpoint']).netloc} 서버로 전송됩니다."]
    if clean["auth"] == "bearer":
        warnings.append("이 서비스는 토큰이 필요합니다. 토큰은 이 계정에만 저장됩니다.")
    return {"plugin": clean, "warnings": warnings, "replaces": exists}


def install(email: str, manifest: Dict[str, Any], confirmed: bool) -> Dict[str, Any]:
    if not confirmed:
        raise ValueError("설치 내용을 확인했다는 표시가 필요합니다.")
    clean = validate(manifest)
    path = _registry_path(email)
    registry = _load(path)
    if clean["id"] not in registry and len(registry) >= MAX_PLUGINS_PER_ACCOUNT:
        raise ValueError(f"플러그인은 계정당 최대 {MAX_PLUGINS_PER_ACCOUNT}개까지 설치할 수 있습니다.")
    registry[clean["id"]] = {**clean, "enabled": True, "installed_at": datetime.now().isoformat(timespec="seconds")}
    _save(path, registry)
    return public(email, clean["id"])


def public(email: str, pid: str) -> Dict[str, Any]:
    item = _load(_registry_path(email)).get(pid)
    if not item:
        raise KeyError("Not Found")
    secrets = _load(_secrets_path(email))
    return {**item, "has_token": bool(secrets.get(pid)), "token": None}


def list_all(email: str) -> List[Dict[str, Any]]:
    return [public(email, pid) for pid in sorted(_load(_registry_path(email)))]


def set_enabled(email: str, pid: str, enabled: bool) -> Dict[str, Any]:
    path = _registry_path(email)
    registry = _load(path)
    if pid not in registry:
        raise KeyError("Not Found")
    registry[pid]["enabled"] = bool(enabled)
    _save(path, registry)
    return public(email, pid)


def set_token(email: str, pid: str, token: str) -> Dict[str, Any]:
    if pid not in _load(_registry_path(email)):
        raise KeyError("Not Found")
    path = _secrets_path(email)
    secrets = _load(path)
    if token.strip():
        secrets[pid] = token.strip()
    else:
        secrets.pop(pid, None)
    _save(path, secrets)
    return public(email, pid)


def remove(email: str, pid: str) -> None:
    path = _registry_path(email)
    registry = _load(path)
    if pid not in registry:
        raise KeyError("Not Found")
    registry.pop(pid)
    _save(path, registry)
    secrets = _load(_secrets_path(email))
    secrets.pop(pid, None)
    _save(_secrets_path(email), secrets)


# ---- 채팅 연결: 모델에게 켜 둔 플러그인의 도구를 보여 준다 ----

def _llm_name(pid: str, tool: str) -> str:
    digest = hashlib.sha256(f"{pid}:{tool}".encode("utf-8")).hexdigest()[:10]
    return f"{LLM_PREFIX}{digest}"


def llm_tools(email: str) -> List[Dict[str, Any]]:
    """켜 둔 플러그인의 도구를 Claude 도구 형식으로 돌려준다. 이름은 해시로 만들어 정해진 길이를 지킨다."""
    out: List[Dict[str, Any]] = []
    for pid, item in _load(_registry_path(email)).items():
        if not item.get("enabled"):
            continue
        for tool in item.get("tools", []):
            schema = {"type": "object", "properties": {
                k: {"type": v} if v != "number" else {"type": "number"} for k, v in tool["parameters"].items()
            }}
            out.append({
                "name": _llm_name(pid, tool["name"]),
                "description": f"[{item['name']}] {tool.get('description', '')}".strip()[:1000],
                "input_schema": schema,
            })
    return out


def _resolve(email: str, llm_name: str) -> Optional[Tuple[str, Dict[str, Any], Dict[str, Any]]]:
    if not llm_name.startswith(LLM_PREFIX):
        return None
    for pid, item in _load(_registry_path(email)).items():
        if not item.get("enabled"):
            continue
        for tool in item.get("tools", []):
            if _llm_name(pid, tool["name"]) == llm_name:
                return pid, item, tool
    return None


def proposal(email: str, llm_name: str, params: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """모델이 고른 도구를 실행하지 않고, 승인 카드에 보일 내용만 만든다."""
    found = _resolve(email, llm_name)
    if not found:
        return None
    pid, item, tool = found
    clean = _clean_params(tool, params or {})
    return {
        "plugin_id": pid,
        "plugin_name": item["name"],
        "tool": tool["name"],
        "description": tool.get("description", ""),
        "destination": urlparse(item["endpoint"]).netloc,
        "params": clean,
    }


def _clean_params(tool: Dict[str, Any], params: Dict[str, Any]) -> Dict[str, Any]:
    clean: Dict[str, Any] = {}
    for pname, ptype in tool["parameters"].items():
        if pname not in params:
            continue
        value = params[pname]
        if ptype == "number":
            number = float(value)
            value = int(number) if number.is_integer() else number
        elif ptype == "boolean":
            value = str(value).lower() in ("true", "1", "yes", "예")
        else:
            value = str(value)[:2000]
        clean[pname] = value
    return clean


def service_headers(pid: str) -> Dict[str, str]:
    """실제 서비스마다 필요한 추가 헤더 (예: 노션 버전)."""
    from src.core.oauth_services import SERVICES
    return dict(SERVICES.get(pid, {}).get("headers", {}))


def current_access_token(email: str, pid: str) -> str:
    """저장된 토큰을 돌려준다. OAuth 토큰(dict)이면 만료 시 갱신한다. 예전 방식(문자열)도 그대로 쓴다."""
    stored = _load(_secrets_path(email)).get(pid)
    if isinstance(stored, str):
        return stored
    if not isinstance(stored, dict):
        return ""
    import time as _time
    if stored.get("refresh_token") and stored.get("expires_at", 0) and _time.time() > float(stored["expires_at"]) - 60:
        from src.core.oauth_services import refresh_tokens
        stored = refresh_tokens(email, pid, stored)
    return stored.get("access_token", "")


def call_tool(email: str, pid: str, tool_name: str, params: Dict[str, Any], confirmed: bool) -> Dict[str, Any]:
    if not confirmed:
        raise ValueError("전송될 내용을 확인했다는 표시가 필요합니다.")
    item = _load(_registry_path(email)).get(pid)
    if not item:
        raise KeyError("Not Found")
    if not item.get("enabled"):
        raise ValueError("이 플러그인은 꺼져 있습니다.")
    tool = next((t for t in item["tools"] if t["name"] == tool_name), None)
    if not tool:
        raise KeyError("Not Found")
    check_endpoint(item["endpoint"])  # 호출 시점에도 다시 검사한다
    clean_params = _clean_params(tool, params)
    headers = {"Accept": "application/json", "User-Agent": "LARS-Prism-Plugin/1.0"}
    if item["auth"] == "bearer":
        token = current_access_token(email, pid)
        if token:
            headers["Authorization"] = f"Bearer {token}"
    headers.update(service_headers(pid))
    url = item["endpoint"] + tool["path"]
    try:
        with httpx.Client(timeout=TIMEOUT, follow_redirects=False, trust_env=False) as client:
            if tool["method"] == "GET":
                response = client.get(url, params=clean_params, headers=headers)
            else:
                response = client.post(url, json=clean_params, headers=headers)
    except httpx.HTTPError as err:
        raise ValueError(f"서비스 호출에 실패했습니다: {type(err).__name__}")
    body = response.content[:MAX_RESPONSE].decode("utf-8", errors="replace")
    try:
        body = json.dumps(json.loads(body), ensure_ascii=False, indent=2)
    except ValueError:
        pass
    return {"status": response.status_code, "body": body, "sent": clean_params,
            "truncated": len(response.content) > MAX_RESPONSE}
