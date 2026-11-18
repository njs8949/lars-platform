"""기타 대시보드 API (SEO, 워크플로우, 통합)"""

import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from src.core.db import get_db
from src.core.models import SEOKeyword, WorkflowExecution, Integration
from pydantic import BaseModel
from datetime import datetime

logger = logging.getLogger(__name__)
router = APIRouter(tags=["misc-dashboards"])


# ===== SEO Keywords =====
class SEOKeywordCreate(BaseModel):
    """SEO 키워드 생성"""
    keyword: str
    domain: str
    position: int = 0


class SEOKeywordUpdate(BaseModel):
    """SEO 키워드 업데이트"""
    position: int = None


@router.get("/api/seo/keywords/")
async def list_seo_keywords(
    db: Session = Depends(get_db),
    skip: int = Query(0),
    limit: int = Query(50),
):
    """SEO 키워드 목록"""
    try:
        keywords = db.query(SEOKeyword).offset(skip).limit(limit).all()
        total = db.query(SEOKeyword).count()

        return {
            "data": [{
                "id": k.id,
                "keyword": k.keyword,
                "domain": k.domain,
                "position": k.position,
                "created": k.created.strftime("%Y-%m-%d %H:%M"),
            } for k in keywords],
            "total": total
        }
    except Exception as e:
        logger.error(f"SEO 키워드 조회 실패: {e}")
        raise HTTPException(status_code=500, detail="조회 실패")


@router.post("/api/seo/keywords/")
async def create_seo_keyword(
    keyword: SEOKeywordCreate,
    db: Session = Depends(get_db)
):
    """새 SEO 키워드 생성"""
    try:
        new_keyword = SEOKeyword(
            keyword=keyword.keyword,
            domain=keyword.domain,
            position=keyword.position
        )
        db.add(new_keyword)
        db.commit()
        db.refresh(new_keyword)

        logger.info(f"SEO 키워드 생성: {new_keyword.keyword}")
        return {
            "id": new_keyword.id,
            "keyword": new_keyword.keyword,
            "domain": new_keyword.domain,
            "position": new_keyword.position,
            "created": new_keyword.created.strftime("%Y-%m-%d %H:%M")
        }
    except Exception as e:
        db.rollback()
        logger.error(f"SEO 키워드 생성 실패: {e}")
        raise HTTPException(status_code=500, detail="생성 실패")


@router.put("/api/seo/keywords/{keyword_id}")
async def update_seo_keyword(
    keyword_id: int,
    update_data: SEOKeywordUpdate,
    db: Session = Depends(get_db)
):
    """SEO 키워드 업데이트"""
    try:
        keyword = db.query(SEOKeyword).filter(SEOKeyword.id == keyword_id).first()

        if not keyword:
            raise HTTPException(status_code=404, detail="키워드 없음")

        if update_data.position is not None:
            keyword.position = update_data.position

        keyword.updated = datetime.utcnow()
        db.commit()
        db.refresh(keyword)

        return {
            "id": keyword.id,
            "keyword": keyword.keyword,
            "domain": keyword.domain,
            "position": keyword.position,
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"SEO 키워드 업데이트 실패: {e}")
        raise HTTPException(status_code=500, detail="업데이트 실패")


@router.delete("/api/seo/keywords/{keyword_id}")
async def delete_seo_keyword(
    keyword_id: int,
    db: Session = Depends(get_db)
):
    """SEO 키워드 삭제"""
    try:
        keyword = db.query(SEOKeyword).filter(SEOKeyword.id == keyword_id).first()

        if not keyword:
            raise HTTPException(status_code=404, detail="키워드 없음")

        db.delete(keyword)
        db.commit()

        return {"message": "삭제 완료"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"SEO 키워드 삭제 실패: {e}")
        raise HTTPException(status_code=500, detail="삭제 실패")


# ===== Workflows =====
class WorkflowCreate(BaseModel):
    """워크플로우 생성"""
    name: str
    workflow_data: dict = {}


class WorkflowUpdate(BaseModel):
    """워크플로우 업데이트"""
    status: str = None
    result: dict = None


@router.get("/api/workflows/items/")
async def list_workflows(
    db: Session = Depends(get_db),
    skip: int = Query(0),
    limit: int = Query(50),
):
    """워크플로우 목록"""
    try:
        workflows = db.query(WorkflowExecution).offset(skip).limit(limit).all()
        total = db.query(WorkflowExecution).count()

        return {
            "data": [{
                "id": w.id,
                "name": w.name,
                "status": w.status,
                "created": w.created.strftime("%Y-%m-%d %H:%M"),
            } for w in workflows],
            "total": total
        }
    except Exception as e:
        logger.error(f"워크플로우 조회 실패: {e}")
        raise HTTPException(status_code=500, detail="조회 실패")


@router.post("/api/workflows/items/")
async def create_workflow(
    workflow: WorkflowCreate,
    db: Session = Depends(get_db)
):
    """새 워크플로우 생성"""
    try:
        new_workflow = WorkflowExecution(
            name=workflow.name,
            status="pending",
            workflow_data=workflow.workflow_data
        )
        db.add(new_workflow)
        db.commit()
        db.refresh(new_workflow)

        logger.info(f"워크플로우 생성: {new_workflow.name}")
        return {
            "id": new_workflow.id,
            "name": new_workflow.name,
            "status": new_workflow.status,
            "created": new_workflow.created.strftime("%Y-%m-%d %H:%M")
        }
    except Exception as e:
        db.rollback()
        logger.error(f"워크플로우 생성 실패: {e}")
        raise HTTPException(status_code=500, detail="생성 실패")


@router.put("/api/workflows/items/{workflow_id}")
async def update_workflow(
    workflow_id: int,
    update_data: WorkflowUpdate,
    db: Session = Depends(get_db)
):
    """워크플로우 업데이트"""
    try:
        workflow = db.query(WorkflowExecution).filter(WorkflowExecution.id == workflow_id).first()

        if not workflow:
            raise HTTPException(status_code=404, detail="워크플로우 없음")

        if update_data.status:
            workflow.status = update_data.status
        if update_data.result:
            workflow.result = update_data.result

        workflow.updated = datetime.utcnow()
        db.commit()
        db.refresh(workflow)

        return {
            "id": workflow.id,
            "name": workflow.name,
            "status": workflow.status,
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"워크플로우 업데이트 실패: {e}")
        raise HTTPException(status_code=500, detail="업데이트 실패")


@router.delete("/api/workflows/items/{workflow_id}")
async def delete_workflow(
    workflow_id: int,
    db: Session = Depends(get_db)
):
    """워크플로우 삭제"""
    try:
        workflow = db.query(WorkflowExecution).filter(WorkflowExecution.id == workflow_id).first()

        if not workflow:
            raise HTTPException(status_code=404, detail="워크플로우 없음")

        db.delete(workflow)
        db.commit()

        return {"message": "삭제 완료"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"워크플로우 삭제 실패: {e}")
        raise HTTPException(status_code=500, detail="삭제 실패")


# ===== Integrations =====
class IntegrationCreate(BaseModel):
    """통합 생성"""
    name: str
    type: str = "custom"
    config: dict = {}


class IntegrationUpdate(BaseModel):
    """통합 업데이트"""
    status: str = None
    config: dict = None


@router.get("/api/integrations/items/")
async def list_integrations(
    db: Session = Depends(get_db),
    skip: int = Query(0),
    limit: int = Query(50),
):
    """통합 목록"""
    try:
        integrations = db.query(Integration).offset(skip).limit(limit).all()
        total = db.query(Integration).count()

        return {
            "data": [{
                "id": i.id,
                "name": i.name,
                "type": i.type,
                "status": i.status,
                "created": i.created.strftime("%Y-%m-%d %H:%M"),
            } for i in integrations],
            "total": total
        }
    except Exception as e:
        logger.error(f"통합 조회 실패: {e}")
        raise HTTPException(status_code=500, detail="조회 실패")


@router.post("/api/integrations/items/")
async def create_integration(
    integration: IntegrationCreate,
    db: Session = Depends(get_db)
):
    """새 통합 생성"""
    try:
        new_integration = Integration(
            name=integration.name,
            type=integration.type,
            status="active",
            config=integration.config
        )
        db.add(new_integration)
        db.commit()
        db.refresh(new_integration)

        logger.info(f"통합 생성: {new_integration.name}")
        return {
            "id": new_integration.id,
            "name": new_integration.name,
            "type": new_integration.type,
            "status": new_integration.status,
            "created": new_integration.created.strftime("%Y-%m-%d %H:%M")
        }
    except Exception as e:
        db.rollback()
        logger.error(f"통합 생성 실패: {e}")
        raise HTTPException(status_code=500, detail="생성 실패")


@router.put("/api/integrations/items/{integration_id}")
async def update_integration(
    integration_id: int,
    update_data: IntegrationUpdate,
    db: Session = Depends(get_db)
):
    """통합 업데이트"""
    try:
        integration = db.query(Integration).filter(Integration.id == integration_id).first()

        if not integration:
            raise HTTPException(status_code=404, detail="통합 없음")

        if update_data.status:
            integration.status = update_data.status
        if update_data.config:
            integration.config = update_data.config

        integration.updated = datetime.utcnow()
        db.commit()
        db.refresh(integration)

        return {
            "id": integration.id,
            "name": integration.name,
            "type": integration.type,
            "status": integration.status,
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"통합 업데이트 실패: {e}")
        raise HTTPException(status_code=500, detail="업데이트 실패")


@router.delete("/api/integrations/items/{integration_id}")
async def delete_integration(
    integration_id: int,
    db: Session = Depends(get_db)
):
    """통합 삭제"""
    try:
        integration = db.query(Integration).filter(Integration.id == integration_id).first()

        if not integration:
            raise HTTPException(status_code=404, detail="통합 없음")

        db.delete(integration)
        db.commit()

        return {"message": "삭제 완료"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"통합 삭제 실패: {e}")
        raise HTTPException(status_code=500, detail="삭제 실패")
