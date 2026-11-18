"""프로젝트 API: 계정별 프로젝트, 지침, 참고 자료(파일) 관리."""

from typing import Optional

from fastapi import APIRouter, File, HTTPException, Request, UploadFile
from pydantic import BaseModel

from src.api.feature_routes import _signed_in_email
from src.core import project_store

router = APIRouter(prefix="/api/projects", tags=["projects"])
MAX_UPLOAD_BYTES = 15 * 1024 * 1024


class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = ""


class ProjectPatch(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    instructions: Optional[str] = None


def _check_id(project_id: str) -> str:
    if not project_id or not project_id.isalnum() or len(project_id) > 32:
        raise HTTPException(status_code=400, detail="잘못된 프로젝트 번호입니다.")
    return project_id


@router.get("")
async def list_all(request: Request):
    email = _signed_in_email(request)
    return {"projects": project_store.list_projects(email)}


@router.post("")
async def create(request: Request, body: ProjectCreate):
    email = _signed_in_email(request)
    name = (body.name or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="프로젝트 이름을 입력해 주세요.")
    return project_store.create_project(email, name, body.description or "")


@router.patch("/{project_id}")
async def patch(request: Request, project_id: str, body: ProjectPatch):
    email = _signed_in_email(request)
    updated = project_store.update_project(email, _check_id(project_id), body.model_dump(exclude_none=True))
    if updated is None:
        raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다.")
    return updated


@router.delete("/{project_id}")
async def delete(request: Request, project_id: str):
    email = _signed_in_email(request)
    if not project_store.delete_project(email, _check_id(project_id)):
        raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다.")
    return {"deleted": project_id}


@router.post("/{project_id}/files")
async def upload_file(request: Request, project_id: str, file: UploadFile = File(...)):
    """파일의 글을 뽑아 프로젝트 자료로 저장한다. PDF, Word, 엑셀, 텍스트를 받는다."""
    import asyncio

    from src.api.chat_tools_routes import _extract

    email = _signed_in_email(request)
    pid = _check_id(project_id)
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="빈 파일입니다.")
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="파일은 15MB까지 올릴 수 있습니다.")
    name = file.filename or "file"
    extracted = await asyncio.to_thread(_extract, name, data)
    try:
        entry = project_store.add_file(email, pid, name, extracted["text"])
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))
    if entry is None:
        raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다.")
    return {"file": entry, "truncated": extracted.get("truncated", False)}


@router.delete("/{project_id}/files/{file_id}")
async def delete_file(request: Request, project_id: str, file_id: str):
    email = _signed_in_email(request)
    if not project_store.remove_file(email, _check_id(project_id), _check_id(file_id)):
        raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다.")
    return {"deleted": file_id}
