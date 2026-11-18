#!/bin/bash

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ==================== 설정 ====================
AWS_REGION=${AWS_REGION:-us-east-1}
CLUSTER_NAME="lars-prism-cluster"
PROJECT_NAME="lars-prism"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
IMAGE_NAME="${ECR_REGISTRY}/${PROJECT_NAME}:latest"

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  LARS Prism AWS EKS 배포 자동화${NC}"
echo -e "${BLUE}================================================${NC}"

# ==================== 1단계: AWS CLI 확인 ====================
echo -e "\n${YELLOW}Step 1: AWS CLI 확인${NC}"
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI가 설치되지 않았습니다${NC}"
    echo "설치: https://aws.amazon.com/cli/"
    exit 1
fi

echo -e "${GREEN}✅ AWS CLI 설치됨${NC}"
echo "AWS Account ID: $AWS_ACCOUNT_ID"
echo "AWS Region: $AWS_REGION"

# ==================== 2단계: 필수 도구 확인 ====================
echo -e "\n${YELLOW}Step 2: 필수 도구 확인${NC}"

TOOLS=("kubectl" "eksctl" "docker")
for tool in "${TOOLS[@]}"; do
    if ! command -v $tool &> /dev/null; then
        echo -e "${RED}❌ $tool가 설치되지 않았습니다${NC}"
    else
        echo -e "${GREEN}✅ $tool 설치됨${NC}"
    fi
done

# ==================== 3단계: ECR 레지스트리 생성 ====================
echo -e "\n${YELLOW}Step 3: ECR 레지스트리 생성${NC}"

if aws ecr describe-repositories --repository-names ${PROJECT_NAME} --region ${AWS_REGION} &> /dev/null; then
    echo -e "${GREEN}✅ ECR 레지스트리가 이미 존재합니다${NC}"
else
    echo "ECR 레지스트리 생성 중..."
    aws ecr create-repository \
        --repository-name ${PROJECT_NAME} \
        --region ${AWS_REGION}
    echo -e "${GREEN}✅ ECR 레지스트리 생성됨${NC}"
fi

# ==================== 4단계: Docker 이미지 빌드 ====================
echo -e "\n${YELLOW}Step 4: Docker 이미지 빌드${NC}"

echo "이미지 빌드 중: ${IMAGE_NAME}"
docker build -f Dockerfile.prod -t ${IMAGE_NAME} .

echo -e "${GREEN}✅ Docker 이미지 빌드됨${NC}"

# ==================== 5단계: ECR에 이미지 푸시 ====================
echo -e "\n${YELLOW}Step 5: ECR에 이미지 푸시${NC}"

echo "ECR 로그인 중..."
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}

echo "이미지 푸시 중..."
docker push ${IMAGE_NAME}

echo -e "${GREEN}✅ Docker 이미지 ECR에 푸시됨${NC}"

# ==================== 6단계: EKS 클러스터 생성 ====================
echo -e "\n${YELLOW}Step 6: EKS 클러스터 확인/생성${NC}"

if aws eks describe-cluster --name ${CLUSTER_NAME} --region ${AWS_REGION} &> /dev/null; then
    echo -e "${GREEN}✅ EKS 클러스터가 이미 존재합니다${NC}"
else
    echo "EKS 클러스터 생성 중 (약 15분 소요)..."
    eksctl create cluster \
        --name ${CLUSTER_NAME} \
        --region ${AWS_REGION} \
        --nodegroup-name standard-nodes \
        --node-type t3.medium \
        --nodes 3 \
        --nodes-min 2 \
        --nodes-max 10 \
        --managed \
        --with-oidc

    echo -e "${GREEN}✅ EKS 클러스터 생성됨${NC}"
fi

# ==================== 7단계: kubeconfig 업데이트 ====================
echo -e "\n${YELLOW}Step 7: kubeconfig 업데이트${NC}"

aws eks update-kubeconfig \
    --name ${CLUSTER_NAME} \
    --region ${AWS_REGION}

echo -e "${GREEN}✅ kubeconfig 업데이트됨${NC}"

# ==================== 8단계: Kubernetes 매니페스트 배포 ====================
echo -e "\n${YELLOW}Step 8: Kubernetes 매니페스트 배포${NC}"

# ECR 이미지로 매니페스트 업데이트
sed "s|ghcr.io/lars-technologies/lars-prism:latest|${IMAGE_NAME}|g" k8s/deployment.yaml > /tmp/deployment-updated.yaml

echo "매니페스트 배포 중..."
kubectl apply -f /tmp/deployment-updated.yaml

echo -e "${GREEN}✅ Kubernetes 매니페스트 배포됨${NC}"

# ==================== 9단계: 서비스 대기 ====================
echo -e "\n${YELLOW}Step 9: 서비스 준비 확인${NC}"

echo "Pod이 준비될 때까지 대기 중 (최대 5분)..."
kubectl wait --for=condition=ready pod -l app=prism -n lars-prism --timeout=300s 2>/dev/null || true

# ==================== 10단계: 로드 밸런서 IP 확인 ====================
echo -e "\n${YELLOW}Step 10: 로드 밸런서 정보${NC}"

sleep 10

kubectl get service -n lars-prism

# ==================== 최종 정보 ====================
echo -e "\n${BLUE}================================================${NC}"
echo -e "${GREEN}🎉 AWS EKS 배포 완료!${NC}"
echo -e "${BLUE}================================================${NC}"

echo -e "\n${YELLOW}배포된 리소스:${NC}"
echo "- ECR Repository: ${IMAGE_NAME}"
echo "- EKS Cluster: ${CLUSTER_NAME}"
echo "- Region: ${AWS_REGION}"

echo -e "\n${YELLOW}다음 단계:${NC}"
echo "1. Pod 상태 확인:"
echo "   kubectl get pods -n lars-prism"

echo -e "\n2. 로드 밸런서 접속 (외부 IP를 얻을 때까지 대기):"
echo "   kubectl get svc -n lars-prism"

echo -e "\n3. 대시보드 접근:"
echo "   kubectl proxy"
echo "   http://localhost:8001/api/v1/namespaces/lars-prism/services/prism-backend/proxy"

echo -e "\n4. 로그 확인:"
echo "   kubectl logs -f -l app=prism -n lars-prism"

echo -e "\n5. 클린업 (필요시):"
echo "   eksctl delete cluster --name ${CLUSTER_NAME} --region ${AWS_REGION}"

echo -e "\n${BLUE}================================================${NC}"
