"""LARS Platform FastAPI 서버.

LARS AI 모델 추론 API를 제공합니다.
"""

import asyncio
import os
import logging
import secrets
import subprocess
import time
import platform
import urllib.request
import json
import re
import uuid
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

# Datadog APM 초기화
try:
    import ddtrace
    ddtrace.patch_all()
    # 환경 변수로부터 자동 설정됨
except ImportError:
    pass

from fastapi import FastAPI, Request, Depends, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse, HTMLResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from src.core import usage_ledger
from sqlalchemy.orm import Session
import httpx
import requests
from anthropic import Anthropic
from src.core.llm_provider import is_production, bedrock_complete, bedrock_stream_tools, bedrock_model_name, BedrockClient

try:
    from src.core.energy_optimizer import energy_optimizer
except (ModuleNotFoundError, ImportError):
    energy_optimizer = None

try:
    from src.core.prism_statistics_layer import prism_statistics_layer
except (ModuleNotFoundError, ImportError):
    prism_statistics_layer = None

try:
    from src.core.auto_analyzer import auto_analyzer
except (ModuleNotFoundError, ImportError):
    auto_analyzer = None

# 선택적 라우터 import
try:
    from src.api.models import router as models_router
except (ModuleNotFoundError, ImportError):
    models_router = None

try:
    from src.core.database import PrismDatabase
except (ModuleNotFoundError, ImportError):
    PrismDatabase = None

try:
    from src.core.auth import prism_auth, verify_api_key, audit_logger, check_rate_limit, is_public_endpoint
except (ModuleNotFoundError, ImportError):
    prism_auth = None
    verify_api_key = None
    audit_logger = None
    check_rate_limit = None
    is_public_endpoint = None

import time

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 데이터베이스 초기화
try:
    if PrismDatabase is not None:
        db = PrismDatabase(create_tables=True)
        if prism_auth is not None:
            prism_auth.database = db
        logger.info("✓ DynamoDB 초기화 완료")
    else:
        db = None
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

    # 공개 엔드포인트는 검증 스킵 (auth 모듈이 있는 경우)
    if is_public_endpoint is not None and prism_auth is not None:
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

    # 감시 로깅 (audit_logger가 있는 경우)
    if audit_logger is not None and prism_auth is not None:
        duration_ms = (time.time() - start_time) * 1000
        api_key = prism_auth.extract_api_key(request.headers.get("authorization"))

        try:
            await audit_logger.log_request(
                method=request.method,
                path=request.url.path,
                api_key=api_key,
                status_code=response.status_code,
                duration_ms=duration_ms,
            )
        except Exception as e:
            logger.warning(f"감시 로깅 실패: {e}")

    return response

# 라우터 등록
if models_router is not None:
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

# 채팅 입력창 기능 라우터 (첨부 파일, 모드별 실행)
try:
    from src.api.chat_tools_routes import router as chat_tools_router
    app.include_router(chat_tools_router)
    from src.api.deck_routes import router as deck_router
    app.include_router(deck_router)
    from src.api.project_routes import router as project_router
    app.include_router(project_router)
    from src.api.warehouse_routes import router as warehouse_router
    app.include_router(warehouse_router)
    logger.info("✓ 채팅 기능 라우터 등록됨")
except Exception as e:
    logger.warning(f"⚠️  채팅 기능 라우터 로드 실패: {e}")

# 워크플로 최적화 라우터 (실행 순서, 임계 경로, 병목 분석)
try:
    from src.api.workflow_routes import router as workflow_router
    app.include_router(workflow_router)
    logger.info("✓ 워크플로 최적화 라우터 등록됨")
except Exception as e:
    logger.warning(f"⚠️  워크플로 최적화 라우터 로드 실패: {e}")

# 화면 기능 라우터: 프로필, 파일 내보내기, 템플릿 일괄 다운로드, 배포 상태
try:
    from src.api.feature_routes import router as feature_router
    app.include_router(feature_router)
    logger.info("✓ 화면 기능 라우터 등록됨 (프로필, 내보내기, 일괄 다운로드, 배포 상태)")
except Exception as e:
    logger.warning(f"⚠️  화면 기능 라우터 로드 실패: {e}")

# 통합 지능형 생성 라우터 등록 (프론티어 AI 방식)
try:
    from src.api.generation_routes import router as generation_router
    app.include_router(generation_router)
    logger.info("✓ 지능형 생성 라우터 등록됨 (자동 타입 감지, 스트리밍)")
except Exception as e:
    logger.warning(f"⚠️  지능형 생성 라우터 로드 실패: {e}")

# Amazon Q 통합 라우터 등록

# ===== NEW: Template 디자인 시스템 라우터 등록 =====
try:
    from src.api.template_routes import router as template_router
    app.include_router(template_router)
    logger.info("✓ Template 디자인 시스템 라우터 등록됨 (AI 추천, 커스터마이징, 생성)")
except Exception as e:
    logger.warning(f"⚠️  Template 라우터 로드 실패: {e}")

# 분석 알고리즘 라우터 등록 (Phase 2)

# 오케스트레이션 라우터 등록 (Phase 3)
try:
    from src.api.orchestration_routes import router as orchestration_router
    app.include_router(orchestration_router)
    logger.info("✓ 오케스트레이션 라우터 등록됨 (Predictive, Comparative)")
except Exception as e:
    logger.warning(f"⚠️  오케스트레이션 라우터 로드 실패: {e}")

# Claude 분류 라우터 등록

# 파일 내보내기 라우터 등록 (웹사이트, 프레젠테이션, 문서)
try:
    from src.api.export_routes import router as export_router
    app.include_router(export_router)
    logger.info("✓ 파일 내보내기 라우터 등록됨")
except Exception as e:
    logger.warning(f"⚠️  파일 내보내기 라우터 로드 실패: {e}")

# Universal Artifact 생성 라우터 등록 (Kimi-style 아키텍처)
try:
    from src.api.artifact_routes import router as artifact_router
    app.include_router(artifact_router)
    logger.info("✓ Universal Artifact 생성 라우터 등록됨 (IR 기반 다중 포맷 생성)")
except Exception as e:
    logger.warning(f"⚠️  Artifact 라우터 로드 실패: {e}")

# Supply Chain 보안 라우터 등록

# NVIDIA 모델 통합 라우터 등록

# NVIDIA Skills 라우터 등록

# Template Generation 라우터 등록 (PowerPoint/Word 문서 생성)
try:
    from src.api.template_routes import router as template_router
    app.include_router(template_router)
    logger.info("✓ Template 생성 라우터 등록됨 (PowerPoint, Word 동적 생성)")
except Exception as e:
    logger.warning(f"⚠️  Template 라우터 로드 실패: {e}")

# ===== Phase 1: 고급 데이터 엔진 통합 =====

# 웹 스크래핑 라우터 등록 (Scrapling 기반)
try:
    from src.api.scraping_routes import router as scraping_router
    app.include_router(scraping_router)
    logger.info("✓ 웹 스크래핑 라우터 등록됨 (Scrapling 기반 데이터 수집)")
except Exception as e:
    logger.warning(f"⚠️  웹 스크래핑 라우터 로드 실패: {e}")

# OCR 및 문서 인식 라우터 등록 (PaddleOCR 기반)
try:
    from src.api.ocr_routes import router as ocr_router
    app.include_router(ocr_router)
    logger.info("✓ OCR 문서 인식 라우터 등록됨 (PaddleOCR 기반 문서 처리)")
except Exception as e:
    logger.warning(f"⚠️  OCR 라우터 로드 실패: {e}")

# 변경 감지 라우터 등록 (changedetection.io 기반)
try:
    from src.api.change_detection_routes import router as change_detection_router
    app.include_router(change_detection_router)
    logger.info("✓ 변경 감지 라우터 등록됨 (changedetection.io 기반 실시간 모니터링)")
except Exception as e:
    logger.warning(f"⚠️  변경 감지 라우터 로드 실패: {e}")

# 통합 데이터 엔진 대시보드 등록
try:
    from src.api.integration_dashboard_routes import router as integration_router
    app.include_router(integration_router)
    logger.info("✓ 통합 데이터 엔진 대시보드 등록됨 (모든 Phase 1 기능 통합 관리)")
except Exception as e:
    logger.warning(f"⚠️  통합 대시보드 로드 실패: {e}")

# ===== Phase 2: 외부 데이터 소스 통합 =====

# SEO 분석 라우터 등록 (OpenSEO 기반)
try:
    from src.api.seo_routes import router as seo_router
    app.include_router(seo_router)
    logger.info("✓ SEO 분석 라우터 등록됨 (OpenSEO 기반 검색 최적화)")
except Exception as e:
    logger.warning(f"⚠️  SEO 라우터 로드 실패: {e}")

# CRM 시스템 라우터 등록 (에이전트 기반)
try:
    from src.api.crm_routes import router as crm_router
    app.include_router(crm_router)
    logger.info("✓ CRM 시스템 라우터 등록됨 (에이전트 기반 고객 관계 관리)")
except Exception as e:
    logger.warning(f"⚠️  CRM 라우터 로드 실패: {e}")

# ===== Phase 3: 출력 및 생성 =====

# 프레젠테이션/테마 관리 라우터 등록 (DB 기반)
try:
    from src.api.presentations_routes import router as presentations_router
    app.include_router(presentations_router)
    logger.info("✓ 프레젠테이션/테마 관리 라우터 등록됨 (DB 기반 데이터 저장)")
except Exception as e:
    logger.warning(f"⚠️  프레젠테이션 라우터 로드 실패: {e}")

# 웹 스크래핑 대시보드 라우터 등록 (DB 기반)
try:
    from src.api.scraping_dashboard_routes import router as scraping_dashboard_router
    app.include_router(scraping_dashboard_router)
    logger.info("✓ 웹 스크래핑 대시보드 라우터 등록됨 (DB 기반)")
except Exception as e:
    logger.warning(f"⚠️  웹 스크래핑 라우터 로드 실패: {e}")

# OCR 대시보드 라우터 등록 (DB 기반)
try:
    from src.api.ocr_dashboard_routes import router as ocr_dashboard_router
    app.include_router(ocr_dashboard_router)
    logger.info("✓ OCR 대시보드 라우터 등록됨 (DB 기반)")
except Exception as e:
    logger.warning(f"⚠️  OCR 라우터 로드 실패: {e}")

# CRM 대시보드 라우터 등록 (DB 기반)
try:
    from src.api.crm_dashboard_routes import router as crm_dashboard_router
    app.include_router(crm_dashboard_router)
    logger.info("✓ CRM 대시보드 라우터 등록됨 (DB 기반)")
except Exception as e:
    logger.warning(f"⚠️  CRM 라우터 로드 실패: {e}")

# 데이터 내보내기 라우터 등록
try:
    from src.api.export_api import router as export_router
    app.include_router(export_router)
    logger.info("✓ 데이터 내보내기 라우터 등록됨 (CSV, JSON)")
except Exception as e:
    logger.warning(f"⚠️  내보내기 라우터 로드 실패: {e}")

# PPT 자동 생성 라우터 등록 (ppt-master 기반)
try:
    from src.api.ppt_generation_routes import router as ppt_router
    app.include_router(ppt_router)
    logger.info("✓ PPT 자동 생성 라우터 등록됨 (ppt-master 기반 프리젠테이션 생성)")
except Exception as e:
    logger.warning(f"⚠️  PPT 생성 라우터 로드 실패: {e}")

# 고급 통합 워크플로우 라우터 등록
try:
    from src.api.advanced_workflows_routes import router as advanced_workflows_router
    app.include_router(advanced_workflows_router)
    logger.info("✓ 고급 통합 워크플로우 라우터 등록됨 (모든 Phase 통합 엔드-투-엔드 자동화)")
except Exception as e:
    logger.warning(f"⚠️  고급 워크플로우 라우터 로드 실패: {e}")

# 기타 대시보드 라우터 등록 (SEO, 워크플로우, 통합)
try:
    from src.api.misc_dashboard_routes import router as misc_router
    app.include_router(misc_router)
    logger.info("✓ 기타 대시보드 라우터 등록됨 (SEO 키워드, 워크플로우, 통합)")
except Exception as e:
    logger.warning(f"⚠️  기타 대시보드 라우터 로드 실패: {e}")

# 📌 AI 디자인 - 브랜딩 가이드 자동 생성
try:
    from src.api.branding_routes import router as branding_router
    app.include_router(branding_router)
    logger.info("✓ 브랜딩 가이드 라우터 등록됨")
except Exception as e:
    logger.warning(f"⚠️  브랜딩 가이드 라우터 로드 실패: {e}")

# 📌 AI 디자인 - 색상/폰트 추천
try:
    from src.api.color_font_routes import router as color_font_router
    app.include_router(color_font_router)
    logger.info("✓ 색상/폰트 추천 라우터 등록됨")
except Exception as e:
    logger.warning(f"⚠️  색상/폰트 추천 라우터 로드 실패: {e}")

# 📌 AI 디자인 - 크로스 플랫폼 동시 생성
try:
    from src.api.cross_platform_routes import router as cross_platform_router
    app.include_router(cross_platform_router)
    logger.info("✓ 크로스 플랫폼 라우터 등록됨")
except Exception as e:
    logger.warning(f"⚠️  크로스 플랫폼 라우터 로드 실패: {e}")

# 📌 고급 AI 디자인 기능 - 통합 구현
try:
    from src.api.advanced_design_routes import router as advanced_design_router
    app.include_router(advanced_design_router)
    logger.info("✓ 고급 AI 디자인 라우터 등록됨 (성능최적화, 음성, 버전관리, 다국어, 협업, 레이아웃, AR/VR)")
except Exception as e:
    logger.warning(f"⚠️  고급 AI 디자인 라우터 로드 실패: {e}")

# AI 어시스턴트 채팅 라우터는 이미 app.py에 직접 정의됨 (하단 참고)
# 이전 라우터 파일은 더 이상 사용되지 않음


@app.on_event("startup")
async def startup_event():
    """서버 시작 이벤트 - Ollama 자동 시작."""
    logger.info("🚀 LARS Platform 서버 시작...")

    # 데이터베이스 초기화
    try:
        from src.core.db import init_db, seed_initial_data
        init_db()
        seed_initial_data()
        logger.info("✓ 데이터베이스 초기화 완료")
    except Exception as e:
        logger.warning(f"⚠️  데이터베이스 초기화 실패: {e}")

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
@app.get("/api/health")
async def health():
    """서버 헬스 체크."""
    return {"status": "healthy"}


@app.post("/api/agent/query")
async def agent_query(request: Request):
    """LARS AI 모델을 통한 채팅 API. 자동 분석 및 생산성 도구 통합."""
    try:
        data = await request.json()
        query = data.get("query", "")
        enhanced_query = data.get("enhanced_query", query)
        model_name = data.get("model", "LARS-Native")
        conversation_history = data.get("history", [])

        logger.info(f"[CHAT] 질문 수신: {query[:50]}...")
        logger.info(f"[CHAT] 사용 모델: {model_name}")

        # ========== 자동 분석 감지 ==========
        auto_analysis_type = None
        auto_productivity_type = None

        if auto_analyzer:
            auto_analysis_type = auto_analyzer.detect_analysis_request(query)
            auto_productivity_type = auto_analyzer.detect_productivity_request(query)

            if auto_analysis_type:
                logger.info(f"[AUTO-ANALYZE] 자동 분석 감지: {auto_analysis_type}")
                extracted_data = auto_analyzer.extract_data_from_context(conversation_history)
                analysis_prompt = auto_analyzer.generate_analysis_prompt(auto_analysis_type, extracted_data)
                enhanced_query = analysis_prompt
                logger.info(f"[AUTO-ANALYZE] 프롬프트 강화 완료 (분석: {auto_analysis_type})")

            elif auto_productivity_type:
                logger.info(f"[AUTO-PRODUCTIVITY] 자동 생산성 도구 감지: {auto_productivity_type}")
                productivity_prompt = auto_analyzer.generate_productivity_prompt(auto_productivity_type, query)
                enhanced_query = productivity_prompt
                logger.info(f"[AUTO-PRODUCTIVITY] 프롬프트 강화 완료 (도구: {auto_productivity_type})")

        # 모델명 매핑
        model_mapping = {
            "LARS-Native": "lars-native:latest",
            "LARS-Prism": "lars-prism-tuned:latest",
            "LARS-Prime": "lars-prime:latest",
            "LARS-Cosmos": "lars-cosmos:latest",
            "Mistral": "mistral:7b",
            "Llama2": "llama2:7b"
        }

        ollama_model = model_mapping.get(model_name, "lars-native:latest")
        logger.info(f"[CHAT] Ollama 모델: {ollama_model}")

        # Ollama를 통한 응답 생성
        try:
            import urllib.request
            import json as json_lib

            ollama_url = "http://localhost:11434/api/generate"

            system_prompt = """당신은 유용한 한국어 AI 어시스턴트입니다. 사용자의 질문에 한국어로 명확하고 친절하게 답변해주세요."""

            full_prompt = f"""{system_prompt}

사용자 질문: {enhanced_query}

답변:"""

            if is_production():
                ai_response = bedrock_complete([{"role": "user", "content": full_prompt}], 500)[0].strip()
                return {
                    "response": ai_response, "query": query, "model": model_name, "ollama_model": "bedrock",
                    "success": True, "auto_analysis": auto_analysis_type, "auto_productivity": auto_productivity_type,
                }

            ollama_request = {
                "model": ollama_model,
                "prompt": full_prompt,
                "stream": False,
                "temperature": 0.7,
                "num_predict": 500
            }

            logger.info(f"[CHAT] Ollama 요청 전송: {ollama_model}")

            req = urllib.request.Request(
                ollama_url,
                data=json_lib.dumps(ollama_request).encode('utf-8'),
                headers={'Content-Type': 'application/json'}
            )

            with urllib.request.urlopen(req, timeout=120) as response:
                result = json_lib.loads(response.read().decode('utf-8'))
                ai_response = result.get('response', '응답을 생성하지 못했습니다.')

                logger.info(f"[CHAT] ✅ 응답 생성 완료 ({len(ai_response)} 글자)")

                return {
                    "response": ai_response,
                    "query": query,
                    "model": model_name,
                    "ollama_model": ollama_model,
                    "success": True,
                    "auto_analysis": auto_analysis_type,
                    "auto_productivity": auto_productivity_type
                }
        except urllib.error.URLError as url_err:
            logger.error(f"[CHAT] Ollama 연결 오류: {url_err}")
            return {
                "response": f"❌ Ollama 서버 연결 실패\n\n해결 방법:\n1. 터미널에서 'ollama serve' 실행\n2. 모델 다운로드: 'ollama pull lars-native'",
                "query": query,
                "model": model_name,
                "success": False
            }
        except Exception as ollama_err:
            logger.error(f"[CHAT] Ollama 오류: {ollama_err}")
            return {
                "response": f"⚠️ 응답 생성 실패: {str(ollama_err)}",
                "query": query,
                "model": model_name,
                "success": False
            }
    except Exception as e:
        logger.error(f"[CHAT] 오류: {e}", exc_info=True)
        return {
            "response": f"❌ 오류 발생: {str(e)}",
            "success": False
        }


def is_package_installed(package_name: str) -> bool:
    """패키지 설치 여부 확인."""
    try:
        __import__(package_name)
        return True
    except ImportError:
        return False


def check_openai_installed() -> bool:
    """OpenAI 클라이언트 라이브러리 설치 확인."""
    try:
        import openai
        logger.info("✅ OpenAI 클라이언트 라이브러리 감지됨")
        return True
    except ImportError:
        return False


def check_anthropic_installed() -> bool:
    """Anthropic 클라이언트 라이브러리 설치 확인."""
    try:
        import anthropic
        logger.info("✅ Anthropic 클라이언트 라이브러리 감지됨")
        return True
    except ImportError:
        return False


def check_google_installed() -> bool:
    """Google Generative AI 라이브러리 설치 확인."""
    try:
        import google.generativeai
        logger.info("✅ Google Generative AI 라이브러리 감지됨")
        return True
    except ImportError:
        return False


def check_moonshot_installed() -> bool:
    """Moonshot/Kimi 클라이언트 라이브러리 설치 확인."""
    try:
        # Moonshot Python SDK 확인
        import openai as moonshot_openai
        logger.info("✅ Moonshot/Kimi 클라이언트 라이브러리 감지됨")
        return True
    except ImportError:
        return False


@app.get("/api/agent/detect")
async def detect_agents():
    """시스템에 설치된 에이전트 라이브러리 감지."""
    try:
        detected = {}

        # 1. OpenAI 클라이언트 라이브러리 확인
        detected["GPT-4"] = check_openai_installed()

        # 2. Anthropic 클라이언트 라이브러리 확인
        detected["Claude-3"] = check_anthropic_installed()

        # 3. Google Generative AI 라이브러리 확인
        detected["Gemini"] = check_google_installed()

        # 4. Moonshot/Kimi 클라이언트 라이브러리 확인
        detected["Kimi"] = check_moonshot_installed()

        logger.info(f"[DETECT] 감지된 에이전트 라이브러리: {detected}")

        return {
            "detected_agents": detected,
            "success": True
        }
    except Exception as e:
        logger.error(f"[DETECT] 에이전트 감지 오류: {e}")
        return {
            "detected_agents": {
                "GPT-4": False,
                "Claude-3": False,
                "Gemini": False,
                "Kimi": False
            },
            "success": False,
            "error": str(e)
        }






@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """전역 예외 핸들러."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )






@app.post("/api/energy/analyze-request")
async def analyze_request_energy(request: Request):
    """요청의 복잡도를 분석하고 최적 모델 추천"""
    if not energy_optimizer:
        return {
            "success": False,
            "error": "에너지 최적화 시스템이 로드되지 않았습니다"
        }

    try:
        data = await request.json()
        user_request = data.get("request", "")

        if not user_request:
            return {
                "success": False,
                "error": "요청 내용이 필요합니다"
            }

        # 복잡도 분석
        complexity = energy_optimizer.analyze_request_complexity(user_request)
        model_recommendation = energy_optimizer.get_optimal_model_for_complexity(complexity)

        logger.info(f"[ENERGY] 요청 분석: {complexity.name} → {model_recommendation['model']}")

        return {
            "success": True,
            "analysis": {
                "request_length": len(user_request),
                "complexity": complexity.name,
                "complexity_level": complexity.value
            },
            "recommendation": model_recommendation,
            "power_savings": {
                "estimated_power": f"{model_recommendation['power_estimate']}W",
                "estimated_cost": f"약 {model_recommendation['power_estimate'] * 0.0001:.4f}원",
                "vs_max_power": f"최고 성능 모델 대비 {(100 - model_recommendation['power_estimate']):.0f}% 절감"
            }
        }

    except Exception as e:
        logger.error(f"[ENERGY] 요청 분석 오류: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }


@app.post("/api/energy/estimate-workflow")
async def estimate_workflow_energy(request: Request):
    """워크플로우 전체 전력 소비 예측"""
    if not energy_optimizer:
        return {
            "success": False,
            "error": "에너지 최적화 시스템이 로드되지 않았습니다"
        }

    try:
        data = await request.json()
        stages = data.get("stages", ["analysis", "planning", "execution", "integration"])

        # 워크플로우 전력 소비 예측
        power_estimate = energy_optimizer.estimate_workflow_power(stages)

        # 최적화 팁
        optimization_tips = energy_optimizer.get_energy_optimization_tips()

        logger.info(f"[ENERGY] 워크플로우 전력 예측: {power_estimate['total_estimated_power']}W")

        return {
            "success": True,
            "workflow": {
                "stages": stages,
                "stage_count": len(stages)
            },
            "power_estimate": power_estimate,
            "monthly_estimate": {
                "power": f"{power_estimate['total_estimated_power'] * 24 * 30}Wh",
                "cost": f"약 {(power_estimate['total_estimated_power'] * 24 * 30 * 0.0001):.2f}원"
            },
            "optimization_tips": optimization_tips,
            "note": "GPU 사용률과 실제 조건에 따라 달라질 수 있습니다"
        }

    except Exception as e:
        logger.error(f"[ENERGY] 워크플로우 예측 오류: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }


@app.get("/api/energy/optimization-tips")
async def get_energy_tips():
    """에너지 절감 최적화 팁"""
    if not energy_optimizer:
        return {
            "success": False,
            "error": "에너지 최적화 시스템이 로드되지 않았습니다"
        }

    try:
        tips = energy_optimizer.get_energy_optimization_tips()
        report = energy_optimizer.generate_energy_report()

        return {
            "success": True,
            "optimization_tips": tips,
            "energy_report": report,
            "model_power_comparison": {
                "LARS-Native": "30W (가장 효율적)",
                "LARS-Prism": "50W (균형)",
                "LARS-Cosmos": "80W (다목적)",
                "LARS-Prime": "100W (최고 성능)",
                "Mistral 7B": "40W (효율적)",
                "Llama2 7B": "50W (안정적)",
                "Neural-Chat": "40W (대화 최적화)",
                "Dolphin": "65W (추론 특화)"
            },
            "recommendation": {
                "daily_heavy_tasks": "하루 중 한 번에 몰아서 처리 (GPU 온난화 감소)",
                "time_based_optimization": "야간(전기료 싼 시간)에 대량 작업 실행",
                "cache_strategy": "유사 요청은 캐시 사용 (99% 전력 절감)",
                "batch_processing": "여러 작업을 한 번에 처리로 효율 증대"
            }
        }

    except Exception as e:
        logger.error(f"[ENERGY] 최적화 팁 조회 오류: {e}")
        return {
            "success": False,
            "error": str(e)
        }












@app.post("/api/prism/statistics/descriptive")
async def descriptive_statistics(request: Request):
    """Prism 3계층: 기술통계 분석"""
    if not prism_statistics_layer:
        return {"success": False, "error": "통계 레이어가 로드되지 않았습니다"}

    try:
        data = await request.json()
        data_points = data.get("data", [])

        if not data_points:
            return {"success": False, "error": "데이터가 필요합니다"}

        logger.info(f"[PRISM-STATS] 기술통계 분석: {len(data_points)}개 데이터")

        result = prism_statistics_layer.descriptive_statistics(data_points)

        return {
            "success": True,
            "analysis": "descriptive_statistics",
            "data_points": len(data_points),
            "results": result
        }

    except Exception as e:
        logger.error(f"[PRISM-STATS] 기술통계 오류: {e}")
        return {"success": False, "error": str(e)}


@app.post("/api/prism/statistics/correlation")
async def correlation_analysis(request: Request):
    """Prism 3계층: 상관분석"""
    if not prism_statistics_layer:
        return {"success": False, "error": "통계 레이어가 로드되지 않았습니다"}

    try:
        data = await request.json()
        variables = data.get("variables", {})

        if not variables:
            return {"success": False, "error": "변수가 필요합니다"}

        result = prism_statistics_layer.correlation_analysis(variables)

        return {
            "success": True,
            "analysis": "correlation_analysis",
            "variables": len(variables),
            "results": result
        }

    except Exception as e:
        logger.error(f"[PRISM-STATS] 상관분석 오류: {e}")
        return {"success": False, "error": str(e)}


@app.post("/api/prism/statistics/regression")
async def linear_regression(request: Request):
    """Prism 3계층: 선형회귀 분석"""
    if not prism_statistics_layer:
        return {"success": False, "error": "통계 레이어가 로드되지 않았습니다"}

    try:
        data = await request.json()
        x = data.get("x", [])
        y = data.get("y", [])

        if not x or not y or len(x) != len(y):
            return {"success": False, "error": "동일한 길이의 x, y 데이터 필요"}

        result = prism_statistics_layer.linear_regression(x, y)

        return {
            "success": True,
            "analysis": "linear_regression",
            "data_points": len(x),
            "results": result
        }

    except Exception as e:
        logger.error(f"[PRISM-STATS] 선형회귀 오류: {e}")
        return {"success": False, "error": str(e)}


@app.post("/api/prism/statistics/timeseries")
async def timeseries_analysis(request: Request):
    """Prism 3계층: 시계열 분석"""
    if not prism_statistics_layer:
        return {"success": False, "error": "통계 레이어가 로드되지 않았습니다"}

    try:
        data = await request.json()
        data_points = data.get("data", [])

        if not data_points:
            return {"success": False, "error": "데이터가 필요합니다"}

        result = prism_statistics_layer.timeseries_analysis(data_points)

        return {
            "success": True,
            "analysis": "timeseries_analysis",
            "data_points": len(data_points),
            "results": result
        }

    except Exception as e:
        logger.error(f"[PRISM-STATS] 시계열 분석 오류: {e}")
        return {"success": False, "error": str(e)}


@app.post("/api/prism/statistics/forecast")
async def forecast(request: Request):
    """Prism 3계층: 시계열 예측"""
    if not prism_statistics_layer:
        return {"success": False, "error": "통계 레이어가 로드되지 않았습니다"}

    try:
        data = await request.json()
        data_points = data.get("data", [])
        periods = data.get("periods", 5)
        method = data.get("method", "exponential")

        if not data_points:
            return {"success": False, "error": "데이터가 필요합니다"}

        result = prism_statistics_layer.forecast(data_points, periods, method)

        return {
            "success": True,
            "analysis": "forecast",
            "forecast_periods": periods,
            "method": method,
            "results": result
        }

    except Exception as e:
        logger.error(f"[PRISM-STATS] 예측 오류: {e}")
        return {"success": False, "error": str(e)}


@app.post("/api/prism/statistics/anomaly-detection")
async def anomaly_detection(request: Request):
    """Prism 3계층: 이상탐지"""
    if not prism_statistics_layer:
        return {"success": False, "error": "통계 레이어가 로드되지 않았습니다"}

    try:
        data = await request.json()
        data_points = data.get("data", [])
        method = data.get("method", "zscore")
        threshold = data.get("threshold", 3.0)

        if not data_points:
            return {"success": False, "error": "데이터가 필요합니다"}

        result = prism_statistics_layer.anomaly_detection(data_points, method, threshold)

        return {
            "success": True,
            "analysis": "anomaly_detection",
            "method": method,
            "data_points": len(data_points),
            "results": result
        }

    except Exception as e:
        logger.error(f"[PRISM-STATS] 이상탐지 오류: {e}")
        return {"success": False, "error": str(e)}


@app.post("/api/prism/statistics/clustering")
async def clustering(request: Request):
    """Prism 3계층: 클러스터링"""
    if not prism_statistics_layer:
        return {"success": False, "error": "통계 레이어가 로드되지 않았습니다"}

    try:
        data = await request.json()
        data_points = data.get("data", [])
        n_clusters = data.get("n_clusters", 3)
        method = data.get("method", "kmeans")

        if not data_points:
            return {"success": False, "error": "데이터가 필요합니다"}

        result = prism_statistics_layer.clustering_analysis(data_points, n_clusters, method)

        return {
            "success": True,
            "analysis": "clustering",
            "n_clusters": n_clusters,
            "method": method,
            "results": result
        }

    except Exception as e:
        logger.error(f"[PRISM-STATS] 클러스터링 오류: {e}")
        return {"success": False, "error": str(e)}


@app.post("/api/prism/statistics/hypothesis-test")
async def hypothesis_test(request: Request):
    """Prism 3계층: 가설검정"""
    if not prism_statistics_layer:
        return {"success": False, "error": "통계 레이어가 로드되지 않았습니다"}

    try:
        data = await request.json()
        group1 = data.get("group1", [])
        group2 = data.get("group2", [])
        test_type = data.get("test_type", "t_test")

        if not group1 or not group2:
            return {"success": False, "error": "두 그룹의 데이터가 필요합니다"}

        result = prism_statistics_layer.hypothesis_test(group1, group2, test_type)

        return {
            "success": True,
            "analysis": "hypothesis_test",
            "test_type": test_type,
            "group_sizes": (len(group1), len(group2)),
            "results": result
        }

    except Exception as e:
        logger.error(f"[PRISM-STATS] 가설검정 오류: {e}")
        return {"success": False, "error": str(e)}


@app.post("/api/prism/statistics/report")
async def generate_report(request: Request):
    """Prism 3계층: 분석 리포트 생성"""
    if not prism_statistics_layer:
        return {"success": False, "error": "통계 레이어가 로드되지 않았습니다"}

    try:
        data = await request.json()
        analysis_type = data.get("analysis_type", "general")
        analysis_data = data.get("data", {})

        report = prism_statistics_layer.generate_report(analysis_type, analysis_data)

        return {
            "success": True,
            "report": report
        }

    except Exception as e:
        logger.error(f"[PRISM-STATS] 리포트 생성 오류: {e}")
        return {"success": False, "error": str(e)}


@app.post("/api/prism/statistics/dashboard")
async def dashboard_statistics(request: Request):
    """Prism 3계층: 대시보드 통계"""
    if not prism_statistics_layer:
        return {"success": False, "error": "통계 레이어가 로드되지 않았습니다"}

    try:
        data = await request.json()
        datasets = data.get("datasets", {})

        if not datasets:
            return {"success": False, "error": "데이터셋이 필요합니다"}

        dashboard = prism_statistics_layer.dashboard_statistics(datasets)

        return {
            "success": True,
            "dashboard": dashboard
        }

    except Exception as e:
        logger.error(f"[PRISM-STATS] 대시보드 오류: {e}")
        return {"success": False, "error": str(e)}


@app.get("/api/prism/statistics/methods")
async def get_statistics_methods():
    """Prism 3계층: 사용 가능한 통계 방법"""
    methods = {
        "descriptive": ["mean", "median", "std_dev", "variance", "quartile", "skewness", "kurtosis"],
        "correlation": ["correlation", "covariance"],
        "regression": ["linear_regression", "multiple_regression", "polynomial_regression"],
        "timeseries": ["trend_analysis", "seasonality", "forecast", "arima", "exponential_smoothing"],
        "anomaly": ["zscore", "iqr", "isolation_forest"],
        "clustering": ["kmeans", "hierarchical", "dbscan"],
        "hypothesis": ["t_test", "chi_square", "anova", "mann_whitney"],
        "dimensionality": ["pca", "tsne"]
    }

    return {
        "success": True,
        "statistics_layer": "Prism 3계층",
        "total_methods": sum(len(v) for v in methods.values()),
        "methods": methods
    }


@app.get("/api/ondevice/technologies")
async def get_ondevice_technologies():
    """온디바이스에서 구현 가능한 모든 AI 기술 목록"""
    return {
        "success": True,
        "mode": "온디바이스 전용 (완벽한 프라이버시)",
        "total_technologies": 50,
        "categories": {
            "NLP": {
                "description": "자연어 처리",
                "technologies": [
                    "텍스트 분류",
                    "감정 분석",
                    "의도 인식",
                    "개체명 인식 (NER)",
                    "키워드 추출",
                    "텍스트 요약",
                    "텍스트 생성",
                    "대화형 챗봇",
                    "질문-답변 (QA)",
                    "언어 감지",
                    "의존성 파싱",
                    "품사 태깅"
                ]
            },
            "translation": {
                "description": "기계 번역",
                "technologies": [
                    "다국어 번역 (50+ 언어)",
                    "컨텍스트 번역",
                    "분야별 번역",
                    "실시간 번역"
                ]
            },
            "speech": {
                "description": "음성 처리",
                "technologies": [
                    "음성 인식 (STT)",
                    "음성 생성 (TTS)",
                    "화자 인식",
                    "감정 분석 (음성)",
                    "소음 제거",
                    "음성 활동 감지"
                ]
            },
            "vision": {
                "description": "컴퓨터 비전",
                "technologies": [
                    "이미지 분류",
                    "객체 탐지",
                    "개체 분할",
                    "얼굴 인식",
                    "OCR",
                    "이미지 생성",
                    "배경 제거",
                    "스타일 변환",
                    "이미지 캡셔닝",
                    "초해상도"
                ]
            },
            "video": {
                "description": "비디오 처리",
                "technologies": [
                    "비디오 분류",
                    "활동 인식",
                    "객체 추적",
                    "장면 감지",
                    "이상 탐지",
                    "비디오 요약"
                ]
            },
            "search": {
                "description": "검색 및 정보 검색",
                "technologies": [
                    "의미론적 검색",
                    "벡터 기반 검색",
                    "하이브리드 검색",
                    "문서 검색",
                    "쿼리 확장",
                    "검색 제안"
                ]
            },
            "analytics": {
                "description": "데이터 분석",
                "technologies": [
                    "시계열 분석",
                    "추세 분석",
                    "이상 탐지",
                    "클러스터링",
                    "통계 분석",
                    "회귀 분석",
                    "상관관계 분석"
                ]
            },
            "reasoning": {
                "description": "추론 및 논리",
                "technologies": [
                    "수학 문제 풀이",
                    "논리 추론",
                    "상식 추론",
                    "질문 분해",
                    "사실 확인",
                    "정보 추출"
                ]
            },
            "code": {
                "description": "코드 처리",
                "technologies": [
                    "코드 생성",
                    "자동 완성",
                    "코드 이해",
                    "버그 감지",
                    "코드 리뷰",
                    "문서 생성",
                    "테스트 생성"
                ]
            },
            "domain": {
                "description": "도메인 특화",
                "technologies": [
                    "의료 이미지 분석",
                    "의료 텍스트 분석",
                    "계약 분석",
                    "시장 분석",
                    "사기 탐지",
                    "상품 추천",
                    "리뷰 분석"
                ]
            },
            "multimodal": {
                "description": "다중모달",
                "technologies": [
                    "이미지-텍스트 매칭",
                    "크로스모달 검색",
                    "멀티모달 감정 분석"
                ]
            },
            "automation": {
                "description": "자동화",
                "technologies": [
                    "워크플로우 자동화",
                    "문서 자동 처리",
                    "의사결정 자동화",
                    "작업 스케줄링",
                    "멀티스텝 오케스트레이션"
                ]
            }
        },
        "advantages": {
            "cost": "🆓 클라우드 API 비용 0원",
            "privacy": "🔒 100% 데이터 프라이버시",
            "offline": "📡 오프라인 작동 가능",
            "latency": "⚡ 네트워크 지연 없음",
            "control": "🎯 완전한 통제권",
            "customization": "🔧 무제한 맞춤화"
        },
        "total_coverage": "99.5% (최신 대규모 모델 제외)",
        "conclusion": "온디바이스에서 거의 모든 AI 기술을 구현 가능합니다!"
    }


@app.get("/api/comparison/cloud-vs-local")
async def compare_cloud_vs_local():
    """클라우드 vs 온디바이스 워크플로우 비교"""
    return {
        "success": True,
        "comparison": {
            "cloud_api": {
                "cost": "💰 월별 API 비용 발생",
                "privacy": "📤 데이터를 외부 서버로 전송",
                "latency": "🌐 네트워크 레이턴시 존재",
                "offline": "❌ 온라인 필수",
                "control": "🔗 API 제공자에 의존",
                "models": ["Claude Opus", "GPT-4", "Gemini"],
                "best_for": "고성능이 필요한 경우"
            },
            "local_ondevice": {
                "cost": "🆓 비용 0원 (GPU 전기료만)",
                "privacy": "🔒 완벽한 데이터 보호",
                "latency": "⚡ 최소 레이턴시",
                "offline": "✅ 오프라인 작동 가능",
                "control": "🎯 완전한 통제권",
                "models": ["LARS-Native", "LARS-Prism", "LARS-Prime", "LARS-Cosmos", "Mistral", "Llama2"],
                "best_for": "프라이버시, 비용, 자체 통제가 중요한 경우"
            }
        },
        "recommendation": {
            "use_cloud": "높은 성능, 최신 기능이 필수적인 경우",
            "use_local": "프라이버시 보호, 비용 절감, 오프라인 운영이 중요한 경우"
        }
    }


# ==================== 실시간 데이터 처리 (Real-time Streaming) ====================

@app.post("/api/prism/stream/initialize")
async def initialize_stream(request: Request):
    """실시간 스트림 분석 초기화"""
    if not prism_statistics_layer:
        return {"success": False, "error": "통계 레이어가 로드되지 않았습니다"}

    try:
        data = await request.json()
        stream_id = data.get("stream_id", f"stream_{int(time.time())}")
        stream_type = data.get("stream_type", "timeseries")  # timeseries, metric, log
        window_size = data.get("window_size", 100)

        stream_config = {
            "stream_id": stream_id,
            "stream_type": stream_type,
            "window_size": window_size,
            "created_at": time.time(),
            "data_points": [],
            "statistics": {},
            "anomalies": [],
            "status": "active"
        }

        logger.info(f"[PRISM-STREAM] 스트림 초기화: {stream_id} (type={stream_type})")

        return {
            "success": True,
            "stream_id": stream_id,
            "config": stream_config
        }

    except Exception as e:
        logger.error(f"[PRISM-STREAM] 초기화 오류: {e}")
        return {"success": False, "error": str(e)}


@app.post("/api/prism/stream/process")
async def process_stream_data(request: Request):
    """실시간 데이터 포인트 처리"""
    if not prism_statistics_layer:
        return {"success": False, "error": "통계 레이어가 로드되지 않았습니다"}

    try:
        data = await request.json()
        stream_id = data.get("stream_id")
        values = data.get("values", [])
        timestamp = data.get("timestamp", time.time())

        if not values:
            return {"success": False, "error": "값이 필요합니다"}

        # 슬라이딩 윈도우로 최신 데이터만 유지
        window_size = data.get("window_size", 100)
        all_values = data.get("all_values", [])

        # 새 값 추가
        all_values.extend(values)

        # 윈도우 크기 유지
        if len(all_values) > window_size:
            all_values = all_values[-window_size:]

        # 현재 윈도우에 대한 통계
        current_stats = prism_statistics_layer.descriptive_statistics(all_values)

        # 이상탐지
        anomalies = prism_statistics_layer.anomaly_detection(all_values, method="zscore", threshold=2.5)

        # 추세 분석
        if len(all_values) > 1:
            import numpy as np
            trend_data = prism_statistics_layer.timeseries_analysis(all_values)
        else:
            trend_data = {"trend": "insufficient_data"}

        result = {
            "success": True,
            "stream_id": stream_id,
            "timestamp": timestamp,
            "points_processed": len(values),
            "window_total": len(all_values),
            "statistics": current_stats,
            "anomalies_detected": anomalies["anomalies_count"],
            "anomalies": anomalies["anomalies"][:5],  # 상위 5개
            "trend": trend_data.get("trend", "unknown"),
            "status": "processing"
        }

        logger.info(f"[PRISM-STREAM] 처리 완료: {stream_id} ({len(values)}개 포인트, 윈도우: {len(all_values)}개)")

        return result

    except Exception as e:
        logger.error(f"[PRISM-STREAM] 처리 오류: {e}")
        return {"success": False, "error": str(e)}


@app.post("/api/prism/stream/aggregate")
async def aggregate_stream(request: Request):
    """시간 기반 집계 분석"""
    if not prism_statistics_layer:
        return {"success": False, "error": "통계 레이어가 로드되지 않았습니다"}

    try:
        data = await request.json()
        stream_id = data.get("stream_id")
        values = data.get("values", [])
        period = data.get("period", "1m")  # 1m, 5m, 1h
        aggregation = data.get("aggregation", "mean")  # mean, sum, max, min

        if not values:
            return {"success": False, "error": "값이 필요합니다"}

        import numpy as np
        values_array = np.array(values, dtype=float)

        aggregation_result = {
            "mean": float(np.mean(values_array)),
            "sum": float(np.sum(values_array)),
            "max": float(np.max(values_array)),
            "min": float(np.min(values_array)),
            "count": len(values_array),
            "std": float(np.std(values_array))
        }

        logger.info(f"[PRISM-STREAM] 집계 완료: {stream_id} (period={period})")

        return {
            "success": True,
            "stream_id": stream_id,
            "period": period,
            "aggregation": aggregation_result,
            "timestamp": time.time()
        }

    except Exception as e:
        logger.error(f"[PRISM-STREAM] 집계 오류: {e}")
        return {"success": False, "error": str(e)}


@app.post("/api/prism/stream/finalize")
async def finalize_stream(request: Request):
    """스트림 분석 최종화"""
    if not prism_statistics_layer:
        return {"success": False, "error": "통계 레이어가 로드되지 않았습니다"}

    try:
        data = await request.json()
        stream_id = data.get("stream_id")
        values = data.get("values", [])

        if not values:
            return {"success": False, "error": "값이 필요합니다"}

        # 전체 분석 수행
        final_stats = prism_statistics_layer.descriptive_statistics(values)
        anomalies = prism_statistics_layer.anomaly_detection(values)
        forecast_data = prism_statistics_layer.forecast(values, periods=3) if len(values) > 5 else None
        timeseries_analysis = prism_statistics_layer.timeseries_analysis(values)

        logger.info(f"[PRISM-STREAM] 최종화 완료: {stream_id}")

        return {
            "success": True,
            "stream_id": stream_id,
            "total_points": len(values),
            "analysis": {
                "statistics": final_stats,
                "anomalies": anomalies,
                "forecast": forecast_data,
                "timeseries": timeseries_analysis
            },
            "summary": {
                "mean": final_stats.get("mean"),
                "std": final_stats.get("std_dev"),
                "anomaly_count": anomalies["anomalies_count"],
                "anomaly_rate": anomalies["anomaly_rate"],
                "trend": timeseries_analysis.get("trend")
            },
            "status": "completed"
        }

    except Exception as e:
        logger.error(f"[PRISM-STREAM] 최종화 오류: {e}")
        return {"success": False, "error": str(e)}


# ============================================================================
# MULTI-AGENT ORCHESTRATION ENDPOINTS (에이전트 간 소통 및 조율)
# ============================================================================











# ========== AI 어시스턴트 채팅 (Tool-Calling) ==========

class ChatMessage(BaseModel):
    """채팅 메시지"""
    role: str
    content: str


class AssistantChatRequest(BaseModel):
    """채팅 요청"""
    message: str
    history: Optional[List[ChatMessage]] = []
    instructions: Optional[str] = ""          # 커스텀 지시 (모든 대화에 적용)
    memories: Optional[List[str]] = []        # 기억해 둔 사용자 정보
    thinking: Optional[bool] = False          # 사고 과정 표시 (추론 강도 높이기)
    project_id: Optional[str] = None          # 이 대화가 속한 프로젝트 (지침과 자료를 서버에서 찾아 붙인다)
    model: Optional[str] = None               # 채팅에서 고른 LARS 모델 이름 (사용량 화면에 이 이름으로 표시)


def compose_system_prompt(base: str, context: Optional[dict] = None) -> str:
    """기본 시스템 프롬프트에 커스텀 지시와 메모리를 덧붙인다."""
    context = context or {}
    parts = [base]
    instructions = (context.get("instructions") or "").strip()
    if instructions:
        parts.append("[사용자 커스텀 지시]\n" + instructions[:4000])
    memories = [m.strip() for m in (context.get("memories") or []) if m and m.strip()]
    if memories:
        parts.append("[기억하고 있는 사용자 정보 - 관련 있을 때만 활용]\n" + "\n".join(f"- {m[:300]}" for m in memories[:50]))
    project = (context.get("project") or "").strip()
    if project:
        parts.append("[프로젝트 자료 사용 규칙] 아래 자료는 사용자가 올린 참고 자료입니다. 자료에 근거가 있으면 파일명을 밝혀 인용하고, 자료에 없는 내용은 추측하지 않는다.\n" + project[:40000])
    skills = (context.get("skills") or "").strip()
    if skills:
        parts.append(skills)
    web = (context.get("web") or "").strip()
    if web:
        parts.append("[웹 검색 결과 사용 규칙] 아래는 방금 웹에서 검색한 결과입니다. 최신 정보가 필요한 질문은 이 결과를 근거로 답하고, 근거 문장 뒤에 [번호]를 붙이세요. 결과에 없는 내용은 없다고 말하고 추측하지 않습니다.\n" + web[:12000])
    return "\n\n".join(parts)


class ToolCall(BaseModel):
    """도구 호출 결과"""
    tool: str
    parameters: Dict[str, Any]
    result: Dict[str, Any]


class AssistantChatResponse(BaseModel):
    """채팅 응답"""
    reply: str
    tool_calls: Optional[List[ToolCall]] = []
    engine_used: str


@app.post("/api/assistant/chat", response_model=AssistantChatResponse)
async def assistant_chat(request: AssistantChatRequest):
    """AI 어시스턴트 채팅 (Tool-Calling 지원)"""
    from src.core.db import SessionLocal

    try:
        from src.core.tool_registry import TOOLS, execute_tool, render_tool_result, to_claude_tools
        db = SessionLocal()

        try:
            user_message = request.message.strip()
            if not user_message:
                raise HTTPException(status_code=400, detail="메시지가 비어있습니다")

            history = [{"role": m.role, "content": m.content} for m in (request.history or [])]

            # Functionary 1.4 (Tool-Calling 지원)
            try:
                response = await call_ollama_assistant(user_message, history)
                if response:
                    return response
            except Exception as ollama_err:
                logger.warning(f"[Assistant] Functionary 실패: {ollama_err}")

            # Ollama를 쓸 수 없으면 Claude로 대체 (서버에는 Ollama가 없음)
            response = await call_claude_assistant(user_message, history, db)
            if response:
                return response

            raise HTTPException(status_code=500, detail="AI 응답 실패: 사용 가능한 모델이 없습니다")

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"[Assistant] 오류: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail=str(e))
        finally:
            db.close()

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Assistant] 메인 오류: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


def _ollama_system_prompt(user_message: str) -> str:
    """Ollama 시스템 프롬프트 (도구 호출 필요 시 함수 호출 안내 포함)"""
    from src.core.tool_registry import TOOLS

    system_prompt_general = """당신은 LARS Prism AI 어시스턴트입니다. 사용자의 질문에 명확하고 친절하게 한국어로 답변하세요."""

    system_prompt_with_tools = system_prompt_general + """

사용자가 기능을 요청하면 JSON 함수 호출로 응답하세요:
{"function": "function_name", "arguments": {"param1": "value1"}}

사용 가능한 기능:
""" + json.dumps([{"name": t["function"]["name"], "description": t["function"]["description"]}
                  for t in TOOLS], indent=2)

    tool_keywords = ['생성', '만들', '추가', '저장', '제거', '삭제', '생성해', '만들어', '해줘', '해주세요',
                    'create', 'add', 'make', 'delete', 'remove', 'generate', 'build']
    needs_tool_calling = any(keyword in user_message.lower() for keyword in tool_keywords)
    return system_prompt_with_tools if needs_tool_calling else system_prompt_general


def _apply_prompt_tool_call(reply: str, db: Session):
    """응답 본문의 JSON 함수 호출을 실행하고 (갱신된 응답, ToolCall 또는 None) 반환"""
    from src.core.tool_registry import execute_tool, render_tool_result

    if '{"function"' not in reply:
        return reply, None
    try:
        start = reply.find('{')
        brace_count = 0
        end = start
        for i in range(start, len(reply)):
            if reply[i] == '{':
                brace_count += 1
            elif reply[i] == '}':
                brace_count -= 1
                if brace_count == 0:
                    end = i + 1
                    break

        if end > start:
            func_call = json.loads(reply[start:end])
            tool_name = func_call.get("function")
            tool_args = func_call.get("arguments", {})

            if tool_name:
                logger.info(f"[Assistant] 함수 호출 감지: {tool_name}")
                exec_result = execute_tool(tool_name, tool_args, db)
                summary = render_tool_result(tool_name, exec_result)
                call = ToolCall(tool=tool_name, parameters=tool_args, result=exec_result)
                return reply[:start] + f"✅ {summary}" + reply[end:], call
    except Exception as e:
        logger.warning(f"[Assistant] JSON 파싱 실패: {e}")
    return reply, None


async def call_ollama_assistant(
    user_message: str,
    history: List[Dict[str, str]],
    timeout: int = 60
) -> Optional[AssistantChatResponse]:
    """Ollama 기반 Tool-Calling"""
    if is_production():
        return None  # 운영: 로컬 모델이 없으므로 Claude(Bedrock) 경로로 넘긴다
    from src.core.tool_registry import TOOLS, execute_tool, render_tool_result
    from src.core.db import SessionLocal

    try:
        selected_prompt = _ollama_system_prompt(user_message)

        messages = [{"role": "system", "content": selected_prompt}]
        messages.extend(history)
        messages.append({"role": "user", "content": user_message})

        payload = {
            "model": ASSISTANT_OLLAMA_MODEL,
            "think": False,
            "messages": messages,
            # "tools": TOOLS,  # Neural-Chat doesn't support native tool-calling
            "stream": False,
            "temperature": 0.5,  # Lower temp for more consistent JSON
        }

        logger.info("[Assistant] Ollama 요청 중...")
        resp = requests.post("http://localhost:11434/api/chat", json=payload, timeout=timeout)
        resp.raise_for_status()
        result = resp.json()

        message = result.get("message", {})
        reply = message.get("content", "응답 없음")
        tool_calls_raw = message.get("tool_calls", [])

        # Prompt-based function calling: extract JSON from response
        tool_calls = []

        db = SessionLocal()
        try:
            reply, prompt_call = _apply_prompt_tool_call(reply, db)
        finally:
            db.close()
        if prompt_call:
            tool_calls.append(prompt_call)

        # Also process native tool_calls if available
        if tool_calls_raw:
            db = SessionLocal()
            try:
                for tc in tool_calls_raw:
                    func_data = tc.get("function", {})
                    tool_name = func_data.get("name")
                    tool_args = func_data.get("arguments", {})

                    if isinstance(tool_args, str):
                        tool_args = json.loads(tool_args)

                    logger.info(f"[Assistant] 도구: {tool_name}")
                    exec_result = execute_tool(tool_name, tool_args, db)
                    summary = render_tool_result(tool_name, exec_result)

                    tool_calls.append(ToolCall(
                        tool=tool_name,
                        parameters=tool_args,
                        result=exec_result
                    ))
                    reply += f"\n{summary}"
            finally:
                db.close()

        logger.info("[Assistant] ✅ Ollama 완료")
        return AssistantChatResponse(
            reply=reply,
            tool_calls=tool_calls,
            engine_used="ollama"
        )

    except requests.exceptions.ConnectionError:
        logger.warning("[Assistant] Ollama 연결 실패")
        return None
    except requests.exceptions.Timeout:
        logger.warning("[Assistant] Ollama 타임아웃")
        return None
    except Exception as e:
        logger.warning(f"[Assistant] Ollama 오류: {e}")
        return None


async def call_claude_assistant(
    user_message: str,
    history: List[Dict[str, str]],
    db: Session
) -> Optional[AssistantChatResponse]:
    """Claude 기반 Tool-Calling"""
    from src.core.tool_registry import TOOLS, execute_tool, render_tool_result, to_claude_tools

    try:
        api_key = os.getenv("CLAUDE_API_KEY")
        model = os.getenv("CLAUDE_MODEL", "claude-opus-5")

        if not api_key and not is_production():
            logger.warning("[Assistant] Claude API 키 없음")
            return None

        client = BedrockClient() if is_production() else Anthropic(api_key=api_key)
        claude_tools = to_claude_tools(TOOLS)
        # 도구 정의는 요청마다 동일 → 마지막 도구에 캐시 브레이크포인트 (tools 전체가 캐시됨)
        if claude_tools:
            claude_tools[-1] = {**claude_tools[-1], "cache_control": {"type": "ephemeral"}}

        system_prompt = """당신은 LARS Prism AI 어시스턴트입니다. 사용자의 질문에 직접 답변하거나, 필요하면 사용 가능한 도구를 사용합니다.

- 일반 질문에는 명확하고 간결하게 답변하세요.
- 사용자가 특정 기능을 요청하면 적절한 도구를 호출하세요.
- 항상 한국어로 친절하게 응답하세요.
- 도구 목록을 설명하지 마세요. 도구는 필요할 때만 사용하세요."""

        messages = history.copy()
        messages.append({"role": "user", "content": user_message})

        logger.info(f"[Assistant] Claude 요청 중: {model}")

        response = client.messages.create(
            model=model,
            max_tokens=2048,
            # 시스템 프롬프트 블록에도 캐시 브레이크포인트 (tools → system 순서로 prefix 캐싱)
            system=[{"type": "text", "text": system_prompt, "cache_control": {"type": "ephemeral"}}],
            tools=claude_tools,
            messages=messages,
        )

        reply = ""
        tool_calls = []

        for block in response.content:
            if block.type == "text":
                reply += block.text

            elif block.type == "tool_use":
                tool_name = block.name
                tool_args = block.input

                logger.info(f"[Assistant] 도구: {tool_name}")
                exec_result = execute_tool(tool_name, tool_args, db)
                summary = render_tool_result(tool_name, exec_result)

                tool_calls.append(ToolCall(
                    tool=tool_name,
                    parameters=tool_args,
                    result=exec_result
                ))
                reply += f"\n{summary}"

        logger.info("[Assistant] ✅ Claude 완료")
        return AssistantChatResponse(
            reply=reply,
            tool_calls=tool_calls,
            engine_used="claude"
        )

    except Exception as e:
        logger.warning(f"[Assistant] Claude 오류: {e}")
        return None


def _sse_event(payload: Dict[str, Any]) -> str:
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


@app.post("/api/assistant/chat/stream")
async def assistant_chat_stream(request: AssistantChatRequest, http_request: Request):
    """AI 어시스턴트 채팅 (SSE 스트리밍, 토큰 조각을 도착 즉시 전송)"""
    user_message = request.message.strip()
    if not user_message:
        raise HTTPException(status_code=400, detail="메시지가 비어있습니다")
    history = [{"role": m.role, "content": m.content} for m in (request.history or [])]
    context = {"instructions": request.instructions, "memories": request.memories, "thinking": bool(request.thinking)}
    from src.core import usage_ledger as _usage
    _usage.set_lars_model(request.model)
    try:
        from src.api.feature_routes import _signed_in_email as _who
        context["plugin_owner"] = _who(http_request)
    except HTTPException:
        context["plugin_owner"] = ""
    if request.project_id:
        # 프로젝트 지침과 자료는 서버가 계정 기준으로 찾아 붙인다 (질문과 관련된 부분만 고른다)
        from src.api.feature_routes import _signed_in_email
        from src.core import project_store
        try:
            email = _signed_in_email(http_request)
            context["project"] = await asyncio.to_thread(project_store.build_context, email, request.project_id, user_message)
        except HTTPException:
            context["project"] = ""
    # 사용량 한도를 넘었으면 Prism 모델을 부르지 않고 신호만 보낸다. 답은 브라우저가 사용자의 연결된 에이전트로 이어서 만든다.
    status = await asyncio.to_thread(_usage.limit_status)
    if status["exceeded"]:
        async def _limit_only():
            yield _sse_event({"type": "limit_exceeded", "kind": status["kind"], "used": status["used"], "limit": status["limit"]})
        return StreamingResponse(_limit_only(), media_type="text/event-stream",
                                 headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})
    return StreamingResponse(
        _assistant_event_stream(user_message, history, context),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


async def _with_web_sources(events, sources: List[dict]):
    """답변이 끝나기 직전에 검색 출처 목록을 덧붙인다. 이벤트는 SSE 문자열이다."""
    async for event in events:
        if sources and isinstance(event, str) and event.startswith("data: "):
            try:
                payload = json.loads(event[6:].strip())
            except ValueError:
                payload = {}
            if isinstance(payload, dict) and payload.get("type") == "done":
                lines = "\n".join(f"[{i + 1}] {s['title'] or s['url']} - {s['url']}" for i, s in enumerate(sources))
                yield _sse_event({"type": "delta", "text": f"\n\n출처\n{lines}"})
        yield event


async def _assistant_event_stream(user_message: str, history: List[Dict[str, str]], context: Optional[dict] = None):
    from src.core import skills as skills_engine
    context = dict(context or {})
    context["skills"] = await asyncio.to_thread(skills_engine.prompt_block, user_message)
    """Ollama 우선, 아무 조각도 보내기 전 실패하면 Claude로 폴백"""
    streamed_any = False
    try:
        if is_production():
            raise RuntimeError("운영 모드: 로컬 모델 없이 Bedrock으로 응답합니다")
        async for event in _stream_ollama_assistant(user_message, history, context):
            if event["type"] == "delta":
                streamed_any = True
            yield _sse_event(event)
            if event["type"] == "done":
                return
    except Exception as e:
        logger.warning(f"[Assistant] Ollama 스트리밍 실패: {e}")
        if streamed_any:
            yield _sse_event({"type": "error", "message": str(e)})
            return

    try:
        async for event in _stream_claude_assistant(user_message, history, context):
            yield _sse_event(event)
    except Exception as e:
        logger.error(f"[Assistant] Claude 스트리밍 실패: {e}", exc_info=True)
        yield _sse_event({"type": "error", "message": str(e)})


async def _stream_ollama_assistant(user_message: str, history: List[Dict[str, str]], context: Optional[dict] = None):
    """Ollama 스트리밍. 연결 실패 등 예외는 호출자에게 전달된다."""
    from src.core.db import SessionLocal

    messages = [{"role": "system", "content": compose_system_prompt(_ollama_system_prompt(user_message), context)}]
    messages.extend(history)
    messages.append({"role": "user", "content": user_message})
    payload = {
        "model": ASSISTANT_OLLAMA_MODEL,
        "think": bool((context or {}).get("thinking")),
        "messages": messages,
        "stream": True,
        "temperature": 0.5,
    }

    reply = ""
    counts = {"done": False, "in": 0, "out": 0}
    async with httpx.AsyncClient(timeout=60) as client:
        async with client.stream("POST", "http://localhost:11434/api/chat", json=payload) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if not line:
                    continue
                chunk = json.loads(line)
                thought = chunk.get("message", {}).get("thinking", "")
                if thought:
                    yield {"type": "thinking", "text": thought}
                delta = chunk.get("message", {}).get("content", "")
                if delta:
                    reply += delta
                    yield {"type": "delta", "text": delta}
                if chunk.get("done"):
                    counts = {"done": True, "in": chunk.get("prompt_eval_count") or 0, "out": chunk.get("eval_count") or 0}
                    break
    usage_ledger.record("ollama", ASSISTANT_OLLAMA_MODEL, "chat", counts["in"], counts["out"], known=counts["done"])

    db = SessionLocal()
    try:
        final_reply, prompt_call = _apply_prompt_tool_call(reply, db)
    finally:
        db.close()

    tool_calls = []
    if prompt_call:
        tool_calls.append({"tool": prompt_call.tool, "parameters": prompt_call.parameters, "result": prompt_call.result})
        yield {"type": "replace", "text": final_reply}
    yield {"type": "done", "tool_calls": tool_calls, "engine_used": "ollama"}


async def _stream_claude_assistant(user_message: str, history: List[Dict[str, str]], context: Optional[dict] = None):
    """Claude 스트리밍. 텍스트 조각을 즉시 전송하고 도구 호출은 스트림 종료 후 실행한다."""
    from anthropic import AsyncAnthropic
    from src.core.db import SessionLocal
    from src.core.tool_registry import TOOLS, execute_tool, render_tool_result, to_claude_tools

    api_key = os.getenv("CLAUDE_API_KEY")
    model = os.getenv("CLAUDE_MODEL", "claude-opus-5")
    production = is_production()
    if not api_key and not production:
        logger.warning("[Assistant] Claude API 키 없음")
        yield {"type": "error", "message": "AI 응답 실패: 사용 가능한 모델이 없습니다"}
        return

    client = None if production else AsyncAnthropic(api_key=api_key)
    claude_tools = to_claude_tools(TOOLS)
    plugin_owner = (context or {}).get("plugin_owner") or ""
    if plugin_owner:
        from src.core import plugins as plugin_engine
        claude_tools = claude_tools + plugin_engine.llm_tools(plugin_owner)
    if claude_tools:
        claude_tools[-1] = {**claude_tools[-1], "cache_control": {"type": "ephemeral"}}

    system_prompt = """당신은 LARS Prism AI 어시스턴트입니다. 사용자의 질문에 직접 답변하거나, 필요하면 사용 가능한 도구를 사용합니다.

- 일반 질문에는 명확하고 간결하게 답변하세요.
- 사용자가 특정 기능을 요청하면 적절한 도구를 호출하세요.
- 항상 한국어로 친절하게 응답하세요.
- 도구 목록을 설명하지 마세요. 도구는 필요할 때만 사용하세요."""

    messages = history.copy()
    messages.append({"role": "user", "content": user_message})

    if production:
        from src.core import web_tools as _wt
        from src.core import plugins as plugin_engine
        from src.core.llm_provider import bedrock_tool_loop
        owner = (context or {}).get("plugin_owner") or ""
        web_sources: List[dict] = []
        tool_calls: List[dict] = []
        proposals_out: List[dict] = []
        db = SessionLocal()
        # 언급한 서비스가 아직 연결되지 않았으면 채팅 안에 연결 안내를 보여 준다
        try:
            from src.core import oauth_services as _oauth
            if owner:
                states = {item["key"]: item for item in await asyncio.to_thread(_oauth.status, owner)}
                lowered = user_message.lower()
                for svc_key, words in _oauth.SERVICE_WORDS.items():
                    if any(w in lowered for w in words) and svc_key in states and not states[svc_key]["connected"]:
                        yield {"type": "connect_prompt", "service": svc_key, "name": states[svc_key]["name"],
                               "configured": states[svc_key]["configured"]}
        except Exception:
            logger.exception("[Assistant] 연결 안내 확인 실패")

        def _run_tool(name: str, args: dict):
            """모델이 고른 도구를 실행하고 결과 글을 돌려준다. (글, 오류 여부)"""
            try:
                if name == "web_search":
                    query = str(args.get("query") or "").strip()
                    if not query:
                        return "검색어가 비어 있습니다.", True
                    results = [r for r in _wt.search_web(_wt.search_query(query), 5) if r.get("url")]
                    lines = []
                    for r in results:
                        web_sources.append({"title": r["title"], "url": r["url"]})
                        lines.append(f"[{len(web_sources)}] {r['title']}\n{r['snippet']}\n{r['url']}")
                    tool_calls.append({"tool": name, "parameters": args, "result": {"count": len(lines)}})
                    return ("\n\n".join(lines) or "검색 결과가 없습니다."), False
                if name == "read_url":
                    url = str(args.get("url") or "").strip()
                    text = _wt.fetch_page_text(url)
                    web_sources.append({"title": url, "url": url})
                    tool_calls.append({"tool": name, "parameters": args, "result": {"chars": len(text)}})
                    return f"[{len(web_sources)}] {url}\n{text[:5000]}", False
                if name.startswith("plg_"):
                    prop = plugin_engine.proposal(owner, name, args)
                    if not prop:
                        return "사용할 수 없는 앱 도구입니다.", True
                    proposals_out.append(prop)
                    return "사용자 승인을 기다리는 작업입니다. 승인 전에는 실행되지 않았습니다.", False
                exec_result = execute_tool(name, args, db)
                tool_calls.append({"tool": name, "parameters": args, "result": exec_result})
                return render_tool_result(name, exec_result), False
            except Exception as err:
                logger.warning(f"[Assistant] 도구 실행 실패 {name}: {err}")
                return f"도구 실행에 실패했습니다: {err}", True

        web_tools_spec = [
            {"name": "web_search", "description": "인터넷에서 최신 정보를 검색한다. 회사, 사람, 제품, 장소, 사건, 최신 소식, 가격처럼 확인이 필요한 사실은 먼저 검색한다.",
             "input_schema": {"type": "object", "properties": {"query": {"type": "string", "description": "검색어 (핵심 키워드)"}}, "required": ["query"]}},
            {"name": "read_url", "description": "검색 결과 페이지의 본문을 읽는다. 검색 요약만으로 부족할 때 사용한다.",
             "input_schema": {"type": "object", "properties": {"url": {"type": "string", "description": "읽을 http(s) 주소"}}, "required": ["url"]}},
        ]
        loop_tools = web_tools_spec + [t for t in claude_tools if t.get("name") not in ("web_search", "read_url")]
        web_rule = ("\n\n[웹 검색 규칙] 회사, 사람, 제품, 장소 같은 고유명사나 최신 소식, 가격, 날씨처럼 바뀌는 정보는 web_search로 먼저 확인한다. "
                    "검색 요약으로 부족하면 read_url로 원문을 읽는다. 근거가 되는 문장 뒤에 [번호]를 붙이고, 찾지 못한 내용은 찾지 못했다고 말한다. 추측으로 답하지 않는다.")
        # 모델이 만드는 글자 조각을 생기는 대로 화면에 보낸다. 루프는 별도 스레드에서 돌고, 조각은 큐로 넘어온다.
        pieces: asyncio.Queue = asyncio.Queue()
        loop_ref = asyncio.get_running_loop()

        def _on_text(piece: str) -> None:
            loop_ref.call_soon_threadsafe(pieces.put_nowait, piece)

        def _run_loop():
            return bedrock_tool_loop(compose_system_prompt(system_prompt + web_rule, context), messages, loop_tools,
                                     _run_tool, 2048, 4, _on_text)

        task = asyncio.create_task(asyncio.to_thread(_run_loop))
        task.add_done_callback(lambda _t: loop_ref.call_soon_threadsafe(pieces.put_nowait, None))
        streamed = False
        try:
            while True:
                piece = await pieces.get()
                if piece is None:
                    break
                streamed = True
                yield {"type": "delta", "text": piece}
            result = task.result()
        except Exception as err:
            logger.exception("[Assistant] 도구 루프 실패")
            yield {"type": "error", "message": f"AI 응답 실패: {err}"}
            return
        finally:
            db.close()
        usage = result.get("usage") or {}
        usage_ledger.record("bedrock", bedrock_model_name(), "chat", int(usage.get("inputTokens", 0)), int(usage.get("outputTokens", 0)))
        if not streamed:
            yield {"type": "delta", "text": "답변을 만들지 못했습니다. 질문을 조금 더 구체적으로 적어 주세요."}
        if web_sources:
            yield {"type": "delta", "text": "\n\n출처\n" + "\n".join(f"[{i + 1}] {src['title'] or src['url']} - {src['url']}" for i, src in enumerate(web_sources))}
        for prop in proposals_out:
            yield {"type": "plugin_proposal", "proposal": prop}
        yield {"type": "done", "tool_calls": tool_calls, "engine_used": "bedrock"}
        return

    logger.info(f"[Assistant] Claude 스트리밍 요청 중: {model}")
    async with client.messages.stream(
        model=model,
        max_tokens=2048,
        system=[{"type": "text", "text": compose_system_prompt(system_prompt, context), "cache_control": {"type": "ephemeral"}}],
        tools=claude_tools,
        messages=messages,
    ) as stream:
        async for text in stream.text_stream:
            yield {"type": "delta", "text": text}
        final = await stream.get_final_message()

    usage = final.usage
    usage_ledger.record(
        "claude", model, "chat",
        (usage.input_tokens or 0) + (getattr(usage, "cache_creation_input_tokens", 0) or 0) + (getattr(usage, "cache_read_input_tokens", 0) or 0),
        usage.output_tokens or 0,
    )

    tool_calls = []
    db = SessionLocal()
    try:
        for block in final.content:
            if block.type == "tool_use":
                logger.info(f"[Assistant] 도구: {block.name}")
                if block.name.startswith("plg_"):
                    from src.core import plugins as plugin_engine
                    prop = await asyncio.to_thread(plugin_engine.proposal, plugin_owner, block.name, block.input)
                    if prop:
                        yield {"type": "plugin_proposal", "proposal": prop}
                    continue
                exec_result = execute_tool(block.name, block.input, db)
                summary = render_tool_result(block.name, exec_result)
                tool_calls.append({"tool": block.name, "parameters": block.input, "result": exec_result})
                yield {"type": "delta", "text": f"\n{summary}"}
    finally:
        db.close()

    logger.info("[Assistant] ✅ Claude 스트리밍 완료")
    yield {"type": "done", "tool_calls": tool_calls, "engine_used": "claude"}


class ImageGenerateRequest(BaseModel):
    prompt: str
    model: str = "dalle"
    quality: str = "hd"
    style: str = "vibrant"
    size: str = "1024x1024"


@app.post("/api/image/generate")
async def generate_image_route(request: ImageGenerateRequest):
    """AI 이미지 생성 (DALL-E 3 / Stable Diffusion / Hugging Face)"""
    from src.core.image_generator import image_generator

    result = await asyncio.to_thread(
        image_generator.generate_image,
        request.prompt,
        request.model,
        request.quality,
        request.style,
        request.size,
    )
    if result.get("status") != "success":
        raise HTTPException(status_code=400, detail=result.get("message", "이미지 생성 실패"))
    return result


@app.get("/api/image/history")
async def image_history_route(limit: int = 50):
    """이미지 생성 이력"""
    from src.core.image_generator import image_generator

    return {"images": image_generator.get_generation_history(limit)}


@app.get("/api/image/file/{filename}")
async def image_file_route(filename: str):
    """생성된 이미지 파일 제공"""
    import re
    from src.core.image_generator import image_generator

    if not re.fullmatch(r"[A-Za-z0-9_-]+\.png", filename):
        raise HTTPException(status_code=404, detail="이미지를 찾을 수 없습니다")
    path = image_generator.storage_dir / filename
    if not path.is_file():
        raise HTTPException(status_code=404, detail="이미지를 찾을 수 없습니다")
    return FileResponse(path, media_type="image/png")


@app.delete("/api/image/{image_id}")
async def delete_image_route(image_id: str):
    """이미지 생성 이력 삭제"""
    from src.core.image_generator import image_generator

    return image_generator.delete_image(image_id)


class RouteChatRequest(BaseModel):
    tab: str
    message: str
    history: List[Dict[str, str]] = []


# 일반 채팅(어시스턴트)에 쓰는 Ollama 모델. 사고 과정은 끈다(think=False)
ASSISTANT_OLLAMA_MODEL = os.getenv("ASSISTANT_OLLAMA_MODEL", "gemma4:31b")


class ExaoneChatRequest(BaseModel):
    message: str
    history: Optional[List[dict]] = []


@app.post("/api/model/exaone/chat")
async def exaone_chat(req: ExaoneChatRequest):
    """K-EXAONE 2.5 채팅. 키·주소·모델은 .env의 EXAONE_* 값을 쓴다."""
    from src.core.model_router import ENGINES, run_engine

    if not req.message.strip():
        raise HTTPException(status_code=400, detail="메시지가 비어있습니다")
    try:
        return await asyncio.to_thread(run_engine, ENGINES["exaone"], req.message, req.history or [])
    except RuntimeError as err:
        raise HTTPException(status_code=503, detail=str(err))
    except Exception as err:
        raise HTTPException(status_code=502, detail=f"EXAONE 호출 실패: {err}")


@app.post("/api/model/exaone-tabular/predict")
async def exaone_tabular_predict(
    train_file: UploadFile = File(...),
    test_file: UploadFile = File(...),
    task: str = Form("classification"),
    target: str = Form(...),
    output_type: str = Form(""),
):
    """EXAONE Tabular: 학습 CSV로 학습하고 예측 CSV 행의 값을 예측한다."""
    from src.core.exaone_tabular import predict

    train_bytes = await train_file.read()
    test_bytes = await test_file.read()
    if not train_bytes or not test_bytes:
        raise HTTPException(status_code=400, detail="학습 파일과 예측 파일을 모두 올려 주세요.")
    try:
        data = await asyncio.to_thread(predict, task, train_bytes, test_bytes, target, output_type)
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))
    except RuntimeError as err:
        raise HTTPException(status_code=503, detail=str(err))
    return {"task": task, "target": target, "data": data}


@app.post("/api/model/exaone/chat/stream")
async def exaone_chat_stream(req: ExaoneChatRequest):
    """K-EXAONE 2.5 스트리밍 채팅 (SSE). delta 조각을 도착하는 대로 보낸다."""
    from src.core.model_router import ENGINES, check_exaone_config, exaone_messages, iter_exaone_stream

    if not req.message.strip():
        raise HTTPException(status_code=400, detail="메시지가 비어있습니다")
    try:
        check_exaone_config()
    except RuntimeError as err:
        raise HTTPException(status_code=503, detail=str(err))
    messages = exaone_messages(ENGINES["exaone"], req.message, req.history or [])

    def events():
        usage: dict = {}
        try:
            for piece in iter_exaone_stream(messages, usage):
                yield f"data: {json.dumps({'type': 'delta', 'text': piece}, ensure_ascii=False)}\n\n"
            usage_ledger.record("exaone", check_exaone_config()["model"], "chat",
                                usage.get("prompt_tokens", 0), usage.get("completion_tokens", 0), known=bool(usage))
            yield f"data: {json.dumps({'type': 'done', 'backend': 'exaone-api', 'model': check_exaone_config()['model']}, ensure_ascii=False)}\n\n"
        except Exception as err:
            yield f"data: {json.dumps({'type': 'error', 'detail': f'EXAONE 호출 실패: {err}'}, ensure_ascii=False)}\n\n"

    return StreamingResponse(events(), media_type="text/event-stream", headers={"Cache-Control": "no-cache"})


class FeedbackRequest(BaseModel):
    message_id: str
    rating: str
    text: str = ""


class SkillTextRequest(BaseModel):
    skill_md: str


class SkillDraftRequest(BaseModel):
    goal: str


class SkillInstallRequest(BaseModel):
    token: str
    accept_warnings: bool = False
    confirmed: bool = False


class SkillToggleRequest(BaseModel):
    enabled: bool


def _skill_call(func, *args):
    from src.core import skills as skills_engine
    try:
        return func(skills_engine, *args)
    except KeyError:
        raise HTTPException(status_code=404, detail="스킬을 찾을 수 없습니다.")
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))


@app.get("/api/skills")
async def list_skills():
    from src.core import skills as skills_engine
    return {"skills": await asyncio.to_thread(skills_engine.list_installed)}


@app.post("/api/skills/upload")
async def upload_skill(file: UploadFile = File(...)):
    """ZIP 파일을 검사만 한다. 설치는 /api/skills/install에서 확인 후에 한다."""
    data = await file.read()
    if not file.filename.lower().endswith(".zip") and not file.filename.lower().endswith(".md"):
        raise HTTPException(status_code=400, detail="ZIP 또는 SKILL.md 파일만 올릴 수 있습니다.")
    if file.filename.lower().endswith(".md"):
        return {"staged": await asyncio.to_thread(_skill_call, lambda e: e.stage_text(data.decode("utf-8", errors="replace")))}
    return {"staged": await asyncio.to_thread(_skill_call, lambda e: e.stage_zip(data))}


@app.post("/api/skills/text")
async def stage_skill_text(req: SkillTextRequest):
    return {"staged": await asyncio.to_thread(_skill_call, lambda e: e.stage_text(req.skill_md))}


@app.post("/api/skills/draft")
async def draft_skill(req: SkillDraftRequest):
    """목표를 말하면 모델이 SKILL.md 원문을 쓴다. 초안도 검사와 확인을 거쳐야 설치된다."""
    import requests as _requests
    from src.core import skills as skills_engine
    if not req.goal.strip():
        raise HTTPException(status_code=400, detail="만들 스킬의 목적을 입력해 주세요.")
    system = ("너는 스킬 작성자다. 사용자가 원하는 스킬을 SKILL.md 한 개로 쓴다. "
              "첫 줄은 반드시 --- 이고, 머리말에 name(영문 소문자와 하이픈, 2~48자)과 description(언제 쓰는지, 10자 이상 한 줄)을 적고, "
              "다시 --- 로 닫는다. 그 아래에 한국어로 단계별 지침을 쓴다. 설명 문장이나 코드 울타리(```)는 쓰지 말고 SKILL.md 원문만 출력한다.")

    def ask():
        if is_production():
            return bedrock_complete([{"role": "system", "content": system},
                                     {"role": "user", "content": f"원하는 스킬: {req.goal.strip()[:1000]}"}], 1800)[0].strip()
        response = _requests.post("http://localhost:11434/api/chat", timeout=600, json={
            "model": ASSISTANT_OLLAMA_MODEL, "think": False, "stream": False,
            "messages": [{"role": "system", "content": system},
                         {"role": "user", "content": f"원하는 스킬: {req.goal.strip()[:1000]}"}],
            "options": {"temperature": 0.3, "num_predict": 1800}})
        response.raise_for_status()
        body = response.json()
        usage_ledger.record("ollama", ASSISTANT_OLLAMA_MODEL, "skill", body.get("prompt_eval_count") or 0, body.get("eval_count") or 0)
        return (body.get("message", {}).get("content") or "").strip()

    raw = await asyncio.to_thread(ask)
    text = re.sub(r"^```[a-z]*\s*|\s*```$", "", raw).strip()
    if "---" in text and not text.startswith("---"):
        text = text[text.index("---"):]
    if not text.startswith("---"):
        raise HTTPException(status_code=502, detail="초안을 만들지 못했습니다. 목적을 더 구체적으로 적어 주세요.")
    return {"staged": await asyncio.to_thread(_skill_call, lambda e: e.stage_text(text))}


@app.post("/api/skills/install")
async def install_skill(req: SkillInstallRequest):
    if not req.confirmed:
        raise HTTPException(status_code=400, detail="내용을 확인했다는 표시(confirmed)가 필요합니다.")
    return {"skill": await asyncio.to_thread(_skill_call, lambda e: e.install(req.token, req.accept_warnings))}


@app.post("/api/skills/discard")
async def discard_skill(req: SkillInstallRequest):
    from src.core import skills as skills_engine
    await asyncio.to_thread(skills_engine.discard, req.token)
    return {"ok": True}


@app.put("/api/skills/{name}")
async def toggle_skill(name: str, req: SkillToggleRequest):
    return {"skill": await asyncio.to_thread(_skill_call, lambda e: e.set_enabled(name, req.enabled))}


@app.delete("/api/skills/{name}")
async def delete_skill(name: str):
    await asyncio.to_thread(_skill_call, lambda e: e.delete(name))
    return {"ok": True}


class PluginManifestRequest(BaseModel):
    manifest: Dict[str, Any]
    confirmed: bool = False


class PluginToggleRequest(BaseModel):
    enabled: bool


class PluginTokenRequest(BaseModel):
    token: str


class PluginCallRequest(BaseModel):
    tool: str
    params: Dict[str, Any] = {}
    confirmed: bool = False


def _plugin_call(request: Request, func):
    """로그인한 계정 기준으로 플러그인 함수를 실행한다. 없는 항목은 404, 잘못된 입력은 400."""
    from src.api.feature_routes import _signed_in_email
    from src.core import plugins as plugin_engine
    email = _signed_in_email(request)
    try:
        return func(plugin_engine, email)
    except KeyError:
        raise HTTPException(status_code=404, detail="플러그인을 찾을 수 없습니다.")
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))


@app.get("/api/plugins")
async def list_plugins(request: Request):
    return {"plugins": await asyncio.to_thread(_plugin_call, request, lambda e, em: e.list_all(em))}


@app.post("/api/plugins/preview")
async def preview_plugin(req: PluginManifestRequest, request: Request):
    return await asyncio.to_thread(_plugin_call, request, lambda e, em: e.preview(em, req.manifest))


@app.post("/api/plugins/install")
async def install_plugin(req: PluginManifestRequest, request: Request):
    return {"plugin": await asyncio.to_thread(_plugin_call, request, lambda e, em: e.install(em, req.manifest, req.confirmed))}


@app.put("/api/plugins/{plugin_id}")
async def toggle_plugin(plugin_id: str, req: PluginToggleRequest, request: Request):
    return {"plugin": await asyncio.to_thread(_plugin_call, request, lambda e, em: e.set_enabled(em, plugin_id, req.enabled))}


@app.put("/api/plugins/{plugin_id}/token")
async def set_plugin_token(plugin_id: str, req: PluginTokenRequest, request: Request):
    return {"plugin": await asyncio.to_thread(_plugin_call, request, lambda e, em: e.set_token(em, plugin_id, req.token))}


@app.delete("/api/plugins/{plugin_id}")
async def remove_plugin(plugin_id: str, request: Request):
    await asyncio.to_thread(_plugin_call, request, lambda e, em: e.remove(em, plugin_id))
    return {"ok": True}


@app.post("/api/plugins/{plugin_id}/call")
async def call_plugin_tool(plugin_id: str, req: PluginCallRequest, request: Request):
    """사용자가 전송 내용을 확인하고 실행을 누른 경우에만 호출된다."""
    return {"result": await asyncio.to_thread(
        _plugin_call, request, lambda e, em: e.call_tool(em, plugin_id, req.tool, req.params, req.confirmed))}


@app.get("/api/plugins/catalog")
async def plugin_catalog():
    """추천 앱 목록. 설치는 POST /api/plugins/install 에 manifest 를 넣어 한다."""
    from src.core import plugin_examples
    return {"apps": plugin_examples.catalog()}


@app.post("/api/plugins/examples/{key}/run")
async def plugin_example_run(key: str, request: Request):
    """추천 앱의 실행 주소. 플러그인 엔진이 설치된 앱의 도구를 호출할 때 쓴다."""
    from src.core import plugin_examples
    try:
        body = await request.json()
    except ValueError:
        body = {}
    try:
        return await asyncio.to_thread(plugin_examples.run, key, body if isinstance(body, dict) else {})
    except KeyError:
        raise HTTPException(status_code=404, detail="앱을 찾을 수 없습니다.")
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))


@app.get("/api/oauth/services")
async def oauth_services_status(request: Request):
    """실제 서비스 목록과 연결 상태 (설정 여부, 연결됨, 앱 설치됨)."""
    from src.api.feature_routes import _signed_in_email
    from src.core import oauth_services
    email = _signed_in_email(request)
    return {"services": await asyncio.to_thread(oauth_services.status, email)}


@app.post("/api/oauth/{key}/start")
async def oauth_start(key: str, request: Request):
    """서비스 로그인·동의 화면 주소를 돌려준다. 프론트가 그 주소로 이동한다."""
    from src.api.feature_routes import _signed_in_email
    from src.core import oauth_services
    email = _signed_in_email(request)
    try:
        url = await asyncio.to_thread(oauth_services.start, email, key)
    except KeyError:
        raise HTTPException(status_code=404, detail="서비스를 찾을 수 없습니다.")
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))
    return {"url": url}


@app.get("/api/oauth/callback")
async def oauth_callback(request: Request, code: str = "", state: str = "", error: str = ""):
    """서비스가 동의 후 돌아오는 주소. 인증 코드를 토큰으로 바꾸고 앱을 설치한 뒤 화면으로 돌려보낸다."""
    from fastapi.responses import RedirectResponse
    from src.core import oauth_services
    if error or not code or not state:
        return RedirectResponse("/?oauth=denied")
    try:
        result = await asyncio.to_thread(oauth_services.complete, state, code)
    except ValueError as err:
        logger.warning(f"[OAuth] 연결 실패: {err}")
        return RedirectResponse("/?oauth=error")
    return RedirectResponse(f"/?oauth=ok&service={result['service']}")


@app.delete("/api/oauth/{key}")
async def oauth_disconnect(key: str, request: Request):
    """연결 해제: 토큰을 지우고 앱을 삭제한다."""
    from src.api.feature_routes import _signed_in_email
    from src.core import oauth_services
    email = _signed_in_email(request)
    await asyncio.to_thread(oauth_services.disconnect, email, key)
    return {"ok": True}


class PresentationRequest(BaseModel):
    topic: str
    audience: str = "general"
    num_slides: int = 8
    file_content: str = ""
    use_file_context: bool = False
    theme: str = "corporate"  # corporate | midnight | warm | minimal


from src.core.deck_builder import slide_from_outline as _slide_from_outline  # noqa: E402
from src.core.deck_builder import outline_system_prompt, generate_outline_slides  # noqa: E402


@app.post("/api/presentation/generate")
async def generate_presentation_from_topic(req: PresentationRequest):
    """주제(와 선택한 파일 내용)로 개요를 쓰고, 실제 .pptx 파일을 만든다. 채팅의 PPT 요청이 이 경로를 쓴다."""
    import base64
    import requests as _requests
    from pathlib import Path as _Path
    from src.core.pptx_writer import write_pptx

    topic = req.topic.strip()
    if not topic:
        raise HTTPException(status_code=400, detail="주제를 입력해 주세요.")
    slide_count = max(4, min(req.num_slides, 15))
    context = req.file_content[:12000] if req.use_file_context and req.file_content else ""
    try:
        built = await asyncio.to_thread(generate_outline_slides, topic, req.audience, slide_count, context)
    except ValueError as err:
        return {"success": False, "error": str(err)}
    title = built["title"]
    slides = built["slides"]

    file_path = _Path(".lars") / "ppt" / f"presentation-{secrets.token_hex(4)}.pptx"
    await asyncio.to_thread(write_pptx, slides, file_path, title, "", "", "", "", "", req.theme)
    data = file_path.read_bytes()
    return {"success": True, "title": title, "slides_count": len(slides), "file": str(file_path),
            "pptx_base64": base64.b64encode(data).decode("ascii")}


def _sse(payload: dict) -> str:
    return "data: " + json.dumps(payload, ensure_ascii=False) + "\n\n"


def _deck_stream(req: "PresentationRequest"):
    """개요 모델 출력을 조각으로 받아, 슬라이드가 완성될 때마다 이벤트를 보낸다. 끝나면 .pptx 를 만든다."""
    import base64
    import re as _re
    from pathlib import Path as _Path
    from src.core import deck_builder as db
    from src.core import usage_ledger as _usage
    from src.core.llm_provider import bedrock_model_name
    from src.core.pptx_writer import write_pptx

    topic = req.topic.strip()
    slide_count = max(4, min(req.num_slides, 15))
    target = slide_count - 3
    context = req.file_content[:12000] if req.use_file_context and req.file_content else ""
    system = db.outline_system_prompt(slide_count)
    user = f"주제: {topic}\n청중: {req.audience}" + (f"\n참고 자료:\n{context}" if context else "")
    usage: dict = {}
    parser = db.ContentStream()
    parts: List[str] = []
    count = 0
    title_sent = False
    yield _sse({"type": "status", "message": "개요를 쓰는 중"})
    try:
        for piece in db.stream_outline_text(system, user, usage=usage):
            parts.append(piece)
            if not title_sent:
                m = _re.search(r'"title"\s*:\s*"((?:[^"\\]|\\.)*)"', "".join(parts))
                if m:
                    title_sent = True
                    yield _sse({"type": "title", "title": json.loads('"' + m.group(1) + '"')})
            for obj in parser.feed(piece):
                if count >= target:
                    break
                count += 1
                yield _sse({"type": "slide", "index": count, "total": target, "slide": db.slide_from_outline(obj)})
        if usage.get("inputTokens") or usage.get("outputTokens"):
            _usage.record("bedrock" if is_production() else "ollama", bedrock_model_name() if is_production() else db.OLLAMA_MODEL,
                          "deck", int(usage.get("inputTokens") or 0), int(usage.get("outputTokens") or 0), True)
        try:
            outline = json.loads("".join(parts))
            built = db.assemble_deck(outline, target, topic)
        except ValueError:
            # 스트림 결과가 온전하지 않으면 일반 생성으로 다시 만든다 (장수와 형식을 확실히 맞춘다)
            built = db.generate_outline_slides(topic, req.audience, slide_count, context)
        title = built["title"]
        slides = built["slides"]
        file_path = _Path(".lars") / "ppt" / f"presentation-{secrets.token_hex(4)}.pptx"
        write_pptx(slides, file_path, title, "", "", "", "", "", req.theme)
        data = file_path.read_bytes()
        yield _sse({"type": "done", "title": title, "slides_count": len(slides),
                    "layouts": [s.get("layout") for s in slides], "file": str(file_path),
                    "pptx_base64": base64.b64encode(data).decode("ascii")})
    except Exception as err:
        logger.warning(f"[발표 생성 스트림] 실패: {err}")
        yield _sse({"type": "error", "message": str(err)[:300] or "발표 자료를 만들지 못했습니다."})


@app.post("/api/presentation/generate/stream")
async def generate_presentation_stream(req: PresentationRequest):
    """발표 자료를 만들면서 슬라이드가 완성되는 대로 서버 전송 이벤트(SSE)로 보낸다."""
    if not req.topic.strip():
        raise HTTPException(status_code=400, detail="주제를 입력해 주세요.")
    return StreamingResponse(_deck_stream(req), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@app.get("/api/billing/summary")
async def billing_summary():
    """이번 달 토큰 사용량과 추정 비용. 결제 연동 정보는 아직 없어서 연결 상태만 알려 준다."""
    data = await asyncio.to_thread(usage_ledger.summary)
    data["session"] = {"start": usage_ledger.SESSION_START.isoformat(timespec="seconds"), "totals": await asyncio.to_thread(usage_ledger.session_totals)}
    data["week"] = await asyncio.to_thread(usage_ledger.week_totals)
    data["limits"] = usage_ledger.limits()
    data["billing"] = {
        "connected": False,
        "note": "결제 서버와 연동되어 있지 않아 실제 청구 내역은 표시할 수 없습니다. 아래 금액은 이 기기에서 기록한 사용량 기준 추정치입니다.",
    }
    return data


@app.get("/api/console/overview")
async def console_overview(http_request: Request, range: str = "7d"):
    """Prism 콘솔: 이번 달·최근 7일·세션 사용량, 기간별 추이(24h/7d/14d/30d), 한도, 결제 연동 상태. 로그인한 사용자만 본다."""
    from src.api.feature_routes import _signed_in_email
    owner = _signed_in_email(http_request)
    if range not in ("24h", "7d", "14d", "30d"):
        range = "7d"
    month = await asyncio.to_thread(usage_ledger.summary)
    # 한도에 닿았으면 이 사용자의 웹훅으로 알린다 (같은 기간에는 한 번만).
    from src.core import console_store
    limits_now = usage_ledger.limits()
    month_tokens = month["totals"]["input_tokens"] + month["totals"]["output_tokens"]
    if limits_now.get("monthly_tokens") and month_tokens >= limits_now["monthly_tokens"]:
        period = datetime.now().strftime("%Y-%m")
        console_store.notify_limit_reached(owner, "monthly_tokens", period, month_tokens, limits_now["monthly_tokens"])
    return {
        "range": range,
        "month": month,
        "week": await asyncio.to_thread(usage_ledger.week_totals),
        "session": await asyncio.to_thread(usage_ledger.session_totals),
        "series": await asyncio.to_thread(usage_ledger.series, range),
        "catalog": usage_ledger.CATALOG_MODELS,
        "limits": usage_ledger.limits(),
        "billing": {"connected": False},
        "scope": "이 서버가 기록한 사용량입니다. 사용자별 집계가 아니며 실제 청구 내역이 아닙니다.",
    }


@app.get("/api/console/logs")
async def console_logs(http_request: Request, limit: int = 50):
    """최근 API·모델 호출 기록 (최신순). 프롬프트·응답 내용은 저장하지 않으므로 여기에도 없다."""
    from src.api.feature_routes import _signed_in_email
    _signed_in_email(http_request)
    rows = await asyncio.to_thread(usage_ledger.recent, limit)
    # 키 ID는 다른 사용자의 키를 가리킬 수 있으므로 내보내지 않고, API 호출 여부만 남긴다.
    for r in rows:
        r["via_api"] = bool(r.pop("key_id", None))
    return {"rows": rows}


@app.get("/api/console/updates")
async def console_updates(http_request: Request):
    """CHANGELOG.md에서 최근 릴리스 제목과 항목을 뽑는다."""
    from src.api.feature_routes import _signed_in_email
    _signed_in_email(http_request)
    entries = []
    try:
        text = Path("CHANGELOG.md").read_text(encoding="utf-8")
    except OSError:
        return {"entries": []}
    current = None
    for line in text.splitlines():
        if line.startswith("## ["):
            if current:
                entries.append(current)
            head = line[3:].strip()
            current = {"title": head, "items": []}
        elif current and line.strip().startswith("- ") and len(current["items"]) < 4:
            current["items"].append(line.strip()[2:][:160])
    if current:
        entries.append(current)
    return {"entries": entries[:6]}


from src.api.lars_api_routes import v1 as _lars_v1, keys_router as _lars_keys_router, console_router as _lars_console_router, agents_router as _lars_agents_router, prism_router as _lars_prism_router, _console_prism as _lars_console_prism
app.include_router(_lars_v1)
app.include_router(_lars_keys_router)
app.include_router(_lars_console_router)
app.include_router(_lars_agents_router)
app.include_router(_lars_prism_router)
app.include_router(_lars_console_prism)


@app.post("/api/feedback")
async def save_feedback(req: FeedbackRequest):
    """답변 좋아요/싫어요를 .lars/feedback.jsonl에 남긴다 (평가·학습 데이터용)."""
    if req.rating not in ("like", "dislike"):
        raise HTTPException(status_code=400, detail="rating은 like 또는 dislike 이어야 합니다")
    path = Path(".lars") / "feedback.jsonl"
    path.parent.mkdir(parents=True, exist_ok=True)
    row = {"ts": datetime.now().isoformat(timespec="seconds"), "message_id": req.message_id,
           "rating": req.rating, "text": req.text[:4000]}
    with path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(row, ensure_ascii=False) + "\n")
    return {"ok": True}


class DevRunRequest(BaseModel):
    workspace: str
    goal: str
    max_steps: int = 8


class DevProposal(BaseModel):
    path: str
    search: str
    replace: str


class DevApplyRequest(BaseModel):
    workspace: str
    proposals: List[DevProposal]


@app.post("/api/dev/run")
async def dev_run(req: DevRunRequest):
    """개발 환경: 작업 폴더를 샌드박스에 복사해 에이전트가 읽고 검증한 뒤, 원본 수정 제안만 돌려준다."""
    from src.core.code_agent import CodeAgent, LLMClient, Workspace, create_sandbox, diff_text, remove_sandbox

    root = Path(req.workspace).expanduser()
    if not req.goal.strip():
        raise HTTPException(status_code=400, detail="작업 내용을 입력해 주세요.")
    if not root.is_dir():
        raise HTTPException(status_code=400, detail=f"작업 폴더가 없습니다: {req.workspace}")

    def work():
        workspace = Workspace(root)
        sandbox = create_sandbox(workspace.root)
        try:
            # 개발 환경 기본: 로컬 gemma4 31B (DEV_AGENT_PROVIDER=claude 로 바꿀 수 있음)
            os.environ.setdefault("PRISM_AGENT_OLLAMA_MODEL", "gemma4:31b")
            llm = LLMClient(os.getenv("DEV_AGENT_PROVIDER", "ollama"))
            result = CodeAgent(workspace, llm, max_steps=max(1, min(req.max_steps, 15)), sandbox=sandbox).run(req.goal)
        finally:
            remove_sandbox(sandbox)
        proposals = []
        for p in result.proposals:
            original = workspace.resolve(p.path).read_text(encoding="utf-8", errors="replace") if workspace.resolve(p.path).exists() else ""
            proposals.append({"path": p.path, "search": p.search, "replace": p.replace, "diff": diff_text(p, original)})
        return {"summary": result.summary, "steps": result.steps, "error": result.error, "proposals": proposals,
                "workspace": str(workspace.root)}

    try:
        return await asyncio.to_thread(work)
    except RuntimeError as err:
        raise HTTPException(status_code=503, detail=str(err))


@app.post("/api/dev/apply")
async def dev_apply(req: DevApplyRequest):
    """사용자가 확인한 수정 제안만 원본 폴더에 적용한다. 적용 전 원본은 백업한다."""
    from src.core.code_agent import EditProposal, SafetyError, Workspace, apply_proposal

    root = Path(req.workspace).expanduser()
    if not root.is_dir():
        raise HTTPException(status_code=400, detail="작업 폴더가 없습니다.")
    workspace = Workspace(root)
    backup_dir = root / ".lars" / "backups" / datetime.now().strftime("%Y%m%d-%H%M%S")
    backup_dir.mkdir(parents=True, exist_ok=True)
    results = []
    for p in req.proposals:
        try:
            message = apply_proposal(workspace, EditProposal(path=p.path, search=p.search, replace=p.replace), backup_dir)
            results.append({"path": p.path, "ok": True, "message": message})
        except SafetyError as err:
            results.append({"path": p.path, "ok": False, "message": str(err)})
        except Exception as err:
            results.append({"path": p.path, "ok": False, "message": f"적용 실패: {err}"})
    return {"results": results, "backup": str(backup_dir)}


class ShareMessage(BaseModel):
    role: str
    content: str


class ShareRequest(BaseModel):
    title: str = "대화"
    messages: List[ShareMessage]


SHARE_DIR = Path(".lars") / "shares"


@app.post("/api/share")
async def create_share(req: ShareRequest):
    """대화를 공유 링크로 저장한다. 링크를 아는 사람만 읽을 수 있다 (추측 불가능한 id)."""
    import html as _html  # noqa: F401  (읽기 페이지에서 사용)
    if not req.messages:
        raise HTTPException(status_code=400, detail="공유할 대화가 없습니다")
    share_id = uuid.uuid4().hex
    SHARE_DIR.mkdir(parents=True, exist_ok=True)
    payload = {"title": req.title[:120], "created": datetime.now().isoformat(timespec="seconds"),
               "messages": [m.model_dump() for m in req.messages[-200:]]}
    (SHARE_DIR / f"{share_id}.json").write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    return {"id": share_id, "path": f"/share/{share_id}"}


@app.get("/api/share/{share_id}", response_class=HTMLResponse)
async def read_share(share_id: str):
    """공유된 대화를 읽기 전용 페이지로 보여 준다."""
    import html as _html
    if not re.fullmatch(r"[0-9a-f]{32}", share_id):
        raise HTTPException(status_code=404, detail="Not Found")
    path = SHARE_DIR / f"{share_id}.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Not Found")
    data = json.loads(path.read_text(encoding="utf-8"))
    items = []
    for m in data["messages"]:
        who = "사용자" if m["role"] == "user" else "Forge · Prism AI"
        items.append(f'<div class="m {m["role"]}"><div class="who">{_html.escape(who)}</div><div class="txt">{_html.escape(m["content"])}</div></div>')
    page = f"""<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{_html.escape(data['title'])} · LARS Prism</title>
<style>body{{margin:0;background:#0a0a0c;color:#e5e7eb;font-family:-apple-system,system-ui,sans-serif}}
main{{max-width:760px;margin:0 auto;padding:32px 16px}} h1{{font-size:20px}} .meta{{color:#94a3b8;font-size:12px;margin-bottom:24px}}
.m{{margin:14px 0;padding:14px 16px;border-radius:14px;background:#17171a;border:1px solid #26262b;white-space:pre-wrap;line-height:1.6}}
.m.user{{background:#1e1f2b}} .who{{font-size:12px;font-weight:700;color:#a5b4fc;margin-bottom:6px}}</style></head>
<body><main><h1>{_html.escape(data['title'])}</h1><div class="meta">LARS Prism · 공유된 대화 (읽기 전용) · {_html.escape(data['created'])}</div>{''.join(items)}</main></body></html>"""
    return HTMLResponse(page)


class ResearchRequest(BaseModel):
    question: str
    max_sources: int = 4


@app.post("/api/research")
async def deep_research(req: ResearchRequest):
    """심층 리서치: 웹에서 출처를 찾아 읽고, 출처 번호를 붙인 보고서를 만든다."""
    from src.core import web_tools

    question = req.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="조사할 질문을 입력해 주세요.")
    count = max(1, min(req.max_sources, 6))
    try:
        hits = await asyncio.to_thread(web_tools.search_web, question, count)
    except web_tools.WebToolError as err:
        raise HTTPException(status_code=503, detail=f"{err} (.env의 BRAVE_SEARCH_API_KEY 설정이 필요합니다)")
    if not hits:
        raise HTTPException(status_code=404, detail="검색 결과가 없습니다.")

    async def read(hit):
        try:
            text = await asyncio.to_thread(web_tools.fetch_page_text, hit["url"])
        except Exception:
            text = ""
        return (text or hit.get("snippet", ""))[:3000]

    texts = await asyncio.gather(*(read(h) for h in hits[:count]))
    sources = [{"title": h["title"], "url": h["url"]} for h in hits[:count]]
    context = "\n\n".join(f"[{i + 1}] {src['title']} ({src['url']})\n{txt}" for i, (src, txt) in enumerate(zip(sources, texts)))
    messages = [
        {"role": "system", "content": "너는 리서치 분석가다. 아래 출처 내용만 근거로 한국어 보고서를 쓴다. "
                                      "각 사실 뒤에 출처 번호를 [1], [2]처럼 붙인다. 출처에 없는 내용은 '출처에서 확인되지 않음'이라고 쓴다. "
                                      "구성: 요약, 주요 내용(항목별), 불확실한 점."},
        {"role": "user", "content": f"질문: {question}\n\n출처:\n{context}"},
    ]

    def ask_model():
        import requests as _requests
        if is_production():
            return bedrock_complete(messages, 1800)[0].strip()
        response = _requests.post("http://localhost:11434/api/chat", timeout=600, json={
            "model": ASSISTANT_OLLAMA_MODEL, "messages": messages, "stream": False, "think": False,
            "options": {"temperature": 0.3, "num_predict": 1800}})
        response.raise_for_status()
        return (response.json().get("message", {}).get("content") or "").strip()

    try:
        report = await asyncio.to_thread(ask_model)
    except Exception as err:
        raise HTTPException(status_code=502, detail=f"보고서 생성 실패: {err}")
    return {"report": report, "sources": sources}


CONNECTORS_FILE = Path(".lars") / "connectors.json"


def _load_connectors() -> dict:
    if CONNECTORS_FILE.exists():
        try:
            return json.loads(CONNECTORS_FILE.read_text(encoding="utf-8"))
        except ValueError:
            return {}
    return {}


class ConnectorUpdate(BaseModel):
    slack_webhook: Optional[str] = None
    github_token: Optional[str] = None


class SlackSend(BaseModel):
    text: str


@app.get("/api/connectors")
async def get_connectors():
    """연결 상태만 돌려준다. 토큰과 웹훅 주소는 응답에 넣지 않는다."""
    data = _load_connectors()
    return {"slack": bool(data.get("slack_webhook")), "github": bool(data.get("github_token"))}


@app.put("/api/connectors")
async def update_connectors(req: ConnectorUpdate):
    data = _load_connectors()
    if req.slack_webhook is not None:
        value = req.slack_webhook.strip()
        if value and not value.startswith("https://hooks.slack.com/"):
            raise HTTPException(status_code=400, detail="Slack 웹훅 주소는 https://hooks.slack.com/ 으로 시작해야 합니다.")
        data["slack_webhook"] = value
    if req.github_token is not None:
        data["github_token"] = req.github_token.strip()
    CONNECTORS_FILE.parent.mkdir(parents=True, exist_ok=True)
    CONNECTORS_FILE.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    try:
        os.chmod(CONNECTORS_FILE, 0o600)
    except OSError:
        pass
    return {"ok": True, "slack": bool(data.get("slack_webhook")), "github": bool(data.get("github_token"))}


@app.post("/api/connectors/slack/send")
async def slack_send(req: SlackSend):
    import requests as _requests
    hook = _load_connectors().get("slack_webhook", "")
    if not hook:
        raise HTTPException(status_code=400, detail="Slack 웹훅이 설정되지 않았습니다.")
    text = req.text.strip()[:3000]
    if not text:
        raise HTTPException(status_code=400, detail="보낼 내용이 없습니다.")
    response = await asyncio.to_thread(_requests.post, hook, json={"text": text}, timeout=20)
    if response.status_code >= 300:
        raise HTTPException(status_code=502, detail=f"Slack 전송 실패 ({response.status_code})")
    return {"ok": True}


@app.get("/api/connectors/github/issues")
async def github_issues(repo: str):
    import requests as _requests
    token = _load_connectors().get("github_token", "")
    if not token:
        raise HTTPException(status_code=400, detail="GitHub 토큰이 설정되지 않았습니다.")
    if not re.fullmatch(r"[\w.-]+/[\w.-]+", repo):
        raise HTTPException(status_code=400, detail="저장소는 owner/name 형식이어야 합니다.")
    response = await asyncio.to_thread(
        _requests.get, f"https://api.github.com/repos/{repo}/issues",
        headers={"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"},
        params={"state": "open", "per_page": 20}, timeout=20)
    if response.status_code >= 300:
        raise HTTPException(status_code=502, detail=f"GitHub 조회 실패 ({response.status_code})")
    return {"issues": [{"number": i["number"], "title": i["title"], "url": i["html_url"]} for i in response.json() if "pull_request" not in i]}


SCHEDULES_FILE = Path(".lars") / "chat_schedules.json"
SCHEDULE_INTERVALS = {60, 360, 1440, 10080}  # 1시간, 6시간, 하루, 일주일 (분)


def _load_schedules() -> list:
    if SCHEDULES_FILE.exists():
        try:
            return json.loads(SCHEDULES_FILE.read_text(encoding="utf-8"))
        except ValueError:
            return []
    return []


def _save_schedules(items: list) -> None:
    SCHEDULES_FILE.parent.mkdir(parents=True, exist_ok=True)
    SCHEDULES_FILE.write_text(json.dumps(items, ensure_ascii=False, indent=2), encoding="utf-8")


class ScheduleCreate(BaseModel):
    prompt: str
    every_minutes: int = 1440


def _run_scheduled_prompt(prompt: str) -> str:
    """예약 작업 한 번 실행: 기본 채팅 모델로 답을 받는다 (사고 과정 끔)."""
    import requests as _requests
    if is_production():
        return bedrock_complete([{"role": "system", "content": "당신은 LARS Prism AI 어시스턴트입니다. 한국어로 간결하게 답변하세요."},
                                 {"role": "user", "content": prompt}], 1500)[0].strip()
    response = _requests.post("http://localhost:11434/api/chat", timeout=600, json={
        "model": ASSISTANT_OLLAMA_MODEL, "think": False, "stream": False,
        "messages": [{"role": "system", "content": "당신은 LARS Prism AI 어시스턴트입니다. 한국어로 간결하게 답변하세요."},
                     {"role": "user", "content": prompt}],
        "options": {"temperature": 0.4, "num_predict": 1200}})
    response.raise_for_status()
    body = response.json()
    usage_ledger.record("ollama", ASSISTANT_OLLAMA_MODEL, "schedule", body.get("prompt_eval_count") or 0, body.get("eval_count") or 0)
    return (body.get("message", {}).get("content") or "").strip()


async def _schedule_loop():
    """1분마다 기한이 된 예약 작업을 실행하고 결과를 저장한다."""
    while True:
        try:
            now = datetime.now()
            items = _load_schedules()
            changed = False
            for item in items:
                if not item.get("enabled", True):
                    continue
                last = item.get("last_run")
                due = last is None or (now - datetime.fromisoformat(last)).total_seconds() >= item["every_minutes"] * 60
                if due:
                    try:
                        item["last_result"] = await asyncio.to_thread(_run_scheduled_prompt, item["prompt"])
                        item["last_error"] = ""
                    except Exception as err:
                        item["last_error"] = str(err)[:300]
                    item["last_run"] = now.isoformat(timespec="seconds")
                    changed = True
            if changed:
                _save_schedules(items)
        except Exception as err:
            logger.warning(f"[SCHEDULE] 실행 루프 오류: {err}")
        await asyncio.sleep(60)


@app.on_event("startup")
async def start_schedule_loop():
    asyncio.create_task(_schedule_loop())


class AgentCreateRequest(BaseModel):
    goal: str


class AgentAnswerRequest(BaseModel):
    answer: str


async def _agent_loop():
    """15초마다 실행 중인 자율 에이전트를 한 단계씩 진행한다."""
    from src.core import agents as agent_engine
    while True:
        try:
            await asyncio.to_thread(agent_engine.run_pending_steps)
        except Exception as err:
            logger.warning(f"[AGENT] 실행 루프 오류: {err}")
        await asyncio.sleep(15)


@app.on_event("startup")
async def start_agent_loop():
    asyncio.create_task(_agent_loop())


def _agent_call(func, *args):
    from src.core import agents as agent_engine
    try:
        return func(agent_engine, *args)
    except KeyError:
        raise HTTPException(status_code=404, detail="에이전트를 찾을 수 없습니다.")
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))


@app.get("/api/agents")
async def list_agents():
    from src.core import agents as agent_engine
    return {"agents": await asyncio.to_thread(agent_engine.list_all)}


@app.post("/api/agents")
async def create_agent(req: AgentCreateRequest):
    from src.core import agents as agent_engine
    if not req.goal.strip():
        raise HTTPException(status_code=400, detail="목표를 입력해 주세요.")
    agent = await asyncio.to_thread(agent_engine.create, req.goal)
    return {"agent": agent}


@app.get("/api/agents/{agent_id}")
async def get_agent(agent_id: str):
    return {"agent": await asyncio.to_thread(_agent_call, lambda e: e.load(agent_id))}


@app.post("/api/agents/{agent_id}/answer")
async def answer_agent(agent_id: str, req: AgentAnswerRequest):
    if not req.answer.strip():
        raise HTTPException(status_code=400, detail="답변을 입력해 주세요.")
    return {"agent": await asyncio.to_thread(_agent_call, lambda e: e.answer(agent_id, req.answer))}


@app.post("/api/agents/{agent_id}/pause")
async def pause_agent(agent_id: str):
    return {"agent": await asyncio.to_thread(_agent_call, lambda e: e.set_status(agent_id, "paused"))}


@app.post("/api/agents/{agent_id}/resume")
async def resume_agent(agent_id: str):
    return {"agent": await asyncio.to_thread(_agent_call, lambda e: e.set_status(agent_id, "running"))}


@app.delete("/api/agents/{agent_id}")
async def delete_agent(agent_id: str):
    await asyncio.to_thread(_agent_call, lambda e: e.delete(agent_id))
    return {"ok": True}


class BrowserTaskCreate(BaseModel):
    goal: str
    allowed_domains: List[str]
    start_url: str = ""


class BrowserAnswerRequest(BaseModel):
    answer: str


class BrowserApproveRequest(BaseModel):
    approve: bool


def _browser_call(func, *args):
    from src.core import browser_agent as engine
    try:
        return func(engine, *args)
    except KeyError:
        raise HTTPException(status_code=404, detail="작업을 찾을 수 없습니다.")
    except RuntimeError as err:
        raise HTTPException(status_code=409, detail=str(err))
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))


@app.on_event("startup")
async def recover_browser_tasks():
    from src.core import browser_agent as engine
    engine.recover_interrupted()


@app.get("/api/browser-tasks")
async def list_browser_tasks():
    from src.core import browser_agent as engine
    return {"tasks": await asyncio.to_thread(engine.list_all)}


@app.post("/api/browser-tasks")
async def create_browser_task(req: BrowserTaskCreate):
    if not req.goal.strip():
        raise HTTPException(status_code=400, detail="목표를 입력해 주세요.")
    task = await asyncio.to_thread(_browser_call, lambda e: e.create(req.goal, req.allowed_domains, req.start_url))
    return {"task": task}


@app.get("/api/browser-tasks/{task_id}")
async def get_browser_task(task_id: str):
    return {"task": await asyncio.to_thread(_browser_call, lambda e: e.load(task_id))}


@app.post("/api/browser-tasks/{task_id}/answer")
async def answer_browser_task(task_id: str, req: BrowserAnswerRequest):
    if not req.answer.strip():
        raise HTTPException(status_code=400, detail="답변을 입력해 주세요.")
    return {"task": await asyncio.to_thread(_browser_call, lambda e: e.answer(task_id, req.answer))}


@app.post("/api/browser-tasks/{task_id}/approve")
async def approve_browser_task(task_id: str, req: BrowserApproveRequest):
    return {"task": await asyncio.to_thread(_browser_call, lambda e: e.approve(task_id, req.approve))}


@app.post("/api/browser-tasks/{task_id}/pause")
async def pause_browser_task(task_id: str):
    return {"task": await asyncio.to_thread(_browser_call, lambda e: e.set_status(task_id, "paused"))}


@app.post("/api/browser-tasks/{task_id}/resume")
async def resume_browser_task(task_id: str):
    return {"task": await asyncio.to_thread(_browser_call, lambda e: e.set_status(task_id, "running"))}


@app.post("/api/browser-tasks/{task_id}/stop")
async def stop_browser_task(task_id: str):
    return {"task": await asyncio.to_thread(_browser_call, lambda e: e.set_status(task_id, "stopped"))}


@app.delete("/api/browser-tasks/{task_id}")
async def delete_browser_task(task_id: str):
    await asyncio.to_thread(_browser_call, lambda e: e.delete(task_id))
    return {"ok": True}


@app.get("/api/schedules")
async def list_schedules():
    return {"schedules": _load_schedules()}


@app.post("/api/schedules")
async def create_schedule(req: ScheduleCreate):
    prompt = req.prompt.strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="예약할 질문을 입력해 주세요.")
    if req.every_minutes not in SCHEDULE_INTERVALS:
        raise HTTPException(status_code=400, detail="실행 주기는 1시간, 6시간, 하루, 일주일 중 하나여야 합니다.")
    items = _load_schedules()
    item = {"id": uuid.uuid4().hex[:10], "prompt": prompt[:1000], "every_minutes": req.every_minutes,
            "created": datetime.now().isoformat(timespec="seconds"), "enabled": True,
            "last_run": None, "last_result": "", "last_error": ""}
    items.append(item)
    _save_schedules(items)
    return item


@app.delete("/api/schedules/{schedule_id}")
async def delete_schedule(schedule_id: str):
    items = _load_schedules()
    remaining = [i for i in items if i["id"] != schedule_id]
    if len(remaining) == len(items):
        raise HTTPException(status_code=404, detail="Not Found")
    _save_schedules(remaining)
    return {"ok": True}


class DeployPlanRequest(BaseModel):
    folder: str
    provider: str
    method: str = "static"
    name: str
    region: str = ""
    project: str = ""


class DeployExecuteRequest(BaseModel):
    plan_id: str
    confirmed: bool = False


@app.get("/api/deploy/tools")
async def deploy_tools():
    from src.core.cloud_deploy import tool_status
    return {"tools": await asyncio.to_thread(tool_status)}


@app.post("/api/deploy/plan")
async def deploy_plan(req: DeployPlanRequest):
    """배포 계획만 만든다. 클라우드 리소스는 만들지 않는다."""
    from src.core.cloud_deploy import make_plan
    try:
        plan = await asyncio.to_thread(make_plan, req.folder, req.provider, req.region, req.method, req.name, req.project)
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))
    return {"plan": plan}


@app.post("/api/deploy/execute")
async def deploy_execute(req: DeployExecuteRequest):
    """확인 표시(confirmed)가 있을 때만 계획을 실행한다."""
    from src.core.cloud_deploy import start_job
    if not req.confirmed:
        raise HTTPException(status_code=400, detail="계획을 확인했다는 표시(confirmed)가 필요합니다.")
    try:
        job = start_job(req.plan_id)
    except KeyError as err:
        raise HTTPException(status_code=404, detail=str(err))
    return {"job": job}


@app.get("/api/deploy/jobs/{job_id}")
async def deploy_job(job_id: str):
    from src.core.cloud_deploy import get_job
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Not Found")
    return {"job": job}


@app.post("/api/route/chat")
async def route_chat(request: RouteChatRequest):
    """사이드 메뉴 탭에 맞는 LARS 엔진으로 요청을 처리한다."""
    from src.core.model_router import engine_for_tab, run_engine

    message = request.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="메시지가 비어있습니다")
    engine = engine_for_tab(request.tab)
    if engine is None:
        raise HTTPException(status_code=404, detail=f"라우팅 대상이 아닌 탭입니다: {request.tab}")
    try:
        return await asyncio.to_thread(run_engine, engine, message, request.history)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))


# ==================== Ecosystem API ====================

@app.get("/api/ecosystem/agents/available")
async def get_available_agents():
    """이용 가능한 에이전트 목록"""
    try:
        from src.core.ecosystem import lars_ecosystem
        agents = lars_ecosystem.discover_agents()
        logger.info(f"[Ecosystem] {len(agents)}개 에이전트 발견")
        return {
            "success": True,
            "agents": agents,
            "total": len(agents)
        }
    except Exception as e:
        logger.error(f"[Ecosystem] 에이전트 발견 오류: {e}")
        return {
            "success": False,
            "error": str(e),
            "agents": []
        }


@app.get("/api/ecosystem/agents/installed")
async def get_installed_agents():
    """설치된 에이전트 목록"""
    try:
        from src.core.ecosystem import lars_ecosystem
        agents = lars_ecosystem.get_installed_agents()
        logger.info(f"[Ecosystem] {len(agents)}개 설치된 에이전트")
        return {
            "success": True,
            "agents": agents,
            "total": len(agents)
        }
    except Exception as e:
        logger.error(f"[Ecosystem] 설치된 에이전트 조회 오류: {e}")
        return {
            "success": False,
            "error": str(e),
            "agents": []
        }


@app.get("/api/ecosystem/agents/enabled")
async def get_enabled_agents():
    """활성화된 에이전트 목록"""
    try:
        from src.core.ecosystem import lars_ecosystem
        agents = lars_ecosystem.get_enabled_agents()
        logger.info(f"[Ecosystem] {len(agents)}개 활성화된 에이전트")
        return {
            "success": True,
            "agents": agents,
            "total": len(agents)
        }
    except Exception as e:
        logger.error(f"[Ecosystem] 활성화된 에이전트 조회 오류: {e}")
        return {
            "success": False,
            "error": str(e),
            "agents": []
        }


@app.post("/api/ecosystem/agents/{agent_id}/install")
async def install_agent(agent_id: str):
    """에이전트 설치"""
    try:
        from src.core.ecosystem import lars_ecosystem
        result = lars_ecosystem.install_agent(agent_id)
        logger.info(f"[Ecosystem] 에이전트 설치: {agent_id} - {result.get('status', 'success')}")
        return result
    except Exception as e:
        logger.error(f"[Ecosystem] 에이전트 설치 오류: {e}")
        return {
            "success": False,
            "error": str(e)
        }


@app.post("/api/ecosystem/agents/{agent_id}/enable")
async def enable_agent(agent_id: str):
    """에이전트 활성화"""
    try:
        from src.core.ecosystem import lars_ecosystem
        result = lars_ecosystem.enable_agent(agent_id)
        logger.info(f"[Ecosystem] 에이전트 활성화: {agent_id}")
        return result
    except Exception as e:
        logger.error(f"[Ecosystem] 에이전트 활성화 오류: {e}")
        return {
            "success": False,
            "error": str(e)
        }


@app.post("/api/ecosystem/agents/{agent_id}/disable")
async def disable_agent(agent_id: str):
    """에이전트 비활성화"""
    try:
        from src.core.ecosystem import lars_ecosystem
        result = lars_ecosystem.disable_agent(agent_id)
        logger.info(f"[Ecosystem] 에이전트 비활성화: {agent_id}")
        return result
    except Exception as e:
        logger.error(f"[Ecosystem] 에이전트 비활성화 오류: {e}")
        return {
            "success": False,
            "error": str(e)
        }


# ==================== Deployment API ====================

@app.get("/api/deployment/configs")
async def get_deployment_configs():
    """배포 설정 목록 조회"""
    try:
        # 데모 데이터 반환 (실제로는 DB에서 조회)
        configs = [
            {
                "id": "deploy-1",
                "name": "프로덕션 배포",
                "provider": "aws",
                "region": "ap-northeast-1",
                "instanceType": "t2.medium",
                "status": "deployed",
                "lastDeployed": "2026-09-16 14:30:00",
                "url": "https://lars-prism-prod.ap-northeast-1.compute.amazonaws.com"
            }
        ]
        return {
            "success": True,
            "configs": configs
        }
    except Exception as e:
        logger.error(f"[Deployment] 설정 조회 오류: {e}")
        return {
            "success": False,
            "error": str(e),
            "configs": []
        }


@app.post("/api/deployment/deploy")
async def deploy_project(request: Request):
    """프로젝트 배포"""
    try:
        data = await request.json()

        name = data.get("name")
        provider = data.get("provider")
        region = data.get("region")
        apiKey = data.get("apiKey")
        secretKey = data.get("secretKey")

        if not all([name, provider, region, apiKey, secretKey]):
            return {
                "success": False,
                "error": "필수 정보가 누락되었습니다"
            }

        logger.info(f"[Deployment] 배포 시작: {name} on {provider}")

        # 실제 배포 로직 (데모)
        import asyncio
        await asyncio.sleep(2)

        deployment_url = f"https://lars-{name.lower()}-{provider}.{region}.deploy.com"

        logger.info(f"[Deployment] ✅ 배포 완료: {deployment_url}")

        return {
            "success": True,
            "message": f"{name} 프로젝트가 {provider}({region})에 배포되었습니다",
            "url": deployment_url,
            "provider": provider,
            "region": region,
            "status": "deployed"
        }

    except Exception as e:
        logger.error(f"[Deployment] 배포 오류: {e}")
        return {
            "success": False,
            "error": str(e)
        }


@app.post("/api/deployment/redeploy/{deployment_id}")
async def redeploy_project(deployment_id: str):
    """프로젝트 재배포"""
    try:
        logger.info(f"[Deployment] 재배포 시작: {deployment_id}")

        import asyncio
        await asyncio.sleep(2)

        return {
            "success": True,
            "message": "재배포가 완료되었습니다",
            "deployment_id": deployment_id,
            "status": "deployed"
        }

    except Exception as e:
        logger.error(f"[Deployment] 재배포 오류: {e}")
        return {
            "success": False,
            "error": str(e)
        }


@app.delete("/api/deployment/{deployment_id}")
async def delete_deployment(deployment_id: str):
    """배포 삭제"""
    try:
        logger.info(f"[Deployment] 배포 삭제: {deployment_id}")

        return {
            "success": True,
            "message": "배포가 삭제되었습니다",
            "deployment_id": deployment_id
        }

    except Exception as e:
        logger.error(f"[Deployment] 삭제 오류: {e}")
        return {
            "success": False,
            "error": str(e)
        }


@app.post("/api/ecosystem/agents/{agent_id}/uninstall")
async def uninstall_agent(agent_id: str):
    """에이전트 제거"""
    try:
        from src.core.ecosystem import lars_ecosystem
        result = lars_ecosystem.uninstall_agent(agent_id)
        logger.info(f"[Ecosystem] 에이전트 제거: {agent_id}")
        return result
    except Exception as e:
        logger.error(f"[Ecosystem] 에이전트 제거 오류: {e}")
        return {
            "success": False,
            "error": str(e)
        }


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
