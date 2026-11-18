"""클라우드 배포 엔진: 폴더 분석 → 계획(명령 목록) → 사용자 확인 후 실행.

- 앱은 클라우드 키를 받거나 저장하지 않는다. 각 클라우드 CLI(aws, gcloud, az)의 로그인 정보를 그대로 쓴다.
- 계획 단계는 아무것도 만들지 않는다. 실행은 계획 id와 확인 표시가 모두 있을 때만 시작한다.
- 명령은 쉘을 거치지 않고 인자 목록으로 실행한다.
"""

import json
import os
import re
import secrets
import shutil
import subprocess
import threading
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

PLAN_DIR = Path(".lars") / "deploy" / "plans"
AWS_PROFILE = os.getenv("PRISM_AWS_PROFILE", "lars-sso")
NAME_RE = re.compile(r"^[a-z][a-z0-9-]{2,30}[a-z0-9]$")
REGION_RE = re.compile(r"^[a-z]{2}-[a-z]+-\d$|^[a-z0-9-]+$")

PROVIDERS = {
    "aws": {"label": "AWS", "cli": "aws", "default_region": "ap-northeast-2", "methods": ["static", "container"]},
    "gcp": {"label": "Google Cloud", "cli": "gcloud", "default_region": "asia-northeast3", "methods": ["static", "container"]},
    "azure": {"label": "Azure", "cli": "az", "default_region": "koreacentral", "methods": ["static", "container"]},
}

_plans: Dict[str, dict] = {}
_jobs: Dict[str, dict] = {}


# ---------- 도구 상태 ----------
def _run_quiet(args: List[str], env: Optional[dict] = None, timeout: int = 40) -> subprocess.CompletedProcess:
    return subprocess.run(args, capture_output=True, text=True, timeout=timeout, env=env)


def _env_for(provider: str) -> dict:
    env = os.environ.copy()
    if provider == "aws":
        env["AWS_PROFILE"] = AWS_PROFILE
    return env


def tool_status() -> dict:
    result = {}
    for key, info in PROVIDERS.items():
        cli = info["cli"]
        installed = shutil.which(cli) is not None
        entry = {"label": info["label"], "cli": cli, "installed": installed, "logged_in": False, "account": "", "hint": ""}
        if not installed:
            entry["hint"] = {"aws": "brew install awscli", "gcp": "brew install --cask google-cloud-sdk", "azure": "brew install azure-cli"}[key]
        else:
            try:
                if key == "aws":
                    r = _run_quiet(["aws", "sts", "get-caller-identity", "--query", "Account", "--output", "text"], env=_env_for(key))
                    entry["logged_in"] = r.returncode == 0
                    entry["account"] = r.stdout.strip() if r.returncode == 0 else ""
                    entry["hint"] = "" if entry["logged_in"] else f"터미널에서 aws sso login --profile {AWS_PROFILE} 실행"
                elif key == "gcp":
                    r = _run_quiet(["gcloud", "auth", "list", "--filter=status:ACTIVE", "--format=value(account)"])
                    entry["logged_in"] = r.returncode == 0 and bool(r.stdout.strip())
                    entry["account"] = r.stdout.strip()
                    entry["hint"] = "" if entry["logged_in"] else "터미널에서 gcloud auth login 실행"
                elif key == "azure":
                    r = _run_quiet(["az", "account", "show", "--query", "user.name", "-o", "tsv"])
                    entry["logged_in"] = r.returncode == 0 and bool(r.stdout.strip())
                    entry["account"] = r.stdout.strip() if entry["logged_in"] else ""
                    entry["hint"] = "" if entry["logged_in"] else "터미널에서 az login 실행"
            except Exception as err:
                entry["hint"] = f"상태 확인 실패: {err}"
        result[key] = entry
    return result


# ---------- 폴더 분석 ----------
def analyze_folder(folder: Path) -> dict:
    pkg = folder / "package.json"
    scripts = {}
    if pkg.exists():
        try:
            scripts = json.loads(pkg.read_text(encoding="utf-8")).get("scripts", {}) or {}
        except ValueError:
            scripts = {}
    build_dir = next((d for d in ("dist", "build", "out") if (folder / d / "index.html").exists()), None)
    return {
        "path": str(folder),
        "has_package_json": pkg.exists(),
        "build_script": "build" in scripts,
        "has_dockerfile": (folder / "Dockerfile").exists(),
        "has_index_html": (folder / "index.html").exists(),
        "build_dir": build_dir,
    }


# ---------- 계획 ----------
def _unique(name: str, length: int = 6) -> str:
    return f"{name}-{secrets.token_hex(length // 2)}"


def make_plan(folder: str, provider: str, region: str, method: str, name: str, project: str = "") -> dict:
    root = Path(folder).expanduser()
    if not root.is_dir():
        raise ValueError(f"폴더가 없습니다: {folder}")
    if provider not in PROVIDERS:
        raise ValueError("클라우드는 aws, gcp, azure 중 하나여야 합니다.")
    if method not in PROVIDERS[provider]["methods"]:
        raise ValueError("이 방식은 선택한 클라우드에서 지원하지 않습니다.")
    name = name.strip().lower()
    if not NAME_RE.match(name):
        raise ValueError("이름은 소문자, 숫자, 하이픈으로 4~32자이며 문자로 시작해야 합니다.")
    region = (region or PROVIDERS[provider]["default_region"]).strip()
    if not REGION_RE.match(region):
        raise ValueError("리전 이름이 올바르지 않습니다.")
    if provider == "gcp" and not project.strip():
        raise ValueError("Google Cloud는 프로젝트 ID를 먼저 선택해야 합니다.")

    info = analyze_folder(root)
    warnings: List[str] = []
    steps: List[dict] = []
    resources: List[str] = []
    plan_id = secrets.token_hex(6)
    workdir = str(root)

    def step(title: str, args: List[str], cwd: Optional[str] = None, note: str = "", kind: str = "cmd"):
        steps.append({"title": title, "args": args, "cwd": cwd or workdir, "note": note, "kind": kind})

    # 정적 사이트면 먼저 빌드가 필요할 수 있다
    build_dir = info["build_dir"]
    if method == "static":
        if not build_dir:
            if info["build_script"]:
                step("의존성 설치", ["npm", "ci"], note="package.json의 install 스크립트가 실행됩니다.")
                step("프로젝트 빌드", ["npm", "run", "build"])
                build_dir = next((d for d in ("dist", "build", "out")), "dist")
                warnings.append("빌드 결과 폴더는 dist, build, out 중 하나여야 합니다.")
            elif info["has_index_html"]:
                build_dir = "."
            else:
                raise ValueError("정적 배포할 index.html 또는 빌드 스크립트를 찾지 못했습니다.")
        source = str((root / build_dir).resolve())
    else:
        if provider == "aws" and not info["has_dockerfile"]:
            raise ValueError("AWS 컨테이너 배포에는 Dockerfile이 필요합니다.")
        if provider == "azure" and not info["has_dockerfile"]:
            warnings.append("Dockerfile이 없어 Azure가 소스에서 이미지를 만듭니다. 포트가 8080이 아니면 설정이 필요합니다.")
        source = str(root)

    url = ""
    if provider == "aws":
        if method == "static":
            bucket = _unique(name)
            resources.append(f"S3 버킷 {bucket} (공개 웹사이트 호스팅, HTTP)")
            step("버킷 만들기", ["aws", "s3api", "create-bucket", "--bucket", bucket, "--region", region]
                 + ([] if region == "us-east-1" else ["--create-bucket-configuration", f"LocationConstraint={region}"]))
            step("공개 접근 허용", ["aws", "s3api", "put-public-access-block", "--bucket", bucket,
                                  "--public-access-block-configuration",
                                  "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"])
            policy = json.dumps({"Version": "2012-10-17", "Statement": [{"Sid": "PublicRead", "Effect": "Allow", "Principal": "*",
                                                                          "Action": "s3:GetObject", "Resource": f"arn:aws:s3:::{bucket}/*"}]})
            step("읽기 정책 적용", ["aws", "s3api", "put-bucket-policy", "--bucket", bucket, "--policy", policy])
            step("웹사이트 설정", ["aws", "s3api", "put-bucket-website", "--bucket", bucket,
                                  "--website-configuration", json.dumps({"IndexDocument": {"Suffix": "index.html"}, "ErrorDocument": {"Key": "index.html"}})])
            step("파일 업로드", ["aws", "s3", "sync", source, f"s3://{bucket}", "--delete"])
            url = f"http://{bucket}.s3-website.{region}.amazonaws.com" if region != "us-east-1" else f"http://{bucket}.s3-website-us-east-1.amazonaws.com"
            warnings.append("S3 웹사이트 주소는 HTTP만 지원합니다. HTTPS가 필요하면 CloudFront를 앞에 둬야 합니다.")
            warnings.append("버킷 내용이 인터넷에 공개됩니다. 공개하면 안 되는 파일이 폴더에 있으면 배포하지 마세요.")
        else:
            service = _unique(name)[:40]
            resources.append(f"Lightsail 컨테이너 서비스 {service} (small, 1개 인스턴스)")
            step("이미지 만들기", ["docker", "build", "-t", service, source], note="Docker가 설치되어 있어야 합니다.")
            step("서비스 만들기", ["aws", "lightsail", "create-container-service", "--service-name", service,
                                  "--power", "small", "--scale", "1", "--region", region])
            step("이미지 올리기", ["aws", "lightsail", "push-container-image", "--service-name", service,
                                  "--label", "app", "--image", service], kind="lightsail_push")
            step("배포", ["aws", "lightsail", "create-container-service-deployment", "--service-name", service],
                 kind="lightsail_deploy")
            step("주소 확인", ["aws", "lightsail", "get-container-services", "--service-name", service,
                              "--query", "containerServices[0].url", "--output", "text"], kind="print_url")
            warnings.append("Lightsail 컨테이너는 월 과금됩니다. 사용하지 않으면 삭제해야 합니다.")
    elif provider == "gcp":
        if method == "static":
            bucket = _unique(name)
            resources.append(f"Cloud Storage 버킷 {bucket} (공개 웹사이트, {region})")
            step("버킷 만들기", ["gcloud", "storage", "buckets", "create", f"gs://{bucket}", "--location", region,
                                "--uniform-bucket-level-access", "--project", project])
            step("웹사이트 설정", ["gcloud", "storage", "buckets", "update", f"gs://{bucket}",
                                  "--web-main-page-suffix=index.html", "--web-error-page=index.html", "--project", project])
            step("공개 읽기 허용", ["gcloud", "storage", "buckets", "add-iam-policy-binding", f"gs://{bucket}",
                                  "--member=allUsers", "--role=roles/storage.objectViewer", "--project", project])
            step("파일 업로드", ["gcloud", "storage", "rsync", "-r", source, f"gs://{bucket}"])
            url = f"https://storage.googleapis.com/{bucket}/index.html"
            warnings.append("버킷 내용이 인터넷에 공개됩니다.")
        else:
            service = name
            resources.append(f"Cloud Run 서비스 {service} ({region}, 공개)")
            step("Cloud Run 배포", ["gcloud", "run", "deploy", service, "--source", source, "--region", region,
                                   "--project", project, "--allow-unauthenticated", "--quiet"], kind="gcloud_url")
            warnings.append("Cloud Build와 Cloud Run API가 프로젝트에서 사용 설정되어 있어야 합니다.")
    else:  # azure
        rg = f"{name}-rg"
        account = re.sub(r"[^a-z0-9]", "", name)[:18] + secrets.token_hex(3)
        if method == "static":
            resources.append(f"리소스 그룹 {rg}, 스토리지 계정 {account} (정적 웹사이트)")
            step("리소스 그룹 만들기", ["az", "group", "create", "--name", rg, "--location", region])
            step("스토리지 계정 만들기", ["az", "storage", "account", "create", "--name", account, "--resource-group", rg,
                                        "--location", region, "--sku", "Standard_LRS", "--kind", "StorageV2"])
            step("정적 웹사이트 켜기", ["az", "storage", "blob", "service-properties", "update", "--account-name", account,
                                      "--static-website", "--index-document", "index.html", "--404-document", "index.html", "--auth-mode", "login"])
            step("파일 업로드", ["az", "storage", "blob", "upload-batch", "--account-name", account, "--destination", "$web",
                                "--source", source, "--auth-mode", "login"])
            step("주소 확인", ["az", "storage", "account", "show", "--name", account, "--query", "primaryEndpoints.web", "-o", "tsv"],
                 kind="print_url")
            warnings.append("Azure CLI 설치와 az login이 필요합니다.")
        else:
            resources.append(f"리소스 그룹 {rg}, Container Apps 환경과 앱 {name}")
            step("컨테이너 앱 배포", ["az", "containerapp", "up", "--name", name, "--resource-group", rg, "--location", region,
                                    "--source", source, "--ingress", "external", "--target-port", "8080"], kind="print_url")
            warnings.append("Azure CLI 설치와 az login이 필요합니다.")

    plan = {
        "id": plan_id,
        "provider": provider,
        "provider_label": PROVIDERS[provider]["label"],
        "region": region,
        "method": method,
        "name": name,
        "project": project.strip(),
        "folder": str(root),
        "analysis": info,
        "resources": resources,
        "steps": [{"title": s["title"], "command": " ".join(s["args"]), "note": s["note"]} for s in steps],
        "warnings": warnings,
        "expected_url": url,
        "created": datetime.now().isoformat(timespec="seconds"),
    }
    _plans[plan_id] = {"plan": plan, "steps": steps, "source": source, "build_dir": build_dir, "url": url}
    PLAN_DIR.mkdir(parents=True, exist_ok=True)
    (PLAN_DIR / f"{plan_id}.json").write_text(json.dumps(plan, ensure_ascii=False, indent=2), encoding="utf-8")
    return plan


# ---------- 실행 ----------
def start_job(plan_id: str) -> dict:
    if plan_id not in _plans:
        raise KeyError("계획을 찾을 수 없습니다. 다시 계획을 만들어 주세요.")
    job_id = secrets.token_hex(6)
    job = {"id": job_id, "plan_id": plan_id, "status": "running", "log": [], "url": "", "started": time.time()}
    _jobs[job_id] = job
    threading.Thread(target=_run_job, args=(job, plan_id), daemon=True).start()
    return job


def get_job(job_id: str) -> Optional[dict]:
    return _jobs.get(job_id)


def _log(job: dict, text: str) -> None:
    job["log"].append(f"[{datetime.now().strftime('%H:%M:%S')}] {text}")
    job["log"] = job["log"][-400:]


def _run_job(job: dict, plan_id: str) -> None:
    entry = _plans[plan_id]
    plan = entry["plan"]
    env = _env_for(plan["provider"])
    lightsail_image = ""
    try:
        for index, step in enumerate(entry["steps"], start=1):
            args = list(step["args"])
            kind = step["kind"]
            if kind == "lightsail_deploy":
                if not lightsail_image:
                    raise RuntimeError("이미지 참조를 찾지 못했습니다.")
                containers = json.dumps({"app": {"image": lightsail_image, "ports": {"8080": "HTTP"}}})
                endpoint = json.dumps({"containerName": "app", "containerPort": 8080})
                args = args + ["--containers", containers, "--public-endpoint", endpoint]
            _log(job, f"{index}/{len(entry['steps'])} {step['title']} 시작")
            proc = subprocess.Popen(args, cwd=step["cwd"], env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
            lines: List[str] = []
            assert proc.stdout is not None
            for line in proc.stdout:
                line = line.rstrip()
                if line:
                    lines.append(line)
                    _log(job, line[:300])
            proc.wait()
            if kind == "lightsail_push":
                match = re.search(r":([A-Za-z0-9_-]+\.app\.\d+)", "\n".join(lines))
                if match:
                    lightsail_image = match.group(1)
            if proc.returncode != 0:
                raise RuntimeError(f"'{step['title']}' 단계에서 실패했습니다 (종료 코드 {proc.returncode}).")
            if kind in ("gcloud_url", "print_url"):
                urls = re.findall(r"https://[^\s'\"]+", "\n".join(lines))
                if urls:
                    job["url"] = urls[-1]
                elif lines and kind == "print_url":
                    job["url"] = lines[-1].strip()
            _log(job, f"{index}/{len(entry['steps'])} {step['title']} 완료")
        job["url"] = job["url"] or entry.get("url", "")
        job["status"] = "done"
        _log(job, f"배포 완료: {job['url'] or '주소는 로그를 확인하세요'}")
    except Exception as err:
        job["status"] = "failed"
        _log(job, f"실패: {err}")
