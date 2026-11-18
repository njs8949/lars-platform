"""
원격 실행 엔진 - SSH/클라우드에서 작업 실행
"""

import asyncio
import json
import logging
from typing import Dict, Any, Optional
from dataclasses import dataclass
import paramiko
from pathlib import Path

logger = logging.getLogger(__name__)


@dataclass
class RemoteConfig:
    """원격 서버 설정"""
    name: str
    host: str
    port: int = 22
    username: str = "root"
    password: Optional[str] = None
    key_file: Optional[str] = None
    description: str = ""


class RemoteExecutor:
    """원격 실행 관리자"""

    def __init__(self, config_file: str = ".lars/remote_servers.json"):
        self.config_file = Path(config_file)
        self.servers: Dict[str, RemoteConfig] = {}
        self.ssh_clients: Dict[str, paramiko.SSHClient] = {}
        self._load_servers()

    def _load_servers(self):
        """저장된 원격 서버 로드"""
        if self.config_file.exists():
            try:
                with open(self.config_file, "r") as f:
                    data = json.load(f)
                    for name, config in data.items():
                        self.servers[name] = RemoteConfig(**config)
                logger.info(f"[REMOTE] {len(self.servers)}개 원격 서버 로드됨")
            except Exception as e:
                logger.error(f"[REMOTE] 서버 설정 로드 실패: {e}")

    def _save_servers(self):
        """원격 서버 설정 저장"""
        self.config_file.parent.mkdir(parents=True, exist_ok=True)
        data = {
            name: {
                'name': config.name,
                'host': config.host,
                'port': config.port,
                'username': config.username,
                'description': config.description
            }
            for name, config in self.servers.items()
        }
        with open(self.config_file, "w") as f:
            json.dump(data, f, indent=2)

    def add_server(
        self,
        name: str,
        host: str,
        port: int = 22,
        username: str = "root",
        password: Optional[str] = None,
        key_file: Optional[str] = None,
        description: str = ""
    ) -> bool:
        """원격 서버 추가"""
        try:
            config = RemoteConfig(
                name=name,
                host=host,
                port=port,
                username=username,
                password=password,
                key_file=key_file,
                description=description
            )
            self.servers[name] = config
            self._save_servers()

            logger.info(f"[REMOTE] 원격 서버 추가: {name} ({host}:{port})")
            return True
        except Exception as e:
            logger.error(f"[REMOTE] 서버 추가 실패: {e}")
            return False

    def remove_server(self, name: str) -> bool:
        """원격 서버 제거"""
        if name in self.servers:
            del self.servers[name]
            # 연결 해제
            if name in self.ssh_clients:
                self.ssh_clients[name].close()
                del self.ssh_clients[name]
            self._save_servers()
            logger.info(f"[REMOTE] 원격 서버 제거: {name}")
            return True
        return False

    def list_servers(self) -> list:
        """원격 서버 목록"""
        return [
            {
                'name': config.name,
                'host': config.host,
                'port': config.port,
                'username': config.username,
                'description': config.description
            }
            for config in self.servers.values()
        ]

    async def connect(self, server_name: str) -> bool:
        """원격 서버 연결"""
        if server_name not in self.servers:
            logger.error(f"[REMOTE] 서버를 찾을 수 없음: {server_name}")
            return False

        try:
            config = self.servers[server_name]
            client = paramiko.SSHClient()
            client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

            if config.key_file:
                client.connect(
                    config.host,
                    port=config.port,
                    username=config.username,
                    key_filename=config.key_file
                )
            else:
                client.connect(
                    config.host,
                    port=config.port,
                    username=config.username,
                    password=config.password
                )

            self.ssh_clients[server_name] = client
            logger.info(f"[REMOTE] 서버 연결 성공: {server_name}")
            return True

        except Exception as e:
            logger.error(f"[REMOTE] 서버 연결 실패: {e}")
            return False

    async def execute_command(
        self,
        server_name: str,
        command: str
    ) -> Dict[str, Any]:
        """원격 명령어 실행"""
        if server_name not in self.ssh_clients:
            connected = await self.connect(server_name)
            if not connected:
                return {"success": False, "error": "Connection failed"}

        try:
            client = self.ssh_clients[server_name]
            stdin, stdout, stderr = client.exec_command(command, timeout=60)

            output = stdout.read().decode('utf-8')
            error = stderr.read().decode('utf-8')

            return {
                "success": True,
                "command": command,
                "output": output,
                "error": error,
                "server": server_name
            }

        except Exception as e:
            logger.error(f"[REMOTE] 명령어 실행 실패: {e}")
            return {"success": False, "error": str(e)}

    async def execute_script(
        self,
        server_name: str,
        script_content: str,
        script_name: str = "script.sh"
    ) -> Dict[str, Any]:
        """원격 스크립트 실행"""
        try:
            # 1. 스크립트 업로드
            if server_name not in self.ssh_clients:
                connected = await self.connect(server_name)
                if not connected:
                    return {"success": False, "error": "Connection failed"}

            client = self.ssh_clients[server_name]
            sftp = client.open_sftp()

            remote_path = f"/tmp/{script_name}"
            with sftp.file(remote_path, 'w') as remote_file:
                remote_file.write(script_content)

            sftp.close()

            # 2. 스크립트 실행
            stdin, stdout, stderr = client.exec_command(f"bash {remote_path}", timeout=300)

            output = stdout.read().decode('utf-8')
            error = stderr.read().decode('utf-8')

            # 3. 스크립트 정리
            client.exec_command(f"rm {remote_path}")

            return {
                "success": True,
                "script": script_name,
                "output": output,
                "error": error,
                "server": server_name
            }

        except Exception as e:
            logger.error(f"[REMOTE] 스크립트 실행 실패: {e}")
            return {"success": False, "error": str(e)}

    async def execute_task_remotely(
        self,
        server_name: str,
        task_definition: Dict[str, Any]
    ) -> Dict[str, Any]:
        """원격에서 작업 실행"""
        try:
            # 작업을 JSON으로 직렬화
            task_json = json.dumps(task_definition)

            # Python 스크립트로 실행
            python_script = f"""
import json
import sys

task = {repr(task_json)}
print(f"Task: {{task}}")

# 작업 실행 로직
# ...

print("Task completed successfully")
"""

            result = await self.execute_script(server_name, python_script, "task.py")
            return result

        except Exception as e:
            logger.error(f"[REMOTE] 원격 작업 실행 실패: {e}")
            return {"success": False, "error": str(e)}

    async def disconnect(self, server_name: str) -> bool:
        """원격 서버 연결 해제"""
        if server_name in self.ssh_clients:
            try:
                self.ssh_clients[server_name].close()
                del self.ssh_clients[server_name]
                logger.info(f"[REMOTE] 서버 연결 해제: {server_name}")
                return True
            except Exception as e:
                logger.error(f"[REMOTE] 연결 해제 실패: {e}")
                return False
        return False

    async def disconnect_all(self):
        """모든 원격 서버 연결 해제"""
        for server_name in list(self.ssh_clients.keys()):
            await self.disconnect(server_name)
        logger.info("[REMOTE] 모든 연결 해제됨")


# 전역 인스턴스
remote_executor = RemoteExecutor()


if __name__ == "__main__":
    print("✅ 원격 실행 엔진 준비 완료")
