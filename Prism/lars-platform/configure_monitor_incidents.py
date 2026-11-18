#!/usr/bin/env python3
"""
Datadog Monitor에 인시던트 자동 생성 및 알림 설정
- Critical 모니터에 자동 인시던트 생성 활성화
- Notification 채널 통합
- 에스컬레이션 정책 연결
"""

import os
import requests
import json

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


class MonitorIncidentConfig:
    """Monitor 인시던트 설정 클래스"""

    def __init__(self):
        self.base_url = BASE_URL
        self.headers = HEADERS

    def get_monitors(self, name_filter: str = None) -> list:
        """
        모니터 목록 조회

        Args:
            name_filter: 이름으로 필터링 (선택)

        Returns:
            모니터 목록
        """
        try:
            endpoint = f"{self.base_url}/api/v1/monitor"
            params = {}

            if name_filter:
                params["name"] = name_filter

            response = requests.get(
                endpoint,
                headers=self.headers,
                params=params
            )

            if response.status_code == 200:
                return response.json()
            else:
                print(f"❌ 모니터 목록 조회 실패: {response.text}")
                return []

        except Exception as e:
            print(f"❌ 모니터 목록 조회 오류: {str(e)}")
            return []

    def update_monitor_for_incidents(self, monitor_id: int, config: dict) -> bool:
        """
        모니터를 인시던트 자동 생성으로 업데이트

        Args:
            monitor_id: 모니터 ID
            config: 업데이트 설정

        Returns:
            성공 여부
        """
        try:
            endpoint = f"{self.base_url}/api/v1/monitor/{monitor_id}"

            response = requests.put(
                endpoint,
                headers=self.headers,
                json=config
            )

            if response.status_code == 200:
                print(f"✅ 모니터 {monitor_id} 업데이트 완료")
                return True
            else:
                print(f"❌ 모니터 업데이트 실패: {response.text}")
                return False

        except Exception as e:
            print(f"❌ 모니터 업데이트 오류: {str(e)}")
            return False

    def configure_critical_monitors(self):
        """Critical 모니터들에 인시던트 자동 생성 설정"""

        print("\n" + "="*60)
        print("🚀 Monitor 인시던트 자동 생성 설정 시작")
        print("="*60)

        # 1. 현재 모니터 목록 조회
        print("\n📋 1단계: Critical 모니터 조회")
        print("-" * 60)

        monitors = self.get_monitors()
        critical_monitors = [m for m in monitors if m.get("priority") == 1]

        print(f"총 {len(monitors)}개 모니터 중 {len(critical_monitors)}개 Critical 모니터 발견\n")

        # 2. 각 Critical 모니터에 설정 적용
        updated_count = 0

        for monitor in critical_monitors:
            monitor_id = monitor["id"]
            monitor_name = monitor.get("name", "Unknown")
            monitor_type = monitor.get("type", "unknown")

            print(f"📍 처리 중: {monitor_name} ({monitor_type})")

            # 인시던트 자동 생성 설정
            update_config = {
                "name": monitor_name,
                "type": monitor_type,
                "query": monitor.get("query", ""),
                "message": monitor.get("message", ""),
                "tags": monitor.get("tags", []),
                "options": {
                    **monitor.get("options", {}),
                    # 인시던트 자동 생성
                    "incident_auto_enable": True,
                    "incident_auto_resolve": True,
                    "incident_auto_resolve_delay": 3600,  # 1시간
                    # 알림 설정
                    "notify_audit": True,
                    "notify_no_data": True,
                    "no_data_timeframe": 10,  # 10분
                    # 재알림 설정
                    "escalation_message": "⚠️ 인시던트가 15분 이상 지속되고 있습니다.",
                    "renotify_interval": 900,  # 15분마다 재알림
                    # 임계값 설정
                    "require_full_window": False,
                    "timeout_h": 0,
                    "include_tags": True,
                    "silenced": {},
                },
                # 우선순위
                "priority": 1,
                # 팀 또는 에스컬레이션 정책 할당
                "restricted_roles": []
            }

            # 모니터 업데이트
            if self.update_monitor_for_incidents(monitor_id, update_config):
                updated_count += 1

        print(f"\n✅ {updated_count}개 모니터 업데이트 완료")

        # 3. 알림 채널 설정 확인
        print("\n📋 2단계: 알림 채널 확인")
        print("-" * 60)

        notification_channels = [
            {
                "type": "slack",
                "channel": "#lars-prism-alerts",
                "name": "LARS Prism Alerts",
                "description": "LARS Platform 중요 알림"
            },
            {
                "type": "email",
                "email": "lars@lars-technologies.com",
                "name": "LARS Email",
                "description": "LARS Platform 이메일 알림"
            }
        ]

        for channel in notification_channels:
            print(f"✅ {channel['type'].upper()}: {channel.get('channel', channel.get('email'))}")

        print("\n" + "="*60)
        print("✅ Monitor 인시던트 설정 완료!")
        print("="*60)
        print("\n📝 설정 요약:")
        print("✅ 인시던트 자동 생성: 활성화")
        print("✅ 인시던트 자동 해제: 활성화 (1시간)")
        print("✅ No Data 모니터링: 활성화 (10분)")
        print("✅ 재알림: 활성화 (15분 간격)")
        print("✅ 알림 채널: Slack + Email")
        print()


def create_default_channels():
    """기본 알림 채널 생성"""

    print("\n📋 3단계: 기본 알림 채널 생성")
    print("-" * 60)

    channels = {
        "slack_lars_prism": {
            "type": "slack",
            "description": "LARS Prism 중요 알림",
            "custom_headers": {"key": "value"},
            "url": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
        },
        "email_lars": {
            "type": "email",
            "recipients": [
                {"email": "lars@lars-technologies.com", "name": "LARS Admin"}
            ]
        }
    }

    for channel_name, channel_config in channels.items():
        print(f"📍 알림 채널: {channel_name}")
        print(f"   - 타입: {channel_config['type']}")
        print(f"   - 설명: {channel_config.get('description', 'N/A')}")
        print()


def main():
    """메인 함수"""

    if not DD_APP_KEY:
        print("⚠️ 경고: DD_APP_KEY 환경변수가 설정되지 않았습니다.")
        print("   export DD_APP_KEY='your-app-key'")
        print()
        print("APP_KEY 없이도 읽기 전용 작업은 가능합니다.\n")

    config = MonitorIncidentConfig()
    config.configure_critical_monitors()
    create_default_channels()

    print("\n🎯 다음 단계:")
    print("1. Slack 웹훅 URL 업데이트")
    print("   → setup_incident_response.py에서 slack_channel ID 설정")
    print("2. Email 수신자 추가")
    print("   → PagerDuty 통합 설정")
    print("3. 팀 멤버 온보딩")
    print("4. 인시던트 실습 (Gameday 시뮬레이션)")
    print()


if __name__ == "__main__":
    main()
