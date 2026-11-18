"""CLI 유틸리티 함수"""

import json
import logging
from pathlib import Path
from datetime import datetime
from typing import Any, Dict
from rich.console import Console
from rich.syntax import Syntax

console = Console()

# 로그 디렉토리
LOG_DIR = Path(".lars/logs")
LOG_DIR.mkdir(parents=True, exist_ok=True)

# 로거 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(LOG_DIR / "cli.log"),
        logging.StreamHandler()
    ]
)


class Config:
    """설정 관리 클래스"""

    def __init__(self, config_dir: str = ".lars"):
        self.config_dir = Path(config_dir)
        self.config_file = self.config_dir / "config.json"

    def load(self) -> Dict[str, Any]:
        """설정 로드"""
        if self.config_file.exists():
            try:
                with open(self.config_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                logging.error(f"Failed to load config: {e}")
                return {}
        return {}

    def save(self, config: Dict[str, Any]) -> bool:
        """설정 저장"""
        try:
            self.config_dir.mkdir(parents=True, exist_ok=True)
            with open(self.config_file, "w", encoding="utf-8") as f:
                json.dump(config, f, ensure_ascii=False, indent=2)
            return True
        except Exception as e:
            logging.error(f"Failed to save config: {e}")
            return False

    def get(self, key: str, default: Any = None) -> Any:
        """특정 설정 값 조회"""
        config = self.load()
        return config.get(key, default)

    def set(self, key: str, value: Any) -> bool:
        """특정 설정 값 변경"""
        config = self.load()
        config[key] = value
        return self.save(config)


class Logger:
    """로거 클래스"""

    def __init__(self, name: str = "lars-cli"):
        self.logger = logging.getLogger(name)

    def info(self, message: str):
        """정보 로그"""
        self.logger.info(message)
        console.print(f"[blue]ℹ️  {message}[/blue]")

    def warning(self, message: str):
        """경고 로그"""
        self.logger.warning(message)
        console.print(f"[yellow]⚠️  {message}[/yellow]")

    def error(self, message: str):
        """에러 로그"""
        self.logger.error(message)
        console.print(f"[red]❌ {message}[/red]")

    def success(self, message: str):
        """성공 로그"""
        self.logger.info(message)
        console.print(f"[green]✅ {message}[/green]")

    def debug(self, message: str):
        """디버그 로그"""
        self.logger.debug(message)


def format_response(data: Dict[str, Any], format_type: str = "json") -> str:
    """응답 포맷팅"""
    if format_type == "json":
        return json.dumps(data, ensure_ascii=False, indent=2)
    elif format_type == "table":
        # 테이블 포맷으로 변환
        if isinstance(data, dict):
            return "\n".join([f"{k}: {v}" for k, v in data.items()])
    return str(data)


def display_json(data: Dict[str, Any], filename: str = "output.json"):
    """JSON 데이터 표시"""
    json_str = json.dumps(data, ensure_ascii=False, indent=2)
    syntax = Syntax(json_str, "json", theme="monokai", line_numbers=True)
    console.print(syntax)


def display_error(message: str, details: str = ""):
    """에러 메시지 표시"""
    console.print(f"\n[bold red]❌ 오류[/bold red]")
    console.print(f"[red]{message}[/red]")
    if details:
        console.print(f"[dim]{details}[/dim]")
    console.print()


def display_success(message: str, details: str = ""):
    """성공 메시지 표시"""
    console.print(f"\n[bold green]✅ 성공[/bold green]")
    console.print(f"[green]{message}[/green]")
    if details:
        console.print(f"[dim]{details}[/dim]")
    console.print()


def display_warning(message: str, details: str = ""):
    """경고 메시지 표시"""
    console.print(f"\n[bold yellow]⚠️  경고[/bold yellow]")
    console.print(f"[yellow]{message}[/yellow]")
    if details:
        console.print(f"[dim]{details}[/dim]")
    console.print()


def display_info(message: str, details: str = ""):
    """정보 메시지 표시"""
    console.print(f"\n[bold cyan]ℹ️  정보[/bold cyan]")
    console.print(f"[cyan]{message}[/cyan]")
    if details:
        console.print(f"[dim]{details}[/dim]")
    console.print()
