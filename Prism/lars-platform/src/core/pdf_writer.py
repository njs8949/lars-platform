"""슬라이드 구조를 PDF로 쓴다 (reportlab, 한국어 CID 글꼴). 한 슬라이드가 한 페이지다."""

from pathlib import Path
from typing import Any, Dict, List

from reportlab.lib.pagesizes import landscape, A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from reportlab.pdfgen import canvas

FONT = "HYGothic-Medium"


def _lines(slide: Dict[str, Any]) -> List[str]:
    if slide.get("layout") == "title":
        return [slide.get("subtitle", "")] + ([slide.get("author")] if slide.get("author") else [])
    if slide.get("layout") == "table_of_contents" or slide.get("content_type") == "toc":
        return [f"{i}. {item}" for i, item in enumerate(slide.get("items", []), 1)]
    if slide.get("layout") == "conclusion" or slide.get("content_type") == "conclusion":
        return [f"• {p}" for p in slide.get("key_points", [])] + ([f"▶ {slide['call_to_action']}"] if slide.get("call_to_action") else [])
    bullets = [f"• {b}" for b in slide.get("bullets", [])]
    return ([slide["content"]] if slide.get("content") else []) + bullets


def write_pdf(slides: List[Dict[str, Any]], path: Path) -> Path:
    pdfmetrics.registerFont(UnicodeCIDFont(FONT))
    path.parent.mkdir(parents=True, exist_ok=True)
    page_w, page_h = landscape(A4)
    pdf = canvas.Canvas(str(path), pagesize=(page_w, page_h))
    for slide in slides:
        title = slide.get("title") or {"toc": "목차", "conclusion": "결론"}.get(slide.get("content_type"), "")
        pdf.setFont(FONT, 26)
        pdf.drawString(50, page_h - 70, str(title)[:80])
        pdf.setFont(FONT, 16)
        y = page_h - 120
        for line in _lines(slide):
            for chunk in [line[i:i + 70] for i in range(0, len(line), 70)] or [""]:
                if y < 50:
                    pdf.showPage()
                    pdf.setFont(FONT, 16)
                    y = page_h - 60
                pdf.drawString(60, y, chunk)
                y -= 26
        pdf.showPage()
    pdf.save()
    return path
