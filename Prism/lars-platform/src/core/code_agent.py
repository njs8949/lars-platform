"""
코드 에이전트 코어 (데스크톱 앱과 CLI가 공유)

- 목표를 받아 파일 읽기 / 디렉터리 보기 / 허용된 명령 실행 / 수정 제안을 반복한다.
- 수정은 적용하지 않고 제안(edit block)으로만 모은다. 실제 적용은 호출자가 확인 후 수행한다.
- 편집 블록 형식:
    <<<< FILE path/to/file.py
    <<<< SEARCH
    (기존 텍스트, 파일 안에서 정확히 한 번 일치해야 함)
    ====
    (새 텍스트)
    >>>>
"""

import difflib
import json
import os
import re
import shlex
import subprocess
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable, List, Optional

MAX_FILE_BYTES = 200_000
MAX_OBSERVATION_CHARS = 6_000
COMMAND_TIMEOUT_SECONDS = 300

ALLOWED_COMMANDS = [
    ("pytest",),
    ("python3", "-m", "pytest"),
    ("npm", "test"),
    ("npm", "run", "lint"),
    ("npm", "run", "build"),
    ("git", "status"),
    ("git", "diff"),
    ("git", "log"),
]

PROTECTED_NAMES = {".git", ".env"}

SHELL_OPERATORS = ("&&", "||", ";", "|", ">", "<", "`", "$(", "\n")

EDIT_BLOCK_RE = re.compile(
    r"<<<< FILE\s+(?P<path>.+?)\n<<<< SEARCH\n(?P<search>.*?)\n====\n(?P<replace>.*?)\n?>>>>",
    re.S,
)

SYSTEM_PROMPT = """당신은 LARS Prism 코드 에이전트입니다. 목표를 달성하기 위해 아래 도구를 한 번에 하나씩 호출하세요.
응답은 반드시 JSON 객체 하나만 출력하세요. 설명 문장은 쓰지 마세요.

도구:
- {"tool": "list_dir", "args": {"path": "."}}
- {"tool": "read_file", "args": {"path": "src/app.py"}}
- {"tool": "run_command", "args": {"command": "pytest -q"}}   (허용 명령: pytest, python3 -m pytest, npm test, npm run lint, npm run build, git status, git diff, git log)
- {"tool": "propose_edit", "args": {"path": "src/app.py", "search": "기존 코드(파일에 정확히 한 번 존재)", "replace": "새 코드"}}
- {"tool": "search_web", "args": {"query": "검색어"}}
- {"tool": "fetch_url", "args": {"url": "https://..."}}
- {"tool": "finish", "args": {"summary": "무엇을 왜 바꿨는지 한국어 요약"}}

규칙: 수정 전에 반드시 read_file로 현재 내용을 확인하세요. search는 파일의 실제 텍스트를 그대로 복사하세요."""


@dataclass
class EditProposal:
    path: str
    search: str
    replace: str


@dataclass
class AgentResult:
    summary: str
    proposals: List[EditProposal] = field(default_factory=list)
    steps: List[str] = field(default_factory=list)
    error: Optional[str] = None


class SafetyError(Exception):
    pass


def parse_edit_blocks(text: str) -> List[EditProposal]:
    return [
        EditProposal(path=m.group("path").strip(), search=m.group("search"), replace=m.group("replace"))
        for m in EDIT_BLOCK_RE.finditer(text)
    ]


def render_edit_blocks(proposals: List[EditProposal]) -> str:
    return "\n".join(
        f"<<<< FILE {p.path}\n<<<< SEARCH\n{p.search}\n====\n{p.replace}\n>>>>" for p in proposals
    )


class Workspace:
    """작업 폴더 밖 접근과 보호 파일 수정을 막는다."""

    def __init__(self, root: Path):
        self.root = root.resolve()

    def resolve(self, relative: str) -> Path:
        target = (self.root / relative).resolve()
        if target != self.root and self.root not in target.parents:
            raise SafetyError(f"작업 폴더 밖 경로입니다: {relative}")
        return target

    def normalize(self, path: str) -> str:
        return self.resolve(path).relative_to(self.root).as_posix()

    def check_writable(self, relative: str) -> Path:
        target = self.resolve(relative)
        if any(part in PROTECTED_NAMES or part.startswith(".env") for part in target.relative_to(self.root).parts):
            raise SafetyError(f"보호된 경로는 수정할 수 없습니다: {relative}")
        return target

    def read(self, relative: str) -> str:
        target = self.resolve(relative)
        if not target.is_file():
            raise SafetyError(f"파일이 없습니다: {relative}")
        if target.stat().st_size > MAX_FILE_BYTES:
            raise SafetyError(f"파일이 너무 큽니다 (200KB 초과): {relative}")
        return target.read_text(encoding="utf-8", errors="replace")

    def list_dir(self, relative: str) -> List[str]:
        target = self.resolve(relative)
        if not target.is_dir():
            raise SafetyError(f"폴더가 없습니다: {relative}")
        entries = []
        for child in sorted(target.iterdir()):
            if child.name in PROTECTED_NAMES or child.name in {"node_modules", "venv", "__pycache__"}:
                continue
            entries.append(child.name + ("/" if child.is_dir() else ""))
        return entries


def check_command(command: str) -> List[str]:
    tokens = shlex.split(command)
    if not tokens:
        raise SafetyError("빈 명령입니다.")
    if any(op in command for op in SHELL_OPERATORS):
        raise SafetyError(f"셸 연산자는 허용되지 않습니다: {command}")
    for prefix in ALLOWED_COMMANDS:
        if tuple(tokens[: len(prefix)]) == prefix:
            return tokens
    raise SafetyError(f"허용되지 않은 명령입니다: {command}")


def run_allowed_command(workspace: Workspace, command: str) -> str:
    tokens = check_command(command)
    try:
        completed = subprocess.run(
            tokens, cwd=workspace.root, capture_output=True, text=True,
            timeout=COMMAND_TIMEOUT_SECONDS, shell=False,
        )
    except subprocess.TimeoutExpired:
        return f"[시간 초과 {COMMAND_TIMEOUT_SECONDS}초]"
    output = (completed.stdout + completed.stderr).strip()
    return f"[exit {completed.returncode}]\n{output[-MAX_OBSERVATION_CHARS:]}"


def validate_edit(workspace: Workspace, proposal: EditProposal) -> Optional[str]:
    """제안이 지금 파일에 적용 가능한지 확인한다. 문제가 있으면 사유를 반환."""
    try:
        target = workspace.check_writable(proposal.path)
        if not target.is_file():
            return f"파일이 없습니다: {proposal.path}"
        content = target.read_text(encoding="utf-8", errors="replace")
    except SafetyError as e:
        return str(e)
    count = content.count(proposal.search)
    if count != 1:
        return f"search 텍스트가 파일에 {count}번 나타납니다 (정확히 1번이어야 함): {proposal.path}"
    return None


def diff_text(proposal: EditProposal, original: str) -> str:
    updated = original.replace(proposal.search, proposal.replace, 1)
    lines = difflib.unified_diff(
        original.splitlines(keepends=True), updated.splitlines(keepends=True),
        fromfile=f"a/{proposal.path}", tofile=f"b/{proposal.path}",
    )
    return "".join(lines)


def apply_proposal(workspace: Workspace, proposal: EditProposal, backup_dir: Path) -> str:
    """제안을 파일에 적용한다. 적용 전 원본을 backup_dir에 복사한다."""
    problem = validate_edit(workspace, proposal)
    if problem:
        raise SafetyError(problem)
    target = workspace.check_writable(proposal.path)
    original = target.read_text(encoding="utf-8", errors="replace")

    backup_path = backup_dir / proposal.path
    backup_path.parent.mkdir(parents=True, exist_ok=True)
    backup_path.write_text(original, encoding="utf-8")

    target.write_text(original.replace(proposal.search, proposal.replace, 1), encoding="utf-8")
    return f"적용됨: {proposal.path} (백업: {backup_path})"


PROJECT_ROOT = Path(__file__).resolve().parents[2]


def claude_api_key() -> str:
    """환경 변수, 없으면 프로젝트 .env의 CLAUDE_API_KEY를 쓴다."""
    key = os.getenv("CLAUDE_API_KEY", "")
    if key:
        return key
    try:
        from dotenv import dotenv_values

        return dotenv_values(PROJECT_ROOT / ".env").get("CLAUDE_API_KEY", "") or ""
    except ImportError:
        return ""


class LLMClient:
    """Claude 또는 Ollama를 같은 방식(텍스트 입력 → 텍스트 출력)으로 호출한다."""

    def __init__(self, provider: str = "auto"):
        from src.core.llm_provider import is_production
        if is_production():
            provider = "bedrock"
            self.provider = provider
            return
        has_claude_key = bool(claude_api_key())
        if provider == "auto":
            provider = "claude" if has_claude_key else "ollama"
        if provider == "claude" and not has_claude_key:
            raise RuntimeError("CLAUDE_API_KEY가 없습니다. --model ollama를 쓰거나 키를 설정하세요.")
        self.provider = provider

    def complete(self, messages: List[dict], temperature: float = 0.2) -> str:
        if self.provider == "bedrock":
            from src.core import usage_ledger
            from src.core.llm_provider import bedrock_complete, bedrock_model_name
            text, tin, tout = bedrock_complete(messages, 2048)
            usage_ledger.record("bedrock", bedrock_model_name(), "llm", tin, tout)
            return text
        if self.provider == "claude":
            from anthropic import Anthropic

            client = Anthropic(api_key=claude_api_key())
            system = messages[0]["content"]
            turns = messages[1:]
            model = os.getenv("CLAUDE_MODEL", "claude-sonnet-5-5")
            response = client.messages.create(
                model=model,
                max_tokens=2048,
                system=system,
                messages=turns,
            )
            from src.core import usage_ledger
            usage_ledger.record("claude", model, "llm", response.usage.input_tokens or 0, response.usage.output_tokens or 0)
            return "".join(block.text for block in response.content if block.type == "text")

        import requests

        response = requests.post(
            "http://localhost:11434/api/chat",
            json={
                "model": os.getenv("PRISM_AGENT_OLLAMA_MODEL", "llama3.1:8b"),
                "messages": messages,
                "stream": False,
                "options": {"temperature": temperature},
            },
            timeout=300,
        )
        response.raise_for_status()
        body = response.json()
        from src.core import usage_ledger
        usage_ledger.record("ollama", os.getenv("PRISM_AGENT_OLLAMA_MODEL", "llama3.1:8b"), "llm",
                            body.get("prompt_eval_count") or 0, body.get("eval_count") or 0)
        return body.get("message", {}).get("content", "")


def complete_vision(llm: "LLMClient", prompt: str, image_path: str, temperature: float = 0.8) -> str:
    """이미지와 프롬프트를 함께 보낸다 (Claude 비전 전용)."""
    import base64
    import mimetypes

    if llm.provider != "claude":
        raise RuntimeError("이미지 라벨링은 Claude 비전 모델(CLAUDE_API_KEY)이 필요합니다.")
    from anthropic import Anthropic

    path = Path(image_path)
    if path.stat().st_size > 4_500_000:
        raise ValueError(f"이미지가 너무 큽니다 (4.5MB 초과): {image_path}")
    media_type = mimetypes.guess_type(path.name)[0] or "image/png"
    data = base64.b64encode(path.read_bytes()).decode("ascii")
    client = Anthropic(api_key=claude_api_key())
    response = client.messages.create(
        model=os.getenv("CLAUDE_MODEL", "claude-sonnet-5-5"),
        max_tokens=200,
        messages=[{
            "role": "user",
            "content": [
                {"type": "image", "source": {"type": "base64", "media_type": media_type, "data": data}},
                {"type": "text", "text": prompt},
            ],
        }],
    )
    return "".join(block.text for block in response.content if block.type == "text")


def parse_action(text: str) -> dict:
    """모델 응답에서 첫 JSON 객체를 뽑는다."""
    start = text.find("{")
    if start == -1:
        raise ValueError("JSON 객체가 없습니다.")
    depth = 0
    for index in range(start, len(text)):
        if text[index] == "{":
            depth += 1
        elif text[index] == "}":
            depth -= 1
            if depth == 0:
                return json.loads(text[start : index + 1])
    raise ValueError("JSON이 끝나지 않았습니다.")


SANDBOX_EXCLUDE = {".git", "node_modules", "venv", ".venv", "__pycache__", "target", "dist", ".lars", "Library"}
MAX_SANDBOX_BYTES = 300 * 1024 * 1024


def create_sandbox(source: Path) -> Path:
    """작업 폴더의 복사본을 임시 폴더에 만든다. 원본은 건드리지 않는다."""
    import shutil
    import tempfile

    dest = Path(tempfile.mkdtemp(prefix="prism-sandbox-"))
    total = 0
    root = source.resolve()
    for current, dirs, files in os.walk(root):
        dirs[:] = [d for d in dirs if d not in SANDBOX_EXCLUDE]
        for name in files:
            src_file = Path(current) / name
            if src_file.is_symlink():
                continue
            total += src_file.stat().st_size
            if total > MAX_SANDBOX_BYTES:
                shutil.rmtree(dest, ignore_errors=True)
                raise SafetyError("작업 폴더가 너무 커서 샌드박스를 만들 수 없습니다 (300MB 초과).")
            target = dest / src_file.relative_to(root)
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src_file, target)
    return dest


def remove_sandbox(path: Path) -> None:
    import shutil

    shutil.rmtree(path, ignore_errors=True)


def _apply_in_place(workspace: Workspace, proposal: EditProposal) -> None:
    problem = validate_edit(workspace, proposal)
    if problem:
        raise SafetyError(problem)
    target = workspace.check_writable(proposal.path)
    content = target.read_text(encoding="utf-8", errors="replace")
    target.write_text(content.replace(proposal.search, proposal.replace, 1), encoding="utf-8")


class CodeAgent:
    """목표를 달성하는 도구 루프.

    sandbox를 주면 읽기·명령 실행·수정 검증을 모두 복사본에서 한다.
    수정 제안은 원본 기준 상대 경로로 모이고, 원본 적용은 호출자가 확인 후 한다.
    """

    def __init__(
        self,
        workspace: Workspace,
        llm: LLMClient,
        max_steps: int = 8,
        sandbox: Optional[Path] = None,
        web_enabled: bool = True,
    ):
        self.workspace = workspace
        self.exec_ws = Workspace(sandbox) if sandbox else workspace
        self.sandboxed = sandbox is not None
        self.llm = llm
        self.max_steps = max_steps
        self.web_enabled = web_enabled

    def _execute(self, action: dict, result: AgentResult) -> str:
        from src.core import web_tools

        tool = action.get("tool")
        args = action.get("args", {}) or {}
        if tool == "list_dir":
            return "\n".join(self.exec_ws.list_dir(args.get("path", "."))) or "(비어 있음)"
        if tool == "read_file":
            return self.exec_ws.read(args["path"])[:MAX_OBSERVATION_CHARS]
        if tool == "run_command":
            return run_allowed_command(self.exec_ws, args["command"])
        if tool == "propose_edit":
            proposal = EditProposal(
                path=self.workspace.normalize(args["path"]),
                search=args["search"],
                replace=args.get("replace", ""),
            )
            problem = validate_edit(self.exec_ws, proposal)
            if problem:
                return f"제안 거절: {problem}"
            if self.sandboxed:
                _apply_in_place(self.exec_ws, proposal)
            result.proposals.append(proposal)
            where = "샌드박스에서 적용해 검증했습니다" if self.sandboxed else "수정 제안 등록됨"
            return f"{where}: {proposal.path} (원본 적용은 사용자 확인 후 진행됩니다)"
        if tool == "search_web":
            if not self.web_enabled:
                return "웹 검색이 비활성화되어 있습니다."
            hits = web_tools.search_web(args["query"])
            return "\n".join(f"- {h['title']} | {h['url']} | {h['snippet']}" for h in hits) or "(결과 없음)"
        if tool == "fetch_url":
            if not self.web_enabled:
                return "웹 읽기가 비활성화되어 있습니다."
            return web_tools.fetch_page_text(args["url"])
        raise SafetyError(f"알 수 없는 도구: {tool}")

    def run(self, goal: str, on_step: Optional[Callable[[dict], None]] = None) -> AgentResult:
        import time

        result = AgentResult(summary="")
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"목표: {goal}\n작업 폴더: {self.workspace.root}"},
        ]

        for step in range(1, self.max_steps + 1):
            started = time.time()
            try:
                reply = self.llm.complete(messages)
                action = parse_action(reply)
            except Exception as e:
                result.error = f"모델 응답 해석 실패: {e}"
                break

            tool = action.get("tool")
            if tool == "finish":
                result.summary = (action.get("args") or {}).get("summary", "")
                break

            try:
                observation = self._execute(action, result)
            except (SafetyError, KeyError, OSError, ValueError) as e:
                observation = f"오류: {e}"
            except Exception as e:  # 웹 도구 등 외부 호출 실패는 에이전트 루프를 멈추지 않는다
                observation = f"오류: {e}"

            args = action.get("args", {})
            event = {
                "step": step,
                "tool": tool,
                "args": args,
                "observation": observation[:300],
                "seconds": round(time.time() - started, 2),
            }
            result.steps.append(f"{tool} {json.dumps(args, ensure_ascii=False)[:160]}")
            if on_step:
                on_step(event)

            messages.append({"role": "assistant", "content": reply})
            messages.append({"role": "user", "content": f"도구 결과:\n{observation}"})
        else:
            result.error = f"최대 단계({self.max_steps})에 도달해 종료했습니다."

        return result
