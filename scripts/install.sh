#!/bin/bash
# Prism CLI 설치 스크립트 (macOS/Linux)

set -e

echo "==================================="
echo "🚀 Prism CLI 설치"
echo "==================================="

# OS 감지
OS=$(uname -s)
ARCH=$(uname -m)

case "$OS" in
    Darwin)
        OS_NAME="macos"
        INSTALL_DIR="/usr/local/bin"
        ;;
    Linux)
        OS_NAME="linux"
        INSTALL_DIR="/usr/local/bin"
        ;;
    *)
        echo "❌ 지원하지 않는 OS: $OS"
        exit 1
        ;;
esac

VERSION="1.4.0"
BINARY_NAME="prism-cli-${VERSION}-${OS_NAME}-${ARCH}"
DOWNLOAD_URL="https://lars-technologies.com/download/prism-cli/${BINARY_NAME}.zip"

echo "OS: $OS_NAME"
echo "Architecture: $ARCH"
echo "설치 경로: $INSTALL_DIR"
echo ""

# 1. 임시 디렉토리 생성
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

cd "$TEMP_DIR"

# 2. 다운로드
echo "📥 Prism CLI 다운로드 중..."
if ! curl -fsSL -o "$BINARY_NAME.zip" "$DOWNLOAD_URL"; then
    echo "❌ 다운로드 실패"
    exit 1
fi

# 3. 압축 해제
echo "📦 압축 해제 중..."
unzip -q "$BINARY_NAME.zip"

# 4. 바이너리 이동
echo "🔧 설치 중..."
if [ -f "prism-cli/bin/prism" ]; then
    sudo mv "prism-cli/bin/prism" "$INSTALL_DIR/prism"
    sudo chmod +x "$INSTALL_DIR/prism"
    echo "✅ Prism CLI 설치 완료!"
else
    echo "❌ 바이너리를 찾을 수 없습니다"
    exit 1
fi

# 5. 설치 확인
if command -v prism &> /dev/null; then
    echo ""
    echo "==================================="
    echo "✅ 설치 성공!"
    echo "==================================="
    echo "사용법: prism --help"
    echo "버전: $(prism version | head -1)"
else
    echo "❌ 설치 검증 실패"
    exit 1
fi
