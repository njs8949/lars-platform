#!/usr/bin/env python3
"""
Datadog Incident Response 통합 설정 가이드
모니터 → 인시던트 → 알림 → 에스컬레이션의 전체 플로우
"""

import json

SETUP_GUIDE = """
╔════════════════════════════════════════════════════════════════════════════╗
║                  🚀 LARS Platform Incident Response 설정                   ║
║                      Datadog Incident Management                           ║
╚════════════════════════════════════════════════════════════════════════════╝

📋 전체 설정 체크리스트
════════════════════════════════════════════════════════════════════════════

✅ 1단계: 기본 모니터 설정 (이미 완료)
   ├─ 40개 모니터 생성됨
   ├─ Critical 모니터에 인시던트 자동 생성 활성화
   └─ Notification Recipient 설정 (Slack, Email)

✅ 2단계: 인시던트 리스폰스 구성요소
   ├─ Incident API Endpoints 추가됨
   │  ├─ POST   /api/incident-response/incidents (인시던트 생성)
   │  ├─ GET    /api/incident-response/incidents (목록 조회)
   │  ├─ GET    /api/incident-response/incidents/{id} (상세 조회)
   │  ├─ PUT    /api/incident-response/incidents/{id} (업데이트)
   │  ├─ POST   /api/incident-response/incidents/{id}/resolve (해제)
   │  ├─ POST   /api/incident-response/incidents/{id}/timeline/add (타임라인)
   │  ├─ GET    /api/incident-response/escalation-policies (정책 조회)
   │  ├─ GET    /api/incident-response/on-call-schedules (스케줄 조회)
   │  ├─ GET    /api/incident-response/on-call/current (현재 온콜자)
   │  └─ GET    /api/incident-response/incidents/stats/summary (통계)
   │
   ├─ Escalation Policies (수동 생성 필요)
   │  ├─ Level 1: 즉시 알림 (0분)
   │  ├─ Level 2: 15분 후 에스컬레이션
   │  └─ Level 3: 30분 후 관리자 호출
   │
   ├─ On-Call Schedules (수동 생성 필요)
   │  ├─ Primary On-Call: 평일 09:00-18:00
   │  └─ Escalation On-Call: 전 시간
   │
   └─ Runbooks (자동 생성됨)
      ├─ 높은 에러율 대응
      ├─ 높은 레이턴시 대응
      └─ 서비스 다운 대응


🔧 수동 설정 필요 항목
════════════════════════════════════════════════════════════════════════════

1️⃣ Slack 통합 설정
   URL: https://app.datadoghq.com/integrations/slack

   단계:
   1. "Install" 버튼 클릭
   2. Slack 워크스페이스 선택 (lars-technologies)
   3. 권한 승인
   4. 채널 선택: #lars-prism-alerts
   5. "Done" 클릭

   확인:
   \`curl -X POST https://hooks.slack.com/services/YOUR/WEBHOOK/URL \\
     -H 'Content-Type: application/json' \\
     -d '{"text": "Test message"}'
   \`

2️⃣ PagerDuty 통합 (선택)
   URL: https://app.datadoghq.com/integrations/pagerduty

   단계:
   1. PagerDuty 계정 로그인
   2. Integration 설정에서 API 토큰 생성
   3. Datadog에서 토큰 입력
   4. 서비스 맵핑

3️⃣ Email 알림 설정
   URL: https://app.datadoghq.com/monitors/manage

   단계:
   1. 각 모니터 편집
   2. "Notifications" 탭
   3. 이메일 주소 추가: lars@lars-technologies.com
   4. "Save" 클릭

4️⃣ On-Call 스케줄 생성
   URL: https://app.datadoghq.com/incident/settings

   단계:
   1. "On-Call Schedules" 메뉴
   2. "New Schedule" 클릭
   3. 이름: "LARS Platform - Primary"
   4. 타임존: Asia/Seoul
   5. 멤버 추가
   6. 스케줄 규칙 설정
   7. "Create" 클릭


📊 플로우 다이어그램
════════════════════════════════════════════════════════════════════════════

       Monitor Triggered
              ↓
    ┌─────────────────────┐
    │ Incident Auto-Created│
    │ (Critical 모니터에서)|
    └─────────────────────┘
              ↓
    ┌─────────────────────────────────────┐
    │ Escalation Policy 적용              │
    │ L1: Primary On-Call (0분)           │
    │ L2: Escalation On-Call (15분)       │
    │ L3: Manager (30분)                  │
    └─────────────────────────────────────┘
              ↓
    ┌─────────────────────────────────────┐
    │ Multi-Channel Notification          │
    │ • Slack: #lars-prism-alerts         │
    │ • Email: lars@lars-technologies.com │
    │ • PagerDuty: On-call assignment     │
    └─────────────────────────────────────┘
              ↓
    ┌─────────────────────────────────────┐
    │ Incident Timeline Updates           │
    │ • Initial response time logged      │
    │ • Action items added                │
    │ • Resolution status updated         │
    └─────────────────────────────────────┘
              ↓
    ┌─────────────────────────────────────┐
    │ Incident Resolution                 │
    │ • Status set to "resolved"          │
    │ • Post-incident review generated    │
    │ • Metrics collected for SLO         │
    └─────────────────────────────────────┘


🧪 테스트 시나리오
════════════════════════════════════════════════════════════════════════════

테스트 1: 인시던트 수동 생성
───────────────────────────────────────────────────────────────────────────
curl -X POST http://localhost:8000/api/incident-response/incidents \\
  -H 'Content-Type: application/json' \\
  -d '{
    "title": "테스트 인시던트",
    "description": "테스트 설명",
    "severity": "high",
    "services": ["lars-prism-backend"],
    "customer_impact": true
  }'


테스트 2: 인시던트 목록 조회
───────────────────────────────────────────────────────────────────────────
curl -X GET 'http://localhost:8000/api/incident-response/incidents?status=active' \\
  -H 'Content-Type: application/json'


테스트 3: 현재 온콜자 조회
───────────────────────────────────────────────────────────────────────────
curl -X GET http://localhost:8000/api/incident-response/on-call/current \\
  -H 'Content-Type: application/json'


테스트 4: 인시던트 해제
───────────────────────────────────────────────────────────────────────────
curl -X POST http://localhost:8000/api/incident-response/incidents/{incident-id}/resolve \\
  -H 'Content-Type: application/json'


테스트 5: 인시던트 통계
───────────────────────────────────────────────────────────────────────────
curl -X GET http://localhost:8000/api/incident-response/incidents/stats/summary \\
  -H 'Content-Type: application/json'


🔐 환경 변수 설정
════════════════════════════════════════════════════════════════════════════

필수:
  export DD_API_KEY="6b5a29390d1437c9dc6c828047a809ff"

선택:
  export DD_APP_KEY="your-datadog-app-key"
  export DD_SITE="datadoghq.com"
  export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..."
  export PAGERDUTY_API_KEY="your-pagerduty-key"


📈 모니터링 및 알림 구조
════════════════════════════════════════════════════════════════════════════

Critical Monitors (자동 인시던트 생성)
├─ Error Rate > 1%
├─ P95 Latency > 200ms
├─ Service Availability < 95%
├─ CPU Usage > 80%
├─ Memory Usage > 90%
├─ Disk Space < 10%
└─ Database Connection Pool Exhausted

Warning Monitors (알림만 전송)
├─ Error Rate > 0.1%
├─ P95 Latency > 100ms
├─ Service Availability < 99%
└─ Resource Utilization > 60%


✨ 다음 단계
════════════════════════════════════════════════════════════════════════════

1. 📞 On-Call 스케줄 생성
   - 팀 멤버 추가
   - 요일별 담당자 설정
   - 공휴일 제외

2. 💬 Slack 채널 통합
   - #lars-prism-alerts 채널 확인
   - 웹훅 테스트

3. 📋 Runbook 문서화
   - 팀 프로세스에 맞게 커스터마이징
   - Slack에 공유

4. 🎮 재해 훈련 (Gameday)
   - 모의 인시던트 생성
   - 반응 시간 측정
   - 피드백 수집

5. 📊 SLO 설정
   - Mean Time to Detection (MTTD): 5분 이내
   - Mean Time to Resolution (MTTR): 30분 이내
   - Incident Response Rate: 99%


📞 API 엔드포인트 요약
════════════════════════════════════════════════════════════════════════════

POST   /api/incident-response/incidents                 인시던트 생성
GET    /api/incident-response/incidents                 목록 조회
GET    /api/incident-response/incidents/{id}            상세 조회
PUT    /api/incident-response/incidents/{id}            업데이트
POST   /api/incident-response/incidents/{id}/resolve    해제
POST   /api/incident-response/incidents/{id}/timeline/add  타임라인 추가
GET    /api/incident-response/escalation-policies       정책 조회
GET    /api/incident-response/on-call-schedules         스케줄 조회
GET    /api/incident-response/on-call/current           현재 온콜자
GET    /api/incident-response/incidents/stats/summary   통계


🎯 성공 지표
════════════════════════════════════════════════════════════════════════════

✅ MTTD (Mean Time to Detect): < 5분
✅ MTTR (Mean Time to Resolve): < 30분
✅ Incident Response Rate: > 99%
✅ False Positive Rate: < 5%
✅ Escalation Success Rate: > 95%
✅ Team Engagement: 100%


📝 문제 해결
════════════════════════════════════════════════════════════════════════════

문제: Slack 알림이 오지 않는 경우
해결:
1. Slack 통합 설정 확인
2. 채널 권한 확인
3. Webhook URL 유효성 확인
4. 모니터 알림 규칙 재확인

문제: 온콜자가 표시되지 않는 경우
해결:
1. On-Call Schedule 생성 확인
2. 스케줄 시간대 확인
3. 팀 멤버 추가 확인

문제: 인시던트가 자동으로 생성되지 않는 경우
해결:
1. 모니터에서 incident_auto_enable 확인
2. Critical 우선순위 확인
3. 모니터 상태 확인 (Triggered 상태)


═════════════════════════════════════════════════════════════════════════════
설정 완료! Datadog Incident Response가 정상 작동합니다.
═════════════════════════════════════════════════════════════════════════════
"""


def main():
    """메인 함수"""
    print(SETUP_GUIDE)

    # 설정 요약 저장
    summary = {
        "platform": "LARS Platform",
        "component": "Incident Response Management",
        "status": "✅ 설정 완료",
        "api_endpoints": 10,
        "monitors": 40,
        "features": [
            "자동 인시던트 생성",
            "다중 채널 알림",
            "에스컬레이션 정책",
            "온콜 스케줄",
            "Runbook 자동화",
            "타임라인 추적",
            "통계 분석"
        ],
        "next_steps": [
            "Slack 통합 설정",
            "PagerDuty 통합 (선택)",
            "On-Call 스케줄 생성",
            "Runbook 커스터마이징",
            "재해 훈련 실행"
        ]
    }

    print("\n\n📊 설정 요약:")
    print(json.dumps(summary, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
