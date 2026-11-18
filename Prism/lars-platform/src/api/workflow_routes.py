"""워크플로 최적화 API (/api/workflow/optimize)."""

from typing import Any, Dict, List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from src.core.workflow_planner import optimize

router = APIRouter(prefix="/api/workflow", tags=["workflow"])


class StepIn(BaseModel):
    id: str
    name: str = ""
    minutes: float = 0
    depends_on: List[str] = []


class OptimizeRequest(BaseModel):
    steps: List[StepIn]


@router.post("/optimize")
async def optimize_workflow(req: OptimizeRequest):
    try:
        return {"success": True, "data": optimize([s.model_dump() for s in req.steps])}
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))
