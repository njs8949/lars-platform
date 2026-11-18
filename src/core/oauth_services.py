"""실제 서비스 연결: Google(Drive·Calendar·Gmail), GitHub.

흐름 (Claude 커넥터·ChatGPT 앱과 같은 OAuth 방식)
1. 사용자가 '연결'을 누르면 서비스의 로그인·동의 화면 주소를 받는다 (PKCE + state).
2. 동의하면 서비스가 /api/oauth/callback 으로 돌아오고, 서버가 인증 코드를 토큰으로 바꾼다.
3. 토큰은 계정 폴더에 저장하고, 앱을 자동으로 설치·켠다. 만료된 토큰은 호출 때 갱신한다.

클라이언트 ID·비밀값은 서버 환경 변수에서만 읽는다 (예: PRISM_GOOGLE_CLIENT_ID).
설정이 없으면 화면에 '설정 필요'로 표시하고 연결을 막는다.
"""

import base64
import hashlib
import json
import os
import secrets
import time
from typing import Any, Dict, List, Optional
from urllib.parse import urlencode

import httpx

from src.core import plugins as plugin_engine

PUBLIC_URL = os.getenv("PRISM_PUBLIC_URL", "https://prism.lars-technologies.com").rstrip("/")
REDIRECT_PATH = "/api/oauth/callback"
PENDING_TTL = 600  # 연결 시작 후 10분 안에 돌아와야 한다

GOOGLE = {
    "provider": "google",
    "auth_url": "https://accounts.google.com/o/oauth2/v2/auth",
    "token_url": "https://oauth2.googleapis.com/token",
    "client_env": ("PRISM_GOOGLE_CLIENT_ID", "PRISM_GOOGLE_CLIENT_SECRET"),
    "extra_auth_params": {"access_type": "offline", "prompt": "consent"},
    "endpoint": "https://www.googleapis.com",
}
GITHUB = {
    "provider": "github",
    "auth_url": "https://github.com/login/oauth/authorize",
    "token_url": "https://github.com/login/oauth/access_token",
    "client_env": ("PRISM_GITHUB_CLIENT_ID", "PRISM_GITHUB_CLIENT_SECRET"),
    "extra_auth_params": {},
    "endpoint": "https://api.github.com",
    "pkce": False,
    "scope_param": "scope",
}

MICROSOFT = {
    "provider": "microsoft",
    "auth_url": "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    "token_url": "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    "client_env": ("PRISM_MICROSOFT_CLIENT_ID", "PRISM_MICROSOFT_CLIENT_SECRET"),
    "extra_auth_params": {"prompt": "select_account"},
    "endpoint": "https://graph.microsoft.com",
}
NOTION = {
    "provider": "notion",
    "auth_url": "https://api.notion.com/v1/oauth/authorize",
    "token_url": "https://api.notion.com/v1/oauth/token",
    "client_env": ("PRISM_NOTION_CLIENT_ID", "PRISM_NOTION_CLIENT_SECRET"),
    "extra_auth_params": {"owner": "user"},
    "endpoint": "https://api.notion.com",
    "token_auth": "basic",
    "pkce": False,
    "scope_param": None,
}
SLACK = {
    "provider": "slack",
    "auth_url": "https://slack.com/oauth/v2/authorize",
    "token_url": "https://slack.com/api/oauth.v2.access",
    "client_env": ("PRISM_SLACK_CLIENT_ID", "PRISM_SLACK_CLIENT_SECRET"),
    "extra_auth_params": {},
    "endpoint": "https://slack.com",
    "pkce": False,
    "scope_param": "user_scope",
    "token_path": "authed_user",
}

SERVICES: Dict[str, Dict[str, Any]] = {
    "google-drive": {
        **GOOGLE, "name": "Google Drive", "icon": "📁", "color": "#fbbf24", "category": "파일",
        "description": "Google Drive의 파일을 이름이나 내용으로 찾습니다.",
        "scopes": ["https://www.googleapis.com/auth/drive.readonly"],
        "headers": {},
        "tools": [{
            "name": "search_files", "description": "Drive에서 파일을 검색합니다. q 는 Drive 검색식 (예: name contains '보고서')",
            "method": "GET", "path": "/drive/v3/files",
            "parameters": {"q": "string", "pageSize": "number", "fields": "string"},
        }],
    },
    "google-calendar": {
        **GOOGLE, "name": "Google Calendar", "icon": "📅", "color": "#60a5fa", "category": "일정",
        "description": "기본 캘린더의 일정을 기간으로 조회합니다.",
        "scopes": ["https://www.googleapis.com/auth/calendar.readonly"],
        "headers": {},
        "tools": [{
            "name": "list_events", "description": "기본 캘린더에서 시작 시각 이후의 일정을 가져옵니다. timeMin 은 RFC3339 형식 (예: 2026-11-17T00:00:00+09:00)",
            "method": "GET", "path": "/calendar/v3/calendars/primary/events",
            "parameters": {"timeMin": "string", "maxResults": "number"},
        }],
    },
    "gmail": {
        **GOOGLE, "name": "Gmail", "icon": "✉️", "color": "#f87171", "category": "메일",
        "description": "Gmail 메일을 검색합니다. 메일을 보내지는 않습니다.",
        "scopes": ["https://www.googleapis.com/auth/gmail.readonly"],
        "headers": {},
        "tools": [{
            "name": "search_messages", "description": "Gmail에서 메일을 검색합니다. q 는 Gmail 검색식 (예: from:boss newer_than:7d)",
            "method": "GET", "path": "/gmail/v1/users/me/messages",
            "parameters": {"q": "string", "maxResults": "number"},
        }],
    },
    "github": {
        **GITHUB, "name": "GitHub", "icon": "🐙", "color": "#94a3b8", "category": "개발",
        "description": "GitHub 계정 정보와 공개 저장소를 검색합니다.",
        "scopes": ["read:user"],
        "headers": {"Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"},
        "tools": [
            {"name": "get_me", "description": "연결된 GitHub 계정 정보를 가져옵니다",
             "method": "GET", "path": "/user", "parameters": {}},
            {"name": "search_repositories", "description": "GitHub 저장소를 검색합니다 (q 는 GitHub 검색식)",
             "method": "GET", "path": "/search/repositories",
             "parameters": {"q": "string", "per_page": "number"}},
        ],
    },
    "notion": {
        **NOTION, "name": "Notion", "icon": "📝", "color": "#e5e7eb", "category": "문서",
        "description": "Notion 페이지와 데이터베이스를 검색합니다.",
        "scopes": [],
        "headers": {"Notion-Version": "2022-06-28"},
        "tools": [{
            "name": "search", "description": "Notion 워크스페이스에서 페이지와 데이터베이스를 검색합니다",
            "method": "POST", "path": "/v1/search", "parameters": {"query": "string", "page_size": "number"},
        }],
    },
    "slack": {
        **SLACK, "name": "Slack", "icon": "💬", "color": "#a78bfa", "category": "메시지",
        "description": "Slack 채널 목록과 대화를 읽고, 메시지를 보냅니다. 보내기 전에 승인 카드가 나옵니다.",
        "scopes": ["channels:read", "channels:history", "chat:write", "groups:read", "groups:history"],
        "headers": {},
        "tools": [
            {"name": "list_channels", "description": "Slack 채널 목록을 가져옵니다",
             "method": "GET", "path": "/api/conversations.list", "parameters": {"limit": "number"}},
            {"name": "channel_history", "description": "채널의 최근 메시지를 가져옵니다 (channel 은 채널 ID)",
             "method": "GET", "path": "/api/conversations.history", "parameters": {"channel": "string", "limit": "number"}},
            {"name": "post_message", "description": "채널에 메시지를 보냅니다 (channel 은 채널 ID)",
             "method": "POST", "path": "/api/chat.postMessage", "parameters": {"channel": "string", "text": "string"}},
        ],
    },
    "outlook": {
        **MICROSOFT, "name": "Outlook 메일", "icon": "📧", "color": "#38bdf8", "category": "메일",
        "description": "Outlook 받은편지함의 최근 메일을 읽습니다. 메일을 보내지는 않습니다.",
        "scopes": ["offline_access", "Mail.Read"],
        "headers": {},
        "tools": [{
            "name": "list_messages", "description": "Outlook 최근 메일을 가져옵니다",
            "method": "GET", "path": "/v1.0/me/messages", "parameters": {},
        }],
    },
}


# 채팅 문장에 이 단어가 나오면 연결이 안 된 서비스에 연결 안내를 띄운다.
SERVICE_WORDS: Dict[str, List[str]] = {
    "google-drive": ["드라이브", "google drive", "구글 드라이브"],
    "google-calendar": ["캘린더", "calendar", "구글 일정"],
    "gmail": ["지메일", "gmail"],
    "github": ["깃허브", "github", "깃 허브"],
    "notion": ["노션", "notion"],
    "slack": ["슬랙", "slack"],
    "outlook": ["아웃룩", "outlook"],
}


def _manifest(key: str) -> Dict[str, Any]:
    s = SERVICES[key]
    return {
        "id": key, "name": s["name"], "description": s["description"], "version": "1.0.0",
        "endpoint": s["endpoint"], "auth": {"type": "bearer"}, "tools": s["tools"],
    }


def _client(key: str) -> Optional[tuple]:
    id_env, secret_env = SERVICES[key]["client_env"]
    cid = os.getenv(id_env, "").strip()
    csecret = os.getenv(secret_env, "").strip()
    return (cid, csecret) if cid and csecret else None


def redirect_uri() -> str:
    return f"{PUBLIC_URL}{REDIRECT_PATH}"


def _pending_path():
    # 돌아오는 요청에는 계정 정보가 없으므로, 대기 중인 연결은 전역 파일에 계정과 함께 둔다.
    return plugin_engine.ROOT / "oauth_pending.json"


def _load_pending() -> Dict[str, Any]:
    return plugin_engine._load(_pending_path())


def _save_pending(data: Dict[str, Any]) -> None:
    plugin_engine._save(_pending_path(), data)


def status(email: str) -> List[Dict[str, Any]]:
    secrets_now = plugin_engine._load(plugin_engine._secrets_path(email))
    installed = {p["id"] for p in plugin_engine.list_all(email)}
    out = []
    for key, s in SERVICES.items():
        out.append({
            "key": key, "name": s["name"], "icon": s["icon"], "color": s["color"], "category": s["category"],
            "description": s["description"], "configured": _client(key) is not None,
            "connected": key in secrets_now, "installed": key in installed,
        })
    return out


def start(email: str, key: str) -> str:
    if key not in SERVICES:
        raise KeyError(key)
    client = _client(key)
    if client is None:
        raise ValueError(f"{SERVICES[key]['name']} 연결 설정이 아직 없습니다. 서버에 클라이언트 ID와 비밀값을 넣어야 합니다.")
    svc = SERVICES[key]
    state = secrets.token_urlsafe(24)
    verifier = secrets.token_urlsafe(48)
    pending = {k: v for k, v in _load_pending().items() if time.time() - v.get("created", 0) < PENDING_TTL}
    pending[state] = {"email": email, "service": key, "verifier": verifier, "created": time.time()}
    _save_pending(pending)
    params = {"client_id": client[0], "redirect_uri": redirect_uri(), "response_type": "code", "state": state,
              **svc.get("extra_auth_params", {})}
    if svc["scopes"]:
        params[svc.get("scope_param") or "scope"] = " ".join(svc["scopes"])
    if svc.get("pkce", True):
        params["code_challenge"] = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b"=").decode()
        params["code_challenge_method"] = "S256"
    return f"{svc['auth_url']}?{urlencode(params)}"


def _post_token(key: str, fields: Dict[str, Any]) -> Dict[str, Any]:
    """서비스의 토큰 주소에 요청한다. 서비스마다 인증 방식(본문 또는 기본 인증)과 응답 위치가 다르다."""
    svc = SERVICES[key]
    client = _client(key)
    if client is None:
        raise ValueError("서비스 연결 설정이 없습니다.")
    headers = {"Accept": "application/json"}
    if svc.get("token_auth") == "basic":
        headers["Authorization"] = "Basic " + base64.b64encode(f"{client[0]}:{client[1]}".encode()).decode()
        body: Dict[str, Any] = {**fields}
        with httpx.Client(timeout=15.0, follow_redirects=False) as http:
            resp = http.post(svc["token_url"], json=body, headers=headers)
    else:
        body = {"client_id": client[0], "client_secret": client[1], **fields}
        with httpx.Client(timeout=15.0, follow_redirects=False) as http:
            resp = http.post(svc["token_url"], data=body, headers=headers)
    try:
        data = resp.json()
    except ValueError:
        raise ValueError("토큰 요청에 실패했습니다.")
    if svc.get("token_path"):
        if not data.get("ok", True):
            raise ValueError(f"토큰 요청에 실패했습니다: {data.get('error', resp.status_code)}")
        data = data.get(svc["token_path"]) or {}
    if resp.status_code != 200 or "error" in data and "access_token" not in data:
        raise ValueError(f"토큰 요청에 실패했습니다: {data.get('error_description') or data.get('error') or resp.status_code}")
    return data


def _token_response(data: Dict[str, Any], previous: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    if "access_token" not in data:
        raise ValueError("서비스가 토큰을 주지 않았습니다. 다시 연결해 주세요.")
    expires_in = int(data.get("expires_in") or 0)
    token = {"access_token": data["access_token"], "expires_at": time.time() + expires_in if expires_in else 0}
    refresh = data.get("refresh_token") or (previous or {}).get("refresh_token")
    if refresh:
        token["refresh_token"] = refresh
    return token


def complete(state: str, code: str) -> Dict[str, Any]:
    pending = _load_pending()
    item = pending.pop(state, None)
    _save_pending(pending)
    if not item or time.time() - item.get("created", 0) > PENDING_TTL:
        raise ValueError("연결 요청이 만료되었거나 올바르지 않습니다. 다시 연결해 주세요.")
    email = item["email"]
    key = item["service"]
    client = _client(key)
    if client is None:
        raise ValueError("서비스 연결 설정이 없습니다.")
    data = _post_token(key, {"code": code, "redirect_uri": redirect_uri(), "grant_type": "authorization_code",
                             **({"code_verifier": item["verifier"]} if SERVICES[key].get("pkce", True) else {})})
    token = _token_response(data)
    secret_path = plugin_engine._secrets_path(email)
    stored = plugin_engine._load(secret_path)
    stored[key] = token
    plugin_engine._save(secret_path, stored)
    plugin_engine.install(email, _manifest(key), confirmed=True)
    return {"service": key, "connected": True, "email_hint": None}


def refresh_tokens(email: str, pid: str, stored: Dict[str, Any]) -> Dict[str, Any]:
    """만료된 토큰을 갱신한다. 갱신 토큰이 없으면 예외로 알린다."""
    if pid not in SERVICES or not stored.get("refresh_token"):
        raise ValueError("토큰이 만료되었습니다. 다시 연결해 주세요.")
    client = _client(pid)
    if client is None:
        raise ValueError("서비스 연결 설정이 없습니다.")
    try:
        data = _post_token(pid, {"refresh_token": stored["refresh_token"], "grant_type": "refresh_token"})
    except ValueError:
        raise ValueError("토큰 갱신에 실패했습니다. 다시 연결해 주세요.")
    token = _token_response(data, stored)
    secret_path = plugin_engine._secrets_path(email)
    all_tokens = plugin_engine._load(secret_path)
    all_tokens[pid] = token
    plugin_engine._save(secret_path, all_tokens)
    return token


def disconnect(email: str, key: str) -> None:
    secret_path = plugin_engine._secrets_path(email)
    tokens = plugin_engine._load(secret_path)
    tokens.pop(key, None)
    plugin_engine._save(secret_path, tokens)
    try:
        plugin_engine.remove(email, key)
    except KeyError:
        pass
