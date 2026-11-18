"""PPT 자동 생성 API - ppt-master 기반 프리젠테이션 생성"""

import logging
from pathlib import Path
from typing import List, Dict, Optional
from fastapi import APIRouter, Request
import json
from datetime import datetime
from src.core.ppt_theme_library import theme_library

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/ppt-generation", tags=["ppt-generation"])


class PPTGenerationEngine:
    """PPT 자동 생성 엔진"""

    def __init__(self):
        self.presentations = {}
        self.templates = self._load_templates()
        self.generation_history = []

    def _load_templates(self) -> Dict:
        """기본 템플릿 로드"""
        return {
            "business_report": {
                "name": "비즈니스 리포트",
                "layout": "title_content_footer",
                "slides": 12,
                "theme": "professional"
            },
            "sales_pitch": {
                "name": "영업 프레젠테이션",
                "layout": "title_bullets_image",
                "slides": 8,
                "theme": "modern"
            },
            "data_analysis": {
                "name": "데이터 분석",
                "layout": "title_chart_table",
                "slides": 10,
                "theme": "analytical"
            },
            "product_launch": {
                "name": "제품 출시",
                "layout": "title_image_content",
                "slides": 15,
                "theme": "vibrant"
            },
            "quarterly_review": {
                "name": "분기별 리뷰",
                "layout": "title_metrics_narrative",
                "slides": 20,
                "theme": "corporate"
            }
        }

    async def generate_from_data(self, title: str, data: Dict, template_name: str) -> Dict:
        """데이터로부터 PPT 생성"""
        ppt_id = f"ppt_{len(self.presentations)}"

        if template_name not in self.templates:
            template_name = "business_report"

        template = self.templates[template_name]

        presentation = {
            "ppt_id": ppt_id,
            "title": title,
            "template": template_name,
            "status": "generating",
            "created_at": datetime.now().isoformat(),
            "slides": await self._generate_slides({**data, "title": title}, template),
            "metadata": {
                "author": data.get("author", "AI Generated"),
                "company": data.get("company", ""),
                "date": datetime.now().isoformat()
            },
            "statistics": {
                "total_slides": 0,
                "text_content": 0,
                "charts": 0,
                "tables": 0,
                "images": 0
            }
        }

        # 통계 계산
        presentation["statistics"]["total_slides"] = len(presentation["slides"])
        for slide in presentation["slides"]:
            if "chart" in slide.get("content_type", ""):
                presentation["statistics"]["charts"] += 1
            if "table" in slide.get("content_type", ""):
                presentation["statistics"]["tables"] += 1
            if "image" in slide.get("content_type", ""):
                presentation["statistics"]["images"] += 1

        # 실제 .pptx 파일을 만든다 (편집 가능한 텍스트 상자)
        from src.core.pptx_writer import write_pptx
        from pathlib import Path as _Path
        file_path = _Path(".lars") / "ppt" / f"{ppt_id}.pptx"
        write_pptx(presentation["slides"], file_path, title=title,
                   subtitle=str(data.get("subtitle", "")), author=str(data.get("author", "")))
        presentation["file"] = str(file_path)

        presentation["status"] = "completed"
        self.presentations[ppt_id] = presentation
        self.generation_history.append(ppt_id)

        logger.info(f"[PPT] PPT 생성 완료: {ppt_id} ({title})")

        return {
            "success": True,
            "ppt_id": ppt_id,
            "title": title,
            "slides": len(presentation["slides"]),
            "file_path": f"/generated/{ppt_id}.pptx"
        }

    async def _generate_slides(self, data: Dict, template: Dict) -> List[Dict]:
        """슬라이드 생성"""
        slides = []

        # 1. 타이틀 슬라이드
        slides.append({
            "slide_number": 1,
            "layout": "title",
            "content_type": "title",
            "title": data.get("title", "Presentation"),
            "subtitle": data.get("subtitle", ""),
            "author": data.get("author", "")
        })

        # 2. 목차 슬라이드
        slides.append({
            "slide_number": 2,
            "layout": "table_of_contents",
            "content_type": "toc",
            "items": data.get("sections") or [str(item.get("title", "")) for item in data.get("content", []) if isinstance(item, dict) and item.get("title")][:10]
        })

        # 3-N. 콘텐츠 슬라이드
        content_items = data.get("content", [])
        for i, item in enumerate(content_items[:10], start=3):
            slide = await self._create_content_slide(i, item)
            slides.append(slide)

        # N+1. 결론 슬라이드
        slides.append({
            "slide_number": len(slides) + 1,
            "layout": "conclusion",
            "content_type": "conclusion",
            "title": "결론",
            "key_points": data.get("conclusion") or [str(item.get("title", "")) for item in data.get("content", []) if isinstance(item, dict) and item.get("title")][:5],
            "call_to_action": data.get("call_to_action", "")
        })

        return slides

    async def _create_content_slide(self, slide_number: int, item: Dict) -> Dict:
        """콘텐츠 슬라이드 생성"""
        content_type = item.get("type", "text")

        slide = {
            "slide_number": slide_number,
            "layout": "content",
            "content_type": content_type,
            "title": item.get("title", "")
        }

        if content_type == "text":
            slide["content"] = item.get("content", "")
            slide["bullets"] = item.get("bullets", [])
        elif content_type == "chart":
            slide["chart"] = {
                "type": item.get("chart_type", "bar"),
                "data": item.get("data", []),
                "title": item.get("title", "Chart")
            }
        elif content_type == "table":
            slide["table"] = {
                "headers": item.get("headers", []),
                "rows": item.get("rows", [])
            }
        elif content_type == "image":
            slide["image"] = {
                "url": item.get("image_url", ""),
                "caption": item.get("caption", "")
            }

        return slide

    async def generate_from_pdf(self, pdf_path: str, template_name: str = "business_report") -> Dict:
        """PDF로부터 PPT 생성"""
        ppt_id = f"ppt_{len(self.presentations)}"

        presentation = {
            "ppt_id": ppt_id,
            "source": "pdf",
            "pdf_path": pdf_path,
            "template": template_name,
            "status": "converting",
            "created_at": datetime.now().isoformat(),
            "slides": await self._extract_slides_from_pdf(pdf_path),
            "conversion_status": "completed"
        }

        self.presentations[ppt_id] = presentation
        logger.info(f"[PPT] PDF에서 PPT 생성: {ppt_id}")

        return {
            "success": True,
            "ppt_id": ppt_id,
            "source_file": pdf_path,
            "slides": len(presentation["slides"])
        }

    async def _extract_slides_from_pdf(self, pdf_path: str) -> List[Dict]:
        """PDF에서 페이지별 글자를 실제로 읽는다 (pypdf). 글자가 없는 스캔 PDF는 빈 목록을 돌려준다."""
        from pypdf import PdfReader
        reader = PdfReader(pdf_path)
        slides = []
        for number, page in enumerate(reader.pages, start=1):
            text = (page.extract_text() or "").strip()
            if text:
                slides.append({"slide_number": number, "content_type": "text", "source": "pdf", "page": number,
                               "title": f"{number}페이지", "bullets": [line.strip() for line in text.splitlines() if line.strip()][:12]})
        return slides

    async def add_speaker_notes(self, ppt_id: str, notes: List[str]) -> Dict:
        """스피커 노트 추가"""
        if ppt_id not in self.presentations:
            return {"error": "PPT를 찾을 수 없습니다"}

        presentation = self.presentations[ppt_id]
        for i, note in enumerate(notes):
            if i < len(presentation["slides"]):
                presentation["slides"][i]["speaker_notes"] = note

        logger.info(f"[PPT] 스피커 노트 추가: {ppt_id}")

        return {"success": True, "slides_updated": len(notes)}

    async def add_animations(self, ppt_id: str, animations: Dict) -> Dict:
        """애니메이션 추가"""
        if ppt_id not in self.presentations:
            return {"error": "PPT를 찾을 수 없습니다"}

        presentation = self.presentations[ppt_id]
        presentation["animations"] = animations

        logger.info(f"[PPT] 애니메이션 추가: {ppt_id}")

        return {"success": True}

    async def export_pptx(self, ppt_id: str) -> Dict:
        """PPTX 파일 내보내기"""
        if ppt_id not in self.presentations:
            return {"error": "PPT를 찾을 수 없습니다"}

        presentation = self.presentations[ppt_id]
        file_path = presentation.get("file")
        if not file_path or not Path(file_path).exists():
            return {"success": False, "error": "파일이 없습니다. 다시 생성해 주세요."}
        return {
            "success": True,
            "ppt_id": ppt_id,
            "file_path": file_path,
            "file_size_mb": round(Path(file_path).stat().st_size / (1024 * 1024), 2),
            "ready_for_download": True
        }

    async def export_pdf(self, ppt_id: str) -> Dict:
        """PDF 파일 내보내기: 저장된 슬라이드 구조로 실제 PDF를 만든다."""
        if ppt_id not in self.presentations:
            return {"success": False, "error": "PPT를 찾을 수 없습니다"}
        from src.core.pdf_writer import write_pdf
        path = Path(".lars") / "ppt" / f"{ppt_id}.pdf"
        write_pdf(self.presentations[ppt_id]["slides"], path)
        return {"success": True, "ppt_id": ppt_id, "file_path": str(path),
                "file_size_mb": round(path.stat().st_size / (1024 * 1024), 2)}


ppt_engine = PPTGenerationEngine()

@router.post("/generate")
async def generate_presentation(request: Request):
    """PPT 생성"""
    try:
        data = await request.json()
        title = data.get("title")
        content = data.get("content", {})
        template = data.get("template", "business_report")

        if not title:
            return {"success": False, "error": "제목이 필요합니다"}

        result = await ppt_engine.generate_from_data(title, content, template)
        return result
    except Exception as e:
        logger.error(f"[PPT] 생성 실패: {e}")
        return {"success": False, "error": str(e)}


@router.post("/generate-from-pdf")
async def generate_from_pdf(request: Request):
    """PDF로부터 PPT 생성"""
    try:
        data = await request.json()
        pdf_path = data.get("pdf_path")
        template = data.get("template", "business_report")

        if not pdf_path:
            return {"success": False, "error": "PDF 경로가 필요합니다"}

        result = await ppt_engine.generate_from_pdf(pdf_path, template)
        return result
    except Exception as e:
        logger.error(f"[PPT] PDF 변환 실패: {e}")
        return {"success": False, "error": str(e)}


@router.post("/{ppt_id}/speaker-notes")
async def add_speaker_notes(ppt_id: str, request: Request):
    """스피커 노트 추가"""
    try:
        data = await request.json()
        notes = data.get("notes", [])

        result = await ppt_engine.add_speaker_notes(ppt_id, notes)
        return result
    except Exception as e:
        logger.error(f"[PPT] 노트 추가 실패: {e}")
        return {"success": False, "error": str(e)}


@router.post("/{ppt_id}/animations")
async def add_animations(ppt_id: str, request: Request):
    """애니메이션 추가"""
    try:
        data = await request.json()
        animations = data.get("animations", {})

        result = await ppt_engine.add_animations(ppt_id, animations)
        return result
    except Exception as e:
        logger.error(f"[PPT] 애니메이션 추가 실패: {e}")
        return {"success": False, "error": str(e)}


@router.get("/{ppt_id}/download")
async def download_pptx(ppt_id: str):
    """생성된 .pptx 파일을 내려받는다."""
    from fastapi.responses import FileResponse
    from fastapi import HTTPException
    info = ppt_engine.presentations.get(ppt_id)
    if not info or not info.get("file") or not Path(info["file"]).exists():
        raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다.")
    return FileResponse(info["file"], filename=f"{info.get('title', ppt_id)}.pptx",
                        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation")


@router.get("/{ppt_id}/download/pdf")
async def download_pdf(ppt_id: str):
    """PDF로 만든 파일을 내려받는다 (없으면 먼저 만든다)."""
    from fastapi.responses import FileResponse
    from fastapi import HTTPException
    if ppt_id not in ppt_engine.presentations:
        raise HTTPException(status_code=404, detail="PPT를 찾을 수 없습니다.")
    result = await ppt_engine.export_pdf(ppt_id)
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error", "PDF 생성 실패"))
    return FileResponse(result["file_path"], filename=f"{ppt_engine.presentations[ppt_id].get('title', ppt_id)}.pdf", media_type="application/pdf")


@router.get("/{ppt_id}/export/pptx")
async def export_pptx(ppt_id: str):
    """PPTX 내보내기"""
    try:
        result = await ppt_engine.export_pptx(ppt_id)
        return result
    except Exception as e:
        logger.error(f"[PPT] PPTX 내보내기 실패: {e}")
        return {"success": False, "error": str(e)}


@router.get("/{ppt_id}/export/pdf")
async def export_pdf(ppt_id: str):
    """PDF 내보내기"""
    try:
        result = await ppt_engine.export_pdf(ppt_id)
        return result
    except Exception as e:
        logger.error(f"[PPT] PDF 내보내기 실패: {e}")
        return {"success": False, "error": str(e)}


@router.get("/templates")
async def list_templates():
    """템플릿 목록"""
    templates = []
    for key, template in ppt_engine.templates.items():
        templates.append({
            "template_id": key,
            "name": template["name"],
            "slides": template["slides"],
            "theme": template["theme"]
        })

    return {"success": True, "templates": templates}


@router.get("/statistics")
async def get_ppt_statistics():
    """PPT 생성 통계"""
    return {
        "success": True,
        "statistics": {
            "total_presentations": len(ppt_engine.presentations),
            "generation_history": len(ppt_engine.generation_history),
            "average_slides": sum(len(p.get("slides", [])) for p in ppt_engine.presentations.values()) / max(1, len(ppt_engine.presentations)),
            "templates_available": len(ppt_engine.templates)
        }
    }


# ==================== 테마 라이브러리 엔드포인트 ====================

@router.get("/themes/all")
async def get_all_themes():
    """모든 전문 테마 조회"""
    themes = theme_library.get_all_themes()
    return {
        "success": True,
        "themes": [
            {
                "theme_id": tid,
                "name": theme.name,
                "primary_color": theme.primary_color,
                "secondary_color": theme.secondary_color,
                "accent_color": theme.accent_color,
                "font_family": theme.font_family,
                "background_style": theme.background_style
            }
            for tid, theme in themes.items()
        ]
    }


@router.get("/themes/category/{category}")
async def get_themes_by_category(category: str):
    """카테고리별 테마 조회"""
    themes = theme_library.get_theme_category(category)
    if not themes:
        return {"success": False, "error": f"Category '{category}' not found"}

    return {
        "success": True,
        "category": category,
        "themes": [
            {
                "theme_id": tid,
                "name": theme.name,
                "primary_color": theme.primary_color,
                "secondary_color": theme.secondary_color,
                "accent_color": theme.accent_color,
                "font_family": theme.font_family,
                "background_style": theme.background_style
            }
            for tid, theme in themes.items()
        ]
    }


@router.post("/generate-with-theme")
async def generate_with_theme(request: Request):
    """테마를 적용하여 PPT 생성"""
    try:
        data = await request.json()
        theme_id = data.get("theme_id")
        title = data.get("title")
        content = data.get("content", [])

        if not theme_id or not title:
            return {"success": False, "error": "theme_id and title are required"}

        result = theme_library.generate_pptx_with_theme(theme_id, title, content)

        if result.get("success"):
            logger.info(f"[PPT] 테마 적용 PPT 생성: {result['ppt_id']} (테마: {theme_id})")

        return result
    except Exception as e:
        logger.error(f"[PPT] 테마 적용 생성 실패: {e}")
        return {"success": False, "error": str(e)}
