"""CRM 대시보드 API"""

import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from src.core.db import get_db
from src.core.models import CRMContact
from pydantic import BaseModel
from datetime import datetime

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/crm", tags=["crm"])


class CRMContactCreate(BaseModel):
    """CRM 연락처 생성"""
    name: str
    email: str = None
    phone: str = None
    company: str = None
    status: str = "lead"
    notes: str = None


class CRMContactUpdate(BaseModel):
    """CRM 연락처 업데이트"""
    name: str = None
    email: str = None
    phone: str = None
    company: str = None
    status: str = None
    notes: str = None


@router.get("/contacts/")
async def list_crm_contacts(
    db: Session = Depends(get_db),
    skip: int = Query(0),
    limit: int = Query(50),
    status: str = Query(None)
):
    """CRM 연락처 목록"""
    try:
        query = db.query(CRMContact).offset(skip).limit(limit)

        if status:
            query = query.filter(CRMContact.status == status)

        contacts = query.all()
        total = db.query(CRMContact).count()

        return {
            "data": [{
                "id": c.id,
                "name": c.name,
                "email": c.email,
                "phone": c.phone,
                "company": c.company,
                "status": c.status,
                "notes": c.notes,
                "created": c.created.strftime("%Y-%m-%d")
            } for c in contacts],
            "total": total
        }
    except Exception as e:
        logger.error(f"CRM 연락처 조회 실패: {e}")
        raise HTTPException(status_code=500, detail="연락처 조회 실패")


@router.post("/contacts/")
async def create_crm_contact(
    contact: CRMContactCreate,
    db: Session = Depends(get_db)
):
    """새 CRM 연락처 생성"""
    try:
        new_contact = CRMContact(
            name=contact.name,
            email=contact.email,
            phone=contact.phone,
            company=contact.company,
            status=contact.status,
            notes=contact.notes
        )
        db.add(new_contact)
        db.commit()
        db.refresh(new_contact)

        logger.info(f"CRM 연락처 생성: {new_contact.name}")
        return {
            "id": new_contact.id,
            "name": new_contact.name,
            "email": new_contact.email,
            "phone": new_contact.phone,
            "company": new_contact.company,
            "status": new_contact.status,
            "created": new_contact.created.strftime("%Y-%m-%d")
        }
    except Exception as e:
        db.rollback()
        logger.error(f"CRM 연락처 생성 실패: {e}")
        raise HTTPException(status_code=500, detail="연락처 생성 실패")


@router.put("/contacts/{contact_id}")
async def update_crm_contact(
    contact_id: int,
    update_data: CRMContactUpdate,
    db: Session = Depends(get_db)
):
    """CRM 연락처 업데이트"""
    try:
        contact = db.query(CRMContact).filter(CRMContact.id == contact_id).first()

        if not contact:
            raise HTTPException(status_code=404, detail="연락처 없음")

        if update_data.name:
            contact.name = update_data.name
        if update_data.email:
            contact.email = update_data.email
        if update_data.phone:
            contact.phone = update_data.phone
        if update_data.company:
            contact.company = update_data.company
        if update_data.status:
            contact.status = update_data.status
        if update_data.notes:
            contact.notes = update_data.notes

        contact.updated = datetime.utcnow()
        db.commit()
        db.refresh(contact)

        logger.info(f"CRM 연락처 업데이트: {contact.name}")
        return {
            "id": contact.id,
            "name": contact.name,
            "email": contact.email,
            "phone": contact.phone,
            "company": contact.company,
            "status": contact.status,
            "created": contact.created.strftime("%Y-%m-%d")
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"CRM 연락처 업데이트 실패: {e}")
        raise HTTPException(status_code=500, detail="업데이트 실패")


@router.delete("/contacts/{contact_id}")
async def delete_crm_contact(
    contact_id: int,
    db: Session = Depends(get_db)
):
    """CRM 연락처 삭제"""
    try:
        contact = db.query(CRMContact).filter(CRMContact.id == contact_id).first()

        if not contact:
            raise HTTPException(status_code=404, detail="연락처 없음")

        db.delete(contact)
        db.commit()

        logger.info(f"CRM 연락처 삭제: {contact.name}")
        return {"message": "연락처 삭제 완료"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"CRM 연락처 삭제 실패: {e}")
        raise HTTPException(status_code=500, detail="삭제 실패")
