"""
PPT 생성 테마 라이브러리 - 전문 디자인 테마 통합
"""
from dataclasses import dataclass
from typing import Dict, List, Optional

@dataclass
class ThemeStyle:
    """테마 스타일 정의"""
    name: str
    primary_color: str
    secondary_color: str
    accent_color: str
    font_family: str
    font_size_title: int
    font_size_body: int
    background_style: str  # solid, gradient, pattern

class PPTThemeLibrary:
    """PPT 생성을 위한 전문 테마 라이브러리"""

    def __init__(self):
        self.themes = self._initialize_themes()

    def _initialize_themes(self) -> Dict[str, ThemeStyle]:
        """전문 테마 라이브러리 초기화"""
        return {
            # 비즈니스 테마
            "modern_blue": ThemeStyle(
                name="Modern Blue",
                primary_color="#003DA5",
                secondary_color="#F0F4F8",
                accent_color="#FF6B35",
                font_family="Arial, Helvetica",
                font_size_title=44,
                font_size_body=18,
                background_style="gradient"
            ),
            "corporate_elegant": ThemeStyle(
                name="Corporate Elegant",
                primary_color="#2C3E50",
                secondary_color="#ECF0F1",
                accent_color="#E74C3C",
                font_family="Georgia, serif",
                font_size_title=48,
                font_size_body=20,
                background_style="solid"
            ),
            "tech_startup": ThemeStyle(
                name="Tech Startup",
                primary_color="#1A1A2E",
                secondary_color="#16213E",
                accent_color="#00D4FF",
                font_family="'Courier New', monospace",
                font_size_title=40,
                font_size_body=16,
                background_style="pattern"
            ),

            # 크리에이티브 테마
            "vibrant_creative": ThemeStyle(
                name="Vibrant Creative",
                primary_color="#FF5733",
                secondary_color="#FFF5E1",
                accent_color="#33FF57",
                font_family="Verdana, sans-serif",
                font_size_title=45,
                font_size_body=18,
                background_style="gradient"
            ),
            "minimalist_zen": ThemeStyle(
                name="Minimalist Zen",
                primary_color="#FFFFFF",
                secondary_color="#F5F5F5",
                accent_color="#333333",
                font_family="'Trebuchet MS', sans-serif",
                font_size_title=42,
                font_size_body=16,
                background_style="solid"
            ),

            # 데이터/분석 테마
            "data_analytics": ThemeStyle(
                name="Data Analytics",
                primary_color="#003366",
                secondary_color="#E8F4F8",
                accent_color="#FF6600",
                font_family="'Segoe UI', Tahoma",
                font_size_title=46,
                font_size_body=18,
                background_style="gradient"
            ),
            "chart_master": ThemeStyle(
                name="Chart Master",
                primary_color="#1F77B4",
                secondary_color="#AEC7E8",
                accent_color="#FF7F0E",
                font_family="Arial, Helvetica",
                font_size_title=44,
                font_size_body=17,
                background_style="solid"
            ),

            # 마케팅/세일즈 테마
            "sales_punch": ThemeStyle(
                name="Sales Punch",
                primary_color="#C41E3A",
                secondary_color="#FFF0E6",
                accent_color="#FFB81C",
                font_family="Impact, fantasy",
                font_size_title=50,
                font_size_body=19,
                background_style="gradient"
            ),
            "marketing_wave": ThemeStyle(
                name="Marketing Wave",
                primary_color="#00A0D2",
                secondary_color="#F0F7FC",
                accent_color="#7FDBCA",
                font_family="Verdana, sans-serif",
                font_size_title=45,
                font_size_body=18,
                background_style="pattern"
            ),

            # 교육/학문 테마
            "academic_professional": ThemeStyle(
                name="Academic Professional",
                primary_color="#333333",
                secondary_color="#FAFAFA",
                accent_color="#0066CC",
                font_family="'Times New Roman', serif",
                font_size_title=48,
                font_size_body=18,
                background_style="solid"
            ),
            "educational_bright": ThemeStyle(
                name="Educational Bright",
                primary_color="#2ECC71",
                secondary_color="#F0F9FF",
                accent_color="#E74C3C",
                font_family="'Comic Sans MS', cursive",
                font_size_title=42,
                font_size_body=17,
                background_style="gradient"
            ),
        }

    def get_theme(self, theme_id: str) -> Optional[ThemeStyle]:
        """테마 조회"""
        return self.themes.get(theme_id)

    def get_all_themes(self) -> Dict[str, ThemeStyle]:
        """모든 테마 반환"""
        return self.themes

    def get_theme_category(self, category: str) -> Dict[str, ThemeStyle]:
        """카테고리별 테마 필터링"""
        category_map = {
            "business": ["modern_blue", "corporate_elegant", "tech_startup"],
            "creative": ["vibrant_creative", "minimalist_zen"],
            "analytics": ["data_analytics", "chart_master"],
            "marketing": ["sales_punch", "marketing_wave"],
            "education": ["academic_professional", "educational_bright"],
        }

        theme_ids = category_map.get(category, [])
        return {tid: self.themes[tid] for tid in theme_ids if tid in self.themes}

    def generate_pptx_with_theme(self, theme_id: str, title: str, content: List[str]) -> dict:
        """테마를 적용하여 PPTX 생성"""
        theme = self.get_theme(theme_id)
        if not theme:
            return {"success": False, "error": "Theme not found"}

        from pathlib import Path as _Path
        from src.core.pptx_writer import write_pptx
        slides = [{"layout": "title", "title": title, "subtitle": "", "author": ""}]
        for item in content:
            text = item if isinstance(item, str) else str(item.get("title", item))
            slides.append({"layout": "content", "title": text[:120], "bullets": []})
        ppt_id = f"ppt_{theme_id}_{abs(hash((title, len(content)))) % 10**8}"
        file_path = _Path(".lars") / "ppt" / f"{ppt_id}.pptx"
        write_pptx(slides, file_path, title=title, primary=theme.primary_color, accent=theme.accent_color,
                   font=(theme.font_family or "").split(",")[0].strip())
        return {
            "success": True,
            "ppt_id": ppt_id,
            "title": title,
            "slides": len(slides),
            "theme": theme.name,
            "colors": {
                "primary": theme.primary_color,
                "secondary": theme.secondary_color,
                "accent": theme.accent_color
            },
            "typography": {
                "font_family": theme.font_family,
                "title_size": theme.font_size_title,
                "body_size": theme.font_size_body
            },
            "style": theme.background_style,
            "file_path": str(file_path)
        }

# 글로벌 인스턴스
theme_library = PPTThemeLibrary()
