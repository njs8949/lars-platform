from unittest import mock

import pytest

from src.core import model_router
from src.core.model_router import ENGINES, run_engine


def _clear_env(monkeypatch):
    for name in ("EXAONE_API_KEY", "EXAONE_BASE_URL", "EXAONE_MODEL"):
        monkeypatch.setenv(name, "")


def test_exaone_engine_is_registered():
    assert "exaone" in ENGINES
    assert ENGINES["exaone"].backend == "exaone"


def test_missing_config_names_the_empty_keys(monkeypatch):
    _clear_env(monkeypatch)
    monkeypatch.setattr(model_router, "_env_value", lambda name: "")
    with pytest.raises(RuntimeError) as err:
        run_engine(ENGINES["exaone"], "안녕")
    message = str(err.value)
    assert "EXAONE_API_KEY" in message and "EXAONE_BASE_URL" in message and "EXAONE_MODEL" in message


def test_openai_compatible_call_uses_env_settings(monkeypatch):
    values = {"EXAONE_API_KEY": "test-key", "EXAONE_BASE_URL": "https://example.test/v1/", "EXAONE_MODEL": "test-model"}
    monkeypatch.setattr(model_router, "_env_value", lambda name: values.get(name, ""))
    fake = mock.Mock()
    fake.json.return_value = {"choices": [{"message": {"content": "답변입니다"}}]}
    fake.raise_for_status.return_value = None
    with mock.patch.object(model_router.requests, "post", return_value=fake) as post:
        result = run_engine(ENGINES["exaone"], "요약해 줘", [{"role": "user", "content": "앞선 질문"}])
    assert result["reply"] == "답변입니다"
    assert result["backend"] == "exaone-api"
    url = post.call_args.args[0]
    body = post.call_args.kwargs["json"]
    headers = post.call_args.kwargs["headers"]
    assert url == "https://example.test/v1/chat/completions"
    assert headers["Authorization"] == "Bearer test-key"
    assert body["model"] == "test-model"
    assert body["messages"][0]["role"] == "system"
    assert body["messages"][-1] == {"role": "user", "content": "요약해 줘"}
