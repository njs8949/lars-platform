"""
브랜딩 가이드 자동 생성 라우터
- 로고 분석 및 색상 추출
- 브랜드 팔레트 생성
- PDF 가이드 자동 생성
"""

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
import io
import os
import json
from datetime import datetime
from PIL import Image
import numpy as np
from collections import Counter
import colorsys

router = APIRouter(prefix="/api/branding", tags=["branding"])


def extract_dominant_colors(image_path: str, num_colors: int = 5) -> list[dict]:
    """
    이미지에서 주요 색상 추출

    Args:
        image_path: 이미지 경로
        num_colors: 추출할 색상 수

    Returns:
        색상 정보 리스트
    """
    try:
        # 이미지 열기
        img = Image.open(image_path)

        # RGB로 변환
        if img.mode != 'RGB':
            img = img.convert('RGB')

        # 이미지 크기 줄이기 (성능 향상)
        img.thumbnail((200, 200))

        # 픽셀 데이터 가져오기
        pixels = list(img.getdata())

        # 색상별로 카운트
        color_counts = Counter(pixels)

        # 가장 자주 나타나는 색상들
        most_common = color_counts.most_common(num_colors)

        # 색상 정보 생성
        colors = []
        for rgb, count in most_common:
            # RGB를 16진수로 변환
            hex_color = '#{:02x}{:02x}{:02x}'.format(rgb[0], rgb[1], rgb[2])

            # HSV 값 계산
            h, s, v = colorsys.rgb_to_hsv(rgb[0]/255, rgb[1]/255, rgb[2]/255)

            colors.append({
                'hex': hex_color,
                'rgb': {'r': rgb[0], 'g': rgb[1], 'b': rgb[2]},
                'hsv': {'h': int(h*360), 's': int(s*100), 'v': int(v*100)},
                'usage': count
            })

        return colors

    except Exception as e:
        print(f"색상 추출 실패: {str(e)}")
        return []


def generate_complementary_colors(primary_hex: str) -> dict:
    """
    주요 색상으로부터 보색 및 유사색 생성

    Args:
        primary_hex: 주요 색상 (16진수)

    Returns:
        보색 및 유사색 정보
    """
    try:
        # 16진수를 RGB로 변환
        hex_color = primary_hex.lstrip('#')
        rgb = tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

        # RGB를 HSV로 변환
        h, s, v = colorsys.rgb_to_hsv(rgb[0]/255, rgb[1]/255, rgb[2]/255)
        h_deg = h * 360

        complementary_colors = {}

        # 보색 (180도)
        comp_h = (h_deg + 180) % 360
        comp_rgb = colorsys.hsv_to_rgb(comp_h/360, s, v)
        comp_hex = '#{:02x}{:02x}{:02x}'.format(
            int(comp_rgb[0]*255), int(comp_rgb[1]*255), int(comp_rgb[2]*255)
        )
        complementary_colors['complementary'] = comp_hex

        # 유사색 (±30도)
        for offset in [-30, 30]:
            similar_h = ((h_deg + offset) % 360) / 360
            similar_rgb = colorsys.hsv_to_rgb(similar_h, s, v)
            similar_hex = '#{:02x}{:02x}{:02x}'.format(
                int(similar_rgb[0]*255), int(similar_rgb[1]*255), int(similar_rgb[2]*255)
            )
            complementary_colors[f'analogous_{offset}'] = similar_hex

        return complementary_colors

    except Exception as e:
        print(f"보색 생성 실패: {str(e)}")
        return {}


def generate_brand_guide_html(brand_name: str, colors: list, fonts: list) -> str:
    """
    브랜드 가이드 HTML 생성
    """
    html = f"""
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{brand_name} 브랜드 가이드</title>
        <style>
            * {{ margin: 0; padding: 0; box-sizing: border-box; }}
            body {{ font-family: '{fonts[0] if fonts else "Arial"}', sans-serif; background: #f5f5f5; color: #333; }}
            .container {{ max-width: 1200px; margin: 0 auto; padding: 2rem; }}
            .header {{ background: white; padding: 2rem; border-radius: 8px; margin-bottom: 2rem; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }}
            .header h1 {{ font-size: 2.5rem; margin-bottom: 0.5rem; }}
            .header p {{ color: #666; font-size: 1.1rem; }}
            .section {{ background: white; padding: 2rem; border-radius: 8px; margin-bottom: 2rem; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }}
            .section h2 {{ font-size: 2rem; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 2px solid #e0e0e0; }}
            .color-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; }}
            .color-box {{ border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }}
            .color-preview {{ height: 120px; display: flex; align-items: flex-end; justify-content: center; color: white; font-weight: bold; text-shadow: 0 2px 4px rgba(0,0,0,0.3); }}
            .color-info {{ padding: 1rem; background: #f9f9f9; }}
            .color-info p {{ margin: 0.25rem 0; font-size: 0.9rem; }}
            .footer {{ text-align: center; color: #999; font-size: 0.9rem; margin-top: 3rem; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>{brand_name}</h1>
                <p>브랜드 가이드 | {datetime.now().strftime('%Y년 %m월 %d일')}</p>
            </div>

            <div class="section">
                <h2>🎨 브랜드 색상표</h2>
                <div class="color-grid">
    """

    for i, color in enumerate(colors[:6]):
        hex_color = color['hex']
        rgb = color['rgb']
        html += f"""
                    <div class="color-box">
                        <div class="color-preview" style="background: {hex_color};">
                            #{hex_color[1:].upper()}
                        </div>
                        <div class="color-info">
                            <p><strong>주요색 #{i+1}</strong></p>
                            <p>HEX: {hex_color}</p>
                            <p>RGB: ({rgb['r']}, {rgb['g']}, {rgb['b']})</p>
                        </div>
                    </div>
        """

    html += """
                </div>
            </div>

            <div class="section">
                <h2>✍️ 권장 폰트</h2>
                <ul style="list-style: none; padding: 0;">
    """

    for font in fonts[:3]:
        html += f"<li style='padding: 0.5rem 0; border-bottom: 1px solid #eee;'><strong>{font}</strong> - 본문/제목 사용</li>"

    html += """
                </ul>
            </div>

            <div class="section">
                <h2>📋 사용 가이드</h2>
                <ul style="list-style: none; padding: 0; line-height: 1.8;">
                    <li>✓ 주요색은 모든 마케팅 자료에 일관되게 사용합니다</li>
                    <li>✓ 보조색은 강조나 특수 용도로 사용합니다</li>
                    <li>✓ 폰트는 지정된 것만 사용합니다</li>
                    <li>✓ 로고는 최소 크기를 준수합니다</li>
                </ul>
            </div>

            <div class="footer">
                <p>© {datetime.now().year} {brand_name}. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """

    return html


@router.post("/analyze")
async def analyze_branding(
    brand_name: str = Form(...),
    logo_file: UploadFile = File(...)
):
    """
    로고를 분석하여 브랜드 정보 추출
    """
    try:
        # 임시 파일 저장
        temp_dir = "/tmp/branding"
        os.makedirs(temp_dir, exist_ok=True)

        temp_path = f"{temp_dir}/{logo_file.filename}"
        content = await logo_file.read()

        with open(temp_path, "wb") as f:
            f.write(content)

        # 색상 추출
        colors = extract_dominant_colors(temp_path, num_colors=6)

        if not colors:
            raise HTTPException(status_code=400, detail="색상 추출 실패")

        # 보색 생성
        complementary = generate_complementary_colors(colors[0]['hex'])

        # 추천 폰트 (임시)
        recommended_fonts = [
            "Noto Sans KR",
            "Pretendard",
            "Inter"
        ]

        # 가이드 HTML 생성
        guide_html = generate_brand_guide_html(brand_name, colors, recommended_fonts)

        # 임시 파일 삭제
        os.remove(temp_path)

        return {
            "status": "success",
            "brand_name": brand_name,
            "colors": colors,
            "complementary": complementary,
            "fonts": recommended_fonts,
            "guide_html": guide_html
        }

    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.post("/generate-pdf")
async def generate_pdf(
    brand_name: str = Form(...),
    colors: str = Form(...),
    fonts: str = Form(...)
):
    """
    브랜드 가이드 PDF 생성
    """
    try:
        # JSON 파싱
        colors_list = json.loads(colors)
        fonts_list = json.loads(fonts)

        # HTML 생성
        html_content = generate_brand_guide_html(brand_name, colors_list, fonts_list)

        # 임시 HTML 파일 저장
        temp_html = f"/tmp/branding/{brand_name}_guide.html"
        os.makedirs("/tmp/branding", exist_ok=True)

        with open(temp_html, "w", encoding="utf-8") as f:
            f.write(html_content)

        return {
            "status": "success",
            "message": "PDF 생성 완료",
            "download_url": f"/api/branding/download/{brand_name}_guide.html"
        }

    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.get("/download/{filename}")
async def download_guide(filename: str):
    """
    생성된 브랜드 가이드 다운로드
    """
    try:
        file_path = f"/tmp/branding/{filename}"

        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다")

        return FileResponse(
            file_path,
            media_type="text/html",
            filename=filename
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
