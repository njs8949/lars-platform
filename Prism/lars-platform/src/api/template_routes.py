"""
Template Generation & Customization API Routes

Design System 기반 템플릿 생성 및 커스터마이징 엔드포인트
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
import json
import logging

# Design System imports
try:
    from src.gui.design.templateMetadata import AllTemplates, searchTemplates
    from src.gui.design.tokens import DesignTokens, getPalette
except ImportError:
    AllTemplates = []
    searchTemplates = None
    DesignTokens = None
    getPalette = None

# Template generation imports (Python side)
try:
    from python_pptx import Presentation
    from python_pptx.util import Inches, Pt
    from python_docx import Document
    from python_docx.shared import Inches as DocInches, Pt as DocPt
except ImportError:
    Presentation = None
    Document = None

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/templates", tags=["templates"])

# ==================== Request Models ====================

class CustomizerState(BaseModel):
    """Design Token 커스터마이저 상태"""
    selectedPalette: str
    selectedTypography: str
    customColors: Dict[str, Optional[str]] = {}
    customSpacing: str = "comfortable"
    customRadius: str = "md"


class TemplateGenerateRequest(BaseModel):
    """템플릿 생성 요청"""
    templateId: str
    customizerState: CustomizerState
    templateType: str  # 'website', 'presentation', 'document'
    contentData: Optional[Dict[str, Any]] = None  # Optional custom content


class TemplateSearchRequest(BaseModel):
    """템플릿 검색 요청"""
    query: str
    category: Optional[str] = None
    palette: Optional[str] = None


# ==================== API Endpoints ====================

@router.post("/search")
async def search_templates(request: TemplateSearchRequest):
    """
    자연어 기반 템플릿 검색

    Parameters:
    - query: 검색 쿼리 (e.g., "AI startup landing page")
    - category: 카테고리 필터 (website, presentation, document)
    - palette: 팔레트 필터

    Returns:
    - results: 추천 템플릿 리스트 (최상위 5개)
    """
    if not searchTemplates:
        raise HTTPException(status_code=500, detail="Search function not available")

    try:
        filters = {}
        if request.category:
            filters['category'] = request.category
        if request.palette:
            filters['palette'] = request.palette

        results = searchTemplates(request.query, filters)

        return {
            "success": True,
            "count": len(results),
            "results": [
                {
                    "id": t.id,
                    "name": t.name,
                    "description": t.description,
                    "category": t.category,
                    "palette": t.palette,
                    "rating": t.rating,
                    "downloads": t.downloads,
                    "featured": t.featured,
                    "useCase": t.useCase,
                    "industry": t.industry,
                }
                for t in results
            ]
        }
    except Exception as e:
        logger.error(f"Search error: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/generate")
async def generate_template(request: TemplateGenerateRequest):
    """
    Design Token 기반 템플릿 생성

    Parameters:
    - templateId: 템플릿 ID
    - customizerState: Design Token 커스터마이저 상태
    - templateType: 출력 타입 (website, presentation, document)
    - contentData: 선택적 콘텐츠 데이터

    Returns:
    - success: 성공 여부
    - websiteHtml: 웹사이트 HTML (type=website)
    - pptxUrl: PPTX 다운로드 URL (type=presentation)
    - docxUrl: DOCX 다운로드 URL (type=document)
    - previewUrl: 미리보기 PNG URL
    """
    try:
        # Find template metadata
        template = next((t for t in AllTemplates if t.id == request.templateId), None)
        if not template:
            raise HTTPException(status_code=404, detail=f"Template not found: {request.templateId}")

        # Get Design Token palette
        palette = getPalette(request.customizerState.selectedPalette)
        if not palette:
            raise HTTPException(status_code=400, detail="Invalid palette")

        # Apply custom colors
        colors = {
            **palette.__dict__,
            **request.customizerState.customColors
        }

        # Generate based on type
        result = {
            "success": True,
            "templateId": request.templateId,
            "templateType": request.templateType,
        }

        if request.templateType == "website":
            html = _generate_website_html(template, colors, request.customizerState)
            result["websiteHtml"] = html
            result["previewUrl"] = "/templates/preview.png"

        elif request.templateType == "presentation":
            pptx_path = _generate_presentation(template, colors, request.customizerState)
            result["pptxUrl"] = pptx_path
            result["previewUrl"] = "/templates/preview.png"

        elif request.templateType == "document":
            docx_path = _generate_document(template, colors, request.customizerState)
            result["docxUrl"] = docx_path
            result["previewUrl"] = "/templates/preview.png"

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/metadata/{template_id}")
async def get_template_metadata(template_id: str):
    """
    템플릿 메타데이터 조회

    Parameters:
    - template_id: 템플릿 ID

    Returns:
    - Template metadata including components, layouts, features
    """
    try:
        template = next((t for t in AllTemplates if t.id == template_id), None)
        if not template:
            raise HTTPException(status_code=404, detail=f"Template not found: {template_id}")

        return {
            "id": template.id,
            "name": template.name,
            "description": template.description,
            "category": template.category,
            "type": template.type,
            "palette": template.palette,
            "typography": template.typography,
            "layouts": template.layouts,
            "components": template.components,
            "density": template.density,
            "useCase": template.useCase,
            "industry": template.industry,
            "features": template.features,
            "difficulty": template.difficulty,
            "customizable": template.customizable,
            "aiCompatible": template.aiCompatible,
            "rating": template.rating,
            "downloads": template.downloads,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Metadata fetch error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/list")
async def list_templates(category: Optional[str] = None, palette: Optional[str] = None):
    """
    템플릿 목록 조회

    Parameters:
    - category: 카테고리 필터 (website, presentation, document)
    - palette: 팔레트 필터

    Returns:
    - templates: 필터링된 템플릿 목록
    """
    try:
        templates = AllTemplates

        if category:
            templates = [t for t in templates if t.category == category]
        if palette:
            templates = [t for t in templates if t.palette == palette]

        return {
            "success": True,
            "count": len(templates),
            "templates": [
                {
                    "id": t.id,
                    "name": t.name,
                    "category": t.category,
                    "palette": t.palette,
                    "rating": t.rating,
                    "downloads": t.downloads,
                    "featured": t.featured,
                }
                for t in sorted(templates, key=lambda x: x.popularity, reverse=True)
            ]
        }
    except Exception as e:
        logger.error(f"List error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Helper Functions ====================

def _generate_website_html(template, colors: dict, customizer_state: CustomizerState) -> str:
    """웹사이트 HTML 생성"""
    try:
        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{template.name} - {template.description}</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: {colors.get('background', '#FFFFFF')};
            color: {colors.get('text', '#0A0E27')};
            line-height: 1.6;
        }}

        /* Design Token Application */
        :root {{
            --primary: {colors.get('primary', '#0052CC')};
            --secondary: {colors.get('secondary', '#003D99')};
            --accent: {colors.get('accent', '#0052CC')};
            --text: {colors.get('text', '#0A0E27')};
            --text-light: {colors.get('textLight', '#6B7280')};
            --background: {colors.get('background', '#FFFFFF')};
            --surface: {colors.get('surface', '#F3F4F6')};
        }}

        .container {{ max-width: 1200px; margin: 0 auto; padding: 0 20px; }}

        nav {{
            background: var(--surface);
            padding: 20px 0;
            border-bottom: 1px solid rgba(0,0,0,0.05);
        }}

        .hero {{
            background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
            color: white;
            padding: 80px 20px;
            text-align: center;
        }}

        .hero h1 {{ font-size: 48px; margin-bottom: 20px; }}
        .hero p {{ font-size: 20px; opacity: 0.9; }}

        .cta-btn {{
            display: inline-block;
            background: var(--accent);
            color: white;
            padding: 14px 32px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            margin-top: 20px;
        }}

        .features {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 30px;
            padding: 60px 20px;
        }}

        .feature-card {{
            background: var(--surface);
            padding: 30px;
            border-radius: 12px;
            border-left: 4px solid var(--accent);
        }}

        .feature-card h3 {{ color: var(--primary); margin-bottom: 10px; }}
        .feature-card p {{ color: var(--text-light); }}
    </style>
</head>
<body>
    <nav class="container">
        <h2>{template.name}</h2>
    </nav>

    <section class="hero">
        <h1>{template.name}</h1>
        <p>{template.description}</p>
        <a href="#" class="cta-btn">Get Started</a>
    </section>

    <section class="container">
        <div class="features">
            <div class="feature-card">
                <h3>🎨 Design</h3>
                <p>Beautiful and modern design with latest trends</p>
            </div>
            <div class="feature-card">
                <h3>⚡ Performance</h3>
                <p>Optimized for speed and user experience</p>
            </div>
            <div class="feature-card">
                <h3>📱 Responsive</h3>
                <p>Works perfectly on all devices</p>
            </div>
        </div>
    </section>
</body>
</html>"""
        return html
    except Exception as e:
        logger.error(f"HTML generation error: {e}")
        raise


def _generate_presentation(template, colors: dict, customizer_state: CustomizerState) -> str:
    """PPTX 프레젠테이션 생성"""
    if not Presentation:
        raise HTTPException(status_code=500, detail="python-pptx not installed")

    try:
        prs = Presentation()
        prs.slide_width = Inches(10)
        prs.slide_height = Inches(7.5)

        # Title Slide
        slide = prs.slides.add_slide(prs.slide_layouts[6])  # Blank layout
        background = slide.background
        fill = background.fill
        fill.solid()
        fill.fore_color.rgb = tuple(int(colors.get('primary', '0052CC')[i:i+2], 16) for i in (1, 3, 5))

        title_box = slide.shapes.add_textbox(Inches(1), Inches(2.5), Inches(8), Inches(2))
        title_frame = title_box.text_frame
        title_frame.text = template.name
        title_frame.paragraphs[0].font.size = Pt(54)
        title_frame.paragraphs[0].font.bold = True
        title_frame.paragraphs[0].font.color.rgb = (255, 255, 255)

        subtitle_box = slide.shapes.add_textbox(Inches(1), Inches(4.5), Inches(8), Inches(1))
        subtitle_frame = subtitle_box.text_frame
        subtitle_frame.text = template.description
        subtitle_frame.paragraphs[0].font.size = Pt(24)
        subtitle_frame.paragraphs[0].font.color.rgb = (200, 200, 200)

        # Content Slide
        slide2 = prs.slides.add_slide(prs.slide_layouts[6])
        title_box2 = slide2.shapes.add_textbox(Inches(0.5), Inches(0.5), Inches(9), Inches(1))
        title_frame2 = title_box2.text_frame
        title_frame2.text = "Key Features"
        title_frame2.paragraphs[0].font.size = Pt(44)
        title_frame2.paragraphs[0].font.bold = True

        content_box = slide2.shapes.add_textbox(Inches(0.5), Inches(1.5), Inches(9), Inches(5.5))
        content_frame = content_box.text_frame
        content_frame.word_wrap = True

        for feature in template.features[:5]:
            p = content_frame.add_paragraph()
            p.text = f"• {feature}"
            p.font.size = Pt(28)
            p.level = 0

        # Save presentation
        pptx_path = f"/tmp/{template.id}_{customizer_state.selectedPalette}.pptx"
        prs.save(pptx_path)
        logger.info(f"Generated presentation: {pptx_path}")
        return pptx_path

    except Exception as e:
        logger.error(f"PPTX generation error: {e}")
        raise


def _generate_document(template, colors: dict, customizer_state: CustomizerState) -> str:
    """DOCX 문서 생성"""
    if not Document:
        raise HTTPException(status_code=500, detail="python-docx not installed")

    try:
        doc = Document()

        # Title
        title = doc.add_heading(template.name, 0)
        title.runs[0].font.color.rgb = tuple(int(colors.get('primary', '0052CC')[i:i+2], 16) for i in (1, 3, 5))

        # Description
        doc.add_paragraph(template.description, style='Normal')

        # Features
        doc.add_heading('Features', level=1)
        for feature in template.features:
            doc.add_paragraph(feature, style='List Bullet')

        # Use Cases
        doc.add_heading('Use Cases', level=1)
        for use_case in template.useCase:
            doc.add_paragraph(use_case, style='List Bullet')

        # Save document
        docx_path = f"/tmp/{template.id}_{customizer_state.selectedPalette}.docx"
        doc.save(docx_path)
        logger.info(f"Generated document: {docx_path}")
        return docx_path

    except Exception as e:
        logger.error(f"DOCX generation error: {e}")
        raise
