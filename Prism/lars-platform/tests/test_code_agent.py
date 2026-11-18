from pathlib import Path

import pytest

from src.core.code_agent import (
    CodeAgent,
    EditProposal,
    SafetyError,
    Workspace,
    apply_proposal,
    check_command,
    parse_action,
    parse_edit_blocks,
    render_edit_blocks,
    validate_edit,
)


class ScriptedLLM:
    provider = "test"

    def __init__(self, replies):
        self.replies = list(replies)

    def complete(self, messages):
        return self.replies.pop(0)


def test_parse_and_render_roundtrip():
    proposals = [EditProposal("src/a.py", "x = 1", "x = 2"), EditProposal("b.txt", "old", "new")]
    parsed = parse_edit_blocks(render_edit_blocks(proposals))
    assert [(p.path, p.search, p.replace) for p in parsed] == [(p.path, p.search, p.replace) for p in proposals]


def test_workspace_blocks_escape(tmp_path):
    ws = Workspace(tmp_path)
    with pytest.raises(SafetyError):
        ws.resolve("../outside.txt")


def test_protected_paths_not_writable(tmp_path):
    ws = Workspace(tmp_path)
    (tmp_path / ".env").write_text("SECRET=1")
    with pytest.raises(SafetyError):
        ws.check_writable(".env")
    with pytest.raises(SafetyError):
        ws.check_writable(".git/config")


def test_command_allowlist():
    assert check_command("pytest -q")
    assert check_command("git status")
    with pytest.raises(SafetyError):
        check_command("rm -rf /")
    with pytest.raises(SafetyError):
        check_command("pytest && rm -rf x")


def test_apply_requires_unique_match_and_backs_up(tmp_path):
    ws = Workspace(tmp_path)
    target = tmp_path / "m.py"
    target.write_text("a = 1\nb = 1\n")
    dup = EditProposal("m.py", "1", "2")
    assert "2번" in validate_edit(ws, dup)

    good = EditProposal("m.py", "a = 1", "a = 2")
    backup = tmp_path / "bk"
    message = apply_proposal(ws, good, backup)
    assert target.read_text() == "a = 2\nb = 1\n"
    assert (backup / "m.py").read_text() == "a = 1\nb = 1\n"
    assert "적용됨" in message


def test_agent_collects_proposal_and_finishes(tmp_path):
    (tmp_path / "f.py").write_text("print('hi')\n")
    llm = ScriptedLLM([
        '{"tool": "read_file", "args": {"path": "f.py"}}',
        '{"tool": "propose_edit", "args": {"path": "f.py", "search": "print(\'hi\')", "replace": "print(\'bye\')"}}',
        '{"tool": "finish", "args": {"summary": "인사말 변경"}}',
    ])
    result = CodeAgent(Workspace(tmp_path), llm).run("인사말 바꿔")
    assert result.summary == "인사말 변경"
    assert len(result.proposals) == 1
    assert result.error is None
    assert (tmp_path / "f.py").read_text() == "print('hi')\n"  # 제안만 하고 적용하지 않음


def test_agent_rejects_bad_command_and_reports(tmp_path):
    llm = ScriptedLLM([
        '{"tool": "run_command", "args": {"command": "rm -rf ."}}',
        '{"tool": "finish", "args": {"summary": "done"}}',
    ])
    result = CodeAgent(Workspace(tmp_path), llm).run("정리")
    assert result.summary == "done"
    assert result.proposals == []


def test_parse_action_handles_surrounding_text():
    assert parse_action('설명 {"tool": "list_dir", "args": {"path": "."}} 끝')["tool"] == "list_dir"


def test_absolute_path_normalized_to_workspace(tmp_path):
    (tmp_path / "g.py").write_text("x = 1\n")
    absolute = str(tmp_path / "g.py")
    llm = ScriptedLLM([
        '{"tool": "propose_edit", "args": {"path": "%s", "search": "x = 1", "replace": "x = 2"}}' % absolute,
        '{"tool": "finish", "args": {"summary": "ok"}}',
    ])
    result = CodeAgent(Workspace(tmp_path), llm).run("x 변경")
    assert [p.path for p in result.proposals] == ["g.py"]
