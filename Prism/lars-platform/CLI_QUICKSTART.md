# 🚀 Forge CLI - 빠른 시작 가이드

## 5분 안에 시작하기

### 1️⃣ 설치

```bash
# 의존성 설치
pip install -r requirements.txt

# 또는 개발 모드
pip install -e .
```

### 2️⃣ 초기화

```bash
forge init
```

**입력할 정보:**
- 이름: `Your Name`
- 이메일: `your@email.com`
- API Key: (선택사항)

### 3️⃣ 확인

```bash
forge status
```

✅ 서버가 실행 중이면 준비 완료!

---

## 🎯 주요 명령어 10가지

### 1. 채팅 시작
```bash
forge chat interactive
```

### 2. 메시지 전송
```bash
forge chat send "안녕하세요"
```

### 3. 데이터 분석
```bash
forge statistics descriptive "10,20,30,40,50"
```

### 4. 예측
```bash
forge statistics forecast "100,120,140,150" --periods 3
```

### 5. 이상탐지
```bash
forge statistics anomaly "1,2,3,100,4,5"
```

### 6. 워크스페이스 생성
```bash
forge workspace create "My Team"
```

### 7. 멤버 초대
```bash
forge workspace invite "My Team" "user@example.com"
```

### 8. 커넥터 자동 감지
```bash
forge ecosystem auto-detect "Slack에 메시지 보내기"
```

### 9. 설정 보기
```bash
forge settings view
```

### 10. 도움말
```bash
forge --help
```

---

## 📋 데스크톱 앱 vs CLI

| 기능 | 데스크톱 | CLI |
|------|---------|-----|
| 💬 채팅 | ✅ | ✅ |
| 📊 통계분석 | ✅ (시각화) | ✅ |
| 👥 워크스페이스 | ✅ | ✅ |
| 🛠️ 에코시스템 | ✅ | ✅ |
| ⚙️ 설정 | ✅ | ✅ |
| 📱 모바일 | ❌ | ✅ SSH |
| 🤖 자동화 | ❌ | ✅ |
| 📝 스크립팅 | ❌ | ✅ |

---

## 💡 실전 예시

### 예시 1: 데이터 분석 파이프라인

```bash
#!/bin/bash

# 1. 데이터 분석
forge statistics descriptive "45,50,55,48,60" \
  --output analysis.json

# 2. 이상탐지
forge statistics anomaly "45,50,55,100,60" \
  --output anomalies.json

# 3. 예측
forge statistics forecast "45,50,55,48,60" \
  --periods 5 \
  --output forecast.json

echo "✅ 분석 완료"
```

### 예시 2: 팀 협업 설정

```bash
# 1. 워크스페이스 생성
forge workspace create "Product Team"

# 2. 멤버 초대
for email in alice@company.com bob@company.com charlie@company.com; do
  forge workspace invite "Product Team" "$email"
done

# 3. 멤버 확인
forge workspace members "Product Team"

# 4. 협업 시작
forge chat interactive
```

### 예시 3: 스킬 및 커넥터 자동 설정

```bash
# 1. 필요한 커넥터 감지
forge ecosystem auto-detect \
  "GitHub에서 PR 조회하고 Slack에 알림"

# 2. Slack 설정
forge ecosystem setup-connector slack

# 3. GitHub 설정
forge ecosystem setup-connector github

# 4. 스킬 설치
forge ecosystem install-skill github-integration
```

---

## 🔧 설정 커스터마이징

### 언어 변경
```bash
forge settings set-language ko  # 한국어
forge settings set-language en  # English
```

### 테마 변경
```bash
forge settings set-theme dark   # 다크 테마
forge settings set-theme light  # 라이트 테마
```

### 서버 URL 변경
```bash
forge settings set-server-url "http://your-server:8000"
```

### 사용자 정보 변경
```bash
forge settings user
```

---

## 📂 파일 구조

```
.lars/                      # 설정 디렉토리
├── config.json             # 메인 설정
├── connector_auth.json     # 커넥터 인증정보
├── chats/                  # 채팅 기록
│   ├── chat_20260905_*.json
│   └── ...
├── workspace/              # 워크스페이스 정보
│   └── ...
└── logs/                   # 로그 파일
    └── cli.log
```

---

## 🆘 문제 해결

### ❌ "프로젝트를 찾을 수 없습니다"

```bash
# 현재 디렉토리 확인
pwd

# LARS 프로젝트로 이동
cd /path/to/lars-platform

# 다시 시도
forge status
```

### ❌ "서버에 연결할 수 없습니다"

```bash
# 1. 서버 실행 (다른 터미널)
npm run dev

# 2. 상태 확인
forge status

# 3. 서버 URL 변경 (필요시)
forge settings set-server-url "http://localhost:8000"
```

### ❌ "권한 거부됨"

```bash
# 권한 설정
chmod +x ~/.local/bin/prism

# 또는 직접 실행
python -m src.cli.main --help
```

### ❌ "설정 초기화 필요"

```bash
# 모든 설정 초기화
forge settings reset

# 재초기화
forge init
```

---

## 📚 다음 단계

1. **[완전 가이드](CLI_GUIDE.md) 읽기** - 모든 기능 상세 설명
2. **[데스크톱 앱](README.md) 실행** - GUI 사용
3. **[API 문서](API.md) 확인** - 프로그래밍 방식

---

## 🎓 유용한 팁

### 🔄 대화형 모드 사용법

```bash
forge chat interactive
```

**명령어:**
- `/exit` - 종료
- `/save` - 저장
- `/clear` - 초기화
- 일반 메시지 - 그냥 입력

### 📊 데이터 자동 분석

```bash
# JSON 파일로 여러 변수 분석
cat > data.json << EOF
{
  "temperature": [20, 22, 25, 23, 24],
  "humidity": [60, 65, 70, 68, 72]
}
EOF

forge statistics correlation data.json
```

### 📤 결과 내보내기

```bash
# Markdown으로 내보내기
forge chat export --format markdown --output report.md

# 이메일로 전송 (필요시 파이프라인)
forge chat export --format markdown | mail -s "Report" user@example.com
```

---

## 💬 지원 & 문의

- **문서:** https://docs.lars-technologies.com
- **이슈:** https://github.com/lars-inc/prism/issues  
- **문의:** support@lars-technologies.com
- **커뮤니티:** https://community.lars-technologies.com

---

## 🎉 성공!

이제 Forge CLI를 사용할 준비가 되었습니다!

```bash
forge chat interactive
```

행운을 빕니다! 🚀

---

**최종 정보:**
- CLI 버전: 1.4.0
- 마지막 업데이트: 2026-09-05
- 호환성: Python 3.9+
