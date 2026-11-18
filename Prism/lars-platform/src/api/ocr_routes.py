"""OCR (/api/ocr/*). 실제 엔진: 로컬 Tesseract (한국어+영어). 텍스트 PDF는 pypdf로 읽는다.

- 작업을 만들고(이름, 언어), 파일을 올리면 바로 글자를 읽어 결과(글자, 평균 정확도)를 저장한다.
- 스캔 PDF(이미지로만 된 PDF)는 지원하지 않으며, 그 경우 실패 사유를 남긴다.
"""

import csv
import io
import json
import re
import secrets
import shutil
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

router = APIRouter(prefix="/api/ocr", tags=["ocr"])
STORE = Path(".lars") / "ocr" / "jobs.json"
UPLOADS = Path(".lars") / "ocr" / "uploads"
LANGS = {"ko": "kor+eng", "en": "eng", "kor+eng": "kor+eng"}
IMAGE_TYPES = {".png", ".jpg", ".jpeg", ".tif", ".tiff", ".bmp", ".webp"}
MAX_BYTES = 20 * 1024 * 1024


class JobCreate(BaseModel):
    name: str
    language: str = "ko"


def _load() -> List[Dict[str, Any]]:
    try:
        return json.loads(STORE.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return []


def _save(jobs: List[Dict[str, Any]]) -> None:
    STORE.parent.mkdir(parents=True, exist_ok=True)
    STORE.write_text(json.dumps(jobs, ensure_ascii=False, indent=2), encoding="utf-8")


def _public(job: Dict[str, Any]) -> Dict[str, Any]:
    return {**job, "lang": job.get("language", "ko")}


def run_tesseract(image_path: Path, lang: str) -> Dict[str, Any]:
    """Tesseract를 실행해 글자와 평균 정확도를 돌려준다. 설치되어 있지 않으면 명확한 오류를 낸다."""
    binary = shutil.which("tesseract")
    if not binary:
        raise RuntimeError("Tesseract가 설치되어 있지 않습니다. (brew install tesseract tesseract-lang)")
    proc = subprocess.run([binary, str(image_path), "stdout", "-l", lang, "--psm", "3", "tsv"],
                          capture_output=True, text=True, timeout=180)
    if proc.returncode != 0:
        raise RuntimeError(f"OCR 실행 실패: {proc.stderr.strip()[:200]}")
    lines: Dict[tuple, List[str]] = {}
    confidences: List[float] = []
    reader = csv.DictReader(io.StringIO(proc.stdout), delimiter="\t", quoting=csv.QUOTE_NONE)
    for row in reader:
        if row.get("level") != "5":
            continue
        word = (row.get("text") or "").strip()
        conf = float(row.get("conf") or -1)
        if not word or conf < 0:
            continue
        key = (row["block_num"], row["par_num"], row["line_num"])
        lines.setdefault(key, []).append(word)
        confidences.append(conf)
    text = "\n".join(" ".join(words) for _, words in sorted(lines.items()))
    confidence = round(sum(confidences) / len(confidences)) if confidences else 0
    return {"text": text, "confidence": confidence}


def _read_pdf_text(path: Path) -> Optional[str]:
    try:
        from pypdf import PdfReader
    except ImportError:
        return None
    reader = PdfReader(str(path))
    pages = [(page.extract_text() or "").strip() for page in reader.pages]
    text = "\n\n".join(p for p in pages if p)
    return text or None


@router.get("/jobs/")
async def list_jobs():
    return {"success": True, "data": [_public(j) for j in _load()]}


@router.post("/jobs/")
async def create_job(req: JobCreate):
    name = req.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="문서 이름을 입력해 주세요.")
    if req.language not in LANGS:
        raise HTTPException(status_code=400, detail="지원하지 않는 언어입니다. (ko, en)")
    job = {"id": secrets.token_hex(6), "name": name[:120], "language": req.language, "status": "pending",
           "confidence": 0, "text": "", "filename": "", "error": "", "created_at": datetime.now().isoformat(timespec="seconds")}
    jobs = _load()
    jobs.insert(0, job)
    _save(jobs)
    return {"success": True, "data": _public(job)}


@router.post("/jobs/{job_id}/file")
async def run_job(job_id: str, file: UploadFile = File(...)):
    jobs = _load()
    job = next((j for j in jobs if j["id"] == job_id), None)
    if not job:
        raise HTTPException(status_code=404, detail="작업을 찾을 수 없습니다.")
    data = await file.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=400, detail="파일이 20MB를 넘습니다.")
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in IMAGE_TYPES | {".pdf"}:
        raise HTTPException(status_code=400, detail="이미지(png, jpg, tif, bmp, webp) 또는 텍스트 PDF만 지원합니다.")
    UPLOADS.mkdir(parents=True, exist_ok=True)
    stored = UPLOADS / f"{job_id}{suffix}"
    stored.write_bytes(data)
    job.update({"filename": file.filename or stored.name, "status": "running"})
    _save(jobs)
    try:
        if suffix == ".pdf":
            text = _read_pdf_text(stored)
            if not text:
                raise RuntimeError("글자가 없는 스캔 PDF입니다. 페이지를 이미지(png, jpg)로 저장해서 올려 주세요.")
            result = {"text": text, "confidence": 100}
        else:
            result = run_tesseract(stored, LANGS[job.get("language", "ko")])
        job.update({"status": "done", "text": result["text"], "confidence": result["confidence"], "error": ""})
    except (RuntimeError, subprocess.SubprocessError, OSError) as err:
        job.update({"status": "failed", "error": str(err)[:300], "text": "", "confidence": 0})
    _save(jobs)
    return {"success": job["status"] == "done", "data": _public(job)}


@router.get("/jobs/{job_id}")
async def get_job(job_id: str):
    job = next((j for j in _load() if j["id"] == job_id), None)
    if not job:
        raise HTTPException(status_code=404, detail="작업을 찾을 수 없습니다.")
    return {"success": True, "data": _public(job)}


@router.delete("/jobs/{job_id}")
async def delete_job(job_id: str):
    jobs = _load()
    kept = [j for j in jobs if j["id"] != job_id]
    if len(kept) == len(jobs):
        raise HTTPException(status_code=404, detail="작업을 찾을 수 없습니다.")
    _save(kept)
    for stored in UPLOADS.glob(f"{job_id}.*"):
        stored.unlink(missing_ok=True)
    return {"success": True}
