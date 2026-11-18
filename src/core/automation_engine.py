"""
자동화 엔진 - 데스크톱 앱의 고급 자동화 기능
원격 실행, 스케줄링, 배치 처리, 워크플로우
"""

import asyncio
import json
import logging
from typing import Dict, List, Any, Optional, Callable
from dataclasses import dataclass, field, asdict
from enum import Enum
from datetime import datetime, timedelta
from pathlib import Path
import uuid
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

logger = logging.getLogger(__name__)


class TaskStatus(Enum):
    """작업 상태"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class TriggerType(Enum):
    """트리거 타입"""
    MANUAL = "manual"           # 수동 실행
    SCHEDULE = "schedule"       # 정기 실행
    WEBHOOK = "webhook"         # 외부 이벤트
    DEPENDENCY = "dependency"   # 다른 작업 완료 시


@dataclass
class Task:
    """작업 정의"""
    id: str
    name: str
    description: str
    action: str  # 실행할 작업 유형 (chat, statistics, etc)
    params: Dict[str, Any]  # 작업 매개변수
    status: TaskStatus = TaskStatus.PENDING
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

    def to_dict(self) -> Dict:
        data = asdict(self)
        data['status'] = self.status.value
        return data


@dataclass
class Workflow:
    """워크플로우 정의"""
    id: str
    name: str
    description: str
    tasks: List[Dict[str, Any]]  # 작업 순서
    trigger: TriggerType = TriggerType.MANUAL
    schedule: Optional[str] = None  # Cron 표현식 (trigger=SCHEDULE일 때)
    enabled: bool = True
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    last_run: Optional[str] = None
    execution_count: int = 0

    def to_dict(self) -> Dict:
        data = asdict(self)
        data['trigger'] = self.trigger.value
        return data


@dataclass
class BatchJob:
    """배치 작업"""
    id: str
    name: str
    tasks: List[str]  # 작업 ID 목록
    status: TaskStatus = TaskStatus.PENDING
    total_tasks: int = 0
    completed_tasks: int = 0
    failed_tasks: int = 0
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    started_at: Optional[str] = None
    completed_at: Optional[str] = None

    def to_dict(self) -> Dict:
        data = asdict(self)
        data['status'] = self.status.value
        return data


class AutomationEngine:
    """자동화 엔진 - 작업 관리 및 실행"""

    def __init__(self, storage_dir: str = ".lars/automation"):
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(parents=True, exist_ok=True)

        # 메모리 저장소
        self.tasks: Dict[str, Task] = {}
        self.workflows: Dict[str, Workflow] = {}
        self.batch_jobs: Dict[str, BatchJob] = {}
        self.execution_history: List[Dict] = []

        # 스케줄러
        self.scheduler = AsyncIOScheduler()

        # 작업 핸들러
        self.task_handlers: Dict[str, Callable] = {}

        logger.info("[AUTOMATION] 자동화 엔진 초기화")

    # ==================== 작업 관리 ====================

    def create_task(
        self,
        name: str,
        description: str,
        action: str,
        params: Dict[str, Any]
    ) -> Task:
        """작업 생성"""
        task = Task(
            id=f"task_{uuid.uuid4().hex[:8]}",
            name=name,
            description=description,
            action=action,
            params=params
        )

        self.tasks[task.id] = task
        self._save_task(task)

        logger.info(f"[TASK] 작업 생성: {task.name} ({task.id})")
        return task

    def get_task(self, task_id: str) -> Optional[Task]:
        """작업 조회"""
        return self.tasks.get(task_id)

    def list_tasks(self) -> List[Task]:
        """작업 목록"""
        return list(self.tasks.values())

    def delete_task(self, task_id: str) -> bool:
        """작업 삭제"""
        if task_id in self.tasks:
            del self.tasks[task_id]
            self._delete_task_file(task_id)
            logger.info(f"[TASK] 작업 삭제: {task_id}")
            return True
        return False

    async def execute_task(self, task_id: str) -> Dict[str, Any]:
        """작업 실행"""
        task = self.get_task(task_id)
        if not task:
            return {"success": False, "error": "Task not found"}

        try:
            task.status = TaskStatus.RUNNING
            task.started_at = datetime.now().isoformat()

            # 작업 핸들러 호출
            handler = self.task_handlers.get(task.action)
            if handler:
                if asyncio.iscoroutinefunction(handler):
                    result = await handler(task.params)
                else:
                    result = handler(task.params)
            else:
                result = {"message": f"Handler not found for {task.action}"}

            task.status = TaskStatus.COMPLETED
            task.completed_at = datetime.now().isoformat()
            task.result = result

            logger.info(f"[TASK] 작업 완료: {task.name}")

            return {"success": True, "result": result}

        except Exception as e:
            task.status = TaskStatus.FAILED
            task.error = str(e)
            logger.error(f"[TASK] 작업 실패: {task.name} - {e}")
            return {"success": False, "error": str(e)}

    def register_handler(self, action: str, handler: Callable):
        """작업 핸들러 등록"""
        self.task_handlers[action] = handler
        logger.info(f"[HANDLER] 핸들러 등록: {action}")

    # ==================== 워크플로우 관리 ====================

    def create_workflow(
        self,
        name: str,
        description: str,
        tasks: List[Dict[str, Any]],
        trigger: TriggerType = TriggerType.MANUAL,
        schedule: Optional[str] = None
    ) -> Workflow:
        """워크플로우 생성"""
        workflow = Workflow(
            id=f"workflow_{uuid.uuid4().hex[:8]}",
            name=name,
            description=description,
            tasks=tasks,
            trigger=trigger,
            schedule=schedule
        )

        self.workflows[workflow.id] = workflow
        self._save_workflow(workflow)

        # 스케줄된 워크플로우인 경우 스케줄러에 등록
        if trigger == TriggerType.SCHEDULE and schedule:
            self._schedule_workflow(workflow)

        logger.info(f"[WORKFLOW] 워크플로우 생성: {workflow.name}")
        return workflow

    def get_workflow(self, workflow_id: str) -> Optional[Workflow]:
        """워크플로우 조회"""
        return self.workflows.get(workflow_id)

    def list_workflows(self) -> List[Workflow]:
        """워크플로우 목록"""
        return list(self.workflows.values())

    def update_workflow(self, workflow_id: str, **kwargs) -> bool:
        """워크플로우 업데이트"""
        workflow = self.get_workflow(workflow_id)
        if not workflow:
            return False

        for key, value in kwargs.items():
            if hasattr(workflow, key):
                setattr(workflow, key, value)

        self._save_workflow(workflow)
        logger.info(f"[WORKFLOW] 워크플로우 업데이트: {workflow_id}")
        return True

    def delete_workflow(self, workflow_id: str) -> bool:
        """워크플로우 삭제"""
        if workflow_id in self.workflows:
            workflow = self.workflows[workflow_id]
            if workflow.trigger == TriggerType.SCHEDULE:
                self.scheduler.remove_job(workflow_id)
            del self.workflows[workflow_id]
            self._delete_workflow_file(workflow_id)
            logger.info(f"[WORKFLOW] 워크플로우 삭제: {workflow_id}")
            return True
        return False

    async def execute_workflow(self, workflow_id: str) -> Dict[str, Any]:
        """워크플로우 실행"""
        workflow = self.get_workflow(workflow_id)
        if not workflow:
            return {"success": False, "error": "Workflow not found"}

        logger.info(f"[WORKFLOW] 워크플로우 실행: {workflow.name}")

        workflow.last_run = datetime.now().isoformat()
        workflow.execution_count += 1

        results = []

        try:
            for task_def in workflow.tasks:
                # 작업 생성 및 실행
                task = self.create_task(
                    name=task_def.get("name", "Unnamed"),
                    description=task_def.get("description", ""),
                    action=task_def.get("action"),
                    params=task_def.get("params", {})
                )

                result = await self.execute_task(task.id)
                results.append(result)

                # 작업 실패 시 중단
                if not result.get("success"):
                    logger.warning(f"[WORKFLOW] 작업 실패로 워크플로우 중단: {task.name}")
                    break

            self._save_workflow(workflow)
            return {
                "success": True,
                "workflow_id": workflow_id,
                "execution_count": workflow.execution_count,
                "results": results
            }

        except Exception as e:
            logger.error(f"[WORKFLOW] 워크플로우 실행 오류: {e}")
            return {"success": False, "error": str(e)}

    # ==================== 배치 처리 ====================

    def create_batch_job(
        self,
        name: str,
        task_ids: List[str]
    ) -> BatchJob:
        """배치 작업 생성"""
        job = BatchJob(
            id=f"batch_{uuid.uuid4().hex[:8]}",
            name=name,
            tasks=task_ids,
            total_tasks=len(task_ids)
        )

        self.batch_jobs[job.id] = job
        logger.info(f"[BATCH] 배치 작업 생성: {job.name} ({len(task_ids)}개 작업)")
        return job

    def get_batch_job(self, batch_id: str) -> Optional[BatchJob]:
        """배치 작업 조회"""
        return self.batch_jobs.get(batch_id)

    def list_batch_jobs(self) -> List[BatchJob]:
        """배치 작업 목록"""
        return list(self.batch_jobs.values())

    async def execute_batch_job(
        self,
        batch_id: str,
        parallel: bool = False
    ) -> Dict[str, Any]:
        """배치 작업 실행"""
        job = self.get_batch_job(batch_id)
        if not job:
            return {"success": False, "error": "Batch job not found"}

        job.status = TaskStatus.RUNNING
        job.started_at = datetime.now().isoformat()

        logger.info(f"[BATCH] 배치 작업 실행: {job.name} (병렬: {parallel})")

        results = []

        try:
            if parallel:
                # 병렬 실행
                tasks = [self.execute_task(task_id) for task_id in job.tasks]
                results = await asyncio.gather(*tasks)
            else:
                # 순차 실행
                for task_id in job.tasks:
                    result = await self.execute_task(task_id)
                    results.append(result)

            # 성공/실패 통계
            job.completed_tasks = sum(1 for r in results if r.get("success"))
            job.failed_tasks = sum(1 for r in results if not r.get("success"))
            job.status = TaskStatus.COMPLETED
            job.completed_at = datetime.now().isoformat()

            logger.info(
                f"[BATCH] 배치 작업 완료: {job.completed_tasks}/{job.total_tasks} 성공"
            )

            return {
                "success": True,
                "batch_id": batch_id,
                "total": job.total_tasks,
                "completed": job.completed_tasks,
                "failed": job.failed_tasks,
                "results": results
            }

        except Exception as e:
            job.status = TaskStatus.FAILED
            logger.error(f"[BATCH] 배치 작업 오류: {e}")
            return {"success": False, "error": str(e)}

    # ==================== 스케줄링 ====================

    def _schedule_workflow(self, workflow: Workflow):
        """워크플로우 스케줄 등록"""
        if not workflow.schedule:
            return

        try:
            trigger = CronTrigger.from_crontab(workflow.schedule)
            self.scheduler.add_job(
                self.execute_workflow,
                trigger=trigger,
                args=(workflow.id,),
                id=workflow.id,
                name=f"Workflow: {workflow.name}"
            )
            logger.info(f"[SCHEDULE] 워크플로우 스케줄 등록: {workflow.name}")
        except Exception as e:
            logger.error(f"[SCHEDULE] 스케줄 등록 실패: {e}")

    def start_scheduler(self):
        """스케줄러 시작"""
        if not self.scheduler.running:
            self.scheduler.start()
            logger.info("[SCHEDULER] 스케줄러 시작")

    def stop_scheduler(self):
        """스케줄러 중지"""
        if self.scheduler.running:
            self.scheduler.shutdown()
            logger.info("[SCHEDULER] 스케줄러 중지")

    # ==================== 저장소 ====================

    def _save_task(self, task: Task):
        """작업 저장"""
        task_file = self.storage_dir / "tasks" / f"{task.id}.json"
        task_file.parent.mkdir(parents=True, exist_ok=True)
        with open(task_file, "w") as f:
            json.dump(task.to_dict(), f, indent=2)

    def _delete_task_file(self, task_id: str):
        """작업 파일 삭제"""
        task_file = self.storage_dir / "tasks" / f"{task_id}.json"
        if task_file.exists():
            task_file.unlink()

    def _save_workflow(self, workflow: Workflow):
        """워크플로우 저장"""
        workflow_file = self.storage_dir / "workflows" / f"{workflow.id}.json"
        workflow_file.parent.mkdir(parents=True, exist_ok=True)
        with open(workflow_file, "w") as f:
            json.dump(workflow.to_dict(), f, indent=2)

    def _delete_workflow_file(self, workflow_id: str):
        """워크플로우 파일 삭제"""
        workflow_file = self.storage_dir / "workflows" / f"{workflow_id}.json"
        if workflow_file.exists():
            workflow_file.unlink()

    def get_statistics(self) -> Dict[str, Any]:
        """통계 조회"""
        return {
            "total_tasks": len(self.tasks),
            "total_workflows": len(self.workflows),
            "total_batch_jobs": len(self.batch_jobs),
            "completed_tasks": sum(
                1 for t in self.tasks.values()
                if t.status == TaskStatus.COMPLETED
            ),
            "failed_tasks": sum(
                1 for t in self.tasks.values()
                if t.status == TaskStatus.FAILED
            ),
            "active_workflows": sum(
                1 for w in self.workflows.values()
                if w.enabled
            ),
            "scheduled_jobs": self.scheduler.get_jobs() if self.scheduler.running else []
        }


# 전역 인스턴스
automation_engine = AutomationEngine()


if __name__ == "__main__":
    print("✅ 자동화 엔진 준비 완료")
