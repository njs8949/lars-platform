# LARS Prism 클라우드 배포 가이드

## 🏗️ 배포 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                     Internet / CDN                       │
└──────────────────────┬──────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
    ┌───▼───┐                    ┌───▼───┐
    │ Nginx │                    │ WAF   │
    │ (LB)  │                    │       │
    └───┬───┘                    └───┬───┘
        │                             │
        └──────────────┬──────────────┘
                       │
        ┌──────────────▼──────────────┐
        │    Kubernetes Cluster       │
        │  ┌────────────────────────┐ │
        │  │ FastAPI Backend (3x)   │ │
        │  │ - Pod Replicas         │ │
        │  │ - Auto Scaling (HPA)   │ │
        │  │ - Load Balancing       │ │
        │  └────────────────────────┘ │
        │  ┌────────────────────────┐ │
        │  │ Database (PostgreSQL)  │ │
        │  │ - Persistent Volume    │ │
        │  │ - Backup & Restore     │ │
        │  └────────────────────────┘ │
        │  ┌────────────────────────┐ │
        │  │ Cache (Redis)          │ │
        │  │ - High Availability    │ │
        │  │ - Sentinel             │ │
        │  └────────────────────────┘ │
        │  ┌────────────────────────┐ │
        │  │ Monitoring             │ │
        │  │ - Prometheus           │ │
        │  │ - Grafana              │ │
        │  │ - Loki Logs            │ │
        │  └────────────────────────┘ │
        └─────────────────────────────┘
```

---

## 1️⃣ Docker 배포 (로컬/VPS)

### 1.1 준비 단계

```bash
# 저장소 클론
git clone https://github.com/lars-technologies/prism.git
cd prism

# 환경 변수 설정
cp .env.example .env
# .env 파일 수정: 데이터베이스 비밀번호, API 키 등 설정

# 필요한 디렉토리 생성
mkdir -p {logs,uploads,ssl}
```

### 1.2 Docker Compose로 배포

```bash
# 프로덕션 환경에서 실행
docker-compose -f docker-compose.prod.yml up -d

# 상태 확인
docker-compose -f docker-compose.prod.yml ps

# 로그 보기
docker-compose -f docker-compose.prod.yml logs -f backend

# 데이터베이스 초기화
docker-compose -f docker-compose.prod.yml exec backend python -m alembic upgrade head
```

### 1.3 SSL/TLS 설정

```bash
# Let's Encrypt 인증서 생성
sudo apt-get install certbot python3-certbot-nginx
sudo certbot certonly --standalone -d prism.example.com

# 인증서 복사
sudo cp /etc/letsencrypt/live/prism.example.com/fullchain.pem ssl/
sudo cp /etc/letsencrypt/live/prism.example.com/privkey.pem ssl/
sudo chown 1000:1000 ssl/*

# 자동 갱신 설정
sudo certbot renew --quiet --no-eff-email --agree-tos
```

---

## 2️⃣ Kubernetes 배포 (EKS/GKE/AKS)

### 2.1 클러스터 설정

#### AWS EKS

```bash
# EKS 클러스터 생성
aws eks create-cluster \
  --name lars-prism \
  --version 1.28 \
  --role-arn arn:aws:iam::ACCOUNT_ID:role/eks-service-role \
  --resources-vpc-config subnetIds=subnet-xxx,subnet-yyy \
  --region us-east-1

# Kubeconfig 업데이트
aws eks update-kubeconfig --name lars-prism --region us-east-1

# 노드 그룹 생성
aws eks create-nodegroup \
  --cluster-name lars-prism \
  --nodegroup-name default \
  --scaling-config minSize=3,maxSize=10,desiredSize=3 \
  --subnets subnet-xxx subnet-yyy \
  --node-role arn:aws:iam::ACCOUNT_ID:role/NodeInstanceRole
```

#### Google GKE

```bash
# GKE 클러스터 생성
gcloud container clusters create lars-prism \
  --zone us-central1-a \
  --num-nodes 3 \
  --machine-type n1-standard-2 \
  --enable-autoscaling \
  --min-nodes 2 \
  --max-nodes 10

# Kubeconfig 획득
gcloud container clusters get-credentials lars-prism --zone us-central1-a
```

#### Azure AKS

```bash
# 리소스 그룹 생성
az group create \
  --name lars-prism-rg \
  --location eastus

# AKS 클러스터 생성
az aks create \
  --resource-group lars-prism-rg \
  --name lars-prism \
  --node-count 3 \
  --vm-set-type VirtualMachineScaleSets \
  --load-balancer-sku standard \
  --enable-managed-identity

# Kubeconfig 획득
az aks get-credentials \
  --resource-group lars-prism-rg \
  --name lars-prism
```

### 2.2 Kubernetes 매니페스트 배포

```bash
# 네임스페이스 생성
kubectl create namespace lars-prism

# 시크릿 생성
kubectl create secret generic prism-secrets \
  --from-literal=DATABASE_PASSWORD=YOUR_PASSWORD \
  --from-literal=REDIS_PASSWORD=YOUR_PASSWORD \
  --from-literal=JWT_SECRET=YOUR_JWT_SECRET \
  -n lars-prism

# 배포 적용
kubectl apply -f k8s/deployment.yaml

# 상태 확인
kubectl get all -n lars-prism
kubectl logs -f -l app=prism -n lars-prism
```

### 2.3 Ingress 설정

```bash
# Ingress 컨트롤러 설치
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm install nginx-ingress ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace

# Ingress 규칙 생성
cat > k8s/ingress.yaml << 'EOF'
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: prism-ingress
  namespace: lars-prism
spec:
  ingressClassName: nginx
  rules:
  - host: prism.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: prism-backend
            port:
              number: 8000
EOF

kubectl apply -f k8s/ingress.yaml
```

### 2.4 Helm Chart 배포 (선택사항)

```bash
# Helm Chart 생성
helm create prism-chart

# Chart 배포
helm install prism ./prism-chart -n lars-prism

# 업그레이드
helm upgrade prism ./prism-chart -n lars-prism

# 상태 확인
helm status prism -n lars-prism
```

---

## 3️⃣ CI/CD 파이프라인 설정

### 3.1 GitHub Actions 설정

```bash
# 저장소 시크릿 추가
gh secret set DEPLOY_HOST --body "your-server-ip"
gh secret set DEPLOY_USER --body "deploy"
gh secret set SSH_PRIVATE_KEY --body "@~/.ssh/deploy_key"
gh secret set SLACK_WEBHOOK_URL --body "https://hooks.slack.com/..."
```

### 3.2 자동 배포 트리거

```bash
# main 브랜치에 푸시하면 자동으로:
# 1. 테스트 실행
# 2. Docker 이미지 빌드
# 3. 이미지 푸시
# 4. 서버 배포
```

---

## 4️⃣ 모니터링 & 로깅

### 4.1 Prometheus + Grafana

```bash
# Prometheus 접근
http://localhost:9090

# Grafana 접근 (기본 암호: grafana_admin)
http://localhost:3000

# 대시보드 임포트
1. Grafana > Dashboards > Import
2. ID 3662 (Prometheus 2.0 Stats) 입력
3. Prometheus 데이터소스 선택
```

### 4.2 로그 수집 (Loki)

```bash
# Promtail 에이전트가 로그 수집
# Loki > Grafana에서 조회

# 쿼리 예시
{job="backend"} | json
```

### 4.3 애플리케이션 성능 모니터링 (APM)

```bash
# New Relic 설치 (선택사항)
pip install newrelic

# 환경 변수 설정
export NEW_RELIC_CONFIG_FILE=newrelic.ini

# Datadog 설치 (선택사항)
pip install datadog

# 메트릭 전송
from datadog import initialize, api
options = {'api_key': 'YOUR_KEY', 'app_key': 'YOUR_APP_KEY'}
initialize(**options)
```

---

## 5️⃣ 백업 & 복구

### 5.1 데이터베이스 백업

```bash
# PostgreSQL 백업
pg_dump -U prism_user -h localhost lars_prism > backup.sql

# Docker 컨테이너에서
docker-compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U prism_user lars_prism > backup.sql

# S3로 백업 업로드
aws s3 cp backup.sql s3://lars-prism-backups/
```

### 5.2 자동 백업 스케줄링

```bash
# Cron 작업 설정
0 2 * * * /usr/local/bin/backup-db.sh

# backup-db.sh 스크립트
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/db"
mkdir -p $BACKUP_DIR
docker-compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U prism_user lars_prism | gzip > $BACKUP_DIR/backup_$DATE.sql.gz
aws s3 cp $BACKUP_DIR/backup_$DATE.sql.gz s3://lars-prism-backups/
find $BACKUP_DIR -type f -mtime +30 -delete
```

### 5.3 복구

```bash
# 백업에서 복구
gunzip < backup.sql.gz | docker-compose exec -T postgres \
  psql -U prism_user -d lars_prism
```

---

## 6️⃣ 보안 모범 사례

### 6.1 인증 & 권한

```bash
# API 키 관리
export API_KEY=$(openssl rand -hex 32)

# JWT 설정
export JWT_SECRET=$(openssl rand -hex 32)
export JWT_ALGORITHM=HS256
export JWT_EXPIRATION=3600
```

### 6.2 방화벽 규칙

```bash
# AWS 보안 그룹
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxx \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-id sg-xxx \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0
```

### 6.3 환경 변수 관리

```bash
# .env 파일 (절대 커밋하지 말 것)
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=your-secret-key
API_KEY=your-api-key

# Kubernetes Secret으로 관리
kubectl create secret generic prism-secrets \
  --from-file=.env
```

---

## ✅ 체크리스트

### 배포 전
- [ ] 환경 변수 설정 확인
- [ ] 데이터베이스 초기화
- [ ] SSL 인증서 준비
- [ ] 백업 계획 수립
- [ ] 모니터링 설정

### 배포
- [ ] Docker 이미지 빌드 & 테스트
- [ ] Kubernetes 매니페스트 검증
- [ ] 헬스체크 확인
- [ ] 로드 밸런싱 테스트
- [ ] 자동 스케일링 테스트

### 배포 후
- [ ] 모니터링 대시보드 확인
- [ ] 로그 수집 확인
- [ ] 경고 규칙 설정
- [ ] 재해 복구 테스트
- [ ] 성능 벤치마크

---

## 📚 참고 자료

- [Docker 문서](https://docs.docker.com/)
- [Kubernetes 문서](https://kubernetes.io/docs/)
- [AWS EKS 가이드](https://docs.aws.amazon.com/eks/)
- [Let's Encrypt](https://letsencrypt.org/)
- [Prometheus](https://prometheus.io/docs/)
- [Grafana](https://grafana.com/docs/)
