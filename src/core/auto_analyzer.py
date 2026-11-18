"""자동 분석 및 생산성 도구 자동화"""

import json
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)


class AutoAnalyzer:
    """사용자 요청을 감지하여 자동으로 분석 및 생산성 도구 실행"""

    def __init__(self):
        self.analysis_keywords = {
            'summary': ['요약', '정리', 'summarize', 'summary'],
            'trend': ['추세', '트렌드', 'trend', 'pattern'],
            'sentiment': ['감정', '감정분석', 'sentiment', 'emotion'],
            'statistical': ['통계', '분석', 'statistical', 'analyze'],
        }

        self.productivity_keywords = {
            'image': ['이미지', '이미지생성', '그려줘', 'image', 'generate image', 'draw'],
            'presentation': ['프레젠테이션', '슬라이드', '발표', 'presentation', 'slide'],
            'code': ['코드', '프로그래밍', '작성', 'code', 'generate code'],
            'document': ['문서', '보고서', '작성', 'document', 'report'],
        }

    def detect_analysis_request(self, user_message: str) -> Optional[str]:
        """사용자 메시지에서 분석 요청 감지"""
        message_lower = user_message.lower()

        for analysis_type, keywords in self.analysis_keywords.items():
            if any(keyword in message_lower for keyword in keywords):
                logger.info(f"[AUTO-ANALYZER] 분석 요청 감지: {analysis_type}")
                return analysis_type

        return None

    def detect_productivity_request(self, user_message: str) -> Optional[str]:
        """사용자 메시지에서 생산성 도구 요청 감지"""
        message_lower = user_message.lower()

        for tool_type, keywords in self.productivity_keywords.items():
            if any(keyword in message_lower for keyword in keywords):
                logger.info(f"[AUTO-ANALYZER] 생산성 도구 요청 감지: {tool_type}")
                return tool_type

        return None

    def extract_data_from_context(self, conversation_history: List[Dict[str, str]]) -> Dict[str, Any]:
        """대화 히스토리에서 분석할 데이터 추출"""
        data = {
            'text': '',
            'numbers': [],
            'context': ''
        }

        # 최근 메시지들에서 데이터 추출
        for msg in conversation_history[-5:]:  # 최근 5개 메시지
            if msg.get('role') == 'user':
                data['text'] += msg.get('content', '') + ' '

        data['context'] = data['text']

        return data

    def generate_analysis_prompt(self, analysis_type: str, data: Dict[str, Any]) -> str:
        """분석 타입에 따른 프롬프트 생성"""
        prompts = {
            'summary': f"""다음 데이터를 간단하게 요약해줘:
{data['text']}

핵심 포인트만 3-5개 정렬해서 알려줘.""",

            'trend': f"""다음 데이터에서 트렌드를 분석해줘:
{data['text']}

상승/하강 추세가 있는지, 어떤 패턴이 보이는지 설명해줘.""",

            'sentiment': f"""다음 텍스트의 감정을 분석해줘:
{data['text']}

긍정적/부정적/중립적인 태도가 보이는지, 감정 점수를 매겨줄 수 있나?""",

            'statistical': f"""다음 데이터를 통계적으로 분석해줘:
{data['text']}

주요 통계 수치(평균, 범위, 분포)와 인사이트를 알려줘."""
        }

        return prompts.get(analysis_type, prompts['summary'])

    def generate_productivity_prompt(self, tool_type: str, user_request: str) -> str:
        """생산성 도구 타입에 따른 프롬프트 생성"""
        prompts = {
            'image': f"""사용자가 다음을 요청했어:
"{user_request}"

이에 맞는 이미지를 생성하기 위한 상세한 프롬프트를 영어로 작성해줄 수 있나?
스타일, 색감, 구성 등을 구체적으로 지정해줘.""",

            'presentation': f"""사용자가 프레젠테이션을 요청했어:
"{user_request}"

다음 구성으로 프레젠테이션 슬라이드를 만들어줄 수 있나?
1. 제목 슬라이드
2. 개요 (3-4개 포인트)
3. 상세 내용 (각 포인트당 1-2 슬라이드)
4. 결론 및 액션 아이템

각 슬라이드마다 구체적인 내용을 작성해줘.""",

            'code': f"""사용자가 코드를 요청했어:
"{user_request}"

필요한 코드를 작성해줄 수 있나?
- 언어 자동 감지
- 주석 포함
- 실행 가능한 형태
- 에러 처리 포함""",

            'document': f"""사용자가 문서를 요청했어:
"{user_request}"

전문적인 문서를 작성해줄 수 있나?
- 구조화된 형식
- 명확한 섹션
- 요약 포함
- 액션 아이템 추가"""
        }

        return prompts.get(tool_type, prompts['code'])

    def should_auto_run(self, analysis_type: Optional[str], productivity_type: Optional[str]) -> bool:
        """자동 실행 여부 결정"""
        return analysis_type is not None or productivity_type is not None


# 전역 인스턴스
auto_analyzer = AutoAnalyzer()
