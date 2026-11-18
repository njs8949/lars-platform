"""LARS Ecosystem - 에이전트, 스킬, 커넥터 관리"""

import json
import os
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime
import shutil

logger = logging.getLogger(__name__)


class Agent:
    """에이전트 모델"""
    def __init__(self, agent_id: str, name: str, category: str, description: str,
                 capabilities: List[str] = None, version: str = "1.0.0",
                 repository: str = "", status: str = "available"):
        self.id = agent_id
        self.name = name
        self.category = category
        self.description = description
        self.capabilities = capabilities or []
        self.version = version
        self.repository = repository
        self.status = status  # available, installed, enabled
        self.installed_at = None
        self.enabled_at = None


class LARS_Ecosystem:
    """LARS 에코시스템 관리"""

    def __init__(self):
        self.ecosystem_dir = os.path.expanduser("~/.lars/ecosystem")
        self.agents_dir = os.path.join(self.ecosystem_dir, "agents")
        self.installed_dir = os.path.join(self.ecosystem_dir, "installed")
        self.registry_file = os.path.join(self.ecosystem_dir, "registry.json")

        # 디렉토리 생성
        os.makedirs(self.agents_dir, exist_ok=True)
        os.makedirs(self.installed_dir, exist_ok=True)

        self.agents_registry = self._load_registry()
        logger.info("[Ecosystem] LARS 에코시스템 초기화 완료")

    def _load_registry(self) -> Dict[str, Any]:
        """설치 레지스트리 로드"""
        if os.path.exists(self.registry_file):
            try:
                with open(self.registry_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except:
                return {"agents": {}, "skills": {}, "connectors": {}}
        return {"agents": {}, "skills": {}, "connectors": {}}

    def _save_registry(self):
        """설치 레지스트리 저장"""
        try:
            with open(self.registry_file, 'w', encoding='utf-8') as f:
                json.dump(self.agents_registry, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.error(f"[Ecosystem] 레지스트리 저장 오류: {e}")

    def discover_agents(self) -> List[Dict[str, Any]]:
        """이용 가능한 에이전트 발견"""
        available_agents = [
            {
                "id": "claude-code-agent",
                "name": "Claude Code Agent",
                "category": "Development",
                "description": "소프트웨어 개발 및 코드 분석 전문 에이전트",
                "capabilities": ["code-generation", "code-review", "debugging", "refactoring"],
                "version": "1.0.0",
                "status": self._get_agent_status("claude-code-agent")
            },
            {
                "id": "data-analysis-agent",
                "name": "Data Analysis Agent",
                "category": "Analytics",
                "description": "데이터 분석 및 시각화 전문 에이전트",
                "capabilities": ["data-processing", "statistical-analysis", "visualization"],
                "version": "1.0.0",
                "status": self._get_agent_status("data-analysis-agent")
            },
            {
                "id": "workflow-automation-agent",
                "name": "Workflow Automation Agent",
                "category": "Automation",
                "description": "작업 흐름 자동화 및 오케스트레이션 에이전트",
                "capabilities": ["workflow-design", "task-scheduling", "integration"],
                "version": "1.0.0",
                "status": self._get_agent_status("workflow-automation-agent")
            },
            {
                "id": "research-agent",
                "name": "Research Agent",
                "category": "Research",
                "description": "웹 검색 및 정보 수집 전문 에이전트",
                "capabilities": ["web-search", "content-analysis", "summarization"],
                "version": "1.0.0",
                "status": self._get_agent_status("research-agent")
            },
            {
                "id": "business-intelligence-agent",
                "name": "Business Intelligence Agent",
                "category": "Business",
                "description": "비즈니스 인텔리전스 및 리포팅 에이전트",
                "capabilities": ["report-generation", "kpi-analysis", "forecasting"],
                "version": "1.0.0",
                "status": self._get_agent_status("business-intelligence-agent")
            },
            {
                "id": "content-creator-agent",
                "name": "Content Creator Agent",
                "category": "Content",
                "description": "콘텐츠 생성 및 편집 전문 에이전트",
                "capabilities": ["text-generation", "image-generation", "seo-optimization"],
                "version": "1.0.0",
                "status": self._get_agent_status("content-creator-agent")
            }
        ]

        logger.info(f"[Ecosystem] {len(available_agents)}개 에이전트 발견")
        return available_agents

    def _get_agent_status(self, agent_id: str) -> str:
        """에이전트 상태 조회"""
        agents_data = self.agents_registry.get("agents", {})
        if agent_id in agents_data:
            agent_info = agents_data[agent_id]
            if agent_info.get("enabled"):
                return "enabled"
            return "installed"
        return "available"

    def install_agent(self, agent_id: str) -> Dict[str, Any]:
        """에이전트 설치"""
        try:
            logger.info(f"[Ecosystem] 에이전트 설치 시작: {agent_id}")

            # 이미 설치되었는지 확인
            if agent_id in self.agents_registry.get("agents", {}):
                logger.warning(f"[Ecosystem] 에이전트 이미 설치됨: {agent_id}")
                return {
                    "success": True,
                    "message": f"에이전트 '{agent_id}'가 이미 설치되어 있습니다.",
                    "status": "already_installed"
                }

            # 에이전트 정보 생성
            available_agents = {agent["id"]: agent for agent in self.discover_agents()}

            if agent_id not in available_agents:
                raise ValueError(f"알 수 없는 에이전트: {agent_id}")

            agent_info = available_agents[agent_id]

            # 에이전트 디렉토리 생성
            agent_install_dir = os.path.join(self.installed_dir, agent_id)
            os.makedirs(agent_install_dir, exist_ok=True)

            # 에이전트 메타데이터 저장
            metadata = {
                "id": agent_id,
                "name": agent_info["name"],
                "category": agent_info["category"],
                "description": agent_info["description"],
                "capabilities": agent_info["capabilities"],
                "version": agent_info["version"],
                "installed_at": datetime.now().isoformat(),
                "enabled": False,
                "enabled_at": None,
                "path": agent_install_dir
            }

            # 레지스트리에 추가
            if "agents" not in self.agents_registry:
                self.agents_registry["agents"] = {}

            self.agents_registry["agents"][agent_id] = metadata
            self._save_registry()

            logger.info(f"[Ecosystem] ✅ 에이전트 설치 완료: {agent_id}")

            return {
                "success": True,
                "message": f"에이전트 '{agent_info['name']}'가 성공적으로 설치되었습니다.",
                "agent_id": agent_id,
                "installed_at": metadata["installed_at"],
                "path": agent_install_dir
            }

        except Exception as e:
            logger.error(f"[Ecosystem] 에이전트 설치 오류: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    def enable_agent(self, agent_id: str) -> Dict[str, Any]:
        """에이전트 활성화"""
        try:
            logger.info(f"[Ecosystem] 에이전트 활성화 시작: {agent_id}")

            agents_data = self.agents_registry.get("agents", {})

            if agent_id not in agents_data:
                raise ValueError(f"설치되지 않은 에이전트: {agent_id}")

            agent_info = agents_data[agent_id]
            agent_info["enabled"] = True
            agent_info["enabled_at"] = datetime.now().isoformat()

            self._save_registry()

            logger.info(f"[Ecosystem] ✅ 에이전트 활성화 완료: {agent_id}")

            return {
                "success": True,
                "message": f"에이전트 '{agent_info['name']}'가 활성화되었습니다.",
                "agent_id": agent_id,
                "enabled_at": agent_info["enabled_at"]
            }

        except Exception as e:
            logger.error(f"[Ecosystem] 에이전트 활성화 오류: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    def get_installed_agents(self) -> List[Dict[str, Any]]:
        """설치된 에이전트 목록"""
        agents_data = self.agents_registry.get("agents", {})
        return list(agents_data.values())

    def get_enabled_agents(self) -> List[Dict[str, Any]]:
        """활성화된 에이전트 목록"""
        agents_data = self.agents_registry.get("agents", {})
        return [agent for agent in agents_data.values() if agent.get("enabled", False)]

    def disable_agent(self, agent_id: str) -> Dict[str, Any]:
        """에이전트 비활성화"""
        try:
            logger.info(f"[Ecosystem] 에이전트 비활성화 시작: {agent_id}")

            agents_data = self.agents_registry.get("agents", {})

            if agent_id not in agents_data:
                raise ValueError(f"설치되지 않은 에이전트: {agent_id}")

            agent_info = agents_data[agent_id]
            agent_info["enabled"] = False
            agent_info["enabled_at"] = None

            self._save_registry()

            logger.info(f"[Ecosystem] ✅ 에이전트 비활성화 완료: {agent_id}")

            return {
                "success": True,
                "message": f"에이전트 '{agent_info['name']}'가 비활성화되었습니다.",
                "agent_id": agent_id
            }

        except Exception as e:
            logger.error(f"[Ecosystem] 에이전트 비활성화 오류: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    def uninstall_agent(self, agent_id: str) -> Dict[str, Any]:
        """에이전트 제거"""
        try:
            agents_data = self.agents_registry.get("agents", {})

            if agent_id not in agents_data:
                raise ValueError(f"설치되지 않은 에이전트: {agent_id}")

            agent_info = agents_data[agent_id]
            agent_name = agent_info.get("name", agent_id)

            # 디렉토리 삭제
            agent_path = agent_info.get("path")
            if agent_path and os.path.exists(agent_path):
                shutil.rmtree(agent_path)

            # 레지스트리에서 제거
            del agents_data[agent_id]
            self._save_registry()

            logger.info(f"[Ecosystem] ✅ 에이전트 제거 완료: {agent_id}")

            return {
                "success": True,
                "message": f"에이전트 '{agent_name}'이 제거되었습니다."
            }

        except Exception as e:
            logger.error(f"[Ecosystem] 에이전트 제거 오류: {e}")
            return {
                "success": False,
                "error": str(e)
            }


# 싱글톤 인스턴스
lars_ecosystem = LARS_Ecosystem()
