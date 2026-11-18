# 🚀 Forge CLI 완전 가이드

데스크톱 앱과 동일한 모든 기능을 지원하는 완전한 **명령줄 인터페이스(CLI)**입니다.

## 📋 목차

1. [설치 및 시작](#설치-및-시작)
2. [주요 명령어](#주요-명령어)
3. [채팅 기능](#-채팅-기능)
4. [워크스페이스](#-워크스페이스)
5. [통계분석](#-통계분석)
6. [에코시스템](#-에코시스템)
7. [설정](#-설정)
8. [예시 및 시나리오](#예시-및-시나리오)

---

## 설치 및 시작

### 1️⃣ 필수 패키지 설치

```bash
pip install -r requirements.txt
```

**주요 의존성:**
- `typer` - CLI 프레임워크
- `rich` - 터미널 출력 포매팅
- `requests` - HTTP 클라이언트

### 2️⃣ CLI 초기화

```bash
forge init
```

사용자 정보 입력:
- 이름
- 이메일
- API Key (선택사항)

### 3️⃣ 서버 연결 확인

```bash
forge status
```

서버가 실행 중인지 확인합니다.

---

## 주요 명령어

### 기본 명령어

| 명령어 | 설명 |
|--------|------|
| `forge --help` | 전체 도움말 |
| `forge init` | 초기화 |
| `forge status` | 시스템 상태 |
| `forge version` | 버전 정보 |
| `forge docs` | 문서 보기 |

### 서브 명령어 그룹

| 그룹 | 명령어 | 설명 |
|------|--------|------|
| **chat** | `forge chat --help` | 🗣️  채팅 기능 |
| **workspace** | `forge workspace --help` | 👥 워크스페이스 |
| **statistics** | `forge statistics --help` | 📊 통계분석 |
| **ecosystem** | `forge ecosystem --help` | 🛠️  에코시스템 |
| **settings** | `forge settings --help` | ⚙️  설정 |

---

## 🗣️ 채팅 기능

### 대화형 채팅 시작

```bash
forge chat interactive
```

**특수 명령어:**
- `/exit` - 대화 종료
- `/save` - 대화 저장
- `/clear` - 대화 기록 삭제

### 단일 메시지 전송

```bash
forge chat send "데이터를 분석해줘"
```

**파일에 저장:**
```bash
forge chat send "안녕" --save output.json
```

### 대화 기록 관리

**기록 조회:**
```bash
forge chat history
```

**특정 대화 열기:**
```bash
forge chat view chat_20260905_120000.json
```

**대화 삭제:**
```bash
forge chat delete chat_20260905_120000.json
```

**모든 대화 내보내기:**
```bash
# JSON 형식
forge chat export --format json --output chats.json

# Markdown 형식
forge chat export --format markdown --output chats.md

# 텍스트 형식
forge chat export --format txt --output chats.txt
```

---

## 👥 워크스페이스

### 워크스페이스 관리

**목록 조회:**
```bash
forge workspace list
```

**새 워크스페이스 생성:**
```bash
forge workspace create "My Team" --desc "팀 협업 공간"
```

### 멤버 관리

**멤버 초대:**
```bash
forge workspace invite "My Team" "user@example.com"
```

**멤버 목록 조회:**
```bash
forge workspace members "My Team"
```

---

## 📊 통계분석

### 기술통계

**숫자 데이터 분석:**
```bash
forge statistics descriptive "10,20,30,40,50,60,70,80,90,100"
```

**결과:**
- 평균, 중앙값, 최빈값
- 표준편차, 분산
- 사분위수, 범위
- 왜도, 첨도

**파일로 저장:**
```bash
forge statistics descriptive "1,2,3,4,5" --output result.json
```

### 시계열 분석

```bash
forge statistics timeseries "100,120,115,140,135,160"
```

**결과:**
- 추세 분석
- 계절성 감지
- 자기상관

### 예측 분석

```bash
forge statistics forecast "100,120,140,135,150,165,180" \
  --periods 3 \
  --method exponential
```

**방법:**
- `exponential` - 지수평활
- `arima` - ARIMA 모델

### 이상탐지

```bash
forge statistics anomaly "10,12,15,14,100,16,18" \
  --method zscore \
  --threshold 2.5
```

**방법:**
- `zscore` - Z-score 기반
- `iqr` - 사분위간거리 기반

### 상관분석

**파일 기반 (JSON):**
```bash
# data.json:
# {
#   "sales": [100, 120, 140],
#   "revenue": [5000, 6200, 7100]
# }

forge statistics correlation data.json
```

### 통합 대시보드

```bash
forge statistics dashboard --output dashboard.json
```

---

## 🛠️ 에코시스템

### 스킬 관리

**설치된 스킬 목록:**
```bash
forge ecosystem list-skills
```

**스킬 설치:**
```bash
forge ecosystem install-skill "data-analyzer"
```

### 커넥터 관리

**사용 가능한 커넥터:**
```bash
forge ecosystem list-connectors
```

**커넥터 설정:**
```bash
forge ecosystem setup-connector slack
```

인증 정보 입력:
- API Key
- OAuth Token
- 기타 필수 정보

### 자동 감지

**필요한 스킬/커넥터 자동 감지:**
```bash
forge ecosystem auto-detect "Slack에 알림을 보내고 Linear에 이슈 생성해줘"
```

**결과:**
- 감지된 커넥터 목록
- 각 커넥터의 기능
- 신뢰도 점수

---

## ⚙️ 설정

### 현재 설정 조회

```bash
forge settings view
```

### 언어 설정

```bash
# 한국어
forge settings set-language ko

# 영어
forge settings set-language en
```

### 테마 설정

```bash
forge settings set-theme dark
```

### 사용자 정보

```bash
forge settings user
```

대화형으로 사용자 정보 입력

### API Key 설정

```bash
forge settings set-api-key
```

### 서버 URL 설정

```bash
forge settings set-server-url "http://localhost:8000"
```

### 설정 초기화

```bash
forge settings reset
```

---

## 예시 및 시나리오

### 시나리오 1: 데이터 분석

```bash
# 1. 데이터 기술통계
forge statistics descriptive "45,50,55,52,48,60,58"

# 2. 이상탐지
forge statistics anomaly "45,50,55,52,48,600,58"

# 3. 예측
forge statistics forecast "45,50,55,52,48,60,58" --periods 3

# 4. 결과 저장
forge statistics dashboard --output analysis.json
```

### 시나리오 2: 대화 기록 관리

```bash
# 1. 대화형 채팅 시작
forge chat interactive

# 2. 여러 메시지 입력 후 저장
# /save

# 3. 대화 기록 확인
forge chat history

# 4. 특정 대화 보기
forge chat view chat_20260905_120000.json

# 5. 모두 내보내기
forge chat export --format markdown --output my_chats.md
```

### 시나리오 3: 워크스페이스 협업

```bash
# 1. 새 워크스페이스 생성
forge workspace create "Product Team"

# 2. 멤버 초대
forge workspace invite "Product Team" "alice@example.com"
forge workspace invite "Product Team" "bob@example.com"

# 3. 멤버 확인
forge workspace members "Product Team"

# 4. 협업 시작
forge chat interactive
```

### 시나리오 4: 자동 커넥터 감지

```bash
# 1. 작업 요청
forge ecosystem auto-detect \
  "GitHub에서 최신 PR 조회하고 Slack에 알림 보내기"

# 2. 감지된 커넥터 확인
# GitHub, Slack이 감지됨

# 3. 필요하면 설정
forge ecosystem setup-connector github
forge ecosystem setup-connector slack

# 4. 대화에서 작업 요청
forge chat send "GitHub에서 PR 조회해줘"
```

---

## 📚 고급 기능

### JSON 데이터로 분석

```bash
# data.json 생성
cat > data.json << EOF
{
  "product_a": [100, 120, 140, 135, 150],
  "product_b": [50, 60, 70, 65, 80]
}
EOF

# 상관분석
forge statistics correlation data.json
```

### 배치 처리

```bash
#!/bin/bash

# 여러 데이터셋 분석
for file in data_*.csv; do
  forge statistics descriptive "$(cat $file | tr '\n' ',')" \
    --output "result_$file.json"
done
```

### 로그 모니터링

```bash
# CLI 로그 확인
tail -f .lars/logs/cli.log
```

### 성능 최적화

```bash
# 타임아웃 설정 (기본 30초)
# environment variable 설정 시 적용
export LARS_TIMEOUT=60
```

---

## 🆘 트러블슈팅

### 서버 연결 실패

```bash
# 상태 확인
forge status

# 서버 실행 (다른 터미널)
npm run dev
```

### 명령어 오류

```bash
# 도움말 확인
forge chat --help

# 예시 실행
forge chat send "안녕하세요"
```

### 설정 초기화

```bash
# 모든 설정 제거
forge settings reset

# 재초기화
forge init
```

### 디버그 모드

```bash
# 로그 확인
cat .lars/logs/cli.log

# 상세 오류 메시지
forge chat send "test" 2>&1 | tee debug.log
```

---

## 📊 CLI vs 데스크톱 앱 비교

| 기능 | CLI | 데스크톱 |
|------|-----|---------|
| 채팅 | ✅ 터미널 | ✅ GUI |
| 워크스페이스 | ✅ | ✅ |
| 통계분석 | ✅ | ✅ (시각화) |
| 에코시스템 | ✅ | ✅ |
| 자동화 | ✅ 쉬운 | ✅ |
| 스크립팅 | ✅ | ❌ |
| 원격 실행 | ✅ SSH | ❌ |

---

## 📦 설치 옵션

### 옵션 1: pip

```bash
pip install lars-prism-cli
forge --version
```

### 옵션 2: 로컬 개발

```bash
git clone https://github.com/lars-inc/prism.git
cd prism
pip install -e .
forge init
```

### 옵션 3: Docker

```bash
docker run -it lars-prism-cli forge --help
```

---

## 🎓 다음 단계

1. **[채팅 시작](#-채팅-기능)** - 대화형 채팅으로 시작
2. **[데이터 분석](#-통계분석)** - 첫 분석 수행
3. **[팀 협업](#-워크스페이스)** - 워크스페이스 생성
4. **[자동화](#-에코시스템)** - 커넥터 연동

---

## 📞 지원

- **문서:** https://docs.lars-technologies.com
- **이슈:** https://github.com/lars-inc/prism/issues
- **문의:** support@lars-technologies.com
- **커뮤니티:** https://community.lars-technologies.com

---

**Happy CLIing! 🎉**
