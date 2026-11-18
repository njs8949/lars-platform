"""EXAONE Tabular 클라이언트: 학습 CSV와 예측 CSV를 올리면 분류 또는 회귀 예측을 받는다.

API: POST {base}/v1/tabular/{classification|regression} (multipart/form-data)
키와 주소는 .env에서 읽는다 (EXAONE_API_KEY, EXAONE_TABULAR_BASE_URL).
"""

from typing import Any, Dict

import requests

from src.core.model_router import _env_value

TABULAR_TIMEOUT = 300
DEFAULT_BASE_URL = "https://api.exaone.ai"
OUTPUT_TYPES = {
    "classification": ("class", "probability"),
    "regression": ("point", "full"),
}


def tabular_base_url() -> str:
    return (_env_value("EXAONE_TABULAR_BASE_URL") or DEFAULT_BASE_URL).rstrip("/")


def predict(task: str, train_csv: bytes, test_csv: bytes, target: str, output_type: str = "") -> Dict[str, Any]:
    if task not in OUTPUT_TYPES:
        raise ValueError("task는 classification 또는 regression 이어야 합니다.")
    allowed = OUTPUT_TYPES[task]
    output_type = output_type or allowed[0]
    if output_type not in allowed:
        raise ValueError(f"{task}의 output_type은 {', '.join(allowed)} 중 하나여야 합니다.")
    if not target.strip():
        raise ValueError("예측할 target 열 이름이 필요합니다.")
    api_key = _env_value("EXAONE_API_KEY")
    if not api_key:
        raise RuntimeError("EXAONE_API_KEY가 비어 있습니다 (.env에 입력하세요).")

    response = requests.post(
        f"{tabular_base_url()}/v1/tabular/{task}",
        headers={"Authorization": f"Bearer {api_key}"},
        data={"mode": "default", "output_type": output_type, "target_columns": [target.strip()]},
        files={
            "train_file": ("train.csv", train_csv, "text/csv"),
            "test_file": ("test.csv", test_csv, "text/csv"),
        },
        timeout=TABULAR_TIMEOUT,
    )
    if response.status_code >= 400:
        raise RuntimeError(f"EXAONE Tabular 호출 실패 ({response.status_code}): {response.text[:300]}")
    body = response.json()
    if body.get("result_code") != 200:
        raise RuntimeError(f"EXAONE Tabular 오류: {body.get('description') or body}")
    return body.get("data", {})
