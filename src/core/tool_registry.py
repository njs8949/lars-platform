"""AI 기능 호출(Tool-Calling) 레지스트리"""

import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from src.core.models import (
    Presentation, Theme, OCRJob, WebScrapingJob, CRMContact,
    ChangeDetectionJob, SEOKeyword, WorkflowExecution, Integration
)
from datetime import datetime

logger = logging.getLogger(__name__)


# OpenAI/Ollama 호환 Function-Calling 스키마
TOOLS = [
    # Create tools
    {
        "type": "function",
        "function": {
            "name": "create_presentation",
            "description": "새 프레젠테이션 생성",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "프레젠테이션 이름"},
                    "template": {"type": "string", "description": "템플릿 이름 (기본값: Blank)", "default": "Blank"},
                    "slides": {"type": "integer", "description": "슬라이드 수", "default": 0},
                },
                "required": ["name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_theme",
            "description": "새 디자인 테마 생성",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "테마 이름"},
                    "category": {"type": "string", "description": "카테고리 (기본값: Custom)", "default": "Custom"},
                    "colors": {"type": "array", "items": {"type": "string"}, "description": "색상 배열", "default": []},
                },
                "required": ["name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_scraping_job",
            "description": "웹 스크래핑 작업 생성",
            "parameters": {
                "type": "object",
                "properties": {
                    "url": {"type": "string", "description": "스크래핑할 URL"},
                    "name": {"type": "string", "description": "작업 이름 (기본값: URL 호스트명)"},
                },
                "required": ["url"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_ocr_job",
            "description": "OCR 문서 인식 작업 생성",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "문서 이름"},
                    "language": {"type": "string", "description": "문서 언어 (기본값: ko)", "default": "ko"},
                },
                "required": ["name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_crm_contact",
            "description": "CRM 연락처 생성",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "연락처의 전체 이름"},
                    "first_name": {"type": "string", "description": "이름 (name 대신 사용 가능)"},
                    "last_name": {"type": "string", "description": "성 (name 대신 사용 가능)"},
                    "email": {"type": "string", "description": "이메일 주소"},
                    "phone": {"type": "string", "description": "전화번호 (선택사항)"},
                    "company": {"type": "string", "description": "회사명 (선택사항)"},
                    "status": {"type": "string", "description": "상태 (lead/prospect/customer/inactive, 기본값: lead)", "default": "lead"},
                },
                "required": ["email"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_change_detection_watch",
            "description": "웹사이트 변경 감지 모니터링 생성",
            "parameters": {
                "type": "object",
                "properties": {
                    "url": {"type": "string", "description": "감시할 URL"},
                    "name": {"type": "string", "description": "모니터 이름 (기본값: URL 호스트명)"},
                },
                "required": ["url"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_seo_keyword",
            "description": "SEO 키워드 추적 생성",
            "parameters": {
                "type": "object",
                "properties": {
                    "keyword": {"type": "string", "description": "추적할 키워드"},
                    "domain": {"type": "string", "description": "도메인"},
                    "position": {"type": "integer", "description": "현재 순위 (기본값: 0)", "default": 0},
                },
                "required": ["keyword", "domain"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_workflow",
            "description": "워크플로우 생성",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "워크플로우 이름"},
                    "workflow_data": {"type": "object", "description": "워크플로우 데이터 (선택사항)", "default": {}},
                },
                "required": ["name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_integration",
            "description": "통합 항목 생성",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "통합 이름"},
                    "type": {"type": "string", "description": "통합 타입 (기본값: custom)", "default": "custom"},
                    "config": {"type": "object", "description": "설정 (선택사항)", "default": {}},
                },
                "required": ["name"]
            }
        }
    },
    # List tools
    {
        "type": "function",
        "function": {
            "name": "list_presentations",
            "description": "프레젠테이션 목록 조회 (최근 5개)",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list_scraping_jobs",
            "description": "웹 스크래핑 작업 목록 조회 (최근 5개)",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list_ocr_jobs",
            "description": "OCR 작업 목록 조회 (최근 5개)",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list_crm_contacts",
            "description": "CRM 연락처 목록 조회 (최근 5개)",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list_change_detection_watches",
            "description": "변경 감지 모니터 목록 조회 (최근 5개)",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list_seo_keywords",
            "description": "SEO 키워드 목록 조회 (최근 5개)",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list_workflows",
            "description": "워크플로우 목록 조회 (최근 5개)",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list_integrations",
            "description": "통합 항목 목록 조회 (최근 5개)",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
]


def execute_tool(name: str, args: Dict[str, Any], db: Session) -> Dict[str, Any]:
    """도구 실행"""
    try:
        if name == "create_presentation":
            pres = Presentation(
                name=args.get("name"),
                template=args.get("template", "Blank"),
                slides=args.get("slides", 0),
                status="draft"
            )
            db.add(pres)
            db.commit()
            db.refresh(pres)
            return {"success": True, "id": pres.id, "name": pres.name, "type": "presentation"}

        elif name == "create_theme":
            theme = Theme(
                name=args.get("name"),
                category=args.get("category", "Custom"),
                colors=args.get("colors", [])
            )
            db.add(theme)
            db.commit()
            db.refresh(theme)
            return {"success": True, "id": theme.id, "name": theme.name, "type": "theme"}

        elif name == "create_scraping_job":
            from urllib.parse import urlparse
            url = args.get("url")
            job_name = args.get("name") or urlparse(url).hostname or url
            job = WebScrapingJob(url=url, status="pending")
            db.add(job)
            db.commit()
            db.refresh(job)
            return {"success": True, "id": job.id, "url": job.url, "type": "scraping_job"}

        elif name == "create_ocr_job":
            ocr = OCRJob(
                name=args.get("name"),
                language=args.get("language", "ko"),
                status="pending"
            )
            db.add(ocr)
            db.commit()
            db.refresh(ocr)
            return {"success": True, "id": ocr.id, "name": ocr.name, "type": "ocr_job"}

        elif name == "create_crm_contact":
            # Handle both 'name' and 'first_name'/'last_name' formats
            full_name = args.get("name")
            if not full_name:
                first = args.get("first_name", "")
                last = args.get("last_name", "")
                full_name = f"{first} {last}".strip()

            contact = CRMContact(
                name=full_name,
                email=args.get("email"),
                phone=args.get("phone"),
                company=args.get("company"),
                status=args.get("status", "lead")
            )
            db.add(contact)
            db.commit()
            db.refresh(contact)
            return {"success": True, "id": contact.id, "name": contact.name, "email": contact.email, "type": "crm_contact"}

        elif name == "create_change_detection_watch":
            from urllib.parse import urlparse
            url = args.get("url")
            watch_name = args.get("name") or urlparse(url).hostname or url
            watch = ChangeDetectionJob(url=url, name=watch_name, status="monitoring")
            db.add(watch)
            db.commit()
            db.refresh(watch)
            return {"success": True, "id": watch.id, "url": watch.url, "type": "change_detection_watch"}

        elif name == "create_seo_keyword":
            keyword = SEOKeyword(
                keyword=args.get("keyword"),
                domain=args.get("domain"),
                position=args.get("position", 0)
            )
            db.add(keyword)
            db.commit()
            db.refresh(keyword)
            return {"success": True, "id": keyword.id, "keyword": keyword.keyword, "domain": keyword.domain, "type": "seo_keyword"}

        elif name == "create_workflow":
            workflow = WorkflowExecution(
                name=args.get("name"),
                status="pending",
                workflow_data=args.get("workflow_data", {})
            )
            db.add(workflow)
            db.commit()
            db.refresh(workflow)
            return {"success": True, "id": workflow.id, "name": workflow.name, "type": "workflow"}

        elif name == "create_integration":
            integration = Integration(
                name=args.get("name"),
                type=args.get("type", "custom"),
                status="active",
                config=args.get("config", {})
            )
            db.add(integration)
            db.commit()
            db.refresh(integration)
            return {"success": True, "id": integration.id, "name": integration.name, "type": "integration"}

        elif name == "list_presentations":
            items = db.query(Presentation).order_by(Presentation.created.desc()).limit(5).all()
            return {"success": True, "items": [{"id": i.id, "name": i.name} for i in items], "type": "presentations"}

        elif name == "list_scraping_jobs":
            items = db.query(WebScrapingJob).order_by(WebScrapingJob.created.desc()).limit(5).all()
            return {"success": True, "items": [{"id": i.id, "url": i.url} for i in items], "type": "scraping_jobs"}

        elif name == "list_ocr_jobs":
            items = db.query(OCRJob).order_by(OCRJob.created.desc()).limit(5).all()
            return {"success": True, "items": [{"id": i.id, "name": i.name} for i in items], "type": "ocr_jobs"}

        elif name == "list_crm_contacts":
            items = db.query(CRMContact).order_by(CRMContact.created.desc()).limit(5).all()
            return {"success": True, "items": [{"id": i.id, "name": i.name, "email": i.email} for i in items], "type": "crm_contacts"}

        elif name == "list_change_detection_watches":
            items = db.query(ChangeDetectionJob).order_by(ChangeDetectionJob.created.desc()).limit(5).all()
            return {"success": True, "items": [{"id": i.id, "url": i.url} for i in items], "type": "change_detection_watches"}

        elif name == "list_seo_keywords":
            items = db.query(SEOKeyword).order_by(SEOKeyword.created.desc()).limit(5).all()
            return {"success": True, "items": [{"id": i.id, "keyword": i.keyword, "domain": i.domain} for i in items], "type": "seo_keywords"}

        elif name == "list_workflows":
            items = db.query(WorkflowExecution).order_by(WorkflowExecution.created.desc()).limit(5).all()
            return {"success": True, "items": [{"id": i.id, "name": i.name} for i in items], "type": "workflows"}

        elif name == "list_integrations":
            items = db.query(Integration).order_by(Integration.created.desc()).limit(5).all()
            return {"success": True, "items": [{"id": i.id, "name": i.name, "type": i.type} for i in items], "type": "integrations"}

        else:
            return {"success": False, "error": f"Unknown tool: {name}"}

    except Exception as e:
        db.rollback()
        logger.error(f"Tool execution failed [{name}]: {e}")
        return {"success": False, "error": str(e)}


def to_claude_tools(tools: List[Dict]) -> List[Dict]:
    """Ollama/OpenAI 스키마를 Claude SDK 형식으로 변환"""
    claude_tools = []
    for tool in tools:
        if tool["type"] == "function":
            func = tool["function"]
            claude_tools.append({
                "name": func["name"],
                "description": func["description"],
                "input_schema": {
                    "type": "object",
                    "properties": func["parameters"]["properties"],
                    "required": func["parameters"]["required"]
                }
            })
    return claude_tools


def render_tool_result(tool_name: str, result: Dict[str, Any]) -> str:
    """도구 실행 결과를 한국어 요약 문구로 생성"""
    if not result.get("success"):
        return f"❌ {tool_name} 실행 실패: {result.get('error', '알 수 없는 오류')}"

    tool_type = result.get("type", "")

    # Create tools
    if tool_name.startswith("create_"):
        item_name = result.get("name") or result.get("url") or result.get("keyword") or "항목"
        category = {
            "presentation": "프레젠테이션",
            "theme": "테마",
            "scraping_job": "웹 스크래핑",
            "ocr_job": "OCR 문서",
            "crm_contact": "CRM 연락처",
            "change_detection_watch": "변경 감지 모니터",
            "seo_keyword": "SEO 키워드",
            "workflow": "워크플로우",
            "integration": "통합"
        }
        cat_name = category.get(tool_type, "항목")
        return f"✅ {cat_name} '{item_name}'을(를) 생성했습니다."

    # List tools
    elif tool_name.startswith("list_"):
        items = result.get("items", [])
        if not items:
            category = {
                "presentations": "프레젠테이션",
                "scraping_jobs": "웹 스크래핑 작업",
                "ocr_jobs": "OCR 작업",
                "crm_contacts": "CRM 연락처",
                "change_detection_watches": "변경 감지 모니터",
                "seo_keywords": "SEO 키워드",
                "workflows": "워크플로우",
                "integrations": "통합"
            }
            cat_name = category.get(tool_type, "항목")
            return f"📭 등록된 {cat_name}이 없습니다."

        count = len(items)
        category = {
            "presentations": "프레젠테이션",
            "scraping_jobs": "웹 스크래핑 작업",
            "ocr_jobs": "OCR 작업",
            "crm_contacts": "CRM 연락처",
            "change_detection_watches": "변경 감지 모니터",
            "seo_keywords": "SEO 키워드",
            "workflows": "워크플로우",
            "integrations": "통합"
        }
        cat_name = category.get(tool_type, "항목")
        item_list = "\n".join([f"  • {i.get('name') or i.get('url') or i.get('keyword', '항목')}" for i in items])
        return f"📊 최근 {cat_name} {count}개:\n{item_list}"

    return "✅ 작업이 완료되었습니다."
