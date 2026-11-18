"""
파일 내보내기 라우트 (웹사이트, 프레젠테이션, 문서)
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
from typing import Dict, Optional
from io import BytesIO
import os

from src.core.file_generators import WebsiteGenerator, PresentationGenerator, DocumentGenerator

router = APIRouter(prefix="/api/export", tags=["export"])


class ExportRequest(BaseModel):
    """내보내기 요청"""
    file_type: str  # 'website', 'presentation', 'document'
    theme_name: str
    palette: Dict[str, str]
    typography: Optional[Dict] = None
    company_name: str = "Your Company"
    title: str = "Untitled"


@router.post("/website")
async def export_website(request: ExportRequest):
    """
    웹사이트 HTML 생성 및 다운로드

    Args:
        request: ExportRequest
            - file_type: 'website'
            - theme_name: 테마 이름
            - palette: 색상 팔레트
            - typography: 타이포그래피 (선택)
            - company_name: 회사명
            - title: 웹사이트 제목
    """
    try:
        # 타이포그래피 기본값
        typography = request.typography or {
            'family': 'system-ui',
            'size': '16px'
        }

        # HTML 생성
        html_content = WebsiteGenerator.generate_html(
            theme_name=request.theme_name,
            palette=request.palette,
            typography=typography,
            company_name=request.company_name,
            tagline=request.title
        )

        # 파일명
        filename = f"{request.company_name.replace(' ', '_')}_website.html"

        # 바이너리로 변환
        html_bytes = html_content.encode('utf-8')

        return StreamingResponse(
            iter([html_bytes]),
            media_type="text/html; charset=utf-8",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate website: {str(e)}")


@router.post("/presentation")
async def export_presentation(request: ExportRequest):
    """
    프레젠테이션 PPTX 생성 및 다운로드

    Args:
        request: ExportRequest
            - file_type: 'presentation'
            - theme_name: 테마 이름
            - palette: 색상 팔레트
            - company_name: 회사명
            - title: 프레젠테이션 제목
    """
    try:
        # PPTX 생성
        pptx_bytes = PresentationGenerator.generate_pptx(
            theme_name=request.theme_name,
            palette=request.palette,
            company_name=request.company_name,
            presentation_title=request.title
        )

        # 파일명
        filename = f"{request.company_name.replace(' ', '_')}_presentation.pptx"

        return StreamingResponse(
            iter([pptx_bytes.getvalue()]),
            media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate presentation: {str(e)}")


@router.post("/document")
async def export_document(request: ExportRequest):
    """
    문서 DOCX 생성 및 다운로드

    Args:
        request: ExportRequest
            - file_type: 'document'
            - theme_name: 테마 이름
            - palette: 색상 팔레트
            - company_name: 회사명
            - title: 문서 제목
    """
    try:
        # DOCX 생성
        docx_bytes = DocumentGenerator.generate_docx(
            theme_name=request.theme_name,
            palette=request.palette,
            company_name=request.company_name,
            document_title=request.title
        )

        # 파일명
        filename = f"{request.company_name.replace(' ', '_')}_document.docx"

        return StreamingResponse(
            iter([docx_bytes.getvalue()]),
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate document: {str(e)}")


@router.post("/all")
async def export_all(request: ExportRequest):
    """
    모든 파일 타입 생성 및 ZIP으로 다운로드 (선택사항)
    """
    try:
        # 타이포그래피 기본값
        typography = request.typography or {
            'family': 'system-ui',
            'size': '16px'
        }

        # 웹사이트 생성
        html_content = WebsiteGenerator.generate_html(
            theme_name=request.theme_name,
            palette=request.palette,
            typography=typography,
            company_name=request.company_name,
            tagline=request.title
        )

        # 프레젠테이션 생성
        pptx_bytes = PresentationGenerator.generate_pptx(
            theme_name=request.theme_name,
            palette=request.palette,
            company_name=request.company_name,
            presentation_title=request.title
        )

        # 문서 생성
        docx_bytes = DocumentGenerator.generate_docx(
            theme_name=request.theme_name,
            palette=request.palette,
            company_name=request.company_name,
            document_title=request.title
        )

        # ZIP 파일 생성
        import zipfile

        zip_buffer = BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            # HTML 파일
            zip_file.writestr(
                f"{request.company_name.replace(' ', '_')}_website.html",
                html_content
            )

            # PPTX 파일
            zip_file.writestr(
                f"{request.company_name.replace(' ', '_')}_presentation.pptx",
                pptx_bytes.getvalue()
            )

            # DOCX 파일
            zip_file.writestr(
                f"{request.company_name.replace(' ', '_')}_document.docx",
                docx_bytes.getvalue()
            )

        zip_buffer.seek(0)

        return StreamingResponse(
            iter([zip_buffer.getvalue()]),
            media_type="application/zip",
            headers={"Content-Disposition": f"attachment; filename={request.company_name.replace(' ', '_')}_files.zip"}
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate files: {str(e)}")
