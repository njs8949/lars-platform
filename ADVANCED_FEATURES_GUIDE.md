# 🚀 LARS Prism 고급 기능 가이드

데스크톱 앱과 CLI의 **엔터프라이즈 자동화 기능** 완전 가이드

## 📋 목차

1. [원격 실행](#원격-실행)
2. [자동화 & 스케줄링](#자동화--스케줄링)
3. [배치 처리](#배치-처리)
4. [워크플로우 빌더](#워크플로우-빌더)
5. [고급 예시](#고급-예시)

---

## 🌐 원격 실행

### 개요

**원격 서버에서 작업을 실행**하고 결과를 로컬에서 관리합니다.

- SSH를 통한 안전한 원격 실행
- 여러 서버 동시 관리
- 스크립트 및 명령어 실행
- 실시간 결과 수신

### 원격 서버 추가

#### UI (데스크톱 앱)

```
Settings → Remote Servers → Add Server
- Name: aws-server-1
- Host: ec2-52-xxx-xxx-xxx.amazonaws.com
- Port: 22 (기본값)
- Username: ubuntu
- Auth Method: SSH Key / Password
- Description: AWS Production Server
```

#### CLI

```bash
# 아직 구현 필요
prism remote add \
  --name aws-server-1 \
  --host ec2-52-xxx-xxx-xxx.amazonaws.com \
  --username ubuntu \
  --key-file ~/.ssh/aws_key.pem
```

### 원격 명령어 실행

#### 단일 명령어

```bash
# 원격에서 bash 명령 실행
prism remote execute aws-server-1 "ls -la /home/ubuntu"

# 결과 표시
Output:
total 24
drwxr-xr-x  5 ubuntu ubuntu 4096 Sep 05 10:30 .
...
```

#### 원격 스크립트 실행

```bash
# 로컬 스크립트를 원격에서 실행
prism remote run aws-server-1 --script backup.sh

# 또는 인라인 스크립트
prism remote execute aws-server-1 "
  cd /home/ubuntu/data
  tar -czf backup_$(date +%Y%m%d).tar.gz *.csv
  echo 'Backup completed'
"
```

### 원격 작업 실행

```bash
# 원격 서버에서 작업 실행
prism remote task aws-server-1 \
  --action statistics \
  --input data.csv \
  --output results.json
```

**지원하는 작업:**
- `statistics` - 통계 분석
- `analysis` - 데이터 분석
- `generate-report` - 보고서 생성
- `custom-script` - 커스텀 스크립트

---

## ⏰ 자동화 & 스케줄링

### 개요

**정해진 시간이나 조건에 따라 자동으로 작업 실행**

- Cron 기반 스케줄링
- 이벤트 기반 트리거
- 작업 간 의존성
- 실패 시 자동 재시도

### 워크플로우 생성

#### UI (데스크톱 앱)

```
Automation → Workflows → Create New
1. 워크플로우 이름: "Daily Data Pipeline"
2. 작업 추가:
   - Load data from CSV
   - Run statistics analysis
   - Generate report
   - Send email notification
3. 트리거 설정: Schedule
4. Cron 표현식: 0 9 * * * (매일 9시)
5. 저장 및 활성화
```

#### CLI

```bash
# 워크플로우 정의 (JSON)
cat > workflow.json << EOF
{
  "name": "Daily Data Pipeline",
  "description": "매일 09:00에 데이터 분석",
  "tasks": [
    {
      "name": "Load data",
      "action": "load_data",
      "params": {"source": "s3://data/input.csv"}
    },
    {
      "name": "Analyze",
      "action": "statistics",
      "params": {"type": "descriptive"}
    },
    {
      "name": "Generate report",
      "action": "generate_report",
      "params": {"format": "pdf"}
    },
    {
      "name": "Send email",
      "action": "send_email",
      "params": {"to": "team@example.com"}
    }
  ],
  "trigger": "schedule",
  "schedule": "0 9 * * *"
}
EOF

# 워크플로우 생성
prism automation workflow create --file workflow.json

# 워크플로우 활성화
prism automation workflow enable workflow_id
```

### 스케줄 표현식

**Cron 형식:**
```
┌───────────── 분 (0 - 59)
│ ┌───────────── 시 (0 - 23)
│ │ ┌───────────── 일 (1 - 31)
│ │ │ ┌───────────── 월 (1 - 12)
│ │ │ │ ┌───────────── 요일 (0 - 6) (0은 일요일)
│ │ │ │ │
│ │ │ │ │
* * * * *
```

**예시:**
```
0 9 * * *       → 매일 09:00
0 */4 * * *     → 4시간마다
0 0 * * 1       → 매주 월요일 00:00
0 12 1 * *      → 매월 1일 12:00
0 0 1 1 *       → 매년 1월 1일 00:00
```

### 작업 의존성

```json
{
  "name": "Data Processing Pipeline",
  "tasks": [
    {
      "id": "task_1",
      "name": "Extract",
      "action": "extract"
    },
    {
      "id": "task_2",
      "name": "Transform",
      "action": "transform",
      "dependsOn": ["task_1"]  // task_1 완료 후 실행
    },
    {
      "id": "task_3",
      "name": "Load",
      "action": "load",
      "dependsOn": ["task_2"]  // task_2 완료 후 실행
    }
  ]
}
```

---

## 📦 배치 처리

### 개요

**여러 작업을 효율적으로 일괄 처리**

- 순차 또는 병렬 실행
- 진행 상황 실시간 추적
- 실패한 작업 재시도
- 결과 통합 및 보고

### 배치 작업 생성

#### UI (데스크톱 앱)

```
Automation → Batch Jobs → Create Batch
1. 배치 이름: "Monthly Report Generation"
2. 작업 선택:
   - Generate Sales Report
   - Generate Inventory Report
   - Generate Financial Report
3. 실행 방식: Parallel (병렬)
4. 실행
```

#### CLI

```bash
# 배치 작업 정의
cat > batch_job.json << EOF
{
  "name": "Analysis Batch",
  "parallel": true,
  "tasks": [
    {
      "action": "statistics",
      "params": {"data": "dataset_1.csv"}
    },
    {
      "action": "statistics",
      "params": {"data": "dataset_2.csv"}
    },
    {
      "action": "statistics",
      "params": {"data": "dataset_3.csv"}
    }
  ]
}
EOF

# 배치 작업 실행
prism automation batch run --file batch_job.json

# 진행 상황 모니터링
prism automation batch status batch_job_id
```

### 배치 작업 모니터링

```bash
# 활성 배치 작업 조회
prism automation batch list

# 특정 배치 상세 조회
prism automation batch show batch_id

# 진행 상황 실시간 모니터링
prism automation batch monitor batch_id

# 취소
prism automation batch cancel batch_id
```

---

## 🔄 워크플로우 빌더

### 개요

**시각적 인터페이스로 복잡한 자동화 워크플로우 구성**

### 워크플로우 구성 요소

```
[시작]
   ↓
[데이터 로드] ← 소스 선택
   ↓
[분석] ← 분석 유형 선택
   ↓
[조건] ← 결과가 조건 충족?
   ├─ YES → [보고서 생성]
   └─ NO  → [알림 발송]
   ↓
[종료]
```

### 조건부 분기

```json
{
  "type": "condition",
  "condition": {
    "field": "analysis_result.mean",
    "operator": "greater_than",
    "value": 100
  },
  "onTrue": {
    "action": "send_email",
    "params": {"subject": "High average detected!"}
  },
  "onFalse": {
    "action": "log",
    "params": {"message": "Average is normal"}
  }
}
```

### 에러 처리

```json
{
  "tasks": [
    {
      "name": "Data Analysis",
      "action": "statistics",
      "onError": {
        "action": "retry",
        "maxRetries": 3,
        "backoffMultiplier": 2
      }
    }
  ]
}
```

---

## 고급 예시

### 예시 1: 일일 자동화 파이프라인

```bash
# 1. 워크플로우 정의 (workflow.json)
{
  "name": "Daily Analytics Pipeline",
  "schedule": "0 9 * * *",  # 매일 09:00
  "tasks": [
    {
      "name": "Fetch Data",
      "action": "fetch_data",
      "params": {"source": "database"}
    },
    {
      "name": "Validate",
      "action": "validate",
      "params": {"rules": "data_quality.yml"}
    },
    {
      "name": "Analyze",
      "action": "statistics",
      "params": {"type": "comprehensive"}
    },
    {
      "name": "Generate Report",
      "action": "generate_report",
      "params": {"format": "pdf", "title": "Daily Report"}
    },
    {
      "name": "Send Report",
      "action": "send_email",
      "params": {
        "to": "analytics-team@company.com",
        "subject": "Daily Analytics Report"
      }
    }
  ]
}

# 2. 워크플로우 생성 및 활성화
prism automation workflow create --file workflow.json
prism automation workflow enable workflow_id
```

### 예시 2: 원격 배치 처리

```bash
# 1. 배치 작업 정의 (batch.json)
{
  "name": "Multi-Server Analytics",
  "parallel": true,
  "servers": [
    "production-server-1",
    "production-server-2",
    "production-server-3"
  ],
  "tasks": [
    {
      "action": "collect_metrics",
      "params": {"host": "{{ server }}", "metrics": ["cpu", "memory", "disk"]}
    },
    {
      "action": "analyze_metrics",
      "params": {"threshold": 80}
    },
    {
      "action": "generate_alert",
      "params": {"severity": "high"}
    }
  ]
}

# 2. 원격 배치 실행
prism automation batch run \
  --file batch.json \
  --servers production-server-1,production-server-2,production-server-3
```

### 예시 3: 복잡한 워크플로우

```json
{
  "name": "Monthly Business Analytics",
  "schedule": "0 1 1 * *",  // 매월 1일 01:00
  "tasks": [
    {
      "id": "extract",
      "name": "Extract Data",
      "action": "extract",
      "params": {"source": "data_warehouse"}
    },
    {
      "id": "parallel_analysis",
      "type": "parallel",
      "tasks": [
        {
          "name": "Sales Analysis",
          "action": "analyze_sales",
          "dependsOn": ["extract"]
        },
        {
          "name": "Customer Analysis",
          "action": "analyze_customers",
          "dependsOn": ["extract"]
        },
        {
          "name": "Financial Analysis",
          "action": "analyze_financials",
          "dependsOn": ["extract"]
        }
      ]
    },
    {
      "id": "consolidate",
      "name": "Consolidate Results",
      "action": "consolidate",
      "params": {"inputs": ["parallel_analysis"]},
      "dependsOn": ["parallel_analysis"]
    },
    {
      "id": "check_quality",
      "type": "condition",
      "condition": {
        "field": "consolidate.quality_score",
        "operator": "greater_than",
        "value": 90
      },
      "onTrue": {
        "name": "Generate Final Report",
        "action": "generate_report",
        "params": {"quality": "high"}
      },
      "onFalse": {
        "name": "Alert Data Quality Issue",
        "action": "alert",
        "params": {"severity": "warning", "message": "Low data quality"}
      }
    },
    {
      "id": "distribute",
      "name": "Distribute Reports",
      "action": "distribute",
      "params": {
        "recipients": ["executives@company.com", "analysts@company.com"],
        "format": "pdf"
      },
      "dependsOn": ["check_quality"]
    }
  ]
}
```

---

## 📊 모니터링 & 로깅

### 작업 모니터링

```bash
# 활성 작업 조회
prism automation task list --status running

# 특정 작업 상세 조회
prism automation task show task_id

# 작업 로그 조회
prism automation task logs task_id --tail 100
```

### 워크플로우 통계

```bash
# 워크플로우 실행 통계
prism automation workflow stats workflow_id

# 결과:
Name: Daily Analytics Pipeline
Total Executions: 45
Successful: 43
Failed: 2
Average Duration: 5m 32s
Last Run: 2026-09-05 09:12:30
```

### 알림 설정

```json
{
  "notifications": {
    "onSuccess": {
      "type": "email",
      "recipients": ["admin@company.com"],
      "message": "Workflow completed successfully"
    },
    "onFailure": {
      "type": "slack",
      "channel": "#alerts",
      "message": "Workflow failed: {{ error }}"
    },
    "onTimeout": {
      "type": "email",
      "recipients": ["devops@company.com"],
      "message": "Workflow timeout after {{ duration }}"
    }
  }
}
```

---

## 🔒 보안 고려사항

### SSH 인증

```bash
# SSH 키 기반 인증 (권장)
prism remote add \
  --name production \
  --host prod.example.com \
  --username ubuntu \
  --key-file ~/.ssh/prod_key.pem

# 암호 기반 인증 (개발 환경만)
prism remote add \
  --name dev \
  --host dev.example.com \
  --username root \
  --password-prompt
```

### 자격증명 관리

```bash
# 환경 변수로 자격증명 전달
export REMOTE_PASSWORD="your-password"
prism remote add --name server --host example.com --use-env-password

# 보안 파일에 저장 (권한 600)
chmod 600 ~/.lars/remote_auth.json
```

---

## 🎓 다음 단계

1. **[워크플로우 빌더 시작](#워크플로우-빌더)** - UI에서 첫 워크플로우 구성
2. **[원격 서버 추가](#원격-실행)** - 배포 환경 등록
3. **[스케줄 설정](#자동화--스케줄링)** - 정기 자동화 작업 생성
4. **[배치 처리](#배치-처리)** - 대량 작업 효율화

---

**마지막 업데이트:** 2026-09-05
**버전:** 1.4.0+
