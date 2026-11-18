"""
Workspace Routes - Luminaic 협업 기능
멀티유저 실시간 협업 작업공간
"""

from fastapi import APIRouter, Depends, HTTPException, WebSocket, Query
from typing import Dict, Any, Optional, List, Set
from pydantic import BaseModel
from datetime import datetime
import logging
import uuid
import json

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/workspace", tags=["collaboration"])

# 메모리 저장소 (실제론 Redis/DB 사용)
workspaces: Dict[str, Any] = {}
active_connections: Dict[str, Set[WebSocket]] = {}

class WorkspaceRequest(BaseModel):
    name: str
    description: str
    members: List[str]
    template: Optional[str] = None
    is_public: bool = False

class WorkspaceMember(BaseModel):
    user_id: str
    role: str  # owner, editor, viewer
    joined_at: str
    last_active: str

class DocumentRequest(BaseModel):
    title: str
    content: str
    document_type: str = "text"  # text, code, analysis, design

@router.post("/create", summary="협업 작업공간 생성")
async def create_workspace(request: WorkspaceRequest):
    """새로운 협업 작업공간 생성"""
    try:
        workspace_id = str(uuid.uuid4())
        now = datetime.now().isoformat()

        workspace = {
            "id": workspace_id,
            "name": request.name,
            "description": request.description,
            "created_at": now,
            "updated_at": now,
            "members": [
                {
                    "user_id": member,
                    "role": "owner" if member == request.members[0] else "editor",
                    "joined_at": now,
                    "last_active": now
                }
                for member in request.members
            ],
            "documents": [],
            "is_public": request.is_public,
            "version": 1,
            "activity_log": []
        }

        workspaces[workspace_id] = workspace
        active_connections[workspace_id] = set()

        logger.info(f"[WORKSPACE] 작업공간 생성: {workspace_id} ({request.name})")

        return {
            "status": "created",
            "workspace": workspace,
            "join_url": f"/workspace/{workspace_id}",
            "timestamp": now
        }

    except Exception as e:
        logger.error(f"[WORKSPACE] 작업공간 생성 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{workspace_id}", summary="작업공간 조회")
async def get_workspace(workspace_id: str):
    """작업공간 정보 조회"""
    if workspace_id not in workspaces:
        raise HTTPException(status_code=404, detail="Workspace not found")

    workspace = workspaces[workspace_id]
    return {
        "workspace": workspace,
        "active_users": len(active_connections.get(workspace_id, set())),
        "timestamp": datetime.now().isoformat()
    }

@router.get("/{workspace_id}/members", summary="작업공간 멤버 목록")
async def get_workspace_members(workspace_id: str):
    """작업공간 멤버 목록"""
    if workspace_id not in workspaces:
        raise HTTPException(status_code=404, detail="Workspace not found")

    members = workspaces[workspace_id]["members"]
    return {
        "workspace_id": workspace_id,
        "members": members,
        "total": len(members),
        "timestamp": datetime.now().isoformat()
    }

@router.post("/{workspace_id}/invite", summary="멤버 초대")
async def invite_member(workspace_id: str, user_id: str, role: str = "editor"):
    """작업공간에 멤버 초대"""
    if workspace_id not in workspaces:
        raise HTTPException(status_code=404, detail="Workspace not found")

    workspace = workspaces[workspace_id]
    now = datetime.now().isoformat()

    # 이미 존재하는지 확인
    if any(m["user_id"] == user_id for m in workspace["members"]):
        raise HTTPException(status_code=400, detail="Member already exists")

    new_member = {
        "user_id": user_id,
        "role": role,
        "joined_at": now,
        "last_active": now
    }

    workspace["members"].append(new_member)
    workspace["activity_log"].append({
        "timestamp": now,
        "action": "member_invited",
        "user_id": user_id,
        "role": role
    })

    logger.info(f"[WORKSPACE] {workspace_id}에 {user_id} 초대")

    return {
        "status": "invited",
        "member": new_member,
        "timestamp": now
    }

@router.post("/{workspace_id}/documents", summary="문서 생성")
async def create_document(workspace_id: str, request: DocumentRequest):
    """작업공간에 새로운 문서 생성"""
    if workspace_id not in workspaces:
        raise HTTPException(status_code=404, detail="Workspace not found")

    workspace = workspaces[workspace_id]
    doc_id = str(uuid.uuid4())
    now = datetime.now().isoformat()

    document = {
        "id": doc_id,
        "title": request.title,
        "content": request.content,
        "type": request.document_type,
        "created_at": now,
        "updated_at": now,
        "version": 1,
        "edit_history": [
            {
                "timestamp": now,
                "action": "created",
                "user_id": "system"
            }
        ],
        "cursors": {}  # 협업 편집용 커서 위치
    }

    workspace["documents"].append({
        "id": doc_id,
        "title": request.title,
        "type": request.document_type,
        "created_at": now
    })

    logger.info(f"[WORKSPACE] {workspace_id}에 문서 생성: {doc_id}")

    return {
        "status": "created",
        "document": document,
        "timestamp": now
    }

@router.get("/{workspace_id}/documents", summary="문서 목록")
async def list_documents(workspace_id: str):
    """작업공간의 문서 목록"""
    if workspace_id not in workspaces:
        raise HTTPException(status_code=404, detail="Workspace not found")

    documents = workspaces[workspace_id]["documents"]
    return {
        "workspace_id": workspace_id,
        "documents": documents,
        "total": len(documents),
        "timestamp": datetime.now().isoformat()
    }

@router.get("/{workspace_id}/activity", summary="활동 로그")
async def get_activity_log(
    workspace_id: str,
    limit: int = Query(50, ge=1, le=1000)
):
    """작업공간의 활동 로그"""
    if workspace_id not in workspaces:
        raise HTTPException(status_code=404, detail="Workspace not found")

    activity = workspaces[workspace_id]["activity_log"][-limit:]
    return {
        "workspace_id": workspace_id,
        "activity": activity,
        "total": len(activity),
        "timestamp": datetime.now().isoformat()
    }

@router.websocket("/ws/{workspace_id}/{user_id}")
async def websocket_endpoint(websocket: WebSocket, workspace_id: str, user_id: str):
    """실시간 협업 WebSocket 연결"""
    try:
        if workspace_id not in workspaces:
            await websocket.close(code=4004, reason="Workspace not found")
            return

        await websocket.accept()

        # 연결 추가
        if workspace_id not in active_connections:
            active_connections[workspace_id] = set()
        active_connections[workspace_id].add(websocket)

        # 사용자 활동 업데이트
        workspace = workspaces[workspace_id]
        for member in workspace["members"]:
            if member["user_id"] == user_id:
                member["last_active"] = datetime.now().isoformat()

        logger.info(f"[WS] {user_id} 연결: {workspace_id}")

        # 메시지 수신 및 브로드캐스트
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)

            # 모든 연결된 사용자에게 브로드캐스트
            for connection in active_connections[workspace_id]:
                try:
                    await connection.send_json({
                        "type": message.get("type", "update"),
                        "user_id": user_id,
                        "timestamp": datetime.now().isoformat(),
                        "data": message.get("data", {})
                    })
                except Exception as e:
                    logger.error(f"[WS] 메시지 전송 실패: {e}")

            # 활동 로그 기록
            workspace["activity_log"].append({
                "timestamp": datetime.now().isoformat(),
                "action": message.get("type", "update"),
                "user_id": user_id
            })

    except Exception as e:
        logger.error(f"[WS] WebSocket 오류: {e}")
    finally:
        if workspace_id in active_connections:
            active_connections[workspace_id].discard(websocket)
        logger.info(f"[WS] {user_id} 연결 해제: {workspace_id}")

@router.post("/{workspace_id}/share", summary="작업공간 공유")
async def share_workspace(
    workspace_id: str,
    shared_with: List[str],
    permission: str = "viewer"
):
    """작업공간 공유 링크 생성"""
    if workspace_id not in workspaces:
        raise HTTPException(status_code=404, detail="Workspace not found")

    workspace = workspaces[workspace_id]
    share_token = str(uuid.uuid4())

    return {
        "status": "shared",
        "workspace_id": workspace_id,
        "shared_with": shared_with,
        "permission": permission,
        "share_link": f"/workspace/{workspace_id}?token={share_token}",
        "expires_at": None,  # 무제한
        "timestamp": datetime.now().isoformat()
    }

@router.get("/{workspace_id}/versions", summary="버전 관리")
async def get_document_versions(
    workspace_id: str,
    document_id: str
):
    """문서의 버전 히스토리"""
    if workspace_id not in workspaces:
        raise HTTPException(status_code=404, detail="Workspace not found")

    return {
        "workspace_id": workspace_id,
        "document_id": document_id,
        "versions": [
            {
                "version": 1,
                "created_at": datetime.now().isoformat(),
                "user_id": "user1",
                "changes": "Initial version"
            }
        ],
        "timestamp": datetime.now().isoformat()
    }

def setup_workspace_routes(app):
    """FastAPI 앱에 작업공간 라우터 등록"""
    app.include_router(router)
    logger.info("✓ 협업 작업공간 라우터 등록")
