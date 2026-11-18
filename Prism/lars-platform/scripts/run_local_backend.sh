#!/bin/bash
# 로컬 백엔드(8001)를 시크릿 매니저의 이미지 API 키와 함께 실행한다.
# 키는 디스크에 저장하지 않고 프로세스 환경 변수로만 전달한다.
set -euo pipefail

SECRET_ID="${PRISM_IMAGE_SECRET_ID:-lars-prism/image-api-keys}"
REGION="${AWS_REGION:-ap-northeast-2}"
PORT="${PRISM_BACKEND_PORT:-8001}"

cd "$(dirname "$0")/.."

SECRET_JSON="$(aws secretsmanager get-secret-value --secret-id "$SECRET_ID" --region "$REGION" --query SecretString --output text)"

eval "$(printf '%s' "$SECRET_JSON" | python3 -c '
import json, shlex, sys
keys = ["OPENAI_API_KEY", "STABILITY_API_KEY", "REPLICATE_API_KEY", "HUGGINGFACE_API_KEY"]
data = json.load(sys.stdin)
for k in keys:
    v = data.get(k, "")
    if v:
        print(f"export {k}={shlex.quote(v)}")
')"

echo "키 로드: OPENAI=$([ -n "${OPENAI_API_KEY:-}" ] && echo set || echo empty), STABILITY=$([ -n "${STABILITY_API_KEY:-}" ] && echo set || echo empty), HUGGINGFACE=$([ -n "${HUGGINGFACE_API_KEY:-}" ] && echo set || echo empty)"

exec python3 -m uvicorn app:app --host 127.0.0.1 --port "$PORT"
