import json
from datetime import datetime, timedelta
from pathlib import Path

import pytest

from src.core import schedule, web_tools
from src.core.code_agent import CodeAgent, EditProposal, SafetyError, Workspace, create_sandbox, remove_sandbox
from src.core.code_team import SubResult, find_conflicts, plan_subtasks, run_team
from src.core.code_agent import AgentResult


class ScriptedLLM:
    provider = "test"

    def __init__(self, replies):
        self.replies = list(replies)

    def complete(self, messages):
        return self.replies.pop(0)


class RoutingLLM:
    """시스템 프롬프트/목표 문장으로 응답을 고른다 (병렬 실행에서도 결정적)."""

    provider = "test"

    def __init__(self, plan, edits):
        self.plan = plan
        self.edits = edits  # 목표 문장 -> (path, search, replace)

    def complete(self, messages):
        system, user = messages[0]["content"], messages[-1]["content"]
        if "하위 작업" in system and "JSON" in system:
            return json.dumps(self.plan, ensure_ascii=False)
        for goal, (path, search, replace) in self.edits.items():
            if f"목표: {goal}" in user:
                if "도구 결과" in user:
                    return '{"tool": "finish", "args": {"summary": "%s 완료"}}' % goal
                return json.dumps({"tool": "propose_edit", "args": {"path": path, "search": search, "replace": replace}}, ensure_ascii=False)
        return '{"tool": "finish", "args": {"summary": "없음"}}'


def make_repo(root: Path):
    (root / "app.py").write_text("a = 1\nb = 2\n")
    (root / ".git").mkdir()
    (root / ".git" / "config").write_text("secret")
    (root / "node_modules").mkdir()
    (root / "node_modules" / "x.js").write_text("big")


def test_sandbox_excludes_heavy_and_protected_dirs(tmp_path):
    make_repo(tmp_path)
    sb = create_sandbox(tmp_path)
    try:
        assert (sb / "app.py").exists()
        assert not (sb / ".git").exists()
        assert not (sb / "node_modules").exists()
    finally:
        remove_sandbox(sb)


def test_sandboxed_agent_edits_copy_not_original(tmp_path):
    make_repo(tmp_path)
    sb = create_sandbox(tmp_path)
    try:
        llm = ScriptedLLM([
            '{"tool": "propose_edit", "args": {"path": "app.py", "search": "a = 1", "replace": "a = 9"}}',
            '{"tool": "run_command", "args": {"command": "git status"}}',
            '{"tool": "finish", "args": {"summary": "ok"}}',
        ])
        result = CodeAgent(Workspace(tmp_path), llm, sandbox=sb, web_enabled=False).run("a 바꾸기")
        assert (sb / "app.py").read_text() == "a = 9\nb = 2\n"  # 복사본에서 검증
        assert (tmp_path / "app.py").read_text() == "a = 1\nb = 2\n"  # 원본은 그대로
        assert [p.path for p in result.proposals] == ["app.py"]
        assert result.summary == "ok"
    finally:
        remove_sandbox(sb)


def test_web_blocks_internal_and_local_addresses():
    for url in ["http://127.0.0.1/admin", "http://localhost:8001/api", "http://10.0.0.5/", "http://192.168.1.1/", "file:///etc/passwd", "ftp://example.com/x"]:
        with pytest.raises(web_tools.WebToolError):
            web_tools._check_url(url)


def test_html_to_text_strips_scripts_and_tags():
    raw = "<html><head><script>var x=1;</script><style>p{}</style></head><body><h1>제목</h1><p>본문 &amp; 내용</p></body></html>"
    assert web_tools.html_to_text(raw) == "제목 본문 & 내용"


def test_conflicts_detected_between_subtasks_only():
    a = SubResult("t1", AgentResult(summary="", proposals=[EditProposal("f.py", "x = 1", "x = 2")]))
    b = SubResult("t2", AgentResult(summary="", proposals=[EditProposal("f.py", "x = 1", "x = 3")]))
    c = SubResult("t3", AgentResult(summary="", proposals=[EditProposal("g.py", "x = 1", "x = 3")]))
    assert find_conflicts([a, b, c]) == [(0, 1)]


def test_plan_falls_back_to_goal_when_unparseable():
    assert plan_subtasks("목표", ScriptedLLM(["계획을 못 세움"])) == ["목표"]
    assert plan_subtasks("목표", ScriptedLLM(['["A", "B", "C"]'])) == ["A", "B", "C"]


def test_team_runs_subtasks_and_keeps_original_untouched(tmp_path):
    make_repo(tmp_path)
    llm = RoutingLLM(
        plan=["수정 A", "수정 B"],
        edits={
            "수정 A": ("app.py", "a = 1", "a = 10"),
            "수정 B": ("app.py", "b = 2", "b = 20"),
        },
    )
    team = run_team("두 가지 고치기", tmp_path, llm, max_parallel=2, web_enabled=False)
    assert [s.task for s in team.subtasks] == ["수정 A", "수정 B"]
    assert len(team.proposals) == 2
    assert team.conflicts == []
    assert (tmp_path / "app.py").read_text() == "a = 1\nb = 2\n"


def test_schedule_add_due_and_run_writes_proposal_only(tmp_path):
    make_repo(tmp_path)
    task = schedule.add_task(tmp_path, "a 바꾸기", 10)
    now = datetime.now()
    assert schedule.is_due(task, now)
    llm = RoutingLLM(plan=["x"], edits={"a 바꾸기": ("app.py", "a = 1", "a = 5")})
    written = schedule.run_due(tmp_path, llm, now=now)
    assert len(written) == 1
    text = written[0].read_text(encoding="utf-8")
    assert "검토 대기" in text and "<<<< FILE app.py" in text
    assert (tmp_path / "app.py").read_text() == "a = 1\nb = 2\n"  # 원본 미적용
    assert schedule.run_due(tmp_path, llm, now=now + timedelta(minutes=1)) == []
    assert len(schedule.run_due(tmp_path, llm, now=now + timedelta(minutes=11))) == 1
    assert schedule.remove_task(tmp_path, task.id)


def test_schedule_rejects_too_short_interval(tmp_path):
    with pytest.raises(ValueError):
        schedule.add_task(tmp_path, "x", 1)
