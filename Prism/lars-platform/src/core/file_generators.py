"""
파일 생성 엔진 (웹사이트, 프레젠테이션, 문서)
"""
from io import BytesIO
from typing import Dict, Any, Optional
from datetime import datetime
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN
from pptx.dml.color import RGBColor
from docx import Document
from docx.shared import Inches as DocInches, Pt as DocPt, RGBColor as DocRGBColor
from docx.enum.text import WD_PARAGRAPH_ALIGNMENT


class WebsiteGenerator:
    """웹사이트 HTML/CSS 생성"""

    @staticmethod
    def generate_html(
        theme_name: str,
        palette: Dict[str, str],
        typography: Dict[str, Any],
        company_name: str = "Your Company",
        tagline: str = "Create something amazing"
    ) -> str:
        """
        웹사이트 HTML 생성

        Args:
            theme_name: 테마 이름
            palette: 색상 팔레트 {'primary', 'secondary', 'accent', 'text', 'background'}
            typography: 타이포그래피 설정
            company_name: 회사명
            tagline: 태그라인
        """

        # 색상 기본값 설정
        colors = {
            'primary': palette.get('primary', '#0052CC'),
            'secondary': palette.get('secondary', '#667EEA'),
            'accent': palette.get('accent', '#F59E0B'),
            'text': palette.get('text', '#1F2937'),
            'text_light': palette.get('textLight', '#6B7280'),
            'background': palette.get('background', '#FFFFFF'),
            'surface': palette.get('surface', '#F9FAFB'),
        }

        # 폰트 설정
        font_family = typography.get('family', 'system-ui')

        html = f"""<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{company_name} - {tagline}</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}

        body {{
            font-family: '{font_family}', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            color: {colors['text']};
            background-color: {colors['background']};
            line-height: 1.6;
        }}

        /* Navigation */
        nav {{
            background-color: {colors['background']};
            padding: 1.5rem 2rem;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            position: sticky;
            top: 0;
            z-index: 100;
        }}

        nav .container {{
            max-width: 1200px;
            margin: 0 auto;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }}

        .logo {{
            font-size: 1.5rem;
            font-weight: 700;
            color: {colors['primary']};
        }}

        nav ul {{
            list-style: none;
            display: flex;
            gap: 2rem;
        }}

        nav a {{
            color: {colors['text']};
            text-decoration: none;
            transition: color 0.3s;
        }}

        nav a:hover {{
            color: {colors['primary']};
        }}

        /* Hero Section */
        .hero {{
            background: linear-gradient(135deg, {colors['primary']}, {colors['secondary']});
            color: white;
            padding: 6rem 2rem;
            text-align: center;
        }}

        .hero h1 {{
            font-size: 3.5rem;
            margin-bottom: 1rem;
            font-weight: 800;
        }}

        .hero p {{
            font-size: 1.25rem;
            margin-bottom: 2rem;
            opacity: 0.95;
        }}

        .btn {{
            display: inline-block;
            padding: 0.75rem 2rem;
            border-radius: 0.5rem;
            text-decoration: none;
            font-weight: 600;
            transition: all 0.3s ease;
            border: none;
            cursor: pointer;
            font-size: 1rem;
        }}

        .btn-primary {{
            background-color: {colors['accent']};
            color: white;
        }}

        .btn-primary:hover {{
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }}

        .btn-secondary {{
            background-color: white;
            color: {colors['primary']};
            margin-left: 1rem;
        }}

        .btn-secondary:hover {{
            background-color: {colors['surface']};
        }}

        /* Container */
        .container {{
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 2rem;
        }}

        /* Features Section */
        .features {{
            padding: 5rem 2rem;
            background-color: {colors['surface']};
        }}

        .section-title {{
            text-align: center;
            font-size: 2.5rem;
            margin-bottom: 1rem;
            color: {colors['text']};
        }}

        .section-subtitle {{
            text-align: center;
            color: {colors['text_light']};
            margin-bottom: 3rem;
            font-size: 1.125rem;
        }}

        .features-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem;
        }}

        .feature-card {{
            background-color: white;
            padding: 2rem;
            border-radius: 0.75rem;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            transition: all 0.3s ease;
        }}

        .feature-card:hover {{
            transform: translateY(-4px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }}

        .feature-icon {{
            width: 3rem;
            height: 3rem;
            background-color: {colors['primary']};
            border-radius: 0.5rem;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 1.5rem;
            margin-bottom: 1rem;
        }}

        .feature-card h3 {{
            color: {colors['text']};
            margin-bottom: 0.5rem;
            font-size: 1.25rem;
        }}

        .feature-card p {{
            color: {colors['text_light']};
        }}

        /* CTA Section */
        .cta {{
            background-color: {colors['primary']};
            color: white;
            padding: 4rem 2rem;
            text-align: center;
        }}

        .cta h2 {{
            font-size: 2rem;
            margin-bottom: 1rem;
        }}

        .cta p {{
            font-size: 1.125rem;
            margin-bottom: 2rem;
        }}

        /* Footer */
        footer {{
            background-color: {colors['text']};
            color: white;
            padding: 2rem;
            text-align: center;
        }}

        footer p {{
            opacity: 0.8;
        }}

        /* Responsive */
        @media (max-width: 768px) {{
            .hero h1 {{
                font-size: 2rem;
            }}

            nav ul {{
                gap: 1rem;
                font-size: 0.9rem;
            }}

            .section-title {{
                font-size: 1.75rem;
            }}
        }}
    </style>
</head>
<body>
    <!-- Navigation -->
    <nav>
        <div class="container">
            <div class="logo">{company_name}</div>
            <ul>
                <li><a href="#features">Features</a></li>
                <li><a href="#pricing">Pricing</a></li>
                <li><a href="#about">About</a></li>
                <li><a href="#contact">Contact</a></li>
            </ul>
        </div>
    </nav>

    <!-- Hero Section -->
    <section class="hero">
        <div class="container">
            <h1>{company_name}</h1>
            <p>{tagline}</p>
            <button class="btn btn-primary">Get Started</button>
            <button class="btn btn-secondary">Learn More</button>
        </div>
    </section>

    <!-- Features Section -->
    <section class="features" id="features">
        <div class="container">
            <h2 class="section-title">Why Choose Us</h2>
            <p class="section-subtitle">Experience the best features designed for your success</p>
            <div class="features-grid">
                <div class="feature-card">
                    <div class="feature-icon">✓</div>
                    <h3>High Performance</h3>
                    <p>Lightning-fast performance that keeps your users engaged and satisfied.</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">★</div>
                    <h3>Easy to Use</h3>
                    <p>Intuitive interface that requires no technical knowledge to get started.</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">◆</div>
                    <h3>Secure & Reliable</h3>
                    <p>Enterprise-grade security with 99.9% uptime guarantee.</p>
                </div>
            </div>
        </div>
    </section>

    <!-- CTA Section -->
    <section class="cta">
        <div class="container">
            <h2>Ready to Get Started?</h2>
            <p>Join thousands of satisfied customers today</p>
            <button class="btn btn-secondary">Start Free Trial</button>
        </div>
    </section>

    <!-- Footer -->
    <footer>
        <div class="container">
            <p>&copy; 2024 {company_name}. All rights reserved.</p>
            <p style="margin-top: 0.5rem; opacity: 0.6;">Generated by Prism Design System</p>
        </div>
    </footer>
</body>
</html>"""
        return html


class PresentationGenerator:
    """프레젠테이션 PPTX 생성"""

    @staticmethod
    def hex_to_rgb(hex_color: str) -> tuple:
        """HEX 색상을 RGB로 변환"""
        hex_color = hex_color.lstrip('#')
        return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

    @staticmethod
    def generate_pptx(
        theme_name: str,
        palette: Dict[str, str],
        company_name: str = "Your Company",
        presentation_title: str = "Professional Presentation"
    ) -> BytesIO:
        """
        프레젠테이션 PPTX 생성
        """
        prs = Presentation()
        prs.slide_width = Inches(10)
        prs.slide_height = Inches(7.5)

        # 색상 설정
        primary_rgb = PresentationGenerator.hex_to_rgb(palette.get('primary', '#0052CC'))
        secondary_rgb = PresentationGenerator.hex_to_rgb(palette.get('secondary', '#667EEA'))
        accent_rgb = PresentationGenerator.hex_to_rgb(palette.get('accent', '#F59E0B'))
        text_rgb = PresentationGenerator.hex_to_rgb(palette.get('text', '#1F2937'))

        # 슬라이드 1: 타이틀 슬라이드
        slide1 = prs.slides.add_slide(prs.slide_layouts[6])  # Blank layout
        background = slide1.background
        fill = background.fill
        fill.solid()
        fill.fore_color.rgb = RGBColor(*primary_rgb)

        # 타이틀
        title_box = slide1.shapes.add_textbox(Inches(0.5), Inches(2.5), Inches(9), Inches(1.5))
        title_frame = title_box.text_frame
        title_frame.word_wrap = True
        title_p = title_frame.paragraphs[0]
        title_p.text = presentation_title
        title_p.font.size = Pt(54)
        title_p.font.bold = True
        title_p.font.color.rgb = RGBColor(255, 255, 255)
        title_p.alignment = PP_ALIGN.CENTER

        # 서브타이틀
        subtitle_box = slide1.shapes.add_textbox(Inches(0.5), Inches(4), Inches(9), Inches(1))
        subtitle_frame = subtitle_box.text_frame
        subtitle_p = subtitle_frame.paragraphs[0]
        subtitle_p.text = company_name
        subtitle_p.font.size = Pt(32)
        subtitle_p.font.color.rgb = RGBColor(255, 255, 255)
        subtitle_p.alignment = PP_ALIGN.CENTER

        # 슬라이드 2: 콘텐츠 슬라이드
        slide2 = prs.slides.add_slide(prs.slide_layouts[6])
        background2 = slide2.background
        fill2 = background2.fill
        fill2.solid()
        fill2.fore_color.rgb = RGBColor(255, 255, 255)

        # 헤더
        header_shape = slide2.shapes.add_shape(1, Inches(0), Inches(0), Inches(10), Inches(1))
        header_shape.fill.solid()
        header_shape.fill.fore_color.rgb = RGBColor(*secondary_rgb)
        header_shape.line.color.rgb = RGBColor(*secondary_rgb)

        header_text = header_shape.text_frame
        header_p = header_text.paragraphs[0]
        header_p.text = "Key Points"
        header_p.font.size = Pt(40)
        header_p.font.bold = True
        header_p.font.color.rgb = RGBColor(255, 255, 255)
        header_p.alignment = PP_ALIGN.CENTER

        # 콘텐츠
        content_box = slide2.shapes.add_textbox(Inches(1), Inches(1.5), Inches(8), Inches(5.5))
        text_frame = content_box.text_frame
        text_frame.word_wrap = True

        points = [
            "✓ Point One - Clear and concise messaging",
            "✓ Point Two - Engaging visual design",
            "✓ Point Three - Professional layout",
            "✓ Point Four - Easy to customize"
        ]

        for i, point in enumerate(points):
            if i == 0:
                p = text_frame.paragraphs[0]
            else:
                p = text_frame.add_paragraph()
            p.text = point
            p.font.size = Pt(28)
            p.font.color.rgb = RGBColor(*text_rgb)
            p.space_before = Pt(12)
            p.level = 0

        # 슬라이드 3: 이미지 슬라이드
        slide3 = prs.slides.add_slide(prs.slide_layouts[6])
        background3 = slide3.background
        fill3 = background3.fill
        fill3.solid()
        fill3.fore_color.rgb = RGBColor(245, 245, 245)

        # 제목
        title_box3 = slide3.shapes.add_textbox(Inches(1), Inches(0.5), Inches(8), Inches(1))
        title_frame3 = title_box3.text_frame
        title_p3 = title_frame3.paragraphs[0]
        title_p3.text = "Results & Impact"
        title_p3.font.size = Pt(44)
        title_p3.font.bold = True
        title_p3.font.color.rgb = RGBColor(*primary_rgb)

        # 통계 박스들
        stats = [
            ("95%", "Satisfaction"),
            ("10x", "Faster"),
            ("100%", "Secure")
        ]

        for i, (value, label) in enumerate(stats):
            x_pos = Inches(1 + i * 3)
            stat_shape = slide3.shapes.add_shape(1, x_pos, Inches(2.5), Inches(2.5), Inches(2.5))
            stat_shape.fill.solid()
            stat_shape.fill.fore_color.rgb = RGBColor(*accent_rgb)
            stat_shape.line.color.rgb = RGBColor(*accent_rgb)

            # 숫자
            num_text = stat_shape.text_frame
            num_text.text = value
            num_p = num_text.paragraphs[0]
            num_p.font.size = Pt(48)
            num_p.font.bold = True
            num_p.font.color.rgb = RGBColor(255, 255, 255)
            num_p.alignment = PP_ALIGN.CENTER

            # 레이블
            label_box = slide3.shapes.add_textbox(x_pos, Inches(5.2), Inches(2.5), Inches(0.5))
            label_frame = label_box.text_frame
            label_p = label_frame.paragraphs[0]
            label_p.text = label
            label_p.font.size = Pt(18)
            label_p.font.color.rgb = RGBColor(*text_rgb)
            label_p.alignment = PP_ALIGN.CENTER

        # 슬라이드 4: 마무리 슬라이드
        slide4 = prs.slides.add_slide(prs.slide_layouts[6])
        background4 = slide4.background
        fill4 = background4.fill
        fill4.solid()
        fill4.fore_color.rgb = RGBColor(*primary_rgb)

        closing_text = slide4.shapes.add_textbox(Inches(1), Inches(3), Inches(8), Inches(1.5))
        closing_frame = closing_text.text_frame
        closing_frame.word_wrap = True
        closing_p = closing_frame.paragraphs[0]
        closing_p.text = "Thank You!"
        closing_p.font.size = Pt(60)
        closing_p.font.bold = True
        closing_p.font.color.rgb = RGBColor(255, 255, 255)
        closing_p.alignment = PP_ALIGN.CENTER

        subtitle_text = slide4.shapes.add_textbox(Inches(1), Inches(4.5), Inches(8), Inches(1))
        subtitle_frame = subtitle_text.text_frame
        subtitle_p = subtitle_frame.paragraphs[0]
        subtitle_p.text = "Questions & Discussion"
        subtitle_p.font.size = Pt(32)
        subtitle_p.font.color.rgb = RGBColor(255, 255, 255)
        subtitle_p.alignment = PP_ALIGN.CENTER

        # BytesIO에 저장
        output = BytesIO()
        prs.save(output)
        output.seek(0)
        return output


class DocumentGenerator:
    """문서 DOCX 생성"""

    @staticmethod
    def hex_to_rgb(hex_color: str) -> tuple:
        """HEX 색상을 RGB로 변환"""
        hex_color = hex_color.lstrip('#')
        return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

    @staticmethod
    def generate_docx(
        theme_name: str,
        palette: Dict[str, str],
        company_name: str = "Your Company",
        document_title: str = "Professional Document"
    ) -> BytesIO:
        """
        문서 DOCX 생성
        """
        doc = Document()

        # 색상 설정
        primary_rgb = DocumentGenerator.hex_to_rgb(palette.get('primary', '#0052CC'))
        accent_rgb = DocumentGenerator.hex_to_rgb(palette.get('accent', '#F59E0B'))

        # 타이틀
        title = doc.add_paragraph()
        title.alignment = WD_PARAGRAPH_ALIGNMENT.CENTER
        title_run = title.add_run(document_title)
        title_run.font.size = DocPt(28)
        title_run.font.bold = True
        title_run.font.color.rgb = DocRGBColor(*primary_rgb)

        # 회사명
        company = doc.add_paragraph()
        company.alignment = WD_PARAGRAPH_ALIGNMENT.CENTER
        company_run = company.add_run(company_name)
        company_run.font.size = DocPt(14)
        company_run.font.color.rgb = DocRGBColor(*primary_rgb)

        # 날짜
        date_para = doc.add_paragraph()
        date_para.alignment = WD_PARAGRAPH_ALIGNMENT.CENTER
        date_run = date_para.add_run(datetime.now().strftime("%B %d, %Y"))
        date_run.font.size = DocPt(11)
        date_run.font.italic = True

        # 구분선
        doc.add_paragraph("_" * 80)

        # Executive Summary
        summary_title = doc.add_paragraph()
        summary_title_run = summary_title.add_run("Executive Summary")
        summary_title_run.font.size = DocPt(16)
        summary_title_run.font.bold = True
        summary_title_run.font.color.rgb = DocRGBColor(*primary_rgb)

        summary_text = doc.add_paragraph(
            "This professional document has been generated using the Prism Design System. "
            "It provides a clean and professional layout that can be customized to meet your specific needs."
        )
        summary_text.style = 'Normal'

        # 섹션 1
        section1_title = doc.add_paragraph()
        section1_title_run = section1_title.add_run("Section 1: Introduction")
        section1_title_run.font.size = DocPt(14)
        section1_title_run.font.bold = True
        section1_title_run.font.color.rgb = DocRGBColor(*primary_rgb)

        intro_text = doc.add_paragraph(
            "Welcome to this professional document template. This section provides "
            "an introduction to the topic and sets the stage for the content that follows."
        )

        # 섹션 2
        section2_title = doc.add_paragraph()
        section2_title_run = section2_title.add_run("Section 2: Key Points")
        section2_title_run.font.size = DocPt(14)
        section2_title_run.font.bold = True
        section2_title_run.font.color.rgb = DocRGBColor(*primary_rgb)

        points = [
            "First key point with detailed explanation",
            "Second key point with supporting data",
            "Third key point highlighting important aspects",
            "Fourth key point with conclusions"
        ]

        for point in points:
            doc.add_paragraph(point, style='List Bullet')

        # 테이블 추가
        table = doc.add_table(rows=4, cols=3)
        table.style = 'Light Grid Accent 1'

        # 헤더 행
        header_cells = table.rows[0].cells
        header_cells[0].text = "Metric"
        header_cells[1].text = "Value"
        header_cells[2].text = "Status"

        # 데이터 행
        data = [
            ("Performance", "95%", "✓ Excellent"),
            ("Quality", "98%", "✓ Excellent"),
            ("Reliability", "99.9%", "✓ Excellent")
        ]

        for i, (metric, value, status) in enumerate(data, 1):
            row_cells = table.rows[i].cells
            row_cells[0].text = metric
            row_cells[1].text = value
            row_cells[2].text = status

        # 결론
        doc.add_paragraph()
        conclusion_title = doc.add_paragraph()
        conclusion_title_run = conclusion_title.add_run("Conclusion")
        conclusion_title_run.font.size = DocPt(14)
        conclusion_title_run.font.bold = True
        conclusion_title_run.font.color.rgb = DocRGBColor(*primary_rgb)

        conclusion_text = doc.add_paragraph(
            "This document demonstrates the capabilities of the Prism Design System. "
            "All elements are fully customizable and can be adjusted to match your brand guidelines."
        )

        # 푸터
        doc.add_paragraph()
        footer_para = doc.add_paragraph()
        footer_para.alignment = WD_PARAGRAPH_ALIGNMENT.CENTER
        footer_run = footer_para.add_run("Generated by Prism Design System")
        footer_run.font.size = DocPt(10)
        footer_run.font.italic = True
        footer_run.font.color.rgb = DocRGBColor(128, 128, 128)

        # BytesIO에 저장
        output = BytesIO()
        doc.save(output)
        output.seek(0)
        return output
