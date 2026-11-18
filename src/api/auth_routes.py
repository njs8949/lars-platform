"""
Authentication Routes
API key management, user auth (signup/login/logout), health checks
"""

from fastapi import APIRouter, HTTPException, Header, Depends
from fastapi.responses import JSONResponse
from typing import Optional
import os
import jwt
from datetime import datetime, timedelta
from pydantic import BaseModel
import bcrypt

from src.core.auth import prism_auth, verify_api_key, verify_write_permission
from src.core.local_auth import LocalUserStore

# Initialize local user store
user_store = LocalUserStore()

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Configuration
JWT_SECRET = os.getenv("JWT_SECRET", "lars-dev-secret-change-in-prod")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24


# Request/Response Models
class SignupRequest(BaseModel):
    email: str
    username: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class UserResponse(BaseModel):
    email: str
    username: str
    created_at: str


def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    """Verify password against hash using bcrypt"""
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_jwt_token(email: str) -> str:
    """Create JWT token for user"""
    payload = {
        "email": email,
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verify_jwt_token(token: str) -> Optional[str]:
    """Verify JWT token and return email"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload.get("email")
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


class GenerateKeyRequest(BaseModel):
    client_name: str
    permissions: list = ["read", "write"]


@router.post("/generate-key")
async def generate_api_key(
    request: GenerateKeyRequest,
    master_key: Optional[str] = Header(None),
):
    """
    Generate a new API key (requires master key)

    Master key must be provided in header: X-Master-Key

    Returns:
    - api_key: New API key
    - client_name: Client name
    - permissions: Granted permissions
    """
    # Verify master key
    expected_master_key = os.getenv("PRISM_MASTER_KEY", "prism-dev-key-change-in-prod")

    if master_key != expected_master_key:
        raise HTTPException(
            status_code=401,
            detail="Invalid master key",
        )

    try:
        api_key = prism_auth.generate_api_key(request.client_name, request.permissions)

        return JSONResponse({
            "status": "success",
            "api_key": api_key,
            "client_name": request.client_name,
            "permissions": request.permissions,
            "message": "Keep this API key safe. You won't be able to see it again.",
        })

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/validate-key")
async def validate_key(key_info: dict = Depends(verify_api_key)):
    """
    Validate current API key

    Returns:
    - valid: Whether key is valid
    - client_name: Client name
    - permissions: Available permissions
    """
    return JSONResponse({
        "status": "valid",
        "client_name": key_info.get("client_name", "unknown"),
        "permissions": key_info.get("permissions", []),
    })


@router.get("/list-keys")
async def list_api_keys(
    master_key: Optional[str] = Header(None),
):
    """
    List all API keys (requires master key)

    Only shows masked keys for security
    """
    expected_master_key = os.getenv("PRISM_MASTER_KEY", "prism-dev-key-change-in-prod")

    if master_key != expected_master_key:
        raise HTTPException(
            status_code=401,
            detail="Invalid master key",
        )

    try:
        keys = []
        if prism_auth.database:
            keys = prism_auth.database.list_api_keys()

        return JSONResponse({
            "status": "success",
            "api_keys": keys,
        })

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- User Authentication Endpoints ---

@router.post("/signup")
async def signup(request: SignupRequest):
    """
    Register a new user

    Returns:
    - token: JWT token for authentication
    - user: User information
    """
    # Validate input
    if len(request.password) < 6:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 6 characters"
        )

    # Check if user exists
    if user_store.user_exists(request.email):
        raise HTTPException(
            status_code=409,
            detail="User with this email already exists"
        )

    # Create user
    password_hash = hash_password(request.password)
    success = user_store.create_user(
        email=request.email,
        username=request.username,
        password_hash=password_hash
    )

    if not success:
        raise HTTPException(
            status_code=500,
            detail="Failed to create user"
        )

    # Generate JWT token
    token = create_jwt_token(request.email)

    return JSONResponse({
        "status": "success",
        "token": token,
        "user": {
            "email": request.email,
            "username": request.username,
        }
    })


@router.post("/login")
async def login(request: LoginRequest):
    """
    Authenticate user and return JWT token

    Returns:
    - token: JWT token for authentication
    - user: User information
    """
    # Get user
    user = user_store.get_user_by_email(request.email)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    # Verify password
    if not verify_password(request.password, user.get("password_hash", "")):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    # Generate JWT token
    token = create_jwt_token(request.email)

    return JSONResponse({
        "status": "success",
        "token": token,
        "user": {
            "email": user.get("email"),
            "username": user.get("username"),
        }
    })


@router.post("/logout")
async def logout(authorization: Optional[str] = Header(None)):
    """
    Logout user (client should discard token)

    Note: Token is invalidated on client side by removing from storage
    """
    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Missing authorization header"
        )

    # Extract token
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=400,
            detail="Invalid authorization header format"
        )

    token = parts[1]
    email = verify_jwt_token(token)

    if not email:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )

    return JSONResponse({
        "status": "success",
        "message": "Logged out successfully"
    })


@router.get("/me")
async def get_current_user(authorization: Optional[str] = Header(None)):
    """
    Get current authenticated user info
    """
    # 개발 환경에서 인증 우회
    if os.getenv("PRISM_ENV") == "development" and not authorization:
        return JSONResponse({
            "status": "success",
            "user": {
                "email": os.environ.get("CONTACT_EMAIL", "dev@lars.local"),
                "username": "DevUser",
                "created_at": datetime.utcnow().isoformat(),
            }
        })

    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Missing authorization header"
        )

    # Extract token
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=400,
            detail="Invalid authorization header format"
        )

    token = parts[1]
    email = verify_jwt_token(token)

    if not email:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )

    user = user_store.get_user_by_email(email)
    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    return JSONResponse({
        "status": "success",
        "user": {
            "email": user.get("email"),
            "username": user.get("username"),
            "created_at": user.get("created_at"),
        }
    })


@router.post("/change-password")
async def change_password(request: ChangePasswordRequest, authorization: Optional[str] = Header(None)):
    """
    Change user password

    Requires:
    - current_password: Current password for verification
    - new_password: New password (minimum 6 characters)

    Returns:
    - status: Success/failure
    - message: Confirmation message
    """
    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Missing authorization header"
        )

    # Extract token
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=400,
            detail="Invalid authorization header format"
        )

    token = parts[1]
    email = verify_jwt_token(token)

    if not email:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )

    # Validate new password
    if len(request.new_password) < 6:
        raise HTTPException(
            status_code=400,
            detail="New password must be at least 6 characters"
        )

    # Get user
    user = user_store.get_user_by_email(email)
    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    # Verify current password
    if not verify_password(request.current_password, user.get("password_hash", "")):
        raise HTTPException(
            status_code=401,
            detail="Current password is incorrect"
        )

    # Update password
    new_hash = hash_password(request.new_password)
    success = user_store.update_user_password(email, new_hash)

    if not success:
        raise HTTPException(
            status_code=500,
            detail="Failed to update password"
        )

    return JSONResponse({
        "status": "success",
        "message": "Password changed successfully"
    })


@router.get("/health")
async def health_check():
    """
    Health check endpoint (public)

    Returns:
    - status: Service status
    - database: Database connection status
    - auth: Auth system status
    """
    db_status = "connected" if prism_auth.database else "offline"

    return JSONResponse({
        "status": "healthy",
        "service": "LARS Prism",
        "database": db_status,
        "auth": "enabled",
        "version": "1.4.0",
    })


@router.get("/info")
async def api_info(key_info: dict = Depends(verify_api_key)):
    """
    Get API information (requires valid API key)

    Returns:
    - endpoints: Available endpoints
    - authentication: Auth requirements
    - rate_limits: Rate limit info
    """
    return JSONResponse({
        "status": "success",
        "api_version": "1.0",
        "endpoints": {
            "amazon_q": "/api/amazon-q/*",
            "analysis": "/api/analysis/*",
            "auth": "/api/auth/*",
        },
        "authentication": {
            "method": "API Key",
            "header": "Authorization: Bearer <api_key>",
            "required": True,
        },
        "rate_limits": {
            "requests_per_minute": 100,
            "burst": 10,
        },
        "client_name": key_info.get("client_name", "unknown"),
        "permissions": key_info.get("permissions", []),
    })
