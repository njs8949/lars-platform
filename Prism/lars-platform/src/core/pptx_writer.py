"""슬라이드 구조(JSON)를 실무용 .pptx 파일로 쓴다.

디자인 원칙 (공개된 AI 프레젠테이션 도구와 디자인 가이드의 공통 기준을 따른다):
- 한 장에는 한 가지 메시지만 담는다. 글머리 기호는 최대 5개, 한 줄은 짧게 쓴다.
- 13.33 x 7.5in 격자, 좌우 여백 0.75in, 제목 위치와 크기를 모든 장에서 같게 유지한다.
- 색은 팔레트 4개(배경, 면, 본문, 강조)만 쓴다. 강조색은 핵심 요소에만 쓴다.
- 글꼴 크기는 위계로 나눈다: 제목 30, 본문 18~20, 보조 12~14. 글이 길면 자동으로 줄인다.
- 모든 글자는 편집 가능한 텍스트 상자 또는 표로 넣는다(그림으로 굽지 않는다).
- 발표자 노트(notes)가 있으면 함께 넣는다.
"""

import math
import re
from pathlib import Path
from typing import Any, Dict, List, Optional

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.util import Inches, Pt

SLIDE_W = 13.333
SLIDE_H = 7.5
MARGIN = 0.75

# 테마 팔레트: 배경(bg), 카드 면(surface), 기본색(primary), 강조색(accent), 본문(ink), 보조(muted), 어두운 면(dark)
THEMES: Dict[str, Dict[str, str]] = {
    "corporate": {"bg": "FFFFFF", "surface": "F3F5FA", "primary": "1E3A8A", "accent": "4F46E5",
                  "ink": "111827", "muted": "6B7280", "on_primary": "FFFFFF", "heading": "1E3A8A", "on_dark": "FFFFFF", "dark": "0F1B3D"},
    "midnight": {"bg": "0B1020", "surface": "161E33", "primary": "1B2440", "accent": "8B8FFF",
                 "ink": "F3F4F6", "muted": "9CA3AF", "on_primary": "FFFFFF", "heading": "F3F4F6", "on_dark": "F3F4F6", "dark": "070B16"},
    "warm": {"bg": "FFFBF5", "surface": "FBEDE0", "primary": "9A3412", "accent": "EA580C",
             "ink": "1C1917", "muted": "78716C", "on_primary": "FFFFFF", "heading": "9A3412", "on_dark": "FFFFFF", "dark": "431407"},
    "minimal": {"bg": "FFFFFF", "surface": "F4F4F5", "primary": "18181B", "accent": "2563EB",
                "ink": "18181B", "muted": "71717A", "on_primary": "FFFFFF", "heading": "18181B", "on_dark": "FFFFFF", "dark": "18181B"},
}
DEFAULT_THEME = "corporate"
DEFAULT_FONT = "Apple SD Gothic Neo"  # macOS 기본 한글 글꼴. Windows에서는 PowerPoint가 대체 글꼴을 쓴다.

_state: Dict[str, Any] = {"palette": dict(THEMES[DEFAULT_THEME]), "font": DEFAULT_FONT, "theme": DEFAULT_THEME}


def _rgb(hex_color: str) -> RGBColor:
    value = hex_color.lstrip("#")
    return RGBColor(int(value[0:2], 16), int(value[2:4], 16), int(value[4:6], 16))


def _c(name: str) -> RGBColor:
    return _rgb(_state["palette"][name])


PALETTE_KEYS = ("bg", "surface", "primary", "accent", "ink", "muted", "on_primary", "heading", "on_dark", "dark")
_HEX = re.compile(r"^#?[0-9A-Fa-f]{6}$")


def set_theme(primary: str = "", accent: str = "", font: str = "", theme: str = "",
              overrides: Optional[Dict[str, str]] = None) -> None:
    """테마 이름과 색, 글꼴을 정한다. 색을 따로 주면 팔레트의 기본색을 바꾼다.
    overrides는 PALETTE_KEYS 중 원하는 항목만 6자리 색으로 바꾼다(잘못된 값은 무시한다)."""
    base = THEMES.get(theme or DEFAULT_THEME, THEMES[DEFAULT_THEME])
    palette = dict(base)
    for key, value in (overrides or {}).items():
        if key in PALETTE_KEYS and isinstance(value, str) and _HEX.match(value):
            palette[key] = value.lstrip("#").upper()
    if primary:
        palette["primary"] = primary.lstrip("#")
        palette["on_primary"] = "FFFFFF"
    if accent:
        palette["accent"] = accent.lstrip("#")
    _state["palette"] = palette
    _state["font"] = font or DEFAULT_FONT
    _state["theme"] = theme if theme in THEMES else DEFAULT_THEME


def _fit_size(lines: List[str], width_in: float, height_in: float, start: int, minimum: int) -> int:
    """줄 수를 어림해서 상자 안에 들어가는 가장 큰 글자 크기를 고른다."""
    for size in range(start, minimum - 1, -1):
        chars_per_line = max(8, int(width_in * 72 / (size * 0.56)))
        line_count = sum(max(1, math.ceil(len(line) / chars_per_line)) for line in lines) or 1
        needed = line_count * size * 1.45 / 72 + 0.1 * len(lines)
        if needed <= height_in:
            return size
    return minimum


def _shape(slide, kind, x, y, w, h, color: str):
    shape = slide.shapes.add_shape(kind, Inches(x), Inches(y), Inches(w), Inches(h))
    shape.fill.solid()
    shape.fill.fore_color.rgb = _rgb(color)
    shape.line.fill.background()
    # 테마 스타일(그림자 포함)을 떼어 내고 위에서 준 색만 쓴다
    style = shape._element.find("{http://schemas.openxmlformats.org/presentationml/2006/main}style")
    if style is not None:
        shape._element.remove(style)
    return shape


def _rect(slide, x, y, w, h, color: str):
    return _shape(slide, MSO_SHAPE.RECTANGLE, x, y, w, h, color)


def _text(slide, x, y, w, h, text, size: int, color: str, bold: bool = False,
          align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP, spacing: float = 1.2, space_after: int = 6):
    box = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    frame = box.text_frame
    frame.word_wrap = True
    frame.vertical_anchor = anchor
    frame.margin_left = frame.margin_right = Inches(0)
    frame.margin_top = frame.margin_bottom = Inches(0)
    lines = text if isinstance(text, list) else [text]
    for i, line in enumerate(lines):
        paragraph = frame.paragraphs[0] if i == 0 else frame.add_paragraph()
        paragraph.text = str(line)
        paragraph.alignment = align
        paragraph.line_spacing = spacing
        paragraph.space_after = Pt(space_after)
        font = paragraph.font
        font.size = Pt(size)
        font.bold = bold
        font.color.rgb = _rgb(color) if isinstance(color, str) else color
        font.name = _state["font"]
    return box


def _background(slide, color: str) -> None:
    fill = slide.background.fill
    fill.solid()
    fill.fore_color.rgb = _rgb(color)


def _new_slide(prs):
    return prs.slides.add_slide(prs.slide_layouts[6])


def _header(slide, title: str) -> None:
    """모든 본문 장의 제목 자리. 위치와 크기를 고정해서 장마다 흔들리지 않게 한다."""
    size = _fit_size([title], SLIDE_W - 2 * MARGIN, 0.9, 30, 22)
    _text(slide, MARGIN, 0.55, SLIDE_W - 2 * MARGIN, 0.9, title or " ", size, _state["palette"]["heading"],
          bold=True, anchor=MSO_ANCHOR.BOTTOM, spacing=1.05)
    _rect(slide, MARGIN, 1.55, 0.9, 0.06, _state["palette"]["accent"])


def _footer(slide, page: int, label: str) -> None:
    p = _state["palette"]
    _text(slide, MARGIN, SLIDE_H - 0.5, 8, 0.3, label, 10, p["muted"], spacing=1.0, space_after=0)
    _text(slide, SLIDE_W - MARGIN - 1.0, SLIDE_H - 0.5, 1.0, 0.3, str(page), 10, p["muted"],
          align=PP_ALIGN.RIGHT, spacing=1.0, space_after=0)


def _notes(slide, notes: str) -> None:
    if notes:
        slide.notes_slide.notes_text_frame.text = notes


# ---- 장표 유형 ----

def _title_slide(prs, title: str, subtitle: str, author: str, notes: str = "") -> None:
    p = _state["palette"]
    slide = _new_slide(prs)
    _background(slide, p["primary"])
    _rect(slide, 0, SLIDE_H - 0.18, SLIDE_W, 0.18, p["accent"])
    _rect(slide, MARGIN, 2.55, 1.1, 0.07, p["accent"])
    size = _fit_size([title], SLIDE_W - 2 * MARGIN - 1, 2.0, 46, 32)
    _text(slide, MARGIN, 2.8, SLIDE_W - 2 * MARGIN - 1, 2.0, title or " ", size, p["on_primary"], bold=True,
          anchor=MSO_ANCHOR.TOP, spacing=1.08)
    if subtitle:
        _text(slide, MARGIN, 4.95, SLIDE_W - 2 * MARGIN - 1, 0.9, subtitle, 20, p["on_primary"], spacing=1.25)
    if author:
        _text(slide, MARGIN, 6.55, 9, 0.4, author, 14, p["on_primary"], spacing=1.0, space_after=0)
    _notes(slide, notes)


def _section_slide(prs, number: str, title: str, notes: str = "") -> None:
    p = _state["palette"]
    slide = _new_slide(prs)
    _background(slide, p["dark"])
    _text(slide, MARGIN, 1.9, 4, 1.8, number or "", 96, p["accent"], bold=True, spacing=1.0, space_after=0)
    size = _fit_size([title], SLIDE_W - 2 * MARGIN, 1.5, 40, 28)
    _text(slide, MARGIN, 3.9, SLIDE_W - 2 * MARGIN, 1.5, title or " ", size, p["on_dark"],
          bold=True, spacing=1.1)
    _notes(slide, notes)


def _toc_slide(prs, items: List[str], page: int, label: str, notes: str = "") -> None:
    p = _state["palette"]
    slide = _new_slide(prs)
    _background(slide, p["bg"])
    _header(slide, "목차")
    items = items[:7]
    row_h = min(0.8, 4.9 / max(1, len(items)))
    for i, item in enumerate(items):
        y = 2.0 + i * row_h
        circle = _shape(slide, MSO_SHAPE.OVAL, MARGIN, y, 0.5, 0.5, p["primary"])
        frame = circle.text_frame
        frame.margin_left = frame.margin_right = frame.margin_top = frame.margin_bottom = 0
        frame.vertical_anchor = MSO_ANCHOR.MIDDLE
        para = frame.paragraphs[0]
        para.text = f"{i + 1:02d}"
        para.alignment = PP_ALIGN.CENTER
        para.font.size = Pt(13)
        para.font.bold = True
        para.font.color.rgb = _rgb(p["on_primary"])
        para.font.name = _state["font"]
        size = _fit_size([str(item)], SLIDE_W - 2 * MARGIN - 1.5, row_h, 22, 16)
        _text(slide, MARGIN + 0.8, y, SLIDE_W - 2 * MARGIN - 1.5, 0.5, str(item), size, p["ink"],
              anchor=MSO_ANCHOR.MIDDLE, spacing=1.0, space_after=0)
    _footer(slide, page, label)
    _notes(slide, notes)


def _content_slide(prs, title: str, bullets: List[str], body: str, page: int, label: str, notes: str = "") -> None:
    p = _state["palette"]
    slide = _new_slide(prs)
    _background(slide, p["bg"])
    _header(slide, title)
    top = 1.95
    if body:
        size = _fit_size([body], SLIDE_W - 2 * MARGIN, 0.9, 20, 16)
        _text(slide, MARGIN, top, SLIDE_W - 2 * MARGIN, 0.9, body, size, p["muted"], spacing=1.25)
        top += 1.0
    bullets = [str(b) for b in bullets][:6]
    if bullets:
        area_h = SLIDE_H - top - 0.9
        size = _fit_size(bullets, SLIDE_W - 2 * MARGIN - 0.6, area_h, 22, 15)
        step = min(1.0, area_h / len(bullets))
        for i, bullet in enumerate(bullets):
            y = top + i * step
            _rect(slide, MARGIN, y + size * 0.011, 0.14, 0.14, p["accent"])
            _text(slide, MARGIN + 0.5, y, SLIDE_W - 2 * MARGIN - 0.6, step, bullet, size, p["ink"], spacing=1.25)
    _footer(slide, page, label)
    _notes(slide, notes)


def _stats_slide(prs, title: str, stats: List[Dict[str, str]], page: int, label: str, notes: str = "") -> None:
    p = _state["palette"]
    slide = _new_slide(prs)
    _background(slide, p["bg"])
    _header(slide, title)
    items = [s for s in stats if isinstance(s, dict)][:4]
    if not items:
        return _content_slide(prs, title, [], "", page, label, notes)
    gap = 0.3
    card_w = (SLIDE_W - 2 * MARGIN - gap * (len(items) - 1)) / len(items)
    card_h = 3.6
    y = 2.3
    for i, item in enumerate(items):
        x = MARGIN + i * (card_w + gap)
        _rect(slide, x, y, card_w, card_h, p["surface"])
        _rect(slide, x, y, card_w, 0.08, p["accent"])
        value = str(item.get("value", ""))
        vsize = _fit_size([value], card_w - 0.6, 1.4, 54, 30)
        _text(slide, x + 0.3, y + 0.55, card_w - 0.6, 1.4, value, vsize, p["heading"], bold=True,
              anchor=MSO_ANCHOR.MIDDLE, spacing=1.0, space_after=0)
        label_text = str(item.get("label", ""))
        lsize = _fit_size([label_text], card_w - 0.6, 1.5, 18, 13)
        _text(slide, x + 0.3, y + 2.1, card_w - 0.6, 1.4, label_text, lsize, p["ink"], spacing=1.25)
    _footer(slide, page, label)
    _notes(slide, notes)


def _steps_slide(prs, title: str, steps: List[Dict[str, str]], page: int, label: str, notes: str = "") -> None:
    p = _state["palette"]
    slide = _new_slide(prs)
    _background(slide, p["bg"])
    _header(slide, title)
    items = [s for s in steps if isinstance(s, dict)][:5]
    if not items:
        return _content_slide(prs, title, [], "", page, label, notes)
    count = len(items)
    col_w = (SLIDE_W - 2 * MARGIN) / count
    line_y = 2.75
    _rect(slide, MARGIN + col_w / 2, line_y + 0.23, col_w * (count - 1), 0.04, p["surface"])
    for i, item in enumerate(items):
        cx = MARGIN + i * col_w
        circle = _shape(slide, MSO_SHAPE.OVAL, cx + col_w / 2 - 0.27, line_y, 0.54, 0.54, p["primary"])
        frame = circle.text_frame
        frame.margin_left = frame.margin_right = frame.margin_top = frame.margin_bottom = 0
        frame.vertical_anchor = MSO_ANCHOR.MIDDLE
        para = frame.paragraphs[0]
        para.text = str(i + 1)
        para.alignment = PP_ALIGN.CENTER
        para.font.size = Pt(16)
        para.font.bold = True
        para.font.color.rgb = _rgb(p["on_primary"])
        para.font.name = _state["font"]
        title_text = str(item.get("title", ""))
        tsize = _fit_size([title_text], col_w - 0.3, 0.9, 20, 15)
        _text(slide, cx + 0.15, line_y + 0.9, col_w - 0.3, 0.9, title_text, tsize, p["heading"], bold=True,
              align=PP_ALIGN.CENTER, spacing=1.15)
        desc = str(item.get("text", ""))
        dsize = _fit_size([desc], col_w - 0.3, 2.6, 16, 12)
        _text(slide, cx + 0.15, line_y + 1.9, col_w - 0.3, 2.6, desc, dsize, p["ink"], align=PP_ALIGN.CENTER,
              spacing=1.3)
    _footer(slide, page, label)
    _notes(slide, notes)


def _columns_slide(prs, title: str, columns: List[Dict[str, Any]], page: int, label: str, notes: str = "") -> None:
    p = _state["palette"]
    slide = _new_slide(prs)
    _background(slide, p["bg"])
    _header(slide, title)
    items = [c for c in columns if isinstance(c, dict)][:2]
    if not items:
        return _content_slide(prs, title, [], "", page, label, notes)
    gap = 0.4
    col_w = (SLIDE_W - 2 * MARGIN - gap * (len(items) - 1)) / len(items)
    top, height = 2.0, SLIDE_H - 2.0 - 0.9
    for i, col in enumerate(items):
        x = MARGIN + i * (col_w + gap)
        _rect(slide, x, top, col_w, height, p["surface"])
        _rect(slide, x, top, 0.08, height, p["accent"] if i else p["primary"])
        heading = str(col.get("heading", ""))
        hsize = _fit_size([heading], col_w - 0.9, 0.7, 22, 17)
        _text(slide, x + 0.45, top + 0.35, col_w - 0.9, 0.7, heading, hsize, p["heading"], bold=True, spacing=1.1)
        bullets = [str(b) for b in col.get("bullets", [])][:5]
        if bullets:
            size = _fit_size(bullets, col_w - 0.9, height - 1.4, 19, 14)
            _text(slide, x + 0.45, top + 1.25, col_w - 0.9, height - 1.4, [f"•  {b}" for b in bullets], size,
                  p["ink"], spacing=1.3, space_after=10)
    _footer(slide, page, label)
    _notes(slide, notes)


def _table_slide(prs, title: str, table: Dict[str, Any], page: int, label: str, notes: str = "") -> None:
    p = _state["palette"]
    slide = _new_slide(prs)
    _background(slide, p["bg"])
    _header(slide, title)
    header = [str(h) for h in table.get("header", [])][:5]
    rows = [[str(c) for c in r][:len(header)] for r in table.get("rows", [])][:8]
    if not header or not rows:
        return _content_slide(prs, title, [], "", page, label, notes)
    shape = slide.shapes.add_table(len(rows) + 1, len(header), Inches(MARGIN), Inches(2.0),
                                   Inches(SLIDE_W - 2 * MARGIN), Inches(0.5 * (len(rows) + 1)))
    grid = shape.table
    size = 16 if len(rows) <= 5 else 14
    for c, text in enumerate(header):
        cell = grid.cell(0, c)
        cell.fill.solid()
        cell.fill.fore_color.rgb = _rgb(p["primary"])
        cell.text = text
        _style_cell(cell, size, p["on_primary"], bold=True)
    for r, row in enumerate(rows, start=1):
        for c, text in enumerate(row):
            cell = grid.cell(r, c)
            cell.fill.solid()
            cell.fill.fore_color.rgb = _rgb(p["surface"] if r % 2 else p["bg"])
            cell.text = text
            _style_cell(cell, size, p["ink"])
    _footer(slide, page, label)
    _notes(slide, notes)


def _style_cell(cell, size: int, color: str, bold: bool = False) -> None:
    cell.margin_left = cell.margin_right = Inches(0.15)
    cell.margin_top = cell.margin_bottom = Inches(0.08)
    cell.vertical_anchor = MSO_ANCHOR.MIDDLE
    for paragraph in cell.text_frame.paragraphs:
        paragraph.font.size = Pt(size)
        paragraph.font.bold = bold
        paragraph.font.color.rgb = _rgb(color)
        paragraph.font.name = _state["font"]


def _conclusion_slide(prs, points: List[str], call_to_action: str, page: int, label: str, notes: str = "") -> None:
    p = _state["palette"]
    slide = _new_slide(prs)
    _background(slide, p["bg"])
    _header(slide, "핵심 정리")
    items = [str(x) for x in points][:3]
    if items:
        gap = 0.3
        card_w = (SLIDE_W - 2 * MARGIN - gap * (len(items) - 1)) / len(items)
        for i, text in enumerate(items):
            x = MARGIN + i * (card_w + gap)
            _rect(slide, x, 2.1, card_w, 3.3, p["surface"])
            _text(slide, x + 0.35, 2.4, 1.0, 0.6, f"{i + 1:02d}", 26, p["accent"], bold=True, spacing=1.0, space_after=0)
            size = _fit_size([text], card_w - 0.7, 2.0, 20, 14)
            _text(slide, x + 0.35, 3.2, card_w - 0.7, 2.0, text, size, p["ink"], spacing=1.3)
    if call_to_action:
        _rect(slide, MARGIN, 5.8, SLIDE_W - 2 * MARGIN, 0.9, p["primary"])
        size = _fit_size([call_to_action], SLIDE_W - 2 * MARGIN - 0.8, 0.9, 20, 14)
        _text(slide, MARGIN + 0.4, 5.8, SLIDE_W - 2 * MARGIN - 0.8, 0.9, call_to_action, size, p["on_primary"],
              bold=True, anchor=MSO_ANCHOR.MIDDLE, spacing=1.1, space_after=0)
    _footer(slide, page, label)
    _notes(slide, notes)


def write_pptx(slides: List[Dict[str, Any]], path: Path, title: str = "", subtitle: str = "", author: str = "",
               primary: str = "", accent: str = "", font: str = "", theme: str = "",
               overrides: Optional[Dict[str, str]] = None) -> Path:
    """slides: 장표 구조 목록을 .pptx로 저장한다.

    지원하는 layout: title, section, toc(table_of_contents), content, stats, steps, columns, table, conclusion.
    """
    set_theme(primary, accent, font, theme, overrides)
    prs = Presentation()
    prs.slide_width = Inches(SLIDE_W)
    prs.slide_height = Inches(SLIDE_H)
    label = (title or "")[:40]
    for index, slide in enumerate(slides, start=1):
        layout = slide.get("layout") or slide.get("content_type") or "content"
        notes = str(slide.get("notes") or "")
        if layout == "title":
            _title_slide(prs, slide.get("title") or title, slide.get("subtitle") or subtitle,
                         slide.get("author") or author, notes)
        elif layout == "section":
            _section_slide(prs, str(slide.get("number") or f"{index:02d}"), slide.get("title", ""), notes)
        elif layout in ("table_of_contents", "toc"):
            _toc_slide(prs, [str(i) for i in slide.get("items", [])], index, label, notes)
        elif layout == "stats":
            _stats_slide(prs, slide.get("title", ""), slide.get("stats", []), index, label, notes)
        elif layout == "steps":
            _steps_slide(prs, slide.get("title", ""), slide.get("steps", []), index, label, notes)
        elif layout == "columns":
            _columns_slide(prs, slide.get("title", ""), slide.get("columns", []), index, label, notes)
        elif layout == "table":
            _table_slide(prs, slide.get("title", ""), slide.get("table", {}), index, label, notes)
        elif layout == "conclusion":
            _conclusion_slide(prs, [str(p) for p in slide.get("key_points", [])], slide.get("call_to_action", ""),
                              index, label, notes)
        else:
            _content_slide(prs, slide.get("title", ""), [str(b) for b in slide.get("bullets", [])],
                           str(slide.get("content") or slide.get("body") or ""), index, label, notes)
    path.parent.mkdir(parents=True, exist_ok=True)
    prs.save(str(path))
    return path
