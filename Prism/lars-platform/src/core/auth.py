"""
Authentication & Authorization for Prism
API key validation, rate limiting, audit logging
"""

import os
import secrets
from typing import Dict, Optional
from datetime import datetime, timedelta
from functools import wraps
import logging

from fastapi import HTTPException, Request, Depends, Header
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


class PrismAuth:
    """Authentication system for Prism API"""

    def __init__(self, database=None):
        self.database = database
        self.master_key = os.getenv("PRISM_MASTER_KEY", "prism-dev-key-change-in-prod")

    def generate_api_key(self, client_name: str, permissions: list = None) -> str:
        """Generate a new API key"""
        if permissions is None:
            permissions = ["read", "write"]

        # Format: prism_<random_32_chars>
        random_part = secrets.token_urlsafe(32)
        api_key = f"prism_{random_part}"

        # Store in database
        if self.database:
            self.database.create_api_key(api_key, client_name, permissions)
            logger.info(f"✓ Generated API key for {client_name}")
        else:
            logger.warning("Database not configured, API key not persisted")

        return api_key

    def validate_api_key(
        self, api_key: str, required_permission: str = "read"
    ) -> tuple[bool, Optional[Dict]]:
        """
        Validate an API key

        Returns: (is_valid, key_info)
        """
        if not api_key:
            return False, None

        # Allow master key for development
        if api_key == self.master_key:
            return True, {"client_name": "master", "permissions": ["read", "write"]}

        # Check database
        if self.database:
            is_valid = self.database.validate_api_key(api_key, required_permission)
            if is_valid:
                return True, {"client_name": "api_user", "permissions": [required_permission]}

        return False, None

    def extract_api_key(self, authorization: Optional[str] = None) -> Optional[str]:
        """Extract API key from Authorization header"""
        if not authorization:
            return None

        # Format: "Bearer <api_key>" or "ApiKey <api_key>"
        parts = authorization.split()

        if len(parts) == 2:
            scheme, credentials = parts
            if scheme.lower() in ["bearer", "apikey"]:
                return credentials

        # Also support direct key
        if authorization.startswith("prism_"):
            return authorization

        return None


# Global auth instance
prism_auth = PrismAuth()


# --- FastAPI Dependency ---

async def verify_api_key(
    authorization: Optional[str] = Header(None),
) -> Dict:
    """
    FastAPI dependency for API key validation

    Usage:
        @app.get("/protected")
        async def protected_route(key_info: Dict = Depends(verify_api_key)):
            ...
    """
    api_key = prism_auth.extract_api_key(authorization)

    if not api_key:
        raise HTTPException(
            status_code=401,
            detail="Missing API key. Use header: Authorization: Bearer <api_key>",
        )

    is_valid, key_info = prism_auth.validate_api_key(api_key, "read")

    if not is_valid:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired API key",
        )

    return key_info


async def verify_write_permission(
    authorization: Optional[str] = Header(None),
) -> Dict:
    """
    FastAPI dependency for write permission

    Usage:
        @app.post("/protected")
        async def protected_route(key_info: Dict = Depends(verify_write_permission)):
            ...
    """
    api_key = prism_auth.extract_api_key(authorization)

    if not api_key:
        raise HTTPException(
            status_code=401,
            detail="Missing API key. Use header: Authorization: Bearer <api_key>",
        )

    is_valid, key_info = prism_auth.validate_api_key(api_key, "write")

    if not is_valid:
        raise HTTPException(
            status_code=403,
            detail="Insufficient permissions for this operation",
        )

    return key_info


# --- Middleware for Audit Logging ---

class AuditLogger:
    """Audit logging for all API calls"""

    def __init__(self, database=None):
        self.database = database

    async def log_request(
        self,
        method: str,
        path: str,
        api_key: Optional[str] = None,
        status_code: int = 200,
        duration_ms: float = 0.0,
    ):
        """Log API request"""
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "method": method,
            "path": path,
            "api_key": api_key[:8] + "***" if api_key else "none",
            "status_code": status_code,
            "duration_ms": duration_ms,
        }

        logger.info(f"API_AUDIT: {log_entry}")

        # Could store in database for long-term audit trail
        # if self.database:
        #     self.database.store_audit_log(log_entry)


audit_logger = AuditLogger()


# --- Rate Limiting ---

class RateLimiter:
    """Simple in-memory rate limiter"""

    def __init__(self, requests_per_minute: int = 60):
        self.requests_per_minute = requests_per_minute
        self.requests: Dict[str, list] = {}  # api_key: [timestamps]

    def is_allowed(self, api_key: str) -> bool:
        """Check if request is allowed"""
        now = datetime.utcnow()
        cutoff = now - timedelta(minutes=1)

        if api_key not in self.requests:
            self.requests[api_key] = []

        # Clean old requests
        self.requests[api_key] = [
            ts for ts in self.requests[api_key] if ts > cutoff
        ]

        # Check limit
        if len(self.requests[api_key]) >= self.requests_per_minute:
            return False

        # Add current request
        self.requests[api_key].append(now)
        return True

    def get_remaining(self, api_key: str) -> int:
        """Get remaining requests in current minute"""
        if api_key not in self.requests:
            return self.requests_per_minute

        now = datetime.utcnow()
        cutoff = now - timedelta(minutes=1)
        recent = [ts for ts in self.requests[api_key] if ts > cutoff]

        return max(0, self.requests_per_minute - len(recent))


rate_limiter = RateLimiter(requests_per_minute=100)


async def check_rate_limit(
    authorization: Optional[str] = Header(None),
) -> Dict:
    """
    Check rate limit and return info

    Usage:
        @app.get("/api/...")
        async def route(rate_info: Dict = Depends(check_rate_limit)):
            ...
    """
    api_key = prism_auth.extract_api_key(authorization)

    if not api_key:
        api_key = "anonymous"

    if not rate_limiter.is_allowed(api_key):
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded: 100 requests per minute",
            headers={
                "Retry-After": "60",
                "X-RateLimit-Limit": "100",
                "X-RateLimit-Remaining": "0",
            },
        )

    return {
        "api_key": api_key,
        "remaining": rate_limiter.get_remaining(api_key),
    }


# --- Health Check (Public) ---

def is_public_endpoint(path: str) -> bool:
    """Check if endpoint is public (no auth required)"""
    public_paths = [
        "/health",
        "/api/auth/health",
        "/api/auth/signup",
        "/api/auth/login",
        "/api/subscription/plans",
        "/api/amazon-q/health",
        "/api/analysis/health",
        "/docs",
        "/redoc",
        "/openapi.json",
    ]

    return any(path.startswith(p) for p in public_paths)
