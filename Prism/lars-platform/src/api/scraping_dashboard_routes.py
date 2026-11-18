"""웹 스크래핑 대시보드 API"""

import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from src.core.db import get_db
from src.core.models import WebScrapingJob
from pydantic import BaseModel
from datetime import datetime

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/scraping", tags=["scraping"])


class WebScrapingJobCreate(BaseModel):
    """웹 스크래핑 작업 생성"""
    url: str
    name: str = None


class WebScrapingJobUpdate(BaseModel):
    """웹 스크래핑 작업 업데이트"""
    status: str = None
    data: dict = None


@router.get("/jobs/")
async def list_scraping_jobs(
    db: Session = Depends(get_db),
    skip: int = Query(0),
    limit: int = Query(50),
    status: str = Query(None)
):
    """스크래핑 작업 목록"""
    try:
        query = db.query(WebScrapingJob).offset(skip).limit(limit)

        if status:
            query = query.filter(WebScrapingJob.status == status)

        jobs = query.all()
        total = db.query(WebScrapingJob).count()

        return {
            "data": [{
                "id": j.id,
                "url": j.url,
                "status": j.status,
                "created": j.created.strftime("%Y-%m-%d %H:%M"),
                "data": j.data
            } for j in jobs],
            "total": total
        }
    except Exception as e:
        logger.error(f"스크래핑 작업 조회 실패: {e}")
        raise HTTPException(status_code=500, detail="작업 조회 실패")


@router.post("/jobs/")
async def create_scraping_job(
    job: WebScrapingJobCreate,
    db: Session = Depends(get_db)
):
    """새 스크래핑 작업 생성"""
    try:
        new_job = WebScrapingJob(
            url=job.url,
            status="pending"
        )
        db.add(new_job)
        db.commit()
        db.refresh(new_job)

        logger.info(f"스크래핑 작업 생성: {new_job.url}")
        return {
            "id": new_job.id,
            "url": new_job.url,
            "status": new_job.status,
            "created": new_job.created.strftime("%Y-%m-%d %H:%M")
        }
    except Exception as e:
        db.rollback()
        logger.error(f"스크래핑 작업 생성 실패: {e}")
        raise HTTPException(status_code=500, detail="작업 생성 실패")


@router.put("/jobs/{job_id}")
async def update_scraping_job(
    job_id: int,
    update_data: WebScrapingJobUpdate,
    db: Session = Depends(get_db)
):
    """스크래핑 작업 업데이트"""
    try:
        job = db.query(WebScrapingJob).filter(WebScrapingJob.id == job_id).first()

        if not job:
            raise HTTPException(status_code=404, detail="작업 없음")

        if update_data.status:
            job.status = update_data.status
        if update_data.data:
            job.data = update_data.data

        job.updated = datetime.utcnow()
        db.commit()
        db.refresh(job)

        return {
            "id": job.id,
            "url": job.url,
            "status": job.status,
            "created": job.created.strftime("%Y-%m-%d %H:%M")
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"스크래핑 작업 업데이트 실패: {e}")
        raise HTTPException(status_code=500, detail="업데이트 실패")


@router.delete("/jobs/{job_id}")
async def delete_scraping_job(
    job_id: int,
    db: Session = Depends(get_db)
):
    """스크래핑 작업 삭제"""
    try:
        job = db.query(WebScrapingJob).filter(WebScrapingJob.id == job_id).first()

        if not job:
            raise HTTPException(status_code=404, detail="작업 없음")

        db.delete(job)
        db.commit()

        return {"message": "작업 삭제 완료"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"스크래핑 작업 삭제 실패: {e}")
        raise HTTPException(status_code=500, detail="삭제 실패")
