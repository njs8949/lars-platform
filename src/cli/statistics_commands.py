"""
통계분석 명령어 - 데이터 분석 기능
"""

import typer
import json
from typing import Optional, List
from pathlib import Path
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn
import requests

from src.cli.utils import Logger

console = Console()
logger = Logger()

statistics_app = typer.Typer(help="📊 데이터 통계분석")

API_BASE_URL = "http://localhost:8000"


# ==================== 통계분석 명령어 ====================

@statistics_app.command()
def descriptive(
    data: str = typer.Argument(..., help="쉼표로 구분된 숫자 (예: 10,20,30,40,50)"),
    output: Optional[str] = typer.Option(None, "--output", "-o", help="결과 저장 파일")
):
    """📈 기술통계 (평균, 표준편차 등)"""
    try:
        # 데이터 파싱
        numbers = [float(x.strip()) for x in data.split(",")]

        with Progress(
            SpinnerColumn(),
            "[progress.description]{task.description}",
            console=console
        ) as progress:
            progress.add_task("분석 중...", total=None)

            response = requests.post(
                f"{API_BASE_URL}/api/prism/statistics/descriptive",
                json={"data": numbers},
                timeout=10
            )

            if response.status_code == 200:
                result = response.json()

                # 결과 테이블
                table = Table(title="📊 기술통계", show_header=True)
                table.add_column("항목", style="cyan")
                table.add_column("값", style="green")

                stats = result.get("results", {})
                table.add_row("데이터 개수", str(stats.get("count", "N/A")))
                table.add_row("평균", f"{stats.get('mean', 0):.2f}")
                table.add_row("중앙값", f"{stats.get('median', 0):.2f}")
                table.add_row("표준편차", f"{stats.get('std_dev', 0):.2f}")
                table.add_row("분산", f"{stats.get('variance', 0):.2f}")
                table.add_row("최솟값", f"{stats.get('min', 0):.2f}")
                table.add_row("최댓값", f"{stats.get('max', 0):.2f}")
                table.add_row("범위", f"{stats.get('range', 0):.2f}")
                table.add_row("1사분위", f"{stats.get('q1', 0):.2f}")
                table.add_row("3사분위", f"{stats.get('q3', 0):.2f}")
                table.add_row("사분위간거리", f"{stats.get('iqr', 0):.2f}")
                table.add_row("왜도", f"{stats.get('skewness', 0):.2f}")
                table.add_row("첨도", f"{stats.get('kurtosis', 0):.2f}")

                console.print(f"\n{table}\n")

                # 파일 저장
                if output:
                    with open(output, "w", encoding="utf-8") as f:
                        json.dump(result, f, ensure_ascii=False, indent=2)
                    console.print(f"[green]✅ {output}에 저장됨[/green]\n")

            else:
                console.print(f"[red]❌ 분석 실패[/red]\n")

    except ValueError:
        console.print("[red]❌ 올바른 숫자 형식이 아닙니다 (예: 10,20,30)[/red]\n")
    except Exception as e:
        console.print(f"[red]❌ 오류: {e}[/red]\n")
        logger.error(f"Descriptive stats error: {e}")


@statistics_app.command()
def timeseries(
    data: str = typer.Argument(..., help="시계열 데이터 (JSON 파일 또는 쉼표 분리 숫자)"),
    output: Optional[str] = typer.Option(None, "--output", "-o", help="결과 저장 파일")
):
    """📈 시계열 분석 (추세, 계절성)"""
    try:
        # 데이터 파싱
        if data.endswith(".json"):
            with open(data, "r") as f:
                numbers = json.load(f)
        else:
            numbers = [float(x.strip()) for x in data.split(",")]

        with Progress(
            SpinnerColumn(),
            "[progress.description]{task.description}",
            console=console
        ) as progress:
            progress.add_task("분석 중...", total=None)

            response = requests.post(
                f"{API_BASE_URL}/api/prism/statistics/timeseries",
                json={"data": numbers},
                timeout=10
            )

            if response.status_code == 200:
                result = response.json()
                stats = result.get("results", {})

                # 결과 표시
                console.print("\n[bold cyan]📈 시계열 분석[/bold cyan]\n")

                table = Table(show_header=True)
                table.add_column("분석 항목", style="cyan")
                table.add_column("결과", style="green")

                table.add_row("추세", stats.get("trend", "N/A"))
                table.add_row("계절성", stats.get("seasonality", "N/A"))
                table.add_row("자기상관", f"{stats.get('autocorrelation', 0):.3f}")

                console.print(f"{table}\n")

                if output:
                    with open(output, "w", encoding="utf-8") as f:
                        json.dump(result, f, ensure_ascii=False, indent=2)
                    console.print(f"[green]✅ {output}에 저장됨[/green]\n")

            else:
                console.print(f"[red]❌ 분석 실패[/red]\n")

    except Exception as e:
        console.print(f"[red]❌ 오류: {e}[/red]\n")


@statistics_app.command()
def forecast(
    data: str = typer.Argument(..., help="시계열 데이터"),
    periods: int = typer.Option(3, "--periods", "-p", help="예측 기간"),
    method: str = typer.Option("exponential", "--method", "-m", help="예측 방법 (exponential/arima)"),
    output: Optional[str] = typer.Option(None, "--output", "-o", help="결과 저장 파일")
):
    """🔮 예측 분석 (향후 추세 예측)"""
    try:
        numbers = [float(x.strip()) for x in data.split(",")]

        with Progress(
            SpinnerColumn(),
            "[progress.description]{task.description}",
            console=console
        ) as progress:
            progress.add_task("예측 중...", total=None)

            response = requests.post(
                f"{API_BASE_URL}/api/prism/statistics/forecast",
                json={
                    "data": numbers,
                    "periods": periods,
                    "method": method
                },
                timeout=10
            )

            if response.status_code == 200:
                result = response.json()
                forecasts = result.get("results", {}).get("forecast", [])

                console.print(f"\n[bold cyan]🔮 {periods}기간 예측 ({method})[/bold cyan]\n")

                table = Table(show_header=True)
                table.add_column("기간", style="cyan")
                table.add_column("예측값", style="green")

                for i, value in enumerate(forecasts, 1):
                    table.add_row(f"+{i}", f"{value:.2f}")

                console.print(f"{table}\n")

                if output:
                    with open(output, "w", encoding="utf-8") as f:
                        json.dump(result, f, ensure_ascii=False, indent=2)
                    console.print(f"[green]✅ {output}에 저장됨[/green]\n")

            else:
                console.print(f"[red]❌ 예측 실패[/red]\n")

    except Exception as e:
        console.print(f"[red]❌ 오류: {e}[/red]\n")


@statistics_app.command()
def anomaly(
    data: str = typer.Argument(..., help="데이터"),
    method: str = typer.Option("zscore", "--method", "-m", help="감지 방법 (zscore/iqr)"),
    threshold: float = typer.Option(2.5, "--threshold", "-t", help="임계값"),
    output: Optional[str] = typer.Option(None, "--output", "-o", help="결과 저장 파일")
):
    """🚨 이상탐지 (이상 데이터 감지)"""
    try:
        numbers = [float(x.strip()) for x in data.split(",")]

        with Progress(
            SpinnerColumn(),
            "[progress.description]{task.description}",
            console=console
        ) as progress:
            progress.add_task("분석 중...", total=None)

            response = requests.post(
                f"{API_BASE_URL}/api/prism/statistics/anomaly-detection",
                json={
                    "data": numbers,
                    "method": method,
                    "threshold": threshold
                },
                timeout=10
            )

            if response.status_code == 200:
                result = response.json()
                anomalies = result.get("results", {}).get("anomalies", [])

                console.print(f"\n[bold cyan]🚨 이상탐지 결과 ({method})[/bold cyan]\n")

                if anomalies:
                    table = Table(show_header=True)
                    table.add_column("인덱스", style="cyan")
                    table.add_column("값", style="red")
                    table.add_column("점수", style="yellow")

                    for anomaly in anomalies:
                        table.add_row(
                            str(anomaly.get("index", "N/A")),
                            f"{anomaly.get('value', 0):.2f}",
                            f"{anomaly.get('score', 0):.2f}"
                        )

                    console.print(f"{table}\n")
                else:
                    console.print("[green]✅ 이상 데이터 없음[/green]\n")

                if output:
                    with open(output, "w", encoding="utf-8") as f:
                        json.dump(result, f, ensure_ascii=False, indent=2)
                    console.print(f"[green]✅ {output}에 저장됨[/green]\n")

            else:
                console.print(f"[red]❌ 분석 실패[/red]\n")

    except Exception as e:
        console.print(f"[red]❌ 오류: {e}[/red]\n")


@statistics_app.command()
def correlation(
    file: str = typer.Argument(..., help="데이터 파일 (JSON)"),
    output: Optional[str] = typer.Option(None, "--output", "-o", help="결과 저장 파일")
):
    """🔗 상관분석 (변수 간의 관계)"""
    try:
        with open(file, "r") as f:
            data = json.load(f)

        with Progress(
            SpinnerColumn(),
            "[progress.description]{task.description}",
            console=console
        ) as progress:
            progress.add_task("분석 중...", total=None)

            response = requests.post(
                f"{API_BASE_URL}/api/prism/statistics/correlation",
                json={"variables": data},
                timeout=10
            )

            if response.status_code == 200:
                result = response.json()
                correlations = result.get("results", {}).get("correlations", {})

                console.print("\n[bold cyan]🔗 상관분석[/bold cyan]\n")

                table = Table(show_header=True)
                table.add_column("변수 쌍", style="cyan")
                table.add_column("상관계수", style="green")

                for pair, coeff in correlations.items():
                    table.add_row(pair, f"{coeff:.3f}")

                console.print(f"{table}\n")

                if output:
                    with open(output, "w", encoding="utf-8") as f:
                        json.dump(result, f, ensure_ascii=False, indent=2)
                    console.print(f"[green]✅ {output}에 저장됨[/green]\n")

            else:
                console.print(f"[red]❌ 분석 실패[/red]\n")

    except FileNotFoundError:
        console.print(f"[red]❌ 파일을 찾을 수 없습니다: {file}[/red]\n")
    except Exception as e:
        console.print(f"[red]❌ 오류: {e}[/red]\n")


@statistics_app.command()
def dashboard(
    output: Optional[str] = typer.Option(None, "--output", "-o", help="결과 저장 파일")
):
    """📊 대시보드 (통합 분석)"""
    try:
        with Progress(
            SpinnerColumn(),
            "[progress.description]{task.description}",
            console=console
        ) as progress:
            progress.add_task("대시보드 로딩 중...", total=None)

            # 샘플 데이터
            sample_data = {
                "sales": [100, 120, 140, 135, 150, 165, 180],
                "users": [50, 55, 65, 70, 75, 85, 95],
                "engagement": [30, 35, 40, 38, 45, 52, 60],
                "revenue": [5000, 6200, 7100, 6800, 7600, 8300, 9200]
            }

            response = requests.post(
                f"{API_BASE_URL}/api/prism/statistics/dashboard",
                json={"datasets": sample_data},
                timeout=10
            )

            if response.status_code == 200:
                result = response.json()
                kpis = result.get("results", {}).get("kpis", {})

                console.print("\n[bold cyan]📊 대시보드[/bold cyan]\n")

                table = Table(show_header=True)
                table.add_column("KPI", style="cyan")
                table.add_column("현재값", style="green")
                table.add_column("평균값", style="yellow")
                table.add_column("추세", style="magenta")

                for key, value in kpis.items():
                    table.add_row(
                        key.upper(),
                        str(value.get("current", 0)),
                        str(value.get("average", 0)),
                        value.get("trend", "→")
                    )

                console.print(f"{table}\n")

                if output:
                    with open(output, "w", encoding="utf-8") as f:
                        json.dump(result, f, ensure_ascii=False, indent=2)
                    console.print(f"[green]✅ {output}에 저장됨[/green]\n")

            else:
                console.print(f"[red]❌ 대시보드 로딩 실패[/red]\n")

    except Exception as e:
        console.print(f"[red]❌ 오류: {e}[/red]\n")
