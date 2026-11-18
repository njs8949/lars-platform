"""
Datadog SLO (Service Level Objectives) 관리 API
FastAPI 라우터
"""

from fastapi import APIRouter, HTTPException
from datetime import datetime
from typing import List, Dict, Any, Optional
import requests
import os

router = APIRouter(prefix='/api/slo', tags=['SLO'])

# Datadog API 설정
DATADOG_API_KEY = os.getenv('DATADOG_API_KEY')
DATADOG_APP_KEY = os.getenv('DATADOG_APP_KEY')
DATADOG_SITE = os.getenv('DATADOG_SITE', 'datadoghq.com')

SLO_API_URL = f'https://api.{DATADOG_SITE}/api/v1/slo'
HEADERS = {
    'DD-API-KEY': DATADOG_API_KEY,
    'DD-APPLICATION-KEY': DATADOG_APP_KEY,
    'Content-Type': 'application/json',
}


@router.get('/list')
async def list_slos():
    """모든 SLO 조회"""
    try:
        response = requests.get(SLO_API_URL, headers=HEADERS)
        response.raise_for_status()
        slos = response.json()

        return {
            'status': 'success',
            'message': f'{len(slos.get("data", []))}개의 SLO 조회됨',
            'data': slos.get('data', []),
            'timestamp': datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'SLO 조회 실패: {str(e)}')


@router.post('/create')
async def create_slo(slo_data: Dict[str, Any]):
    """새로운 SLO 생성"""
    try:
        # 필수 필드 검증
        required_fields = ['name', 'type', 'thresholds']
        if not all(field in slo_data for field in required_fields):
            raise HTTPException(status_code=400, detail=f'필수 필드 누락: {required_fields}')

        response = requests.post(SLO_API_URL, json=slo_data, headers=HEADERS)
        response.raise_for_status()
        result = response.json()

        return {
            'status': 'success',
            'message': f'SLO 생성 완료: {slo_data["name"]}',
            'data': result.get('data'),
            'slo_id': result.get('data', {}).get('id'),
            'timestamp': datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'SLO 생성 실패: {str(e)}')


@router.post('/create-batch')
async def create_batch_slos(request_data: Dict[str, List[Dict[str, Any]]]):
    """여러 SLO 일괄 생성"""
    try:
        slos_data = request_data.get('slos', [])

        if not slos_data:
            raise HTTPException(status_code=400, detail='SLO 데이터 누락')

        created = []
        failed = []

        for slo in slos_data:
            try:
                response = requests.post(SLO_API_URL, json=slo, headers=HEADERS)
                response.raise_for_status()
                result = response.json()

                created.append({
                    'name': slo['name'],
                    'slo_id': result.get('data', {}).get('id'),
                    'status': 'success'
                })
            except Exception as e:
                failed.append({
                    'name': slo['name'],
                    'error': str(e),
                    'status': 'failed'
                })

        return {
            'status': 'partial_success' if failed else 'success',
            'message': f'{len(created)}개 SLO 생성 완료, {len(failed)}개 실패',
            'created': created,
            'failed': failed,
            'summary': {
                'total': len(slos_data),
                'created': len(created),
                'failed': len(failed)
            },
            'timestamp': datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'일괄 생성 실패: {str(e)}')


@router.get('/{slo_id}')
async def get_slo(slo_id: str):
    """특정 SLO 조회"""
    try:
        response = requests.get(f'{SLO_API_URL}/{slo_id}', headers=HEADERS)
        response.raise_for_status()
        result = response.json()

        return {
            'status': 'success',
            'data': result.get('data'),
            'timestamp': datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'SLO 조회 실패: {str(e)}')


@router.put('/{slo_id}')
async def update_slo(slo_id: str, slo_data: Dict[str, Any]):
    """SLO 업데이트"""
    try:
        response = requests.put(f'{SLO_API_URL}/{slo_id}', json=slo_data, headers=HEADERS)
        response.raise_for_status()
        result = response.json()

        return {
            'status': 'success',
            'message': 'SLO 업데이트 완료',
            'data': result.get('data'),
            'timestamp': datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'SLO 업데이트 실패: {str(e)}')


@router.delete('/{slo_id}')
async def delete_slo(slo_id: str):
    """SLO 삭제"""
    try:
        response = requests.delete(f'{SLO_API_URL}/{slo_id}', headers=HEADERS)
        response.raise_for_status()

        return {
            'status': 'success',
            'message': f'SLO 삭제 완료: {slo_id}',
            'timestamp': datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'SLO 삭제 실패: {str(e)}')


@router.post('/setup/lars-platform')
async def setup_lars_platform_slos():
    """LARS Platform 기본 SLO 자동 생성"""
    slos = [
        {
            'name': 'LARS API Availability SLO',
            'description': 'LARS Platform API 전체 가용성 목표 (99.9%)',
            'type': 'monitor',
            'monitor_ids': [],
            'thresholds': [
                {
                    'timeframe': '30d',
                    'target': 99.9,
                    'target_display': '99.9%',
                    'warning': 99.95
                }
            ],
            'tags': ['service:lars', 'team:platform', 'priority:high']
        },
        {
            'name': 'LARS Error Rate SLO',
            'description': 'LARS Platform 에러율 목표 (< 1%)',
            'type': 'metric',
            'query': {
                'numerator': 'sum:trace.web.request{service:lars-agent,status:ok}',
                'denominator': 'sum:trace.web.request{service:lars-agent}'
            },
            'thresholds': [
                {
                    'timeframe': '30d',
                    'target': 99.0,
                    'target_display': '99%',
                    'warning': 99.5
                }
            ],
            'tags': ['service:lars', 'team:platform', 'metric:errors']
        },
        {
            'name': 'LARS Latency SLO (P95)',
            'description': 'LARS Platform P95 지연시간 목표 (< 200ms)',
            'type': 'metric',
            'query': {
                'numerator': 'sum:trace.web.request.duration{service:lars-agent,_avg_duration:<200}',
                'denominator': 'sum:trace.web.request.duration{service:lars-agent}'
            },
            'thresholds': [
                {
                    'timeframe': '30d',
                    'target': 95.0,
                    'target_display': '95%',
                    'warning': 97.0
                }
            ],
            'tags': ['service:lars', 'team:platform', 'metric:latency']
        },
        {
            'name': 'LARS Security Detection MTTD SLO',
            'description': 'Mean Time to Detection (MTTD) < 5분 목표',
            'type': 'metric',
            'query': {
                'numerator': 'sum:datadog.security.event{service:lars-agent,detection_time:<300}',
                'denominator': 'sum:datadog.security.event{service:lars-agent}'
            },
            'thresholds': [
                {
                    'timeframe': '30d',
                    'target': 99.0,
                    'target_display': '99%',
                    'warning': 99.5
                }
            ],
            'tags': ['service:lars', 'team:security', 'metric:mttd']
        },
        {
            'name': 'LARS Security Resolution MTTR SLO',
            'description': 'Mean Time to Resolution (MTTR) < 30분 목표',
            'type': 'metric',
            'query': {
                'numerator': 'sum:incident.time_to_resolution{service:lars-agent,resolution_time:<1800}',
                'denominator': 'sum:incident.time_to_resolution{service:lars-agent}'
            },
            'thresholds': [
                {
                    'timeframe': '30d',
                    'target': 98.0,
                    'target_display': '98%',
                    'warning': 99.0
                }
            ],
            'tags': ['service:lars', 'team:security', 'metric:mttr']
        },
        {
            'name': 'LARS Prism Backend Availability SLO',
            'description': 'LARS Prism 백엔드 가용성 목표 (99.5%)',
            'type': 'metric',
            'query': {
                'numerator': 'sum:trace.web.request{service:lars-prism-backend,status:ok}',
                'denominator': 'sum:trace.web.request{service:lars-prism-backend}'
            },
            'thresholds': [
                {
                    'timeframe': '30d',
                    'target': 99.5,
                    'target_display': '99.5%',
                    'warning': 99.7
                }
            ],
            'tags': ['service:lars-prism', 'team:platform', 'priority:high']
        }
    ]

    try:
        created = []
        failed = []

        for slo in slos:
            try:
                response = requests.post(SLO_API_URL, json=slo, headers=HEADERS)
                response.raise_for_status()
                result = response.json()

                created.append({
                    'name': slo['name'],
                    'slo_id': result.get('data', {}).get('id'),
                    'target': slo['thresholds'][0]['target_display'],
                    'status': 'success'
                })
            except Exception as e:
                failed.append({
                    'name': slo['name'],
                    'error': str(e),
                    'status': 'failed'
                })

        return {
            'status': 'success' if not failed else 'partial_success',
            'message': f'LARS Platform SLO 설정 완료: {len(created)}개 생성, {len(failed)}개 실패',
            'created': created,
            'failed': failed,
            'summary': {
                'total': len(slos),
                'created': len(created),
                'failed': len(failed)
            },
            'timestamp': datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'SLO 설정 실패: {str(e)}')
