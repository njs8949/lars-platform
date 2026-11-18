"""Artifact Generation API Routes - Universal Artifact IR 기반 생성 엔드포인트"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse, FileResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from io import BytesIO
import zipfile
import uuid
from datetime import datetime

from src.core.artifact_generator import ArtifactGenerator
from src.core.artifact_ir import ArtifactType, ArtifactGenerationRequest


router = APIRouter(prefix='/api/artifact', tags=['artifact-generation'])


# ==================== Request/Response Models ====================

class ArtifactCreateRequest(BaseModel):
    """Artifact 생성 요청"""
    title: str
    description: str
    designStyle: str = 'modern'  # modern, corporate, creative, luxury, tech
    targetTypes: List[str] = ['website', 'presentation', 'document']
    metadata: Optional[Dict[str, Any]] = {}


class ArtifactResponse(BaseModel):
    """Artifact 생성 응답"""
    requestId: str
    success: bool
    artifactTitle: str
    generatedAt: str
    outputs: Dict[str, str]  # 타입 → 파일 URL/ID
    errors: List[str] = []


# ==================== Routes ====================

_EXTENSIONS = {"website": "html", "presentation": "pptx", "document": "docx", "pdf": "pdf", "infographic": "png"}


def _save_artifact(request_id: str, artifact_type: str, content) -> bool:
    """생성된 산출물을 .lars/artifacts/<id>/ 에 저장한다. 바이트나 문자열만 저장하고, 빈 값은 건너뛴다."""
    from pathlib import Path as _Path
    data = content.getvalue() if hasattr(content, "getvalue") else content
    if isinstance(data, str):
        data = data.encode("utf-8")
    if not data or not isinstance(data, (bytes, bytearray)):
        return False
    folder = _Path(".lars") / "artifacts" / request_id
    folder.mkdir(parents=True, exist_ok=True)
    (folder / f"{artifact_type}.{_EXTENSIONS.get(artifact_type, 'bin')}").write_bytes(bytes(data))
    return True


@router.post('/create')
async def create_artifact(request: ArtifactCreateRequest) -> ArtifactResponse:
    """
    Universal Artifact 생성

    입력:
    - title: 생성할 artifact 제목
    - description: 상세 설명
    - designStyle: 디자인 스타일 (modern, corporate, creative, luxury, tech)
    - targetTypes: 생성할 포맷 (website, presentation, document, pdf)

    출력:
    - 요청 ID, 생성된 파일 정보, 에러 메시지
    """
    try:
        # 요청 생성
        artifact_request = ArtifactGenerationRequest(
            title=request.title,
            description=request.description,
            targetTypes=[ArtifactType(t) for t in request.targetTypes],
            designStyle=request.designStyle,
            metadata=request.metadata or {},
        )

        # Generator 실행
        generator = ArtifactGenerator()
        result = generator.generate(artifact_request)

        # 응답 생성
        outputs = {}
        for artifact_type, content in result.outputs.items():
            saved = _save_artifact(result.requestId, artifact_type.value, content)
            if saved:
                outputs[artifact_type.value] = f"/api/artifact/download/{result.requestId}/{artifact_type.value}"

        return ArtifactResponse(
            requestId=result.requestId,
            success=(result.status == 'success'),
            artifactTitle=result.ir.title,
            generatedAt=datetime.now().isoformat(),
            outputs=outputs,
            errors=result.errors,
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"Error creating artifact: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate artifact")


@router.get('/download/{request_id}/{artifact_type}')
async def download_artifact(request_id: str, artifact_type: str):
    """
    생성된 Artifact 다운로드

    지원 포맷:
    - website: HTML 파일
    - presentation: PPTX 파일
    - document: DOCX 파일
    - pdf: PDF 파일
    """
    import re as _re
    from pathlib import Path as _Path
    from fastapi.responses import FileResponse
    if not _re.fullmatch(r"[0-9a-f-]{36}", request_id) or artifact_type not in _EXTENSIONS:
        raise HTTPException(status_code=404, detail="Artifact not found")
    folder = _Path(".lars") / "artifacts" / request_id
    matches = list(folder.glob(f"{artifact_type}.*"))
    if not matches:
        raise HTTPException(status_code=404, detail="Artifact not found")
    return FileResponse(matches[0], filename=f"{request_id}.{matches[0].suffix.lstrip('.')}")


@router.post('/export-all')
async def export_all_formats(request: ArtifactCreateRequest):
    """
    모든 포맷을 한 번에 생성하고 ZIP으로 다운로드

    생성 포맷:
    - website: HTML 파일
    - presentation: PPTX 파일
    - document: DOCX 파일

    응답:
    - ZIP 파일 (모든 생성된 파일 포함)
    """
    try:
        # Artifact 생성
        artifact_request = ArtifactGenerationRequest(
            title=request.title,
            description=request.description,
            targetTypes=[ArtifactType.WEBSITE, ArtifactType.PRESENTATION, ArtifactType.DOCUMENT],
            designStyle=request.designStyle,
            metadata=request.metadata or {},
        )

        generator = ArtifactGenerator()
        result = generator.generate(artifact_request)

        if result.status != 'success':
            raise HTTPException(status_code=500, detail='Failed to generate artifacts')

        # ZIP 생성
        zip_buffer = BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            # 각 포맷별 파일 추가
            if ArtifactType.WEBSITE in result.outputs:
                html_content = result.outputs[ArtifactType.WEBSITE]
                zip_file.writestr(
                    f'{request.title.replace(" ", "_")}.html',
                    html_content if isinstance(html_content, str) else html_content.decode()
                )

            if ArtifactType.PRESENTATION in result.outputs:
                pptx_content = result.outputs[ArtifactType.PRESENTATION]
                if hasattr(pptx_content, 'getvalue'):
                    zip_file.writestr(
                        f'{request.title.replace(" ", "_")}.pptx',
                        pptx_content.getvalue()
                    )

            if ArtifactType.DOCUMENT in result.outputs:
                docx_content = result.outputs[ArtifactType.DOCUMENT]
                if hasattr(docx_content, 'getvalue'):
                    zip_file.writestr(
                        f'{request.title.replace(" ", "_")}.docx',
                        docx_content.getvalue()
                    )

        zip_buffer.seek(0)

        # ZIP 다운로드
        return StreamingResponse(
            iter([zip_buffer.getvalue()]),
            media_type='application/zip',
            headers={
                'Content-Disposition': f'attachment; filename="{request.title.replace(" ", "_")}_artifacts.zip"'
            }
        )

    except Exception as e:
        print(f"Error exporting artifacts: {e}")
        raise HTTPException(status_code=500, detail='Failed to export artifacts')


@router.get('/designs')
async def list_design_styles():
    """
    사용 가능한 디자인 스타일 목록

    응답:
    - styles: 사용 가능한 디자인 스타일 목록
    """
    return {
        'styles': [
            {
                'name': 'modern',
                'description': 'Modern, clean, and contemporary design',
            },
            {
                'name': 'corporate',
                'description': 'Professional and formal corporate design',
            },
            {
                'name': 'creative',
                'description': 'Creative and artistic design',
            },
            {
                'name': 'luxury',
                'description': 'Premium and luxurious design',
            },
            {
                'name': 'tech',
                'description': 'Tech-forward and modern design',
            },
        ]
    }


@router.get('/formats')
async def list_artifact_formats():
    """
    생성 가능한 artifact 포맷 목록

    응답:
    - formats: 사용 가능한 포맷 목록
    """
    return {
        'formats': [
            {
                'name': 'website',
                'extension': 'html',
                'mimeType': 'text/html',
                'description': 'Responsive HTML website',
            },
            {
                'name': 'presentation',
                'extension': 'pptx',
                'mimeType': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                'description': 'PowerPoint presentation',
            },
            {
                'name': 'document',
                'extension': 'docx',
                'mimeType': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'description': 'Microsoft Word document',
            },
            {
                'name': 'pdf',
                'extension': 'pdf',
                'mimeType': 'application/pdf',
                'description': 'PDF document (future)',
            },
        ]
    }


# ==================== Health Check ====================

@router.get('/health')
async def health_check():
    """Artifact 생성 엔진 상태 확인"""
    return {
        'status': 'healthy',
        'service': 'LARS Artifact Generation Engine',
        'version': '1.0',
    }
