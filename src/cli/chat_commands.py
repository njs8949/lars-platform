"""
채팅 명령어 - 데스크톱 앱의 채팅 기능을 CLI로 구현
"""

import typer
import json
import os
from typing import Optional
from datetime import datetime
from pathlib import Path
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.markdown import Markdown
from rich.syntax import Syntax
from rich.prompt import Prompt, Confirm

from src.cli import prism_api
from src.cli.utils import Config, Logger, format_response

console = Console()
config = Config()
logger = Logger()

chat_app = typer.Typer(help="🗣️  AI와 채팅하고 대화 관리")

CHATS_DIR = Path(".lars/chats")


# ==================== 초기화 ====================

def _init_chats_dir():
    """채팅 디렉토리 생성"""
    CHATS_DIR.mkdir(parents=True, exist_ok=True)


# ==================== 채팅 명령어 ====================

def _stream_reply(message: str, history: list) -> str:
    """스트리밍 응답을 실시간으로 그린다 (웹 채팅과 동일한 /assistant/chat/stream)."""
    from rich.live import Live

    reply = ""
    console.print("\n[bold green]LARS[/bold green]")
    with Live(Markdown(""), console=console, refresh_per_second=12) as live:
        for event in prism_api.stream_assistant(message, history):
            if event["type"] == "delta":
                reply += event["text"]
            elif event["type"] == "replace":
                reply = event["text"]
            live.update(Markdown(reply))
    console.print()
    return reply


def _respond(message: str, history: list) -> str:
    """이미지 요청이면 이미지를 생성하고, 아니면 스트리밍 채팅으로 응답한다."""
    if prism_api.detect_image_request(message):
        image = prism_api.run_with_progress(
            lambda: prism_api.generate_image(message, model="dalle", quality="medium"),
            label="이미지 제작 중",
        )
        path = prism_api.download_image(image)
        console.print(f"\n[green]🖼️  이미지를 생성했습니다[/green]: [bold]{path}[/bold]\n")
        return f"이미지를 생성했습니다: {path}"
    return _stream_reply(message, history)


@chat_app.command()
def interactive():
    """💬 대화형 채팅 모드"""
    _init_chats_dir()

    console.print("\n[bold cyan]Forge 채팅[/bold cyan]")
    console.print("[dim]명령어: /save (저장), /clear (지우기), /exit (종료)[/dim]")
    console.print("[dim]'고양이 그려줘'처럼 요청하면 이미지를 생성합니다.[/dim]\n")

    chat_id = datetime.now().strftime("%Y%m%d_%H%M%S")
    chat_file = CHATS_DIR / f"chat_{chat_id}.json"
    messages = []

    try:
        while True:
            user_input = Prompt.ask("[bold cyan]You[/bold cyan]")

            if user_input.lower() == "/exit":
                if Confirm.ask("대화를 종료하시겠습니까?"):
                    console.print("[yellow]채팅 종료[/yellow]\n")
                    break
                continue

            if user_input.lower() == "/clear":
                if Confirm.ask("대화 기록을 삭제하시겠습니까?"):
                    messages = []
                    console.print("[green]✅ 대화 기록 삭제됨[/green]\n")
                continue

            if user_input.lower() == "/save":
                _save_chat(chat_file, messages)
                continue

            if not user_input.strip():
                continue

            try:
                reply = _respond(user_input, messages)
            except prism_api.PrismApiError as e:
                console.print(f"[red]❌ {e}[/red]\n")
                continue

            messages.append({"role": "user", "content": user_input})
            messages.append({"role": "assistant", "content": reply})

    except KeyboardInterrupt:
        if Confirm.ask("\n대화를 저장하시겠습니까?"):
            _save_chat(chat_file, messages)
        console.print("[yellow]종료합니다.[/yellow]\n")


@chat_app.command()
def send(
    message: str = typer.Argument(..., help="전송할 메시지"),
    save: Optional[str] = typer.Option(None, help="파일에 저장 (경로)")
):
    """📤 단일 메시지 전송"""
    try:
        reply = _respond(message, [])
    except prism_api.PrismApiError as e:
        console.print(f"[red]❌ {e}[/red]\n")
        raise typer.Exit(code=1)

    if save:
        chat_data = {"timestamp": datetime.now().isoformat(), "user": message, "assistant": reply}
        with open(save, "w", encoding="utf-8") as f:
            json.dump(chat_data, f, ensure_ascii=False, indent=2)
        console.print(f"[green]✅ {save}에 저장됨[/green]\n")


@chat_app.command()
def history():
    """📜 대화 기록 조회"""
    _init_chats_dir()

    chat_files = list(CHATS_DIR.glob("chat_*.json"))

    if not chat_files:
        console.print("[yellow]대화 기록이 없습니다.[/yellow]\n")
        return

    table = Table(title="💬 대화 기록", show_header=True)
    table.add_column("파일명", style="cyan")
    table.add_column("생성 시간", style="magenta")
    table.add_column("메시지 수", style="green")

    for chat_file in sorted(chat_files, reverse=True):
        try:
            with open(chat_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                messages = data if isinstance(data, list) else [data]
                created_time = chat_file.stem.replace("chat_", "")
                table.add_row(
                    chat_file.name,
                    created_time,
                    str(len(messages))
                )
        except:
            pass

    console.print(f"\n{table}\n")


@chat_app.command()
def view(chat_file: str = typer.Argument(..., help="조회할 대화 파일 (상대 경로)")):
    """👁️  대화 내용 조회"""
    file_path = CHATS_DIR / chat_file if not chat_file.startswith("/") else Path(chat_file)

    if not file_path.exists():
        console.print(f"[red]❌ 파일을 찾을 수 없습니다: {file_path}[/red]\n")
        return

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            messages = data if isinstance(data, list) else [data]

        console.print(f"\n[bold]📖 {file_path.name}[/bold]\n")

        for msg in messages:
            role = msg.get("role", "unknown").upper()
            content = msg.get("content", "")

            if role == "USER":
                console.print(f"[bold cyan]👤 You[/bold cyan]")
            else:
                console.print(f"[bold green]🤖 LARS[/bold green]")

            console.print(Markdown(content))
            console.print()

    except Exception as e:
        console.print(f"[red]❌ 오류: {e}[/red]\n")


@chat_app.command()
def delete(
    chat_file: str = typer.Argument(..., help="삭제할 파일"),
    force: bool = typer.Option(False, "--force", "-f", help="확인 없이 삭제")
):
    """🗑️  대화 기록 삭제"""
    file_path = CHATS_DIR / chat_file if not chat_file.startswith("/") else Path(chat_file)

    if not file_path.exists():
        console.print(f"[red]❌ 파일을 찾을 수 없습니다[/red]\n")
        return

    if not force and not Confirm.ask(f"[{file_path.name}]을 삭제하시겠습니까?"):
        console.print("[yellow]취소됨[/yellow]\n")
        return

    try:
        file_path.unlink()
        console.print(f"[green]✅ {file_path.name} 삭제됨[/green]\n")
    except Exception as e:
        console.print(f"[red]❌ 오류: {e}[/red]\n")


@chat_app.command()
def export(
    output_format: str = typer.Option("json", "--format", "-f", help="출력 형식 (json/markdown/txt)"),
    output_file: Optional[str] = typer.Option(None, "--output", "-o", help="출력 파일 경로")
):
    """💾 모든 대화를 내보내기"""
    _init_chats_dir()

    chat_files = list(CHATS_DIR.glob("chat_*.json"))

    if not chat_files:
        console.print("[yellow]내보낼 대화가 없습니다.[/yellow]\n")
        return

    all_messages = []
    for chat_file in sorted(chat_files):
        try:
            with open(chat_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                messages = data if isinstance(data, list) else [data]
                all_messages.extend(messages)
        except:
            pass

    # 형식에 따라 변환
    if output_format == "json":
        content = json.dumps(all_messages, ensure_ascii=False, indent=2)
    elif output_format == "markdown":
        lines = ["# Forge 대화 기록\n"]
        for msg in all_messages:
            role = msg.get("role", "").upper()
            content = msg.get("content", "")
            lines.append(f"## {role}\n{content}\n")
        content = "\n".join(lines)
    else:  # txt
        lines = []
        for msg in all_messages:
            role = msg.get("role", "").upper()
            content = msg.get("content", "")
            lines.append(f"[{role}]\n{content}\n")
        content = "\n".join(lines)

    # 파일 저장
    if output_file:
        with open(output_file, "w", encoding="utf-8") as f:
            f.write(content)
        console.print(f"[green]✅ {output_file}에 내보냈습니다[/green]\n")
    else:
        console.print(content)
        console.print()


# ==================== 헬퍼 함수 ====================

def _save_chat(file_path: Path, messages: list):
    """채팅 저장"""
    try:
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(messages, f, ensure_ascii=False, indent=2)
        console.print(f"[green]✅ {file_path.name}에 저장됨[/green]\n")
    except Exception as e:
        console.print(f"[red]❌ 저장 실패: {e}[/red]\n")
