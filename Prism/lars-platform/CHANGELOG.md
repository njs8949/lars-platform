# Prism CLI 체인지로그

모든 주요 변경 사항을 이 파일에 기록합니다.

## [1.4.0] - 2026-10-12

### 🎉 새로운 기능
- **25개 메뉴 구현**: Tauri 데스크톱 앱과 동일한 모든 기능을 CLI에 구현
  - 📜 history - 대화 히스토리
  - 🕷️ scraping - 웹 스크래핑
  - 📸 ocr - OCR (광학 문자 인식)
  - 🔄 change-detection - 변경 감지
  - 🔍 seo - SEO 분석
  - 👤 crm - CRM 관리
  - ⚙️ workflows - 워크플로우
  - 🎤 presentation - 프리젠테이션
  - 🔗 integration - 통합 대시보드
  - 🎨 branding - 브랜딩 가이드
  - 🎨 color-font - 색상 & 폰트
  - 🌐 cross-platform - 크로스플랫폼
  - ⚡ performance - 성능 최적화
  - 📦 version-control - 버전 관리
  - 🎙️ voice-design - 음성 명령어
  - 🌍 multilingual - 다국어
  - 👥 collaboration - 협업
  - 📐 auto-layout - 자동 레이아웃
  - 🥽 xr-preview - AR/VR 미리보기
  - 🚀 deployment - 클라우드 배포
  - ⚡ quick-start - 빠른 시작
  - 🎨 themes - 테마

### ✨ Ollama 연동
- 모든 메뉴에 AI 응답 기능 추가
- Ollama llama2 모델 자동 연동
- 포트 11434에서 실행되는 로컬 LLM 지원

### 🚀 배포 기능
- PyInstaller를 사용한 실행 가능한 바이너리 빌드
- Windows, macOS, Linux 크로스 플랫폼 지원
- 자동 설치 스크립트 (install.sh, install.bat)
- 버전 관리 및 업데이트 지원

### 📦 패키징
- zip 압축 파일로 배포
- 플랫폼별 아키텍처 구분 (x86_64, arm64)
- 의존성 완전 포함

## [1.3.0] - 2026-09-15

### 🎯 개선사항
- Chat, Workspace, Statistics, Ecosystem, Settings 기본 메뉴 구현
- Typer 기반 인터랙티브 CLI 구축
- Rich 라이브러리를 사용한 아름다운 출력
- 에러 처리 및 로깅 개선

### 🐛 버그 수정
- API 연결 타임아웃 문제 해결
- 설정 파일 경로 오류 수정
- 명령어 파싱 개선

## [1.2.0] - 2026-08-10

### ✨ 새로운 기능
- 초기화 명령어 (init) 추가
- 시스템 상태 조회 (status) 기능
- 버전 정보 조회 (version) 기능
- 문서 보기 (docs) 기능

### 📚 문서
- CLI 사용 가이드 작성
- 명령어별 도움말 완성
- 설치 가이드 추가

## [1.1.0] - 2026-07-05

### 🎨 초기 릴리스
- 프로젝트 기본 구조 설정
- Typer + Rich 기반 CLI 프레임워크 구축
- 기본 명령어 (hello, init) 구현
- API 연결 기능 추가

---

## 설치 방법

### macOS/Linux
```bash
bash install.sh
```

### Windows
```cmd
install.bat
```

### Python 패키지 설치
```bash
pip install lars-prism-cli
```

## 사용법

```bash
# 도움말
prism --help

# 특정 메뉴 실행
prism chat --help
prism history "검색어"
prism seo "https://example.com"
prism scraping "https://example.com"

# 모든 메뉴 목록
prism --help
```

## 요구사항

- Python 3.9+
- Ollama (선택사항, AI 응답 기능)

## 피드백 및 버그 리포트

- 웹사이트: https://lars-technologies.com
- 이메일: support@lars-technologies.com
- GitHub: https://github.com/lars-inc/prism/issues

---

**마지막 업데이트**: 2026-10-12
