@echo off
REM Prism CLI 설치 스크립트 (Windows)

setlocal enabledelayedexpansion

echo ===================================
echo 🚀 Prism CLI 설치
echo ===================================

REM 아키텍처 감지
for /f "tokens=2" %%i in ('wmic os get osarchitecture ^| findstr /V "^$"') do set ARCH=%%i
if "%ARCH%"=="64-bit" (
    set ARCH_NAME=x86_64
) else (
    set ARCH_NAME=i686
)

set VERSION=1.4.0
set BINARY_NAME=prism-cli-%VERSION%-windows-%ARCH_NAME%
set DOWNLOAD_URL=https://lars-technologies.com/download/prism-cli/%BINARY_NAME%.zip
set INSTALL_DIR=%PROGRAMFILES%\LARS\Prism\bin

echo Architecture: %ARCH_NAME%
echo 설치 경로: %INSTALL_DIR%
echo.

REM 1. 임시 디렉토리 생성
set TEMP_DIR=%TEMP%\prism_install_%RANDOM%
mkdir "%TEMP_DIR%"
cd /d "%TEMP_DIR%"

REM 2. 다운로드
echo 📥 Prism CLI 다운로드 중...
powershell -Command "(New-Object System.Net.WebClient).DownloadFile('%DOWNLOAD_URL%', '%BINARY_NAME%.zip')"
if errorlevel 1 (
    echo ❌ 다운로드 실패
    exit /b 1
)

REM 3. 압축 해제
echo 📦 압축 해제 중...
powershell -Command "Expand-Archive -Path '%BINARY_NAME%.zip' -DestinationPath . -Force"

REM 4. 설치 디렉토리 생성
mkdir "%INSTALL_DIR%" 2>nul

REM 5. 바이너리 이동
echo 🔧 설치 중...
if exist "prism-cli\bin\prism.exe" (
    copy /Y "prism-cli\bin\prism.exe" "%INSTALL_DIR%\prism.exe"
    echo ✅ Prism CLI 설치 완료!
) else (
    echo ❌ 바이너리를 찾을 수 없습니다
    exit /b 1
)

REM 6. PATH 환경 변수 추가
setx PATH "%PATH%;%INSTALL_DIR%"

REM 7. 설치 확인
echo.
echo ===================================
echo ✅ 설치 성공!
echo ===================================
echo 사용법: prism --help
echo 설치 경로: %INSTALL_DIR%\prism.exe
echo ===================================

REM 정리
cd /d %TEMP%
rmdir /s /q "%TEMP_DIR%"

pause
