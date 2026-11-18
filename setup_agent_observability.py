#!/usr/bin/env python3
"""
Datadog Agent Observability 설정 스크립트

Agent Observability를 활성화하여 Datadog Agent 자체의 상태와 성능을 모니터링합니다.
"""

import requests
import json
import time
from typing import Dict, Any, Optional

class AgentObservabilitySetup:
    def __init__(self, api_key: str, app_key: str, site: str = "datadoghq.com"):
        self.api_key = api_key
        self.app_key = app_key
        self.site = site
        self.api_base_url = f"https://api.{site}"
        self.headers = {
            "DD-API-KEY": api_key,
            "DD-APPLICATION-KEY": app_key,
            "Content-Type": "application/json"
        }

    def _make_request(self, method: str, endpoint: str, data: Optional[Dict] = None) -> Dict[str, Any]:
        """Datadog API에 요청을 전송합니다."""
        url = f"{self.api_base_url}{endpoint}"

        try:
            if method == "GET":
                response = requests.get(url, headers=self.headers, timeout=10)
            elif method == "POST":
                response = requests.post(url, headers=self.headers, json=data, timeout=10)
            elif method == "PUT":
                response = requests.put(url, headers=self.headers, json=data, timeout=10)
            elif method == "PATCH":
                response = requests.patch(url, headers=self.headers, json=data, timeout=10)
            else:
                raise ValueError(f"Unsupported method: {method}")

            response.raise_for_status()
            return response.json() if response.content else {"status": "success"}
        except requests.exceptions.RequestException as e:
            print(f"❌ API 요청 실패: {e}")
            return {"error": str(e)}

    def enable_agent_observability(self) -> bool:
        """Agent Observability 활성화"""
        print("🔧 Agent Observability 활성화 중...")

        # 1. Agent Observability 메트릭 활성화
        agent_observability_config = {
            "enabled": True,
            "collect_agent_stats": True,
            "collect_trace_agent_stats": True,
            "collect_process_agent_stats": True
        }

        endpoint = "/api/v2/agent/config"
        result = self._make_request("PUT", endpoint, agent_observability_config)

        if "error" not in result:
            print("✅ Agent Observability 메트릭 활성화 완료")
            return True
        else:
            print(f"⚠️  Agent Observability 설정 실패: {result.get('error')}")
            return False

    def create_agent_monitor(self) -> bool:
        """Agent 성능 모니터 생성"""
        print("📊 Agent 성능 모니터 생성 중...")

        monitor_config = {
            "type": "metric alert",
            "name": "LARS Datadog Agent Health",
            "query": 'avg(last_15m):avg:datadog.agent.memory{*} > 500',
            "message": "⚠️ Datadog Agent 메모리 사용량이 높습니다.\n\nAgent: {{host.name}}\nMemory: {{value}}MB\n\nImmediate Action Required.",
            "tags": [
                "env:production",
                "service:lars-agent",
                "stream:multi"
            ],
            "priority": 2,
            "options": {
                "notify_audit": True,
                "include_tags": True,
                "new_host_delay": 300,
                "require_full_window": False,
                "enable_logs_sample": True,
                "evaluation_delay": 60,
                "no_data_timeframe": 1440
            }
        }

        endpoint = "/api/v1/monitor"
        result = self._make_request("POST", endpoint, monitor_config)

        if "id" in result:
            print(f"✅ Agent 성능 모니터 생성 완료 (ID: {result['id']})")
            return True
        else:
            print(f"⚠️  모니터 생성 실패: {result.get('error', result)}")
            return False

    def create_agent_trace_monitor(self) -> bool:
        """Trace Agent 성능 모니터 생성"""
        print("🔍 Trace Agent 성능 모니터 생성 중...")

        monitor_config = {
            "type": "metric alert",
            "name": "LARS Trace Agent Performance",
            "query": 'avg(last_15m):avg:datadog.trace_agent.receiver.spans_received{*} < 100',
            "message": "⚠️ Trace Agent가 스팬을 제대로 수신하지 못하고 있습니다.\n\nAgent: {{host.name}}\nSpans Received: {{value}}\n\nCheck trace agent configuration.",
            "tags": [
                "env:production",
                "service:lars-agent",
                "stream:multi"
            ],
            "priority": 2,
            "options": {
                "notify_audit": True,
                "include_tags": True,
                "evaluation_delay": 60,
                "no_data_timeframe": 1440
            }
        }

        endpoint = "/api/v1/monitor"
        result = self._make_request("POST", endpoint, monitor_config)

        if "id" in result:
            print(f"✅ Trace Agent 성능 모니터 생성 완료 (ID: {result['id']})")
            return True
        else:
            print(f"⚠️  모니터 생성 실패: {result.get('error', result)}")
            return False

    def create_agent_logs_monitor(self) -> bool:
        """Logs Agent 성능 모니터 생성"""
        print("📝 Logs Agent 성능 모니터 생성 중...")

        monitor_config = {
            "type": "logs alert",
            "name": "LARS Agent Error Logs",
            "query": 'service:datadog-agent status:error',
            "message": "🔴 Datadog Agent에서 오류가 발생했습니다.\n\nAgent: {{host.name}}\nError: {{error.message}}\n\nImmediate investigation required.",
            "tags": [
                "env:production",
                "service:lars-agent",
                "stream:multi"
            ],
            "priority": 1,
            "options": {
                "notify_audit": True,
                "include_tags": True,
                "enable_logs_sample": True
            }
        }

        endpoint = "/api/v1/monitor"
        result = self._make_request("POST", endpoint, monitor_config)

        if "id" in result:
            print(f"✅ Logs Agent 성능 모니터 생성 완료 (ID: {result['id']})")
            return True
        else:
            print(f"⚠️  모니터 생성 실패: {result.get('error', result)}")
            return False

    def create_agent_dashboard(self) -> bool:
        """Agent Observability 대시보드 생성"""
        print("📈 Agent Observability 대시보드 생성 중...")

        dashboard_config = {
            "title": "LARS Datadog Agent Observability",
            "description": "Agent Observability를 통한 Datadog Agent 상태 및 성능 모니터링",
            "layout_type": "ordered",
            "tags": [
                "env:production",
                "service:lars-agent",
                "stream:multi"
            ],
            "widgets": [
                {
                    "id": 1,
                    "definition": {
                        "type": "timeseries",
                        "requests": [
                            {
                                "query": "avg:datadog.agent.memory{*}",
                                "display_type": "line"
                            }
                        ],
                        "title": "Agent Memory Usage"
                    }
                },
                {
                    "id": 2,
                    "definition": {
                        "type": "timeseries",
                        "requests": [
                            {
                                "query": "avg:datadog.agent.cpu{*}",
                                "display_type": "line"
                            }
                        ],
                        "title": "Agent CPU Usage"
                    }
                },
                {
                    "id": 3,
                    "definition": {
                        "type": "timeseries",
                        "requests": [
                            {
                                "query": "avg:datadog.trace_agent.receiver.spans_received{*}",
                                "display_type": "bars"
                            }
                        ],
                        "title": "Trace Agent Spans Received"
                    }
                },
                {
                    "id": 4,
                    "definition": {
                        "type": "timeseries",
                        "requests": [
                            {
                                "query": "avg:datadog.forwarder.logs_received{*}",
                                "display_type": "line"
                            }
                        ],
                        "title": "Logs Received"
                    }
                },
                {
                    "id": 5,
                    "definition": {
                        "type": "timeseries",
                        "requests": [
                            {
                                "query": "avg:datadog.agent.goroutines{*}",
                                "display_type": "line"
                            }
                        ],
                        "title": "Agent Goroutines"
                    }
                },
                {
                    "id": 6,
                    "definition": {
                        "type": "timeseries",
                        "requests": [
                            {
                                "query": "sum:datadog.dogstatsd.packet.count{*}",
                                "display_type": "bars"
                            }
                        ],
                        "title": "Dogstatsd Packets Received"
                    }
                }
            ]
        }

        endpoint = "/api/v1/dashboard"
        result = self._make_request("POST", endpoint, dashboard_config)

        if "id" in result:
            print(f"✅ Agent Observability 대시보드 생성 완료 (ID: {result['id']})")
            return True
        else:
            print(f"⚠️  대시보드 생성 실패: {result.get('error', result)}")
            return False

    def setup_agent_application(self) -> bool:
        """Agent Application 등록"""
        print("🔧 Agent Application 등록 중...")

        app_config = {
            "name": "lars-datadog-agent",
            "description": "LARS Platform Datadog Agent - Agent Observability enabled",
            "team": "LARS Platform",
            "environment": "production",
            "tags": [
                "env:production",
                "service:lars-agent",
                "stream:multi"
            ]
        }

        endpoint = "/api/v2/apm/application"
        result = self._make_request("POST", endpoint, app_config)

        if "id" in result or "already" in str(result).lower():
            print("✅ Agent Application 등록 완료")
            return True
        else:
            print(f"⚠️  Application 등록 실패: {result.get('error', result)}")
            return False

    def run_setup(self) -> Dict[str, bool]:
        """전체 설정 실행"""
        print("=" * 60)
        print("🚀 Datadog Agent Observability 설정 시작")
        print("=" * 60)
        print()

        results = {
            "agent_observability": self.enable_agent_observability(),
            "agent_monitor": self.create_agent_monitor(),
            "trace_agent_monitor": self.create_agent_trace_monitor(),
            "logs_agent_monitor": self.create_agent_logs_monitor(),
            "dashboard": self.create_agent_dashboard(),
            "application": self.setup_agent_application()
        }

        print()
        print("=" * 60)
        print("✅ Agent Observability 설정 완료")
        print("=" * 60)
        print()

        # 요약
        print("📊 설정 결과 요약:")
        for key, status in results.items():
            status_icon = "✅" if status else "❌"
            print(f"  {status_icon} {key.replace('_', ' ').title()}")

        print()
        print("🔍 모니터링 접근:")
        print("  • Datadog: https://app.datadoghq.com/monitoring")
        print("  • Agent Observability: https://app.datadoghq.com/apm/observability/agent")
        print()

        return results


if __name__ == "__main__":
    import os

    # API 키 로드
    api_key = os.getenv("DATADOG_API_KEY", "083f04f0b50befe521803d0035bc09f6")
    app_key = os.getenv("DATADOG_APP_KEY", "8e5edd7cfc67325a02c57ab1f948cbe8a9e7e6d9")
    site = os.getenv("DATADOG_SITE", "datadoghq.com")

    setup = AgentObservabilitySetup(api_key, app_key, site)
    results = setup.run_setup()

    # 모든 설정이 성공했는지 확인
    all_success = all(results.values())
    exit(0 if all_success else 1)
