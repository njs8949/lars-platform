"""데이터 웨어하우스 API: 파일 적재, 테이블 목록과 미리보기, 읽기 전용 SQL, 적재와 쿼리 이력."""

import asyncio
from typing import Optional

from fastapi import APIRouter, File, HTTPException, Request, UploadFile
from pydantic import BaseModel

from src.api.feature_routes import _signed_in_email
from src.core import warehouse

router = APIRouter(prefix="/api/warehouse", tags=["warehouse"])


class QueryRequest(BaseModel):
    sql: str


@router.get("/tables")
async def tables(request: Request):
    email = _signed_in_email(request)
    return {"tables": await asyncio.to_thread(warehouse.catalog, email)}


@router.post("/tables")
async def load_table(request: Request, file: UploadFile = File(...), table: str = "", mode: str = "replace"):
    """파일을 테이블로 적재한다. 이름을 비우면 파일 이름을 쓴다."""
    email = _signed_in_email(request)
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="빈 파일입니다.")
    name = table.strip() or (file.filename or "table").rsplit(".", 1)[0]
    try:
        return await asyncio.to_thread(warehouse.load, email, file.filename or "file", data, name, mode)
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))


@router.get("/tables/{table_name}")
async def table_preview(request: Request, table_name: str):
    email = _signed_in_email(request)
    try:
        return await asyncio.to_thread(warehouse.preview, email, table_name)
    except ValueError as err:
        raise HTTPException(status_code=404, detail=str(err))


@router.delete("/tables/{table_name}")
async def delete_table(request: Request, table_name: str):
    email = _signed_in_email(request)
    try:
        ok = await asyncio.to_thread(warehouse.drop_table, email, table_name)
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))
    if not ok:
        raise HTTPException(status_code=404, detail="테이블을 찾을 수 없습니다.")
    return {"deleted": table_name}


@router.post("/query")
async def run_query(request: Request, body: QueryRequest):
    email = _signed_in_email(request)
    try:
        return await asyncio.to_thread(warehouse.query, email, body.sql)
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))


@router.get("/history")
async def history(request: Request):
    email = _signed_in_email(request)
    return {"queries": await asyncio.to_thread(warehouse.history, email), "loads": await asyncio.to_thread(warehouse.load_history, email)}


@router.get("/status")
async def capacity_status(request: Request):
    """저장 공간 상태: 데이터베이스 사용률, 계정 사용량, 자동 확장과 최적화 기록."""
    email = _signed_in_email(request)
    return await asyncio.to_thread(warehouse.status, email)
