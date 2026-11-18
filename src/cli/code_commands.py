"""
코드 명령어 - 자율 코드 에이전트 (데스크톱 앱과 CLI 공통 코어 사용)
"""

from datetime import datetime
from pathlib import Path
from typing import Optional

import typer
from rich.console import Console
from rich.markdown import Markdown
from rich.prompt import Confirm
from rich.syntax import Syntax

from src.core.code_agent import (
    CodeAgent,
    LLMClient,
    SafetyError,
    Workspace,
    apply_proposal,
    create_sandbox,
    diff_text,
    parse_edit_blocks,
    remove_sandbox,
    render_edit_blocks,
    validate_edit,
)

console = Console()
code_app = typer.Typer(help="🛠️  코드 에이전트 (파일 읽기·제안·확인 후 적용)")


def _backup_dir(workdir: Path) -> Path:
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    return workdir / ".lars" / "agent_backups" / stamp


@code_app.command()
def agent(
    goal: str = typer.Argument(..., help="에이전트에게 맡길 작업 목표"),
    workdir: Path = typer.Option(Path("."), "--workdir", "-w", help="작업 폴더"),
    model: str = typer.Option("auto", "--model", "-m", help="auto / claude / ollama"),
    max_steps: int = typer.Option(8, "--max-steps", help="최대 도구 호출 횟수"),
    propose_only: bool = typer.Option(False, "--propose-only", help="적용하지 않고 편집 블록만 출력 (데스크톱 앱용)"),
    sandbox: bool = typer.Option(True, "--sandbox/--no-sandbox", help="작업 복사본에서 실행하고 검증 후 제안"),
    web: bool = typer.Option(True, "--web/--no-web", help="웹 검색·페이지 읽기 도구 사용"),
):
    """🤖 목표를 받아 코드를 분석하고 수정을 제안 (수정은 확인 후 적용)"""
    workspace = Workspace(workdir)
    try:
        llm = LLMClient(model)
    except RuntimeError as e:
        console.print(f"[red]❌ {e}[/red]")
        raise typer.Exit(code=1)

    sandbox_dir = create_sandbox(workspace.root) if sandbox else None
    if not propose_only:
        mode = "샌드박스" if sandbox else "직접"
        console.print(f"[bold cyan]🤖 에이전트 시작[/bold cyan] ({llm.provider}, {mode}, 폴더: {workspace.root})")

    def show_step(event: dict):
        if propose_only:
            return
        args = str(event["args"])[:120]
        console.print(f"  [dim]{event['step']}. 🔧 {event['tool']} {args} ({event['seconds']}s)[/dim]")

    try:
        agent_run = CodeAgent(workspace, llm, max_steps=max_steps, sandbox=sandbox_dir, web_enabled=web)
        result = agent_run.run(goal, on_step=show_step)
    finally:
        if sandbox_dir:
            remove_sandbox(sandbox_dir)

    if propose_only:
        print(result.summary or result.error or "")
        if result.proposals:
            print(render_edit_blocks(result.proposals))
        return

    if result.error:
        console.print(f"[yellow]⚠️  {result.error}[/yellow]")
    if result.summary:
        console.print(Markdown(f"**요약**: {result.summary}"))
    if not result.proposals:
        console.print("[dim]수정 제안이 없습니다.[/dim]")
        return

    console.print(f"\n[bold]수정 제안 {len(result.proposals)}개[/bold]")
    backups = _backup_dir(workspace.root)
    applied = 0
    for index, proposal in enumerate(result.proposals, start=1):
        console.print(f"\n[bold]({index}/{len(result.proposals)}) {proposal.path}[/bold]")
        problem = validate_edit(workspace, proposal)
        if problem:
            console.print(f"[red]❌ 적용 불가: {problem}[/red]")
            continue
        original = workspace.check_writable(proposal.path).read_text(encoding="utf-8", errors="replace")
        console.print(Syntax(diff_text(proposal, original), "diff", theme="ansi_dark", word_wrap=True))
        if not Confirm.ask("이 수정을 적용할까요?", default=False):
            console.print("[yellow]건너뜀[/yellow]")
            continue
        try:
            console.print(f"[green]✅ {apply_proposal(workspace, proposal, backups)}[/green]")
            applied += 1
        except SafetyError as e:
            console.print(f"[red]❌ {e}[/red]")

    console.print(f"\n[bold]완료: {applied}/{len(result.proposals)}개 적용[/bold]")
    if applied:
        console.print(f"[dim]백업 위치: {backups}[/dim]")


@code_app.command()
def patch(
    text: Optional[str] = typer.Argument(None, help="편집 블록 텍스트 (생략 시 --file 또는 stdin)"),
    file: Optional[Path] = typer.Option(None, "--file", "-f", help="편집 블록이 들어 있는 파일"),
    workdir: Path = typer.Option(Path("."), "--workdir", "-w", help="작업 폴더"),
):
    """🩹 편집 블록(<<<< FILE / SEARCH / ==== / >>>>)을 백업 후 적용 (데스크톱 패치 버튼용)"""
    if text is None:
        text = file.read_text(encoding="utf-8") if file else typer.get_text_stream("stdin").read()

    proposals = parse_edit_blocks(text)
    if not proposals:
        print("적용할 편집 블록이 없습니다.")
        raise typer.Exit(code=1)

    workspace = Workspace(workdir)
    backups = _backup_dir(workspace.root)
    failures = 0
    for proposal in proposals:
        try:
            print(apply_proposal(workspace, proposal, backups))
        except SafetyError as e:
            failures += 1
            print(f"실패: {proposal.path}: {e}")
    if failures:
        raise typer.Exit(code=1)


def _review_and_apply(workspace: Workspace, proposals, conflict_indices=frozenset()) -> int:
    backups = _backup_dir(workspace.root)
    applied = 0
    for index, proposal in enumerate(proposals, start=1):
        console.print(f"\n[bold]({index}/{len(proposals)}) {proposal.path}[/bold]")
        if (index - 1) in conflict_indices:
            console.print("[yellow]⚠️  다른 하위 작업과 같은 부분을 수정합니다 (충돌)[/yellow]")
        problem = validate_edit(workspace, proposal)
        if problem:
            console.print(f"[red]❌ 적용 불가: {problem}[/red]")
            continue
        original = workspace.check_writable(proposal.path).read_text(encoding="utf-8", errors="replace")
        console.print(Syntax(diff_text(proposal, original), "diff", theme="ansi_dark", word_wrap=True))
        if not Confirm.ask("이 수정을 적용할까요?", default=False):
            console.print("[yellow]건너뜀[/yellow]")
            continue
        try:
            console.print(f"[green]✅ {apply_proposal(workspace, proposal, backups)}[/green]")
            applied += 1
        except SafetyError as e:
            console.print(f"[red]❌ {e}[/red]")
    if applied:
        console.print(f"[dim]백업 위치: {backups}[/dim]")
    return applied


@code_app.command()
def team(
    goal: str = typer.Argument(..., help="팀에 맡길 큰 목표"),
    workdir: Path = typer.Option(Path("."), "--workdir", "-w", help="작업 폴더"),
    model: str = typer.Option("auto", "--model", "-m", help="auto / claude / ollama"),
    parallel: int = typer.Option(3, "--parallel", "-p", help="동시에 돌릴 하위 작업 수"),
    max_steps: int = typer.Option(8, "--max-steps", help="하위 작업당 최대 도구 호출 수"),
    web: bool = typer.Option(True, "--web/--no-web", help="웹 검색·페이지 읽기 도구 사용"),
    propose_only: bool = typer.Option(False, "--propose-only", help="적용하지 않고 요약과 편집 블록만 출력 (데스크톱 앱용)"),
):
    """👥 목표를 하위 작업으로 나눠 병렬 수행하고, 충돌을 표시한 뒤 확인 후 적용"""
    from src.core.code_team import run_team

    workspace = Workspace(workdir)
    try:
        llm = LLMClient(model)
    except RuntimeError as e:
        console.print(f"[red]❌ {e}[/red]")
        raise typer.Exit(code=1)

    console.print(f"[bold cyan]👥 팀 작업 시작[/bold cyan] ({llm.provider}, 병렬 {parallel}, 폴더: {workspace.root})")
    team_result = run_team(
        goal, workspace.root, llm, max_parallel=parallel, max_steps=max_steps,
        web_enabled=web, on_event=None if propose_only else (lambda msg: console.print(f"  [dim]{msg}[/dim]")),
    )

    if propose_only:
        for index, sub in enumerate(team_result.subtasks, start=1):
            print(f"[{index}] {sub.task}: {sub.result.summary or sub.result.error or ''}")
        proposals = team_result.proposals
        if proposals:
            print(render_edit_blocks(proposals))
        return

    for index, sub in enumerate(team_result.subtasks):
        console.print(f"\n[bold]하위 작업 {index + 1}[/bold]: {sub.task}")
        if sub.result.error:
            console.print(f"  [yellow]⚠️  {sub.result.error}[/yellow]")
        if sub.result.summary:
            console.print(f"  {sub.result.summary}")
        console.print(f"  수정 제안 {len(sub.result.proposals)}개")

    proposals = team_result.proposals
    if not proposals:
        console.print("\n[dim]수정 제안이 없습니다.[/dim]")
        return

    conflict_indices = set()
    for a, b in team_result.conflicts:
        conflict_indices.add(a)
        conflict_indices.add(b)
    if team_result.conflicts:
        console.print(f"\n[yellow]충돌 {len(team_result.conflicts)}건: 같은 부분을 여러 하위 작업이 수정합니다. 해당 제안은 신중히 확인하세요.[/yellow]")

    applied = _review_and_apply(workspace, proposals, conflict_indices)
    console.print(f"\n[bold]완료: {applied}/{len(proposals)}개 적용[/bold]")


schedule_app = typer.Typer(help="⏰ 예약 실행 (제안만 저장, 원본 미적용)")
code_app.add_typer(schedule_app, name="schedule")


@schedule_app.command("add")
def schedule_add(
    goal: str = typer.Argument(..., help="주기마다 수행할 작업 목표"),
    every: int = typer.Option(60, "--every", "-e", help="실행 간격(분, 최소 5)"),
    workdir: Path = typer.Option(Path("."), "--workdir", "-w", help="작업 폴더"),
):
    """➕ 예약 작업 추가"""
    from src.core.schedule import add_task

    try:
        task = add_task(Path(workdir).resolve(), goal, every)
    except ValueError as e:
        console.print(f"[red]❌ {e}[/red]")
        raise typer.Exit(code=1)
    console.print(f"[green]✅ 예약 추가됨[/green] id={task.id} 간격={task.every_minutes}분")


@schedule_app.command("list")
def schedule_list(workdir: Path = typer.Option(Path("."), "--workdir", "-w", help="작업 폴더")):
    """📋 예약 작업 목록"""
    from src.core.schedule import load_tasks

    tasks = load_tasks(Path(workdir).resolve())
    if not tasks:
        console.print("[dim]예약 작업이 없습니다.[/dim]")
        return
    table = Table(title="⏰ 예약 작업", show_header=True)
    for col in ("ID", "간격(분)", "마지막 실행", "목표"):
        table.add_column(col)
    for t in tasks:
        table.add_row(t.id, str(t.every_minutes), t.last_run_at or "-", t.goal)
    console.print(table)


@schedule_app.command("remove")
def schedule_remove(
    task_id: str = typer.Argument(..., help="삭제할 예약 ID"),
    workdir: Path = typer.Option(Path("."), "--workdir", "-w", help="작업 폴더"),
):
    """🗑️  예약 작업 삭제"""
    from src.core.schedule import remove_task

    if remove_task(Path(workdir).resolve(), task_id):
        console.print(f"[green]✅ 삭제됨: {task_id}[/green]")
    else:
        console.print(f"[red]❌ 없는 ID: {task_id}[/red]")
        raise typer.Exit(code=1)


@schedule_app.command("run")
def schedule_run(
    workdir: Path = typer.Option(Path("."), "--workdir", "-w", help="작업 폴더"),
    model: str = typer.Option("auto", "--model", "-m", help="auto / claude / ollama"),
    force: bool = typer.Option(False, "--force", help="간격과 무관하게 전부 실행"),
):
    """▶️  기한이 된 예약 작업을 실행 (cron 등에서 주기적으로 호출)"""
    from src.core.schedule import run_due

    try:
        llm = LLMClient(model)
    except RuntimeError as e:
        console.print(f"[red]❌ {e}[/red]")
        raise typer.Exit(code=1)
    written = run_due(Path(workdir).resolve(), llm, force=force)
    if not written:
        console.print("[dim]실행할 예약 작업이 없습니다.[/dim]")
        return
    for path in written:
        console.print(f"[green]📝 제안 저장[/green]: {path}")
