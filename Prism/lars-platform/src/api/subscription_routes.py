"""구독 API (/api/subscription/*). 결제 서버가 연결되어 있지 않으므로 상태를 솔직하게 알려 준다.

- plans: 빈 목록을 돌려주면 화면이 기본 요금제를 보여 준다.
- me: 결제 정보가 없으므로 무료 상태로 표시한다.
- pay: 결제를 처리하지 않고 503으로 '결제 연동 전'을 알린다.
"""

from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/subscription", tags=["subscription"])


@router.get("/plans")
async def plans():
    return {"plans": {}, "billing_connected": False}


@router.get("/me")
async def me():
    return {"subscription": {"tier": "free", "status": "not_connected"}, "billing_connected": False}


@router.post("/pay")
async def pay():
    raise HTTPException(status_code=503, detail="결제 서버가 연결되어 있지 않아 구독을 처리할 수 없습니다.")
