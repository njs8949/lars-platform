"""
Template Generator - Create realistic PowerPoint and Word documents
Supports: Canvas preview, actual file generation, streaming, batch generation, customization
"""

from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE

from docx import Document
from docx.shared import Inches as DocInches, Pt as DocPt, RGBColor as DocRGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

import io
import os
import zipfile
from typing import Dict, Any, Tuple, List
from datetime import datetime

# ==================== COLOR PALETTES ====================

COLOR_PALETTES = {
    'corporate': {
        'primary': RGBColor(0, 51, 102),      # Dark blue
        'secondary': RGBColor(255, 153, 0),   # Orange
        'accent': RGBColor(51, 102, 153),     # Light blue
        'text': RGBColor(51, 51, 51),         # Dark gray
        'light': RGBColor(240, 240, 240),     # Light gray
    },
    'creative': {
        'primary': RGBColor(230, 126, 34),    # Orange
        'secondary': RGBColor(52, 152, 219),  # Blue
        'accent': RGBColor(155, 89, 182),     # Purple
        'text': RGBColor(44, 62, 80),         # Dark slate
        'light': RGBColor(236, 240, 241),     # Cloudy
    },
    'modern': {
        'primary': RGBColor(26, 188, 156),    # Teal
        'secondary': RGBColor(46, 204, 113),  # Green
        'accent': RGBColor(41, 128, 185),     # Deep blue
        'text': RGBColor(52, 73, 94),         # Blue gray
        'light': RGBColor(236, 240, 241),     # Light
    },
    'elegant': {
        'primary': RGBColor(44, 62, 80),      # Dark blue gray
        'secondary': RGBColor(189, 195, 199), # Silver
        'accent': RGBColor(127, 140, 141),    # Asbestos
        'text': RGBColor(52, 73, 94),         # Text color
        'light': RGBColor(252, 252, 252),     # White
    },
    'startup': {
        'primary': RGBColor(231, 76, 60),     # Red
        'secondary': RGBColor(52, 152, 219),  # Blue
        'accent': RGBColor(241, 196, 15),     # Yellow
        'text': RGBColor(44, 62, 80),         # Dark
        'light': RGBColor(255, 255, 255),     # White
    },
}

# ==================== POWERPOINT TEMPLATES ====================

class PowerPointGenerator:
    def __init__(self, template_name: str, palette: str = 'corporate'):
        self.prs = Presentation()
        self.prs.slide_width = Inches(10)
        self.prs.slide_height = Inches(7.5)
        self.template_name = template_name
        self.palette = COLOR_PALETTES.get(palette, COLOR_PALETTES['corporate'])

    def add_title_slide(self, title: str, subtitle: str = ""):
        """Add a professional title slide"""
        slide = self.prs.slides.add_slide(self.prs.slide_layouts[6])
        background = slide.background
        fill = background.fill
        fill.solid()
        fill.fore_color.rgb = self.palette['primary']

        # Title
        title_box = slide.shapes.add_textbox(Inches(0.5), Inches(2.5), Inches(9), Inches(1.5))
        title_frame = title_box.text_frame
        title_frame.word_wrap = True
        title_frame.text = title
        title_frame.paragraphs[0].font.size = Pt(54)
        title_frame.paragraphs[0].font.bold = True
        title_frame.paragraphs[0].font.color.rgb = RGBColor(255, 255, 255)

        # Subtitle
        if subtitle:
            subtitle_box = slide.shapes.add_textbox(Inches(0.5), Inches(4.2), Inches(9), Inches(2))
            subtitle_frame = subtitle_box.text_frame
            subtitle_frame.word_wrap = True
            subtitle_frame.text = subtitle
            subtitle_frame.paragraphs[0].font.size = Pt(24)
            subtitle_frame.paragraphs[0].font.color.rgb = self.palette['secondary']

        # Accent line
        line = slide.shapes.add_shape(
            MSO_SHAPE.RECTANGLE,
            Inches(0.5), Inches(4.0), Inches(9), Inches(0.05)
        )
        line.fill.solid()
        line.fill.fore_color.rgb = self.palette['secondary']
        line.line.color.rgb = self.palette['secondary']

    def add_content_slide(self, title: str, content_items: list):
        """Add a content slide with bullet points"""
        slide = self.prs.slides.add_slide(self.prs.slide_layouts[6])
        background = slide.background
        fill = background.fill
        fill.solid()
        fill.fore_color.rgb = self.palette['light']

        # Header bar
        header = slide.shapes.add_shape(
            MSO_SHAPE.RECTANGLE,
            Inches(0), Inches(0), Inches(10), Inches(0.8)
        )
        header.fill.solid()
        header.fill.fore_color.rgb = self.palette['primary']
        header.line.color.rgb = self.palette['primary']

        # Title
        title_box = slide.shapes.add_textbox(Inches(0.5), Inches(0.15), Inches(9), Inches(0.6))
        title_frame = title_box.text_frame
        title_frame.text = title
        title_frame.paragraphs[0].font.size = Pt(40)
        title_frame.paragraphs[0].font.bold = True
        title_frame.paragraphs[0].font.color.rgb = RGBColor(255, 255, 255)

        # Content
        content_box = slide.shapes.add_textbox(Inches(1), Inches(1.2), Inches(8), Inches(5.8))
        text_frame = content_box.text_frame
        text_frame.word_wrap = True

        for i, item in enumerate(content_items):
            if i > 0:
                text_frame.add_paragraph()
            p = text_frame.paragraphs[i]
            p.text = "• " + item
            p.font.size = Pt(18)
            p.font.color.rgb = self.palette['text']
            p.space_before = Pt(6)
            p.space_after = Pt(6)

    def add_two_column_slide(self, title: str, left_title: str, left_items: list,
                            right_title: str, right_items: list):
        """Add a two-column layout slide"""
        slide = self.prs.slides.add_slide(self.prs.slide_layouts[6])
        background = slide.background
        fill = background.fill
        fill.solid()
        fill.fore_color.rgb = self.palette['light']

        # Header
        header = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(10), Inches(0.8))
        header.fill.solid()
        header.fill.fore_color.rgb = self.palette['primary']
        header.line.color.rgb = self.palette['primary']

        title_box = slide.shapes.add_textbox(Inches(0.5), Inches(0.15), Inches(9), Inches(0.6))
        title_frame = title_box.text_frame
        title_frame.text = title
        title_frame.paragraphs[0].font.size = Pt(40)
        title_frame.paragraphs[0].font.bold = True
        title_frame.paragraphs[0].font.color.rgb = RGBColor(255, 255, 255)

        # Left column
        left_header = slide.shapes.add_textbox(Inches(0.5), Inches(1.1), Inches(4), Inches(0.4))
        left_header.text_frame.text = left_title
        left_header.text_frame.paragraphs[0].font.size = Pt(20)
        left_header.text_frame.paragraphs[0].font.bold = True
        left_header.text_frame.paragraphs[0].font.color.rgb = self.palette['primary']

        left_box = slide.shapes.add_textbox(Inches(0.5), Inches(1.6), Inches(4.5), Inches(5.3))
        left_frame = left_box.text_frame
        left_frame.word_wrap = True
        for i, item in enumerate(left_items):
            if i > 0:
                left_frame.add_paragraph()
            p = left_frame.paragraphs[i]
            p.text = "• " + item
            p.font.size = Pt(14)
            p.font.color.rgb = self.palette['text']

        # Right column
        right_header = slide.shapes.add_textbox(Inches(5.2), Inches(1.1), Inches(4), Inches(0.4))
        right_header.text_frame.text = right_title
        right_header.text_frame.paragraphs[0].font.size = Pt(20)
        right_header.text_frame.paragraphs[0].font.bold = True
        right_header.text_frame.paragraphs[0].font.color.rgb = self.palette['primary']

        right_box = slide.shapes.add_textbox(Inches(5.2), Inches(1.6), Inches(4.3), Inches(5.3))
        right_frame = right_box.text_frame
        right_frame.word_wrap = True
        for i, item in enumerate(right_items):
            if i > 0:
                right_frame.add_paragraph()
            p = right_frame.paragraphs[i]
            p.text = "• " + item
            p.font.size = Pt(14)
            p.font.color.rgb = self.palette['text']

    def save(self) -> bytes:
        """Save presentation to bytes"""
        output = io.BytesIO()
        self.prs.save(output)
        output.seek(0)
        return output.getvalue()

    def save_file(self, filepath: str):
        """Save presentation to file"""
        self.prs.save(filepath)


# ==================== WORD DOCUMENT TEMPLATES ====================

class WordGenerator:
    def __init__(self, template_name: str, palette: str = 'corporate'):
        self.doc = Document()
        self.template_name = template_name
        self.palette = COLOR_PALETTES.get(palette, COLOR_PALETTES['corporate'])
        self._setup_styles()

    def _setup_styles(self):
        """Setup custom paragraph styles"""
        style = self.doc.styles['Normal']
        style.font.name = 'Calibri'
        style.font.size = DocPt(11)

    def add_title(self, title: str, subtitle: str = ""):
        """Add document title"""
        title_para = self.doc.add_paragraph()
        title_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = title_para.add_run(title)
        run.font.size = DocPt(28)
        run.font.bold = True
        run.font.color.rgb = DocRGBColor(*self.palette['primary'])

        if subtitle:
            subtitle_para = self.doc.add_paragraph()
            subtitle_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
            sub_run = subtitle_para.add_run(subtitle)
            sub_run.font.size = DocPt(14)
            sub_run.font.color.rgb = DocRGBColor(*self.palette['secondary'])

        self.doc.add_paragraph()  # Spacing

    def add_heading(self, text: str, level: int = 1):
        """Add section heading"""
        para = self.doc.add_paragraph()
        run = para.add_run(text)
        run.font.size = DocPt(16 if level == 1 else 14)
        run.font.bold = True
        run.font.color.rgb = DocRGBColor(*self.palette['primary'])

        # Add bottom border
        pPr = para._element.get_or_add_pPr()
        pBdr = OxmlElement('w:pBdr')
        bottom = OxmlElement('w:bottom')
        bottom.set(qn('w:val'), 'single')
        bottom.set(qn('w:sz'), '12')
        bottom.set(qn('w:space'), '1')
        bottom.set(qn('w:color'), '%02x%02x%02x' % self.palette['primary'])
        pBdr.append(bottom)
        pPr.append(pBdr)

    def add_paragraph(self, text: str, bold: bool = False, italic: bool = False):
        """Add paragraph"""
        para = self.doc.add_paragraph(text)
        for run in para.runs:
            run.font.bold = bold
            run.font.italic = italic

    def add_bullet_list(self, items: list):
        """Add bullet list"""
        for item in items:
            self.doc.add_paragraph(item, style='List Bullet')

    def add_table(self, rows: list, header: list):
        """Add table with header"""
        table = self.doc.add_table(rows=len(rows) + 1, cols=len(header))
        table.style = 'Light Grid Accent 1'

        # Header
        header_cells = table.rows[0].cells
        for i, h in enumerate(header):
            header_cells[i].text = h
            # Style header
            for paragraph in header_cells[i].paragraphs:
                for run in paragraph.runs:
                    run.font.bold = True
                    run.font.color.rgb = DocRGBColor(255, 255, 255)
            # Header background
            shading_elm = OxmlElement('w:shd')
            shading_elm.set(qn('w:fill'), '%02x%02x%02x' % self.palette['primary'])
            header_cells[i]._element.get_or_add_pPr().append(shading_elm)

        # Data rows
        for row_idx, row_data in enumerate(rows):
            row_cells = table.rows[row_idx + 1].cells
            for col_idx, cell_data in enumerate(row_data):
                row_cells[col_idx].text = str(cell_data)

    def save(self) -> bytes:
        """Save document to bytes"""
        output = io.BytesIO()
        self.doc.save(output)
        output.seek(0)
        return output.getvalue()

    def save_file(self, filepath: str):
        """Save document to file"""
        self.doc.save(filepath)


# ==================== TEMPLATE DEFINITIONS ====================

PRESENTATION_TEMPLATES = {
    'corporate': {
        'palette': 'corporate',
        'slides': [
            {
                'type': 'title',
                'title': '2026 Strategic Overview',
                'subtitle': 'Corporate Excellence & Innovation'
            },
            {
                'type': 'content',
                'title': 'Executive Summary',
                'items': [
                    'Record-breaking financial performance',
                    'Market leadership in key segments',
                    'Strategic acquisitions completed',
                    'Global expansion initiatives launched',
                    'Innovative product pipeline'
                ]
            },
            {
                'type': 'two_column',
                'title': 'Key Achievements',
                'left_title': '2025 Results',
                'left_items': ['Revenue +25%', 'Profit margins improved', 'Market share growth', 'Employee satisfaction up'],
                'right_title': '2026 Goals',
                'right_items': ['Revenue +30%', 'New markets entry', 'R&D investment doubled', 'Sustainability targets']
            },
            {
                'type': 'content',
                'title': 'Implementation Strategy',
                'items': [
                    'Phase 1: Infrastructure modernization',
                    'Phase 2: Digital transformation',
                    'Phase 3: Market expansion',
                    'Phase 4: Innovation acceleration'
                ]
            },
            {
                'type': 'content',
                'title': 'Thank You',
                'items': ['Questions & Discussion', 'Contact: corporate@example.com']
            }
        ]
    },
    'creative': {
        'palette': 'creative',
        'slides': [
            {
                'type': 'title',
                'title': 'Creative Vision 2026',
                'subtitle': 'Design & Innovation Excellence'
            },
            {
                'type': 'content',
                'title': 'Our Creative Process',
                'items': [
                    'Discovery: Understanding client needs',
                    'Strategy: Defining creative direction',
                    'Design: Crafting visual excellence',
                    'Iteration: Refining and optimizing',
                    'Delivery: Launch and support'
                ]
            },
            {
                'type': 'two_column',
                'title': 'Portfolio Highlights',
                'left_title': 'Digital Projects',
                'left_items': ['Web applications', 'Mobile platforms', 'Interactive experiences', 'Brand ecosystems'],
                'right_title': 'Design Services',
                'right_items': ['UI/UX design', 'Brand identity', 'Motion graphics', 'Design systems']
            },
            {
                'type': 'content',
                'title': 'Team Expertise',
                'items': [
                    'Award-winning designers and developers',
                    '15+ years of combined experience',
                    'Specialization in cutting-edge technologies',
                    'Passion for creative excellence'
                ]
            }
        ]
    },
    'startup': {
        'palette': 'startup',
        'slides': [
            {
                'type': 'title',
                'title': 'Startup Pitch Deck',
                'subtitle': 'Disrupting the Industry'
            },
            {
                'type': 'content',
                'title': 'The Problem',
                'items': [
                    'Current market has significant gaps',
                    'Existing solutions are outdated',
                    'Customer pain points unaddressed',
                    'Massive addressable market'
                ]
            },
            {
                'type': 'content',
                'title': 'Our Solution',
                'items': [
                    'AI-powered platform',
                    '10x better user experience',
                    'Seamless integration',
                    'Cost-effective pricing'
                ]
            },
            {
                'type': 'two_column',
                'title': 'Traction & Growth',
                'left_title': 'Metrics',
                'left_items': ['10K users', '+50% MoM', '4.8 star rating', 'NPS: 72'],
                'right_title': 'Milestones',
                'right_items': ['Series A funding', 'Global expansion', 'Enterprise clients', 'Category leadership']
            },
            {
                'type': 'content',
                'title': 'Investment Opportunity',
                'items': [
                    'Seeking $5M Series A round',
                    'Use of funds: Team, product, marketing',
                    'Expected ROI: 10x in 5 years',
                    'Join us in reshaping the industry!'
                ]
            }
        ]
    },
    'modern': {
        'palette': 'modern',
        'slides': [
            {
                'type': 'title',
                'title': 'Modern Design Principles',
                'subtitle': 'Contemporary & Effective'
            },
            {
                'type': 'content',
                'title': 'Core Principles',
                'items': [
                    'Minimalism: Less is more',
                    'Clarity: Crystal clear communication',
                    'Consistency: Unified experience',
                    'Accessibility: Inclusive design',
                    'Responsiveness: All devices supported'
                ]
            },
            {
                'type': 'two_column',
                'title': 'Design Approach',
                'left_title': 'Visual Design',
                'left_items': ['Typography', 'Color harmony', 'White space', 'Grid systems'],
                'right_title': 'User Experience',
                'right_items': ['User research', 'Prototyping', 'Testing', 'Iteration']
            }
        ]
    },
    'elegant': {
        'palette': 'elegant',
        'slides': [
            {
                'type': 'title',
                'title': 'Elegant Excellence',
                'subtitle': 'Sophistication in Every Detail'
            },
            {
                'type': 'content',
                'title': 'Premium Quality',
                'items': [
                    'Meticulous attention to detail',
                    'Superior craftsmanship',
                    'Timeless design principles',
                    'Luxury experience',
                    'Exceptional customer service'
                ]
            },
            {
                'type': 'two_column',
                'title': 'Our Offerings',
                'left_title': 'Services',
                'left_items': ['Consulting', 'Design', 'Implementation', 'Support'],
                'right_title': 'Benefits',
                'right_items': ['Enhanced brand value', 'Customer loyalty', 'Market differentiation', 'Sustainable growth']
            }
        ]
    },
    # Additional Industry-Specific Templates
    'healthcare': {
        'palette': 'modern',
        'slides': [
            {
                'type': 'title',
                'title': 'Healthcare Excellence',
                'subtitle': 'Patient-Centered Innovation'
            },
            {
                'type': 'content',
                'title': 'Clinical Outcomes',
                'items': [
                    '95% patient satisfaction rate',
                    'State-of-the-art facilities',
                    'Comprehensive care programs',
                    'Advanced diagnostic technology',
                    '24/7 emergency services'
                ]
            }
        ]
    },
    'financial': {
        'palette': 'corporate',
        'slides': [
            {
                'type': 'title',
                'title': 'Financial Performance 2026',
                'subtitle': 'Growth & Stability'
            },
            {
                'type': 'content',
                'title': 'Key Metrics',
                'items': [
                    'Revenue Growth: +25% YoY',
                    'Market Capitalization: $5.2B',
                    'Operating Margin: 32%',
                    'Return on Equity: 18%',
                    'Dividend Yield: 4.5%'
                ]
            }
        ]
    },
    'education': {
        'palette': 'creative',
        'slides': [
            {
                'type': 'title',
                'title': 'Educational Innovation',
                'subtitle': 'Learning for Tomorrow'
            },
            {
                'type': 'content',
                'title': 'Our Mission',
                'items': [
                    'Empower students through quality education',
                    'Foster critical thinking',
                    'Embrace technological advancement',
                    'Nurture global citizenship',
                    'Build confident leaders'
                ]
            }
        ]
    },
    'real-estate': {
        'palette': 'modern',
        'slides': [
            {
                'type': 'title',
                'title': 'Real Estate Portfolio',
                'subtitle': 'Premium Properties & Investments'
            },
            {
                'type': 'content',
                'title': 'Featured Developments',
                'items': [
                    'Luxury residential complexes',
                    'Commercial office spaces',
                    'Sustainable eco-communities',
                    'Smart building technology',
                    'Prime location investments'
                ]
            }
        ]
    },
    'manufacturing': {
        'palette': 'corporate',
        'slides': [
            {
                'type': 'title',
                'title': 'Manufacturing Excellence',
                'subtitle': 'Quality & Efficiency'
            },
            {
                'type': 'content',
                'title': 'Production Capabilities',
                'items': [
                    'ISO 9001 certified facilities',
                    '99.8% quality assurance rate',
                    'Advanced automation systems',
                    'Zero-defect manufacturing',
                    'Just-in-time delivery'
                ]
            }
        ]
    }
}

DOCUMENT_TEMPLATES = {
    'professional': {
        'palette': 'corporate',
        'content': {
            'title': 'Professional Report',
            'subtitle': 'Comprehensive Business Analysis',
            'sections': [
                {
                    'heading': 'Executive Summary',
                    'items': [
                        'This report provides a comprehensive analysis of current market conditions and strategic recommendations.',
                        'Key findings indicate strong growth potential with manageable risks.',
                        'Implementation of proposed strategies is expected to deliver significant ROI.'
                    ]
                },
                {
                    'heading': 'Market Overview',
                    'items': [
                        'Current market size: $2.5B',
                        'Projected growth rate: 15% CAGR',
                        'Key players: Company A, B, C',
                        'Emerging trends: Digital transformation, AI integration'
                    ]
                },
                {
                    'heading': 'Strategic Recommendations',
                    'items': [
                        'Invest in technology infrastructure',
                        'Expand into emerging markets',
                        'Develop new product lines',
                        'Strengthen customer relationships'
                    ]
                }
            ]
        }
    },
    'proposal': {
        'palette': 'corporate',
        'content': {
            'title': 'Business Proposal',
            'subtitle': 'Project Implementation Plan',
            'sections': [
                {
                    'heading': 'Project Overview',
                    'items': [
                        'Project Name: Strategic Initiative 2026',
                        'Duration: 12 months',
                        'Budget: $500,000',
                        'Team Size: 8 professionals'
                    ]
                },
                {
                    'heading': 'Deliverables',
                    'items': [
                        'Phase 1: Requirements and planning',
                        'Phase 2: Design and architecture',
                        'Phase 3: Development and testing',
                        'Phase 4: Deployment and optimization'
                    ]
                },
                {
                    'heading': 'Expected Outcomes',
                    'items': [
                        '30% increase in efficiency',
                        '25% cost reduction',
                        'Enhanced customer satisfaction',
                        'Improved market competitiveness'
                    ]
                }
            ]
        }
    },
    'financial': {
        'palette': 'corporate',
        'content': {
            'title': 'Financial Report Q1 2026',
            'subtitle': 'Quarterly Performance Analysis',
            'sections': [
                {
                    'heading': 'Revenue Summary',
                    'items': [
                        'Total Revenue: $10.5M (+12% YoY)',
                        'Operating Income: $2.8M (+15% YoY)',
                        'Net Income: $1.9M (+18% YoY)',
                        'EBITDA Margin: 28.5%'
                    ]
                },
                {
                    'heading': 'Cost Analysis',
                    'items': [
                        'COGS: 45% of revenue',
                        'Operating Expenses: 23% of revenue',
                        'R&D Investment: 8% of revenue',
                        'SG&A Expenses: 19% of revenue'
                    ]
                }
            ]
        }
    },
    # Additional Document Templates
    'business-plan': {
        'palette': 'corporate',
        'content': {
            'title': 'Business Plan 2026',
            'subtitle': 'Strategic Roadmap & Growth Strategy',
            'sections': [
                {
                    'heading': 'Executive Overview',
                    'items': [
                        'Company mission and vision',
                        'Market opportunity analysis',
                        'Competitive advantage',
                        'Financial projections'
                    ]
                },
                {
                    'heading': 'Market Strategy',
                    'items': [
                        'Target market segments',
                        'Customer acquisition strategy',
                        'Pricing strategy',
                        'Distribution channels'
                    ]
                },
                {
                    'heading': 'Operations Plan',
                    'items': [
                        'Organizational structure',
                        'Resource requirements',
                        'Timeline and milestones',
                        'Risk management'
                    ]
                }
            ]
        }
    },
    'project-plan': {
        'palette': 'modern',
        'content': {
            'title': 'Project Plan',
            'subtitle': 'Scope, Schedule & Deliverables',
            'sections': [
                {
                    'heading': 'Project Objectives',
                    'items': [
                        'Deliver digital transformation initiative',
                        'Implement cloud infrastructure',
                        'Achieve 40% cost reduction',
                        'Improve time-to-market by 50%'
                    ]
                },
                {
                    'heading': 'Project Scope',
                    'items': [
                        'Phase 1: Planning & Assessment',
                        'Phase 2: Design & Architecture',
                        'Phase 3: Implementation',
                        'Phase 4: Testing & Deployment'
                    ]
                },
                {
                    'heading': 'Success Criteria',
                    'items': [
                        'On-time delivery (±5%)',
                        'Within budget parameters',
                        'Quality standards met',
                        'Stakeholder satisfaction ≥90%'
                    ]
                }
            ]
        }
    },
    'market-analysis': {
        'palette': 'corporate',
        'content': {
            'title': 'Market Analysis Report',
            'subtitle': 'Industry Trends & Opportunities',
            'sections': [
                {
                    'heading': 'Market Overview',
                    'items': [
                        'Total Addressable Market: $50B',
                        'Annual Growth Rate: 18%',
                        'Market Segments: Enterprise, Mid-Market, SMB',
                        'Geographic Distribution: 60% North America, 25% Europe, 15% APAC'
                    ]
                },
                {
                    'heading': 'Competitive Landscape',
                    'items': [
                        'Major Competitors: Company A, B, C',
                        'Market Leaders: 45% combined market share',
                        'Emerging Players: High growth momentum',
                        'Differentiation Factors: Innovation, Price, Service'
                    ]
                }
            ]
        }
    },
    'training-manual': {
        'palette': 'creative',
        'content': {
            'title': 'Training & Development Manual',
            'subtitle': 'Comprehensive Employee Onboarding',
            'sections': [
                {
                    'heading': 'Welcome to the Team',
                    'items': [
                        'Company culture and values',
                        'Team structure and roles',
                        'Key policies and procedures',
                        'Communication guidelines'
                    ]
                },
                {
                    'heading': 'Learning Modules',
                    'items': [
                        'Module 1: Product Overview (4 hours)',
                        'Module 2: Systems & Tools (6 hours)',
                        'Module 3: Customer Engagement (4 hours)',
                        'Module 4: Sales & Support Process (5 hours)'
                    ]
                }
            ]
        }
    },
    'compliance': {
        'palette': 'corporate',
        'content': {
            'title': 'Compliance & Policy Document',
            'subtitle': 'Regulatory Requirements & Guidelines',
            'sections': [
                {
                    'heading': 'Regulatory Framework',
                    'items': [
                        'GDPR Compliance Requirements',
                        'Data Protection Standards',
                        'Information Security Protocols',
                        'Audit and Monitoring Procedures'
                    ]
                },
                {
                    'heading': 'Implementation Guidelines',
                    'items': [
                        'Data Classification System',
                        'Access Control Policies',
                        'Incident Response Procedures',
                        'Regular Compliance Audits'
                    ]
                }
            ]
        }
    }
}


# ==================== GENERATION FUNCTIONS ====================

def generate_presentation(template_name: str) -> bytes:
    """Generate PowerPoint presentation"""
    if template_name not in PRESENTATION_TEMPLATES:
        raise ValueError(f"Template {template_name} not found")

    template = PRESENTATION_TEMPLATES[template_name]
    gen = PowerPointGenerator(template_name, template['palette'])

    for slide_config in template['slides']:
        slide_type = slide_config['type']
        if slide_type == 'title':
            gen.add_title_slide(slide_config['title'], slide_config.get('subtitle', ''))
        elif slide_type == 'content':
            gen.add_content_slide(slide_config['title'], slide_config['items'])
        elif slide_type == 'two_column':
            gen.add_two_column_slide(
                slide_config['title'],
                slide_config['left_title'],
                slide_config['left_items'],
                slide_config['right_title'],
                slide_config['right_items']
            )

    return gen.save()


def generate_document(template_name: str) -> bytes:
    """Generate Word document"""
    if template_name not in DOCUMENT_TEMPLATES:
        raise ValueError(f"Template {template_name} not found")

    template = DOCUMENT_TEMPLATES[template_name]
    gen = WordGenerator(template_name, template['palette'])

    content = template['content']
    gen.add_title(content['title'], content['subtitle'])

    for section in content['sections']:
        gen.add_heading(section['heading'])
        gen.add_bullet_list(section['items'])
        gen.add_paragraph('')

    return gen.save()


def get_template_preview_data(template_type: str, template_name: str) -> Dict[str, Any]:
    """Get template preview data for Canvas rendering"""
    templates = PRESENTATION_TEMPLATES if template_type == 'presentation' else DOCUMENT_TEMPLATES

    if template_name not in templates:
        raise ValueError(f"Template {template_name} not found")

    template = templates[template_name]
    palette = COLOR_PALETTES.get(template['palette'])

    return {
        'name': template_name,
        'type': template_type,
        'palette': {
            'primary': f"rgb({palette['primary'][0]}, {palette['primary'][1]}, {palette['primary'][2]})",
            'secondary': f"rgb({palette['secondary'][0]}, {palette['secondary'][1]}, {palette['secondary'][2]})",
            'text': f"rgb({palette['text'][0]}, {palette['text'][1]}, {palette['text'][2]})",
        },
        'slideCount': len(template.get('slides', [])) or len(template.get('content', {}).get('sections', [])),
    }


# ==================== CUSTOMIZATION FUNCTIONS ====================

def customize_presentation(template_name: str, customization: Dict[str, Any]) -> bytes:
    """Generate customized PowerPoint presentation"""
    if template_name not in PRESENTATION_TEMPLATES:
        raise ValueError(f"Template {template_name} not found")

    template = PRESENTATION_TEMPLATES[template_name]
    palette_name = customization.get('palette', template['palette'])
    custom_colors = customization.get('colors', {})

    # Override palette with custom colors if provided
    palette = COLOR_PALETTES.get(palette_name, COLOR_PALETTES['corporate']).copy()
    if custom_colors:
        for key, color in custom_colors.items():
            if key in palette and isinstance(color, (list, tuple)) and len(color) == 3:
                palette[key] = RGBColor(*color)

    gen = PowerPointGenerator(template_name, palette_name)
    gen.palette = palette

    # Generate slides with custom content
    for slide_config in template['slides']:
        slide_type = slide_config['type']

        if slide_type == 'title':
            custom_title = customization.get('slides', {}).get(slide_config.get('_index', 0), {}).get('title') or slide_config['title']
            custom_subtitle = customization.get('slides', {}).get(slide_config.get('_index', 0), {}).get('subtitle') or slide_config.get('subtitle', '')
            gen.add_title_slide(custom_title, custom_subtitle)

        elif slide_type == 'content':
            custom_title = customization.get('slides', {}).get(slide_config.get('_index', 0), {}).get('title') or slide_config['title']
            custom_items = customization.get('slides', {}).get(slide_config.get('_index', 0), {}).get('items') or slide_config['items']
            gen.add_content_slide(custom_title, custom_items)

        elif slide_type == 'two_column':
            custom_title = customization.get('slides', {}).get(slide_config.get('_index', 0), {}).get('title') or slide_config['title']
            gen.add_two_column_slide(
                custom_title,
                customization.get('leftTitle') or slide_config['left_title'],
                customization.get('leftItems') or slide_config['left_items'],
                customization.get('rightTitle') or slide_config['right_title'],
                customization.get('rightItems') or slide_config['right_items']
            )

    return gen.save()


def customize_document(template_name: str, customization: Dict[str, Any]) -> bytes:
    """Generate customized Word document"""
    if template_name not in DOCUMENT_TEMPLATES:
        raise ValueError(f"Template {template_name} not found")

    template = DOCUMENT_TEMPLATES[template_name]
    palette_name = customization.get('palette', template['palette'])
    custom_colors = customization.get('colors', {})

    palette = COLOR_PALETTES.get(palette_name, COLOR_PALETTES['corporate']).copy()
    if custom_colors:
        for key, color in custom_colors.items():
            if key in palette and isinstance(color, (list, tuple)) and len(color) == 3:
                palette[key] = DocRGBColor(*color)

    gen = WordGenerator(template_name, palette_name)
    gen.palette = palette

    content = template['content']
    custom_title = customization.get('title') or content['title']
    custom_subtitle = customization.get('subtitle') or content['subtitle']

    gen.add_title(custom_title, custom_subtitle)

    for section in content['sections']:
        section_heading = customization.get('sections', {}).get(section['heading'], {}).get('heading') or section['heading']
        section_items = customization.get('sections', {}).get(section['heading'], {}).get('items') or section['items']

        gen.add_heading(section_heading)
        gen.add_bullet_list(section_items)
        gen.add_paragraph('')

    return gen.save()


def batch_generate_zip(templates: List[Dict[str, str]]) -> bytes:
    """Generate multiple templates and return as ZIP file"""
    zip_buffer = io.BytesIO()

    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        for template_config in templates:
            template_type = template_config.get('type')
            template_name = template_config.get('name')

            try:
                if template_type == 'presentation':
                    if template_name not in PRESENTATION_TEMPLATES:
                        continue
                    file_data = generate_presentation(template_name)
                    filename = f'{template_name}_presentation.pptx'

                elif template_type == 'document':
                    if template_name not in DOCUMENT_TEMPLATES:
                        continue
                    file_data = generate_document(template_name)
                    filename = f'{template_name}_document.docx'
                else:
                    continue

                # Add file to zip
                zip_file.writestr(filename, file_data)

            except Exception as e:
                print(f"Error generating {template_name}: {e}")
                continue

    zip_buffer.seek(0)
    return zip_buffer.getvalue()


def get_all_templates() -> Dict[str, List[Dict[str, Any]]]:
    """Get all available templates organized by type"""
    presentations = []
    for name, config in PRESENTATION_TEMPLATES.items():
        presentations.append({
            'id': name,
            'name': name.replace('-', ' ').title(),
            'type': 'presentation',
            'palette': config['palette'],
            'slideCount': len(config.get('slides', []))
        })

    documents = []
    for name, config in DOCUMENT_TEMPLATES.items():
        documents.append({
            'id': name,
            'name': name.replace('-', ' ').title(),
            'type': 'document',
            'palette': config['palette'],
            'sectionCount': len(config.get('content', {}).get('sections', []))
        })

    return {
        'presentations': presentations,
        'documents': documents,
        'total': len(presentations) + len(documents)
    }


if __name__ == '__main__':
    # Test generation
    pptx_data = generate_presentation('corporate')
    with open('/tmp/test_corporate.pptx', 'wb') as f:
        f.write(pptx_data)
    print("✅ Generated test_corporate.pptx")

    docx_data = generate_document('professional')
    with open('/tmp/test_professional.docx', 'wb') as f:
        f.write(docx_data)
    print("✅ Generated test_professional.docx")

    # Test batch generation
    templates = [
        {'type': 'presentation', 'name': 'corporate'},
        {'type': 'presentation', 'name': 'creative'},
        {'type': 'document', 'name': 'professional'},
        {'type': 'document', 'name': 'proposal'}
    ]
    zip_data = batch_generate_zip(templates)
    with open('/tmp/test_templates.zip', 'wb') as f:
        f.write(zip_data)
    print("✅ Generated test_templates.zip")
