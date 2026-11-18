"""오케스트레이션 API (/api/orchestration/*). 실제 데이터: Pilot 에이전트와 브라우저 작업.

- 상태(status): Pilot 에이전트와 브라우저 작업의 실제 상태를 센다.
- 대기 결정(decisions): 사용자 답변이 필요한 Pilot 질문과 브라우저 승인 요청.
- 결정 제출(submit): 답변, 승인, 거절을 해당 작업에 그대로 전달한다.
"""

from datetime import datetime
from typing import Any, Dict, List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from src.core import agents as agent_engine
from src.core import browser_agent

router = APIRouter(prefix="/api/orchestration", tags=["orchestration"])


class DecisionSubmit(BaseModel):
    choice: str


def _agent_states() -> Dict[str, Any]:
    states: Dict[str, Any] = {}
    for agent in agent_engine.list_all():
        done = sum(1 for c in agent.get("checklist", []) if c.get("status") == "done")
        failed = 1 if agent.get("status") == "failed" else 0
        current = next((c.get("text") for c in agent.get("checklist", []) if c.get("status") != "done"), None)
        states[f"pilot:{agent['id']}"] = {
            "agent_id": f"pilot:{agent['id']}", "role": "Pilot", "current_task_id": current,
            "completed_tasks": done, "failed_tasks": failed, "last_update": agent.get("updated", ""),
            "memory": {"goal": agent.get("goal", ""), "status": agent.get("status", "")},
        }
    for task in browser_agent.list_all():
        states[f"browser:{task['id']}"] = {
            "agent_id": f"browser:{task['id']}", "role": "Browser", "current_task_id": task.get("goal", "")[:60] or None,
            "completed_tasks": 1 if task.get("status") == "done" else 0,
            "failed_tasks": 1 if task.get("status") in ("failed", "stopped") else 0,
            "last_update": task.get("updated", ""), "memory": {"status": task.get("status", "")},
        }
    return states


def _pending_decisions() -> List[Dict[str, Any]]:
    items: List[Dict[str, Any]] = []
    for agent in agent_engine.list_all():
        if agent.get("status") == "waiting_user" and agent.get("question"):
            items.append({
                "decision_id": f"pilot:{agent['id']}", "decision_type": "pilot_question",
                "title": f"Pilot: {agent.get('goal', '')[:60]}", "description": agent["question"],
                "options": ["계속 진행해 주세요", "일시 정지"], "timeout_at": None,
            })
    for task in browser_agent.list_all():
        if task.get("status") == "waiting_approval" and task.get("pending"):
            pending = task["pending"]
            items.append({
                "decision_id": f"browser:{task['id']}", "decision_type": "browser_approval",
                "title": "브라우저 조작 승인", "description": f"{pending.get('reason', '')} 대상: {pending.get('label', '')}",
                "options": ["승인", "거절"], "timeout_at": None,
            })
        elif task.get("status") == "waiting_user" and task.get("question"):
            items.append({
                "decision_id": f"browser:{task['id']}", "decision_type": "browser_question",
                "title": "브라우저 조작 질문", "description": task["question"],
                "options": ["계속 진행해 주세요", "중지"], "timeout_at": None,
            })
    return items


@router.get("/status")
async def status():
    states = _agent_states()
    agents = agent_engine.list_all()
    tasks = browser_agent.list_all()
    pending = _pending_decisions()
    running = sum(1 for a in agents if a.get("status") in ("running", "planning")) + \
        sum(1 for t in tasks if t.get("status") in ("running", "starting", "waiting_user", "waiting_approval", "paused"))
    done = sum(1 for a in agents if a.get("status") == "done") + sum(1 for t in tasks if t.get("status") == "done")
    failed = sum(1 for a in agents if a.get("status") == "failed") + sum(1 for t in tasks if t.get("status") in ("failed", "stopped"))
    return {
        "orchestration": {
            "pending_tasks": sum(1 for a in agents if a.get("status") == "paused"),
            "in_progress_tasks": running,
            "completed_tasks": done,
            "failed_tasks": failed,
            "agent_states": states,
            "auto_recovery_enabled": False,
        },
        "system_health": {
            "total_metrics": len(states),
            "total_alerts": len(pending),
            "critical_alerts": failed,
        },
        "queue": {"size": len(pending), "tasks": [d["decision_id"] for d in pending]},
        "pending_decisions": len(pending),
        "generated_at": datetime.now().isoformat(timespec="seconds"),
    }


@router.get("/decisions/pending")
async def pending_decisions():
    return {"decisions": _pending_decisions()}


@router.post("/decisions/{decision_id}/submit")
async def submit_decision(decision_id: str, body: DecisionSubmit):
    kind, _, item_id = decision_id.partition(":")
    choice = body.choice.strip()
    try:
        if kind == "pilot":
            if choice == "일시 정지":
                agent_engine.set_status(item_id, "paused")
            else:
                agent_engine.answer(item_id, choice)
        elif kind == "browser":
            if choice in ("승인", "거절"):
                browser_agent.approve(item_id, choice == "승인")
            elif choice == "중지":
                browser_agent.set_status(item_id, "stopped")
            else:
                browser_agent.answer(item_id, choice)
        else:
            raise HTTPException(status_code=404, detail="결정을 찾을 수 없습니다.")
    except KeyError:
        raise HTTPException(status_code=404, detail="결정을 찾을 수 없습니다.")
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))
    return {"success": True, "decision_id": decision_id, "choice": choice}
