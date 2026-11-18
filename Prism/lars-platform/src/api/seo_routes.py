"""SEO 진단 (/api/seo/*). 페이지를 실제로 읽어 규칙으로 점검하고, 본문에서 키워드를 뽑는다.

검색량·순위·경쟁사 데이터는 외부 데이터 연결(예: Search Console)이 필요해서 여기서 만들지 않는다.
"""

import re
import time
from collections import Counter
from typing import Dict, List, Optional
from urllib.parse import urlparse

from bs4 import BeautifulSoup
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from src.api.scraping_routes import fetch_page

router = APIRouter(prefix="/api/seo", tags=["seo"])
STOPWORDS = set("the and for with that this from are was were have has not you your our their are is of to in on at by an a as be it or if".split()) | \
    set("그리고 그러나 하지만 또는 그리고는 이것 저것 그것 있다 있는 있습니다 합니다 하고 하는 된다 같은 대한 위해 통해 및 등 수 것 때문에".split())


class AuditRequest(BaseModel):
    url: str
    keyword: str = ""


def _check(name: str, passed: bool, warn: bool, detail: str) -> Dict[str, object]:
    if passed:
        return {"check": name, "status": "excellent", "score": 100, "detail": detail}
    if warn:
        return {"check": name, "status": "warning", "score": 50, "detail": detail}
    return {"check": name, "status": "fail", "score": 0, "detail": detail}


def audit(url: str, keyword: str = "") -> Dict[str, object]:
    started = time.time()
    try:
        page = fetch_page(url)
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))
    except Exception as err:
        raise HTTPException(status_code=502, detail=f"페이지를 읽지 못했습니다: {str(err)[:200]}")
    elapsed_ms = round((time.time() - started) * 1000)
    soup = BeautifulSoup(page["html"], "lxml")
    final = page["final_url"]
    host = urlparse(final).netloc
    title = (soup.title.string or "").strip() if soup.title else ""
    meta_desc = soup.find("meta", attrs={"name": "description"})
    desc = (meta_desc.get("content") or "").strip() if meta_desc else ""
    h1s = soup.find_all("h1")
    images = soup.find_all("img")
    missing_alt = [i for i in images if not (i.get("alt") or "").strip()]
    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()
    text = re.sub(r"\s+", " ", soup.get_text(" ", strip=True))
    words = text.split()
    links = [a["href"] for a in soup.find_all("a", href=True)]
    internal = [l for l in links if l.startswith("/") or urlparse(l).netloc == host]
    og_title = soup.find("meta", attrs={"property": "og:title"})
    og_desc = soup.find("meta", attrs={"property": "og:description"})
    viewport = soup.find("meta", attrs={"name": "viewport"})
    canonical = soup.find("link", rel=lambda v: v and "canonical" in v)
    html_tag = soup.find("html")
    lang = (html_tag.get("lang") or "").strip() if html_tag else ""

    checks = [
        _check("제목 태그", 30 <= len(title) <= 60, bool(title), f"{len(title)}자 · {title[:60] or '없음'} (권장 30~60자)"),
        _check("메타 설명", 70 <= len(desc) <= 160, bool(desc), f"{len(desc)}자 (권장 70~160자)" if desc else "메타 설명이 없습니다."),
        _check("H1 제목", len(h1s) == 1, len(h1s) > 1, f"H1 {len(h1s)}개 (1개 권장)"),
        _check("이미지 대체 텍스트", not missing_alt, len(missing_alt) <= max(1, len(images) // 5),
               f"이미지 {len(images)}개 중 alt 없는 것 {len(missing_alt)}개"),
        _check("언어 속성", bool(lang), False, f"lang={lang}" if lang else "html 태그에 lang 속성이 없습니다."),
        _check("모바일 viewport", viewport is not None, False, "viewport 메타 태그 있음" if viewport else "viewport 메타 태그가 없습니다."),
        _check("canonical 주소", canonical is not None, False, canonical.get("href", "") if canonical else "canonical 태그가 없습니다."),
        _check("Open Graph 태그", bool(og_title and og_desc), bool(og_title or og_desc),
               "og:title, og:description 있음" if og_title and og_desc else "공유용 og 태그가 부족합니다."),
        _check("본문 분량", len(words) >= 300, len(words) >= 120, f"단어 {len(words)}개 (300개 이상 권장)"),
        _check("내부 링크", len(internal) > 0, False, f"내부 링크 {len(internal)}개"),
        _check("HTTPS", final.startswith("https://"), False, "HTTPS 사용" if final.startswith("https://") else "HTTP 주소입니다."),
        _check("응답 속도", elapsed_ms < 1500, elapsed_ms < 3000, f"{elapsed_ms}ms (1.5초 이내 권장)"),
    ]
    if keyword.strip():
        k = keyword.strip().lower()
        hits = [name for name, value in (("제목", title), ("메타 설명", desc), ("H1", " ".join(h.get_text(" ") for h in h1s))) if k in value.lower()]
        checks.append(_check("목표 키워드 배치", len(hits) >= 2, len(hits) == 1, f"'{keyword}' 위치: {', '.join(hits) or '없음'} (제목·설명·H1 중 2곳 권장)"))
    score = round(sum(c["score"] for c in checks) / len(checks))
    return {"url": final, "score": score, "checks": checks, "word_count": len(words), "elapsed_ms": elapsed_ms,
            "keywords": keywords_from_text(text)}


def keywords_from_text(text: str, limit: int = 20) -> List[Dict[str, object]]:
    tokens = [t.lower() for t in re.findall(r"[0-9A-Za-z가-힣]{2,}", text)]
    tokens = [t for t in tokens if t not in STOPWORDS and not t.isdigit()]
    total = max(len(tokens), 1)
    counts = Counter(tokens).most_common(limit)
    return [{"keyword": word, "count": count, "density": round(100 * count / total, 2)} for word, count in counts]


@router.post("/audit")
async def run_audit(req: AuditRequest):
    return {"success": True, "data": audit(req.url, req.keyword)}
