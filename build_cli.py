#!/usr/bin/env python3
"""
Prism CLI 빌드 스크립트
PyInstaller를 사용하여 실행 가능한 바이너리 생성
"""

import os
import sys
import shutil
import platform
import subprocess
from pathlib import Path
from datetime import datetime

def run_command(cmd, description):
    """명령어 실행"""
    print(f"\n[{datetime.now().strftime('%H:%M:%S')}] {description}...")
    try:
        result = subprocess.run(cmd, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ {description} 완료")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} 실패: {e.stderr}")
        return False

def build_cli():
    """CLI 바이너리 빌드"""

    project_root = Path(__file__).parent
    dist_dir = project_root / "dist" / "forge-cli"

    # 기존 dist 디렉토리 정리
    if dist_dir.exists():
        print(f"기존 빌드 디렉토리 제거: {dist_dir}")
        shutil.rmtree(dist_dir)

    os.chdir(project_root)

    # 1. PyInstaller 설치 확인
    print("\n=== 의존성 확인 ===")
    if not run_command("pip show pyinstaller > /dev/null 2>&1 || pip install pyinstaller", "PyInstaller 설치"):
        sys.exit(1)

    # 2. 빌드 설정
    system = platform.system()
    arch = platform.machine()
    version = "1.4.0"

    print(f"\n=== 빌드 정보 ===")
    print(f"OS: {system}")
    print(f"Architecture: {arch}")
    print(f"Version: {version}")
    print(f"Output: {dist_dir}")

    # 3. PyInstaller 빌드
    print("\n=== PyInstaller 빌드 시작 ===")

    pyinstaller_cmd = (
        f"pyinstaller "
        f"--name=forge "
        f"--onefile "
        f"--console "
        f"--icon=assets/icon.ico "
        f"--version-file=build/version.txt "
        f"--add-data='src/cli:src/cli' "
        f"--hidden-import=typer "
        f"--hidden-import=rich "
        f"--hidden-import=requests "
        f"--collect-all=typer "
        f"--collect-all=rich "
        f"--distpath={dist_dir} "
        f"src/cli/main.py"
    )

    if not run_command(pyinstaller_cmd, "PyInstaller 바이너리 생성"):
        sys.exit(1)

    # 4. 추가 파일 복사
    print("\n=== 배포 파일 준비 ===")

    dist_bin_dir = dist_dir / "bin"
    dist_bin_dir.mkdir(parents=True, exist_ok=True)

    # 메인 바이너리 복사
    if system == "Windows":
        binary = dist_dir / "forge.exe"
        dest = dist_bin_dir / "forge.exe"
    else:
        binary = dist_dir / "forge"
        dest = dist_bin_dir / "forge"

    if binary.exists():
        shutil.copy2(binary, dest)
        print(f"✅ 바이너리 복사: {dest}")

    # 설치 스크립트 복사
    install_sh = project_root / "scripts" / "install.sh"
    install_bat = project_root / "scripts" / "install.bat"

    if install_sh.exists():
        shutil.copy2(install_sh, dist_dir / "install.sh")
    if install_bat.exists():
        shutil.copy2(install_bat, dist_dir / "install.bat")

    # README 복사
    readme = project_root / "README.md"
    if readme.exists():
        shutil.copy2(readme, dist_dir / "README.md")

    # CHANGELOG 복사
    changelog = project_root / "CHANGELOG.md"
    if changelog.exists():
        shutil.copy2(changelog, dist_dir / "CHANGELOG.md")

    # 5. 압축 파일 생성
    print("\n=== 배포 패키지 생성 ===")

    os_name = system.lower()
    if system == "Darwin":
        os_name = "macos"

    archive_name = f"forge-cli-{version}-{os_name}-{arch}"
    archive_path = project_root / "dist" / archive_name

    shutil.make_archive(
        str(archive_path),
        "zip",
        str(dist_dir.parent),
        dist_dir.name
    )

    print(f"✅ 배포 패키지 생성: {archive_path}.zip")

    # 6. 빌드 완료
    print("\n" + "="*50)
    print("✅ Prism CLI 빌드 완료!")
    print(f"배포 패키지: {archive_path}.zip")
    print("="*50)

    return True

if __name__ == "__main__":
    build_cli()
