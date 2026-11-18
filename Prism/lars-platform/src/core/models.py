"""LARS Prism 데이터베이스 모델"""

from sqlalchemy import Column, String, Integer, Float, DateTime, Boolean, JSON, ForeignKey, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import event
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()


class Presentation(Base):
    """프레젠테이션 모델"""
    __tablename__ = "presentations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    slides = Column(Integer, default=0)
    status = Column(String(50), default="draft")  # draft, generating, completed
    template = Column(String(255), default="Blank")
    size = Column(String(50), default="0KB")
    created = Column(DateTime, default=datetime.utcnow)
    updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    download_count = Column(Integer, default=0)
    user_id = Column(String(255), nullable=True)
    meta_info = Column("metadata_info", JSON, default={})

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "slides": self.slides,
            "status": self.status,
            "template": self.template,
            "size": self.size,
            "created": self.created.strftime("%Y-%m-%d"),
            "downloadCount": self.download_count,
        }


class Theme(Base):
    """디자인 테마 모델"""
    __tablename__ = "themes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    category = Column(String(100), default="Custom")
    slides = Column(Integer, default=0)
    usage = Column(Integer, default=0)
    colors = Column(JSON, default=[])  # 색상 배열
    created = Column(DateTime, default=datetime.utcnow)
    updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    user_id = Column(String(255), nullable=True)
    meta_info = Column("metadata_info", JSON, default={})

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "category": self.category,
            "slides": self.slides,
            "usage": self.usage,
            "colors": self.colors,
        }


class PPTTemplate(Base):
    """PPT 템플릿 모델"""
    __tablename__ = "ppt_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    category = Column(String(100))
    slides = Column(Integer, default=0)
    usage = Column(Integer, default=0)
    icon = Column(String(50))
    featured = Column(Boolean, default=False)
    created = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "category": self.category,
            "slides": self.slides,
            "usage": self.usage,
            "icon": self.icon,
            "featured": self.featured,
        }


class OCRJob(Base):
    """OCR 작업 모델"""
    __tablename__ = "ocr_jobs"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    file_path = Column(String(500))
    status = Column(String(50), default="pending")  # pending, processing, completed, failed
    accuracy = Column(Float, default=0.0)
    language = Column(String(50), default="ko")
    text_content = Column(Text)
    created = Column(DateTime, default=datetime.utcnow)
    updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    user_id = Column(String(255), nullable=True)


class WebScrapingJob(Base):
    """웹 스크래핑 작업 모델"""
    __tablename__ = "web_scraping_jobs"

    id = Column(Integer, primary_key=True, index=True)
    url = Column(String(500), nullable=False)
    status = Column(String(50), default="pending")  # pending, scraping, completed, failed
    data = Column(JSON, default={})
    created = Column(DateTime, default=datetime.utcnow)
    updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    user_id = Column(String(255), nullable=True)


class CRMContact(Base):
    """CRM 연락처 모델"""
    __tablename__ = "crm_contacts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255))
    phone = Column(String(50))
    company = Column(String(255))
    status = Column(String(50), default="lead")  # lead, prospect, customer, inactive
    notes = Column(Text)
    created = Column(DateTime, default=datetime.utcnow)
    updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    user_id = Column(String(255), nullable=True)


class WorkflowExecution(Base):
    """워크플로우 실행 기록"""
    __tablename__ = "workflow_executions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    status = Column(String(50), default="pending")  # pending, running, completed, failed
    workflow_data = Column(JSON, default={})
    result = Column(JSON, default={})
    created = Column(DateTime, default=datetime.utcnow)
    updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    user_id = Column(String(255), nullable=True)


class ChangeDetectionJob(Base):
    """변경 감지 모니터링"""
    __tablename__ = "change_detection_jobs"

    id = Column(Integer, primary_key=True, index=True)
    url = Column(String(500), nullable=False)
    name = Column(String(255))
    status = Column(String(50), default="monitoring")
    last_check = Column(DateTime, default=datetime.utcnow)
    changes_detected = Column(Integer, default=0)
    created = Column(DateTime, default=datetime.utcnow)
    user_id = Column(String(255), nullable=True)


class SEOAudit(Base):
    """SEO 감시 및 분석"""
    __tablename__ = "seo_audits"

    id = Column(Integer, primary_key=True, index=True)
    url = Column(String(500), nullable=False)
    name = Column(String(255))
    score = Column(Float, default=0.0)
    status = Column(String(50), default="pending")
    keywords = Column(JSON, default=[])
    created = Column(DateTime, default=datetime.utcnow)
    user_id = Column(String(255), nullable=True)


class SEOKeyword(Base):
    """SEO 키워드 트래킹"""
    __tablename__ = "seo_keywords"

    id = Column(Integer, primary_key=True, index=True)
    keyword = Column(String(255), nullable=False)
    domain = Column(String(255), nullable=False)
    position = Column(Integer, default=0)
    created = Column(DateTime, default=datetime.utcnow)
    updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    user_id = Column(String(255), nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "keyword": self.keyword,
            "domain": self.domain,
            "position": self.position,
            "created": self.created.strftime("%Y-%m-%d"),
        }


class Integration(Base):
    """통합 항목"""
    __tablename__ = "integrations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    type = Column(String(100), default="custom")
    status = Column(String(50), default="active")  # active, inactive, error
    config = Column(JSON, default={})
    created = Column(DateTime, default=datetime.utcnow)
    updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    user_id = Column(String(255), nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "type": self.type,
            "status": self.status,
            "created": self.created.strftime("%Y-%m-%d"),
        }
