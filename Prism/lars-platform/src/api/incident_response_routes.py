"""
Datadog Incident Response API Routes
인시던트 관리, 에스컬레이션, 온콜 스케줄 등
"""

from fastapi import APIRouter, HTTPException, Query, Body
from pydantic import BaseModel, Field
from datetime import datetime, timedelta
from typing import Optional, List
import httpx
import os

router = APIRouter(prefix="/api/incident-response", tags=["Incident Response"])

# Datadog API 설정
DD_API_KEY = os.getenv("DD_API_KEY", "")
DD_APP_KEY = os.getenv("DD_APP_KEY", "default-app-key")
DD_SITE = os.getenv("DD_SITE", "datadoghq.com")
BASE_URL = f"https://api.{DD_SITE}"

def get_headers():
    """안전한 헤더 생성"""
    headers = {
        "Content-Type": "application/json"
    }
    if DD_API_KEY:
        headers["DD-API-KEY"] = DD_API_KEY
    if DD_APP_KEY:
        headers["DD-APPLICATION-KEY"] = DD_APP_KEY
    return headers

HEADERS = get_headers()


# ============================================================================
# Models
# ============================================================================

class IncidentCreate(BaseModel):
    """인시던트 생성 모델"""
    title: str = Field(..., description="인시던트 제목")
    description: str = Field(..., description="인시던트 설명")
    severity: str = Field(default="medium", description="심각도: critical, high, medium, low")
    services: Optional[List[str]] = Field(default=[], description="영향받는 서비스")
    tags: Optional[List[str]] = Field(default=[], description="태그")
    commander_handle: Optional[str] = Field(None, description="인시던트 담당자")
    customer_impact: bool = Field(default=True, description="고객 영향 여부")


class IncidentUpdate(BaseModel):
    """인시던트 업데이트 모델"""
    title: Optional[str] = None
    description: Optional[str] = None
    severity: Optional[str] = None
    status: Optional[str] = None
    commander_handle: Optional[str] = None


class EscalationPolicy(BaseModel):
    """에스컬레이션 정책 모델"""
    name: str = Field(..., description="정책 이름")
    description: Optional[str] = None
    repeat_interval_minutes: int = Field(default=15, description="반복 간격(분)")


class OnCallSchedule(BaseModel):
    """온콜 스케줄 모델"""
    name: str = Field(..., description="스케줄 이름")
    timezone: str = Field(default="Asia/Seoul", description="시간대")
    members: List[str] = Field(..., description="온콜 멤버 이메일")


class IncidentResponse(BaseModel):
    """인시던트 응답 모델"""
    id: str
    title: str
    severity: str
    status: str
    created_at: datetime
    updated_at: datetime
    commander_handle: Optional[str] = None
    services: List[str] = []


# ============================================================================
# API Endpoints
# ============================================================================

@router.post("/incidents", response_model=dict, summary="인시던트 생성")
async def create_incident(incident: IncidentCreate):
    """
    새로운 인시던트 생성

    - **title**: 인시던트 제목
    - **severity**: critical, high, medium, low
    - **customer_impact**: 고객 영향 여부
    """
    try:
        endpoint = f"{BASE_URL}/api/v2/incidents"

        payload = {
            "title": incident.title,
            "description": incident.description,
            "severity": incident.severity.upper(),
            "fields": {
                "customer_impact": incident.customer_impact,
                "services": incident.services,
                "tags": incident.tags
            },
            "commander": {
                "handle": incident.commander_handle
            } if incident.commander_handle else None
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                endpoint,
                headers=HEADERS,
                json=payload
            )

            if response.status_code in [200, 201]:
                return {
                    "success": True,
                    "message": f"인시던트 생성됨: {incident.title}",
                    "data": response.json()
                }
            else:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"인시던트 생성 실패: {response.text}"
                )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/incidents", response_model=dict, summary="인시던트 목록 조회")
async def list_incidents(
    status: Optional[str] = Query(None, description="상태 필터: active, resolved, all"),
    severity: Optional[str] = Query(None, description="심각도 필터"),
    limit: int = Query(50, ge=1, le=100)
):
    """
    인시던트 목록 조회

    - **status**: active, resolved, all
    - **severity**: critical, high, medium, low
    """
    try:
        endpoint = f"{BASE_URL}/api/v2/incidents"

        params = {
            "limit": limit
        }

        if status and status != "all":
            params["filter"] = f"status:{status}"

        if severity:
            params["filter"] = f"{params.get('filter', '')} severity:{severity}".strip()

        async with httpx.AsyncClient() as client:
            response = await client.get(
                endpoint,
                headers=HEADERS,
                params=params
            )

            if response.status_code == 200:
                data = response.json()
                return {
                    "success": True,
                    "count": len(data.get("data", [])),
                    "incidents": data.get("data", [])
                }
            else:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"목록 조회 실패: {response.text}"
                )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/incidents/{incident_id}", response_model=dict, summary="인시던트 상세 조회")
async def get_incident(incident_id: str):
    """인시던트 상세 정보 조회"""
    try:
        endpoint = f"{BASE_URL}/api/v2/incidents/{incident_id}"

        async with httpx.AsyncClient() as client:
            response = await client.get(
                endpoint,
                headers=HEADERS
            )

            if response.status_code == 200:
                return {
                    "success": True,
                    "incident": response.json()
                }
            else:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"조회 실패: {response.text}"
                )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/incidents/{incident_id}", response_model=dict, summary="인시던트 업데이트")
async def update_incident(
    incident_id: str,
    incident: IncidentUpdate = Body(...)
):
    """인시던트 정보 업데이트"""
    try:
        endpoint = f"{BASE_URL}/api/v2/incidents/{incident_id}"

        payload = {}

        if incident.title:
            payload["title"] = incident.title
        if incident.description:
            payload["description"] = incident.description
        if incident.severity:
            payload["severity"] = incident.severity.upper()
        if incident.status:
            payload["state"] = incident.status
        if incident.commander_handle:
            payload["commander"] = {"handle": incident.commander_handle}

        async with httpx.AsyncClient() as client:
            response = await client.patch(
                endpoint,
                headers=HEADERS,
                json=payload
            )

            if response.status_code == 200:
                return {
                    "success": True,
                    "message": "인시던트 업데이트됨",
                    "incident": response.json()
                }
            else:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"업데이트 실패: {response.text}"
                )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/incidents/{incident_id}/resolve", response_model=dict, summary="인시던트 해제")
async def resolve_incident(incident_id: str):
    """인시던트 상태를 'resolved'로 변경"""
    try:
        endpoint = f"{BASE_URL}/api/v2/incidents/{incident_id}"

        payload = {"state": "resolved"}

        async with httpx.AsyncClient() as client:
            response = await client.patch(
                endpoint,
                headers=HEADERS,
                json=payload
            )

            if response.status_code == 200:
                return {
                    "success": True,
                    "message": "인시던트 해제됨",
                    "incident": response.json()
                }
            else:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"해제 실패: {response.text}"
                )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/escalation-policies", response_model=dict, summary="에스컬레이션 정책 목록")
async def list_escalation_policies():
    """모든 에스컬레이션 정책 조회"""
    try:
        endpoint = f"{BASE_URL}/api/v2/teams/escalation_policies"

        async with httpx.AsyncClient() as client:
            response = await client.get(
                endpoint,
                headers=HEADERS
            )

            if response.status_code == 200:
                return {
                    "success": True,
                    "policies": response.json().get("data", [])
                }
            else:
                return {
                    "success": False,
                    "message": "에스컬레이션 정책이 아직 설정되지 않았습니다.",
                    "policies": []
                }

    except Exception as e:
        return {
            "success": False,
            "message": str(e),
            "policies": []
        }


@router.get("/on-call-schedules", response_model=dict, summary="온콜 스케줄 목록")
async def list_on_call_schedules():
    """모든 온콜 스케줄 조회"""
    try:
        endpoint = f"{BASE_URL}/api/v2/teams/schedules"

        async with httpx.AsyncClient() as client:
            response = await client.get(
                endpoint,
                headers=HEADERS
            )

            if response.status_code == 200:
                return {
                    "success": True,
                    "schedules": response.json().get("data", [])
                }
            else:
                return {
                    "success": False,
                    "message": "온콜 스케줄이 아직 설정되지 않았습니다.",
                    "schedules": []
                }

    except Exception as e:
        return {
            "success": False,
            "message": str(e),
            "schedules": []
        }


@router.get("/on-call/current", response_model=dict, summary="현재 온콜자 조회")
async def get_current_on_call():
    """현재 온콜 중인 사람 조회"""
    try:
        endpoint = f"{BASE_URL}/api/v2/teams/schedules/oncalls"

        async with httpx.AsyncClient() as client:
            response = await client.get(
                endpoint,
                headers=HEADERS
            )

            if response.status_code == 200:
                data = response.json()
                on_calls = data.get("data", [])

                return {
                    "success": True,
                    "current_on_call": on_calls[0] if on_calls else None,
                    "total": len(on_calls)
                }
            else:
                return {
                    "success": False,
                    "message": "온콜 정보 조회 실패",
                    "current_on_call": None
                }

    except Exception as e:
        return {
            "success": False,
            "message": str(e),
            "current_on_call": None
        }


@router.get("/incidents/{incident_id}/timeline", response_model=dict, summary="인시던트 타임라인")
async def get_incident_timeline(incident_id: str):
    """인시던트 타임라인 (이벤트 히스토리) 조회"""
    try:
        endpoint = f"{BASE_URL}/api/v2/incidents/{incident_id}/timeline_events"

        async with httpx.AsyncClient() as client:
            response = await client.get(
                endpoint,
                headers=HEADERS
            )

            if response.status_code == 200:
                return {
                    "success": True,
                    "timeline": response.json().get("data", [])
                }
            else:
                return {
                    "success": False,
                    "message": "타임라인 조회 실패",
                    "timeline": []
                }

    except Exception as e:
        return {
            "success": False,
            "message": str(e),
            "timeline": []
        }


@router.post("/incidents/{incident_id}/timeline/add", response_model=dict, summary="타임라인 이벤트 추가")
async def add_timeline_event(
    incident_id: str,
    title: str = Body(..., description="이벤트 제목"),
    description: Optional[str] = Body(None, description="이벤트 설명"),
    event_type: str = Body(default="user_event", description="이벤트 타입")
):
    """인시던트 타임라인에 이벤트 추가"""
    try:
        endpoint = f"{BASE_URL}/api/v2/incidents/{incident_id}/timeline_events"

        payload = {
            "title": title,
            "event_type": event_type,
            "description": description
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                endpoint,
                headers=HEADERS,
                json=payload
            )

            if response.status_code in [200, 201]:
                return {
                    "success": True,
                    "message": "타임라인 이벤트 추가됨",
                    "event": response.json()
                }
            else:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"이벤트 추가 실패: {response.text}"
                )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/incidents/stats/summary", response_model=dict, summary="인시던트 통계")
async def get_incident_stats():
    """인시던트 통계 요약"""
    try:
        async with httpx.AsyncClient() as client:
            # Active 인시던트
            active_response = await client.get(
                f"{BASE_URL}/api/v2/incidents",
                headers=HEADERS,
                params={"filter": "status:active", "limit": 1}
            )

            # Resolved 인시던트
            resolved_response = await client.get(
                f"{BASE_URL}/api/v2/incidents",
                headers=HEADERS,
                params={"filter": "status:resolved", "limit": 1}
            )

            active_count = len(active_response.json().get("data", [])) if active_response.status_code == 200 else 0
            resolved_count = len(resolved_response.json().get("data", [])) if resolved_response.status_code == 200 else 0

            return {
                "success": True,
                "stats": {
                    "active": active_count,
                    "resolved": resolved_count,
                    "total": active_count + resolved_count,
                    "timestamp": datetime.utcnow().isoformat()
                }
            }

    except Exception as e:
        return {
            "success": False,
            "message": str(e),
            "stats": {}
        }
