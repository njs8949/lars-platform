"""
에이전트용 웹 도구: 검색(Brave Search API)과 페이지 읽기.

페이지 읽기는 내부망·로컬 주소 접근을 막는다 (SSRF 방지).
"""

import html
import ipaddress
import os
import re
import socket
from typing import List, Tuple
from urllib.parse import urljoin, urlparse

import requests

MAX_FETCH_BYTES = 1_000_000
MAX_TEXT_CHARS = 6_000
MAX_REDIRECTS = 3
FETCH_TIMEOUT = 15
USER_AGENT = "LARS-Prism-Agent/1.0"

BRAVE_ENDPOINT = "https://api.search.brave.com/res/v1/web/search"


class WebToolError(Exception):
    pass


def _brave_key() -> str:
    key = os.getenv("BRAVE_SEARCH_API_KEY", "")
    if key:
        return key
    try:
        from src.core.secrets import secret_api_key

        return secret_api_key("lars-agent/brave-search-api-key")
    except Exception:
        return ""


def search_web(query: str, count: int = 5) -> List[dict]:
    key = _brave_key()
    if not key:
        raise WebToolError("검색 API 키가 없습니다 (BRAVE_SEARCH_API_KEY 또는 시크릿).")
    try:
        response = requests.get(
            BRAVE_ENDPOINT,
            params={"q": query, "count": max(1, min(count, 10))},
            headers={"X-Subscription-Token": key, "Accept": "application/json"},
            timeout=FETCH_TIMEOUT,
        )
    except requests.exceptions.RequestException as e:
        raise WebToolError(f"검색 요청 실패: {e}")
    if response.status_code != 200:
        raise WebToolError(f"검색 실패 (상태: {response.status_code})")
    results = response.json().get("web", {}).get("results", [])
    return [
        {"title": r.get("title", ""), "url": r.get("url", ""), "snippet": r.get("description", "")}
        for r in results
    ]


def _is_public_host(host: str) -> bool:
    try:
        infos = socket.getaddrinfo(host, None)
    except socket.gaierror:
        return False
    for info in infos:
        address = ipaddress.ip_address(info[4][0])
        if (
            address.is_private or address.is_loopback or address.is_link_local
            or address.is_multicast or address.is_reserved or address.is_unspecified
        ):
            return False
    return True


def _check_url(url: str) -> None:
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise WebToolError("http/https 주소만 읽을 수 있습니다.")
    if not parsed.hostname:
        raise WebToolError("주소에 호스트가 없습니다.")
    if not _is_public_host(parsed.hostname):
        raise WebToolError(f"내부망 또는 로컬 주소는 읽을 수 없습니다: {parsed.hostname}")


def html_to_text(raw: str) -> str:
    raw = re.sub(r"(?is)<(script|style|noscript).*?</\1>", " ", raw)
    raw = re.sub(r"(?s)<!--.*?-->", " ", raw)
    text = re.sub(r"(?s)<[^>]+>", " ", raw)
    text = html.unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def fetch_page_text(url: str) -> str:
    current = url
    for _ in range(MAX_REDIRECTS + 1):
        _check_url(current)
        try:
            response = requests.get(
                current,
                headers={"User-Agent": USER_AGENT},
                timeout=FETCH_TIMEOUT,
                allow_redirects=False,
                stream=True,
            )
        except requests.exceptions.RequestException as e:
            raise WebToolError(f"페이지 요청 실패: {e}")
        if response.is_redirect or response.status_code in (301, 302, 303, 307, 308):
            current = urljoin(current, response.headers.get("Location", ""))
            response.close()
            continue
        if response.status_code != 200:
            response.close()
            raise WebToolError(f"페이지 읽기 실패 (상태: {response.status_code})")
        body = response.raw.read(MAX_FETCH_BYTES, decode_content=True)
        response.close()
        encoding = response.encoding or "utf-8"
        text = html_to_text(body.decode(encoding, errors="replace"))
        return text[:MAX_TEXT_CHARS]
    raise WebToolError("리다이렉트가 너무 많습니다.")


# ---- 채팅 자동 검색: 최신 정보가 필요해 보이는 질문이면 서버가 먼저 검색해 맥락으로 넣는다 ----
RECENT_CUES = (
    "최신", "오늘", "어제", "이번 주", "이번주", "이번 달", "요즘", "현재", "지금", "뉴스", "속보",
    "검색", "찾아", "출처", "링크", "날씨", "환율", "주가", "시세", "가격", "발표", "출시",
    "latest", "today", "news", "current", "search", "price",
)


INFO_CUES = (
    "알려", "설명", "소개", "누구", "뭐야", "뭐예요", "무엇", "어디", "정보", "회사", "기업", "단체", "기관",
    "제품", "서비스", "브랜드", "사이트", "홈페이지", "언제", "얼마", "비교", "차이", "장단점", "방법",
    "who", "what", "where", "when", "how", "about", "tell me",
)
CHAT_ONLY = ("안녕", "고마워", "감사", "반가", "잘 자", "ㅎㅎ", "테스트")
FILLER = re.compile(r"(에\s*대해서|에\s*대해|대해서|대해|알려\s*줘|알려주세요|알려\s*주세요|알려줘|말해\s*줘|설명해\s*줘|찾아\s*줘|찾아봐)")


def needs_web(message: str) -> bool:
    text = (message or "").strip().lower()
    if not text or len(text) < 3:
        return False
    if any(cue in text for cue in RECENT_CUES):
        return True
    if any(c in text for c in CHAT_ONLY) and len(text) < 12:
        return False
    if any(cue in text for cue in INFO_CUES) or "?" in text or "？" in text:
        return True
    return bool(re.search(r"20(2[5-9]|3\d)", text))


def search_query(message: str) -> str:
    """검색어: 질문 군더더기를 빼고 핵심 명사만 남긴다."""
    cleaned = FILLER.sub(" ", message or "")
    cleaned = re.sub(r"[?？!！.。]+", " ", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned or (message or "").strip()


def web_context(message: str, count: int = 4) -> Tuple[str, List[dict]]:
    """검색 결과를 번호 붙은 맥락 글과 출처 목록으로 돌려준다. 실패하면 빈 값을 돌려준다(답변은 계속 진행)."""
    try:
        results = search_web(search_query(message), count)
    except WebToolError:
        return "", []
    results = [r for r in results if r.get("url")]
    if not results:
        return "", []
    text = "\n\n".join(f"[{i + 1}] {r['title']}\n{r['snippet']}\n{r['url']}" for i, r in enumerate(results))
    return text, [{"title": r["title"], "url": r["url"]} for r in results]
