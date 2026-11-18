"""
Prism 백엔드 호출 공통 모듈 (웹/데스크톱과 동일한 엔드포인트 사용)
"""

import json
import os
import re
from pathlib import Path
from typing import Callable, Dict, Iterator, List, Optional

import requests

API_BASE_URL = os.getenv("PRISM_API_URL", "http://localhost:8001/api")
IMAGE_DIR = Path(os.getenv("PRISM_IMAGE_DIR", "prism_images"))

_IMAGE_NOUN = "이미지|그림|사진|일러스트|삽화|포스터|로고|아이콘|썸네일|배경|장면|모습|캐릭터|그래픽|아트|초상"
_IMAGE_ACT = "생성|만들|만드|제작|그려|그리|뽑아|출력|렌더|보여"
_IMAGE_REQUEST = re.compile(
    rf"({_IMAGE_NOUN}).*({_IMAGE_ACT})|({_IMAGE_ACT}).*({_IMAGE_NOUN})"
    r"|그려\s*(줘|주세요|달라|주라)|그려줄"
    r"|\b(generate|create|make|render)\b.*\b(image|picture|illustration|photo|logo|poster|scene)\b"
    r"|\bdraw\b|\b(image|picture|photo) of\b",
    re.IGNORECASE,
)

IMAGE_MODELS = {"gpt": "dalle", "stable": "stable-diffusion"}


class PrismApiError(Exception):
    pass


def detect_image_request(text: str) -> bool:
    return bool(_IMAGE_REQUEST.search(text))


def stream_assistant(message: str, history: List[Dict[str, str]]) -> Iterator[Dict]:
    """채팅 SSE 스트림을 이벤트 dict로 순회한다 (delta / replace / done / error)."""
    try:
        response = requests.post(
            f"{API_BASE_URL}/assistant/chat/stream",
            json={"message": message, "history": history},
            stream=True,
            timeout=(10, 300),
        )
    except requests.exceptions.RequestException as e:
        raise PrismApiError(f"백엔드 연결 실패: {e}")

    if response.status_code != 200:
        raise PrismApiError(f"백엔드 오류 (상태: {response.status_code})")

    for line in response.iter_lines(decode_unicode=True):
        if line and line.startswith("data: "):
            event = json.loads(line[6:])
            if event.get("type") == "error":
                raise PrismApiError(event.get("message", "알 수 없는 오류"))
            yield event


def generate_image(prompt: str, model: str = "dalle", quality: str = "medium", size: str = "1024x1024") -> Dict:
    """이미지 생성 (동기). 성공 시 image 메타데이터(dict) 반환."""
    try:
        response = requests.post(
            f"{API_BASE_URL}/image/generate",
            json={"prompt": prompt, "model": model, "quality": quality, "size": size},
            timeout=(10, 400),
        )
    except requests.exceptions.RequestException as e:
        raise PrismApiError(f"백엔드 연결 실패: {e}")

    data = response.json() if response.content else {}
    if response.status_code != 200:
        raise PrismApiError(data.get("detail", f"이미지 생성 실패 (상태: {response.status_code})"))
    return data["image"]


def download_image(image: Dict, output_dir: Path = IMAGE_DIR) -> Path:
    """생성된 이미지를 로컬 파일로 저장하고 경로를 반환."""
    root = API_BASE_URL[: -len("/api")] if API_BASE_URL.endswith("/api") else API_BASE_URL
    try:
        response = requests.get(f"{root}{image['image_url']}", timeout=60)
    except requests.exceptions.RequestException as e:
        raise PrismApiError(f"이미지 다운로드 실패: {e}")
    if response.status_code != 200:
        raise PrismApiError(f"이미지 다운로드 실패 (상태: {response.status_code})")

    output_dir.mkdir(parents=True, exist_ok=True)
    path = output_dir / f"{image['id']}.png"
    path.write_bytes(response.content)
    return path


def list_images(limit: int = 50) -> List[Dict]:
    response = requests.get(f"{API_BASE_URL}/image/history", params={"limit": limit}, timeout=30)
    if response.status_code != 200:
        raise PrismApiError(f"이력 조회 실패 (상태: {response.status_code})")
    return response.json().get("images", [])


def delete_image(image_id: str) -> Dict:
    response = requests.delete(f"{API_BASE_URL}/image/{image_id}", timeout=30)
    if response.status_code != 200:
        raise PrismApiError(f"삭제 실패 (상태: {response.status_code})")
    return response.json()


def estimated_percent(elapsed_seconds: float, expected_seconds: float = 90.0, cap: float = 95.0) -> int:
    """웹 진행률 카드와 같은 예상 진행률 (실제 진행률 아님)."""
    import math

    return min(int(cap), int(round(cap * (1 - math.exp(-elapsed_seconds / (expected_seconds / 3))))))


def run_with_progress(fn: Callable[[], Dict], label: str) -> Dict:
    """fn을 백그라운드로 실행하며 예상 진행률 막대를 표시한다."""
    import time
    from concurrent.futures import ThreadPoolExecutor

    from rich.console import Console
    from rich.progress import BarColumn, Progress, TextColumn, TimeElapsedColumn

    console = Console()
    with Progress(
        TextColumn("[bold cyan]{task.description}"),
        BarColumn(),
        TextColumn("{task.percentage:>3.0f}%"),
        TimeElapsedColumn(),
        console=console,
        transient=True,
    ) as progress:
        task = progress.add_task(f"{label} (예상 진행률)", total=100)
        started = time.time()
        with ThreadPoolExecutor(max_workers=1) as pool:
            future = pool.submit(fn)
            while not future.done():
                progress.update(task, completed=estimated_percent(time.time() - started))
                time.sleep(0.25)
            progress.update(task, completed=100)
            return future.result()
