"""에코시스템 명령어 - 스킬 및 커넥터 관리"""
import typer
import json
from typing import Optional
from rich.console import Console
from rich.table import Table
import requests

console = Console()
ecosystem_app = typer.Typer(help="🛠️  스킬 및 커넥터 관리")
API_BASE_URL = "http://localhost:8000"

@ecosystem_app.command()
def list_skills():
    """📋 설치된 스킬 목록"""
    try:
        response = requests.get(f"{API_BASE_URL}/api/ecosystem/skills", timeout=10)
        if response.status_code == 200:
            skills = response.json().get("skills", [])

            if not skills:
                console.print("[yellow]스킬이 없습니다.[/yellow]\n")
                return

            table = Table(title="🛠️  설치된 스킬", show_header=True)
            table.add_column("이름", style="cyan")
            table.add_column("버전", style="green")
            table.add_column("설명", style="yellow")

            for skill in skills:
                table.add_row(
                    skill.get("name", "N/A"),
                    skill.get("version", "N/A"),
                    skill.get("description", "N/A")
                )

            console.print(f"\n{table}\n")
        else:
            console.print("[red]❌ 스킬 로드 실패[/red]\n")
    except Exception as e:
        console.print(f"[red]❌ 오류: {e}[/red]\n")

@ecosystem_app.command()
def list_connectors():
    """🔌 사용 가능한 커넥터"""
    try:
        response = requests.get(f"{API_BASE_URL}/api/auto-installer/available-connectors", timeout=10)
        if response.status_code == 200:
            connectors = response.json().get("connectors", [])

            table = Table(title="🔌 사용 가능한 커넥터", show_header=True)
            table.add_column("이름", style="cyan")
            table.add_column("타입", style="green")
            table.add_column("기능 수", style="yellow")

            for conn in connectors:
                table.add_row(
                    conn.get("name", "N/A"),
                    conn.get("type", "N/A"),
                    str(len(conn.get("capabilities", [])))
                )

            console.print(f"\n{table}\n")
        else:
            console.print("[red]❌ 커넥터 로드 실패[/red]\n")
    except Exception as e:
        console.print(f"[red]❌ 오류: {e}[/red]\n")

@ecosystem_app.command()
def install_skill(
    skill_name: str = typer.Argument(..., help="설치할 스킬 이름")
):
    """📦 스킬 설치"""
    try:
        payload = {"skill_name": skill_name}
        response = requests.post(
            f"{API_BASE_URL}/api/ecosystem/install-skill",
            json=payload,
            timeout=30
        )

        if response.status_code == 200:
            console.print(f"[green]✅ '{skill_name}' 스킬 설치됨[/green]\n")
        else:
            console.print("[red]❌ 설치 실패[/red]\n")
    except Exception as e:
        console.print(f"[red]❌ 오류: {e}[/red]\n")

@ecosystem_app.command()
def setup_connector(
    connector_id: str = typer.Argument(..., help="커넥터 ID")
):
    """⚙️  커넥터 설정"""
    try:
        console.print(f"[yellow]'{connector_id}' 커넥터 설정[/yellow]\n")

        # API Key 입력
        api_key = typer.prompt("API Key", hide_input=True)

        if not api_key:
            console.print("[yellow]설정 취소됨[/yellow]\n")
            return

        payload = {
            "connector_id": connector_id,
            "auth_info": {"api_key": api_key}
        }

        response = requests.post(
            f"{API_BASE_URL}/api/auto-installer/set-auth",
            json=payload,
            timeout=10
        )

        if response.status_code == 200:
            console.print(f"[green]✅ '{connector_id}' 설정 완료[/green]\n")
        else:
            console.print("[red]❌ 설정 실패[/red]\n")
    except Exception as e:
        console.print(f"[red]❌ 오류: {e}[/red]\n")

@ecosystem_app.command()
def auto_detect(
    task: str = typer.Argument(..., help="작업 설명")
):
    """🔍 필요한 스킬/커넥터 자동 감지"""
    try:
        console.print(f"[cyan]작업 분석: {task}[/cyan]\n")

        response = requests.post(
            f"{API_BASE_URL}/api/auto-installer/detect-connectors",
            json={"task_description": task},
            timeout=10
        )

        if response.status_code == 200:
            result = response.json()
            connectors = result.get("detected_connectors", [])

            if connectors:
                console.print(f"[green]✅ {len(connectors)}개 커넥터 감지됨[/green]\n")

                table = Table(title="🔌 감지된 커넥터", show_header=True)
                table.add_column("이름", style="cyan")
                table.add_column("타입", style="green")
                table.add_column("기능", style="yellow")

                for conn in connectors:
                    table.add_row(
                        conn.get("name", "N/A"),
                        conn.get("type", "N/A"),
                        ", ".join(conn.get("capabilities", [])[:2])
                    )

                console.print(f"{table}\n")
            else:
                console.print("[yellow]감지된 커넥터가 없습니다.[/yellow]\n")
        else:
            console.print("[red]❌ 분석 실패[/red]\n")
    except Exception as e:
        console.print(f"[red]❌ 오류: {e}[/red]\n")
