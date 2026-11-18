"""실시간 업데이트 WebSocket 관리"""

from fastapi import WebSocket
import json
import asyncio
from typing import Set, Dict
import logging

logger = logging.getLogger(__name__)


class ConnectionManager:
    """WebSocket 연결 관리"""

    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, channel: str):
        """클라이언트 연결"""
        await websocket.accept()
        if channel not in self.active_connections:
            self.active_connections[channel] = set()
        self.active_connections[channel].add(websocket)
        logger.info(f"✓ WebSocket 연결: {channel}")

    def disconnect(self, websocket: WebSocket, channel: str):
        """클라이언트 연결 해제"""
        if channel in self.active_connections:
            self.active_connections[channel].discard(websocket)
            if not self.active_connections[channel]:
                del self.active_connections[channel]
        logger.info(f"✗ WebSocket 연결 해제: {channel}")

    async def broadcast(self, channel: str, message: dict):
        """채널에 메시지 전송"""
        if channel not in self.active_connections:
            return

        disconnected = set()
        for connection in self.active_connections[channel]:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"WebSocket 전송 실패: {e}")
                disconnected.add(connection)

        # 연결 끊긴 클라이언트 제거
        for connection in disconnected:
            self.disconnect(connection, channel)

    async def broadcast_all(self, message: dict):
        """모든 채널에 메시지 전송"""
        for channel in self.active_connections:
            await self.broadcast(channel, message)


manager = ConnectionManager()
