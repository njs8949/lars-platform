"""
하드웨어 명령어 - 데스크톱 앱의 설정 > 하드웨어 정보(NPU/ANE)를 CLI로 구현
"""

import os
import platform
import subprocess
from typing import Dict, Optional

import typer
from rich.console import Console
from rich.table import Table

console = Console()
hardware_app = typer.Typer(help="🧩 하드웨어 정보 (칩 / Neural Engine / 메모리)")


def _sysctl(key: str) -> Optional[str]:
    try:
        out = subprocess.run(["/usr/sbin/sysctl", "-n", key], capture_output=True, text=True, timeout=5)
    except (OSError, subprocess.SubprocessError):
        return None
    value = out.stdout.strip()
    return value if out.returncode == 0 and value else None


def _ane_spec(chip: str):
    """칩 세대별 Neural Engine 코어 수와 TOPS (데스크톱 앱과 동일한 기준)."""
    if "M4" in chip:
        cores, tops = 16, 38.0
    elif "M3" in chip:
        cores, tops = 16, 18.0
    elif "M2" in chip:
        cores, tops = 16, 15.8
    elif "M1" in chip:
        cores, tops = 16, 11.0
    else:
        return 0, 0.0
    dies = 2 if "Ultra" in chip else 1
    return cores * dies, tops * dies


def collect_hardware() -> Dict:
    is_apple_silicon = platform.system() == "Darwin" and _sysctl("hw.optional.arm64") == "1"
    chip = _sysctl("machdep.cpu.brand_string") or platform.processor() or "Unknown"
    cpu_cores = int(_sysctl("hw.ncpu") or os.cpu_count() or 0)
    memory_bytes = _sysctl("hw.memsize")
    memory_gb = int(int(memory_bytes) / (1024 ** 3)) if memory_bytes else 0
    ane_cores, ane_tops = _ane_spec(chip) if is_apple_silicon else (0, 0.0)
    return {
        "chip": chip,
        "apple_silicon": is_apple_silicon,
        "ane_cores": ane_cores,
        "ane_tops": ane_tops,
        "cpu_cores": cpu_cores,
        "memory_gb": memory_gb,
    }


@hardware_app.command()
def info():
    """🔍 칩, Neural Engine, CPU 코어, 메모리 정보"""
    data = collect_hardware()
    table = Table(title="🧩 하드웨어 정보", show_header=True)
    table.add_column("항목", style="cyan")
    table.add_column("값", style="green")
    table.add_row("칩 모델", data["chip"])
    table.add_row("Apple Silicon", "✅ Yes" if data["apple_silicon"] else "❌ No")
    table.add_row("Neural Engine 코어", f"{data['ane_cores']}개")
    table.add_row("ANE TOPS", f"~{data['ane_tops']:.1f} TFLOPS")
    table.add_row("CPU 코어", f"{data['cpu_cores']}개")
    table.add_row("통합 메모리", f"{data['memory_gb']}GB")
    console.print(table)
