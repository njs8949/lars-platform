"""
AI 심리학 기반 색상/폰트 추천 라우터
- 브랜드 성격 분석
- 심리학 기반 색상 추천
- 폰트 쌍 추천
- WCAG 접근성 검증
"""

from fastapi import APIRouter, Form, HTTPException
from enum import Enum
import json
import colorsys

router = APIRouter(prefix="/api/color-font", tags=["color-font"])


# 📌 색상 심리학 데이터베이스
COLOR_PSYCHOLOGY = {
    "red": {
        "hex": "#FF4444",
        "psychology": ["passion", "energy", "danger", "excitement"],
        "industries": ["food", "sports", "entertainment", "luxury"],
        "emotions": ["powerful", "exciting", "urgent"],
        "description": "열정, 에너지, 위험성을 나타냅니다"
    },
    "blue": {
        "hex": "#4444FF",
        "psychology": ["trust", "stability", "calm", "professional"],
        "industries": ["technology", "finance", "healthcare", "corporate"],
        "emotions": ["trustworthy", "calm", "professional"],
        "description": "신뢰, 안정성, 전문성을 나타냅니다"
    },
    "green": {
        "hex": "#44FF44",
        "psychology": ["nature", "growth", "health", "sustainable"],
        "industries": ["environment", "health", "organic", "eco-friendly"],
        "emotions": ["natural", "peaceful", "healthy"],
        "description": "자연, 성장, 건강을 나타냅니다"
    },
    "yellow": {
        "hex": "#FFDD44",
        "psychology": ["optimism", "happiness", "energy", "creativity"],
        "industries": ["creative", "fashion", "tech startup", "education"],
        "emotions": ["cheerful", "optimistic", "creative"],
        "description": "낙관주의, 행복, 창의성을 나타냅니다"
    },
    "purple": {
        "hex": "#AA44FF",
        "psychology": ["luxury", "creativity", "mystery", "wisdom"],
        "industries": ["luxury", "beauty", "creative", "technology"],
        "emotions": ["sophisticated", "creative", "mysterious"],
        "description": "럭셔리, 창의성, 신비로움을 나타냅니다"
    },
    "orange": {
        "hex": "#FF8844",
        "psychology": ["enthusiasm", "warmth", "friendliness", "adventure"],
        "industries": ["food", "adventure", "social", "creative"],
        "emotions": ["friendly", "enthusiastic", "warm"],
        "description": "열정, 따뜻함, 친근함을 나타냅니다"
    },
    "black": {
        "hex": "#000000",
        "psychology": ["elegance", "power", "sophistication", "mystery"],
        "industries": ["luxury", "technology", "fashion", "corporate"],
        "emotions": ["powerful", "elegant", "serious"],
        "description": "우아함, 권력, 정교함을 나타냅니다"
    },
    "white": {
        "hex": "#FFFFFF",
        "psychology": ["clean", "simple", "pure", "professional"],
        "industries": ["technology", "healthcare", "luxury", "minimalist"],
        "emotions": ["clean", "professional", "pure"],
        "description": "깔끔함, 단순함, 순수함을 나타냅니다"
    }
}

# 📌 브랜드 성격별 색상 조합
BRAND_PERSONALITY_COLORS = {
    "luxury": ["#FFD700", "#000000", "#C0C0C0"],  # 금, 검정, 은
    "tech": ["#0066FF", "#00FF00", "#FFFFFF"],  # 파랑, 녹색, 흰색
    "eco": ["#00AA00", "#FFFFFF", "#996633"],  # 녹색, 흰색, 갈색
    "creative": ["#FF6600", "#FF00FF", "#FFFF00"],  # 주황, 자주색, 노랑
    "corporate": ["#0033CC", "#FFFFFF", "#666666"],  # 진한파랑, 흰색, 회색
    "playful": ["#FF3333", "#FFD700", "#00CCFF"],  # 빨강, 금, 청록
    "minimalist": ["#FFFFFF", "#000000", "#999999"],  # 흰색, 검정, 회색
    "nature": ["#00AA00", "#8B4513", "#87CEEB"]  # 녹색, 갈색, 하늘색
}

# 📌 폰트 추천 데이터베이스
FONT_RECOMMENDATIONS = {
    "luxury": {
        "display": ["Playfair Display", "Bodoni", "Didot"],
        "body": ["Lora", "Georgia", "Crimson Text"],
        "description": "우아하고 고급스러운 느낌"
    },
    "tech": {
        "display": ["Inter", "Roboto", "Space Mono"],
        "body": ["Open Sans", "Lato", "Poppins"],
        "description": "현대적이고 깔끔한 느낌"
    },
    "eco": {
        "display": ["Raleway", "Montserrat", "Quicksand"],
        "body": ["Nunito", "Source Sans Pro", "Cabin"],
        "description": "자연스럽고 친근한 느낌"
    },
    "creative": {
        "display": ["Fredoka One", "Pacifico", "Varela Round"],
        "body": ["Comfortaa", "Nunito", "Ubuntu"],
        "description": "창의적이고 독특한 느낌"
    },
    "corporate": {
        "display": ["IBM Plex Sans", "Roboto Slab", "Work Sans"],
        "body": ["IBM Plex Sans", "Source Sans Pro", "Libre Franklin"],
        "description": "전문적이고 신뢰감 있는 느낌"
    },
    "playful": {
        "display": ["Fredoka", "Quicksand", "Comfortaa"],
        "body": ["Ubuntu", "Raleway", "Poppins"],
        "description": "밝고 친근한 느낌"
    },
    "minimalist": {
        "display": ["Helvetica", "Futura", "Avenir"],
        "body": ["Arial", "Calibri", "Segoe UI"],
        "description": "단순하고 명확한 느낌"
    },
    "nature": {
        "display": ["Raleway", "Playfair Display", "Montserrat"],
        "body": ["Open Sans", "Lato", "Raleway"],
        "description": "자연스럽고 균형잡힌 느낌"
    }
}

# 📌 산업별 색상 조합
INDUSTRY_COLORS = {
    "food": ["#FF6B6B", "#FFC93C", "#FFFFFF"],
    "healthcare": ["#00B4D8", "#FFFFFF", "#90E0EF"],
    "finance": ["#0B3D91", "#FFFFFF", "#E8E8E8"],
    "education": ["#6A4C93", "#FFBE0B", "#FFFFFF"],
    "retail": ["#FF006E", "#FB5607", "#FFBE0B"],
    "entertainment": ["#6A0572", "#FF006E", "#FFBE0B"],
    "technology": ["#0077B6", "#00B4D8", "#CAF0F8"],
    "fashion": ["#000000", "#FFD60A", "#FFFFFF"],
    "real_estate": ["#8B4513", "#D4AF37", "#F5F5DC"],
    "automotive": ["#1B1B1B", "#C0C0C0", "#FF0000"]
}


def analyze_brand_personality(brand_name: str, description: str) -> dict:
    """
    브랜드 설명을 분석하여 성격 분류
    """
    description_lower = description.lower()

    # 키워드 기반 성격 분석
    personality_scores = {}

    keywords = {
        "luxury": ["luxury", "premium", "exclusive", "high-end", "upscale", "elegant"],
        "tech": ["technology", "digital", "innovative", "modern", "smart", "futuristic"],
        "eco": ["sustainable", "eco", "natural", "organic", "green", "environment"],
        "creative": ["creative", "artistic", "design", "unique", "innovative", "original"],
        "corporate": ["professional", "business", "corporate", "trust", "reliable", "stable"],
        "playful": ["fun", "playful", "young", "dynamic", "energetic", "joyful"],
        "minimalist": ["simple", "minimal", "clean", "minimal", "pure", "essential"],
        "nature": ["natural", "organic", "earth", "sustainable", "green", "outdoor"]
    }

    for personality, kw_list in keywords.items():
        score = sum(1 for kw in kw_list if kw in description_lower)
        personality_scores[personality] = score

    # 점수가 가장 높은 성격 반환
    top_personality = max(personality_scores, key=personality_scores.get)

    return {
        "personality": top_personality,
        "scores": personality_scores,
        "description": f"'{brand_name}'는 {top_personality} 브랜드로 분류됩니다"
    }


def get_color_recommendations(personality: str, industry: str = None) -> dict:
    """
    브랜드 성격 및 산업에 기반한 색상 추천
    """
    # 성격 기반 색상
    personality_colors = BRAND_PERSONALITY_COLORS.get(personality, BRAND_PERSONALITY_COLORS["corporate"])

    # 산업 기반 색상 (우선순위 낮음)
    industry_colors = None
    if industry and industry in INDUSTRY_COLORS:
        industry_colors = INDUSTRY_COLORS[industry]

    # 주요색 선택
    primary_color = personality_colors[0]
    secondary_color = personality_colors[1]
    accent_color = personality_colors[2]

    # WCAG 접근성 검증
    primary_wcag = calculate_wcag_contrast(primary_color, "#FFFFFF")
    secondary_wcag = calculate_wcag_contrast(secondary_color, "#FFFFFF")

    return {
        "primary": {
            "hex": primary_color,
            "psychology": COLOR_PSYCHOLOGY.get(personality, {}).get("psychology", [])
        },
        "secondary": {
            "hex": secondary_color,
            "wcag_contrast": secondary_wcag
        },
        "accent": {
            "hex": accent_color
        },
        "palette": {
            "primary": primary_color,
            "secondary": secondary_color,
            "accent": accent_color,
            "neutral_light": "#F5F5F5",
            "neutral_dark": "#333333"
        },
        "wcag_compliant": primary_wcag >= 4.5  # AA 표준
    }


def get_font_recommendations(personality: str) -> dict:
    """
    브랜드 성격에 맞는 폰트 추천
    """
    fonts = FONT_RECOMMENDATIONS.get(personality, FONT_RECOMMENDATIONS["corporate"])

    return {
        "display": {
            "primary": fonts["display"][0],
            "alternatives": fonts["display"][1:],
            "usage": "제목, 헤더"
        },
        "body": {
            "primary": fonts["body"][0],
            "alternatives": fonts["body"][1:],
            "usage": "본문, 설명"
        },
        "recommendation": fonts["description"],
        "pairings": [
            {
                "display": fonts["display"][0],
                "body": fonts["body"][0],
                "score": 9.5
            },
            {
                "display": fonts["display"][0],
                "body": fonts["body"][1],
                "score": 9.0
            }
        ]
    }


def calculate_wcag_contrast(hex1: str, hex2: str) -> float:
    """
    두 색상 간의 WCAG 대비도 계산

    WCAG 기준:
    - 4.5:1 = AA (일반 텍스트)
    - 3:1 = AA (큰 텍스트)
    - 7:1 = AAA (일반 텍스트)
    """
    def get_luminance(hex_color):
        hex_color = hex_color.lstrip('#')
        r, g, b = [int(hex_color[i:i+2], 16)/255.0 for i in (0, 2, 4)]

        r = r/12.92 if r <= 0.03928 else ((r+0.055)/1.055)**2.4
        g = g/12.92 if g <= 0.03928 else ((g+0.055)/1.055)**2.4
        b = b/12.92 if b <= 0.03928 else ((b+0.055)/1.055)**2.4

        return 0.2126*r + 0.7152*g + 0.0722*b

    lum1 = get_luminance(hex1)
    lum2 = get_luminance(hex2)

    lighter = max(lum1, lum2)
    darker = min(lum1, lum2)

    return (lighter + 0.05) / (darker + 0.05)


@router.post("/recommend")
async def recommend_colors_and_fonts(
    brand_name: str = Form(...),
    description: str = Form(...),
    industry: str = Form(None)
):
    """
    브랜드 설명을 기반으로 색상 및 폰트 추천
    """
    try:
        # 브랜드 성격 분석
        personality_analysis = analyze_brand_personality(brand_name, description)
        personality = personality_analysis["personality"]

        # 색상 추천
        color_recommendations = get_color_recommendations(personality, industry)

        # 폰트 추천
        font_recommendations = get_font_recommendations(personality)

        return {
            "status": "success",
            "brand_name": brand_name,
            "personality": personality_analysis,
            "colors": color_recommendations,
            "fonts": font_recommendations,
            "recommendations": {
                "message": f"'{brand_name}'는 {personality} 성격의 브랜드입니다",
                "color_story": f"주요색 {color_recommendations['primary']['hex']}는 {', '.join(color_recommendations['primary']['psychology'][:2])}을(를) 나타냅니다",
                "font_story": font_recommendations["recommendation"],
                "wcag_accessible": color_recommendations["wcag_compliant"]
            }
        }

    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.post("/validate-accessibility")
async def validate_accessibility(
    primary_color: str = Form(...),
    secondary_color: str = Form(...),
    text_color: str = Form(...)
):
    """
    색상 조합의 접근성 검증
    """
    try:
        contrast_primary = calculate_wcag_contrast(primary_color, text_color)
        contrast_secondary = calculate_wcag_contrast(secondary_color, text_color)

        return {
            "status": "success",
            "primary_contrast": round(contrast_primary, 2),
            "secondary_contrast": round(contrast_secondary, 2),
            "primary_wcag": {
                "AA": contrast_primary >= 4.5,
                "AAA": contrast_primary >= 7.0
            },
            "secondary_wcag": {
                "AA": contrast_secondary >= 4.5,
                "AAA": contrast_secondary >= 7.0
            },
            "recommendations": [
                "AA 표준 (4.5:1)은 일반 텍스트에 권장됩니다",
                "AAA 표준 (7:1)은 모든 사용자에게 권장됩니다",
                "큰 텍스트는 3:1 이상이면 충분합니다"
            ]
        }

    except Exception as e:
        return {"status": "error", "message": str(e)}
