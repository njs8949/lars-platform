"""자율 에이전트 (목표 기반): 목표 → 체크리스트 → 항목별 실행 → 검증 → 보고.

안전 규칙
- 외부에 쓰거나 보내는 작업은 없다. 허용되는 도구는 웹 페이지 읽기(GET, 공개 주소만), 질문하기, 기록하기뿐이다.
- 모르는 것은 추측하지 않고 사용자에게 질문하며, 답을 받을 때까지 멈춘다.
- 단계 수에 상한이 있고, 실패하면 멈춘다.
"""

import json
import re
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

AGENTS_DIR = Path(".lars") / "agents"
MAX_STEPS = 30
OLLAMA = "http://localhost:11434/api/chat"
MODEL = "gemma4:31b"
_LOCK = threading.Lock()  # 루프 실행, 답변, 정지가 같은 파일을 동시에 쓰지 않도록 한다


def _path(agent_id: str) -> Path:
    if not re.fullmatch(r"[0-9a-f]{10}", agent_id):
        raise KeyError("Not Found")
    return AGENTS_DIR / f"{agent_id}.json"


def load(agent_id: str) -> dict:
    p = _path(agent_id)
    if not p.exists():
        raise KeyError("Not Found")
    return json.loads(p.read_text(encoding="utf-8"))


def save(agent: dict) -> None:
    AGENTS_DIR.mkdir(parents=True, exist_ok=True)
    agent["updated"] = datetime.now().isoformat(timespec="seconds")
    _path(agent["id"]).write_text(json.dumps(agent, ensure_ascii=False, indent=2), encoding="utf-8")


def list_all() -> List[dict]:
    if not AGENTS_DIR.exists():
        return []
    items = []
    for p in AGENTS_DIR.glob("*.json"):
        try:
            items.append(json.loads(p.read_text(encoding="utf-8")))
        except ValueError:
            continue
    return sorted(items, key=lambda a: a.get("created", ""), reverse=True)


def _log(agent: dict, text: str) -> None:
    agent.setdefault("log", []).append({"at": datetime.now(timezone.utc).isoformat(timespec="seconds"), "text": text[:600]})
    agent["log"] = agent["log"][-200:]


def create(goal: str) -> dict:
    import secrets
    agent = {"id": secrets.token_hex(5), "goal": goal.strip()[:1000], "status": "planning", "checklist": [],
             "question": None, "answers": [], "report": "", "steps": 0, "log": [],
             "created": datetime.now().isoformat(timespec="seconds")}
    _log(agent, "목표를 받았습니다. 체크리스트를 만듭니다.")
    save(agent)
    return agent


def _ask_json(system: str, user: str, max_tokens: int = 900) -> Optional[dict]:
    import requests
    from src.core.llm_provider import is_production, bedrock_complete
    if is_production():
        import json as _json
        text = bedrock_complete([{"role": "system", "content": system}, {"role": "user", "content": user}], max_tokens)[0]
        start, end = text.find("{"), text.rfind("}")
        try:
            return _json.loads(text[start:end + 1]) if start != -1 and end > start else None
        except ValueError:
            return None
    response = requests.post(OLLAMA, timeout=600, json={
        "model": MODEL, "think": False, "stream": False,
        "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
        "options": {"temperature": 0.2, "num_predict": max_tokens}})
    response.raise_for_status()
    body = response.json()
    from src.core import usage_ledger
    usage_ledger.record("ollama", MODEL, "agent", body.get("prompt_eval_count") or 0, body.get("eval_count") or 0)
    text = (body.get("message", {}).get("content") or "").strip()
    s, e = text.find("{"), text.rfind("}")
    if s < 0 or e < 0:
        return None
    try:
        return json.loads(text[s:e + 1])
    except ValueError:
        return None


def _ask_text(system: str, user: str, max_tokens: int = 1600) -> str:
    """JSON이 아니라 글 그대로 받는다. 형식 오류로 결과가 비었을 때 쓴다."""
    from src.core.llm_provider import is_production, bedrock_complete
    if is_production():
        return bedrock_complete([{"role": "system", "content": system}, {"role": "user", "content": user}], max_tokens)[0].strip()
    import requests
    response = requests.post(OLLAMA, timeout=600, json={
        "model": MODEL, "think": False, "stream": False,
        "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
        "options": {"temperature": 0.3, "num_predict": max_tokens}})
    response.raise_for_status()
    return (response.json().get("message", {}).get("content") or "").strip()


def _context(agent: dict) -> str:
    done = [f"- ({i + 1}) {c['text']} → {c.get('result', '')[:400]}" for i, c in enumerate(agent["checklist"]) if c["status"] == "done"]
    answers = [f"- 사용자 답: {a}" for a in agent.get("answers", [])]
    return f"목표: {agent['goal']}\n완료한 항목:\n" + ("\n".join(done) or "(없음)") + ("\n" + "\n".join(answers) if answers else "")


def plan_checklist(agent: dict) -> None:
    data = _ask_json(
        "너는 작업 계획자다. 목표를 달성하기 위한 체크리스트를 3~7개 한국어 항목으로 만든다. "
        "각 항목은 AI가 문서, 초안, 계획, 템플릿, 코드, 요약 같은 결과물로 직접 끝낼 수 있는 구체적 작업이어야 한다. "
        "AI가 직접 할 수 없는 일(계정 연결, 실제 발송, 예약 실행 등)은 '사용자가 할 일: …' 형식으로 적고, 설정 절차를 안내하는 결과물을 만들 수 있게 쓴다. "
        "출력은 JSON 하나만: {\"items\": [\"...\", \"...\"]}",
        f"목표: {agent['goal']}")
    items = [str(x).strip() for x in (data or {}).get("items", []) if str(x).strip()][:7]
    if not items:
        agent["status"] = "failed"
        _log(agent, "체크리스트를 만들지 못했습니다.")
        return
    agent["checklist"] = [{"text": t, "status": "pending", "result": ""} for t in items]
    agent["status"] = "running"
    _log(agent, f"체크리스트 {len(items)}개를 만들었습니다.")


def _fetch(url: str) -> str:
    from src.core import web_tools
    if not re.match(r"^https?://", url.strip()):
        raise ValueError("http 또는 https 주소만 읽을 수 있습니다.")
    return web_tools.fetch_page_text(url.strip())[:4000]


def step(agent: dict) -> None:
    """에이전트 한 단계: 다음 항목을 처리하거나, 질문하거나, 검증 후 끝낸다."""
    agent["steps"] = agent.get("steps", 0) + 1
    if agent["steps"] > MAX_STEPS:
        agent["status"] = "failed"
        _log(agent, "단계 상한에 도달해 멈춥니다.")
        return
    pending = next((c for c in agent["checklist"] if c["status"] == "pending"), None)
    if pending is None:
        _verify(agent)
        return
    decision = _ask_json(
        "너는 자율 에이전트다. 현재 항목을 '직접 끝낸다'. 다음 중 하나를 JSON으로만 답한다.\n"
        "{\"action\": \"work\", \"result\": \"항목의 결과물 전체(문서, 초안, 계획, 템플릿, 절차 등 구체적 내용)\"}\n"
        "{\"action\": \"fetch\", \"url\": \"읽을 공개 웹 주소(https://...)\"}\n"
        "{\"action\": \"ask\", \"question\": \"사용자에게 물을 질문\"}\n"
        "원칙:\n"
        "- 대부분의 항목은 work로 끝낸다. 선택지가 있으면 가장 합리적인 기본값을 골라 진행하고, 결과에 가정을 한 줄로 적는다.\n"
        "- ask는 계정, 비밀번호, 결제, 실제 발송 대상처럼 AI가 정할 수 없는 정보가 꼭 필요할 때만 쓴다. 같은 질문을 반복하지 않는다.\n"
        "- 모르는 사실은 지어내지 않되, 일반적인 지식과 기본값으로 쓸 수 있는 내용은 결과물로 만든다.\n"
        "- 사용자가 직접 해야 하는 일은 결과물에 '사용자가 할 일'로 절차를 적는다.",
        f"{_context(agent)}\n\n지금 처리할 항목: {pending['text']}", max_tokens=1600)
    if not decision or not (decision.get("result") or decision.get("question") or decision.get("url")):
        # 형식이 깨졌으면 한 번 더 시도한다
        decision = _ask_json(
            "너는 자율 에이전트다. 현재 항목의 결과물을 JSON 하나로 쓴다: {\"action\": \"work\", \"result\": \"결과물 내용\"}",
            f"{_context(agent)}\n\n지금 처리할 항목: {pending['text']}", max_tokens=1600)
    if not decision or (decision.get("action") == "work" and not str(decision.get("result", "")).strip()):
        text = ""
        for _ in range(2):  # 글 형식 결과물은 JSON보다 안정적이다. 비면 한 번 더 쓴다
            text = _ask_text(
                "너는 자율 에이전트다. 다음 항목의 결과물을 한국어로 구체적으로 쓴다. 기본값으로 진행하고 가정은 한 줄로 적는다.",
                f"{_context(agent)}\n\n지금 처리할 항목: {pending['text']}")
            if text:
                break
        if text:
            decision = {"action": "work", "result": text}
    action = (decision or {}).get("action", "")
    if action == "fetch":
        try:
            page = _fetch((decision or {}).get("url", ""))
            _log(agent, f"페이지를 읽었습니다: {decision.get('url', '')}")
            result = _ask_json("너는 자율 에이전트다. 주어진 페이지 내용만 근거로 항목 결과를 JSON으로 답한다: {\"result\": \"...\"}",
                               f"항목: {pending['text']}\n페이지 내용:\n{page}")
            pending["result"] = str((result or {}).get("result", page[:300]))
            pending["status"] = "done"
        except Exception as err:
            _log(agent, f"페이지를 읽지 못했습니다: {err}")
            agent["question"] = f"'{pending['text']}' 항목을 진행하려면 다른 주소나 정보가 필요합니다. 어떻게 할까요?"
            agent["status"] = "waiting_user"
    elif action == "ask":
        agent["question"] = str((decision or {}).get("question", "진행을 위해 확인이 필요합니다. 어떻게 할까요?"))[:500]
        agent["status"] = "waiting_user"
        _log(agent, "사용자에게 질문했습니다.")
    else:
        result = str((decision or {}).get("result", "")).strip()
        if not result:
            pending["result"] = "결과를 만들지 못했습니다. 이 항목은 직접 확인이 필요합니다."
            pending["status"] = "done"
            _log(agent, f"결과를 만들지 못한 항목을 표시하고 다음으로 넘어갑니다: {pending['text']}")
            return
        pending["result"] = result
        pending["status"] = "done"
    if pending["status"] == "done":
        _log(agent, f"완료: {pending['text']}")


def _verify(agent: dict) -> None:
    summary = _context(agent)
    data = _ask_json(
        "너는 검증자다. 목표를 달성했는지 완료한 항목 결과만 근거로 판단한다. "
        "출력은 JSON 하나만: {\"ok\": true|false, \"report\": \"사용자에게 줄 최종 보고(한국어, 핵심 위주)\", \"gap\": \"부족한 점\"}",
        summary, max_tokens=1200)
    if data and data.get("ok"):
        agent["report"] = str(data.get("report", ""))
        agent["status"] = "done"
        _log(agent, "검증을 마치고 완료했습니다.")
    else:
        # 부족한 점은 보고서에 적고 끝낸다. 질문을 반복하지 않는다.
        gap = str((data or {}).get("gap", "목표 달성에 부족한 부분이 있습니다."))
        agent["report"] = (str((data or {}).get("report", "")) + f"\n\n[남은 과제] {gap}").strip()
        agent["status"] = "done"
        _log(agent, "검증 결과 남은 과제를 보고서에 적고 마칩니다.")


def answer(agent_id: str, text: str) -> dict:
    with _LOCK:
        agent = load(agent_id)
        if agent["status"] != "waiting_user":
            raise ValueError("지금은 답을 받을 상태가 아닙니다.")
        agent.setdefault("answers", []).append(text.strip()[:1000])
        agent["question"] = None
        agent["status"] = "running"
        _log(agent, f"사용자 답을 받았습니다: {text.strip()[:100]}")
        save(agent)
        return agent


def set_status(agent_id: str, status: str) -> dict:
    with _LOCK:
        agent = load(agent_id)
        if status == "paused" and agent["status"] in ("running", "waiting_user"):
            agent["status"] = "paused"
            _log(agent, "일시 정지했습니다.")
        elif status == "running" and agent["status"] == "paused":
            agent["status"] = "running"
            _log(agent, "다시 시작했습니다.")
        save(agent)
        return agent


def delete(agent_id: str) -> None:
    with _LOCK:
        p = _path(agent_id)
        if p.exists():
            p.unlink()
        else:
            raise KeyError("Not Found")


def run_pending_steps() -> int:
    """실행 중·계획 중인 에이전트를 한 단계씩 진행한다. 처리한 개수를 돌려준다."""
    count = 0
    for summary in list_all():
        with _LOCK:
            try:
                agent = load(summary["id"])
            except (KeyError, ValueError):
                continue
            if agent["status"] == "planning":
                plan_checklist(agent)
            elif agent["status"] == "running":
                step(agent)
            else:
                continue
            save(agent)
            count += 1
    return count
