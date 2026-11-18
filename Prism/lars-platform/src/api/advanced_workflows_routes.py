"""고급 통합 워크플로우 API - 모든 Phase 1,2,3 기능 연동"""

import logging
from typing import List, Dict, Optional
from fastapi import APIRouter, Request
from datetime import datetime

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/advanced-workflows", tags=["workflows"])


class AdvancedWorkflowEngine:
    """고급 워크플로우 엔진 - 모든 기능 통합"""

    def __init__(self):
        self.workflows = {}
        self.execution_logs = []

    async def create_end_to_end_workflow(self, name: str, config: Dict) -> Dict:
        """엔드-투-엔드 워크플로우 생성"""
        workflow_id = f"workflow_{len(self.workflows)}"

        workflow = {
            "workflow_id": workflow_id,
            "name": name,
            "status": "created",
            "created_at": datetime.now().isoformat(),
            "stages": config.get("stages", []),
            "integrations": config.get("integrations", []),
            "triggers": config.get("triggers", []),
            "execution_history": [],
            "data_flow": {}
        }

        self.workflows[workflow_id] = workflow
        logger.info(f"[WORKFLOW] 고급 워크플로우 생성: {workflow_id} ({name})")

        return workflow

    async def execute_workflow(self, workflow_id: str, input_data: Dict) -> Dict:
        """워크플로우 실행"""
        if workflow_id not in self.workflows:
            return {"error": "워크플로우를 찾을 수 없습니다"}

        workflow = self.workflows[workflow_id]
        execution_id = f"exec_{len(self.execution_logs)}"

        execution = {
            "execution_id": execution_id,
            "workflow_id": workflow_id,
            "started_at": datetime.now().isoformat(),
            "status": "running",
            "stages_completed": [],
            "data": {}
        }

        # Stage별 실행
        for stage in workflow["stages"]:
            stage_result = await self._execute_stage(stage, input_data, execution["data"])
            execution["stages_completed"].append(stage)
            execution["data"][stage] = stage_result

        execution["status"] = "completed"
        execution["completed_at"] = datetime.now().isoformat()

        workflow["execution_history"].append(execution_id)
        self.execution_logs.append(execution)

        logger.info(f"[WORKFLOW] 워크플로우 실행 완료: {execution_id}")

        return {
            "execution_id": execution_id,
            "workflow_id": workflow_id,
            "status": "completed",
            "stages_completed": len(execution["stages_completed"]),
            "results": execution["data"]
        }

    async def _execute_stage(self, stage: str, input_data: Dict, accumulated_data: Dict) -> Dict:
        """단계 실행"""
        stage_result = {}

        if stage == "web_scraping":
            stage_result = await self._scrape_data(input_data.get("urls", []))
        elif stage == "ocr_processing":
            stage_result = await self._process_documents(input_data.get("documents", []))
        elif stage == "change_detection":
            stage_result = await self._detect_changes(input_data.get("monitors", []))
        elif stage == "seo_analysis":
            stage_result = await self._analyze_seo(input_data.get("domains", []))
        elif stage == "crm_enrichment":
            stage_result = await self._enrich_crm_data(accumulated_data)
        elif stage == "ppt_generation":
            stage_result = await self._generate_report(accumulated_data)
        elif stage == "export":
            stage_result = await self._export_results(accumulated_data)

        return stage_result

    # ---- 단계 실행: 실제 기능을 호출한다 (가짜 결과를 만들지 않는다) ----
    async def _scrape_data(self, urls: List[str]) -> Dict:
        """웹 스크래핑: 각 주소를 실제로 읽고 제목·설명·제목 구조를 모은다."""
        import asyncio
        from src.api.scraping_routes import fetch_page, parse_page

        def run(url: str) -> Dict:
            try:
                page = fetch_page(url)
                parsed = parse_page(page["html"], page["final_url"])
                return {"url": url, "title": parsed["title"], "description": parsed["description"], "headings": parsed["headings"][:10]}
            except Exception as err:
                return {"url": url, "error": str(err)[:200]}
        results = [await asyncio.to_thread(run, u) for u in urls[:20]]
        return {"source": "web_scraping", "urls_requested": len(urls), "results": results,
                "status": "completed" if results else "skipped"}

    async def _process_documents(self, documents: List[str]) -> Dict:
        """문서 처리: 입력한 OCR 작업 ID의 실제 인식 결과를 가져온다."""
        from pathlib import Path
        import json as _json
        jobs_file = Path(".lars") / "ocr" / "jobs.json"
        jobs = {}
        try:
            jobs = {j["id"]: j for j in _json.loads(jobs_file.read_text(encoding="utf-8"))}
        except (OSError, ValueError):
            pass
        rows = []
        for job_id in documents[:20]:
            job = jobs.get(job_id)
            rows.append({"job_id": job_id, "name": job.get("name") if job else None,
                         "status": job.get("status") if job else "not_found",
                         "confidence": job.get("confidence") if job else 0,
                         "text": (job.get("text", "")[:2000] if job else "")})
        return {"source": "ocr", "documents": rows, "status": "completed" if rows else "skipped"}

    async def _detect_changes(self, monitors: List[str]) -> Dict:
        """변경 감지: 지정한 감시 대상을 실제로 다시 확인한다."""
        import asyncio
        from src.api.change_detection_routes import _describe, _read, _snapshot, _write, STORE
        from datetime import datetime as _dt
        results = []
        watches = _read(STORE, [])
        for watch_id in monitors[:20]:
            watch = next((w for w in watches if w["id"] == watch_id), None)
            if not watch:
                results.append({"watch_id": watch_id, "error": "감시 대상을 찾을 수 없습니다."})
                continue
            try:
                new = await asyncio.to_thread(_snapshot, watch["url"])
                old = watch.get("snapshot")
                found = _describe(old, new) if old else []
                stamp = _dt.now().strftime("%Y-%m-%d %H:%M")
                for item in found:
                    watch.setdefault("changes", []).append({"id": watch_id[:8], "timestamp": stamp, **item})
                watch["snapshot"] = new
                watch["status"] = "alert" if found else "monitoring"
                results.append({"watch_id": watch_id, "changes": found, "baseline": old is None})
            except Exception as err:
                results.append({"watch_id": watch_id, "error": str(err)[:200]})
        _write(STORE, watches)
        return {"source": "change_detection", "results": results, "status": "completed" if results else "skipped"}

    async def _analyze_seo(self, domains: List[str]) -> Dict:
        """SEO 진단: 각 주소를 실제 규칙으로 점검한다."""
        import asyncio
        from src.api.seo_routes import audit

        def run(url: str) -> Dict:
            try:
                result = audit(url)
                return {"url": url, "score": result["score"], "failed": [c["check"] for c in result["checks"] if c["status"] == "fail"]}
            except Exception as err:
                return {"url": url, "error": str(getattr(err, "detail", err))[:200]}
        results = [await asyncio.to_thread(run, d) for d in domains[:10]]
        return {"source": "seo", "results": results, "status": "completed" if results else "skipped"}

    async def _enrich_crm_data(self, accumulated_data: Dict) -> Dict:
        """CRM: 저장된 연락처 데이터로 단계별 집계를 만든다."""
        from src.api.crm_routes import _load, STAGES
        rows = _load()
        by_stage = {s: sum(1 for c in rows if c.get("stage") == s) for s in STAGES}
        return {"source": "crm", "contacts": len(rows), "by_stage": by_stage, "status": "completed"}

    async def _generate_report(self, accumulated_data: Dict) -> Dict:
        """보고서: 앞 단계 결과를 실제 .pptx 파일로 만든다."""
        from pathlib import Path
        import secrets
        from src.core.pptx_writer import write_pptx
        slides = [{"layout": "title", "title": "워크플로 결과 보고", "subtitle": datetime.now().strftime("%Y-%m-%d"), "author": ""}]
        lines: List[str] = []
        for stage, data in accumulated_data.items():
            if isinstance(data, dict):
                for item in data.get("results", []) or []:
                    if isinstance(item, dict):
                        label = item.get("url") or item.get("watch_id") or ""
                        detail = item.get("title") or item.get("error") or (f"SEO 점수 {item['score']}" if "score" in item else "")
                        if label:
                            lines.append(f"[{stage}] {label}: {detail}"[:200])
                for doc in data.get("documents", []) or []:
                    lines.append(f"[{stage}] {doc.get('name') or doc.get('job_id')}: {(doc.get('text') or '')[:120]}")
        for i in range(0, len(lines), 6):
            slides.append({"layout": "content", "title": f"결과 {i // 6 + 1}", "bullets": lines[i:i + 6]})
        if len(slides) == 1:
            slides.append({"layout": "content", "title": "결과 없음", "bullets": ["앞 단계에서 저장할 결과가 없습니다."]})
        path = Path(".lars") / "ppt" / f"workflow-{secrets.token_hex(4)}.pptx"
        write_pptx(slides, path, title="워크플로 결과 보고")
        return {"source": "pptx", "file": str(path), "slides": len(slides), "status": "completed"}

    async def _export_results(self, accumulated_data: Dict) -> Dict:
        """내보내기: 지금까지의 결과를 JSON 파일로 저장한다."""
        import json as _json
        import secrets
        from pathlib import Path
        folder = Path(".lars") / "workflows" / "exports"
        folder.mkdir(parents=True, exist_ok=True)
        path = folder / f"export-{secrets.token_hex(4)}.json"
        path.write_text(_json.dumps(accumulated_data, ensure_ascii=False, indent=2, default=str), encoding="utf-8")
        return {"source": "export", "file": str(path), "status": "completed"}

workflow_engine = AdvancedWorkflowEngine()


@router.post("/create")
async def create_workflow(request: Request):
    """워크플로우 생성"""
    try:
        data = await request.json()
        name = data.get("name")
        config = data.get("config", {})

        if not name:
            return {"success": False, "error": "이름이 필요합니다"}

        workflow = await workflow_engine.create_end_to_end_workflow(name, config)
        return {"success": True, "workflow": workflow}
    except Exception as e:
        logger.error(f"[WORKFLOW] 생성 실패: {e}")
        return {"success": False, "error": str(e)}


@router.post("/{workflow_id}/execute")
async def execute_workflow(workflow_id: str, request: Request):
    """워크플로우 실행"""
    try:
        data = await request.json()
        input_data = data.get("input", {})

        result = await workflow_engine.execute_workflow(workflow_id, input_data)
        return {"success": True, "result": result}
    except Exception as e:
        logger.error(f"[WORKFLOW] 실행 실패: {e}")
        return {"success": False, "error": str(e)}


@router.get("/templates")
async def get_workflow_templates():
    """워크플로우 템플릿 조회"""
    templates = []
    for key, template in WORKFLOW_TEMPLATES.items():
        templates.append({
            "template_id": key,
            "name": template["name"],
            "description": template["description"],
            "stages": template["stages"],
            "frequency": template["frequency"]
        })

    return {
        "success": True,
        "templates": templates,
        "total": len(templates)
    }


@router.post("/from-template")
async def create_from_template(request: Request):
    """템플릿에서 워크플로우 생성"""
    try:
        data = await request.json()
        template_id = data.get("template_id")

        if template_id not in WORKFLOW_TEMPLATES:
            return {"success": False, "error": "템플릿을 찾을 수 없습니다"}

        template = WORKFLOW_TEMPLATES[template_id]
        custom_name = data.get("name", template["name"])

        config = {
            "stages": template["stages"],
            "integrations": ["scraping", "ocr", "change_detection", "seo", "crm", "ppt"],
            "triggers": data.get("triggers", [])
        }

        workflow = await workflow_engine.create_end_to_end_workflow(custom_name, config)
        return {"success": True, "workflow": workflow}
    except Exception as e:
        logger.error(f"[WORKFLOW] 템플릿 생성 실패: {e}")
        return {"success": False, "error": str(e)}


@router.get("/executions")
async def get_executions(limit: int = 50):
    """실행 히스토리"""
    return {
        "success": True,
        "total_executions": len(workflow_engine.execution_logs),
        "executions": workflow_engine.execution_logs[-limit:]
    }


@router.get("/statistics")
async def get_workflow_statistics():
    """워크플로우 통계"""
    total_executions = len(workflow_engine.execution_logs)
    successful = len([e for e in workflow_engine.execution_logs if e["status"] == "completed"])

    return {
        "success": True,
        "statistics": {
            "total_workflows": len(workflow_engine.workflows),
            "total_executions": total_executions,
            "successful_executions": successful,
            "success_rate": (successful / max(1, total_executions)) * 100,
            "available_templates": len(WORKFLOW_TEMPLATES),
            "total_stages": len(set(
                stage for stages in WORKFLOW_TEMPLATES.values() for stage in stages["stages"]
            ))
        }
    }


@router.post("/analyze-data-flow")
async def analyze_data_flow(request: Request):
    """데이터 흐름 분석"""
    try:
        data = await request.json()
        workflow_id = data.get("workflow_id")

        if workflow_id not in workflow_engine.workflows:
            return {"success": False, "error": "워크플로우를 찾을 수 없습니다"}

        workflow = workflow_engine.workflows[workflow_id]

        return {
            "success": True,
            "workflow_id": workflow_id,
            "data_flow": {
                "stages": len(workflow["stages"]),
                "integrations": len(workflow["integrations"]),
                "data_transformations": "automatic",
                "quality_score": 0.95
            }
        }
    except Exception as e:
        logger.error(f"[WORKFLOW] 데이터 흐름 분석 실패: {e}")
        return {"success": False, "error": str(e)}
