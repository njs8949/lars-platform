"""
Forge CLI Package
데스크톱 앱과 동일한 모든 기능을 지원하는 명령줄 인터페이스
"""

__version__ = "1.4.0"
__author__ = "LARS Inc."
__title__ = "Forge CLI"
__description__ = "AI-Powered Development Platform - Command Line Interface"

from src.cli.main import app

__all__ = ["app"]
