"""DOCX Renderer - Universal IR을 Word 문서로 렌더링"""

from io import BytesIO
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
from ..artifact_ir import (
    UniversalArtifactIR, TextElement, ImageElement, TableElement,
    PageContent
)
from .base_renderer import BaseArtifactRenderer


class DOCXRenderer(BaseArtifactRenderer):
    """IR을 Word 문서(DOCX)로 렌더링하는 렌더러"""

    def _render_impl(self) -> BytesIO:
        """IR을 DOCX로 렌더링"""
        doc = Document()

        # 문서 스타일 설정
        self._setup_document_styles(doc)

        # 제목
        title = doc.add_paragraph()
        title_run = title.add_run(self.get_title())
        title_run.font.size = Pt(28)
        title_run.font.bold = True
        title_run.font.color.rgb = self._hex_to_rgb(self.get_color('primary'))
        title.alignment = WD_ALIGN_PARAGRAPH.CENTER
        title.paragraph_format.space_after = Pt(12)

        # 설명
        if self.get_description():
            desc = doc.add_paragraph(self.get_description())
            desc.alignment = WD_ALIGN_PARAGRAPH.CENTER
            desc.paragraph_format.space_after = Pt(24)

        # 메타데이터
        metadata_para = doc.add_paragraph()
        metadata_para.add_run(f"Author: {self.ir.author}").font.size = Pt(10)
        metadata_para.paragraph_format.space_after = Pt(24)

        # 페이지별 렌더링
        for i, page in enumerate(self.ir.pages):
            if i > 0:
                doc.add_page_break()
            self._render_page(doc, page)

        # BytesIO에 저장
        output = BytesIO()
        doc.save(output)
        output.seek(0)

        return output

    def _setup_document_styles(self, doc: Document) -> None:
        """문서 스타일 설정"""
        # 제목 스타일
        style = doc.styles['Heading 1']
        style.font.size = Pt(24)
        style.font.bold = True
        style.font.color.rgb = self._hex_to_rgb(self.get_color('primary'))

        style = doc.styles['Heading 2']
        style.font.size = Pt(18)
        style.font.bold = True
        style.font.color.rgb = self._hex_to_rgb(self.get_color('secondary'))

        # 본문 스타일
        style = doc.styles['Normal']
        style.font.size = Pt(12)
        style.font.color.rgb = self._hex_to_rgb(self.get_color('text'))

    def _render_page(self, doc: Document, page: PageContent) -> None:
        """단일 페이지 렌더링"""
        # 페이지 제목
        if page.title:
            heading = doc.add_heading(page.title, level=1)
            heading.paragraph_format.space_after = Pt(12)

        # 페이지 부제목
        if page.subtitle:
            subtitle = doc.add_paragraph(page.subtitle)
            subtitle.paragraph_format.space_after = Pt(12)
            for run in subtitle.runs:
                run.font.size = Pt(12)
                run.font.italic = True
                run.font.color.rgb = self._hex_to_rgb(self.get_color('textLight'))

        # 레이아웃 콘텐츠 렌더링
        for element in page.layout.content:
            self._render_element(doc, element)

    def _render_element(self, doc: Document, element) -> None:
        """개별 요소 렌더링"""
        if isinstance(element, TextElement):
            para = doc.add_paragraph(element.content)

            if element.variant == 'h1':
                para.style = 'Heading 1'
            elif element.variant == 'h2':
                para.style = 'Heading 2'
            elif element.variant == 'h3':
                para.style = 'Heading 3'
            else:
                para.style = 'Normal'

            para.paragraph_format.space_after = Pt(6)

            if element.align == 'center':
                para.alignment = WD_ALIGN_PARAGRAPH.CENTER
            elif element.align == 'right':
                para.alignment = WD_ALIGN_PARAGRAPH.RIGHT

        elif isinstance(element, ImageElement):
            self._render_image(doc, element)

        elif isinstance(element, TableElement):
            self._render_table(doc, element)

        elif hasattr(element, 'content') and isinstance(element.content, list):
            # 중첩된 레이아웃
            for child in element.content:
                self._render_element(doc, child)

    def _render_image(self, doc: Document, img: ImageElement) -> None:
        """이미지 요소 렌더링"""
        if img.url:
            try:
                para = doc.add_paragraph()
                para.alignment = WD_ALIGN_PARAGRAPH.CENTER
                run = para.add_run()
                run.add_picture(img.url, width=Inches(5))
                para.paragraph_format.space_after = Pt(12)
            except Exception as e:
                print(f"Failed to add image: {e}")
                # 이미지 로드 실패 시 텍스트로 대체
                para = doc.add_paragraph(f"[Image: {img.alt}]")
                para.paragraph_format.space_after = Pt(12)

        elif img.placeholder:
            # 플레이스홀더는 문서에서 생략 (웹/PPT와 달리 배경색 표현 불가)
            if img.alt:
                para = doc.add_paragraph(f"[Placeholder: {img.alt}]")
                para.paragraph_format.space_after = Pt(12)

    def _render_table(self, doc: Document, table: TableElement) -> None:
        """테이블 요소 렌더링"""
        # 테이블 생성
        tbl = doc.add_table(rows=len(table.rows) + 1, cols=len(table.headers))
        tbl.style = 'Light Grid Accent 1'

        # 헤더
        hdr_cells = tbl.rows[0].cells
        for i, header in enumerate(table.headers):
            cell = hdr_cells[i]
            cell.text = header

            # 헤더 스타일
            for paragraph in cell.paragraphs:
                for run in paragraph.runs:
                    run.font.bold = True
                    run.font.color.rgb = self._hex_to_rgb('#FFFFFF')

            # 헤더 배경색
            shading_elm = OxmlElement('w:shd')
            shading_elm.set(qn('w:fill'), self.get_color('primary').lstrip('#'))
            cell._element.get_or_add_tcPr().append(shading_elm)

        # 데이터 행
        for row_idx, row_data in enumerate(table.rows, start=1):
            row_cells = tbl.rows[row_idx].cells
            for col_idx, cell_data in enumerate(row_data):
                if col_idx < len(row_cells):
                    cell = row_cells[col_idx]
                    cell.text = str(cell_data)

                    # 행 번갈아 배경색
                    if row_idx % 2 == 0:
                        shading_elm = OxmlElement('w:shd')
                        shading_elm.set(qn('w:fill'), self.get_color('surface').lstrip('#'))
                        cell._element.get_or_add_tcPr().append(shading_elm)

        # 테이블 여백
        tbl_pr = tbl._tblPr
        tbl_margins = OxmlElement('w:tblCellMar')
        for margin_name in ['top', 'left', 'bottom', 'right']:
            margin = OxmlElement(f'w:{margin_name}')
            margin.set(qn('w:w'), '100')
            margin.set(qn('w:type'), 'dxa')
            tbl_margins.append(margin)
        tbl_pr.append(tbl_margins)

    def _hex_to_rgb(self, hex_color: str) -> RGBColor:
        """HEX 색상을 RGB로 변환"""
        hex_color = hex_color.lstrip('#')
        return RGBColor(
            int(hex_color[0:2], 16),
            int(hex_color[2:4], 16),
            int(hex_color[4:6], 16)
        )
