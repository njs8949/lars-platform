"""
백엔드 명령어 - 시크릿 매니저의 이미지 API 키를 읽어 로컬 백엔드를 실행
"""

import json
import os
import shlex
import subprocess
import sys
from pathlib import Path

import typer
from rich.console import Console

console = Console()
backend_app = typer.Typer(help="🖥️  로컬 백엔드 실행 (시크릿 매니저 키 로드)")

PROJECT_ROOT = Path(__file__).resolve().parents[2]
KEY_NAMES = ["OPENAI_API_KEY", "STABILITY_API_KEY", "REPLICATE_API_KEY", "HUGGINGFACE_API_KEY"]


def load_image_keys(secret_id: str, region: str) -> dict:
    """시크릿에서 키를 읽는다. 값은 디스크에 저장하지 않는다."""
    raw = subprocess.run(
        ["aws", "secretsmanager", "get-secret-value", "--secret-id", secret_id,
         "--region", region, "--query", "SecretString", "--output", "text"],
        capture_output=True, text=True, timeout=60,
    )
    if raw.returncode != 0:
        raise RuntimeError(f"시크릿 조회 실패: {raw.stderr.strip()}")
    data = json.loads(raw.stdout)
    return {k: data[k] for k in KEY_NAMES if data.get(k)}


@backend_app.command()
def start(
    port: int = typer.Option(8001, "--port", "-p", help="백엔드 포트"),
    secret_id: str = typer.Option("lars-prism/image-api-keys", "--secret-id", help="키가 들어 있는 시크릿 이름"),
    region: str = typer.Option("ap-northeast-2", "--region", help="시크릿 리전"),
):
    """🚀 시크릿 키를 환경 변수로 넣고 백엔드(uvicorn)를 실행"""
    try:
        keys = load_image_keys(secret_id, region)
    except Exception as e:
        console.print(f"[red]❌ {e}[/red]")
        console.print("[dim]AWS SSO 로그인: aws sso login --sso-session lars-sso[/dim]")
        raise typer.Exit(code=1)

    loaded = ", ".join(f"{k.replace('_API_KEY', '')}={'set' if k in keys else 'empty'}" for k in KEY_NAMES)
    console.print(f"[green]🔑 키 로드[/green]: {loaded}")
    console.print(f"[bold]백엔드 시작: http://127.0.0.1:{port}[/bold] (Ctrl+C로 종료)")

    env = {**os.environ, **keys}
    cmd = [sys.executable, "-m", "uvicorn", "app:app", "--host", "127.0.0.1", "--port", str(port)]
    console.print(f"[dim]$ {shlex.join(cmd)}[/dim]")
    subprocess.run(cmd, cwd=PROJECT_ROOT, env=env)
