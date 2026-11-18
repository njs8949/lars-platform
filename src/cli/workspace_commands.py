"""워크스페이스 명령어"""
import typer
import json
from typing import Optional
from pathlib import Path
from rich.console import Console
from rich.table import Table
from datetime import datetime
import requests

console = Console()
workspace_app = typer.Typer(help="👥 팀 협업 및 워크스페이스 관리")
API_BASE_URL = "http://localhost:8000"
WORKSPACE_DIR = Path(".lars/workspace")

def _init_workspace():
    WORKSPACE_DIR.mkdir(parents=True, exist_ok=True)

@workspace_app.command()
def list():
    """📋 워크스페이스 목록"""
    try:
        response = requests.get(f"{API_BASE_URL}/api/workspace/list", timeout=10)
        if response.status_code == 200:
            workspaces = response.json().get("workspaces", [])

            if not workspaces:
                console.print("[yellow]워크스페이스가 없습니다.[/yellow]\n")
                return

            table = Table(title="👥 워크스페이스", show_header=True)
            table.add_column("이름", style="cyan")
            table.add_column("소유자", style="green")
            table.add_column("멤버", style="yellow")
            table.add_column("생성일", style="magenta")

            for ws in workspaces:
                table.add_row(
                    ws.get("name", "N/A"),
                    ws.get("owner", "N/A"),
                    str(ws.get("member_count", 0)),
                    ws.get("created_at", "N/A")
                )

            console.print(f"\n{table}\n")
        else:
            console.print("[red]❌ 워크스페이스 로드 실패[/red]\n")
    except Exception as e:
        console.print(f"[red]❌ 오류: {e}[/red]\n")

@workspace_app.command()
def create(
    name: str = typer.Argument(..., help="워크스페이스 이름"),
    description: Optional[str] = typer.Option(None, "--desc", "-d", help="설명")
):
    """🆕 새 워크스페이스 생성"""
    try:
        payload = {
            "name": name,
            "description": description or "",
            "created_at": datetime.now().isoformat()
        }

        response = requests.post(
            f"{API_BASE_URL}/api/workspace/create",
            json=payload,
            timeout=10
        )

        if response.status_code == 200:
            result = response.json()
            console.print(f"[green]✅ 워크스페이스 '{name}' 생성됨[/green]\n")
            _save_workspace(result)
        else:
            console.print("[red]❌ 생성 실패[/red]\n")
    except Exception as e:
        console.print(f"[red]❌ 오류: {e}[/red]\n")

@workspace_app.command()
def invite(
    workspace: str = typer.Argument(..., help="워크스페이스 이름"),
    email: str = typer.Argument(..., help="초대할 이메일")
):
    """📧 멤버 초대"""
    try:
        payload = {
            "workspace": workspace,
            "email": email,
            "role": "member"
        }

        response = requests.post(
            f"{API_BASE_URL}/api/workspace/invite",
            json=payload,
            timeout=10
        )

        if response.status_code == 200:
            console.print(f"[green]✅ {email}에 초대 발송됨[/green]\n")
        else:
            console.print("[red]❌ 초대 실패[/red]\n")
    except Exception as e:
        console.print(f"[red]❌ 오류: {e}[/red]\n")

@workspace_app.command()
def members(workspace: str = typer.Argument(..., help="워크스페이스 이름")):
    """👤 멤버 목록"""
    try:
        response = requests.get(
            f"{API_BASE_URL}/api/workspace/members?workspace={workspace}",
            timeout=10
        )

        if response.status_code == 200:
            members = response.json().get("members", [])

            table = Table(title=f"👥 {workspace} 멤버", show_header=True)
            table.add_column("이름", style="cyan")
            table.add_column("이메일", style="green")
            table.add_column("역할", style="yellow")
            table.add_column("가입일", style="magenta")

            for member in members:
                table.add_row(
                    member.get("name", "N/A"),
                    member.get("email", "N/A"),
                    member.get("role", "member"),
                    member.get("joined_at", "N/A")
                )

            console.print(f"\n{table}\n")
        else:
            console.print("[red]❌ 멤버 로드 실패[/red]\n")
    except Exception as e:
        console.print(f"[red]❌ 오류: {e}[/red]\n")

def _save_workspace(data):
    _init_workspace()
    ws_file = WORKSPACE_DIR / f"{data.get('name', 'workspace')}.json"
    with open(ws_file, "w") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
