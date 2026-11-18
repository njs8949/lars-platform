# app/utils/glue_logger.py - LARS Prism Auto Glue Logger
import boto3
import json
import logging
from datetime import datetime
from functools import wraps
import os

class GlueLogger:
    def __init__(self):
        self.s3_client = boto3.client(
            's3',
            region_name=os.getenv('AWS_REGION', 'ap-northeast-2')
        )
        self.bucket = os.getenv('GLUE_BUCKET', 'lars-glue-data-1791451635')
        self.logs = []

    def log(self, level: str, message: str, function: str, line_number: int, execution_time_ms: float):
        log_entry = {
            'timestamp': int(datetime.now().timestamp() * 1000),
            'level': level,
            'logger': 'lars-prism-auto',
            'message': message,
            'function': function,
            'line_number': line_number,
            'execution_time_ms': execution_time_ms
        }
        self.logs.append(log_entry)
        
        if len(self.logs) >= 100:
            self.flush()

    def flush(self):
        if not self.logs:
            return

        now = datetime.now()
        date = now.strftime('%Y-%m-%d')
        key = f'logs/lars-prism-auto/date={date}/logs-{int(now.timestamp()*1000)}.jsonl'
        body = '\n'.join(json.dumps(log) for log in self.logs)

        try:
            self.s3_client.put_object(
                Bucket=self.bucket,
                Key=key,
                Body=body,
                ContentType='application/x-ndjson'
            )
            print(f'[Glue] ✅ {len(self.logs)}개 로그 업로드')
            self.logs = []
        except Exception as e:
            print(f'[Glue] ❌ 업로드 실패: {e}')

    def track_execution(self, func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            import time
            start = time.time()
            result = func(*args, **kwargs)
            duration = (time.time() - start) * 1000
            self.log(
                'INFO',
                f'Function {func.__name__} executed',
                func.__name__,
                func.__code__.co_firstlineno,
                duration
            )
            return result
        return wrapper

glue_logger = GlueLogger()
