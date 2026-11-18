"""Artifact Generator - 요구사항을 Universal Artifact IR로 변환"""

import uuid
import json
from datetime import datetime
from typing import List, Dict, Any, Optional

from .artifact_ir import (
    UniversalArtifactIR, ArtifactType, ArtifactGenerationRequest, ArtifactGenerationResult,
    PageContent, TextElement, LayoutElement, LayoutType, LayoutPatterns, DesignProfile
)
from .artifact_renderers import HTMLRenderer, PPTXRenderer, DOCXRenderer


class ArtifactGenerator:
    """사용자 요구사항을 Universal Artifact IR로 변환하고 렌더링하는 생성기"""

    def __init__(self):
        self.html_renderer = HTMLRenderer()
        self.pptx_renderer = PPTXRenderer()
        self.docx_renderer = DOCXRenderer()

    def generate(self, request: ArtifactGenerationRequest) -> ArtifactGenerationResult:
        """요구사항에서 Artifact IR을 생성하고 렌더링"""
        request_id = str(uuid.uuid4())

        try:
            # 1. Universal IR 생성
            ir = self._create_ir(request)

            # 2. 각 포맷별로 렌더링
            outputs = {}
            for target_type in request.targetTypes:
                output = self._render_format(ir, target_type)
                if output:
                    outputs[target_type] = output

            # 3. 결과 반환
            return ArtifactGenerationResult(
                requestId=request_id,
                ir=ir,
                outputs=outputs,
                status='success',
                renderingTime=0.0  # 실제로는 렌더링 시간 측정
            )

        except Exception as e:
            print(f"Error generating artifact: {e}")
            # 최소한의 IR이라도 반환하기 위해
            ir = UniversalArtifactIR(
                id=request_id,
                type=ArtifactType.WEBSITE,
                title=request.title,
                description=request.description,
            )
            return ArtifactGenerationResult(
                requestId=request_id,
                ir=ir,
                outputs={},
                status='error',
                errors=[str(e)]
            )

    def _create_ir(self, request: ArtifactGenerationRequest) -> UniversalArtifactIR:
        """요구사항에서 Universal Artifact IR 생성"""
        artifact_id = str(uuid.uuid4())

        # 디자인 프로필 선택
        design_profile = DesignProfile.get(request.designStyle)

        # 기본 페이지 구조 생성
        pages = self._generate_pages(request)

        # IR 구성
        ir = UniversalArtifactIR(
            id=artifact_id,
            type=self._select_primary_type(request.targetTypes),
            title=request.title,
            description=request.description,
            author='LARS Platform',
            version='1.0',
            createdAt=datetime.now().isoformat(),
            designTokens=design_profile,
            pages=pages,
            typeConfig=request.metadata,
            assets={},
        )

        return ir

    def _select_primary_type(self, target_types: List[ArtifactType]) -> ArtifactType:
        """우선순위에 따라 기본 타입 선택"""
        type_priority = {
            ArtifactType.WEBSITE: 3,
            ArtifactType.PRESENTATION: 2,
            ArtifactType.DOCUMENT: 1,
            ArtifactType.PDF: 0,
        }
        return max(target_types, key=lambda t: type_priority.get(t, 0))

    def _generate_pages(self, request: ArtifactGenerationRequest) -> List[PageContent]:
        """요구사항에서 페이지 구조 생성"""
        pages = []

        # 첫 번째 페이지: 타이틀/히어로
        pages.append(self._create_title_page(request))

        # 두 번째 페이지: 개요/설명
        if request.description:
            pages.append(self._create_overview_page(request))

        # 세 번째 페이지: 특징/내용
        pages.append(self._create_features_page(request))

        # 네 번째 페이지: 종료
        pages.append(self._create_closing_page(request))

        return pages

    def _create_title_page(self, request: ArtifactGenerationRequest) -> PageContent:
        """타이틀 페이지 생성"""
        return PageContent(
            id='page_01',
            title=request.title,
            subtitle=request.designStyle.capitalize() + ' Design',
            layout=LayoutPatterns.title_slide(
                title=request.title,
                subtitle=f"Created with {request.designStyle.capitalize()} Style"
            )
        )

    def _create_overview_page(self, request: ArtifactGenerationRequest) -> PageContent:
        """개요 페이지 생성"""
        bullets = [
            "Crafted with precision and attention to detail",
            "Responsive and mobile-friendly design",
            "Modern, clean, and professional aesthetic",
            "Optimized for user experience and engagement"
        ]

        return PageContent(
            id='page_02',
            title='Overview',
            subtitle=request.designStyle.capitalize() + ' Theme',
            layout=LayoutPatterns.content_slide(
                title=request.description[:100] if request.description else 'Overview',
                bullets=bullets
            )
        )

    def _create_features_page(self, request: ArtifactGenerationRequest) -> PageContent:
        """특징 페이지 생성"""
        features = [
            {
                'title': 'Design Quality',
                'description': 'High-quality design with attention to visual hierarchy'
            },
            {
                'title': 'Responsive Layout',
                'description': 'Adapts seamlessly to different screen sizes'
            },
            {
                'title': 'Consistent Branding',
                'description': f'Aligned with {request.designStyle} aesthetic'
            },
        ]

        return PageContent(
            id='page_03',
            title='Key Features',
            layout=LayoutPatterns.feature_grid(features)
        )

    def _create_closing_page(self, request: ArtifactGenerationRequest) -> PageContent:
        """종료 페이지 생성"""
        closing_text = f"""Thank you for using LARS Platform

This {request.designStyle} design was generated automatically.
Feel free to customize it further to match your brand identity."""

        return PageContent(
            id='page_04',
            title='Thank You',
            subtitle='Let\'s Create Something Amazing Together',
            layout=LayoutElement(
                type=LayoutType.BODY_PAGE,
                content=[
                    TextElement(content=closing_text, variant='body', align='center')
                ]
            )
        )

    def _render_format(self, ir: UniversalArtifactIR, target_type: ArtifactType) -> Optional[Any]:
        """IR을 특정 포맷으로 렌더링"""
        try:
            if target_type == ArtifactType.WEBSITE:
                return self.html_renderer.render(ir)
            elif target_type == ArtifactType.PRESENTATION:
                return self.pptx_renderer.render(ir)
            elif target_type == ArtifactType.DOCUMENT:
                return self.docx_renderer.render(ir)
            elif target_type == ArtifactType.PDF:
                # PDF 렌더러는 아직 구현되지 않음 (이전의 DOCX를 사용 가능)
                return self.docx_renderer.render(ir)
            else:
                return None
        except Exception as e:
            print(f"Error rendering {target_type.value}: {e}")
            return None


# 간편한 사용을 위한 함수들
def create_artifact(
    title: str,
    description: str,
    design_style: str = 'modern',
    target_types: Optional[List[str]] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> ArtifactGenerationResult:
    """Artifact 생성 편의 함수"""
    if target_types is None:
        target_types = ['website', 'presentation', 'document']

    request = ArtifactGenerationRequest(
        title=title,
        description=description,
        targetTypes=[ArtifactType(t) for t in target_types],
        designStyle=design_style,
        metadata=metadata or {},
    )

    generator = ArtifactGenerator()
    return generator.generate(request)


def generate_website(ir: UniversalArtifactIR) -> str:
    """IR에서 웹사이트 HTML 생성"""
    renderer = HTMLRenderer()
    return renderer.render(ir)


def generate_presentation(ir: UniversalArtifactIR) -> bytes:
    """IR에서 PPTX 생성"""
    from io import BytesIO
    renderer = PPTXRenderer()
    result = renderer.render(ir)
    if isinstance(result, BytesIO):
        return result.getvalue()
    return result


def generate_document(ir: UniversalArtifactIR) -> bytes:
    """IR에서 DOCX 생성"""
    from io import BytesIO
    renderer = DOCXRenderer()
    result = renderer.render(ir)
    if isinstance(result, BytesIO):
        return result.getvalue()
    return result
