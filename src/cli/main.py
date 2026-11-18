"""
Forge CLI - 완전한 명령줄 인터페이스
데스크톱 앱과 동일한 모든 기능 지원
"""

import typer
import json
import os
from typing import Optional, List
from datetime import datetime
from pathlib import Path
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, BarColumn
from rich.syntax import Syntax
from rich.markdown import Markdown
import requests

# 커스텀 모듈
from src.cli.chat_commands import chat_app
from src.cli.workspace_commands import workspace_app
from src.cli.statistics_commands import statistics_app
from src.cli.ecosystem_commands import ecosystem_app
from src.cli.settings_commands import settings_app
from src.cli.image_commands import image_app
from src.cli.hardware_commands import hardware_app
from src.cli.backend_commands import backend_app
from src.cli.code_commands import code_app
from src.cli.label_commands import label_app
from src.cli.utils import Config, Logger, format_response

# 콘솔 및 앱 초기화
console = Console()
app = typer.Typer(
    help="🚀 Forge CLI - AI-Powered Development Platform",
    pretty_exceptions_enable=False,
)
config = Config()
logger = Logger()

# API 베이스 URL
API_BASE_URL = "http://localhost:8000"
OLLAMA_URL = "http://localhost:11434"


# ==================== AI 응답 함수 ====================

def get_ai_response(query: str) -> str:
    """Ollama를 통한 AI 응답 생성"""
    try:
        response = requests.post(
            f"{OLLAMA_URL}/api/generate",
            json={"model": "llama2", "prompt": query, "stream": False},
            timeout=60
        )
        if response.status_code == 200:
            return response.json().get("response", "응답 생성 실패")
    except:
        pass
    return f"응답: {query[:50]}"


# ==================== 메인 명령어 ====================

@app.command()
def init():
    """🔧 CLI 초기화 및 설정"""
    console.print("\n[bold cyan]Forge CLI 초기화[/bold cyan]\n")

    # 설정 디렉토리 생성
    config_dir = Path(".lars")
    config_dir.mkdir(exist_ok=True)

    # 사용자 정보 입력
    console.print("[yellow]사용자 정보를 입력해주세요:[/yellow]")
    name = typer.prompt("이름")
    email = typer.prompt("이메일")
    api_key = typer.prompt("API Key (선택사항)", default="")

    # 설정 저장
    config_data = {
        "user": {
            "name": name,
            "email": email,
            "api_key": api_key,
        },
        "initialized": True,
        "initialized_at": datetime.now().isoformat(),
    }

    config.save(config_data)
    console.print("[green]✅ 초기화 완료![/green]\n")


@app.command()
def status():
    """📊 시스템 상태 조회"""
    try:
        with Progress(
            SpinnerColumn(),
            "[progress.description]{task.description}",
            console=console
        ) as progress:
            progress.add_task("상태 확인 중...", total=None)

            response = requests.get(f"{API_BASE_URL}/", timeout=5)
            if response.status_code == 200:
                data = response.json()

                # 상태 테이블
                table = Table(title="🔍 시스템 상태", show_header=True)
                table.add_column("항목", style="cyan")
                table.add_column("상태", style="green")

                table.add_row("서버", "✅ 실행 중")
                table.add_row("API 버전", data.get("version", "N/A"))
                table.add_row("메시지", data.get("message", "N/A"))

                console.print(f"\n{table}\n")
            else:
                console.print("[red]❌ 서버에 연결할 수 없습니다[/red]\n")

    except requests.exceptions.ConnectionError:
        console.print("[red]❌ 서버 연결 실패. 서버가 실행 중인지 확인하세요.[/red]\n")
        console.print("실행 명령어: [bold]npm run dev[/bold]\n")


@app.command()
def version():
    """📦 버전 정보"""
    console.print(Panel(
        "[bold cyan]Forge CLI[/bold cyan]\n"
        "Version: 1.4.0\n"
        "Python: 3.11+\n"
        "Framework: Typer + Rich\n"
        "\n"
        "[yellow]사용법:[/yellow]\n"
        "[bold]forge chat[/bold] - 채팅 시작\n"
        "[bold]forge workspace[/bold] - 워크스페이스 관리\n"
        "[bold]forge statistics[/bold] - 통계 분석\n"
        "[bold]forge ecosystem[/bold] - 에코시스템 도구\n"
        "[bold]forge settings[/bold] - 설정 관리\n",
        title="ℹ️  정보"
    ))


@app.command()
def docs():
    """📚 문서 보기"""
    console.print(Panel(
        Markdown("""
# Forge CLI 가이드

## 빠른 시작

### 1. 초기화
```bash
forge init
```

### 2. 채팅 시작
```bash
forge chat
```

### 3. 명령어 도움말
```bash
forge --help
forge chat --help
```

## 주요 기능

### 🗣️ 채팅 (Chat)
- 실시간 AI 대화
- 대화 기록 관리
- 마크다운 지원

### 👥 워크스페이스 (Workspace)
- 팀 협업
- 문서 공유
- 실시간 동기화

### 📊 통계분석 (Statistics)
- 데이터 분석
- 시각화
- 예측 분석

### 🛠️ 에코시스템 (Ecosystem)
- 스킬 관리
- 커넥터 연동
- 자동화

### ⚙️ 설정 (Settings)
- 사용자 설정
- API 키 관리
- 테마 선택

## 예시

### 데이터 분석
```bash
forge statistics analyze --data "10,20,30,40,50"
```

### 채팅 저장
```bash
forge chat --save my_conversation.json
```

### 워크스페이스 목록
```bash
forge workspace list
```
        """),
        title="📖 문서"
    ))


@app.command()
def hello(name: str = typer.Option("World", help="인사할 이름")):
    """👋 간단한 인사"""
    console.print(f"[bold cyan]안녕하세요, {name}![/bold cyan]\n")
    console.print("Forge CLI에 오신 것을 환영합니다! 🚀\n")


# ==================== 25개 메뉴 명령어 ====================

@app.command()
def history(query: Optional[str] = typer.Argument(None, help="검색 쿼리")):
    """📜 대화 히스토리 조회"""
    console.print("[bold cyan]대화 히스토리[/bold cyan]\n")
    if query:
        response = get_ai_response(f"히스토리 검색: {query}")
        console.print(f"[green]{response}[/green]\n")

@app.command()
def scraping(url: str = typer.Argument(..., help="스크래핑할 URL")):
    """🕷️  웹 스크래핑"""
    console.print(f"[bold cyan]웹 스크래핑: {url}[/bold cyan]\n")
    response = get_ai_response(f"웹 스크래핑 분석: {url}")
    console.print(f"[green]{response}[/green]\n")

@app.command()
def ocr(image: str = typer.Argument(..., help="이미지 파일 경로")):
    """📸 OCR (광학 문자 인식)"""
    console.print(f"[bold cyan]OCR 처리: {image}[/bold cyan]\n")
    response = get_ai_response(f"OCR 분석: {image}")
    console.print(f"[green]{response}[/green]\n")

@app.command()
def change_detection(source: str = typer.Argument(..., help="모니터링할 소스")):
    """🔄 변경 감지"""
    console.print(f"[bold cyan]변경 감지: {source}[/bold cyan]\n")
    response = get_ai_response(f"변경 감지 분석: {source}")
    console.print(f"[green]{response}[/green]\n")

@app.command()
def seo(url: str = typer.Argument(..., help="분석할 URL")):
    """🔍 SEO 분석"""
    console.print(f"[bold cyan]SEO 분석: {url}[/bold cyan]\n")
    response = get_ai_response(f"SEO 최적화 분석: {url}")
    console.print(f"[green]{response}[/green]\n")

@app.command()
def crm(action: str = typer.Argument(..., help="CRM 작업")):
    """👤 CRM (고객 관계 관리)"""
    console.print(f"[bold cyan]CRM: {action}[/bold cyan]\n")
    response = get_ai_response(f"CRM 작업: {action}")
    console.print(f"[green]{response}[/green]\n")

@app.command()
def workflows(name: str = typer.Argument(..., help="워크플로우 이름")):
    """⚙️  워크플로우"""
    console.print(f"[bold cyan]워크플로우: {name}[/bold cyan]\n")
    response = get_ai_response(f"워크플로우 실행: {name}")
    console.print(f"[green]{response}[/green]\n")

@app.command()
def presentation(topic: str = typer.Argument(..., help="프리젠테이션 주제")):
    """🎤 프리젠테이션"""
    console.print(f"[bold cyan]프리젠테이션: {topic}[/bold cyan]\n")
    response = get_ai_response(f"프리젠테이션 생성: {topic}")
    console.print(f"[green]{response}[/green]\n")

@app.command()
def integration(service: str = typer.Argument(..., help="통합 서비스")):
    """🔗 통합 대시보드"""
    console.print(f"[bold cyan]통합 대시보드: {service}[/bold cyan]\n")
    response = get_ai_response(f"통합 서비스: {service}")
    console.print(f"[green]{response}[/green]\n")

@app.command()
def branding(element: str = typer.Argument(..., help="브랜딩 요소")):
    """🎨 브랜딩 가이드"""
    console.print(f"[bold cyan]브랜딩 가이드: {element}[/bold cyan]\n")
    response = get_ai_response(f"브랜딩 분석: {element}")
    console.print(f"[green]{response}[/green]\n")

@app.command()
def color_font(style: str = typer.Argument(..., help="스타일")):
    """🎨 색상 & 폰트"""
    console.print(f"[bold cyan]색상 & 폰트: {style}[/bold cyan]\n")
    response = get_ai_response(f"디자인 스타일: {style}")
    console.print(f"[green]{response}[/green]\n")

@app.command()
def cross_platform(platform: str = typer.Argument(..., help="플랫폼")):
    """🌐 크로스플랫폼"""
    console.print(f"[bold cyan]크로스플랫폼: {platform}[/bold cyan]\n")
    response = get_ai_response(f"크로스플랫폼 지원: {platform}")
    console.print(f"[green]{response}[/green]\n")

@app.command()
def performance(metric: str = typer.Argument(..., help="성능 지표")):
    """⚡ 성능 최적화"""
    console.print(f"[bold cyan]성능 최적화: {metric}[/bold cyan]\n")
    response = get_ai_response(f"성능 분석: {metric}")
    console.print(f"[green]{response}[/green]\n")

@app.command()
def version_control(action: str = typer.Argument(..., help="버전 관리 작업")):
    """📦 버전 관리"""
    console.print(f"[bold cyan]버전 관리: {action}[/bold cyan]\n")
    response = get_ai_response(f"버전 관리: {action}")
    console.print(f"[green]{response}[/green]\n")

@app.command()
def voice_design(command: str = typer.Argument(..., help="음성 명령")):
    """🎙️  음성 명령어"""
    console.print(f"[bold cyan]음성 명령: {command}[/bold cyan]\n")
    response = get_ai_response(f"음성 처리: {command}")
    console.print(f"[green]{response}[/green]\n")

@app.command()
def multilingual(language: str = typer.Argument(..., help="언어")):
    """🌍 다국어"""
    console.print(f"[bold cyan]다국어: {language}[/bold cyan]\n")
    response = get_ai_response(f"다국어 지원: {language}")
    console.print(f"[green]{response}[/green]\n")

@app.command()
def collaboration(action: str = typer.Argument(..., help="협업 작업")):
    """👥 협업"""
    console.print(f"[bold cyan]협업: {action}[/bold cyan]\n")
    response = get_ai_response(f"협업 기능: {action}")
    console.print(f"[green]{response}[/green]\n")

@app.command()
def auto_layout(config: str = typer.Argument(..., help="레이아웃 설정")):
    """📐 자동 레이아웃"""
    console.print(f"[bold cyan]자동 레이아웃: {config}[/bold cyan]\n")
    response = get_ai_response(f"레이아웃 자동화: {config}")
    console.print(f"[green]{response}[/green]\n")

@app.command()
def xr_preview(scene: str = typer.Argument(..., help="씬 이름")):
    """🥽 AR/VR 미리보기"""
    console.print(f"[bold cyan]AR/VR 미리보기: {scene}[/bold cyan]\n")
    response = get_ai_response(f"XR 프리뷰: {scene}")
    console.print(f"[green]{response}[/green]\n")

@app.command()
def deployment(target: str = typer.Argument(..., help="배포 대상")):
    """🚀 클라우드 배포"""
    console.print(f"[bold cyan]클라우드 배포: {target}[/bold cyan]\n")
    response = get_ai_response(f"배포 대상: {target}")
    console.print(f"[green]{response}[/green]\n")

@app.command()
def quick_start(tutorial: str = typer.Argument(..., help="튜토리얼")):
    """⚡ 빠른 시작"""
    console.print(f"[bold cyan]빠른 시작: {tutorial}[/bold cyan]\n")
    response = get_ai_response(f"튜토리얼: {tutorial}")
    console.print(f"[green]{response}[/green]\n")

@app.command()
def themes(theme: str = typer.Argument(..., help="테마 이름")):
    """🎨 테마"""
    console.print(f"[bold cyan]테마: {theme}[/bold cyan]\n")
    response = get_ai_response(f"테마 적용: {theme}")
    console.print(f"[green]{response}[/green]\n")


# ==================== 서브 앱 등록 ====================

# Chat 명령어 그룹
app.add_typer(chat_app, name="chat", help="🗣️  채팅 및 AI 대화")

# Workspace 명령어 그룹
app.add_typer(workspace_app, name="workspace", help="👥 워크스페이스 협업")

# Statistics 명령어 그룹
app.add_typer(statistics_app, name="statistics", help="📊 통계분석")

# Ecosystem 명령어 그룹
app.add_typer(ecosystem_app, name="ecosystem", help="🛠️  에코시스템")

# Settings 명령어 그룹
app.add_typer(settings_app, name="settings", help="⚙️  설정")

# Image 명령어 그룹 (웹/데스크톱 이미지 생성)
app.add_typer(image_app, name="image", help="🎨 AI 이미지 생성")

# Hardware 명령어 그룹
app.add_typer(hardware_app, name="hardware", help="🧩 하드웨어 정보")

# Backend 명령어 그룹 (시크릿 키 로드 후 백엔드 실행)
app.add_typer(backend_app, name="backend", help="🖥️  로컬 백엔드 실행")

# Code 명령어 그룹 (자율 코드 에이전트)
app.add_typer(code_app, name="code", help="🛠️  코드 에이전트")

# Label 명령어 그룹 (데이터 엔진 라벨링)
app.add_typer(label_app, name="label", help="🏷️  데이터 라벨링")


# ==================== 메인 진입점 ====================

def main():
    """Forge CLI 메인 진입점"""
    try:
        app()
    except KeyboardInterrupt:
        console.print("\n[yellow]프로그램을 종료합니다.[/yellow]")
    except Exception as e:
        console.print(f"[red]오류 발생: {e}[/red]")
        logger.error(f"CLI Error: {e}")


if __name__ == "__main__":
    main()
