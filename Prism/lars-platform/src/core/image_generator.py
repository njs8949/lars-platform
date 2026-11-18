"""
AI Image Generation Module
지원: DALL-E 3, Stable Diffusion (Replicate), Hugging Face
Midjourney: Discord automation 지원
"""
import json
import base64
import os
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional
from dataclasses import dataclass, field, asdict


@dataclass
class GeneratedImage:
    """생성된 이미지 메타데이터"""
    id: str
    prompt: str
    model: str  # "midjourney", "dall-e", "stable-diffusion" 등
    image_url: str
    thumbnail_url: Optional[str] = None
    status: str = "completed"  # pending, processing, completed, failed
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    quality: Optional[str] = None  # regular, premium
    style: Optional[str] = None  # niji, raw, v5 등
    size: str = "1024x1024"
    error: Optional[str] = None


class ImageGenerator:
    """Midjourney & AI 이미지 생성 관리자"""

    def __init__(self, storage_dir=".lars/images"):
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        self.history_file = self.storage_dir / "generation_history.json"
        self.config_file = self.storage_dir / "image_config.json"

        self._init_files()
        self._load_config()

    def _init_files(self):
        """초기화 파일 생성"""
        if not self.history_file.exists():
            self.history_file.write_text(json.dumps([], indent=2))
        if not self.config_file.exists():
            self.config_file.write_text(json.dumps({
                "dalle_api_key": os.getenv("OPENAI_API_KEY", ""),
                "replicate_api_key": os.getenv("REPLICATE_API_KEY", ""),
                "huggingface_api_key": os.getenv("HUGGINGFACE_API_KEY", ""),
                "default_model": "dalle",
                "default_quality": "hd",
                "default_style": "vibrant"
            }, indent=2))

    def _load_config(self):
        """설정 로드"""
        try:
            config_text = self.config_file.read_text()
            self.config = json.loads(config_text) if config_text.strip() else {}
        except Exception:
            self.config = {
                "midjourney_api_key": os.getenv("MIDJOURNEY_API_KEY", ""),
                "dalle_api_key": os.getenv("OPENAI_API_KEY", ""),
                "replicate_api_key": os.getenv("REPLICATE_API_KEY", ""),
                "default_model": "midjourney",
                "default_quality": "regular",
                "default_style": "v5"
            }
        env_keys = {
            "dalle_api_key": "OPENAI_API_KEY",
            "replicate_api_key": "REPLICATE_API_KEY",
            "huggingface_api_key": "HUGGINGFACE_API_KEY",
            "stability_api_key": "STABILITY_API_KEY",
        }
        for config_key, env_name in env_keys.items():
            self.config[config_key] = os.getenv(env_name) or self.config.get(config_key, "")

    # ========== 이미지 생성 ==========
    def generate_image(
        self,
        prompt: str,
        model: str = "dalle",
        quality: str = "hd",
        style: str = "vibrant",
        size: str = "1024x1024"
    ) -> Dict:
        """이미지 생성 (실제 API 기반)"""

        if not prompt or not prompt.strip():
            return {"status": "error", "message": "프롬프트를 입력하세요."}

        if model == "dalle":
            return self._generate_dalle(prompt, size, quality)
        elif model == "stable-diffusion":
            return self._generate_stable_diffusion(prompt, style, size)
        elif model == "huggingface":
            return self._generate_huggingface(prompt, style, size)
        else:
            return {"status": "error", "message": f"지원하지 않는 모델: {model}"}

    def _generate_stable_diffusion(self, prompt: str, style: str, size: str) -> Dict:
        """Stable Diffusion (Stability AI API, Stable Image Core)"""
        api_key = self.config.get("stability_api_key") or os.getenv("STABILITY_API_KEY", "")

        if not api_key:
            return {
                "status": "error",
                "message": "Stability AI API 키가 설정되지 않았습니다."
            }

        try:
            import base64
            import requests

            width, height = (int(v) for v in size.lower().split("x"))
            ratios = {"1:1": 1.0, "16:9": 16 / 9, "9:16": 9 / 16, "3:2": 1.5, "2:3": 2 / 3, "4:5": 0.8, "5:4": 1.25}
            aspect_ratio = min(ratios, key=lambda r: abs(ratios[r] - width / height))

            response = requests.post(
                "https://api.stability.ai/v2beta/stable-image/generate/core",
                headers={"Authorization": f"Bearer {api_key}", "Accept": "application/json"},
                files={"none": ""},
                data={"prompt": prompt, "aspect_ratio": aspect_ratio, "output_format": "png"},
                timeout=120,
            )
            if response.status_code != 200:
                return {
                    "status": "error",
                    "message": f"Stability AI 오류 ({response.status_code}): {response.text[:200]}"
                }

            image_id = f"sdimg_{int(datetime.now().timestamp() * 1000)}"
            (self.storage_dir / f"{image_id}.png").write_bytes(
                base64.b64decode(response.json()["image"])
            )

            image_data = GeneratedImage(
                id=image_id,
                prompt=prompt,
                model="stable-diffusion",
                image_url=f"/api/image/file/{image_id}.png",
                status="completed",
                size=size,
                style=style
            )
            self._save_to_history(image_data)

            return {
                "status": "success",
                "image": asdict(image_data)
            }
        except Exception as e:
            return {
                "status": "error",
                "message": f"Stable Diffusion 오류: {str(e)}"
            }

    def _generate_huggingface(self, prompt: str, style: str, size: str) -> Dict:
        """Hugging Face Inference Providers 텍스트→이미지 생성 (FLUX.1-schnell)"""
        api_key = self.config.get("huggingface_api_key", "")

        if not api_key:
            return {
                "status": "error",
                "message": "HuggingFace API 키가 설정되지 않았습니다."
            }

        try:
            import base64
            import io
            from huggingface_hub import InferenceClient

            width, height = (int(v) for v in size.lower().split("x"))
            client = InferenceClient(provider="auto", api_key=api_key)
            image = client.text_to_image(
                prompt,
                model="black-forest-labs/FLUX.1-schnell",
                width=width,
                height=height,
            )

            image_id = f"hfimg_{int(datetime.now().timestamp() * 1000)}"
            buffer = io.BytesIO()
            image.save(buffer, format="PNG")
            (self.storage_dir / f"{image_id}.png").write_bytes(buffer.getvalue())

            image_data = GeneratedImage(
                id=image_id,
                prompt=prompt,
                model="FLUX.1-schnell",
                image_url=f"/api/image/file/{image_id}.png",
                status="completed",
                size=size,
                style=style
            )
            self._save_to_history(image_data)

            return {
                "status": "success",
                "image": asdict(image_data)
            }
        except Exception as e:
            return {
                "status": "error",
                "message": f"HuggingFace 오류: {str(e)}"
            }

    def _generate_dalle(self, prompt: str, size: str = "1024x1024", quality: str = "hd") -> Dict:
        """OpenAI gpt-image-2 이미지 생성 (응답은 base64로 받아 파일로 저장)"""
        api_key = self.config.get("dalle_api_key", "")

        if not api_key:
            return {
                "status": "error",
                "message": "OpenAI API 키가 설정되지 않았습니다."
            }

        gpt_quality = {"hd": "high", "standard": "medium"}.get(quality, quality)

        try:
            import base64
            import openai

            client = openai.OpenAI(api_key=api_key)
            response = client.images.generate(
                model="gpt-image-2",
                prompt=prompt,
                size=size,
                quality=gpt_quality,
                n=1
            )

            image_id = f"gptimg_{int(datetime.now().timestamp() * 1000)}"
            (self.storage_dir / f"{image_id}.png").write_bytes(
                base64.b64decode(response.data[0].b64_json)
            )

            image_data = GeneratedImage(
                id=image_id,
                prompt=prompt,
                model="gpt-image-2",
                image_url=f"/api/image/file/{image_id}.png",
                status="completed",
                size=size,
                quality=gpt_quality
            )
            self._save_to_history(image_data)

            return {
                "status": "success",
                "image": asdict(image_data)
            }
        except Exception as e:
            return {
                "status": "error",
                "message": f"gpt-image-2 오류: {str(e)}"
            }

    def _generate_replicate(self, prompt: str, style: str, size: str) -> Dict:
        """Replicate를 통한 이미지 생성 (Stable Diffusion, Midjourney 등)"""
        api_key = self.config.get("replicate_api_key", "")

        if not api_key:
            return {
                "status": "error",
                "message": "Replicate API 키가 설정되지 않았습니다."
            }

        try:
            import replicate

            replicate.api.token = api_key

            # Stable Diffusion 3 또는 다른 모델 사용
            model = "stability-ai/stable-diffusion-3"

            output = replicate.run(
                model,
                input={
                    "prompt": prompt,
                    "width": 1024,
                    "height": 1024,
                    "num_outputs": 1
                }
            )

            image_url = output[0] if output else None

            if image_url:
                image_data = GeneratedImage(
                    id=f"replicate_{int(datetime.now().timestamp())}",
                    prompt=prompt,
                    model="stable-diffusion",
                    image_url=image_url,
                    status="completed",
                    style=style,
                    size=size
                )
                self._save_to_history(image_data)

                return {
                    "status": "success",
                    "image": asdict(image_data)
                }
            else:
                return {
                    "status": "error",
                    "message": "이미지 생성 실패"
                }
        except Exception as e:
            return {
                "status": "error",
                "message": f"Replicate 오류: {str(e)}"
            }

    # ========== 이력 관리 ==========
    def _save_to_history(self, image_data: GeneratedImage):
        """생성 이력에 저장"""
        history = json.loads(self.history_file.read_text())
        history.append(asdict(image_data))
        self.history_file.write_text(json.dumps(history, indent=2))

    def get_generation_history(self, limit: int = 50) -> List[Dict]:
        """생성 이력 조회"""
        history = json.loads(self.history_file.read_text())
        return sorted(history, key=lambda x: x.get("created_at", ""), reverse=True)[:limit]

    def get_image_by_id(self, image_id: str) -> Optional[Dict]:
        """ID로 이미지 조회"""
        history = json.loads(self.history_file.read_text())
        return next((img for img in history if img.get("id") == image_id), None)

    def delete_image(self, image_id: str) -> Dict:
        """이미지 삭제"""
        history = json.loads(self.history_file.read_text())
        history = [img for img in history if img.get("id") != image_id]
        self.history_file.write_text(json.dumps(history, indent=2))
        return {"status": "success", "message": f"이미지 {image_id} 삭제됨"}

    # ========== 설정 관리 ==========
    def update_config(self, config: Dict) -> Dict:
        """설정 업데이트"""
        self.config.update(config)
        self.config_file.write_text(json.dumps(self.config, indent=2))
        return {"status": "success", "config": self.config}

    def get_config(self) -> Dict:
        """설정 조회 (민감한 정보는 마스킹)"""
        safe_config = self.config.copy()
        for key in ["midjourney_api_key", "dalle_api_key", "replicate_api_key"]:
            if safe_config.get(key):
                safe_config[key] = safe_config[key][:4] + "****"
        return safe_config

    def set_api_key(self, service: str, api_key: str) -> Dict:
        """API 키 설정"""
        key_map = {
            "dalle": "dalle_api_key",
            "openai": "dalle_api_key",
            "replicate": "replicate_api_key",
            "stable-diffusion": "replicate_api_key",
            "huggingface": "huggingface_api_key"
        }

        if service not in key_map:
            return {"status": "error", "message": f"지원하지 않는 서비스: {service}"}

        self.config[key_map[service]] = api_key
        self.config_file.write_text(json.dumps(self.config, indent=2))
        return {"status": "success", "message": f"{service} API 키 설정됨"}


# 글로벌 인스턴스
image_generator = ImageGenerator()
