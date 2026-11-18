"""PPTX Renderer - Universal IR을 PowerPoint로 렌더링"""

from io import BytesIO
from typing import Tuple
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.dml.color import RGBColor
from ..artifact_ir import (
    UniversalArtifactIR, TextElement, ImageElement, TableElement,
    LayoutType, PageContent
)
from .base_renderer import BaseArtifactRenderer


class PPTXRenderer(BaseArtifactRenderer):
    """IR을 PowerPoint (PPTX)로 렌더링하는 렌더러"""

    def _render_impl(self) -> BytesIO:
        """IR을 PPTX로 렌더링"""
        prs = Presentation()
        prs.slide_width = Inches(10)
        prs.slide_height = Inches(7.5)

        # 각 페이지를 슬라이드로 변환
        for page in self.ir.pages:
            self._render_slide(prs, page)

        # BytesIO에 저장
        output = BytesIO()
        prs.save(output)
        output.seek(0)

        return output

    def _render_slide(self, prs: Presentation, page: PageContent) -> None:
        """단일 페이지를 슬라이드로 렌더링"""
        # 빈 슬라이드 생성
        blank_slide_layout = prs.slide_layouts[6]  # Blank layout
        slide = prs.slides.add_slide(blank_slide_layout)

        # 배경색 설정
        background = slide.background
        fill = background.fill
        primary_color = self.get_color('primary')
        if page == self.ir.pages[0]:
            # 첫 번째 슬라이드는 그래디언트 배경
            fill.solid()
            fill.fore_color.rgb = self._hex_to_rgb(primary_color)
        else:
            fill.solid()
            fill.fore_color.rgb = self._hex_to_rgb(self.get_color('background'))

        # 레이아웃 타입에 따라 렌더링
        if page.layout.type == LayoutType.TITLE_SLIDE:
            self._render_title_slide(slide, page)
        elif page.layout.type == LayoutType.CONTENT_SLIDE:
            self._render_content_slide(slide, page)
        else:
            self._render_generic_slide(slide, page)

    def _render_title_slide(self, slide, page: PageContent) -> None:
        """타이틀 슬라이드 렌더링"""
        left = Inches(1)
        top = Inches(2.5)
        width = Inches(8)
        height = Inches(2.5)

        # 제목 텍스트박스
        title_box = slide.shapes.add_textbox(left, top, width, Inches(1.5))
        title_frame = title_box.text_frame
        title_frame.word_wrap = True
        title_frame.vertical_anchor = MSO_ANCHOR.MIDDLE

        title_p = title_frame.paragraphs[0]
        title_p.text = page.title
        title_p.font.size = Pt(54)
        title_p.font.bold = True
        title_p.font.color.rgb = self._hex_to_rgb('#FFFFFF')
        title_p.alignment = PP_ALIGN.CENTER

        # 부제목 텍스트박스
        if page.subtitle:
            subtitle_box = slide.shapes.add_textbox(left, Inches(4.2), width, Inches(1))
            subtitle_frame = subtitle_box.text_frame
            subtitle_frame.word_wrap = True

            subtitle_p = subtitle_frame.paragraphs[0]
            subtitle_p.text = page.subtitle
            subtitle_p.font.size = Pt(28)
            subtitle_p.font.color.rgb = self._hex_to_rgb('#E0E0E0')
            subtitle_p.alignment = PP_ALIGN.CENTER

    def _render_content_slide(self, slide, page: PageContent) -> None:
        """콘텐츠 슬라이드 렌더링"""
        # 제목
        title_box = slide.shapes.add_textbox(Inches(0.5), Inches(0.5), Inches(9), Inches(0.8))
        title_frame = title_box.text_frame
        title_p = title_frame.paragraphs[0]
        title_p.text = page.title
        title_p.font.size = Pt(44)
        title_p.font.bold = True
        title_p.font.color.rgb = self._hex_to_rgb(self.get_color('primary'))

        # 콘텐츠
        content_box = slide.shapes.add_textbox(Inches(1), Inches(1.5), Inches(8), Inches(5.5))
        content_frame = content_box.text_frame
        content_frame.word_wrap = True

        for element in page.layout.content:
            if isinstance(element, TextElement) and element.variant == 'body':
                p = content_frame.add_paragraph()
                p.text = element.content
                p.font.size = Pt(18)
                p.font.color.rgb = self._hex_to_rgb(self.get_color('text'))
                p.level = 0
                p.space_before = Pt(6)
                p.space_after = Pt(6)

    def _render_generic_slide(self, slide, page: PageContent) -> None:
        """일반 슬라이드 렌더링"""
        # 제목
        if page.title:
            title_box = slide.shapes.add_textbox(Inches(0.5), Inches(0.5), Inches(9), Inches(0.8))
            title_frame = title_box.text_frame
            title_p = title_frame.paragraphs[0]
            title_p.text = page.title
            title_p.font.size = Pt(40)
            title_p.font.bold = True
            title_p.font.color.rgb = self._hex_to_rgb(self.get_color('primary'))

        # 부제목
        if page.subtitle:
            subtitle_box = slide.shapes.add_textbox(Inches(0.5), Inches(1.3), Inches(9), Inches(0.6))
            subtitle_frame = subtitle_box.text_frame
            subtitle_p = subtitle_frame.paragraphs[0]
            subtitle_p.text = page.subtitle
            subtitle_p.font.size = Pt(20)
            subtitle_p.font.color.rgb = self._hex_to_rgb(self.get_color('textLight'))

        # 콘텐츠
        content_box = slide.shapes.add_textbox(Inches(0.5), Inches(2.2), Inches(9), Inches(4.8))
        content_frame = content_box.text_frame
        content_frame.word_wrap = True

        for element in page.layout.content:
            if isinstance(element, TextElement):
                p = content_frame.add_paragraph()
                p.text = element.content
                p.font.size = Pt(16)
                p.font.color.rgb = self._hex_to_rgb(self.get_color('text'))
                if element.content.startswith('•'):
                    p.level = 0
                p.space_before = Pt(4)
                p.space_after = Pt(4)

            elif isinstance(element, TableElement):
                self._render_table_on_slide(slide, element)

            elif isinstance(element, ImageElement):
                self._render_image_on_slide(slide, element)

    def _render_table_on_slide(self, slide, table: TableElement) -> None:
        """테이블을 슬라이드에 추가"""
        rows = len(table.rows) + 1  # Header 포함
        cols = len(table.headers)

        left = Inches(0.5)
        top = Inches(3)
        width = Inches(9)
        height = Inches(4)

        tbl = slide.shapes.add_table(rows, cols, left, top, width, height).table

        # 헤더
        for col_idx, header in enumerate(table.headers):
            cell = tbl.cell(0, col_idx)
            cell.text = header
            cell.fill.solid()
            cell.fill.fore_color.rgb = self._hex_to_rgb(self.get_color('primary'))

            for paragraph in cell.text_frame.paragraphs:
                for run in paragraph.runs:
                    run.font.bold = True
                    run.font.color.rgb = self._hex_to_rgb('#FFFFFF')

        # 데이터 행
        for row_idx, row_data in enumerate(table.rows, start=1):
            for col_idx, cell_data in enumerate(row_data):
                cell = tbl.cell(row_idx, col_idx)
                cell.text = cell_data
                if row_idx % 2 == 0:
                    cell.fill.solid()
                    cell.fill.fore_color.rgb = self._hex_to_rgb(self.get_color('surface'))

    def _render_image_on_slide(self, slide, img: ImageElement) -> None:
        """이미지를 슬라이드에 추가"""
        if img.url:
            try:
                left = Inches(1.5)
                top = Inches(3)
                width = Inches(7)
                height = Inches(3.5)
                slide.shapes.add_picture(img.url, left, top, width=width, height=height)
            except Exception as e:
                print(f"Failed to add image: {e}")
        elif img.placeholder:
            left = Inches(1.5)
            top = Inches(3)
            width = Inches(7)
            height = Inches(3.5)

            shape = slide.shapes.add_shape(
                1,  # Rectangle
                left, top, width, height
            )
            shape.fill.solid()
            shape.fill.fore_color.rgb = self._hex_to_rgb(img.placeholder)
            shape.line.color.rgb = self._hex_to_rgb(self.get_color('textLight'))

    def _hex_to_rgb(self, hex_color: str) -> RGBColor:
        """HEX 색상을 RGB로 변환"""
        hex_color = hex_color.lstrip('#')
        return RGBColor(
            int(hex_color[0:2], 16),
            int(hex_color[2:4], 16),
            int(hex_color[4:6], 16)
        )
