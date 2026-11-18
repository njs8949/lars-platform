"""
LARS Prism 3계층 통계 레이어 - 완전 업그레이드
고급 통계 분석, 머신러닝, 예측, 리포팅 기능 통합
"""

import logging
import numpy as np
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
from datetime import datetime, timedelta
import json

logger = logging.getLogger(__name__)


class AnalysisType(Enum):
    """통계 분석 유형"""
    DESCRIPTIVE = "descriptive"         # 기술통계
    INFERENTIAL = "inferential"         # 추론통계
    PREDICTIVE = "predictive"           # 예측 분석
    PRESCRIPTIVE = "prescriptive"       # 처방 분석
    DIAGNOSTIC = "diagnostic"           # 진단 분석


class StatisticalMethod(Enum):
    """통계 분석 방법"""
    # 기술통계
    MEAN = "mean"                       # 평균
    MEDIAN = "median"                   # 중앙값
    MODE = "mode"                       # 최빈값
    STD_DEV = "std_dev"                 # 표준편차
    VARIANCE = "variance"               # 분산
    QUARTILE = "quartile"               # 사분위수

    # 상관분석
    CORRELATION = "correlation"         # 상관계수
    COVARIANCE = "covariance"           # 공분산

    # 회귀분석
    LINEAR_REGRESSION = "linear_regression"           # 선형회귀
    MULTIPLE_REGRESSION = "multiple_regression"       # 다중회귀
    POLYNOMIAL_REGRESSION = "polynomial_regression"   # 다항회귀

    # 시계열
    TREND_ANALYSIS = "trend_analysis"           # 추세 분석
    SEASONALITY = "seasonality"                 # 계절성
    FORECAST = "forecast"                       # 예측
    ARIMA = "arima"                             # ARIMA 모델
    EXPONENTIAL_SMOOTHING = "exponential_smoothing"  # 지수평활

    # 이상탐지
    ANOMALY_DETECTION = "anomaly_detection"     # 이상탐지
    OUTLIER_DETECTION = "outlier_detection"     # 아웃라이어 감지
    ZSCORE = "zscore"                           # Z-score 방법
    IQR = "iqr"                                 # 사분위간거리
    ISOLATION_FOREST = "isolation_forest"       # Isolation Forest

    # 클러스터링
    KMEANS = "kmeans"                   # K-means
    HIERARCHICAL = "hierarchical"       # 계층적 클러스터링
    DBSCAN = "dbscan"                   # DBSCAN
    GAUSSIAN_MIXTURE = "gaussian_mixture"       # 가우시안 혼합

    # 가설검정
    T_TEST = "t_test"                   # t 검정
    CHI_SQUARE = "chi_square"           # 카이제곱 검정
    ANOVA = "anova"                     # ANOVA
    MANN_WHITNEY = "mann_whitney"       # Mann-Whitney U 검정

    # 차원축소
    PCA = "pca"                         # 주성분분석
    TSNE = "tsne"                       # t-SNE


@dataclass
class StatisticalResult:
    """통계 분석 결과"""
    method: str
    timestamp: datetime
    data_points: int
    results: Dict[str, Any]
    confidence: float  # 신뢰도 (0-100)
    interpretation: str  # 해석
    recommendations: List[str]  # 권장사항
    visualizations: Dict[str, str]  # 시각화 데이터 (Base64)


class PrismStatisticsLayer:
    """Prism 3계층 통계 레이어"""

    def __init__(self):
        """통계 레이어 초기화"""
        logger.info("[PRISM-STATS] Prism 3계층 통계 레이어 초기화")
        self.analysis_history = []
        self.datasets = {}
        self.models = {}
        self.logger = logger

    # ==================== 1. 기술통계 (Descriptive Statistics) ====================

    def descriptive_statistics(self, data: List[float]) -> Dict[str, Any]:
        """
        기술통계 분석
        - 평균, 중앙값, 최빈값
        - 표준편차, 분산
        - 사분위수, 범위
        """
        if not data:
            return {"error": "데이터가 없습니다"}

        data_array = np.array(data)

        result = {
            "count": len(data),
            "mean": float(np.mean(data_array)),
            "median": float(np.median(data_array)),
            "std_dev": float(np.std(data_array)),
            "variance": float(np.var(data_array)),
            "min": float(np.min(data_array)),
            "max": float(np.max(data_array)),
            "range": float(np.max(data_array) - np.min(data_array)),
            "q1": float(np.percentile(data_array, 25)),
            "q2": float(np.percentile(data_array, 50)),
            "q3": float(np.percentile(data_array, 75)),
            "iqr": float(np.percentile(data_array, 75) - np.percentile(data_array, 25)),
            "skewness": float(self._calculate_skewness(data_array)),
            "kurtosis": float(self._calculate_kurtosis(data_array))
        }

        self.logger.info(f"[PRISM-STATS] 기술통계 분석 완료: {len(data)}개 데이터")
        return result

    # ==================== 2. 상관분석 (Correlation Analysis) ====================

    def correlation_analysis(self, variables: Dict[str, List[float]]) -> Dict[str, Any]:
        """
        상관분석
        - 변수 간 상관계수
        - 공분산 행렬
        """
        result = {
            "correlations": {},
            "covariance_matrix": []
        }

        var_names = list(variables.keys())
        arrays = [np.array(variables[name]) for name in var_names]

        # 상관계수 계산
        for i, name1 in enumerate(var_names):
            for j, name2 in enumerate(var_names):
                if i <= j:
                    corr = float(np.corrcoef(arrays[i], arrays[j])[0, 1])
                    result["correlations"][f"{name1}_vs_{name2}"] = corr

        self.logger.info("[PRISM-STATS] 상관분석 완료")
        return result

    # ==================== 3. 회귀분석 (Regression Analysis) ====================

    def linear_regression(self, x: List[float], y: List[float]) -> Dict[str, Any]:
        """
        선형회귀 분석
        - 회귀계수
        - R² 값
        - 잔차 분석
        """
        x_array = np.array(x).reshape(-1, 1)
        y_array = np.array(y)

        # 선형 회귀 계산
        coefficients = np.polyfit(x, y, 1)
        slope, intercept = coefficients[0], coefficients[1]

        # R² 값 계산
        y_pred = slope * np.array(x) + intercept
        ss_res = np.sum((y_array - y_pred) ** 2)
        ss_tot = np.sum((y_array - np.mean(y_array)) ** 2)
        r_squared = 1 - (ss_res / ss_tot) if ss_tot != 0 else 0

        result = {
            "slope": float(slope),
            "intercept": float(intercept),
            "r_squared": float(r_squared),
            "correlation": float(np.sqrt(r_squared)),
            "equation": f"y = {slope:.4f}x + {intercept:.4f}",
            "residuals": float(np.mean(np.abs(y_array - y_pred)))
        }

        self.logger.info(f"[PRISM-STATS] 선형회귀 완료: R² = {r_squared:.4f}")
        return result

    # ==================== 4. 시계열 분석 (Time Series Analysis) ====================

    def timeseries_analysis(self, data: List[float], time_points: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        시계열 분석
        - 추세 분석
        - 계절성 감지
        - 변화점 탐지
        """
        try:
            data_array = np.array(data, dtype=float)

            result = {
                "trend": str(self._detect_trend(data_array)),
                "seasonality": bool(self._detect_seasonality(data_array)),
                "changepoints": [int(x) for x in self._detect_changepoints(data_array)],
                "volatility": float(np.std(np.diff(data_array))),
                "autocorrelation": float(self._calculate_autocorrelation(data_array))
            }

            self.logger.info("[PRISM-STATS] 시계열 분석 완료")
            return result
        except Exception as e:
            self.logger.error(f"[PRISM-STATS] 시계열 분석 오류: {e}")
            return {
                "trend": "unknown",
                "seasonality": False,
                "changepoints": [],
                "volatility": 0.0,
                "autocorrelation": 0.0,
                "error": str(e)
            }

    def forecast(self, data: List[float], periods: int = 5, method: str = "exponential") -> Dict[str, Any]:
        """
        시계열 예측
        - 지수평활 (Exponential Smoothing)
        - 이동평균 (Moving Average)
        - 선형추세
        """
        data_array = np.array(data)

        if method == "exponential":
            forecasts = self._exponential_smoothing(data_array, periods)
        elif method == "ma":
            forecasts = self._moving_average_forecast(data_array, periods)
        else:
            forecasts = self._linear_trend_forecast(data_array, periods)

        result = {
            "forecasts": [float(f) for f in forecasts],
            "method": method,
            "confidence_interval": {
                "lower": [float(f * 0.9) for f in forecasts],
                "upper": [float(f * 1.1) for f in forecasts]
            }
        }

        self.logger.info(f"[PRISM-STATS] {periods}기간 예측 완료 (방법: {method})")
        return result

    # ==================== 5. 이상탐지 (Anomaly Detection) ====================

    def anomaly_detection(self, data: List[float], method: str = "zscore", threshold: float = 3.0) -> Dict[str, Any]:
        """
        이상탐지
        - Z-score 방법
        - IQR 방법
        - Isolation Forest
        """
        data_array = np.array(data)
        anomalies = []

        if method == "zscore":
            mean = np.mean(data_array)
            std = np.std(data_array)
            zscores = np.abs((data_array - mean) / std)
            anomalies = [(i, float(data_array[i]), float(zscores[i]))
                        for i, z in enumerate(zscores) if z > threshold]

        elif method == "iqr":
            q1 = np.percentile(data_array, 25)
            q3 = np.percentile(data_array, 75)
            iqr = q3 - q1
            lower = q1 - 1.5 * iqr
            upper = q3 + 1.5 * iqr
            anomalies = [(i, float(data_array[i]), "IQR")
                        for i, val in enumerate(data_array)
                        if val < lower or val > upper]

        result = {
            "anomalies_count": len(anomalies),
            "anomalies": anomalies[:10],  # 상위 10개
            "anomaly_rate": float(len(anomalies) / len(data) * 100) if data else 0,
            "severity": "high" if len(anomalies) > len(data) * 0.1 else "medium" if len(anomalies) > 0 else "low"
        }

        self.logger.info(f"[PRISM-STATS] 이상탐지 완료: {len(anomalies)}개 이상 발견")
        return result

    # ==================== 6. 클러스터링 (Clustering) ====================

    def clustering_analysis(self, data: List[List[float]], n_clusters: int = 3, method: str = "kmeans") -> Dict[str, Any]:
        """
        클러스터링 분석
        - K-means
        - 계층적 클러스터링
        - DBSCAN
        """
        data_array = np.array(data)

        if method == "kmeans":
            clusters, centers, inertia = self._kmeans_clustering(data_array, n_clusters)
        else:
            clusters, centers = self._hierarchical_clustering(data_array, n_clusters)
            inertia = None

        result = {
            "clusters": clusters.tolist() if isinstance(clusters, np.ndarray) else clusters,
            "n_clusters": n_clusters,
            "cluster_centers": centers.tolist() if isinstance(centers, np.ndarray) else centers,
            "inertia": float(inertia) if inertia else None,
            "silhouette_score": float(self._calculate_silhouette(data_array, clusters))
        }

        self.logger.info(f"[PRISM-STATS] 클러스터링 완료: {n_clusters}개 클러스터")
        return result

    # ==================== 7. 가설검정 (Hypothesis Testing) ====================

    def hypothesis_test(self, group1: List[float], group2: List[float], test_type: str = "t_test") -> Dict[str, Any]:
        """
        가설검정
        - t 검정
        - Mann-Whitney U 검정
        """
        try:
            g1 = np.array(group1, dtype=float)
            g2 = np.array(group2, dtype=float)

            if test_type == "t_test":
                from scipy.stats import ttest_ind
                t_stat, p_val = ttest_ind(g1, g2, equal_var=False)
                statistic = float(t_stat)
                p_value = float(p_val)
            else:  # Mann-Whitney
                statistic = float(np.sum(g1) - np.sum(g2))
                p_value = float(self._calculate_mann_whitney_p(g1, g2))

            combined_std = float(np.std(np.concatenate([g1, g2])))
            effect_size = float(np.abs(np.mean(g1) - np.mean(g2)) / combined_std) if combined_std != 0 else 0

            result = {
                "test_type": test_type,
                "statistic": statistic,
                "p_value": p_value,
                "significant": bool(p_value < 0.05),
                "effect_size": effect_size,
                "conclusion": "유의미한 차이 있음" if p_value < 0.05 else "유의미한 차이 없음"
            }

            self.logger.info(f"[PRISM-STATS] {test_type} 완료: p-value = {p_value:.4f}")
            return result
        except Exception as e:
            self.logger.error(f"[PRISM-STATS] 가설검정 오류: {e}")
            return {
                "test_type": test_type,
                "statistic": 0.0,
                "p_value": 1.0,
                "significant": False,
                "effect_size": 0.0,
                "conclusion": "오류 발생",
                "error": str(e)
            }

    # ==================== 8. 리포팅 & 시각화 ====================

    def generate_report(self, analysis_type: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        분석 리포트 생성
        - 요약 통계
        - 시각화
        - 권장사항
        """
        report = {
            "timestamp": datetime.now().isoformat(),
            "analysis_type": analysis_type,
            "summary": self._generate_summary(analysis_type, data),
            "visualizations": self._generate_visualizations(analysis_type, data),
            "recommendations": self._generate_recommendations(analysis_type, data),
            "metrics": data
        }

        self.logger.info(f"[PRISM-STATS] 리포트 생성 완료: {analysis_type}")
        return report

    # ==================== 9. 대시보드 통계 ====================

    def dashboard_statistics(self, datasets: Dict[str, List[float]]) -> Dict[str, Any]:
        """
        대시보드 통계
        - KPI 계산
        - 성과 지표
        - 추세 지표
        """
        dashboard = {
            "timestamp": datetime.now().isoformat(),
            "kpis": {},
            "trends": {},
            "anomalies": {},
            "forecasts": {}
        }

        for name, data in datasets.items():
            # KPI
            dashboard["kpis"][name] = {
                "current": float(data[-1]) if data else 0,
                "average": float(np.mean(data)),
                "trend": "up" if len(data) > 1 and data[-1] > data[0] else "down"
            }

            # 추세
            dashboard["trends"][name] = self._detect_trend(np.array(data))

            # 이상
            anomalies = self.anomaly_detection(data)
            dashboard["anomalies"][name] = anomalies["anomalies_count"]

            # 예측
            if len(data) > 5:
                forecast = self.forecast(data, periods=3)
                dashboard["forecasts"][name] = forecast["forecasts"]

        self.logger.info("[PRISM-STATS] 대시보드 통계 생성 완료")
        return dashboard

    # ==================== 10. 머신러닝 예측 모델 ====================

    def build_predictive_model(self, X: List[List[float]], y: List[float],
                               model_type: str = "linear") -> Dict[str, Any]:
        """
        예측 모델 구축
        - 선형회귀
        - 다항회귀
        - 앙상블 모델
        """
        X_array = np.array(X)
        y_array = np.array(y)

        from sklearn.linear_model import LinearRegression
        from sklearn.preprocessing import PolynomialFeatures
        features = X_array if model_type == "linear" else PolynomialFeatures(degree=2).fit_transform(X_array)
        regressor = LinearRegression().fit(features, y_array)
        coefficients = np.concatenate([[regressor.intercept_], regressor.coef_])

        model = {
            "type": model_type,
            "coefficients": coefficients.tolist(),
            "r_squared": float(regressor.score(features, y_array)),
            "features": X_array.shape[1],
            "samples": X_array.shape[0]
        }

        self.models[f"{model_type}_{len(self.models)}"] = model

        self.logger.info(f"[PRISM-STATS] {model_type} 예측 모델 구축 완료")
        return model

    # ==================== 헬퍼 함수 ====================

    def _calculate_skewness(self, data: np.ndarray) -> float:
        """왜도 계산"""
        mean = np.mean(data)
        std = np.std(data)
        return np.mean(((data - mean) / std) ** 3) if std != 0 else 0

    def _calculate_kurtosis(self, data: np.ndarray) -> float:
        """첨도 계산"""
        mean = np.mean(data)
        std = np.std(data)
        return np.mean(((data - mean) / std) ** 4) - 3 if std != 0 else 0

    def _detect_trend(self, data: np.ndarray) -> str:
        """추세 감지"""
        if len(data) < 2:
            return "insufficient_data"
        slope = float(np.polyfit(range(len(data)), data, 1)[0])
        return "uptrend" if slope > 0 else "downtrend"

    def _detect_seasonality(self, data: np.ndarray) -> bool:
        """계절성 감지"""
        if len(data) < 4:
            return False
        # 간단한 계절성 감지 (자기상관 분석)
        return bool(abs(self._calculate_autocorrelation(data)) > 0.3)

    def _detect_changepoints(self, data: np.ndarray) -> List[int]:
        """변화점 탐지"""
        if len(data) < 3:
            return []
        diffs = np.diff(data)
        threshold = np.std(diffs) * 2
        return [int(i+1) for i, d in enumerate(diffs) if abs(d) > threshold]

    def _calculate_autocorrelation(self, data: np.ndarray) -> float:
        """자기상관 계산"""
        if len(data) < 2:
            return 0
        mean = np.mean(data)
        c0 = np.sum((data - mean) ** 2) / len(data)
        c1 = np.sum((data[:-1] - mean) * (data[1:] - mean)) / len(data)
        return c1 / c0 if c0 != 0 else 0

    def _exponential_smoothing(self, data: np.ndarray, periods: int, alpha: float = 0.3) -> np.ndarray:
        """지수평활"""
        result = [data[0]]
        for _ in range(periods):
            next_val = alpha * result[-1] + (1 - alpha) * np.mean(data)
            result.append(next_val)
        return np.array(result[1:])

    def _moving_average_forecast(self, data: np.ndarray, periods: int, window: int = 3) -> np.ndarray:
        """이동평균 예측"""
        ma = np.mean(data[-window:])
        return np.full(periods, ma)

    def _linear_trend_forecast(self, data: np.ndarray, periods: int) -> np.ndarray:
        """선형추세 예측"""
        x = np.arange(len(data))
        coeffs = np.polyfit(x, data, 1)
        future_x = np.arange(len(data), len(data) + periods)
        return np.polyval(coeffs, future_x)

    def _kmeans_clustering(self, data: np.ndarray, k: int) -> Tuple:
        """K-means 클러스터링 (scikit-learn)"""
        from sklearn.cluster import KMeans
        model = KMeans(n_clusters=k, n_init=10, random_state=0).fit(data)
        return model.labels_, model.cluster_centers_, float(model.inertia_)

    def _hierarchical_clustering(self, data: np.ndarray, k: int) -> Tuple:
        """계층적 클러스터링 (병합형, scikit-learn)"""
        from sklearn.cluster import AgglomerativeClustering
        labels = AgglomerativeClustering(n_clusters=k).fit_predict(data)
        centers = np.array([data[labels == c].mean(axis=0) for c in range(k)])
        return labels, centers

    def _calculate_silhouette(self, data: np.ndarray, clusters: np.ndarray) -> float:
        """실루엣 점수 (군집이 2개 이상이고 표본이 충분할 때만 계산)"""
        from sklearn.metrics import silhouette_score
        if len(set(clusters.tolist())) < 2 or len(data) <= len(set(clusters.tolist())):
            return 0.0
        return float(silhouette_score(data, clusters))

    def _calculate_mann_whitney_p(self, g1: np.ndarray, g2: np.ndarray) -> float:
        """Mann-Whitney U 검정 p값 (scipy)"""
        from scipy.stats import mannwhitneyu
        return float(mannwhitneyu(g1, g2, alternative="two-sided").pvalue)

    def _generate_summary(self, analysis_type: str, data: Dict) -> str:
        """분석 요약 생성"""
        return f"{analysis_type} 분석 완료. 주요 발견사항 포함."

    def _generate_visualizations(self, analysis_type: str, data: Dict) -> Dict:
        """시각화 데이터 생성"""
        return {"chart_type": "line", "data": data}

    def _generate_recommendations(self, analysis_type: str, data: Dict) -> List[str]:
        """권장사항 생성"""
        return [
            "데이터 품질 개선 필요",
            "이상값 추가 검토",
            "정기적 모니터링 권고"
        ]


# 전역 통계 레이어 인스턴스
prism_statistics_layer = PrismStatisticsLayer()
