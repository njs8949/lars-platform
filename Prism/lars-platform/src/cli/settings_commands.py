"""설정 명령어"""
import typer
import json
from pathlib import Path
from rich.console import Console
from rich.table import Table
from rich.prompt import Confirm

console = Console()
settings_app = typer.Typer(help="⚙️  설정 관리")

CONFIG_FILE = Path(".lars/config.json")

def _load_config():
    if CONFIG_FILE.exists():
        with open(CONFIG_FILE, "r") as f:
            return json.load(f)
    return {}

def _save_config(config):
    CONFIG_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(CONFIG_FILE, "w") as f:
        json.dump(config, f, ensure_ascii=False, indent=2)

@settings_app.command()
def view():
    """👁️  현재 설정 조회"""
    config = _load_config()

    if not config:
        console.print("[yellow]설정이 없습니다.[/yellow]\n")
        return

    console.print("\n[bold cyan]⚙️  현재 설정[/bold cyan]\n")

    table = Table(show_header=True)
    table.add_column("설정", style="cyan")
    table.add_column("값", style="green")

    for key, value in config.items():
        if isinstance(value, dict):
            table.add_row(key, json.dumps(value, ensure_ascii=False))
        else:
            table.add_row(key, str(value))

    console.print(f"{table}\n")

@settings_app.command()
def set_language(language: str = typer.Argument(..., help="언어 (ko/en)")):
    """🌐 언어 설정"""
    if language not in ["ko", "en"]:
        console.print("[red]❌ 지원하는 언어: ko (한국어), en (영어)[/red]\n")
        return

    config = _load_config()
    config["language"] = language
    _save_config(config)

    lang_name = "한국어" if language == "ko" else "English"
    console.print(f"[green]✅ 언어를 {lang_name}로 변경했습니다[/green]\n")

@settings_app.command()
def set_theme(theme: str = typer.Argument(..., help="테마 (light/dark)")):
    """🎨 테마 설정"""
    if theme not in ["light", "dark"]:
        console.print("[red]❌ 지원하는 테마: light, dark[/red]\n")
        return

    config = _load_config()
    config["theme"] = theme
    _save_config(config)

    console.print(f"[green]✅ 테마를 {theme}로 변경했습니다[/green]\n")

@settings_app.command()
def set_api_key(key: str = typer.Option(..., "--key", "-k", prompt=True, hide_input=True, help="API Key")):
    """🔑 API Key 설정"""
    config = _load_config()
    config["api_key"] = key
    _save_config(config)

    console.print("[green]✅ API Key가 설정되었습니다[/green]\n")

@settings_app.command()
def set_server_url(url: str = typer.Argument(..., help="서버 URL")):
    """🌐 서버 URL 설정"""
    config = _load_config()
    config["server_url"] = url
    _save_config(config)

    console.print(f"[green]✅ 서버 URL을 {url}로 설정했습니다[/green]\n")

@settings_app.command()
def reset():
    """🔄 모든 설정 초기화"""
    if not Confirm.ask("[yellow]모든 설정을 초기화하시겠습니까?[/yellow]"):
        console.print("[yellow]취소됨[/yellow]\n")
        return

    if CONFIG_FILE.exists():
        CONFIG_FILE.unlink()

    console.print("[green]✅ 설정이 초기화되었습니다[/green]\n")

@settings_app.command()
def user():
    """👤 사용자 정보 설정"""
    config = _load_config()
    user_config = config.get("user", {})

    console.print("\n[bold cyan]👤 사용자 정보[/bold cyan]\n")

    name = typer.prompt("이름", default=user_config.get("name", ""))
    email = typer.prompt("이메일", default=user_config.get("email", ""))

    config["user"] = {
        "name": name,
        "email": email
    }
    _save_config(config)

    console.print("[green]✅ 사용자 정보가 저장되었습니다[/green]\n")

@settings_app.command()
def show_version():
    """📦 버전 정보"""
    console.print(Panel(
        """[bold]Forge CLI[/bold]

Version: 1.4.0
Platform: Cross-platform (Linux, macOS, Windows)
Python: 3.11+
Dependencies: Typer, Rich, Requests
        """,
        title="ℹ️  정보"
    ))

from rich.panel import Panel
