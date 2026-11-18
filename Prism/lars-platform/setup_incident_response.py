#!/usr/bin/env python3
"""
Datadog Incident Response 설정 스크립트
- Escalation Policies
- On-Call Schedules
- Notification Rules
- Runbooks
"""

import os
import json
import requests
from datetime import datetime, timedelta

# Datadog API 설정
DD_API_KEY = os.getenv("DD_API_KEY", "6b5a29390d1437c9dc6c828047a809ff")
DD_APP_KEY = os.getenv("DD_APP_KEY", "")
DD_SITE = os.getenv("DD_SITE", "datadoghq.com")

BASE_URL = f"https://api.{DD_SITE}"
HEADERS = {
    "DD-API-KEY": DD_API_KEY,
    "DD-APPLICATION-KEY": DD_APP_KEY,
    "Content-Type": "application/json"
}


class IncidentResponseSetup:
    """Datadog Incident Response 설정 클래스"""

    def __init__(self):
        self.base_url = BASE_URL
        self.headers = HEADERS

    def create_escalation_policy(self, name: str, rules: list) -> dict:
        """
        에스컬레이션 정책 생성

        Args:
            name: 정책 이름
            rules: 에스컬레이션 규칙 (레벨별)

        Returns:
            생성된 정책 정보
        """
        try:
            endpoint = f"{self.base_url}/api/v2/teams/escalation_policies"

            payload = {
                "name": name,
                "rules": rules
            }

            response = requests.post(
                endpoint,
                headers=self.headers,
                json=payload
            )

            if response.status_code in [200, 201]:
                print(f"✅ 에스컬레이션 정책 생성: {name}")
                return response.json()
            else:
                print(f"⚠️ 에스컬레이션 정책 생성 실패: {response.text}")
                return {}

        except Exception as e:
            print(f"❌ 에스컬레이션 정책 생성 오류: {str(e)}")
            return {}

    def create_on_call_schedule(self, name: str, timezone: str, schedule: list) -> dict:
        """
        온콜 스케줄 생성

        Args:
            name: 스케줄 이름
            timezone: 시간대
            schedule: 스케줄 규칙

        Returns:
            생성된 스케줄 정보
        """
        try:
            endpoint = f"{self.base_url}/api/v2/teams/schedules"

            payload = {
                "name": name,
                "timezone": timezone,
                "schedule": schedule
            }

            response = requests.post(
                endpoint,
                headers=self.headers,
                json=payload
            )

            if response.status_code in [200, 201]:
                print(f"✅ 온콜 스케줄 생성: {name}")
                return response.json()
            else:
                print(f"⚠️ 온콜 스케줄 생성 실패: {response.text}")
                return {}

        except Exception as e:
            print(f"❌ 온콜 스케줄 생성 오류: {str(e)}")
            return {}

    def create_notification_rule(self,
                                 name: str,
                                 description: str,
                                 filter_expr: str,
                                 notification_targets: list) -> dict:
        """
        알림 규칙 생성

        Args:
            name: 규칙 이름
            description: 설명
            filter_expr: 필터 표현식 (예: service:lars-prism-backend)
            notification_targets: 알림 대상 (이메일, Slack 등)

        Returns:
            생성된 규칙 정보
        """
        try:
            endpoint = f"{self.base_url}/api/v2/incident_notifications/rules"

            payload = {
                "name": name,
                "description": description,
                "filter_expression": filter_expr,
                "notification_targets": notification_targets,
                "enabled": True
            }

            response = requests.post(
                endpoint,
                headers=self.headers,
                json=payload
            )

            if response.status_code in [200, 201]:
                print(f"✅ 알림 규칙 생성: {name}")
                return response.json()
            else:
                print(f"⚠️ 알림 규칙 생성 실패: {response.text}")
                return {}

        except Exception as e:
            print(f"❌ 알림 규칙 생성 오류: {str(e)}")
            return {}

    def create_runbook(self,
                      title: str,
                      description: str,
                      content: str,
                      tags: list = None) -> dict:
        """
        Runbook 생성

        Args:
            title: 제목
            description: 설명
            content: 내용 (Markdown)
            tags: 태그

        Returns:
            생성된 Runbook 정보
        """
        try:
            endpoint = f"{self.base_url}/api/v2/incident_runbooks"

            payload = {
                "title": title,
                "description": description,
                "content": content,
                "tags": tags or []
            }

            response = requests.post(
                endpoint,
                headers=self.headers,
                json=payload
            )

            if response.status_code in [200, 201]:
                print(f"✅ Runbook 생성: {title}")
                return response.json()
            else:
                print(f"⚠️ Runbook 생성 실패: {response.text}")
                return {}

        except Exception as e:
            print(f"❌ Runbook 생성 오류: {str(e)}")
            return {}

    def setup_all(self):
        """전체 인시던트 리스폰스 설정"""

        print("\n" + "="*60)
        print("🚀 Datadog Incident Response 설정 시작")
        print("="*60)

        # 1. 에스컬레이션 정책 생성
        print("\n📋 1단계: 에스컬레이션 정책 생성")
        print("-" * 60)

        escalation_rules = [
            {
                "level": 1,
                "notification_delay_minutes": 0,
                "targets": [
                    {
                        "type": "schedule",
                        "id": "primary-oncall"  # 온콜 스케줄 ID
                    }
                ]
            },
            {
                "level": 2,
                "notification_delay_minutes": 15,
                "targets": [
                    {
                        "type": "schedule",
                        "id": "escalation-oncall"
                    }
                ]
            },
            {
                "level": 3,
                "notification_delay_minutes": 30,
                "targets": [
                    {
                        "type": "user",
                        "email": "lars@lars-technologies.com"
                    }
                ]
            }
        ]

        self.create_escalation_policy("LARS Platform - Critical", escalation_rules)

        # 2. Runbooks 생성
        print("\n📋 2단계: Runbook 생성")
        print("-" * 60)

        # High Error Rate Runbook
        high_error_runbook = """
# 높은 에러율 대응 가이드

## 원인 분석
1. APM 대시보드 확인: https://app.datadoghq.com/apm/service/lars-prism-backend
2. 최근 배포 확인
3. 리소스 사용량 확인 (CPU, Memory, Disk)

## 조치 방법
1. 로그 필터링으로 에러 원인 파악
2. 데이터베이스 연결 상태 확인
3. 필요시 서비스 재시작

## 에스컬레이션
- 15분 이내 해결 불가 → 팀 리더에게 보고
- 30분 이내 해결 불가 → 엔지니어링 매니저 호출

## 롤백 절차
\`\`\`bash
# ECR에서 이전 버전 이미지 확인
aws ecr describe-image-versions \\
  --registry-id 177346908333 \\
  --repository-name lars-prism \\
  --region ap-northeast-2

# ECS 서비스 업데이트 (이전 태그로)
aws ecs update-service \\
  --cluster lars-platform \\
  --service lars-prism-backend \\
  --force-new-deployment \\
  --region ap-northeast-2
\`\`\`
"""

        self.create_runbook(
            title="높은 에러율 대응",
            description="서비스 에러율이 1%를 초과할 때의 대응 절차",
            content=high_error_runbook,
            tags=["error-rate", "critical"]
        )

        # High Latency Runbook
        high_latency_runbook = """
# 높은 레이턴시 대응 가이드

## 원인 분석
1. 데이터베이스 쿼리 성능 확인
2. Redis 캐시 히트율 확인
3. 외부 API 응답시간 확인

## 모니터링
- P95 Latency 확인: https://app.datadoghq.com/apm/service/lars-prism-backend
- 느린 쿼리 로그 확인
- 데이터베이스 연결 풀 상태 확인

## 최적화 방법
1. 인덱스 확인 및 재생성
2. Redis 캐시 검증
3. 쿼리 최적화

## 자동 복구
- 자동으로 재시도되는 요청은 5분 후 안정화 확인
"""

        self.create_runbook(
            title="높은 레이턴시 대응",
            description="P95 레이턴시가 200ms를 초과할 때의 대응 절차",
            content=high_latency_runbook,
            tags=["latency", "performance"]
        )

        # Service Unavailable Runbook
        service_unavailable_runbook = """
# 서비스 다운 대응 가이드

## 긴급 체크리스트
1. 서비스 상태 확인
   - ECS 작업 상태: https://console.aws.amazon.com/ecs/
   - CloudWatch 로그 확인

2. 컨테이너 상태 확인
   \`\`\`bash
   docker ps | grep lars-prism
   docker logs lars-platform-backend --tail 100
   \`\`\`

3. 데이터베이스 연결성 확인
   \`\`\`bash
   nc -zv db 5432
   nc -zv redis 6379
   \`\`\`

## 복구 절차
1. 즉시 서비스 재시작
2. 데이터베이스 상태 확인
3. 여전히 다운되면 이전 이미지로 롤백

## 상태 확인 명령어
\`\`\`bash
# 서비스 상태
curl -s http://localhost:8000/health | jq

# 데이터베이스 확인
docker exec lars-platform-backend psql -U postgres -c "SELECT 1"
\`\`\`
"""

        self.create_runbook(
            title="서비스 다운 대응",
            description="LARS Platform 서비스가 응답하지 않을 때의 긴급 대응",
            content=service_unavailable_runbook,
            tags=["critical", "service-unavailable"]
        )

        # 3. 알림 규칙 생성
        print("\n📋 3단계: 알림 규칙 생성")
        print("-" * 60)

        notification_targets = [
            {
                "type": "slack_channel",
                "id": "slack-lars-prism-alerts"
            },
            {
                "type": "email",
                "email": "lars@lars-technologies.com"
            }
        ]

        self.create_notification_rule(
            name="Critical Errors",
            description="서비스 에러율이 1% 초과",
            filter_expr='service:lars-prism-backend AND error_rate > 0.01',
            notification_targets=notification_targets
        )

        self.create_notification_rule(
            name="High Latency",
            description="P95 레이턴시가 200ms 초과",
            filter_expr='service:lars-prism-backend AND latency_p95 > 200',
            notification_targets=notification_targets
        )

        self.create_notification_rule(
            name="Service Down",
            description="서비스 가용성이 95% 미만",
            filter_expr='service:* AND availability < 0.95',
            notification_targets=notification_targets
        )

        print("\n" + "="*60)
        print("✅ Datadog Incident Response 설정 완료!")
        print("="*60)
        print("\n📝 다음 단계:")
        print("1. https://app.datadoghq.com/incidents/settings 에서 설정 확인")
        print("2. Slack 채널 통합 확인")
        print("3. 팀 멤버 추가 및 권한 설정")
        print("4. SLO 대시보드 설정")
        print()


def main():
    """메인 함수"""

    # APP_KEY가 없으면 경고
    if not DD_APP_KEY:
        print("⚠️ 경고: DD_APP_KEY 환경변수가 설정되지 않았습니다.")
        print("   export DD_APP_KEY='your-app-key'")
        print()

    setup = IncidentResponseSetup()
    setup.setup_all()


if __name__ == "__main__":
    main()
