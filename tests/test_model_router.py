import pytest
import requests

from src.core import model_router as mr


def test_every_sidebar_group_tab_routes_to_expected_engine():
    expected = {
        "scraping": "lars-prime", "ocr": "lars-prime", "change-detection": "lars-prime",
        "seo": "lars-cosmos", "crm": "lars-cosmos", "workflows": "lars-cosmos",
        "presentation": "lars-native", "integration": "lars-native",
        "branding": "rekora", "color-font": "rekora", "auto-layout": "rekora",
        "collaboration": "rekora", "xr-preview": "rekora",
        "cross-platform": "lars-native", "performance": "lars-native",
        "version-control": "lars-native", "voice-design": "lars-native", "multilingual": "lars-native",
    }
    for tab, engine in expected.items():
        assert mr.engine_for_tab(tab).name == engine, tab


def test_non_group_tab_has_no_engine():
    assert mr.engine_for_tab("chat") is None
    assert mr.engine_for_tab("settings") is None


def test_ollama_engine_used_when_model_available(monkeypatch):
    monkeypatch.setattr(mr, "_ollama_available", lambda model: True)
    seen = {}

    def fake_ollama(engine, messages):
        seen["messages"] = messages
        return "분석 결과"

    monkeypatch.setattr(mr, "_call_ollama", fake_ollama)
    result = mr.run_engine(mr.ENGINES["lars-cosmos"], "구조를 분석해줘", [])
    assert result["backend"] == "ollama" and result["reply"] == "분석 결과"
    assert seen["messages"][0]["role"] == "system" and "Cosmos" in seen["messages"][0]["content"]
    assert seen["messages"][-1]["content"] == "구조를 분석해줘"


def test_falls_back_to_claude_when_ollama_down(monkeypatch):
    monkeypatch.setattr(mr, "_ollama_available", lambda model: False)
    monkeypatch.setattr(mr, "claude_api_key", lambda: "k")
    monkeypatch.setattr(mr, "_call_claude", lambda engine, messages: "대체 응답")
    result = mr.run_engine(mr.ENGINES["lars-prime"], "검증해줘", [])
    assert result["backend"] == "claude-fallback" and result["reply"] == "대체 응답"


def test_fails_clearly_without_any_backend(monkeypatch):
    monkeypatch.setattr(mr, "_ollama_available", lambda model: False)
    monkeypatch.setattr(mr, "claude_api_key", lambda: "")
    with pytest.raises(RuntimeError):
        mr.run_engine(mr.ENGINES["lars-native"], "x", [])


def test_rekora_always_uses_claude_with_persona(monkeypatch):
    seen = {}
    monkeypatch.setattr(mr, "_call_claude", lambda engine, messages: seen.setdefault("m", messages) and "디자인 제안")
    result = mr.run_engine(mr.ENGINES["rekora"], "로고 색상 추천", [])
    assert result["backend"] == "claude" and "Rekora" in seen["m"][0]["content"]


def test_route_endpoint_validates_and_dispatches(monkeypatch):
    from fastapi.testclient import TestClient
    import app as backend

    monkeypatch.setattr(mr, "run_engine", lambda engine, message, history: {"reply": "ok", "engine": engine.name, "backend": "test", "model": ""})
    client = TestClient(backend.app)
    ok = client.post("/api/route/chat", json={"tab": "seo", "message": "키워드 분석"})
    assert ok.status_code == 200 and ok.json()["engine"] == "lars-cosmos"
    assert client.post("/api/route/chat", json={"tab": "chat", "message": "x"}).status_code == 404
    assert client.post("/api/route/chat", json={"tab": "seo", "message": "   "}).status_code == 400
