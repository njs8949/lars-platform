"""
Universal Artifact Intermediate Representation (IR)

모든 artifact 타입 (웹사이트, PPT, 문서, PDF 등)을 표현할 수 있는
통일된 중간 표현입니다.

이 IR을 중심으로 각각의 Renderer가 구현되므로,
한 번 생성된 Artifact IR로 여러 포맷의 산출물을 동시에 생성할 수 있습니다.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Literal
from enum import Enum


# ==================== Design Token System ====================

@dataclass
class DesignTokens:
    """모든 artifact에서 공유하는 디자인 토큰"""

    # 색상 팔레트
    colors: Dict[str, str] = field(default_factory=lambda: {
        'primary': '#0052CC',
        'secondary': '#667EEA',
        'accent': '#F59E0B',
        'text': '#1F2937',
        'textLight': '#6B7280',
        'background': '#FFFFFF',
        'surface': '#F9FAFB',
    })

    # 타이포그래피
    typography: Dict[str, Any] = field(default_factory=lambda: {
        'heading': 'Inter, sans-serif',
        'body': 'Inter, sans-serif',
        'mono': 'Fira Code, monospace',
        'sizes': {
            'h1': 32,
            'h2': 24,
            'h3': 20,
            'body': 16,
            'small': 14,
        }
    })

    # 레이아웃
    spacing: Dict[str, int] = field(default_factory=lambda: {
        'xs': 4,
        'sm': 8,
        'md': 16,
        'lg': 24,
        'xl': 32,
        '2xl': 48,
    })

    # 모서리
    borderRadius: Dict[str, int] = field(default_factory=lambda: {
        'sm': 4,
        'md': 8,
        'lg': 12,
        'xl': 16,
    })

    # 그림자
    shadows: Dict[str, str] = field(default_factory=lambda: {
        'sm': '0 1px 2px rgba(0,0,0,0.05)',
        'md': '0 4px 12px rgba(0,0,0,0.1)',
        'lg': '0 12px 32px rgba(0,0,0,0.15)',
    })


# ==================== Content Elements ====================

@dataclass
class TextElement:
    """텍스트 요소"""
    content: str
    variant: Literal['h1', 'h2', 'h3', 'body', 'small'] = 'body'
    align: Literal['left', 'center', 'right'] = 'left'
    color: Optional[str] = None


@dataclass
class ImageElement:
    """이미지 요소"""
    url: Optional[str] = None
    placeholder: Optional[str] = None  # HEX color
    alt: str = ''
    width: Optional[int] = None
    height: Optional[int] = None


@dataclass
class ChartElement:
    """차트 요소"""
    type: Literal['line', 'bar', 'pie', 'area'] = 'bar'
    title: str = ''
    data: List[Dict[str, Any]] = field(default_factory=list)


@dataclass
class ButtonElement:
    """버튼 요소"""
    label: str
    variant: Literal['primary', 'secondary', 'outline'] = 'primary'
    action: Optional[str] = None


@dataclass
class TableElement:
    """테이블 요소"""
    headers: List[str] = field(default_factory=list)
    rows: List[List[str]] = field(default_factory=list)


# ==================== Layout Primitives ====================

class LayoutType(str, Enum):
    """레이아웃 타입"""
    # 웹사이트
    HERO = "hero"
    FEATURE_GRID = "feature_grid"
    TWO_COLUMN = "two_column"
    THREE_COLUMN = "three_column"

    # PPT
    TITLE_SLIDE = "title_slide"
    CONTENT_SLIDE = "content_slide"
    FULL_IMAGE = "full_image"
    SPLIT_LAYOUT = "split_layout"

    # 문서
    COVER_PAGE = "cover_page"
    SECTION_PAGE = "section_page"
    BODY_PAGE = "body_page"
    SUMMARY_PAGE = "summary_page"


@dataclass
class LayoutElement:
    """레이아웃 요소 (컨테이너)"""
    type: LayoutType
    content: List[Any] = field(default_factory=list)
    config: Dict[str, Any] = field(default_factory=dict)

    # 레이아웃 설정
    padding: Optional[str] = None
    margin: Optional[str] = None
    backgroundColor: Optional[str] = None
    minHeight: Optional[int] = None
    maxWidth: Optional[int] = None


# ==================== Pages / Slides ====================

@dataclass
class PageContent:
    """페이지/슬라이드 기본 구조"""
    id: str
    title: str = ''
    subtitle: str = ''
    layout: LayoutElement = field(default_factory=lambda: LayoutElement(type=LayoutType.BODY_PAGE))
    metadata: Dict[str, Any] = field(default_factory=dict)


# ==================== Universal Artifact IR ====================

class ArtifactType(str, Enum):
    """산출물 타입"""
    WEBSITE = "website"
    PRESENTATION = "presentation"
    DOCUMENT = "document"
    PDF = "pdf"
    INFOGRAPHIC = "infographic"


@dataclass
class UniversalArtifactIR:
    """
    Universal Artifact Intermediate Representation

    모든 artifact 타입을 표현할 수 있는 통일된 구조입니다.
    각 Renderer는 이 IR을 받아서 자신의 포맷으로 변환합니다.
    """

    # 기본 정보
    id: str
    type: ArtifactType
    title: str
    description: str = ''

    # 메타데이터
    author: str = 'LARS Platform'
    version: str = '1.0'
    createdAt: str = ''

    # 디자인 토큰
    designTokens: DesignTokens = field(default_factory=DesignTokens)

    # 콘텐츠
    pages: List[PageContent] = field(default_factory=list)

    # 타입별 설정
    typeConfig: Dict[str, Any] = field(default_factory=dict)

    # 추가 리소스
    assets: Dict[str, Any] = field(default_factory=dict)  # 이미지, 아이콘 등


    def to_dict(self) -> Dict[str, Any]:
        """IR을 딕셔너리로 변환"""
        return {
            'id': self.id,
            'type': self.type.value,
            'title': self.title,
            'description': self.description,
            'author': self.author,
            'version': self.version,
            'createdAt': self.createdAt,
            'designTokens': self.designTokens.__dict__,
            'pages': [p.__dict__ for p in self.pages],
            'typeConfig': self.typeConfig,
            'assets': self.assets,
        }


    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'UniversalArtifactIR':
        """딕셔너리에서 IR 생성"""
        # 간단한 구현 (필요시 더 복잡하게 할 수 있음)
        return cls(
            id=data.get('id', ''),
            type=ArtifactType(data.get('type', 'website')),
            title=data.get('title', ''),
            description=data.get('description', ''),
            author=data.get('author', 'LARS Platform'),
            version=data.get('version', '1.0'),
            createdAt=data.get('createdAt', ''),
        )


# ==================== Artifact Generation Request ====================

@dataclass
class ArtifactGenerationRequest:
    """Artifact 생성 요청"""

    # 요구사항
    title: str
    description: str

    # 생성할 타입
    targetTypes: List[ArtifactType] = field(default_factory=lambda: [
        ArtifactType.WEBSITE,
        ArtifactType.PRESENTATION,
        ArtifactType.DOCUMENT,
    ])

    # 디자인 요구사항
    designStyle: str = 'modern'  # 'minimal', 'modern', 'corporate', 'creative', 'luxury', 'tech'
    theme: Dict[str, str] = field(default_factory=dict)

    # 추가 설정
    metadata: Dict[str, Any] = field(default_factory=dict)


# ==================== Artifact Generation Result ====================

@dataclass
class ArtifactGenerationResult:
    """Artifact 생성 결과"""

    # 요청 ID
    requestId: str

    # 생성된 IR
    ir: UniversalArtifactIR

    # 렌더링된 결과
    outputs: Dict[ArtifactType, Any] = field(default_factory=dict)
    # e.g., {
    #   ArtifactType.WEBSITE: <HTML content>,
    #   ArtifactType.PRESENTATION: <BytesIO of PPTX>,
    #   ArtifactType.DOCUMENT: <BytesIO of DOCX>,
    # }

    # 메타정보
    renderingTime: float = 0.0  # 초 단위
    status: str = 'success'
    errors: List[str] = field(default_factory=list)


# ==================== 레이아웃 패턴 라이브러리 ====================

class LayoutPatterns:
    """미리 정의된 레이아웃 패턴"""

    @staticmethod
    def hero_layout(title: str, subtitle: str, image: Optional[ImageElement] = None) -> LayoutElement:
        """히어로 섹션"""
        return LayoutElement(
            type=LayoutType.HERO,
            content=[
                TextElement(content=title, variant='h1'),
                TextElement(content=subtitle, variant='body'),
            ] + ([image] if image else []),
            config={
                'minHeight': 600,
                'align': 'center',
            }
        )

    @staticmethod
    def feature_grid(features: List[Dict[str, str]]) -> LayoutElement:
        """기능 그리드"""
        return LayoutElement(
            type=LayoutType.FEATURE_GRID,
            content=[
                LayoutElement(
                    type=LayoutType.BODY_PAGE,
                    content=[
                        TextElement(content=f.get('title', ''), variant='h3'),
                        TextElement(content=f.get('description', ''), variant='body'),
                    ]
                )
                for f in features
            ],
            config={
                'columns': 3,
                'gap': 'md',
            }
        )

    @staticmethod
    def title_slide(title: str, subtitle: str) -> LayoutElement:
        """PPT 타이틀 슬라이드"""
        return LayoutElement(
            type=LayoutType.TITLE_SLIDE,
            content=[
                TextElement(content=title, variant='h1', align='center'),
                TextElement(content=subtitle, variant='h3', align='center'),
            ],
            config={
                'minHeight': 720,
                'align': 'center',
            }
        )

    @staticmethod
    def content_slide(title: str, bullets: List[str]) -> LayoutElement:
        """PPT 콘텐츠 슬라이드"""
        return LayoutElement(
            type=LayoutType.CONTENT_SLIDE,
            content=[
                TextElement(content=title, variant='h2'),
            ] + [
                TextElement(content=f"• {bullet}", variant='body')
                for bullet in bullets
            ],
            config={
                'minHeight': 720,
                'padding': 'lg',
            }
        )


# ==================== 설정 프로필 ====================

class DesignProfile:
    """미리 정의된 디자인 프로필"""

    profiles = {
        'modern': DesignTokens(
            colors={
                'primary': '#0052CC',
                'secondary': '#667EEA',
                'accent': '#F59E0B',
                'text': '#1F2937',
                'textLight': '#6B7280',
                'background': '#FFFFFF',
                'surface': '#F9FAFB',
            }
        ),
        'corporate': DesignTokens(
            colors={
                'primary': '#1E3A8A',
                'secondary': '#3B82F6',
                'accent': '#374151',
                'text': '#0F172A',
                'textLight': '#475569',
                'background': '#FFFFFF',
                'surface': '#F1F5F9',
            }
        ),
        'creative': DesignTokens(
            colors={
                'primary': '#8B5CF6',
                'secondary': '#EC4899',
                'accent': '#F59E0B',
                'text': '#1F2937',
                'textLight': '#6B7280',
                'background': '#FFFFFF',
                'surface': '#FAF5FF',
            }
        ),
        'luxury': DesignTokens(
            colors={
                'primary': '#D4AF37',
                'secondary': '#2D3436',
                'accent': '#6C5CE7',
                'text': '#2D3436',
                'textLight': '#636E72',
                'background': '#FFFFFF',
                'surface': '#F8F9FA',
            }
        ),
        'tech': DesignTokens(
            colors={
                'primary': '#06B6D4',
                'secondary': '#0EA5E9',
                'accent': '#10B981',
                'text': '#0F172A',
                'textLight': '#64748B',
                'background': '#F8FAFC',
                'surface': '#1E293B',
            }
        ),
    }

    @classmethod
    def get(cls, profile_name: str) -> DesignTokens:
        """프로필 가져오기"""
        return cls.profiles.get(profile_name, DesignTokens())
