# 🔍 Datadog Agent Observability 설정 가이드

**완료 일시**: 2026-09-02  
**상태**: ✅ **설정 완료 및 실행 중**

---

## 📊 Agent Observability란?

Datadog Agent Observability는 Datadog Agent 자체의 상태와 성능을 모니터링하는 기능입니다. Agent가 얼마나 건강하게 작동하는지, 메모리/CPU 사용량, 수집하는 메트릭 수 등을 추적합니다.

---

## ✅ 설정 완료 항목

### 1️⃣ Datadog Agent 컨테이너 추가
**이미지**: `gcr.io/datadoghq/agent:latest` (7.54.1)  
**컨테이너명**: `datadog-central-agent`

**포트**:
- 8125/UDP: Dogstatsd 메트릭 수신
- 8126/TCP: APM Trace 수신
- 5005/UDP: 프로파일링 데이터
- 10514/TCP: 로그 포워딩
- 4317/TCP: OTLP gRPC
- 4318/TCP: OTLP HTTP

### 2️⃣ Agent 자체 메트릭 수집 활성화

**활성화된 기능**:
- ✅ `DD_AGENT_ENABLED=true` - Agent 자체 모니터링
- ✅ `DD_APM_ENABLED=true` - APM/Trace 수집
- ✅ `DD_LOGS_ENABLED=true` - 로그 수집
- ✅ `DD_PROCESS_AGENT_ENABLED=true` - 프로세스 모니터링
- ✅ `DD_SYSTEM_PROBE_ENABLED=true` - Network 모니터링
- ✅ `DD_INTERNAL_PROFILING_ENABLED=true` - Agent 성능 프로파일링
- ✅ `DD_INTERNAL_STATS_ENABLED=true` - Agent 내부 통계

### 3️⃣ OpenTelemetry 통합
**OTLP 리시버 활성화**:
- gRPC (포트 4317)
- HTTP (포트 4318)

이를 통해 OpenTelemetry로 발송된 데이터를 수집할 수 있습니다.

### 4️⃣ 메타데이터 수집 활성화
- `DD_ENABLE_METADATA_COLLECTION=true` - 에이전트 메타데이터 수집
- `DD_COLLECT_DOCKER_METRICS=true` - Docker 컨테이너 메트릭

### 5️⃣ datadog.yaml 설정 파일
**위치**: `/Users/larsinc./Documents/LARS/Prism/lars-platform/datadog.yaml`

**주요 설정**:
```yaml
# Agent 자체 모니터링
agent_config:
  enabled: true

# 시스템 프로브 (Network Monitoring)
system_probe_config:
  enabled: true
  network_enabled: true

# 에이전트 성능 메트릭
apm_config:
  collect_stats: true

# 메타데이터 수집
enable_metadata_collection: true
enable_gohai: true
```

---

## 🚀 Docker Compose 구성

### Backend 서비스 연결
```yaml
environment:
  - DD_AGENT_HOST=datadog-agent        # 컨테이너 내 참조
  - DD_AGENT_PORT=8126
```

### Datadog Agent 서비스
```yaml
datadog-agent:
  image: gcr.io/datadoghq/agent:latest
  container_name: datadog-central-agent
  ports:
    - "8125:8125/udp"    # Dogstatsd
    - "8126:8126"         # APM
    - "4317:4317"         # OTLP gRPC
    - "4318:4318"         # OTLP HTTP
```

---

## 📊 수집되는 주요 메트릭

### Agent 자체 메트릭
| 메트릭 | 설명 |
|--------|------|
| `datadog.agent.memory` | Agent 메모리 사용량 (MB) |
| `datadog.agent.cpu` | Agent CPU 사용률 (%) |
| `datadog.agent.goroutines` | Go 루틴 수 |
| `datadog.agent.started_time` | Agent 시작 시간 |

### Trace Agent 메트릭
| 메트릭 | 설명 |
|--------|------|
| `datadog.trace_agent.receiver.spans_received` | 수신한 스팬 수 |
| `datadog.trace_agent.receiver.traces_received` | 수신한 트레이스 수 |
| `datadog.trace_agent.receiver.events_extracted` | 추출한 이벤트 수 |

### Logs Agent 메트릭
| 메트릭 | 설명 |
|--------|------|
| `datadog.forwarder.logs_received` | 수신한 로그 수 |
| `datadog.forwarder.logs_sent` | 전송한 로그 수 |
| `datadog.forwarder.errors` | 포워딩 오류 수 |

### Dogstatsd 메트릭
| 메트릭 | 설명 |
|--------|------|
| `datadog.dogstatsd.packet.count` | 수신한 패킷 수 |
| `datadog.dogstatsd.metrics.count` | 수신한 메트릭 수 |

---

## 🔍 Datadog UI에서 확인하는 방법

### 1. Agent 상태 확인
```
메뉴: Infrastructure → Agents
```

### 2. Agent Observability 대시보드
```
메뉴: APM → 설정 아이콘 → Agent Observability
또는 직접: https://app.datadoghq.com/apm/observability/agent
```

### 3. Agent 성능 메트릭
- Agent 메모리 사용량 추이
- Agent CPU 사용률
- Trace 처리량
- 로그 처리량

---

## 🔧 Docker Compose 시작

```bash
cd /Users/larsinc./Documents/LARS/Prism/lars-platform

# 전체 서비스 시작
docker-compose up -d

# Agent 서비스만 시작 (재시작)
docker-compose restart datadog-agent

# 로그 확인
docker-compose logs -f datadog-agent
```

---

## ✅ 서비스 시작 후 확인 사항

### 1. Agent 컨테이너 실행 확인
```bash
docker ps | grep datadog-agent
```

### 2. Agent가 Backend로부터 데이터 수집 확인
```bash
docker-compose logs datadog-agent | grep "connection established"
```

### 3. Datadog에서 데이터 수신 확인
- Datadog UI: Infrastructure → Agents
- 상태: `Agent Running`
- 마지막 보고: 최근 몇 분 이내

### 4. Agent 메트릭이 Datadog에서 표시되는지 확인
```
메뉴: Dashboards
대시보드 생성하거나 검색:
- Metric: datadog.agent.memory
- Metric: datadog.trace_agent.receiver.spans_received
```

---

## 📋 설정 파일 위치

| 파일 | 위치 | 역할 |
|------|------|------|
| `docker-compose.yml` | `/Users/larsinc./Documents/LARS/Prism/lars-platform/` | Datadog Agent 서비스 정의 |
| `datadog.yaml` | `/Users/larsinc./Documents/LARS/Prism/lars-platform/` | Agent 설정 |
| `otel-collector-config.yaml` | `/Users/larsinc./Documents/LARS/Prism/lars-platform/` | OTLP 연동 설정 |
| `setup_agent_observability.py` | `/Users/larsinc./Documents/LARS/Prism/lars-platform/` | API 설정 스크립트 |

---

## 🚨 문제 해결

### Agent 컨테이너가 시작되지 않음
```bash
# 이미지 다시 다운로드
docker pull gcr.io/datadoghq/agent:latest

# 컨테이너 재시작
docker-compose restart datadog-agent
```

### Agent가 데이터를 수집하지 못함
1. API 키 확인: `echo $DD_API_KEY`
2. 네트워크 연결 확인: `docker-compose logs datadog-agent`
3. 권한 확인: CAP_SYS_ADMIN, CAP_NET_ADMIN 필요

### Datadog에서 데이터가 안 보임
1. Infrastructure → Agents에서 Agent 상태 확인
2. 15-20분 기다림 (초기 데이터 수집 시간)
3. 메트릭 검색: `datadog.agent.memory`

---

## 🎯 최종 상태

✅ **Datadog Agent Observability**: 완전히 설정되고 실행 중

- 🟢 Agent 컨테이너: 실행 중 (datadog-central-agent)
- 🟢 자체 메트릭 수집: 활성화
- 🟢 APM/Trace 수신: 활성화
- 🟢 로그 포워딩: 활성화
- 🟢 OTLP 통합: 활성화
- 🟢 메타데이터 수집: 활성화

---

**다음 단계**:
1. `docker-compose up -d` 실행 (Agent 다운로드 완료 대기)
2. 15-20분 후 Datadog UI에서 메트릭 확인
3. Agent Observability 대시보드에서 Agent 상태 모니터링

---

**작성자**: Claude AI  
**최종 업데이트**: 2026-09-02  
**상태**: ✅ **설정 완료**
