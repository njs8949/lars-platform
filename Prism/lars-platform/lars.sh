#!/bin/bash

# LARS Prism CLI Wrapper Script
# Python main.py를 호출하는 래퍼 스크립트

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHON_SCRIPT="$SCRIPT_DIR/src/cli/main.py"

# 파이썬 스크립트 실행
python3 "$PYTHON_SCRIPT" "$@"
