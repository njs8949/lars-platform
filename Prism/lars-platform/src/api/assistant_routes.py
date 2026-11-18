"""AI 어시스턴트 채팅 API (Tool-Calling)"""

import logging
import json
import os
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
import requests
from anthropic import Anthropic

from src.core.db import get_db
from src.core.tool_registry import TOOLS, execute_tool, to_claude_tools, render_tool_result

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/assistant", tags=["assistant"])


class ChatMessage(BaseModel):
    """채팅 메시지"""
    role: str  # user, assistant
    content: str


class AssistantChatRequest(BaseModel):
    """채팅 요청"""
    message: str
    history: Optional[List[ChatMessage]] = []


class ToolCall(BaseModel):
    """도구 호출 결과"""
    tool: str
    parameters: Dict[str, Any]
    result: Dict[str, Any]


class AssistantChatResponse(BaseModel):
    """채팅 응답"""
    reply: str
    tool_calls: Optional[List[ToolCall]] = []
    engine_used: str  # "ollama" or "claude"


@router.post("/chat", response_model=AssistantChatResponse)
async def assistant_chat(
    request: AssistantChatRequest,
    db: Session = Depends(get_db)
):
    """AI 어시스턴트 채팅 (Tool-Calling 지원)"""
    try:
        user_message = request.message.strip()
        if not user_message:
            raise HTTPException(status_code=400, detail="메시지가 비어있습니다")

        # 기존 메시지 히스토리를 Ollama 형식으로 변환
        history = [{"role": m.role, "content": m.content} for m in (request.history or [])]

        # Step 1: Ollama 시도
        try:
            response = await call_ollama_with_tools(user_message, history)
            if response and response.reply:
                return response
        except Exception as ollama_err:
            logger.warning(f"Ollama 호출 실패: {ollama_err}, Claude로 폴백 중...")

        # Step 2: Claude 폴백
        try:
            response = await call_claude_with_tools(user_message, history, db)
            if response and response.reply:
                return response
        except Exception as claude_err:
            logger.error(f"Claude 호출 실패: {claude_err}")
            raise HTTPException(status_code=500, detail="AI 응답 생성 실패")

        raise HTTPException(status_code=500, detail="모든 AI 엔진 실패")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"어시스턴트 채팅 오류: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


async def call_ollama_with_tools(
    user_message: str,
    history: List[Dict[str, str]],
    timeout: int = 60
) -> Optional[AssistantChatResponse]:
    """Ollama를 사용한 Tool-Calling"""
    try:
        ollama_url = "http://localhost:11434/api/chat"
        model = "mistral:7b"

        # 메시지 히스토리 준비
        messages = history.copy()
        messages.append({"role": "user", "content": user_message})

        # Ollama 요청
        payload = {
            "model": model,
            "messages": messages,
            "tools": TOOLS,
            "stream": False,
            "temperature": 0.7,
        }

        logger.info(f"[Ollama] Tool-Calling 요청: {model}")
        resp = requests.post(ollama_url, json=payload, timeout=timeout)
        resp.raise_for_status()
        result = resp.json()

        message = result.get("message", {})
        reply = message.get("content", "").strip()
        tool_calls_raw = message.get("tool_calls", [])

        # 도구 호출 처리
        tool_calls = []
        if tool_calls_raw:
            db = None  # 아래에서 주입
            from src.core.db import SessionLocal
            db = SessionLocal()
            try:
                for tc in tool_calls_raw:
                    # Ollama 응답 형식: tc = {id, function: {index, name, arguments}}
                    func_data = tc.get("function", {})
                    tool_name = func_data.get("name")
                    tool_args = func_data.get("arguments", {})

                    if isinstance(tool_args, str):
                        tool_args = json.loads(tool_args)

                    logger.info(f"[Ollama] 도구 호출: {tool_name} with {tool_args}")

                    exec_result = execute_tool(tool_name, tool_args, db)
                    summary = render_tool_result(tool_name, exec_result)

                    tool_calls.append(ToolCall(
                        tool=tool_name,
                        parameters=tool_args,
                        result=exec_result
                    ))

                    # 도구 호출 결과를 텍스트에 추가
                    if reply:
                        reply += f"\n\n{summary}"
                    else:
                        reply = summary

            finally:
                db.close()

        # 응답이 비어있으면 기본 메시지 제공
        if not reply:
            if tool_calls:
                reply = f"{len(tool_calls)}개의 작업을 완료했습니다."
            else:
                reply = "요청을 처리했습니다."

        logger.info(f"[Ollama] ✅ 응답 생성 완료")
        return AssistantChatResponse(
            reply=reply,
            tool_calls=tool_calls,
            engine_used="ollama"
        )

    except requests.exceptions.ConnectionError:
        logger.warning("[Ollama] 연결 실패")
        return None
    except requests.exceptions.Timeout:
        logger.warning("[Ollama] 타임아웃")
        return None
    except Exception as e:
        logger.warning(f"[Ollama] 오류: {e}")
        return None


async def call_claude_with_tools(
    user_message: str,
    history: List[Dict[str, str]],
    db: Session
) -> Optional[AssistantChatResponse]:
    """Claude를 사용한 Tool-Calling"""
    try:
        api_key = os.getenv("CLAUDE_API_KEY")
        model = os.getenv("CLAUDE_MODEL", "claude-opus-5")

        if not api_key:
            logger.warning("[Claude] API 키 없음")
            return None

        client = Anthropic(api_key=api_key)

        # Claude 도구 스키마로 변환
        claude_tools = to_claude_tools(TOOLS)
        # 도구 정의는 요청마다 동일 → 마지막 도구에 캐시 브레이크포인트
        if claude_tools:
            claude_tools[-1] = {**claude_tools[-1], "cache_control": {"type": "ephemeral"}}

        # 메시지 히스토리 준비
        messages = history.copy()
        messages.append({"role": "user", "content": user_message})

        logger.info(f"[Claude] Tool-Calling 요청: {model}")

        # Claude API 호출
        response = client.messages.create(
            model=model,
            max_tokens=2048,
            tools=claude_tools,
            messages=messages,
        )

        # 응답 처리
        reply = ""
        tool_calls = []

        for block in response.content:
            if block.type == "text":
                reply += block.text

            elif block.type == "tool_use":
                tool_name = block.name
                tool_args = block.input

                logger.info(f"[Claude] 도구 호출: {tool_name} with {tool_args}")

                exec_result = execute_tool(tool_name, tool_args, db)
                summary = render_tool_result(tool_name, exec_result)

                tool_calls.append(ToolCall(
                    tool=tool_name,
                    parameters=tool_args,
                    result=exec_result
                ))

                # 도구 호출 결과를 텍스트에 추가
                if reply:
                    reply += f"\n\n{summary}"
                else:
                    reply = summary

        # 응답이 비어있으면 기본 메시지 제공
        if not reply.strip():
            if tool_calls:
                reply = f"{len(tool_calls)}개의 작업을 완료했습니다."
            else:
                reply = "요청을 처리했습니다."

        logger.info(f"[Claude] ✅ 응답 생성 완료")
        return AssistantChatResponse(
            reply=reply.strip(),
            tool_calls=tool_calls,
            engine_used="claude"
        )

    except Exception as e:
        logger.warning(f"[Claude] 오류: {e}")
        return None
