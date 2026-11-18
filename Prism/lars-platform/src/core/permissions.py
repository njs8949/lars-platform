"""역할 기반 권한 관리 (RBAC)"""

from enum import Enum
from typing import List, Optional
from fastapi import Depends, HTTPException, status
from src.core.auth_system import decode_access_token
import logging

logger = logging.getLogger(__name__)


class Role(str, Enum):
    """사용자 역할"""
    ADMIN = "admin"           # 모든 기능
    MANAGER = "manager"       # 대부분의 기능
    USER = "user"            # 기본 기능
    VIEWER = "viewer"        # 조회만


class Permission(str, Enum):
    """권한"""
    # 프레젠테이션
    PRESENTATIONS_CREATE = "presentations:create"
    PRESENTATIONS_READ = "presentations:read"
    PRESENTATIONS_UPDATE = "presentations:update"
    PRESENTATIONS_DELETE = "presentations:delete"

    # CRM
    CRM_CREATE = "crm:create"
    CRM_READ = "crm:read"
    CRM_UPDATE = "crm:update"
    CRM_DELETE = "crm:delete"

    # 웹 스크래핑
    SCRAPING_CREATE = "scraping:create"
    SCRAPING_READ = "scraping:read"
    SCRAPING_DELETE = "scraping:delete"

    # 시스템
    SYSTEM_ADMIN = "system:admin"
    USER_MANAGE = "user:manage"


# 역할별 권한
ROLE_PERMISSIONS = {
    Role.ADMIN: [
        Permission.PRESENTATIONS_CREATE,
        Permission.PRESENTATIONS_READ,
        Permission.PRESENTATIONS_UPDATE,
        Permission.PRESENTATIONS_DELETE,
        Permission.CRM_CREATE,
        Permission.CRM_READ,
        Permission.CRM_UPDATE,
        Permission.CRM_DELETE,
        Permission.SCRAPING_CREATE,
        Permission.SCRAPING_READ,
        Permission.SCRAPING_DELETE,
        Permission.SYSTEM_ADMIN,
        Permission.USER_MANAGE,
    ],
    Role.MANAGER: [
        Permission.PRESENTATIONS_CREATE,
        Permission.PRESENTATIONS_READ,
        Permission.PRESENTATIONS_UPDATE,
        Permission.PRESENTATIONS_DELETE,
        Permission.CRM_CREATE,
        Permission.CRM_READ,
        Permission.CRM_UPDATE,
        Permission.CRM_DELETE,
        Permission.SCRAPING_CREATE,
        Permission.SCRAPING_READ,
    ],
    Role.USER: [
        Permission.PRESENTATIONS_CREATE,
        Permission.PRESENTATIONS_READ,
        Permission.PRESENTATIONS_UPDATE,
        Permission.CRM_CREATE,
        Permission.CRM_READ,
        Permission.SCRAPING_CREATE,
        Permission.SCRAPING_READ,
    ],
    Role.VIEWER: [
        Permission.PRESENTATIONS_READ,
        Permission.CRM_READ,
        Permission.SCRAPING_READ,
    ]
}


class AuthenticatedUser:
    """인증된 사용자 정보"""

    def __init__(self, user_id: str, username: str, role: Role):
        self.user_id = user_id
        self.username = username
        self.role = role

    def has_permission(self, permission: Permission) -> bool:
        """권한 확인"""
        return permission in ROLE_PERMISSIONS.get(self.role, [])

    def has_any_permission(self, permissions: List[Permission]) -> bool:
        """여러 권한 중 하나라도 있는지 확인"""
        return any(self.has_permission(p) for p in permissions)


async def get_current_user(token: Optional[str] = None) -> AuthenticatedUser:
    """현재 사용자 정보 가져오기"""
    if not token:
        # 기본 사용자 (데모 용)
        return AuthenticatedUser("demo", "demo", Role.USER)

    decoded = decode_access_token(token)
    if not decoded:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="토큰 검증 실패"
        )

    return AuthenticatedUser(
        user_id=decoded["user_id"],
        username=decoded.get("username", "unknown"),
        role=Role(decoded.get("role", "user"))
    )


def require_permission(permission: Permission):
    """권한 검증 의존성"""
    async def check_permission(user: AuthenticatedUser = Depends(get_current_user)):
        if not user.has_permission(permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="권한 없음"
            )
        return user

    return check_permission


def require_role(role: Role):
    """역할 검증 의존성"""
    async def check_role(user: AuthenticatedUser = Depends(get_current_user)):
        if user.role.value < role.value:  # 역할 레벨 비교
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="역할 권한 없음"
            )
        return user

    return check_role
