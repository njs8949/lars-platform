"""
예약 실행: 정해진 간격마다 코드 에이전트를 돌리고, 결과(제안)를 파일로 남긴다.
예약 실행은 원본을 절대 수정하지 않는다. 제안은 사람이 검토한 뒤 적용한다.
실행 주기는 cron 등 외부 스케줄러가 `forge code schedule run`을 호출해 만든다.
"""

import json
import uuid
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Optional

from src.core.code_agent import CodeAgent, LLMClient, Workspace, create_sandbox, remove_sandbox, render_edit_blocks

SCHEDULE_FILE = ".lars/schedules.json"
PROPOSAL_DIR = ".lars/proposals"


@dataclass
class ScheduledTask:
    id: str
    goal: str
    every_minutes: int
    created_at: str
    last_run_at: Optional[str] = None


def _store(workdir: Path) -> Path:
    return workdir / SCHEDULE_FILE


def load_tasks(workdir: Path) -> List[ScheduledTask]:
    path = _store(workdir)
    if not path.exists():
        return []
    return [ScheduledTask(**item) for item in json.loads(path.read_text(encoding="utf-8"))]


def save_tasks(workdir: Path, tasks: List[ScheduledTask]) -> None:
    path = _store(workdir)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps([asdict(t) for t in tasks], ensure_ascii=False, indent=2), encoding="utf-8")


def add_task(workdir: Path, goal: str, every_minutes: int) -> ScheduledTask:
    if every_minutes < 5:
        raise ValueError("실행 간격은 최소 5분입니다.")
    task = ScheduledTask(
        id=uuid.uuid4().hex[:8],
        goal=goal,
        every_minutes=every_minutes,
        created_at=datetime.now().isoformat(timespec="seconds"),
    )
    tasks = load_tasks(workdir) + [task]
    save_tasks(workdir, tasks)
    return task


def remove_task(workdir: Path, task_id: str) -> bool:
    tasks = load_tasks(workdir)
    remaining = [t for t in tasks if t.id != task_id]
    if len(remaining) == len(tasks):
        return False
    save_tasks(workdir, remaining)
    return True


def is_due(task: ScheduledTask, now: datetime) -> bool:
    if task.last_run_at is None:
        return True
    last = datetime.fromisoformat(task.last_run_at)
    return now - last >= timedelta(minutes=task.every_minutes)


def run_due(workdir: Path, llm: LLMClient, now: Optional[datetime] = None, force: bool = False) -> List[Path]:
    """기한이 된 작업을 샌드박스에서 실행하고 제안 파일 경로를 반환한다."""
    now = now or datetime.now()
    tasks = load_tasks(workdir)
    written: List[Path] = []
    workspace = Workspace(workdir)

    for task in tasks:
        if not force and not is_due(task, now):
            continue
        sandbox = create_sandbox(workspace.root)
        try:
            result = CodeAgent(workspace, llm, sandbox=sandbox).run(task.goal)
        finally:
            remove_sandbox(sandbox)

        out_dir = workdir / PROPOSAL_DIR
        out_dir.mkdir(parents=True, exist_ok=True)
        out = out_dir / f"{task.id}-{now.strftime('%Y%m%d_%H%M%S')}.md"
        body = [
            f"# 예약 작업 {task.id}",
            f"- 목표: {task.goal}",
            f"- 실행 시각: {now.isoformat(timespec='seconds')}",
            f"- 상태: 검토 대기 (원본 미적용)",
            "",
            "## 요약",
            result.summary or result.error or "(요약 없음)",
            "",
            "## 수정 제안",
            render_edit_blocks(result.proposals) if result.proposals else "(수정 제안 없음)",
        ]
        out.write_text("\n".join(body), encoding="utf-8")
        written.append(out)
        task.last_run_at = now.isoformat(timespec="seconds")

    save_tasks(workdir, tasks)
    return written
