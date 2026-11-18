"""데이터 내보내기 API"""

import csv
import json
from io import StringIO, BytesIO
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from src.core.db import get_db
from src.core.models import Presentation, Theme, CRMContact, OCRJob, WebScrapingJob
from fastapi.responses import StreamingResponse
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/export", tags=["export"])


def csv_to_bytes(data: list, headers: list) -> BytesIO:
    """데이터를 CSV로 변환"""
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(headers)
    for row in data:
        writer.writerow(row)

    bytes_data = BytesIO(output.getvalue().encode('utf-8-sig'))
    return bytes_data


@router.get("/presentations/csv")
async def export_presentations_csv(db: Session = Depends(get_db)):
    """프레젠테이션을 CSV로 내보내기"""
    try:
        presentations = db.query(Presentation).all()

        rows = [[p.name, p.slides, p.status, p.template, p.created.strftime("%Y-%m-%d")]
                for p in presentations]
        headers = ["프레젠테이션명", "슬라이드", "상태", "템플릿", "생성일"]

        csv_bytes = csv_to_bytes(rows, headers)

        return StreamingResponse(
            iter([csv_bytes.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=presentations.csv"}
        )
    except Exception as e:
        logger.error(f"CSV 내보내기 실패: {e}")
        raise HTTPException(status_code=500, detail="내보내기 실패")


@router.get("/presentations/json")
async def export_presentations_json(db: Session = Depends(get_db)):
    """프레젠테이션을 JSON으로 내보내기"""
    try:
        presentations = db.query(Presentation).all()
        data = [p.to_dict() for p in presentations]

        return StreamingResponse(
            iter([json.dumps(data, ensure_ascii=False, indent=2).encode('utf-8')]),
            media_type="application/json",
            headers={"Content-Disposition": "attachment; filename=presentations.json"}
        )
    except Exception as e:
        logger.error(f"JSON 내보내기 실패: {e}")
        raise HTTPException(status_code=500, detail="내보내기 실패")


@router.get("/crm/contacts/csv")
async def export_crm_csv(db: Session = Depends(get_db)):
    """CRM 연락처를 CSV로 내보내기"""
    try:
        contacts = db.query(CRMContact).all()

        rows = [[c.name, c.email, c.phone, c.company, c.status, c.created.strftime("%Y-%m-%d")]
                for c in contacts]
        headers = ["이름", "이메일", "전화", "회사", "상태", "생성일"]

        csv_bytes = csv_to_bytes(rows, headers)

        return StreamingResponse(
            iter([csv_bytes.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=crm_contacts.csv"}
        )
    except Exception as e:
        logger.error(f"CRM CSV 내보내기 실패: {e}")
        raise HTTPException(status_code=500, detail="내보내기 실패")


@router.get("/ocr/jobs/csv")
async def export_ocr_csv(db: Session = Depends(get_db)):
    """OCR 작업을 CSV로 내보내기"""
    try:
        jobs = db.query(OCRJob).all()

        rows = [[j.name, j.status, f"{j.accuracy}%", j.language, j.created.strftime("%Y-%m-%d")]
                for j in jobs]
        headers = ["문서명", "상태", "정확도", "언어", "생성일"]

        csv_bytes = csv_to_bytes(rows, headers)

        return StreamingResponse(
            iter([csv_bytes.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=ocr_jobs.csv"}
        )
    except Exception as e:
        logger.error(f"OCR CSV 내보내기 실패: {e}")
        raise HTTPException(status_code=500, detail="내보내기 실패")
