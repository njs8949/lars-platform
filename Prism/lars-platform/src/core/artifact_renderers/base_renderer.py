"""Base Renderer - 모든 렌더러의 기본 클래스"""

from abc import ABC, abstractmethod
from typing import Any, Dict
from datetime import datetime
from ..artifact_ir import UniversalArtifactIR, ArtifactType


class BaseArtifactRenderer(ABC):
    """모든 렌더러가 상속하는 기본 클래스"""

    def __init__(self):
        self.ir: UniversalArtifactIR = None
        self.rendered_at = None

    def render(self, ir: UniversalArtifactIR) -> Any:
        """IR을 렌더링하는 주요 메서드"""
        self.ir = ir
        self.rendered_at = datetime.now().isoformat()

        # 렌더러별 구현
        return self._render_impl()

    @abstractmethod
    def _render_impl(self) -> Any:
        """렌더러별 구현. 서브클래스에서 오버라이드"""
        pass

    def get_color(self, token_name: str) -> str:
        """Design Token에서 색상 가져오기"""
        return self.ir.designTokens.colors.get(token_name, '#000000')

    def get_font_family(self, type_: str = 'body') -> str:
        """Design Token에서 폰트 가져오기"""
        fonts = self.ir.designTokens.typography
        return fonts.get(type_, 'Inter, sans-serif')

    def get_spacing(self, size: str) -> int:
        """Design Token에서 스페이싱 가져오기"""
        return self.ir.designTokens.spacing.get(size, 16)

    def get_border_radius(self, size: str) -> int:
        """Design Token에서 보더 라디우스 가져오기"""
        return self.ir.designTokens.borderRadius.get(size, 8)

    def get_shadow(self, size: str) -> str:
        """Design Token에서 그림자 가져오기"""
        return self.ir.designTokens.shadows.get(size, 'none')

    def get_font_size(self, variant: str) -> int:
        """텍스트 크기 가져오기"""
        sizes = self.ir.designTokens.typography.get('sizes', {})
        return sizes.get(variant, 16)

    def get_title(self) -> str:
        """아티팩트 제목 가져오기"""
        return self.ir.title

    def get_description(self) -> str:
        """아티팩트 설명 가져오기"""
        return self.ir.description

    def get_metadata(self, key: str, default: Any = None) -> Any:
        """타입별 메타데이터 가져오기"""
        return self.ir.typeConfig.get(key, default)

    def log_render_info(self):
        """렌더링 정보 로깅"""
        print(f"Rendering {self.ir.type.value}: {self.ir.title}")
        print(f"  Pages: {len(self.ir.pages)}")
        print(f"  Design: {self.ir.designTokens.colors.get('primary', 'default')}")
