"""
실시간 데이터 스트리밍 시스템 - WebSocket 기반
모든 데이터 엔진에서 실시간 업데이트 제공
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List, Set
import json
import asyncio
import logging
from datetime import datetime

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/streaming", tags=["streaming"])


class RealtimeStreamingManager:
    """WebSocket 기반 실시간 스트리밍 관리"""

    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {
            "scraping": set(),
            "ocr": set(),
            "change_detection": set(),
            "seo": set(),
            "crm": set(),
            "ppt": set(),
            "workflows": set(),
            "integration": set(),
            "global": set()
        }
        self.data_buffer: Dict[str, List[Dict]] = {
            channel: [] for channel in self.active_connections
        }

    async def connect(self, websocket: WebSocket, channel: str):
        """WebSocket 연결"""
        await websocket.accept()
        if channel in self.active_connections:
            self.active_connections[channel].add(websocket)
            logger.info(f"[Streaming] 클라이언트 연결: {channel} (총 {len(self.active_connections[channel])}개)")

    async def disconnect(self, websocket: WebSocket, channel: str):
        """WebSocket 연결 해제"""
        if channel in self.active_connections:
            self.active_connections[channel].discard(websocket)
            logger.info(f"[Streaming] 클라이언트 연결 해제: {channel} (남은 {len(self.active_connections[channel])}개)")

    async def broadcast(self, channel: str, message: Dict):
        """채널에 메시지 브로드캐스트"""
        message_with_timestamp = {
            **message,
            "timestamp": datetime.now().isoformat(),
            "channel": channel
        }

        # 버퍼에 저장 (최근 100개만 유지)
        self.data_buffer[channel].append(message_with_timestamp)
        if len(self.data_buffer[channel]) > 100:
            self.data_buffer[channel].pop(0)

        # 모든 연결에 전송
        disconnected = []
        for websocket in self.active_connections[channel]:
            try:
                await websocket.send_json(message_with_timestamp)
            except Exception as e:
                disconnected.append(websocket)
                logger.error(f"[Streaming] 브로드캐스트 실패: {e}")

        # 연결이 끊긴 클라이언트 제거
        for ws in disconnected:
            await self.disconnect(ws, channel)

    async def send_to_global(self, message: Dict):
        """전역 채널에 메시지 전송"""
        await self.broadcast("global", message)

    async def get_buffer(self, channel: str, limit: int = 50) -> List[Dict]:
        """채널의 버퍼된 메시지 조회"""
        return self.data_buffer[channel][-limit:]

    def get_stats(self) -> Dict:
        """스트리밍 통계"""
        return {
            "active_channels": len([ch for ch in self.active_connections if self.active_connections[ch]]),
            "total_connections": sum(len(conns) for conns in self.active_connections.values()),
            "connections_by_channel": {
                channel: len(conns)
                for channel, conns in self.active_connections.items()
            },
            "buffered_messages": {
                channel: len(messages)
                for channel, messages in self.data_buffer.items()
            }
        }


# 글로벌 스트리밍 매니저
streaming_manager = RealtimeStreamingManager()


# ==================== WebSocket 엔드포인트 ====================

@router.websocket("/ws/{channel}")
async def websocket_endpoint(websocket: WebSocket, channel: str):
    """채널별 WebSocket 엔드포인트"""
    if channel not in streaming_manager.active_connections:
        await websocket.close(code=1008)
        return

    await streaming_manager.connect(websocket, channel)
    try:
        while True:
            # 클라이언트로부터 메시지 수신 (ping/heartbeat 확인용)
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        await streaming_manager.disconnect(websocket, channel)
    except Exception as e:
        logger.error(f"[Streaming] WebSocket 오류: {e}")
        await streaming_manager.disconnect(websocket, channel)


# ==================== REST API 엔드포인트 ====================

@router.post("/send/{channel}")
async def send_realtime_data(channel: str, data: Dict):
    """실시간 데이터 전송"""
    if channel not in streaming_manager.active_connections:
        return {"success": False, "error": f"Channel '{channel}' not found"}

    await streaming_manager.broadcast(channel, data)
    return {
        "success": True,
        "channel": channel,
        "message": data,
        "connected_clients": len(streaming_manager.active_connections[channel])
    }


@router.get("/stats")
async def get_streaming_stats():
    """스트리밍 통계"""
    return {
        "success": True,
        "statistics": streaming_manager.get_stats()
    }


@router.get("/buffer/{channel}")
async def get_channel_buffer(channel: str, limit: int = 50):
    """채널 버퍼 조회"""
    if channel not in streaming_manager.active_connections:
        return {"success": False, "error": f"Channel '{channel}' not found"}

    buffer = await streaming_manager.get_buffer(channel, limit)
    return {
        "success": True,
        "channel": channel,
        "messages": buffer,
        "total": len(buffer)
    }


# ==================== 통합 데이터 스트리밍 ====================

async def stream_scraping_progress(url: str, selector: str, status: str, data: dict = None):
    """웹 스크래핑 진행 상황 스트리밍"""
    await streaming_manager.broadcast("scraping", {
        "event": "progress",
        "url": url,
        "selector": selector,
        "status": status,
        "data": data,
        "timestamp": datetime.now().isoformat()
    })


async def stream_ocr_progress(document_id: str, status: str, result: dict = None):
    """OCR 처리 진행 상황 스트리밍"""
    await streaming_manager.broadcast("ocr", {
        "event": "progress",
        "document_id": document_id,
        "status": status,
        "result": result,
        "timestamp": datetime.now().isoformat()
    })


async def stream_workflow_execution(workflow_id: str, stage: str, status: str, result: dict = None):
    """워크플로우 실행 진행 상황 스트리밍"""
    await streaming_manager.broadcast("workflows", {
        "event": "execution",
        "workflow_id": workflow_id,
        "stage": stage,
        "status": status,
        "result": result,
        "timestamp": datetime.now().isoformat()
    })


async def stream_change_detection_alert(url: str, change_type: str, details: dict):
    """변경 감지 알림 스트리밍"""
    await streaming_manager.broadcast("change_detection", {
        "event": "alert",
        "url": url,
        "change_type": change_type,
        "details": details,
        "timestamp": datetime.now().isoformat()
    })


async def stream_ppt_generation(ppt_id: str, status: str, progress: int = 0):
    """PPT 생성 진행 상황 스트리밍"""
    await streaming_manager.broadcast("ppt", {
        "event": "generation",
        "ppt_id": ppt_id,
        "status": status,
        "progress": progress,
        "timestamp": datetime.now().isoformat()
    })
