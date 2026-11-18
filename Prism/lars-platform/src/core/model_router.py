"""
LARS 모델 라우터: 사이드 메뉴 그룹(탭)에 맞는 엔진으로 요청을 보낸다.

- lars-prime / lars-cosmos / lars-native: 로컬 Ollama 모델
- rekora / synzora / aivora: 로컬 모델이 없어 Claude에 전문 역할 프롬프트를 적용
- Ollama 모델이 꺼져 있으면 Claude로 대체한다 (역할 프롬프트는 그대로 유지)
- exaone: LG AI의 EXAONE을 OpenAI 호환 API로 호출한다. 키·주소·모델 이름은 .env에서 읽는다
  (EXAONE_API_KEY, EXAONE_BASE_URL, EXAONE_MODEL). 값이 없으면 명확한 오류를 낸다.
"""

import json
from dataclasses import dataclass
from typing import Dict, List, Optional

import requests

from src.core import usage_ledger
from src.core.code_agent import LLMClient, PROJECT_ROOT, claude_api_key

OLLAMA_URL = "http://localhost:11434/api/chat"
OLLAMA_TIMEOUT = 300


@dataclass(frozen=True)
class Engine:
    name: str
    backend: str  # "ollama" | "claude"
    model: str
    role: str


ENGINES: Dict[str, Engine] = {
    "lars-prime": Engine(
        "lars-prime", "ollama", "lars-prime:latest",
        "당신은 LARS Prime입니다. 데이터의 정확성과 검증을 중시합니다. 근거를 밝히고, 불확실한 부분은 명시하세요.",
    ),
    "lars-cosmos": Engine(
        "lars-cosmos", "ollama", "lars-cosmos:latest",
        "당신은 LARS Cosmos입니다. 깊이 있는 분석과 아키텍처 관점에서 맥락을 넓게 보고 단계별로 설명하세요.",
    ),
    "lars-native": Engine(
        "lars-native", "ollama", "lars-native:latest",
        "당신은 LARS Native입니다. 빠른 구현과 실행에 집중합니다. 바로 적용 가능한 결과와 실행 방법을 간결히 제시하세요.",
    ),
    "exaone": Engine(
        "exaone", "exaone", "",
        "당신은 LARS EXAONE입니다. 한국어 이해와 에이전트형 작업에 강합니다. 단계별로 근거를 밝히고 실행 가능한 답을 주세요.",
    ),
    "rekora": Engine(
        "rekora", "claude", "",
        "당신은 Rekora입니다. 3D 설계와 비주얼 디자인 전문가입니다. 색상, 구도, 설계 관점에서 구체적으로 제안하세요.",
    ),
    "synzora": Engine(
        "synzora", "claude", "",
        "당신은 Synzora입니다. 데이터 그래프와 네트워크 관계 분석 전문가입니다. 노드와 관계를 명확히 정리하세요.",
    ),
    "aivora": Engine(
        "aivora", "claude", "",
        "당신은 Aivora입니다. 감정 AI 전문가입니다. 감정과 맥락을 공감적으로 읽고 대응을 제안하세요.",
    ),
}

GROUP_ENGINE: Dict[str, str] = {
    "data-engine": "lars-prime",
    "analysis": "lars-cosmos",
    "output": "lars-native",
    "ai-design": "rekora",
    "platform": "lars-native",
}

TAB_GROUP: Dict[str, str] = {
    "scraping": "data-engine",
    "ocr": "data-engine",
    "change-detection": "data-engine",
    "seo": "analysis",
    "crm": "analysis",
    "workflows": "analysis",
    "presentation": "output",
    "integration": "output",
    "branding": "ai-design",
    "color-font": "ai-design",
    "auto-layout": "ai-design",
    "collaboration": "ai-design",
    "xr-preview": "ai-design",
    "cross-platform": "platform",
    "performance": "platform",
    "version-control": "platform",
    "voice-design": "platform",
    "multilingual": "platform",
}


def engine_for_tab(tab: str) -> Optional[Engine]:
    group = TAB_GROUP.get(tab)
    if group is None:
        return None
    return ENGINES[GROUP_ENGINE[group]]


def _ollama_available(model: str) -> bool:
    from src.core.llm_provider import is_production
    if is_production():
        return False
    try:
        response = requests.get("http://localhost:11434/api/tags", timeout=5)
        names = {m.get("name") for m in response.json().get("models", [])}
        return model in names
    except (requests.exceptions.RequestException, ValueError):
        return False


def _call_ollama(engine: Engine, messages: List[dict]) -> str:
    response = requests.post(
        OLLAMA_URL,
        json={"model": engine.model, "messages": messages, "stream": False, "options": {"temperature": 0.3}},
        timeout=OLLAMA_TIMEOUT,
    )
    response.raise_for_status()
    body = response.json()
    usage_ledger.record("ollama", engine.model, "routed", body.get("prompt_eval_count") or 0, body.get("eval_count") or 0)
    return body.get("message", {}).get("content", "")


def _env_value(name: str) -> str:
    """환경 변수, 없으면 프로젝트 .env에서 읽는다 (claude_api_key와 같은 방식)."""
    import os

    value = os.getenv(name, "")
    if value:
        return value
    try:
        from dotenv import dotenv_values

        return dotenv_values(PROJECT_ROOT / ".env").get(name, "") or ""
    except ImportError:
        return ""


def exaone_config() -> Dict[str, str]:
    return {
        "api_key": _env_value("EXAONE_API_KEY"),
        "base_url": _env_value("EXAONE_BASE_URL").rstrip("/"),
        "model": _env_value("EXAONE_MODEL"),
    }


def check_exaone_config() -> Dict[str, str]:
    """키·주소·모델이 모두 있는지 확인하고, 빠진 항목을 알려 준다."""
    config = exaone_config()
    missing = [name for name, key in (("EXAONE_API_KEY", "api_key"), ("EXAONE_BASE_URL", "base_url"), ("EXAONE_MODEL", "model")) if not config[key]]
    if missing:
        raise RuntimeError(f"EXAONE 설정이 비어 있습니다: {', '.join(missing)} (.env에 입력하세요)")
    return config


def _exaone_payload(config: Dict[str, str], messages: List[dict], stream: bool) -> dict:
    return {
        "model": config["model"],
        "messages": messages,
        # K-EXAONE 권장값: temperature 1.0, top_p 0.95. 사고 과정 토큰도 max_tokens에 포함된다.
        "temperature": 1.0,
        "top_p": 0.95,
        "max_tokens": 4096,
        # 기본값 max는 사고 과정이 길어 응답이 수 분 걸린다. 채팅은 low로 빠르게 응답한다.
        "reasoning_effort": "low",
        "stream": stream,
    }


def _call_exaone(messages: List[dict]) -> str:
    """OpenAI 호환 chat/completions 호출 (한 번에 전체 답변)."""
    config = check_exaone_config()
    response = requests.post(
        f"{config['base_url']}/chat/completions",
        headers={"Authorization": f"Bearer {config['api_key']}", "Content-Type": "application/json"},
        json=_exaone_payload(config, messages, stream=False),
        timeout=OLLAMA_TIMEOUT,
    )
    response.raise_for_status()
    body = response.json()
    usage = body.get("usage") or {}
    usage_ledger.record("exaone", config["model"], "routed", usage.get("prompt_tokens", 0), usage.get("completion_tokens", 0), known=bool(usage))
    choices = body.get("choices", [])
    if not choices:
        raise RuntimeError("EXAONE 응답에 choices가 없습니다.")
    # 사고 과정(reasoning_content)은 답변에 섞지 않고 content만 돌려준다.
    return (choices[0].get("message", {}).get("content") or "").strip()


def exaone_messages(engine: Engine, message: str, history: Optional[List[dict]] = None) -> List[dict]:
    messages = [{"role": "system", "content": engine.role}]
    messages.extend(history or [])
    messages.append({"role": "user", "content": message})
    return messages


def iter_exaone_stream(messages: List[dict], usage_out: Optional[dict] = None):
    """답변 조각(content)을 도착하는 대로 내보낸다. 사고 과정 조각은 버린다. 마지막 토큰 사용량은 usage_out에 담는다."""
    config = check_exaone_config()
    payload = _exaone_payload(config, messages, stream=True)
    payload["stream_options"] = {"include_usage": True}
    with requests.post(
        f"{config['base_url']}/chat/completions",
        headers={"Authorization": f"Bearer {config['api_key']}", "Content-Type": "application/json"},
        json=payload,
        timeout=OLLAMA_TIMEOUT,
        stream=True,
    ) as response:
        response.raise_for_status()
        for raw in response.iter_lines(decode_unicode=True):
            if not raw or not raw.startswith("data:"):
                continue
            data = raw[5:].strip()
            if data == "[DONE]":
                break
            try:
                chunk = json.loads(data)
            except ValueError:
                continue
            if usage_out is not None and chunk.get("usage"):
                usage_out.update(chunk["usage"])
            choices = chunk.get("choices") or []
            if not choices:
                continue
            piece = (choices[0].get("delta") or {}).get("content") or ""
            if piece:
                yield piece


def _call_claude(engine: Engine, messages: List[dict]) -> str:
    llm = LLMClient("claude")
    return llm.complete(messages)


def run_engine(engine: Engine, message: str, history: Optional[List[dict]] = None) -> dict:
    # 이 호출의 사용량이 어떤 LARS 모델로 집계될지 정한다 (LARS Cosmos, Rekora 등).
    usage_ledger.set_lars_model(engine.name)
    messages = [{"role": "system", "content": engine.role}]
    messages.extend(history or [])
    messages.append({"role": "user", "content": message})

    if engine.backend == "ollama":
        if _ollama_available(engine.model):
            try:
                reply = _call_ollama(engine, messages)
                return {"reply": reply, "engine": engine.name, "backend": "ollama", "model": engine.model}
            except requests.exceptions.RequestException:
                pass
        from src.core.llm_provider import is_production
        if not is_production() and not claude_api_key():
            raise RuntimeError(f"{engine.name} 모델을 쓸 수 없고, Claude 키도 없습니다.")
        # 사용량(토큰)은 LLMClient가 실제 응답 값으로 이미 기록한다. 여기서 또 적으면 호출이 두 번 집계된다.
        reply = _call_claude(engine, messages)
        backend = "bedrock" if is_production() else "claude-fallback"
        return {"reply": reply, "engine": engine.name, "backend": backend, "model": ""}

    if engine.backend == "exaone":
        reply = _call_exaone(messages)  # 사용량은 _call_exaone 안에서 응답 값으로 기록된다
        return {"reply": reply, "engine": engine.name, "backend": "exaone-api", "model": exaone_config()["model"]}

    reply = _call_claude(engine, messages)  # 사용량은 LLMClient가 응답 값으로 기록한다
    return {"reply": reply, "engine": engine.name, "backend": "claude", "model": ""}
