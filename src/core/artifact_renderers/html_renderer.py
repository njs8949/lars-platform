"""HTML Renderer - Universal IR을 HTML/CSS로 렌더링"""

from typing import Any
from ..artifact_ir import (
    UniversalArtifactIR, TextElement, ImageElement, TableElement,
    ButtonElement, LayoutType, LayoutElement, PageContent
)
from .base_renderer import BaseArtifactRenderer


class HTMLRenderer(BaseArtifactRenderer):
    """IR을 반응형 HTML로 렌더링하는 렌더러"""

    def _render_impl(self) -> str:
        """IR을 완전한 HTML로 렌더링"""
        html_parts = []

        # DOCTYPE과 헤더
        html_parts.append(self._render_head())

        # 바디
        html_parts.append('<body>')
        html_parts.append(self._render_content())
        html_parts.append('</body>')

        html_parts.append('</html>')

        return '\n'.join(html_parts)

    def _render_head(self) -> str:
        """HTML 헤더 부분"""
        primary_color = self.get_color('primary')
        body_font = self.get_font_family('body')
        heading_font = self.get_font_family('heading')

        return f"""<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{self.get_title()}</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}

        :root {{
            --primary: {primary_color};
            --secondary: {self.get_color('secondary')};
            --accent: {self.get_color('accent')};
            --text: {self.get_color('text')};
            --text-light: {self.get_color('textLight')};
            --background: {self.get_color('background')};
            --surface: {self.get_color('surface')};
            --spacing-xs: {self.get_spacing('xs')}px;
            --spacing-sm: {self.get_spacing('sm')}px;
            --spacing-md: {self.get_spacing('md')}px;
            --spacing-lg: {self.get_spacing('lg')}px;
            --spacing-xl: {self.get_spacing('xl')}px;
            --radius-md: {self.get_border_radius('md')}px;
            --shadow-md: {self.get_shadow('md')};
        }}

        html, body {{
            height: 100%;
            font-family: {body_font};
            color: var(--text);
            background-color: var(--background);
            line-height: 1.6;
        }}

        h1, h2, h3, h4, h5, h6 {{
            font-family: {heading_font};
            font-weight: 700;
            margin-bottom: var(--spacing-md);
        }}

        h1 {{
            font-size: {self.get_font_size('h1')}px;
            line-height: 1.2;
        }}

        h2 {{
            font-size: {self.get_font_size('h2')}px;
        }}

        h3 {{
            font-size: {self.get_font_size('h3')}px;
        }}

        p {{
            margin-bottom: var(--spacing-md);
            font-size: {self.get_font_size('body')}px;
        }}

        /* Layout Components */
        .hero {{
            min-height: 600px;
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: var(--spacing-xl);
        }}

        .hero h1 {{
            font-size: 48px;
            margin-bottom: var(--spacing-md);
            color: white;
        }}

        .hero p {{
            font-size: 20px;
            max-width: 600px;
            color: rgba(255, 255, 255, 0.9);
        }}

        .feature-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: var(--spacing-lg);
            padding: var(--spacing-xl);
            max-width: 1200px;
            margin: 0 auto;
        }}

        .feature-card {{
            background: var(--surface);
            padding: var(--spacing-lg);
            border-radius: var(--radius-md);
            box-shadow: var(--shadow-md);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }}

        .feature-card:hover {{
            transform: translateY(-4px);
            box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2);
        }}

        .feature-card h3 {{
            color: var(--primary);
            margin-bottom: var(--spacing-md);
        }}

        /* Content Sections */
        .section {{
            padding: var(--spacing-xl);
            max-width: 1200px;
            margin: 0 auto;
        }}

        .section.alt {{
            background-color: var(--surface);
        }}

        /* Buttons */
        .btn {{
            display: inline-block;
            padding: 12px 24px;
            border-radius: var(--radius-md);
            border: none;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            text-decoration: none;
        }}

        .btn-primary {{
            background-color: var(--primary);
            color: white;
        }}

        .btn-primary:hover {{
            opacity: 0.9;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }}

        .btn-secondary {{
            background-color: var(--secondary);
            color: white;
        }}

        .btn-outline {{
            background-color: transparent;
            color: var(--primary);
            border: 2px solid var(--primary);
        }}

        .btn-outline:hover {{
            background-color: var(--surface);
        }}

        /* Tables */
        table {{
            width: 100%;
            border-collapse: collapse;
            margin: var(--spacing-lg) 0;
            background-color: white;
            box-shadow: var(--shadow-md);
            border-radius: var(--radius-md);
            overflow: hidden;
        }}

        thead {{
            background-color: var(--primary);
            color: white;
        }}

        th, td {{
            padding: var(--spacing-md);
            text-align: left;
            border-bottom: 1px solid #e0e0e0;
        }}

        tr:hover {{
            background-color: var(--surface);
        }}

        /* Responsive */
        @media (max-width: 768px) {{
            .hero {{
                min-height: 400px;
            }}

            .hero h1 {{
                font-size: 32px;
            }}

            .feature-grid {{
                grid-template-columns: 1fr;
            }}

            .section {{
                padding: var(--spacing-lg);
            }}
        }}

        /* Footer */
        footer {{
            background-color: var(--text);
            color: white;
            text-align: center;
            padding: var(--spacing-lg);
            margin-top: auto;
        }}
    </style>
</head>"""

    def _render_content(self) -> str:
        """본문 콘텐츠 렌더링"""
        parts = []

        # 페이지별로 렌더링
        for i, page in enumerate(self.ir.pages):
            parts.append(f'<!-- Page {i + 1}: {page.title} -->')
            parts.append(self._render_page(page))

        # 푸터
        parts.append('<footer>')
        parts.append(f'<p>&copy; {self.ir.author} - {self.get_title()}</p>')
        parts.append('</footer>')

        return '\n'.join(parts)

    def _render_page(self, page: PageContent) -> str:
        """단일 페이지 렌더링"""
        if page.layout.type == LayoutType.HERO:
            return self._render_hero(page.layout)
        elif page.layout.type == LayoutType.FEATURE_GRID:
            return self._render_feature_grid(page.layout)
        else:
            return self._render_generic_section(page)

    def _render_hero(self, layout: LayoutElement) -> str:
        """히어로 섹션 렌더링"""
        html = ['<section class="hero">']
        html.append('<div style="max-width: 800px; width: 100%;">')

        for element in layout.content:
            if isinstance(element, TextElement):
                if element.variant == 'h1':
                    html.append(f'<h1>{element.content}</h1>')
                else:
                    html.append(f'<p>{element.content}</p>')
            elif isinstance(element, ImageElement):
                html.append(self._render_image(element))

        html.append('</div>')
        html.append('</section>')
        return '\n'.join(html)

    def _render_feature_grid(self, layout: LayoutElement) -> str:
        """기능 그리드 렌더링"""
        html = ['<section class="section">']
        html.append('<div class="feature-grid">')

        for item in layout.content:
            if isinstance(item, LayoutElement):
                html.append('<div class="feature-card">')
                for element in item.content:
                    if isinstance(element, TextElement):
                        if element.variant in ['h2', 'h3']:
                            html.append(f'<{element.variant}>{element.content}</{element.variant}>')
                        else:
                            html.append(f'<p>{element.content}</p>')
                html.append('</div>')

        html.append('</div>')
        html.append('</section>')
        return '\n'.join(html)

    def _render_generic_section(self, page: PageContent) -> str:
        """일반 섹션 렌더링"""
        html = ['<section class="section">']

        if page.title:
            html.append(f'<h2>{page.title}</h2>')
        if page.subtitle:
            html.append(f'<p>{page.subtitle}</p>')

        # 레이아웃 콘텐츠 렌더링
        for element in page.layout.content:
            html.append(self._render_element(element))

        html.append('</section>')
        return '\n'.join(html)

    def _render_element(self, element: Any) -> str:
        """개별 요소 렌더링"""
        if isinstance(element, TextElement):
            if element.variant.startswith('h'):
                return f'<{element.variant}>{element.content}</{element.variant}>'
            else:
                return f'<p style="text-align: {element.align}; color: {element.color or "inherit"}">{element.content}</p>'

        elif isinstance(element, ImageElement):
            return self._render_image(element)

        elif isinstance(element, TableElement):
            return self._render_table(element)

        elif isinstance(element, ButtonElement):
            variant_class = f'btn-{element.variant}'
            href = element.action or '#'
            return f'<a href="{href}" class="btn {variant_class}">{element.label}</a>'

        elif isinstance(element, LayoutElement):
            # 중첩된 레이아웃
            parts = []
            for child in element.content:
                parts.append(self._render_element(child))
            return '\n'.join(parts)

        return ''

    def _render_image(self, img: ImageElement) -> str:
        """이미지 요소 렌더링"""
        if img.url:
            return f'<img src="{img.url}" alt="{img.alt}" style="max-width: 100%; height: auto; margin: var(--spacing-md) 0;">'
        elif img.placeholder:
            size = f"width: {img.width or 400}px; height: {img.height or 300}px;" if img.width or img.height else "width: 100%; height: 300px;"
            return f'<div style="background-color: {img.placeholder}; {size}; border-radius: var(--radius-md); margin: var(--spacing-md) 0;"></div>'
        return ''

    def _render_table(self, table: TableElement) -> str:
        """테이블 요소 렌더링"""
        html = ['<table>']
        html.append('<thead><tr>')

        for header in table.headers:
            html.append(f'<th>{header}</th>')

        html.append('</tr></thead>')
        html.append('<tbody>')

        for row in table.rows:
            html.append('<tr>')
            for cell in row:
                html.append(f'<td>{cell}</td>')
            html.append('</tr>')

        html.append('</tbody>')
        html.append('</table>')

        return '\n'.join(html)
