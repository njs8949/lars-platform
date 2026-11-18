"""
병렬 서브 에이전트 팀: 목표를 하위 작업으로 나눠 각자 복사본에서 동시에 수행하고,
제안을 모은 뒤 같은 위치를 건드리는 제안은 충돌로 표시한다.
"""

import json
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable, List, Optional, Tuple

from src.core.code_agent import (
    AgentResult,
    CodeAgent,
    EditProposal,
    LLMClient,
    Workspace,
    create_sandbox,
    remove_sandbox,
)

PLAN_PROMPT = """목표를 서로 독립적으로 수행할 수 있는 하위 작업 2~4개로 나누세요.
응답은 JSON 문자열 배열 하나만 출력하세요. 예: ["하위 작업 1", "하위 작업 2"]"""


@dataclass
class SubResult:
    task: str
    result: AgentResult


@dataclass
class TeamResult:
    subtasks: List[SubResult] = field(default_factory=list)
    conflicts: List[Tuple[int, int]] = field(default_factory=list)

    @property
    def proposals(self) -> List[EditProposal]:
        return [p for sub in self.subtasks for p in sub.result.proposals]


def plan_subtasks(goal: str, llm: LLMClient, max_tasks: int = 4) -> List[str]:
    try:
        reply = llm.complete([
            {"role": "system", "content": PLAN_PROMPT},
            {"role": "user", "content": goal},
        ])
        start, end = reply.find("["), reply.rfind("]")
        items = json.loads(reply[start : end + 1])
        tasks = [str(item).strip() for item in items if str(item).strip()]
        if tasks:
            return tasks[:max_tasks]
    except Exception:
        pass
    return [goal]


def _overlaps(a: EditProposal, b: EditProposal) -> bool:
    if a.path != b.path:
        return False
    return a.search in b.search or b.search in a.search or a.search == b.search


def find_conflicts(subtasks: List[SubResult]) -> List[Tuple[int, int]]:
    flat = [(i, p) for i, sub in enumerate(subtasks) for p in sub.result.proposals]
    conflicts = []
    for x in range(len(flat)):
        for y in range(x + 1, len(flat)):
            (ix, px), (iy, py) = flat[x], flat[y]
            if ix != iy and _overlaps(px, py):
                conflicts.append((ix, iy))
    return conflicts


def run_team(
    goal: str,
    workdir: Path,
    llm: LLMClient,
    max_parallel: int = 3,
    max_steps: int = 8,
    web_enabled: bool = True,
    on_event: Optional[Callable[[str], None]] = None,
) -> TeamResult:
    tasks = plan_subtasks(goal, llm)
    if on_event:
        on_event(f"하위 작업 {len(tasks)}개로 나눴습니다.")

    workspace = Workspace(workdir)

    def run_one(task: str) -> SubResult:
        sandbox = create_sandbox(workspace.root)
        try:
            agent = CodeAgent(workspace, llm, max_steps=max_steps, sandbox=sandbox, web_enabled=web_enabled)
            result = agent.run(task)
        finally:
            remove_sandbox(sandbox)
        if on_event:
            on_event(f"완료: {task}")
        return SubResult(task=task, result=result)

    with ThreadPoolExecutor(max_workers=max(1, max_parallel)) as pool:
        subtasks = list(pool.map(run_one, tasks))

    return TeamResult(subtasks=subtasks, conflicts=find_conflicts(subtasks))
