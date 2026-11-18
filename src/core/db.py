"""데이터베이스 연결 및 세션 관리"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool
import os
from dotenv import load_dotenv
import logging

load_dotenv()

logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/lars"
)

# 데이터베이스 엔진 생성
engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Session:
    """데이터베이스 세션 획득"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """데이터베이스 테이블 생성"""
    from src.core.models import Base

    try:
        Base.metadata.create_all(bind=engine)
        logger.info("✓ 데이터베이스 테이블 생성 완료")
    except Exception as e:
        logger.error(f"✗ 데이터베이스 테이블 생성 실패: {e}")
        raise


def seed_initial_data():
    """초기 데이터 추가"""
    from src.core.models import PPTTemplate

    db = SessionLocal()
    try:
        # 기존 템플릿 확인
        existing = db.query(PPTTemplate).first()
        if existing:
            return

        templates = [
            PPTTemplate(name="Modern Blue", category="Business", slides=12, usage=245, icon="💼", featured=True),
            PPTTemplate(name="Startup", category="Pitch", slides=10, usage=189, icon="🚀", featured=True),
            PPTTemplate(name="Academic", category="Education", slides=8, usage=92, icon="📚", featured=False),
            PPTTemplate(name="Creative", category="Design", slides=15, usage=167, icon="🎨", featured=False),
        ]

        db.add_all(templates)
        db.commit()
        logger.info(f"✓ {len(templates)}개의 초기 템플릿 추가 완료")
    except Exception as e:
        db.rollback()
        logger.error(f"✗ 초기 데이터 추가 실패: {e}")
    finally:
        db.close()
