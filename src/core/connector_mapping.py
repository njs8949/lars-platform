"""
자동 스킬/커넥터 감지 및 설치 시스템
사용자 요청 분석 → 필요한 커넥터 자동 식별 → 설치/연결 제안
"""

from typing import List, Dict, Set, Tuple, Optional
from dataclasses import dataclass
from enum import Enum
import re
import logging

logger = logging.getLogger(__name__)


class ConnectorType(Enum):
    """커넥터 타입"""
    COMMUNICATION = "communication"      # Slack, Gmail, Teams
    PROJECT_MANAGEMENT = "project_management"  # Linear, Asana, Jira
    CODE_MANAGEMENT = "code_management"  # GitHub, GitLab
    CRM = "crm"                         # HubSpot, Salesforce
    STORAGE = "storage"                 # Google Drive, Dropbox
    PAYMENT = "payment"                 # Stripe
    ANALYTICS = "analytics"             # Google Analytics
    CALENDAR = "calendar"               # Google Calendar
    NOTES = "notes"                     # Notion, Confluence


@dataclass
class Connector:
    """커넥터 정의"""
    id: str
    name: str
    connector_type: ConnectorType
    keywords: List[str]  # 인식 키워드
    required_auth: List[str]  # 필요한 인증 정보
    capabilities: List[str]  # 제공하는 기능
    conflicts: List[str] = None  # 충돌하는 커넥터


class ConnectorLibrary:
    """커넥터 라이브러리 - 전체 20+ 커넥터"""

    def __init__(self):
        self.connectors = self._initialize_connectors()
        self.keyword_index = self._build_keyword_index()

    def _initialize_connectors(self) -> Dict[str, Connector]:
        """모든 커넥터 초기화"""
        return {
            # ========== Communication (5개) ==========
            "slack": Connector(
                id="slack",
                name="Slack",
                connector_type=ConnectorType.COMMUNICATION,
                keywords=["slack", "메시지", "채널", "알림"],
                required_auth=["workspace_url", "bot_token"],
                capabilities=["send_message", "read_channel", "create_channel", "upload_file"],
            ),
            "gmail": Connector(
                id="gmail",
                name="Gmail",
                connector_type=ConnectorType.COMMUNICATION,
                keywords=["gmail", "이메일", "메일", "발송"],
                required_auth=["oauth_token"],
                capabilities=["send_email", "read_emails", "search_emails", "create_draft"],
            ),
            "teams": Connector(
                id="teams",
                name="Microsoft Teams",
                connector_type=ConnectorType.COMMUNICATION,
                keywords=["teams", "마이크로소프트", "메시지"],
                required_auth=["oauth_token"],
                capabilities=["send_message", "read_channels", "create_channel"],
            ),
            "outlook": Connector(
                id="outlook",
                name="Outlook",
                connector_type=ConnectorType.COMMUNICATION,
                keywords=["outlook", "아웃룩", "메일"],
                required_auth=["oauth_token"],
                capabilities=["send_email", "read_emails", "calendar_event"],
            ),
            "discord": Connector(
                id="discord",
                name="Discord",
                connector_type=ConnectorType.COMMUNICATION,
                keywords=["discord", "디스코드"],
                required_auth=["bot_token"],
                capabilities=["send_message", "read_messages", "create_channel"],
            ),

            # ========== Project Management (5개) ==========
            "linear": Connector(
                id="linear",
                name="Linear",
                connector_type=ConnectorType.PROJECT_MANAGEMENT,
                keywords=["linear", "이슈", "작업", "태스크"],
                required_auth=["api_key"],
                capabilities=["create_issue", "update_issue", "list_issues", "add_comment"],
            ),
            "asana": Connector(
                id="asana",
                name="Asana",
                connector_type=ConnectorType.PROJECT_MANAGEMENT,
                keywords=["asana", "프로젝트", "태스크"],
                required_auth=["api_token"],
                capabilities=["create_task", "update_task", "list_tasks", "create_project"],
            ),
            "jira": Connector(
                id="jira",
                name="Jira",
                connector_type=ConnectorType.PROJECT_MANAGEMENT,
                keywords=["jira", "버그", "스프린트"],
                required_auth=["api_token", "domain"],
                capabilities=["create_issue", "update_issue", "list_issues"],
            ),
            "notion": Connector(
                id="notion",
                name="Notion",
                connector_type=ConnectorType.NOTES,
                keywords=["notion", "데이터베이스", "페이지"],
                required_auth=["api_token"],
                capabilities=["create_page", "update_page", "query_database"],
            ),
            "confluence": Connector(
                id="confluence",
                name="Confluence",
                connector_type=ConnectorType.NOTES,
                keywords=["confluence", "위키", "문서"],
                required_auth=["api_token", "domain"],
                capabilities=["create_page", "update_page", "search_pages"],
            ),

            # ========== Code Management (3개) ==========
            "github": Connector(
                id="github",
                name="GitHub",
                connector_type=ConnectorType.CODE_MANAGEMENT,
                keywords=["github", "저장소", "풀리퀘스트", "pr"],
                required_auth=["oauth_token"],
                capabilities=["create_issue", "create_pr", "read_commits", "push_code"],
            ),
            "gitlab": Connector(
                id="gitlab",
                name="GitLab",
                connector_type=ConnectorType.CODE_MANAGEMENT,
                keywords=["gitlab", "깃랩"],
                required_auth=["api_token", "instance_url"],
                capabilities=["create_issue", "create_mr", "read_commits"],
            ),
            "bitbucket": Connector(
                id="bitbucket",
                name="Bitbucket",
                connector_type=ConnectorType.CODE_MANAGEMENT,
                keywords=["bitbucket", "비트버킷"],
                required_auth=["api_token"],
                capabilities=["create_issue", "create_pr", "read_commits"],
            ),

            # ========== CRM (2개) ==========
            "hubspot": Connector(
                id="hubspot",
                name="HubSpot",
                connector_type=ConnectorType.CRM,
                keywords=["hubspot", "영업", "고객", "lead"],
                required_auth=["api_key"],
                capabilities=["create_contact", "update_contact", "search_contacts", "create_deal"],
            ),
            "salesforce": Connector(
                id="salesforce",
                name="Salesforce",
                connector_type=ConnectorType.CRM,
                keywords=["salesforce", "세일즈포스"],
                required_auth=["oauth_token", "instance_url"],
                capabilities=["create_record", "update_record", "query_records"],
            ),

            # ========== Storage (2개) ==========
            "google_drive": Connector(
                id="google_drive",
                name="Google Drive",
                connector_type=ConnectorType.STORAGE,
                keywords=["구글 드라이브", "google drive", "파일", "문서"],
                required_auth=["oauth_token"],
                capabilities=["upload_file", "download_file", "list_files", "create_folder"],
            ),
            "dropbox": Connector(
                id="dropbox",
                name="Dropbox",
                connector_type=ConnectorType.STORAGE,
                keywords=["dropbox", "드롭박스"],
                required_auth=["oauth_token"],
                capabilities=["upload_file", "download_file", "list_files"],
            ),

            # ========== Payment (1개) ==========
            "stripe": Connector(
                id="stripe",
                name="Stripe",
                connector_type=ConnectorType.PAYMENT,
                keywords=["stripe", "결제", "청구"],
                required_auth=["api_key"],
                capabilities=["create_payment", "list_payments", "create_customer", "create_invoice"],
            ),

            # ========== Analytics (2개) ==========
            "google_analytics": Connector(
                id="google_analytics",
                name="Google Analytics",
                connector_type=ConnectorType.ANALYTICS,
                keywords=["구글 애널리틱스", "google analytics", "통계"],
                required_auth=["oauth_token", "property_id"],
                capabilities=["query_analytics", "get_reports", "list_goals"],
            ),
            "mixpanel": Connector(
                id="mixpanel",
                name="Mixpanel",
                connector_type=ConnectorType.ANALYTICS,
                keywords=["mixpanel", "믹스패널"],
                required_auth=["api_token"],
                capabilities=["query_events", "get_segmentation", "create_funnels"],
            ),

            # ========== Calendar (1개) ==========
            "google_calendar": Connector(
                id="google_calendar",
                name="Google Calendar",
                connector_type=ConnectorType.CALENDAR,
                keywords=["구글 캘린더", "google calendar", "일정"],
                required_auth=["oauth_token"],
                capabilities=["create_event", "update_event", "list_events"],
            ),
        }

    def _build_keyword_index(self) -> Dict[str, List[str]]:
        """키워드 인덱스 구축"""
        index = {}
        for connector_id, connector in self.connectors.items():
            for keyword in connector.keywords:
                if keyword not in index:
                    index[keyword] = []
                index[keyword].append(connector_id)
        return index

    def find_by_keyword(self, keyword: str) -> List[Connector]:
        """키워드로 커넥터 검색"""
        keyword_lower = keyword.lower()
        connector_ids = self.keyword_index.get(keyword_lower, [])
        return [self.connectors[cid] for cid in connector_ids]

    def find_by_type(self, connector_type: ConnectorType) -> List[Connector]:
        """타입별 커넥터 검색"""
        return [c for c in self.connectors.values() if c.connector_type == connector_type]

    def get_connector(self, connector_id: str) -> Optional[Connector]:
        """ID로 커넥터 조회"""
        return self.connectors.get(connector_id)


class TaskAnalyzer:
    """작업 분석 엔진 - 사용자 요청에서 필요한 커넥터 추출"""

    def __init__(self, connector_library: ConnectorLibrary):
        self.library = connector_library

    def analyze(self, task_description: str) -> Dict:
        """작업 설명을 분석하여 필요한 커넥터 식별"""
        task_lower = task_description.lower()
        detected_connectors = set()

        # 1단계: 규칙 기반 키워드 매칭
        for keyword, connector_ids in self.library.keyword_index.items():
            if keyword in task_lower:
                detected_connectors.update(connector_ids)

        # 2단계: 패턴 기반 감지
        detected_connectors.update(self._pattern_based_detection(task_lower))

        # 결과 구성
        connectors_data = [
            self.library.get_connector(cid) for cid in detected_connectors
            if self.library.get_connector(cid)
        ]

        return {
            "task": task_description,
            "detected_connectors": [
                {
                    "id": c.id,
                    "name": c.name,
                    "type": c.connector_type.value,
                    "capabilities": c.capabilities,
                    "required_auth": c.required_auth,
                }
                for c in connectors_data
            ],
            "confidence": self._calculate_confidence(task_lower, detected_connectors),
            "needs_clarification": len(detected_connectors) == 0,
        }

    def _pattern_based_detection(self, task_lower: str) -> Set[str]:
        """패턴 기반 커넥터 감지"""
        detected = set()

        # 이메일 발송
        if re.search(r"(메일|이메일|이메일을|메일을|발송|보내기|보내다)", task_lower):
            detected.add("gmail")

        # 슬랙 메시지
        if re.search(r"(슬랙|알림|채널|메시지|공지)", task_lower):
            detected.add("slack")

        # GitHub PR/Issue
        if re.search(r"(풀리퀘스트|pr|이슈|커밋|코드)", task_lower):
            detected.add("github")

        # Linear/Asana 태스크
        if re.search(r"(태스크|작업|이슈|프로젝트|트래킹)", task_lower):
            detected.update(["linear", "asana"])

        # Google Drive 파일
        if re.search(r"(파일|문서|드라이브|저장|업로드)", task_lower):
            detected.add("google_drive")

        # 결제/청구
        if re.search(r"(결제|청구|송금|거래)", task_lower):
            detected.add("stripe")

        # HubSpot 고객관리
        if re.search(r"(고객|영업|lead|거래|deal)", task_lower):
            detected.add("hubspot")

        return detected

    def _calculate_confidence(self, task_lower: str, detected_connectors: Set[str]) -> float:
        """신뢰도 계산 (0-100)"""
        if not detected_connectors:
            return 0.0

        keyword_count = sum(1 for kw in self.library.keyword_index.keys() if kw in task_lower)
        base_score = min(100, 50 + (len(detected_connectors) * 15))
        return base_score * (keyword_count / max(1, len(detected_connectors)))


# 전역 인스턴스
connector_library = ConnectorLibrary()
task_analyzer = TaskAnalyzer(connector_library)


def detect_required_connectors(task_description: str) -> Dict:
    """작업 설명에서 필요한 커넥터 자동 감지"""
    return task_analyzer.analyze(task_description)


if __name__ == "__main__":
    # 테스트
    test_tasks = [
        "Slack에 팀에게 알림 보내기",
        "GitHub에 PR 생성하고 Linear에 이슈 업데이트",
        "Gmail로 고객에게 이메일 발송하고 HubSpot에 저장",
        "Google Drive에 파일 업로드",
    ]

    for task in test_tasks:
        result = detect_required_connectors(task)
        print(f"\n작업: {task}")
        print(f"필요한 커넥터: {[c['name'] for c in result['detected_connectors']]}")
        print(f"신뢰도: {result['confidence']:.1f}%")
