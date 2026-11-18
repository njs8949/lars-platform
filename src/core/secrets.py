"""시크릿 매니저에서 값을 읽는다 (AWS CLI 사용, 값은 디스크에 저장하지 않음)."""

import json
import subprocess
from typing import Optional


def load_secret_string(secret_id: str, region: str = "ap-northeast-2") -> str:
    result = subprocess.run(
        ["aws", "secretsmanager", "get-secret-value", "--secret-id", secret_id,
         "--region", region, "--query", "SecretString", "--output", "text"],
        capture_output=True, text=True, timeout=60,
    )
    if result.returncode != 0:
        raise RuntimeError(f"시크릿 조회 실패: {result.stderr.strip()}")
    return result.stdout.strip()


def secret_api_key(secret_id: str, json_key: Optional[str] = None) -> str:
    raw = load_secret_string(secret_id)
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return raw
    if json_key:
        return data.get(json_key, "")
    return next((v for v in data.values() if isinstance(v, str) and v), "")
