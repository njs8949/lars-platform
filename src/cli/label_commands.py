"""
라벨링 명령어 - 데이터 엔진: AI 다수결 라벨 + 불확실한 항목만 사람 검수
"""

from pathlib import Path
from typing import List

import typer
from rich.console import Console
from rich.prompt import Prompt
from rich.table import Table

from src.core import labeling
from src.core.code_agent import LLMClient

console = Console()
label_app = typer.Typer(help="🏷️  데이터 라벨링 (AI 다수결 + 불확실 항목만 검수)")


def _dataset_dir(name: str) -> Path:
    return labeling.OUTPUT_ROOT / name


def _parse_labels(raw: str) -> List[str]:
    labels = [x.strip() for x in raw.split(",") if x.strip()]
    if len(labels) < 2:
        raise typer.BadParameter("라벨은 쉼표로 구분해 2개 이상 주세요. 예: 긍정,부정,중립")
    return labels


@label_app.command()
def run(
    input_file: Path = typer.Argument(..., help="입력 JSONL (각 줄: {\"id\":..., \"text\":...} 또는 {\"id\":..., \"image\":경로})"),
    labels: str = typer.Option(..., "--labels", "-l", help="라벨 목록 (쉼표 구분)"),
    dataset: str = typer.Option(..., "--dataset", "-d", help="데이터셋 이름 (결과 폴더)"),
    votes: int = typer.Option(labeling.DEFAULT_VOTES, "--votes", "-k", help="항목당 투표 수"),
    threshold: float = typer.Option(labeling.DEFAULT_THRESHOLD, "--threshold", "-t", help="이 일치율 미만이면 검수 큐로"),
    model: str = typer.Option("auto", "--model", "-m", help="auto / claude / ollama (이미지는 claude 필요)"),
):
    """🏷️  데이터 라벨링 실행"""
    label_list = _parse_labels(labels)
    try:
        llm = LLMClient(model)
        items = labeling.load_items(input_file)
    except (RuntimeError, ValueError, OSError) as e:
        console.print(f"[red]❌ {e}[/red]")
        raise typer.Exit(code=1)

    out_dir = _dataset_dir(dataset)
    console.print(f"[bold cyan]🏷️  라벨링 시작[/bold cyan] {len(items)}건, 라벨 {label_list}, 투표 {votes}회 ({llm.provider})")

    def show(item, record):
        mark = "[green]자동[/green]" if record.status == "auto" else "[yellow]검수 대기[/yellow]"
        console.print(f"  {item.id}: {record.label} (일치 {record.agreement:.2f}) {mark}")

    summary = labeling.label_items(items, label_list, llm, out_dir, k=votes, threshold=threshold, on_item=show)
    console.print(
        f"\n[bold]완료[/bold]: 전체 {summary.total} · 자동 {summary.auto} · 검수 대기 {summary.review} · 실패 {summary.failed}"
    )
    console.print(f"[dim]결과 폴더: {out_dir}[/dim]")


@label_app.command()
def review(dataset: str = typer.Option(..., "--dataset", "-d", help="데이터셋 이름"),
           labels: str = typer.Option(..., "--labels", "-l", help="라벨 목록 (쉼표 구분, run과 동일하게)")):
    """✍️  불확실한 항목을 사람이 검수 (Enter: AI 라벨 채택, s: 건너뛰기)"""
    label_list = _parse_labels(labels)
    out_dir = _dataset_dir(dataset)
    pending = labeling.pending_reviews(out_dir)
    if not pending:
        console.print("[dim]검수 대기 항목이 없습니다.[/dim]")
        return

    console.print(f"[bold]검수 대기 {len(pending)}건[/bold]  (번호 또는 라벨 이름 입력, Enter: AI 라벨, s: 건너뛰기)")
    for index, record in enumerate(pending, start=1):
        console.print(f"\n[bold]({index}/{len(pending)}) {record['id']}[/bold] AI 라벨: [yellow]{record['label']}[/yellow] (일치 {record['agreement']:.2f}, 투표 {record['votes']})")
        console.print(f"  {record['preview']}")
        for n, name in enumerate(label_list, start=1):
            console.print(f"  {n}. {name}")
        answer = Prompt.ask("선택", default="")
        if answer.lower() == "s":
            continue
        if answer == "":
            chosen = record["label"]
        elif answer.isdigit() and 1 <= int(answer) <= len(label_list):
            chosen = label_list[int(answer) - 1]
        else:
            chosen = answer
        try:
            labeling.save_human_label(out_dir, record["id"], chosen, label_list)
            console.print(f"[green]✅ 저장: {chosen}[/green]")
        except ValueError as e:
            console.print(f"[red]❌ {e}[/red]")


@label_app.command()
def export(dataset: str = typer.Option(..., "--dataset", "-d", help="데이터셋 이름")):
    """📦 최종 데이터셋 내보내기 (검수 라벨 우선)"""
    path = labeling.export_dataset(_dataset_dir(dataset))
    console.print(f"[green]✅ 내보내기 완료[/green]: {path}")


@label_app.command()
def stats(dataset: str = typer.Option(..., "--dataset", "-d", help="데이터셋 이름")):
    """📊 라벨링 현황 (자동 비율, 검수 대기)"""
    data = labeling.stats(_dataset_dir(dataset))
    table = Table(title=f"🏷️  {dataset}", show_header=True)
    table.add_column("항목", style="cyan")
    table.add_column("값", style="green")
    table.add_row("전체", str(data["total"]))
    table.add_row("자동 확정", str(data["auto"]))
    table.add_row("자동 비율", f"{data['auto_rate'] * 100:.1f}%")
    table.add_row("검수 대기", str(data["pending_review"]))
    table.add_row("사람 검수 완료", str(data["human_reviewed"]))
    console.print(table)


@label_app.command("eval")
def eval_cmd(
    dataset: str = typer.Option(..., "--dataset", "-d", help="데이터셋 이름"),
    gold: Path = typer.Option(..., "--gold", help="정답 JSONL (각 줄: {\"id\":..., \"label\":...})"),
):
    """🎯 정답 라벨과 비교해 정확도 측정"""
    result = labeling.evaluate_against_gold(_dataset_dir(dataset), gold)
    console.print(
        f"비교 {result['compared']}건 · 전체 정확도 {result['accuracy'] * 100:.1f}% · "
        f"자동 확정만 {result['auto_compared']}건 정확도 {result['auto_accuracy'] * 100:.1f}%"
    )
