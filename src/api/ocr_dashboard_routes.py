"""OCR 대시보드 API"""

import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from src.core.db import get_db
from src.core.models import OCRJob
from pydantic import BaseModel
from datetime import datetime

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/ocr", tags=["ocr"])


class OCRJobCreate(BaseModel):
    """OCR 작업 생성"""
    name: str
    language: str = "ko"


class OCRJobUpdate(BaseModel):
    """OCR 작업 업데이트"""
    status: str = None
    accuracy: float = None
    text_content: str = None


@router.get("/jobs/")
async def list_ocr_jobs(
    db: Session = Depends(get_db),
    skip: int = Query(0),
    limit: int = Query(50),
    status: str = Query(None)
):
    """OCR 작업 목록"""
    try:
        query = db.query(OCRJob).offset(skip).limit(limit)

        if status:
            query = query.filter(OCRJob.status == status)

        jobs = query.all()
        total = db.query(OCRJob).count()

        return {
            "data": [{
                "id": j.id,
                "name": j.name,
                "status": j.status,
                "accuracy": j.accuracy,
                "language": j.language,
                "created": j.created.strftime("%Y-%m-%d %H:%M")
            } for j in jobs],
            "total": total
        }
    except Exception as e:
        logger.error(f"OCR 작업 조회 실패: {e}")
        raise HTTPException(status_code=500, detail="작업 조회 실패")


@router.post("/jobs/")
async def create_ocr_job(
    job: OCRJobCreate,
    db: Session = Depends(get_db)
):
    """새 OCR 작업 생성"""
    try:
        new_job = OCRJob(
            name=job.name,
            language=job.language,
            status="pending"
        )
        db.add(new_job)
        db.commit()
        db.refresh(new_job)

        logger.info(f"OCR 작업 생성: {new_job.name}")
        return {
            "id": new_job.id,
            "name": new_job.name,
            "status": new_job.status,
            "language": new_job.language,
            "created": new_job.created.strftime("%Y-%m-%d %H:%M")
        }
    except Exception as e:
        db.rollback()
        logger.error(f"OCR 작업 생성 실패: {e}")
        raise HTTPException(status_code=500, detail="작업 생성 실패")


@router.put("/jobs/{job_id}")
async def update_ocr_job(
    job_id: int,
    update_data: OCRJobUpdate,
    db: Session = Depends(get_db)
):
    """OCR 작업 업데이트"""
    try:
        job = db.query(OCRJob).filter(OCRJob.id == job_id).first()

        if not job:
            raise HTTPException(status_code=404, detail="작업 없음")

        if update_data.status:
            job.status = update_data.status
        if update_data.accuracy is not None:
            job.accuracy = update_data.accuracy
        if update_data.text_content:
            job.text_content = update_data.text_content

        job.updated = datetime.utcnow()
        db.commit()
        db.refresh(job)

        return {
            "id": job.id,
            "name": job.name,
            "status": job.status,
            "accuracy": job.accuracy,
            "created": job.created.strftime("%Y-%m-%d %H:%M")
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"OCR 작업 업데이트 실패: {e}")
        raise HTTPException(status_code=500, detail="업데이트 실패")


@router.delete("/jobs/{job_id}")
async def delete_ocr_job(
    job_id: int,
    db: Session = Depends(get_db)
):
    """OCR 작업 삭제"""
    try:
        job = db.query(OCRJob).filter(OCRJob.id == job_id).first()

        if not job:
            raise HTTPException(status_code=404, detail="작업 없음")

        db.delete(job)
        db.commit()

        return {"message": "작업 삭제 완료"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"OCR 작업 삭제 실패: {e}")
        raise HTTPException(status_code=500, detail="삭제 실패")
