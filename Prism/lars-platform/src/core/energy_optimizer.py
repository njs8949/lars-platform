"""
LARS Energy Optimizer - 에너지 효율 최적화 시스템
전기료를 절감하면서 최적의 결과물을 얻는 스마트 모델 선택 시스템
"""

import logging
from typing import Dict, Any, Optional, List
from enum import Enum

logger = logging.getLogger(__name__)


class ModelSpecification(Enum):
    """로컬 모델의 리소스 사양"""
    # (모델명, GPU메모리(GB), 처리속도(상대값), 품질점수(0-100))
    LARS_NATIVE = {"vram": 2, "speed": 10, "quality": 75, "power": 30}      # 가장 효율적
    LARS_PRISM = {"vram": 4, "speed": 7, "quality": 85, "power": 50}        # 균형
    LARS_PRIME = {"vram": 8, "speed": 5, "quality": 95, "power": 100}       # 최고 성능
    LARS_COSMOS = {"vram": 6, "speed": 6, "quality": 90, "power": 80}       # 다목적
    MISTRAL = {"vram": 3, "speed": 9, "quality": 82, "power": 40}           # 가성비 최고
    LLAMA2 = {"vram": 4, "speed": 8, "quality": 80, "power": 50}            # 안정적
    NEURAL_CHAT = {"vram": 3, "speed": 9, "quality": 78, "power": 40}       # 대화 최적화
    DOLPHIN = {"vram": 5, "speed": 7, "quality": 87, "power": 65}           # 추론 특화


class RequestComplexity(Enum):
    """요청의 복잡도 레벨"""
    SIMPLE = 1        # 간단한 질문/작업
    MODERATE = 2      # 중간 수준의 분석
    COMPLEX = 3       # 복잡한 문제 해결
    VERY_COMPLEX = 4  # 매우 복잡한 다단계 작업


class EnergyOptimizer:
    """
    에너지 효율 최적화 시스템

    전략:
    1. 요청 복잡도 자동 판단
    2. 복잡도에 맞는 최소 리소스 모델 선택
    3. 결과 품질 검증
    4. 캐싱 및 재사용
    5. 배치 처리
    """

    # 복잡도별 최적 모델 매핑 (전기료 효율 우선)
    COMPLEXITY_MODEL_MAPPING = {
        RequestComplexity.SIMPLE: {
            "primary": "lars-native:latest",
            "power_usage": 30,
            "reason": "간단한 작업에 최소 리소스 모델 사용"
        },
        RequestComplexity.MODERATE: {
            "primary": "mistral:7b",
            "power_usage": 40,
            "reason": "중간 수준의 작업에 효율적 모델 사용"
        },
        RequestComplexity.COMPLEX: {
            "primary": "lars-prism-tuned:latest",
            "power_usage": 50,
            "reason": "복잡한 작업에 균형잡힌 모델 사용"
        },
        RequestComplexity.VERY_COMPLEX: {
            "primary": "lars-prime:latest",
            "power_usage": 100,
            "reason": "매우 복잡한 작업에만 최고 성능 모델 사용"
        }
    }

    # 단계별 복잡도 기본값
    STAGE_COMPLEXITY_BASELINE = {
        "analysis": RequestComplexity.COMPLEX,
        "planning": RequestComplexity.MODERATE,
        "execution": RequestComplexity.SIMPLE,
        "integration": RequestComplexity.MODERATE
    }

    def __init__(self):
        """에너지 최적화 시스템 초기화"""
        logger.info("[ENERGY-OPTIMIZER] 에너지 효율 최적화 시스템 초기화")
        self.request_cache = {}
        self.total_power_used = 0
        self.optimization_stats = {
            "requests_processed": 0,
            "cache_hits": 0,
            "power_saved": 0,
            "average_power_per_request": 0
        }

    def analyze_request_complexity(self, request_text: str) -> RequestComplexity:
        """
        요청의 복잡도 자동 판단

        기준:
        - 문장 길이
        - 키워드 (분석, 개선, 최적화 등)
        - 요구하는 작업 단계 수
        """
        text_length = len(request_text)
        keyword_count = sum([
            request_text.count(w) for w in
            ["분석", "비교", "최적화", "개선", "개발", "설계", "구현", "통합"]
        ])

        # 복잡도 점수 계산
        complexity_score = (text_length / 10) + (keyword_count * 5)

        if complexity_score < 50:
            return RequestComplexity.SIMPLE
        elif complexity_score < 100:
            return RequestComplexity.MODERATE
        elif complexity_score < 150:
            return RequestComplexity.COMPLEX
        else:
            return RequestComplexity.VERY_COMPLEX

    def analyze_stage_complexity(self, stage: str, context: str) -> RequestComplexity:
        """
        단계별 복잡도 판단
        기본값에서 컨텍스트에 따라 조정
        """
        baseline = self.STAGE_COMPLEXITY_BASELINE.get(
            stage, RequestComplexity.MODERATE
        )

        # 컨텍스트 길이가 길면 복잡도 상향
        if len(context) > 1000:
            if baseline.value < 4:
                return RequestComplexity(baseline.value + 1)

        return baseline

    def get_optimal_model_for_complexity(
        self,
        complexity: RequestComplexity,
        enable_cache: bool = True
    ) -> Dict[str, Any]:
        """복잡도에 맞는 최적 모델 선택"""
        model_info = self.COMPLEXITY_MODEL_MAPPING[complexity]

        logger.info(f"[ENERGY-OPTIMIZER] 요청 복잡도: {complexity.name}")
        logger.info(f"[ENERGY-OPTIMIZER] 선택 모델: {model_info['primary']}")
        logger.info(f"[ENERGY-OPTIMIZER] 예상 전력: {model_info['power_usage']}W")
        logger.info(f"[ENERGY-OPTIMIZER] 사유: {model_info['reason']}")

        return {
            "model": model_info["primary"],
            "complexity": complexity.name,
            "power_estimate": model_info["power_usage"],
            "reason": model_info["reason"],
            "cache_enabled": enable_cache
        }

    def estimate_workflow_power(self, stages: List[str]) -> Dict[str, Any]:
        """워크플로우 전체 전력 소비 예측"""
        total_power = 0
        stage_breakdown = {}

        for stage in stages:
            baseline_complexity = self.STAGE_COMPLEXITY_BASELINE.get(
                stage, RequestComplexity.MODERATE
            )
            power = self.COMPLEXITY_MODEL_MAPPING[baseline_complexity]["power_usage"]
            stage_breakdown[stage] = power
            total_power += power

        return {
            "total_estimated_power": total_power,
            "stage_breakdown": stage_breakdown,
            "estimated_duration": total_power // 30,  # 대략적 추정
            "cost_estimate": f"약 {total_power * 0.0001:.2f}원"  # 대략적 계산
        }

    def get_energy_optimization_tips(self) -> List[str]:
        """에너지 절감 팁"""
        return [
            "✅ 간단한 작업은 LARS-Native 사용 (30% 전력)",
            "✅ 중간 작업은 Mistral 7B 사용 (40% 전력)",
            "✅ 복잡한 작업만 LARS-Prime 사용 (100% 전력)",
            "✅ 유사 요청은 캐시 사용 (0% 전력)",
            "✅ 배치 처리로 GPU 활용률 증대",
            "✅ 야간(전기료 싼 시간)에 대량 작업 실행",
            "✅ 양자화 모델 사용으로 메모리 50% 감소",
            "✅ 멀티 모델 앙상블로 작은 모델들 조합",
            "✅ 주기적 모델 최적화로 불필요한 계산 제거",
            "✅ GPU 공유로 여러 작업 동시 처리"
        ]

    def generate_energy_report(self) -> Dict[str, Any]:
        """에너지 사용 보고서"""
        avg_power = (
            self.optimization_stats["average_power_per_request"]
            if self.optimization_stats["requests_processed"] > 0
            else 0
        )

        return {
            "total_requests": self.optimization_stats["requests_processed"],
            "cache_hit_rate": f"{(self.optimization_stats['cache_hits'] / max(1, self.optimization_stats['requests_processed'])) * 100:.1f}%",
            "total_power_used": f"{self.total_power_used}W",
            "power_saved_by_optimization": f"{self.optimization_stats['power_saved']}W",
            "average_power_per_request": f"{avg_power:.1f}W",
            "estimated_monthly_cost": f"약 {(self.total_power_used * 24 * 30 * 0.0001):.2f}원",
            "efficiency_score": self._calculate_efficiency_score()
        }

    def _calculate_efficiency_score(self) -> str:
        """효율성 점수 계산"""
        if self.optimization_stats["requests_processed"] == 0:
            return "N/A"

        cache_efficiency = (
            self.optimization_stats["cache_hits"] /
            self.optimization_stats["requests_processed"] * 100
        )

        if cache_efficiency > 30:
            return f"⭐⭐⭐ 우수 ({cache_efficiency:.1f}% 캐시 히트율)"
        elif cache_efficiency > 15:
            return f"⭐⭐ 좋음 ({cache_efficiency:.1f}% 캐시 히트율)"
        else:
            return f"⭐ 보통 ({cache_efficiency:.1f}% 캐시 히트율)"


# 전역 에너지 최적화 인스턴스
energy_optimizer = EnergyOptimizer()
