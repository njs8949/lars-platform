"""운영(production)에서 Claude를 Amazon Bedrock으로 호출하는 공통 모듈.

- PRISM_LLM_PROVIDER=bedrock 또는 PRISM_ENV=production 이면 모든 Claude/로컬 모델 호출을 Bedrock Converse API로 보낸다.
- 개발 환경(PRISM_ENV 미설정)은 기존처럼 로컬 Ollama / Anthropic API를 쓴다.
- 인증은 AWS 자격 증명 체인(서버의 IAM 역할 또는 AWS_PROFILE)을 쓴다. 키를 코드에 두지 않는다.
- 모델 ID는 BEDROCK_CLAUDE_MODEL, 리전은 BEDROCK_REGION 으로 바꿀 수 있다.
"""

import os
from typing import Dict, Generator, List, Optional, Tuple

BEDROCK_MODEL = os.getenv("BEDROCK_CLAUDE_MODEL", "global.anthropic.claude-sonnet-5-5")
BEDROCK_REGION = os.getenv("BEDROCK_REGION", "ap-northeast-2")

_client = None


def is_production() -> bool:
    """Claude/로컬 모델 호출을 Bedrock으로 보낼지 정한다.
    PRISM_LLM_PROVIDER=bedrock 이거나 PRISM_ENV=production 이면 Bedrock을 쓴다(인증 설정과 별개로 켤 수 있다)."""
    if os.getenv("PRISM_LLM_PROVIDER", "").strip().lower() == "bedrock":
        return True
    return os.getenv("PRISM_ENV", "").strip().lower() in ("production", "prod")


def _runtime():
    global _client
    if _client is None:
        import boto3
        from botocore.config import Config

        _client = boto3.client(
            "bedrock-runtime",
            region_name=BEDROCK_REGION,
            config=Config(read_timeout=600, retries={"max_attempts": 3, "mode": "standard"}),
        )
    return _client


def _to_converse(messages: List[Dict[str, str]]) -> Tuple[str, List[dict]]:
    """system 메시지를 분리하고, Converse가 요구하는 user/assistant 교대 형식으로 맞춘다."""
    system_parts: List[str] = []
    turns: List[dict] = []
    for m in messages:
        role = m.get("role", "user")
        text = (m.get("content") or "").strip()
        if not text:
            continue
        if role == "system":
            system_parts.append(text)
            continue
        role = "assistant" if role == "assistant" else "user"
        if turns and turns[-1]["role"] == role:
            turns[-1]["content"][0]["text"] += "\n\n" + text
        else:
            turns.append({"role": role, "content": [{"text": text}]})
    if not turns or turns[0]["role"] != "user":
        turns.insert(0, {"role": "user", "content": [{"text": "(시작)"}]})
    return "\n\n".join(system_parts), turns


def bedrock_complete(messages: List[Dict[str, str]], max_tokens: int = 2048) -> Tuple[str, int, int]:
    """Bedrock으로 한 번에 답을 받는다. (텍스트, 입력 토큰, 출력 토큰)을 돌려준다."""
    system, turns = _to_converse(messages)
    kwargs = {
        "modelId": BEDROCK_MODEL,
        "messages": turns,
        "inferenceConfig": {"maxTokens": max_tokens},
    }
    if system:
        kwargs["system"] = [{"text": system}]
    response = _runtime().converse(**kwargs)
    parts = response["output"]["message"]["content"]
    text = "".join(p.get("text", "") for p in parts)
    usage = response.get("usage") or {}
    return text, int(usage.get("inputTokens", 0)), int(usage.get("outputTokens", 0))


def bedrock_stream(messages: List[Dict[str, str]], max_tokens: int = 2048, usage_out: Optional[dict] = None) -> Generator[str, None, None]:
    """Bedrock 응답을 조각 단위로 내보낸다(converse_stream)."""
    system, turns = _to_converse(messages)
    kwargs = {
        "modelId": BEDROCK_MODEL,
        "messages": turns,
        "inferenceConfig": {"maxTokens": max_tokens},
    }
    if system:
        kwargs["system"] = [{"text": system}]
    response = _runtime().converse_stream(**kwargs)
    for event in response["stream"]:
        if "contentBlockDelta" in event:
            piece = event["contentBlockDelta"]["delta"].get("text", "")
            if piece:
                yield piece
        elif "metadata" in event and usage_out is not None:
            usage_out.update(event["metadata"].get("usage") or {})


def bedrock_model_name() -> str:
    return BEDROCK_MODEL


# ---- 도구 호출(Tool use): Anthropic SDK와 같은 모양으로 돌려줘서 기존 코드가 그대로 읽게 한다 ----
from types import SimpleNamespace  # noqa: E402
import json as _json  # noqa: E402


def _tool_config(claude_tools: List[dict]) -> Optional[dict]:
    if not claude_tools:
        return None
    return {"tools": [
        {"toolSpec": {"name": t["name"], "description": t.get("description", ""),
                      "inputSchema": {"json": t.get("input_schema", {"type": "object", "properties": {}})}}}
        for t in claude_tools
    ]}


def _split_system(system) -> str:
    if isinstance(system, str):
        return system
    return "\n".join(b.get("text", "") for b in (system or []) if isinstance(b, dict))


def bedrock_stream_tools(system, messages: List[Dict[str, str]], claude_tools: List[dict], max_tokens: int = 2048):
    """도구를 열어 둔 채 답을 조각으로 내보낸다. 마지막 항목은 {'tool_uses': [...], 'usage': {...}} 요약 dict."""
    sys_text, turns = _to_converse(messages)
    if isinstance(system, str):
        sys_text = (system + ("\n\n" + sys_text if sys_text else "")) if system else sys_text
    else:
        sys_text = _split_system(system) or sys_text
    kwargs = {"modelId": BEDROCK_MODEL, "messages": turns, "inferenceConfig": {"maxTokens": max_tokens}}
    if sys_text:
        kwargs["system"] = [{"text": sys_text}]
    tool_cfg = _tool_config(claude_tools)
    if tool_cfg:
        kwargs["toolConfig"] = tool_cfg
    response = _runtime().converse_stream(**kwargs)
    tool_acc: Dict[int, dict] = {}
    usage: dict = {}
    for event in response["stream"]:
        if "contentBlockStart" in event:
            block = event["contentBlockStart"]
            tu = (block.get("start") or {}).get("toolUse")
            if tu:
                tool_acc[block["contentBlockIndex"]] = {"id": tu.get("toolUseId", ""), "name": tu.get("name", ""), "buf": ""}
        elif "contentBlockDelta" in event:
            block = event["contentBlockDelta"]
            delta = block.get("delta") or {}
            if "text" in delta and delta["text"]:
                yield delta["text"]
            elif "toolUse" in delta:
                tool_acc.setdefault(block["contentBlockIndex"], {"id": "", "name": "", "buf": ""})["buf"] += delta["toolUse"].get("input", "")
        elif "metadata" in event:
            usage.update(event["metadata"].get("usage") or {})
    tool_uses = []
    for item in tool_acc.values():
        try:
            args = _json.loads(item["buf"] or "{}")
        except ValueError:
            args = {}
        tool_uses.append({"id": item["id"], "name": item["name"], "input": args})
    yield {"tool_uses": tool_uses, "usage": usage}


def bedrock_create_message(system, messages: List[Dict[str, str]], claude_tools: List[dict], max_tokens: int = 2048):
    """Anthropic messages.create 와 같은 결과 모양(content 블록 목록, usage)을 돌려준다."""
    sys_text = _split_system(system)
    _, turns = _to_converse(messages)
    kwargs = {"modelId": BEDROCK_MODEL, "messages": turns, "inferenceConfig": {"maxTokens": max_tokens}}
    if sys_text:
        kwargs["system"] = [{"text": sys_text}]
    tool_cfg = _tool_config(claude_tools)
    if tool_cfg:
        kwargs["toolConfig"] = tool_cfg
    response = _runtime().converse(**kwargs)
    content = []
    for part in response["output"]["message"]["content"]:
        if "text" in part:
            content.append(SimpleNamespace(type="text", text=part["text"]))
        elif "toolUse" in part:
            tu = part["toolUse"]
            content.append(SimpleNamespace(type="tool_use", id=tu.get("toolUseId", ""), name=tu.get("name", ""), input=tu.get("input") or {}))
    usage = response.get("usage") or {}
    return SimpleNamespace(
        content=content,
        stop_reason=response.get("stopReason"),
        usage=SimpleNamespace(input_tokens=int(usage.get("inputTokens", 0)), output_tokens=int(usage.get("outputTokens", 0)),
                              cache_creation_input_tokens=0, cache_read_input_tokens=0),
    )


class _BedrockMessages:
    def create(self, model=None, max_tokens: int = 2048, system=None, tools=None, messages=None, **_):
        return bedrock_create_message(system, messages or [], tools or [], max_tokens)


class BedrockClient:
    """Anthropic(api_key=...) 자리에 넣는 대체 객체. client.messages.create(...)만 지원한다."""

    def __init__(self):
        self.messages = _BedrockMessages()


def bedrock_vision_text(system: str, user: str, image: bytes, max_tokens: int = 400) -> Tuple[str, int, int]:
    """이미지 한 장과 글을 함께 보내고 답 텍스트와 토큰 사용량을 돌려준다 (브라우저 화면 판단용)."""
    kwargs = {
        "modelId": BEDROCK_MODEL,
        "messages": [{"role": "user", "content": [
            {"image": {"format": "jpeg", "source": {"bytes": image}}},
            {"text": user},
        ]}],
        "inferenceConfig": {"maxTokens": max_tokens},
    }
    if system:
        kwargs["system"] = [{"text": system}]
    response = _runtime().converse(**kwargs)
    text = "".join(p.get("text", "") for p in response["output"]["message"]["content"])
    usage = response.get("usage") or {}
    return text, int(usage.get("inputTokens", 0)), int(usage.get("outputTokens", 0))



def _stream_round(kwargs: dict, on_text) -> Tuple[List[dict], List[dict], str, dict]:
    """Converse 스트림 한 라운드. 글자 조각은 on_text 로 즉시 넘기고, 도구 호출과 종료 이유를 모은다."""
    response = _runtime().converse_stream(**kwargs)
    text_buf: List[str] = []
    tool_acc: Dict[int, dict] = {}
    stop_reason = ""
    usage: dict = {}
    for event in response["stream"]:
        if "contentBlockStart" in event:
            block = event["contentBlockStart"]
            tu = (block.get("start") or {}).get("toolUse")
            if tu:
                tool_acc[block["contentBlockIndex"]] = {"toolUseId": tu.get("toolUseId", ""), "name": tu.get("name", ""), "buf": ""}
        elif "contentBlockDelta" in event:
            delta = (event["contentBlockDelta"].get("delta") or {})
            if delta.get("text"):
                text_buf.append(delta["text"])
                if on_text:
                    on_text(delta["text"])
            elif "toolUse" in delta:
                idx = event["contentBlockDelta"]["contentBlockIndex"]
                tool_acc.setdefault(idx, {"toolUseId": "", "name": "", "buf": ""})["buf"] += delta["toolUse"].get("input", "")
        elif "messageStop" in event:
            stop_reason = event["messageStop"].get("stopReason", "")
        elif "metadata" in event:
            usage.update(event["metadata"].get("usage") or {})
    content: List[dict] = []
    if text_buf:
        content.append({"text": "".join(text_buf)})
    tool_uses: List[dict] = []
    for item in tool_acc.values():
        try:
            args = _json.loads(item["buf"] or "{}")
        except ValueError:
            args = {}
        block = {"toolUseId": item["toolUseId"], "name": item["name"], "input": args}
        tool_uses.append(block)
        content.append({"toolUse": block})
    return content, tool_uses, stop_reason, usage


def bedrock_tool_loop(system_text: str, messages: List[Dict[str, str]], claude_tools: List[dict], executor,
                      max_tokens: int = 2048, max_rounds: int = 4, on_text=None) -> dict:
    """Converse 스트리밍 도구 루프. 글자 조각은 on_text 로 바로 넘어가고, 도구가 나오면 실행해 결과를 다시 넣는다.

    executor(name, input) -> (결과 글, 오류 여부). 마지막 라운드에서는 도구를 빼서 답을 강제로 받는다.
    반환: {'text': 최종 답변(모든 라운드 글 합침), 'usage': {...}}
    """
    _, turns = _to_converse(messages)
    base = {"modelId": BEDROCK_MODEL, "inferenceConfig": {"maxTokens": max_tokens}}
    if system_text:
        base["system"] = [{"text": system_text}]
    tool_cfg = _tool_config(claude_tools)
    usage = {"inputTokens": 0, "outputTokens": 0}
    text_parts: List[str] = []
    for round_no in range(max_rounds):
        kwargs = dict(base)
        if tool_cfg and round_no < max_rounds - 1:
            kwargs["toolConfig"] = tool_cfg
        kwargs["messages"] = turns
        content, tool_uses, stop_reason, u = _stream_round(kwargs, on_text)
        usage["inputTokens"] += int(u.get("inputTokens", 0))
        usage["outputTokens"] += int(u.get("outputTokens", 0))
        text_parts += [b["text"] for b in content if "text" in b]
        turns.append({"role": "assistant", "content": content})
        if stop_reason != "tool_use" or not tool_uses:
            break
        results = []
        for tu in tool_uses:
            text, is_error = executor(tu.get("name", ""), tu.get("input") or {})
            results.append({"toolResult": {
                "toolUseId": tu.get("toolUseId", ""),
                "content": [{"text": (text or "")[:6000]}],
                "status": "error" if is_error else "success",
            }})
        turns.append({"role": "user", "content": results})
    return {"text": "".join(text_parts).strip(), "usage": usage}
