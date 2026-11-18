"""
이미지 명령어 - 웹/데스크톱의 이미지 생성 기능을 CLI로 구현
"""

from pathlib import Path
from typing import Optional

import typer
from rich.console import Console
from rich.table import Table

from src.cli import prism_api

console = Console()
image_app = typer.Typer(help="🎨 AI 이미지 생성 (GPT 이미지 / 스테이블 디퓨전)")


@image_app.command()
def generate(
    prompt: str = typer.Argument(..., help="이미지 설명 (프롬프트)"),
    model: str = typer.Option("gpt", "--model", "-m", help="gpt(GPT 이미지) 또는 stable(스테이블 디퓨전)"),
    size: str = typer.Option("1024x1024", "--size", "-s", help="이미지 크기 (예: 1024x1024)"),
    quality: str = typer.Option("medium", "--quality", "-q", help="품질: low / medium / hd"),
    output_dir: Path = typer.Option(prism_api.IMAGE_DIR, "--output", "-o", help="저장 폴더"),
):
    """🖼️  프롬프트로 이미지 생성"""
    if model not in prism_api.IMAGE_MODELS:
        console.print(f"[red]❌ 지원하지 않는 모델: {model} (gpt 또는 stable)[/red]")
        raise typer.Exit(code=1)

    try:
        image = prism_api.run_with_progress(
            lambda: prism_api.generate_image(
                prompt, model=prism_api.IMAGE_MODELS[model], quality=quality, size=size
            ),
            label="이미지 제작 중",
        )
        path = prism_api.download_image(image, output_dir)
    except prism_api.PrismApiError as e:
        console.print(f"[red]❌ {e}[/red]")
        raise typer.Exit(code=1)

    console.print(f"[green]✅ 이미지 생성 완료[/green] ({image['model']}, {image['size']})")
    console.print(f"📁 저장 위치: [bold]{path}[/bold]")


@image_app.command()
def history(limit: int = typer.Option(20, "--limit", "-n", help="표시 개수")):
    """📜 이미지 생성 이력"""
    try:
        images = prism_api.list_images(limit)
    except Exception as e:
        console.print(f"[red]❌ {e}[/red]")
        raise typer.Exit(code=1)

    if not images:
        console.print("[dim]생성된 이미지가 없습니다.[/dim]")
        return

    table = Table(title="🖼️  이미지 생성 이력", show_header=True)
    table.add_column("ID", style="cyan")
    table.add_column("모델", style="magenta")
    table.add_column("크기")
    table.add_column("프롬프트", overflow="fold")
    table.add_column("생성 시각", style="dim")
    for img in images:
        table.add_row(img["id"], img["model"], img["size"], img["prompt"], img.get("created_at", "")[:19])
    console.print(table)


@image_app.command()
def delete(image_id: str = typer.Argument(..., help="삭제할 이미지 ID")):
    """🗑️  이미지 이력 삭제"""
    try:
        result = prism_api.delete_image(image_id)
    except Exception as e:
        console.print(f"[red]❌ {e}[/red]")
        raise typer.Exit(code=1)
    console.print(f"[green]✅ {result.get('message', '삭제됨')}[/green]")
