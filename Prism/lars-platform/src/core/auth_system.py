"""JWT 기반 사용자 인증 시스템"""

from datetime import datetime, timedelta
from typing import Optional
import jwt
import logging
from passlib.context import CryptContext

logger = logging.getLogger(__name__)

# 비밀 키 (환경변수에서 가져올 것)
SECRET_KEY = "lars-secret-key-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# 비밀번호 암호화
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """비밀번호 해싱"""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """비밀번호 검증"""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """액세스 토큰 생성"""
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})

    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict]:
    """액세스 토큰 검증 및 디코드"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
        return {"user_id": user_id}
    except jwt.JWTError:
        return None


class User:
    """사용자 모델"""

    def __init__(self, user_id: str, username: str, email: str, password_hash: str = None):
        self.user_id = user_id
        self.username = username
        self.email = email
        self.password_hash = password_hash
        self.created_at = datetime.utcnow()
        self.is_active = True
        self.role = "user"  # user, admin

    def to_dict(self):
        return {
            "user_id": self.user_id,
            "username": self.username,
            "email": self.email,
            "role": self.role,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat()
        }


# 임시 사용자 저장소 (실제로는 DB 사용)
users_db = {
    "demo": User("demo", "demo", "demo@lars.com", hash_password("demo123"))
}


def authenticate_user(username: str, password: str) -> Optional[User]:
    """사용자 인증"""
    user = users_db.get(username)
    if not user or not verify_password(password, user.password_hash):
        return None
    return user
