"""프레젠테이션 관리 API"""

import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from src.core.db import get_db
from src.core.models import Presentation, Theme, PPTTemplate
from pydantic import BaseModel
from datetime import datetime

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/presentations", tags=["presentations"])


class PresentationCreate(BaseModel):
    """프레젠테이션 생성 스키마"""
    name: str
    template: str = "Blank"
    slides: int = 0


class PresentationUpdate(BaseModel):
    """프레젠테이션 업데이트 스키마"""
    name: str = None
    status: str = None
    slides: int = None
    download_count: int = None


class ThemeCreate(BaseModel):
    """테마 생성 스키마"""
    name: str
    category: str = "Custom"
    colors: List[str] = ["#3b82f6", "#8b5cf6", "#ec4899"]


class ThemeUpdate(BaseModel):
    """테마 업데이트 스키마"""
    name: str = None
    category: str = None
    colors: List[str] = None


# ==================== 프레젠테이션 엔드포인트 ====================

@router.get("/")
async def list_presentations(
    db: Session = Depends(get_db),
    skip: int = Query(0),
    limit: int = Query(50),
    status: str = Query(None)
):
    """프레젠테이션 목록 조회"""
    try:
        query = db.query(Presentation).offset(skip).limit(limit)

        if status:
            query = query.filter(Presentation.status == status)

        presentations = query.all()
        total = db.query(Presentation).count()

        return {
            "data": [p.to_dict() for p in presentations],
            "total": total,
            "skip": skip,
            "limit": limit
        }
    except Exception as e:
        logger.error(f"프레젠테이션 조회 실패: {e}")
        raise HTTPException(status_code=500, detail="프레젠테이션 조회 실패")


@router.post("/")
async def create_presentation(
    presentation: PresentationCreate,
    db: Session = Depends(get_db)
):
    """새 프레젠테이션 생성"""
    try:
        new_presentation = Presentation(
            name=presentation.name,
            template=presentation.template,
            slides=presentation.slides,
            status="draft",
            size="0KB"
        )
        db.add(new_presentation)
        db.commit()
        db.refresh(new_presentation)

        logger.info(f"프레젠테이션 생성: {new_presentation.name}")
        return new_presentation.to_dict()
    except Exception as e:
        db.rollback()
        logger.error(f"프레젠테이션 생성 실패: {e}")
        raise HTTPException(status_code=500, detail="프레젠테이션 생성 실패")


@router.get("/{presentation_id}")
async def get_presentation(
    presentation_id: int,
    db: Session = Depends(get_db)
):
    """프레젠테이션 상세 조회"""
    try:
        presentation = db.query(Presentation).filter(
            Presentation.id == presentation_id
        ).first()

        if not presentation:
            raise HTTPException(status_code=404, detail="프레젠테이션 없음")

        return presentation.to_dict()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"프레젠테이션 조회 실패: {e}")
        raise HTTPException(status_code=500, detail="프레젠테이션 조회 실패")


@router.put("/{presentation_id}")
async def update_presentation(
    presentation_id: int,
    update_data: PresentationUpdate,
    db: Session = Depends(get_db)
):
    """프레젠테이션 업데이트"""
    try:
        presentation = db.query(Presentation).filter(
            Presentation.id == presentation_id
        ).first()

        if not presentation:
            raise HTTPException(status_code=404, detail="프레젠테이션 없음")

        if update_data.name:
            presentation.name = update_data.name
        if update_data.status:
            presentation.status = update_data.status
        if update_data.slides is not None:
            presentation.slides = update_data.slides
        if update_data.download_count is not None:
            presentation.download_count = update_data.download_count

        presentation.updated = datetime.utcnow()
        db.commit()
        db.refresh(presentation)

        logger.info(f"프레젠테이션 업데이트: {presentation.name}")
        return presentation.to_dict()
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"프레젠테이션 업데이트 실패: {e}")
        raise HTTPException(status_code=500, detail="프레젠테이션 업데이트 실패")


@router.delete("/{presentation_id}")
async def delete_presentation(
    presentation_id: int,
    db: Session = Depends(get_db)
):
    """프레젠테이션 삭제"""
    try:
        presentation = db.query(Presentation).filter(
            Presentation.id == presentation_id
        ).first()

        if not presentation:
            raise HTTPException(status_code=404, detail="프레젠테이션 없음")

        db.delete(presentation)
        db.commit()

        logger.info(f"프레젠테이션 삭제: {presentation.name}")
        return {"message": "프레젠테이션 삭제 완료"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"프레젠테이션 삭제 실패: {e}")
        raise HTTPException(status_code=500, detail="프레젠테이션 삭제 실패")


# ==================== 테마 엔드포인트 ====================

@router.get("/themes/")
async def list_themes(
    db: Session = Depends(get_db),
    skip: int = Query(0),
    limit: int = Query(50)
):
    """테마 목록 조회"""
    try:
        themes = db.query(Theme).offset(skip).limit(limit).all()
        total = db.query(Theme).count()

        return {
            "data": [t.to_dict() for t in themes],
            "total": total,
            "skip": skip,
            "limit": limit
        }
    except Exception as e:
        logger.error(f"테마 조회 실패: {e}")
        raise HTTPException(status_code=500, detail="테마 조회 실패")


@router.post("/themes/")
async def create_theme(
    theme: ThemeCreate,
    db: Session = Depends(get_db)
):
    """새 테마 생성"""
    try:
        new_theme = Theme(
            name=theme.name,
            category=theme.category,
            colors=theme.colors,
            usage=0
        )
        db.add(new_theme)
        db.commit()
        db.refresh(new_theme)

        logger.info(f"테마 생성: {new_theme.name}")
        return new_theme.to_dict()
    except Exception as e:
        db.rollback()
        logger.error(f"테마 생성 실패: {e}")
        raise HTTPException(status_code=500, detail="테마 생성 실패")


@router.delete("/themes/{theme_id}")
async def delete_theme(
    theme_id: int,
    db: Session = Depends(get_db)
):
    """테마 삭제"""
    try:
        theme = db.query(Theme).filter(Theme.id == theme_id).first()

        if not theme:
            raise HTTPException(status_code=404, detail="테마 없음")

        db.delete(theme)
        db.commit()

        logger.info(f"테마 삭제: {theme.name}")
        return {"message": "테마 삭제 완료"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"테마 삭제 실패: {e}")
        raise HTTPException(status_code=500, detail="테마 삭제 실패")


# ==================== 템플릿 엔드포인트 ====================

@router.get("/templates/")
async def list_templates(
    db: Session = Depends(get_db)
):
    """PPT 템플릿 목록 조회"""
    try:
        templates = db.query(PPTTemplate).all()

        return {
            "data": [t.to_dict() for t in templates],
            "total": len(templates)
        }
    except Exception as e:
        logger.error(f"템플릿 조회 실패: {e}")
        raise HTTPException(status_code=500, detail="템플릿 조회 실패")
