"""웹 스크래핑 (/api/scraping/*). 실제 HTTP 요청과 HTML 파싱을 한다.

안전 규칙: https/http 공개 주소만, 내부망·로컬 주소는 차단, robots.txt가 막은 경로는 읽지 않는다,
리다이렉트는 최대 3번까지 각 대상도 다시 검사한다, 응답은 2MB까지만 읽는다.
"""

import json
import re
import secrets
import time
from datetime import datetime
from typing import Any, Dict, List, Optional
from urllib.parse import urljoin, urlparse
from urllib.robotparser import RobotFileParser

import httpx
from bs4 import BeautifulSoup
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from src.core.web_tools import _is_public_host

router = APIRouter(prefix="/api/scraping", tags=["scraping"])
STORE = ".lars/scraping/jobs.json"
RUNS = ".lars/scraping/runs.json"
UA = "LARS-Prism-Scraper/1.0"
MAX_BYTES = 2 * 1024 * 1024


class JobCreate(BaseModel):
    url: str
    name: str = ""
    selector: str = ""


def _read(path: str, default):
    from pathlib import Path
    try:
        return json.loads(Path(path).read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return default


def _write(path: str, data) -> None:
    from pathlib import Path
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def _check_url(url: str) -> str:
    parsed = urlparse(url.strip())
    if parsed.scheme not in ("http", "https") or not parsed.hostname:
        raise ValueError("http 또는 https 주소를 입력해 주세요.")
    if not _is_public_host(parsed.hostname):
        raise ValueError(f"내부망 또는 로컬 주소는 읽을 수 없습니다: {parsed.hostname}")
    return url.strip()


def _robots_allows(url: str) -> bool:
    parsed = urlparse(url)
    robots = RobotFileParser()
    try:
        response = httpx.get(f"{parsed.scheme}://{parsed.netloc}/robots.txt", timeout=8, follow_redirects=False, headers={"User-Agent": UA})
        if response.status_code >= 400:
            return True
        robots.parse(response.text.splitlines())
    except httpx.HTTPError:
        return True
    return robots.can_fetch(UA, url)


def fetch_page(url: str) -> Dict[str, Any]:
    """공개 페이지를 읽는다. 리다이렉트 대상도 다시 검사하고, robots.txt를 존중한다."""
    current = _check_url(url)
    if not _robots_allows(current):
        raise ValueError("robots.txt가 이 페이지 읽기를 허용하지 않습니다.")
    with httpx.Client(timeout=15, follow_redirects=False, headers={"User-Agent": UA}) as client:
        for _ in range(4):
            response = client.get(current)
            if response.status_code in (301, 302, 303, 307, 308) and response.headers.get("location"):
                current = _check_url(urljoin(current, response.headers["location"]))
                continue
            break
        if response.status_code >= 400:
            raise ValueError(f"페이지 응답 오류: HTTP {response.status_code}")
        body = response.content[:MAX_BYTES]
        return {"final_url": current, "status": response.status_code, "html": body.decode(response.encoding or "utf-8", errors="replace")}


def parse_page(html: str, base_url: str, selector: str = "") -> Dict[str, Any]:
    soup = BeautifulSoup(html, "lxml")
    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()
    title = (soup.title.string or "").strip() if soup.title else ""
    meta = soup.find("meta", attrs={"name": "description"})
    description = (meta.get("content") or "").strip() if meta else ""
    headings = [h.get_text(" ", strip=True) for h in soup.find_all(["h1", "h2", "h3"])][:30]
    links = []
    host = urlparse(base_url).netloc
    for a in soup.find_all("a", href=True):
        absolute = urljoin(base_url, a["href"])
        if urlparse(absolute).scheme in ("http", "https"):
            links.append({"text": a.get_text(" ", strip=True)[:80], "url": absolute, "same_site": urlparse(absolute).netloc == host})
        if len(links) >= 100:
            break
    text = re.sub(r"\s+", " ", soup.get_text(" ", strip=True))
    result = {"title": title, "description": description, "headings": headings, "links": links,
              "text_excerpt": text[:1500], "word_count": len(text.split())}
    if selector.strip():
        try:
            result["selected"] = [el.get_text(" ", strip=True)[:300] for el in soup.select(selector.strip())[:50]]
        except Exception:
            raise ValueError("CSS 선택자가 올바르지 않습니다.")
    return result


def _public(job: Dict[str, Any]) -> Dict[str, Any]:
    return {k: v for k, v in job.items() if k != "last_result"}


@router.get("/jobs/")
async def list_jobs():
    return {"success": True, "data": [_public(j) for j in _read(STORE, [])]}


@router.post("/jobs/")
async def create_job(req: JobCreate):
    try:
        url = _check_url(req.url)
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))
    jobs = _read(STORE, [])
    job = {"id": secrets.token_hex(6), "name": (req.name or urlparse(url).hostname or url)[:80], "url": url,
           "selector": req.selector.strip()[:200], "status": "idle", "pages": 0, "errors": 0, "speed": 0.0,
           "successRate": 0, "lastRun": "", "frequency": "수동", "last_result": None}
    jobs.insert(0, job)
    _write(STORE, jobs)
    return {"success": True, "data": _public(job)}


@router.post("/jobs/{job_id}/run")
async def run_job(job_id: str):
    jobs = _read(STORE, [])
    job = next((j for j in jobs if j["id"] == job_id), None)
    if not job:
        raise HTTPException(status_code=404, detail="작업을 찾을 수 없습니다.")
    job["status"] = "running"
    started = time.time()
    runs = _read(RUNS, [])
    try:
        page = fetch_page(job["url"])
        result = parse_page(page["html"], page["final_url"], job.get("selector", ""))
        job.update({"status": "idle", "errors": job.get("errors", 0)})
        job["pages"] = job.get("pages", 0) + 1
        job["last_result"] = {**result, "fetched_at": datetime.now().isoformat(timespec="seconds"), "final_url": page["final_url"]}
        ok = True
        message = ""
    except (ValueError, httpx.HTTPError) as err:
        job.update({"status": "error"})
        job["errors"] = job.get("errors", 0) + 1
        ok = False
        message = str(err)[:300]
    elapsed = round(time.time() - started, 2)
    job["lastRun"] = datetime.now().strftime("%Y-%m-%d %H:%M")
    job["speed"] = round((job.get("speed", 0) * 0.5 + elapsed * 0.5) if job.get("speed") else elapsed, 2)
    attempts = job.get("pages", 0) + job.get("errors", 0)
    job["successRate"] = round(100 * job.get("pages", 0) / attempts) if attempts else 0
    runs.append({"job_id": job_id, "at": datetime.now().isoformat(timespec="seconds"), "ok": ok})
    _write(RUNS, runs[-5000:])
    _write(STORE, jobs)
    return {"success": ok, "data": _public(job), "error": message}


@router.get("/jobs/{job_id}/results")
async def job_results(job_id: str):
    job = next((j for j in _read(STORE, []) if j["id"] == job_id), None)
    if not job:
        raise HTTPException(status_code=404, detail="작업을 찾을 수 없습니다.")
    return {"success": True, "data": job.get("last_result")}


@router.get("/timeline")
async def timeline():
    """최근 실행을 시간별로 센다 (실제 실행 기록만 사용)."""
    buckets: Dict[str, Dict[str, int]] = {}
    for run in _read(RUNS, [])[-500:]:
        hour = run["at"][11:13] + ":00"
        bucket = buckets.setdefault(hour, {"time": hour, "requests": 0, "success": 0, "failed": 0})
        bucket["requests"] += 1
        bucket["success" if run["ok"] else "failed"] += 1
    return {"success": True, "data": [buckets[k] for k in sorted(buckets)]}


@router.delete("/jobs/{job_id}")
async def delete_job(job_id: str):
    jobs = _read(STORE, [])
    kept = [j for j in jobs if j["id"] != job_id]
    if len(kept) == len(jobs):
        raise HTTPException(status_code=404, detail="작업을 찾을 수 없습니다.")
    _write(STORE, kept)
    return {"success": True}
