#!/usr/bin/env python3
"""
Datadog SLO 자동 생성 스크립트
LARS Platform 서비스를 위한 SLO 설정
"""

import os
import json
import requests
from datetime import datetime

# Datadog API 설정
DATADOG_API_KEY = os.getenv('DATADOG_API_KEY')
DATADOG_APP_KEY = os.getenv('DATADOG_APP_KEY')
DATADOG_SITE = os.getenv('DATADOG_SITE', 'datadoghq.com')

# API 엔드포인트
SLO_API_URL = f'https://api.{DATADOG_SITE}/api/v1/slo'
HEADERS = {
    'DD-API-KEY': DATADOG_API_KEY,
    'DD-APPLICATION-KEY': DATADOG_APP_KEY,
    'Content-Type': 'application/json',
}

def create_slo(slo_data):
    """SLO 생성"""
    print(f"\n📊 SLO 생성 중: {slo_data['name']}")
    print(f"   설명: {slo_data.get('description', 'N/A')}")
    print(f"   타입: {slo_data['type']}")

    try:
        response = requests.post(SLO_API_URL, json=slo_data, headers=HEADERS)
        response.raise_for_status()

        result = response.json()
        print(f"   ✅ SLO ID: {result.get('data', {}).get('id', 'N/A')}")
        return result
    except Exception as e:
        print(f"   ❌ 오류: {str(e)}")
        return None

def setup_slos():
    """LARS Platform을 위한 모든 SLO 설정"""

    slos = [
        # 1. API 가용성 SLO
        {
            'name': 'LARS API Availability SLO',
            'description': 'LARS Platform API 전체 가용성 목표 (99.9%)',
            'type': 'monitor',
            'monitor_ids': [],  # 모니터 ID가 필요 (선택사항)
            'thresholds': [
                {
                    'timeframe': '30d',
                    'target': 99.9,
                    'target_display': '99.9%',
                    'warning': 99.95
                }
            ],
            'tags': ['service:lars', 'team:platform', 'priority:high'],
        },

        # 2. 에러율 SLO
        {
            'name': 'LARS Error Rate SLO',
            'description': 'LARS Platform 에러율 목표 (< 1%)',
            'type': 'metric',
            'query': {
                'numerator': 'sum:trace.web.request{service:lars-agent,status:ok}',
                'denominator': 'sum:trace.web.request{service:lars-agent}',
            },
            'thresholds': [
                {
                    'timeframe': '30d',
                    'target': 99.0,
                    'target_display': '99%',
                    'warning': 99.5
                }
            ],
            'tags': ['service:lars', 'team:platform', 'metric:errors'],
        },

        # 3. 지연시간 SLO
        {
            'name': 'LARS Latency SLO (P95)',
            'description': 'LARS Platform P95 지연시간 목표 (< 200ms)',
            'type': 'metric',
            'query': {
                'numerator': 'sum:trace.web.request.duration{service:lars-agent,_avg_duration:<200}',
                'denominator': 'sum:trace.web.request.duration{service:lars-agent}',
            },
            'thresholds': [
                {
                    'timeframe': '30d',
                    'target': 95.0,
                    'target_display': '95%',
                    'warning': 97.0
                }
            ],
            'tags': ['service:lars', 'team:platform', 'metric:latency'],
        },

        # 4. 보안 이벤트 감지 SLO (MTTD)
        {
            'name': 'LARS Security Detection MTTD SLO',
            'description': 'Mean Time to Detection (MTTD) < 5분 목표',
            'type': 'metric',
            'query': {
                'numerator': 'sum:datadog.security.event{service:lars-agent,detection_time:<300}',
                'denominator': 'sum:datadog.security.event{service:lars-agent}',
            },
            'thresholds': [
                {
                    'timeframe': '30d',
                    'target': 99.0,
                    'target_display': '99%',
                    'warning': 99.5
                }
            ],
            'tags': ['service:lars', 'team:security', 'metric:mttd'],
        },

        # 5. 보안 이벤트 해결 SLO (MTTR)
        {
            'name': 'LARS Security Resolution MTTR SLO',
            'description': 'Mean Time to Resolution (MTTR) < 30분 목표',
            'type': 'metric',
            'query': {
                'numerator': 'sum:incident.time_to_resolution{service:lars-agent,resolution_time:<1800}',
                'denominator': 'sum:incident.time_to_resolution{service:lars-agent}',
            },
            'thresholds': [
                {
                    'timeframe': '30d',
                    'target': 98.0,
                    'target_display': '98%',
                    'warning': 99.0
                }
            ],
            'tags': ['service:lars', 'team:security', 'metric:mttr'],
        },

        # 6. Prism 백엔드 가용성 SLO
        {
            'name': 'LARS Prism Backend Availability SLO',
            'description': 'LARS Prism 백엔드 가용성 목표 (99.5%)',
            'type': 'metric',
            'query': {
                'numerator': 'sum:trace.web.request{service:lars-prism-backend,status:ok}',
                'denominator': 'sum:trace.web.request{service:lars-prism-backend}',
            },
            'thresholds': [
                {
                    'timeframe': '30d',
                    'target': 99.5,
                    'target_display': '99.5%',
                    'warning': 99.7
                }
            ],
            'tags': ['service:lars-prism', 'team:platform', 'priority:high'],
        },
    ]

    print("=" * 60)
    print("🚀 LARS Platform SLO 자동 생성 시작")
    print("=" * 60)
    print(f"생성 시간: {datetime.now().isoformat()}")
    print(f"생성할 SLO 수: {len(slos)}")
    print()

    created_slos = []
    failed_slos = []

    for slo in slos:
        try:
            # 주석: 실제 API 호출은 Datadog 크레덴셜 설정 후 수행
            # result = create_slo(slo)
            # if result:
            #     created_slos.append(slo['name'])

            # 현재는 시뮬레이션
            print(f"✅ {slo['name']} 생성 시뮬레이션")
            print(f"   Target: {slo['thresholds'][0]['target_display']}")
            print(f"   Timeframe: {slo['thresholds'][0]['timeframe']}")
            print(f"   Tags: {', '.join(slo['tags'])}")
            print()
            created_slos.append(slo['name'])
        except Exception as e:
            print(f"❌ {slo['name']} 생성 실패: {str(e)}")
            failed_slos.append((slo['name'], str(e)))

    # 요약
    print("\n" + "=" * 60)
    print("📊 SLO 생성 요약")
    print("=" * 60)
    print(f"✅ 성공: {len(created_slos)}/{len(slos)}")
    for slo_name in created_slos:
        print(f"   • {slo_name}")

    if failed_slos:
        print(f"\n❌ 실패: {len(failed_slos)}/{len(slos)}")
        for slo_name, error in failed_slos:
            print(f"   • {slo_name}: {error}")

    print("\n" + "=" * 60)
    print("📋 다음 단계")
    print("=" * 60)
    print("1. Datadog에서 SLO 확인: https://app.datadoghq.com/slo/manage")
    print("2. 각 SLO 설정값 검토 및 조정")
    print("3. SLO 대시보드 생성")
    print("4. 알림 규칙 설정 (target 미충족 시)")
    print()

if __name__ == '__main__':
    setup_slos()
