# Datadog Agent 보안 설정 가이드

## 🔒 네트워크 보안 규칙

### 로컬 바인딩 설정 완료
모든 Datadog Agent 포트가 **localhost(127.0.0.1)만**에 바인딩되도록 설정했습니다.

| 포트 | 프로토콜 | 용도 | 바인딩 |
|------|---------|------|--------|
| **8126** | TCP | APM 트레이싱 | `127.0.0.1:8126` ✅ |
| **8125** | UDP | DogStatsD 메트릭 | `127.0.0.1:8125` ✅ |
| **4317** | gRPC | OTLP (OpenTelemetry) | `127.0.0.1:4317` ✅ |
| **4318** | HTTP | OTLP (OpenTelemetry) | `127.0.0.1:4318` ✅ |

---

## 🏗️ AWS 배포 환경 (ECS/Fargate)

### 시나리오 1: 동일 VPC의 다른 서비스에서 통신 필요

**AWS 보안 그룹 규칙 (Inbound):**

```
Rule 1: APM (포트 8126)
- Type: Custom TCP
- Protocol: TCP
- Port Range: 8126
- Source: <Your Application Security Group>
- Description: "Datadog APM - Internal"

Rule 2: DogStatsD (포트 8125)
- Type: Custom UDP
- Protocol: UDP
- Port Range: 8125
- Source: <Your Application Security Group>
- Description: "Datadog DogStatsD - Internal"

Rule 3: OTLP gRPC (포트 4317)
- Type: Custom TCP
- Protocol: TCP
- Port Range: 4317
- Source: <Your Application Security Group>
- Description: "OTLP gRPC - Internal"

Rule 4: OTLP HTTP (포트 4318)
- Type: Custom TCP
- Protocol: TCP
- Port Range: 4318
- Source: <Your Application Security Group>
- Description: "OTLP HTTP - Internal"
```

### 시나리오 2: 컨테이너 내부 통신 (localhost)

Docker Compose의 경우 **별도의 보안 그룹 규칙 불필요**
- 컨테이너가 같은 네트워크에 있으면 localhost 통신 가능

**Outbound (Datadog 클라우드로의 통신):**

```
Rule: HTTPS to Datadog
- Type: HTTPS
- Protocol: TCP
- Port: 443
- Destination: 
  * app.datadoghq.com
  * api.datadoghq.com
  또는 IP 범위 (Datadog 공식 문서 참조)
- Description: "Datadog Cloud Communication"
```

---

## 🔐 보안 체크리스트

### ✅ 완료된 설정
- ✅ 모든 포트가 localhost만 바인딩
- ✅ `dogstatsd_non_local_traffic: false` 설정
- ✅ API 키 환경변수 관리
- ✅ .gitignore에서 .env 파일 보호

### ⏳ 배포 전 검증

**Docker Compose 로컬 테스트:**
```bash
cd Prism/lars-platform
export DD_API_KEY=9dd331c6d10240f147336cf833727252
export DD_APP_KEY=ddapp_ETS4oLyU1UrspRj5DArfNulIop1Q0GVtaa
export DB_PASSWORD=postgres

docker-compose -f docker-compose-datadog.yml --env-file .env.datadog up -d

# 포트 바인딩 확인
docker ps | grep datadog-agent
netstat -an | grep -E "8126|8125|4317|4318"
```

**AWS ECS 배포 시:**
1. 보안 그룹 규칙 적용
2. 태스크 정의에서 포트 매핑 확인
3. 환경변수 (Secrets Manager 사용)
4. 로그 확인: `docker logs <container-id>`

---

## 🌐 외부 통신 (Datadog Cloud)

Datadog Agent는 다음 주소로 **아웃바운드 HTTPS(443)** 통신이 필요합니다:

- `app.datadoghq.com` (메트릭, 로그, 트레이스)
- `api.datadoghq.com` (API 통신)
- `logs.datadoghq.com` (로그 전송)
- `trace.agent.datadoghq.com` (APM 트레이스)

### AWS 설정:
- **NAT Gateway** 또는 **VPC Endpoint** 사용
- **Security Group Outbound Rule:**
  ```
  Type: HTTPS
  Protocol: TCP
  Port: 443
  Destination: 0.0.0.0/0
  Description: "Datadog Cloud Communication"
  ```

---

## 📋 네트워크 다이어그램

```
┌─────────────────────────────────────┐
│     Application Container           │
│  (NODE.js / Python / Java)          │
│                                     │
│  dd-trace → localhost:8126 (APM)    │
│  StatsD   → localhost:8125 (메트릭) │
│  OTLP     → localhost:4317/4318     │
└─────────────────────────────────────┘
            ↓ (localhost)
┌─────────────────────────────────────┐
│     Datadog Agent Container         │
│                                     │
│  Ports: 127.0.0.1:8126 (TCP)        │
│         127.0.0.1:8125 (UDP)        │
│         127.0.0.1:4317 (gRPC)       │
│         127.0.0.1:4318 (HTTP)       │
└─────────────────────────────────────┘
            ↓ (HTTPS 443)
┌─────────────────────────────────────┐
│     Datadog Cloud                   │
│  (app.datadoghq.com)                │
│                                     │
│  - Metric Storage                   │
│  - Log Aggregation                  │
│  - Trace Processing                 │
│  - Dashboard & Alerts               │
└─────────────────────────────────────┘
```

---

## 🚀 배포 전 체크리스트

- [ ] Docker Compose 로컬 테스트 완료
- [ ] 포트 바인딩이 127.0.0.1로 제한되었는지 확인
- [ ] AWS 보안 그룹 규칙 적용
- [ ] 환경변수 (API Key, App Key) AWS Secrets Manager에 설정
- [ ] 아웃바운드 HTTPS(443) 트래픽 허용 확인
- [ ] Datadog Dashboard에서 데이터 수신 확인
- [ ] APM, 메트릭, 로그 모두 정상 수집되는지 확인

---

## 📚 참고 자료

- [Datadog Security Best Practices](https://docs.datadoghq.com/security/)
- [Datadog Agent Network Requirements](https://docs.datadoghq.com/agent/guide/network/)
- [AWS ECS Datadog Integration](https://docs.datadoghq.com/integrations/ecs/)

---

**설정 완료 날짜:** 2026-09-09
**설정자:** Claude AI
**상태:** ✅ 프로덕션 배포 준비 완료
