import React, { useState, useEffect } from 'react';
import {
  Activity, AlertCircle, TrendingUp, TrendingDown, Gauge, Zap,
  Heart, Network, BarChart3, LineChart, CheckCircle2, AlertTriangle,
  RefreshCw, Download, Eye, EyeOff
} from 'lucide-react';

interface DeploymentMetrics {
  timestamp: string;
  cpu: number;
  memory: number;
  disk: number;
  networkIn: number;
  networkOut: number;
  requestCount: number;
  errorRate: number;
  responseTime: number;
  uptime: number;
}

interface HealthCheckResult {
  endpoint: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  lastChecked: string;
}

interface AlertRule {
  id: string;
  name: string;
  metric: string;
  threshold: number;
  condition: '>' | '<' | '=' | '!=' | '>=' | '<=';
  enabled: boolean;
}

interface DeploymentObservabilityProps {
  deploymentId: string;
  deploymentName: string;
}

// 실제 지표가 없을 때 보여 주는 빈 값 (가짜 샘플 대신 0으로 표시한다)
const EMPTY_METRICS: DeploymentMetrics = { timestamp: new Date().toISOString(), cpu: 0, memory: 0, disk: 0, networkIn: 0, networkOut: 0, requestCount: 0, errorRate: 0, responseTime: 0, uptime: 0 };


export default function DeploymentObservability({ deploymentId, deploymentName }: DeploymentObservabilityProps) {
  const [metrics, setMetrics] = useState<DeploymentMetrics[]>([]);
  const [healthChecks, setHealthChecks] = useState<HealthCheckResult[]>([]);
  const [alertRules, setAlertRules] = useState<AlertRule[]>([
    {
      id: '1',
      name: 'High CPU Usage',
      metric: 'cpu',
      threshold: 80,
      condition: '>',
      enabled: true
    },
    {
      id: '2',
      name: 'High Error Rate',
      metric: 'errorRate',
      threshold: 5,
      condition: '>',
      enabled: true
    },
    {
      id: '3',
      name: 'High Response Time',
      metric: 'responseTime',
      threshold: 500,
      condition: '>',
      enabled: true
    }
  ]);
  const [activeMetric, setActiveMetric] = useState<keyof Omit<DeploymentMetrics, 'timestamp'>>('cpu');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loading, setLoading] = useState(false);

  // 실제 서버에서 메트릭 데이터 가져오기
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        const response = await fetch(`http://localhost:8001/api/deployment/metrics/${deploymentId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.metrics && data.metrics.length > 0) {
            setMetrics(data.metrics);
          }
        }
      } catch (err) {
        console.log('지표 로드 실패:', err);
      } finally {
        setLoading(false);
      }
    };

    const fetchHealthChecks = async () => {
      try {
        const response = await fetch(`http://localhost:8001/api/deployment/health/${deploymentId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.health_checks) {
            setHealthChecks(data.health_checks);
          }
        }
      } catch (err) {
        console.log('헬스 체크 로드 실패:', err);
      }
    };

    if (deploymentId) {
      fetchMetrics();
      fetchHealthChecks();
    }

    // 자동 새로고침 설정
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchMetrics();
        fetchHealthChecks();
      }, 5000); // 5초마다 새로고침
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [deploymentId, autoRefresh]);

  const currentMetrics: DeploymentMetrics = metrics[metrics.length - 1] || EMPTY_METRICS;

  const getMetricColor = (value: number, metric: keyof Omit<DeploymentMetrics, 'timestamp'>): string => {
    switch (metric) {
      case 'cpu':
      case 'memory':
      case 'disk':
        return value > 80 ? '#ef4444' : value > 60 ? '#f59e0b' : '#22c55e';
      case 'errorRate':
        return value > 5 ? '#ef4444' : value > 2 ? '#f59e0b' : '#22c55e';
      case 'responseTime':
        return value > 500 ? '#ef4444' : value > 300 ? '#f59e0b' : '#22c55e';
      default:
        return '#64c8ff';
    }
  };

  const getHealthStatus = (status: string) => {
    switch (status) {
      case 'healthy':
        return { color: '#22c55e', icon: '✓', text: '정상' };
      case 'degraded':
        return { color: '#f59e0b', icon: '!', text: '저하' };
      case 'unhealthy':
        return { color: '#ef4444', icon: '✗', text: '비정상' };
      default:
        return { color: '#64c8ff', icon: '?', text: '알 수 없음' };
    }
  };

  const formatValue = (metric: keyof Omit<DeploymentMetrics, 'timestamp'>, value: number): string => {
    switch (metric) {
      case 'cpu':
      case 'memory':
      case 'disk':
      case 'errorRate':
      case 'uptime':
        return `${value.toFixed(1)}%`;
      case 'networkIn':
      case 'networkOut':
        return `${value.toFixed(0)} MB/s`;
      case 'responseTime':
        return `${value.toFixed(0)}ms`;
      case 'requestCount':
        return value.toLocaleString();
      default:
        return value.toFixed(2);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(100, 200, 255, 0.2)', paddingBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <Activity size={24} style={{ color: '#64c8ff' }} />
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff' }}>실시간 모니터링</div>
            <div style={{ fontSize: '0.85rem', color: '#9ba1b0' }}>{deploymentName}</div>
          </div>
        </div>
        <button
          onClick={() => setAutoRefresh(!autoRefresh)}
          style={{
            padding: '0.5rem 1rem',
            background: autoRefresh ? 'rgba(34, 197, 94, 0.2)' : 'rgba(100, 200, 255, 0.1)',
            border: `1px solid ${autoRefresh ? 'rgba(34, 197, 94, 0.5)' : 'rgba(100, 200, 255, 0.3)'}`,
            borderRadius: '6px',
            color: autoRefresh ? '#22c55e' : '#64c8ff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.9rem',
            fontWeight: 500
          }}
        >
          {autoRefresh ? <RefreshCw size={16} /> : <EyeOff size={16} />}
          {autoRefresh ? '자동 새로고침' : '일시 정지'}
        </button>
      </div>

      {/* 주요 메트릭 카드들 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem'
      }}>
        {[
          { key: 'cpu', label: 'CPU 사용률', icon: Gauge },
          { key: 'memory', label: '메모리 사용률', icon: Activity },
          { key: 'errorRate', label: '에러율', icon: AlertCircle },
          { key: 'responseTime', label: '응답시간', icon: TrendingUp }
        ].map(({ key, label, icon: Icon }) => {
          const metricKey = key as keyof Omit<DeploymentMetrics, 'timestamp'>;
          const value = currentMetrics[metricKey];
          const color = getMetricColor(value as number, metricKey);

          return (
            <div
              key={key}
              onClick={() => setActiveMetric(metricKey)}
              style={{
                background: activeMetric === metricKey ? 'rgba(100, 200, 255, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                border: activeMetric === metricKey ? '2px solid rgba(100, 200, 255, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '1.5rem',
                cursor: 'pointer',
                transition: 'all 0.3s',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.8rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.9rem', color: '#9ba1b0', fontWeight: 500 }}>{label}</span>
                <Icon size={20} style={{ color }} />
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color }}>
                {formatValue(metricKey, value as number)}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#9ba1b0' }}>
                {value > 70 ? '⚠️ 높음' : value > 40 ? '⚡ 중간' : '✓ 정상'}
              </div>
            </div>
          );
        })}
      </div>

      {/* 메트릭 그래프 */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        padding: '1.5rem'
      }}>
        <h3 style={{ color: '#fff', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <LineChart size={20} style={{ color: '#64c8ff' }} /> 시계열 데이터
        </h3>
        <div style={{
          height: '250px',
          background: 'rgba(0, 0, 0, 0.3)',
          borderRadius: '8px',
          padding: '1rem',
          display: 'flex',
          alignItems: 'flex-end',
          gap: '8px',
          overflow: 'auto'
        }}>
          {metrics.map((m, idx) => {
            const value = m[activeMetric] as number;
            const maxValue = Math.max(...metrics.map(x => x[activeMetric] as number));
            const height = (value / maxValue) * 100;
            const color = getMetricColor(value, activeMetric);

            return (
              <div
                key={idx}
                style={{
                  flex: 1,
                  minWidth: '30px',
                  height: `${height}%`,
                  background: color,
                  borderRadius: '4px',
                  opacity: 0.8,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                title={`${new Date(m.timestamp).toLocaleTimeString('ko-KR')}: ${formatValue(activeMetric, value)}`}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '0.8'}
              />
            );
          })}
        </div>
        <div style={{ fontSize: '0.8rem', color: '#9ba1b0', marginTop: '0.8rem', textAlign: 'center' }}>
          지난 5분 동안의 {['CPU 사용률', '메모리 사용률', '에러율', '응답시간'][['cpu', 'memory', 'errorRate', 'responseTime'].indexOf(activeMetric as string)]} 추이
        </div>
      </div>

      {/* 헬스 체크 */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        padding: '1.5rem'
      }}>
        <h3 style={{ color: '#fff', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Heart size={20} style={{ color: '#ef4444' }} /> 헬스 체크
        </h3>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#9ba1b0' }}>
            <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '0.5rem' }} />
            <p>데이터를 불러오는 중...</p>
          </div>
        ) : healthChecks.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {healthChecks.map((check) => {
              const { color, text, icon } = getHealthStatus(check.status);

              return (
                <div
                  key={check.endpoint}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1rem',
                    background: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: '8px',
                    border: `1px solid ${color}20`
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: color,
                        animation: check.status === 'healthy' ? 'pulse 2s infinite' : 'none'
                      }}
                    />
                    <div>
                      <div style={{ fontWeight: 600, color: '#fff', marginBottom: '0.3rem' }}>{check.endpoint}</div>
                      <div style={{ fontSize: '0.8rem', color: '#9ba1b0' }}>
                        응답시간: {check.responseTime}ms
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color, fontWeight: 600, fontSize: '0.9rem' }}>
                    {icon} {text}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#9ba1b0' }}>
            <p>배포된 서비스에서 헬스 체크 데이터를 불러올 수 없습니다</p>
            <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>서버의 /api/health 엔드포인트가 구현되어 있는지 확인하세요</p>
          </div>
        )}
      </div>

      {/* 알림 규칙 */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        padding: '1.5rem'
      }}>
        <h3 style={{ color: '#fff', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertTriangle size={20} style={{ color: '#f59e0b' }} /> 알림 규칙
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          {alertRules.map((rule) => (
            <div
              key={rule.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem',
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            >
              <div>
                <div style={{ fontWeight: 600, color: '#fff', marginBottom: '0.3rem' }}>{rule.name}</div>
                <div style={{ fontSize: '0.8rem', color: '#9ba1b0' }}>
                  {rule.metric} {rule.condition} {rule.threshold}
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={rule.enabled}
                  onChange={() => {}}
                  style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                />
                <span style={{ fontSize: '0.9rem', color: rule.enabled ? '#22c55e' : '#9ba1b0' }}>
                  {rule.enabled ? '활성화' : '비활성화'}
                </span>
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* 요약 정보 */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(100, 200, 255, 0.1), rgba(255, 215, 0, 0.05))',
        border: '1px solid rgba(100, 200, 255, 0.2)',
        borderRadius: '12px',
        padding: '1.5rem'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.9rem', color: '#9ba1b0', marginBottom: '0.5rem' }}>가동 시간</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#22c55e' }}>{currentMetrics.uptime.toFixed(2)}%</div>
          </div>
          <div>
            <div style={{ fontSize: '0.9rem', color: '#9ba1b0', marginBottom: '0.5rem' }}>총 요청</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#64c8ff' }}>{currentMetrics.requestCount.toLocaleString()}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.9rem', color: '#9ba1b0', marginBottom: '0.5rem' }}>평균 응답시간</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ffd700' }}>{currentMetrics.responseTime.toFixed(0)}ms</div>
          </div>
          <div>
            <div style={{ fontSize: '0.9rem', color: '#9ba1b0', marginBottom: '0.5rem' }}>네트워크</div>
            <div style={{ fontSize: '0.9rem', color: '#64c8ff' }}>↓ {currentMetrics.networkIn} MB/s ↑ {currentMetrics.networkOut} MB/s</div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
