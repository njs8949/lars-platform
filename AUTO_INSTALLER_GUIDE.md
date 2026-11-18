# 🚀 자동 스킬/커넥터 설치 시스템 (Auto Installer)

사용자가 AI 모델에 작업을 할당할 때, 필요한 스킬/커넥터가 자동으로 감지되고 설치되는 시스템입니다.

## 📋 목차

1. [시스템 개요](#시스템-개요)
2. [아키텍처](#아키텍처)
3. [주요 기능](#주요-기능)
4. [사용 방법](#사용-방법)
5. [API 문서](#api-문서)
6. [지원하는 커넥터](#지원하는-커넥터)
7. [설정 및 인증](#설정-및-인증)
8. [트러블슈팅](#트러블슈팅)

---

## 시스템 개요

### 문제점 해결

**기존 문제:**
- 사용자가 작업 요청 → 필요한 스킬/커넥터 부재 → 수동 설치 필요 → 비효율적

**Auto Installer 솔루션:**
- 사용자 요청 분석 → 필요 리소스 자동 감지 → 설치/연결 자동화 → 즉시 실행

### 작동 원리

```
사용자: "Slack에 팀에게 알림 보내고 Linear에 이슈 생성해줘"
    ↓
┌─────────────────────────────────┐
│ 1️⃣  커넥터 자동 감지 (하이브리드) │
│   - 규칙 기반: "Slack", "Linear" │
│   - LLM: 문맥 기반 분석           │
└─────────────────────────────────┘
    ↓
┌──────────────────────────────────┐
│ 2️⃣  사용자 승인 요청              │
│   - 필요한 커넥터 목록 표시        │
│   - 필수 권한 및 기능 설명        │
│   - [설치] / [거부] 버튼          │
└──────────────────────────────────┘
    ↓
┌──────────────────────────────────┐
│ 3️⃣  자동 설치 및 연결             │
│   - 커넥터 설치 진행 (실시간)     │
│   - 인증 정보 확인                 │
│   - 각 단계 상태 표시             │
└──────────────────────────────────┘
    ↓
┌──────────────────────────────────┐
│ 4️⃣  완료 및 실행                 │
│   - 설치 결과 요약                 │
│   - 작업 자동 실행                 │
│   - 이력 저장                      │
└──────────────────────────────────┘
```

---

## 아키텍처

### 파일 구조

```
src/
├── core/
│   ├── connector_mapping.py          # 커넥터 매핑 라이브러리 (20+ 커넥터)
│   ├── skill_connector_installer.py  # 설치/연결 시스템
│   └── ...
├── api/
│   ├── auto_installer_routes.py      # API 엔드포인트
│   └── ...
└── gui/
    ├── components/
    │   ├── AutoInstallerPanel.tsx     # UI 컴포넌트
    │   └── ...
    └── styles/
        ├── AutoInstallerPanel.css      # 스타일
        └── ...
```

### 핵심 컴포넌트

#### 1. **ConnectorLibrary** (connector_mapping.py)
- 20+ 커넥터 정의 (ID, 이름, 키워드, 기능, 필수 인증)
- 키워드 인덱싱으로 빠른 검색
- 커넥터 메타데이터 관리

#### 2. **TaskAnalyzer** (connector_mapping.py)
- 사용자 요청 분석 (하이브리드)
- **규칙 기반**: 키워드 매칭 (빠르고 정확)
- **LLM 기반**: Claude API 분석 (유연함)
- 신뢰도 점수 계산 (0-100%)

#### 3. **SkillConnectorInstaller** (skill_connector_installer.py)
- 설치 계획 생성 및 관리
- 인증 정보 저장/관리
- 설치 진행 상태 추적
- 이력 관리

#### 4. **AutoInstallerPanel** (AutoInstallerPanel.tsx)
- 프론트엔드 UI 컴포넌트
- 4단계 UX:
  1. 감지 (Detecting)
  2. 승인 (Approval)
  3. 설치 (Installing)
  4. 완료 (Complete)

---

## 주요 기능

### 🔍 자동 감지 (Detection)

#### 규칙 기반 감지
```python
# 키워드 매칭
"Slack에 메시지" → slack 커넥터
"이메일 발송" → gmail 커넥터

# 패턴 감지
"태스크 생성" → linear, asana
"파일 업로드" → google_drive
"결제 처리" → stripe
```

#### LLM 기반 분석
```python
task = "고객 정보를 HubSpot에 저장하고 이메일 보내기"
→ Claude 분석: hubspot, gmail 필요
```

### ✅ 사용자 승인

**승인 전 사용자가 확인할 사항:**
- 필요한 커넥터 목록
- 각 커넥터의 제공 기능
- 필수 인증 정보
- 신뢰도 점수

### 📦 자동 설치

**설치 과정:**
1. 인증 정보 확인
2. API 연결 테스트
3. 권한 및 스코프 설정
4. 실시간 진행 상황 표시

### 📊 설치 이력

모든 설치 작업 기록:
- 설치 날짜/시간
- 대상 커넥터
- 설치 결과
- 에러 로그

---

## 사용 방법

### 1. 기본 사용 흐름

**프론트엔드에서:**

```jsx
import { AutoInstallerPanel } from './components/AutoInstallerPanel';

export const ChatInterface = () => {
  const [userRequest, setUserRequest] = useState('');

  const handleExecuteTask = (request: string) => {
    setUserRequest(request);
  };

  return (
    <>
      <AutoInstallerPanel 
        taskDescription={userRequest}
        onInstallationComplete={(result) => {
          console.log('설치 완료:', result);
          // 작업 실행
        }}
      />
    </>
  );
};
```

### 2. 사용자 입력 예시

**Slack 알림 + Linear 이슈 생성:**
```
"Slack의 #engineering 채널에 배포 완료 알림을 보내고, 
 Linear에서 해당 이슈를 Completed로 업데이트해줘"
```

**결과:**
- Slack 커넥터 감지
- Linear 커넥터 감지
- 사용자 승인 (필수)
- 자동 설치 및 연결
- 작업 자동 실행

### 3. 다양한 시나리오

#### 시나리오 1: 단일 커넥터
```
사용자: "Gmail로 고객에게 이메일 보내"
감지: Gmail ✓
설치: 1개 커넥터
```

#### 시나리오 2: 다중 커넥터
```
사용자: "GitHub PR 생성하고 Linear에 링크 저장하고 Slack에 공지해"
감지: GitHub, Linear, Slack ✓
설치: 3개 커넥터
```

#### 시나리오 3: 불명확한 요청
```
사용자: "데이터 분석해줘"
감지: 신뢰도 20% (커넥터 불명확)
결과: 사용자에게 명확한 설명 요청
```

---

## API 문서

### 1. 커넥터 감지

**Endpoint:** `POST /api/auto-installer/detect-connectors`

**Request:**
```json
{
  "task_description": "Slack에 알림 보내고 Linear에 이슈 생성"
}
```

**Response:**
```json
{
  "plan_id": "plan_abc123",
  "task_description": "Slack에 알림 보내고 Linear에 이슈 생성",
  "detected_connectors": [
    {
      "id": "slack",
      "name": "Slack",
      "type": "communication",
      "capabilities": ["send_message", "read_channel", "create_channel"],
      "required_auth": ["workspace_url", "bot_token"]
    },
    {
      "id": "linear",
      "name": "Linear",
      "type": "project_management",
      "capabilities": ["create_issue", "update_issue", "list_issues"],
      "required_auth": ["api_key"]
    }
  ],
  "confidence_score": 92.5,
  "needs_clarification": false,
  "total_connectors": 2
}
```

### 2. 설치 계획 승인

**Endpoint:** `POST /api/auto-installer/approve-plan`

**Request:**
```json
{
  "plan_id": "plan_abc123",
  "approved": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "2개 커넥터 설치 승인됨",
  "plan": { ... }
}
```

### 3. 설치 실행

**Endpoint:** `POST /api/auto-installer/execute?plan_id=plan_abc123`

**Response:**
```json
{
  "success": true,
  "plan_id": "plan_abc123",
  "message": "설치 완료: 2/2 성공",
  "installation_tasks": [
    {
      "connector_id": "slack",
      "connector_name": "Slack",
      "status": "completed",
      "progress": 100,
      "message": "Slack 설치 및 연결 완료"
    },
    {
      "connector_id": "linear",
      "connector_name": "Linear",
      "status": "completed",
      "progress": 100,
      "message": "Linear 설치 및 연결 완료"
    }
  ],
  "summary": {
    "total": 2,
    "successful": 2,
    "failed": 0
  }
}
```

### 4. 인증 정보 설정

**Endpoint:** `POST /api/auto-installer/set-auth`

**Request:**
```json
{
  "connector_id": "slack",
  "auth_info": {
    "workspace_url": "https://myworkspace.slack.com",
    "bot_token": "xoxb-..."
  }
}
```

### 5. 사용 가능한 커넥터 목록

**Endpoint:** `GET /api/auto-installer/available-connectors`

**Response:**
```json
{
  "success": true,
  "total": 20,
  "connectors": [
    { "id": "slack", "name": "Slack", ... },
    { "id": "gmail", "name": "Gmail", ... },
    ...
  ]
}
```

---

## 지원하는 커넥터

### 📞 Communication (5개)
- **Slack** - 팀 커뮤니케이션
- **Gmail** - 이메일 관리
- **Microsoft Teams** - 팀 협업
- **Outlook** - 이메일 및 일정
- **Discord** - 커뮤니티 채팅

### 📊 Project Management (5개)
- **Linear** - 이슈 추적
- **Asana** - 프로젝트 관리
- **Jira** - 버그 추적
- **Notion** - 데이터베이스 & 문서
- **Confluence** - 팀 문서

### 💻 Code Management (3개)
- **GitHub** - 코드 저장소
- **GitLab** - 자체 호스팅 Git
- **Bitbucket** - Atlassian 저장소

### 🤝 CRM (2개)
- **HubSpot** - 고객 관계 관리
- **Salesforce** - 엔터프라이즈 CRM

### 📁 Storage (2개)
- **Google Drive** - 클라우드 저장소
- **Dropbox** - 파일 동기화

### 💳 Payment (1개)
- **Stripe** - 결제 처리

### 📈 Analytics (2개)
- **Google Analytics** - 웹 분석
- **Mixpanel** - 이벤트 분석

### 📅 Calendar (1개)
- **Google Calendar** - 일정 관리

---

## 설정 및 인증

### 1. 인증 정보 저장

인증 정보는 `.lars/connector_auth.json`에 안전하게 저장됩니다:

```json
{
  "slack": {
    "workspace_url": "https://myworkspace.slack.com",
    "bot_token": "xoxb-..."
  },
  "gmail": {
    "oauth_token": "ya29.a0..."
  },
  "github": {
    "oauth_token": "ghp_..."
  }
}
```

### 2. OAuth 설정 (예: Slack)

**Slack App 생성:**
1. https://api.slack.com/apps 방문
2. "Create New App" 클릭
3. "From scratch" 선택
4. App name: "LARS Auto Installer"
5. Workspace 선택

**필수 Scopes:**
- `chat:write` - 메시지 발송
- `channels:read` - 채널 목록 조회
- `users:read` - 사용자 정보 조회

**Bot Token:**
- Token 복사 후 `set-auth` API에 저장

### 3. API Key 설정 (예: Linear)

1. Linear Settings → API → Personal API Keys
2. "Create new" 클릭
3. Key 복사
4. `set-auth` API에 저장

---

## 트러블슈팅

### 1. 커넥터가 감지되지 않음

**증상:** 명확한 키워드를 사용했는데도 커넥터 감지 안 됨

**해결책:**
```python
# 커넥터 검색 직접 테스트
from src.core.connector_mapping import task_analyzer

result = task_analyzer.analyze("Slack에 메시지 보내기")
print(result['detected_connectors'])

# 신뢰도가 낮으면 > 요청 명확히 하기
if result['confidence'] < 50:
    print(f"신뢰도 낮음: {result['confidence']}%")
```

### 2. 인증 실패

**증상:** "Missing authentication for {connector}"

**해결책:**
```bash
# 인증 정보 확인
cat .lars/connector_auth.json

# 인증 정보 재설정
curl -X POST http://localhost:8000/api/auto-installer/set-auth \
  -H "Content-Type: application/json" \
  -d '{
    "connector_id": "slack",
    "auth_info": {
      "workspace_url": "...",
      "bot_token": "..."
    }
  }'
```

### 3. 설치 중 충돌

**증상:** "Connector conflict detected"

**해결책:**
- 충돌하는 커넥터 중 하나 선택
- 다른 커넥터는 이후에 설치

### 4. 설치 진행 중 멈춤

**증상:** Progress 100% 도달 후 "completed"로 변경 안 됨

**해결책:**
```python
# 상태 확인
GET /api/auto-installer/status?plan_id=plan_abc123

# 타임아웃 설정 증가 (기본 30초)
# SkillConnectorInstaller의 TIMEOUT 값 조정
```

---

## 고급 사용

### 1. 커스텀 커넥터 추가

**connector_mapping.py에 새로운 커넥터 정의:**

```python
"custom_service": Connector(
    id="custom_service",
    name="My Custom Service",
    connector_type=ConnectorType.COMMUNICATION,
    keywords=["custom", "my-service"],
    required_auth=["api_key"],
    capabilities=["send_data", "query_api"],
)
```

### 2. 규칙 커스터마이징

**TaskAnalyzer에 패턴 추가:**

```python
def _pattern_based_detection(self, task_lower: str) -> Set[str]:
    detected = set()
    
    # 커스텀 패턴
    if re.search(r"(my-service|마이서비스)", task_lower):
        detected.add("custom_service")
    
    return detected
```

### 3. 사전 승인 모드

비즈니스 로직에서 특정 커넥터는 자동 승인:

```python
# 특정 조건에서 자동 승인
if confidence_score > 95 and len(connectors) == 1:
    installer.approve_plan(plan_id)
    installer.execute_installation(plan_id)
```

---

## 성능 최적화

### 1. 캐싱

자주 사용되는 커넥터 감지 결과 캐싱:

```python
from functools import lru_cache

@lru_cache(maxsize=128)
def detect_connectors_cached(task: str):
    return detect_required_connectors(task)
```

### 2. 병렬 설치

여러 커넥터 동시 설치:

```python
import asyncio

async def parallel_installation(plan_id):
    tasks = [
        _install_connector_async(task) 
        for task in plan.installation_tasks
    ]
    results = await asyncio.gather(*tasks)
    return results
```

---

## 모니터링 및 로깅

### 1. 로그 확인

```bash
# 설치 로그
tail -f .lars/installation.log

# 에러 로그
tail -f .lars/error.log
```

### 2. 메트릭

```python
from src.core.skill_connector_installer import installer

# 설치 이력 조회
history = installer.get_installation_history()

# 성공률 계산
success_rate = sum(
    1 for plan in history 
    if all(task.status == "completed" for task in plan.installation_tasks)
) / len(history)

print(f"설치 성공률: {success_rate * 100:.1f}%")
```

---

## 라이선스 및 지원

- **라이선스:** MIT
- **지원:** GitHub Issues
- **버그 리포트:** https://github.com/lars-inc/prism/issues
- **문의:** support@lars-technologies.com

---

## 변경 로그

### v1.0.0 (2026-09-05)
- ✅ 커넥터 자동 감지 시스템 출시
- ✅ 20+ 커넥터 지원
- ✅ 하이브리드 분석 (규칙 + LLM)
- ✅ 사용자 승인 워크플로우
- ✅ 실시간 설치 모니터링
- ✅ 완전한 API 문서
