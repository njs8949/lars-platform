"""LARS Platform FastAPI 서버.

LARS AI 모델 추론 API를 제공합니다.
"""

import os
import logging
import subprocess
import time
import platform
import urllib.request
import json
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

# Datadog APM 초기화 (선택사항)
try:
    from ddtrace import tracer
    # Datadog 설정 (선택적 - 없어도 작동)
except ImportError:
    pass

from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from src.api.models import router as models_router
from src.core.database import PrismDatabase
from src.core.auth import prism_auth, verify_api_key, audit_logger, check_rate_limit, is_public_endpoint
import time

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 데이터베이스 초기화
try:
    db = PrismDatabase(create_tables=True)
    prism_auth.database = db
    logger.info("✓ DynamoDB 초기화 완료")
except Exception as e:
    logger.warning(f"⚠️  DynamoDB 초기화 실패: {e} (로컬 모드로 실행 중)")
    db = None


def is_ollama_running(host: str = "localhost", port: int = 11434) -> bool:
    """Ollama 서버 실행 여부 확인."""
    try:
        response = urllib.request.urlopen(f"http://{host}:{port}/api/status", timeout=2)
        return response.status == 200
    except Exception:
        return False


def start_ollama_if_needed():
    """필요시 Ollama 서버 자동 시작."""
    if is_ollama_running():
        logger.info("✓ Ollama 서버가 이미 실행 중입니다")
        return True

    logger.info("🚀 Ollama 서버 시작 중...")

    try:
        system = platform.system()

        if system == "Darwin":  # macOS
            # Homebrew로 설치된 Ollama 실행
            subprocess.Popen(
                ["ollama", "serve"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                start_new_session=True,
            )
        elif system == "Linux":
            # Linux에서 Ollama 실행
            subprocess.Popen(
                ["ollama", "serve"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                start_new_session=True,
            )
        elif system == "Windows":
            # Windows에서 Ollama 실행
            subprocess.Popen(
                ["ollama", "serve"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                creationflags=subprocess.CREATE_NEW_PROCESS_GROUP,
            )
        else:
            logger.warning(f"⚠️  지원하지 않는 시스템: {system}")
            return False

        # Ollama 시작 대기 (최대 10초)
        logger.info("⏳ Ollama 초기화 대기 중...")
        for attempt in range(10):
            time.sleep(1)
            if is_ollama_running():
                logger.info("✓ Ollama 서버 시작 완료")
                return True

        logger.warning("⚠️  Ollama 시작 타임아웃")
        return False

    except FileNotFoundError:
        logger.error("❌ Ollama를 찾을 수 없습니다. 설치 후 다시 시도하세요.")
        logger.error("   macOS: brew install ollama")
        logger.error("   또는 https://ollama.ai에서 다운로드")
        return False
    except Exception as e:
        logger.error(f"❌ Ollama 시작 실패: {e}")
        return False


def ensure_models_available():
    """필요한 모델이 설치되어 있는지 확인 및 설치."""
    if not is_ollama_running():
        logger.warning("⚠️  Ollama가 실행 중이 아니어서 모델을 확인할 수 없습니다")
        return

    required_models = [
        "llama3.2:1b",  # LARS-Native
        "qwen2.5:3b",  # LARS-Cosmos
        "phi:1.5b",  # LARS-Realtime
        "mistral:7b-instruct-v0.3",  # LARS-Insight
    ]

    logger.info("📦 모델 설치 상태 확인 중...")

    try:
        response = urllib.request.urlopen("http://localhost:11434/api/tags", timeout=5)
        data = json.loads(response.read().decode())
        installed = [m["name"].split(":")[0] for m in data.get("models", [])]

        missing = []
        for model in required_models:
            model_name = model.split(":")[0]
            if model_name not in installed:
                missing.append(model)

        if missing:
            logger.info(f"⚠️  미설치 모델: {', '.join(missing)}")
            logger.info("📥 모델은 자동으로 처음 사용 시 다운로드됩니다")
            logger.info("   또는 다음 명령어로 미리 설치할 수 있습니다:")
            for model in missing:
                logger.info(f"   ollama pull {model}")
        else:
            logger.info("✓ 모든 필수 모델이 설치되어 있습니다")

    except Exception as e:
        logger.warning(f"⚠️  모델 확인 실패: {e}")

# FastAPI 앱 생성
app = FastAPI(
    title="LARS Platform API",
    description="LARS AI 모델 추론 서비스",
    version="1.0.0"
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 인증 & 감시 미들웨어
@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    """API 인증 & 감시 미들웨어"""
    start_time = time.time()

    # 공개 엔드포인트는 검증 스킵
    if not is_public_endpoint(request.url.path):
        auth_header = request.headers.get("authorization")

        if not auth_header:
            # 마스터 키로 기본값 설정 (개발 모드)
            if os.getenv("PRISM_ENV") == "development":
                auth_header = f"Bearer {prism_auth.master_key}"
            else:
                return JSONResponse(
                    status_code=401,
                    content={"error": "Missing Authorization header"},
                )

    # 요청 처리
    response = await call_next(request)

    # 감시 로깅
    duration_ms = (time.time() - start_time) * 1000
    api_key = prism_auth.extract_api_key(request.headers.get("authorization"))

    await audit_logger.log_request(
        method=request.method,
        path=request.url.path,
        api_key=api_key,
        status_code=response.status_code,
        duration_ms=duration_ms,
    )

    return response

# 라우터 등록
app.include_router(models_router)

# 인증 라우터 등록 (우선)
try:
    from src.api.auth_routes import router as auth_router
    app.include_router(auth_router)
    logger.info("✓ 인증 라우터 등록됨")
except Exception as e:
    logger.warning(f"⚠️  인증 라우터 로드 실패: {e}")

# 구독 라우터 등록
try:
    from src.api.subscription_routes import router as subscription_router
    app.include_router(subscription_router)
    logger.info("✓ 구독 라우터 등록됨")
except Exception as e:
    logger.warning(f"⚠️  구독 라우터 로드 실패: {e}")

# AI 생성 라우터 등록 (문서, 프리젠테이션, 코드 분석)
try:
    from src.api.ai_routes import router as ai_router
    app.include_router(ai_router)
    logger.info("✓ AI 생성 라우터 등록됨 (문서, 프리젠테이션, 코드 분석)")
except Exception as e:
    logger.warning(f"⚠️  AI 생성 라우터 로드 실패: {e}")

# 통합 지능형 생성 라우터 등록 (프론티어 AI 방식)
try:
    from src.api.generation_routes import router as generation_router
    app.include_router(generation_router)
    logger.info("✓ 지능형 생성 라우터 등록됨 (자동 타입 감지, 스트리밍)")
except Exception as e:
    logger.warning(f"⚠️  지능형 생성 라우터 로드 실패: {e}")

# Amazon Q 통합 라우터 등록
try:
    from src.api.amazon_q_routes import router as amazon_q_router
    app.include_router(amazon_q_router)
    logger.info("✓ Amazon Q 통합 라우터 등록됨")
except Exception as e:
    logger.warning(f"⚠️  Amazon Q 라우터 로드 실패: {e}")

# 분석 알고리즘 라우터 등록 (Phase 2)
try:
    from src.api.analysis_routes import router as analysis_router
    app.include_router(analysis_router)
    logger.info("✓ 분석 알고리즘 라우터 등록됨 (MultiModal, Anomaly Detection)")
except Exception as e:
    logger.warning(f"⚠️  분석 알고리즘 라우터 로드 실패: {e}")

# 오케스트레이션 라우터 등록 (Phase 3)
try:
    from src.api.orchestration_routes import router as orchestration_router
    app.include_router(orchestration_router)
    logger.info("✓ 오케스트레이션 라우터 등록됨 (Predictive, Comparative)")
except Exception as e:
    logger.warning(f"⚠️  오케스트레이션 라우터 로드 실패: {e}")

# Claude 분류 라우터 등록
try:
    from src.api.claude_classifier import router as classifier_router
    app.include_router(classifier_router)
    logger.info("✓ Claude Classifier 라우터 등록됨")
except Exception as e:
    logger.warning(f"⚠️  Claude Classifier 라우터 로드 실패: {e}")

# Supply Chain 보안 라우터 등록
try:
    from src.api.supply_chain import router as supply_chain_router
    app.include_router(supply_chain_router)
    logger.info("✓ Supply Chain 보안 라우터 등록됨")
except Exception as e:
    logger.warning(f"⚠️  Supply Chain 라우터 로드 실패: {e}")

# NVIDIA 모델 통합 라우터 등록
try:
    from src.api.nvidia_models_routes import router as nvidia_router
    app.include_router(nvidia_router)
    logger.info("✓ NVIDIA 모델 통합 라우터 등록됨 (DeepSeek, Nemetron, Mistral, GLM)")
except Exception as e:
    logger.warning(f"⚠️  NVIDIA 모델 라우터 로드 실패: {e}")

# NVIDIA Skills 라우터 등록
try:
    from src.api.nvidia_skills_routes import router as nvidia_skills_router
    app.include_router(nvidia_skills_router)
    logger.info("✓ NVIDIA Skills 라우터 등록됨 (RAG-Eval, RAG-Perf, Nemo-Retriever)")
except Exception as e:
    logger.warning(f"⚠️  NVIDIA Skills 라우터 로드 실패: {e}")


@app.on_event("startup")
async def startup_event():
    """서버 시작 이벤트 - Ollama 자동 시작."""
    logger.info("🚀 LARS Platform 서버 시작...")

    # Ollama 시작
    if not start_ollama_if_needed():
        logger.warning("⚠️  Ollama 자동 시작 실패. 수동으로 실행하세요: ollama serve")

    # 모델 확인
    ensure_models_available()

    logger.info("✓ LARS Platform 준비 완료")


@app.get("/")
async def root():
    """루트 엔드포인트."""
    return {
        "message": "LARS Platform API",
        "version": "1.0.0",
        "endpoints": {
            "models": "/api/models/list",
            "infer": "/api/models/infer",
            "infer_stream": "/api/models/infer-stream",
            "health": "/api/models/health"
        }
    }


@app.get("/health")
async def health():
    """서버 헬스 체크."""
    return {"status": "healthy"}


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """전역 예외 핸들러."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("LARS_API_PORT", "8000"))
    host = os.getenv("LARS_API_HOST", "0.0.0.0")

    logger.info(f"Starting LARS Platform API on {host}:{port}")

    uvicorn.run(
        app,
        host=host,
        port=port,
        log_level="info"
    )
