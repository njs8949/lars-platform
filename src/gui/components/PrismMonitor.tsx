import React, { useState, useEffect } from 'react';
import { Activity, Zap, Database, Clock, TrendingUp, RefreshCw } from 'lucide-react';

interface PerformanceMetrics {
  timestamp: number;
  queryCount: number;
  avgExecutionTime: number;
  cacheHitRate: number;
  storageUsage: number;
}

interface Props {
  userId: string;
  apiUrl: string;
}

export const PrismMonitor: React.FC<Props> = ({ userId, apiUrl }) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics[]>([]);
  const [currentStats, setCurrentStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchMetrics = async () => {
    setIsLoading(true);
    try {
      // 시스템 통계
      const sysRes = await fetch(`${apiUrl}/agent/prism/stats`);
      const sysData = await sysRes.json();

      // 사용자 통계
      const userRes = await fetch(`${apiUrl}/agent/prism/stats/user/${userId}`);
      const userData = await userRes.json();

      setCurrentStats({
        system: sysData,
        user: userData,
        timestamp: Date.now()
      });

      // 메트릭 추가
      setMetrics(prev => {
        const newMetrics = [...prev];
        newMetrics.push({
          timestamp: Date.now(),
          queryCount: sysData.services?.total_queries || 0,
          avgExecutionTime: sysData.services?.avg_execution_time || 0,
          cacheHitRate: calculateCacheHitRate(userData),
          storageUsage: (sysData.storage?.total_size || 0) / 1024 / 1024
        });
        // 최근 60개만 유지
        return newMetrics.slice(-60);
      });
    } catch (err) {
      console.error('메트릭 로드 실패:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateCacheHitRate = (userData: any): number => {
    if (!userData?.query_history) return 0;
    const cached = userData.query_history.filter((q: any) => q.cached).length;
    return (cached / userData.query_history.length) * 100;
  };

  // 자동 새로고침
  useEffect(() => {
    fetchMetrics();
    if (!autoRefresh) return;

    const interval = setInterval(fetchMetrics, 10000); // 10초마다 갱신
    return () => clearInterval(interval);
  }, [autoRefresh, userId, apiUrl]);

  const getSparklineData = (data: number[]) => {
    if (data.length === 0) return 'M0,0';
    const maxVal = Math.max(...data, 1);
    const width = 200;
    const height = 50;
    const points = data.map((val, idx) => {
      const x = (idx / Math.max(data.length - 1, 1)) * width;
      const y = height - (val / maxVal) * (height - 10);
      return `${x},${y}`;
    });
    return `M${points.join(' L')}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1rem' }}>
      {/* 헤더 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid rgba(100, 108, 255, 0.2)',
        paddingBottom: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <Activity size={24} style={{ color: '#60a5fa' }} />
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#fff' }}>Prism 성능 모니터</h3>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            style={{
              background: autoRefresh ? 'rgba(34, 197, 94, 0.2)' : 'rgba(100, 100, 100, 0.2)',
              border: `1px solid ${autoRefresh ? 'rgba(34, 197, 94, 0.5)' : 'rgba(100, 100, 100, 0.3)'}`,
              color: autoRefresh ? '#22c55e' : '#9ba1b0',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 500
            }}
          >
            {autoRefresh ? '🟢 활성' : '⚪ 비활성'}
          </button>
          <button
            onClick={fetchMetrics}
            disabled={isLoading}
            style={{
              background: 'rgba(59, 130, 246, 0.2)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              color: '#60a5fa',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '0.8rem',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <RefreshCw size={14} style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />
            새로고침
          </button>
        </div>
      </div>

      {/* KPI 카드 */}
      {currentStats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem'
        }}>
          {/* 쿼리 처리량 */}
          <div style={{
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '10px',
            padding: '1.2rem',
            color: '#60a5fa'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Zap size={16} />
              <span style={{ fontSize: '0.8rem', color: '#9ba1b0' }}>처리량</span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              {currentStats.system?.services?.total_queries || 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#9ba1b0' }}>총 쿼리</div>
          </div>

          {/* 평균 응답 시간 */}
          <div style={{
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: '10px',
            padding: '1.2rem',
            color: '#22c55e'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Clock size={16} />
              <span style={{ fontSize: '0.8rem', color: '#9ba1b0' }}>응답시간</span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              {(currentStats.system?.services?.avg_execution_time || 0).toFixed(2)}s
            </div>
            <div style={{ fontSize: '0.75rem', color: '#9ba1b0' }}>평균 실행시간</div>
          </div>

          {/* 캐시 히트율 */}
          <div style={{
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: '10px',
            padding: '1.2rem',
            color: '#f59e0b'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <TrendingUp size={16} />
              <span style={{ fontSize: '0.8rem', color: '#9ba1b0' }}>캐시 효율</span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              {(calculateCacheHitRate(currentStats.user) || 0).toFixed(1)}%
            </div>
            <div style={{ fontSize: '0.75rem', color: '#9ba1b0' }}>히트율</div>
          </div>

          {/* 저장소 사용량 */}
          <div style={{
            background: 'rgba(168, 85, 247, 0.1)',
            border: '1px solid rgba(168, 85, 247, 0.3)',
            borderRadius: '10px',
            padding: '1.2rem',
            color: '#a855f7'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Database size={16} />
              <span style={{ fontSize: '0.8rem', color: '#9ba1b0' }}>저장소</span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              {((currentStats.system?.storage?.total_size || 0) / 1024 / 1024).toFixed(1)} MB
            </div>
            <div style={{ fontSize: '0.75rem', color: '#9ba1b0' }}>총 크기</div>
          </div>
        </div>
      )}

      {/* 스파크라인 그래프 */}
      {metrics.length > 1 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1rem'
        }}>
          {/* 쿼리 트렌드 */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.5)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            borderRadius: '10px',
            padding: '1rem'
          }}>
            <h4 style={{ fontSize: '0.85rem', color: '#9ba1b0', marginBottom: '0.8rem', margin: 0 }}>쿼리 처리량 추이</h4>
            <svg width="100%" height="60" style={{ marginTop: '0.5rem' }}>
              <polyline
                points={getSparklineData(metrics.map(m => m.queryCount))}
                fill="none"
                stroke="#60a5fa"
                strokeWidth="2"
              />
            </svg>
            <div style={{ fontSize: '0.75rem', color: '#9ba1b0', marginTop: '0.5rem' }}>최근 60개 측정</div>
          </div>

          {/* 응답시간 트렌드 */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.5)',
            border: '1px solid rgba(34, 197, 94, 0.2)',
            borderRadius: '10px',
            padding: '1rem'
          }}>
            <h4 style={{ fontSize: '0.85rem', color: '#9ba1b0', marginBottom: '0.8rem', margin: 0 }}>응답시간 추이 (초)</h4>
            <svg width="100%" height="60" style={{ marginTop: '0.5rem' }}>
              <polyline
                points={getSparklineData(metrics.map(m => m.avgExecutionTime * 10))}
                fill="none"
                stroke="#22c55e"
                strokeWidth="2"
              />
            </svg>
            <div style={{ fontSize: '0.75rem', color: '#9ba1b0', marginTop: '0.5rem' }}>10초 주기 갱신</div>
          </div>

          {/* 캐시 효율 트렌드 */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.5)',
            border: '1px solid rgba(245, 158, 11, 0.2)',
            borderRadius: '10px',
            padding: '1rem'
          }}>
            <h4 style={{ fontSize: '0.85rem', color: '#9ba1b0', marginBottom: '0.8rem', margin: 0 }}>캐시 히트율 추이 (%)</h4>
            <svg width="100%" height="60" style={{ marginTop: '0.5rem' }}>
              <polyline
                points={getSparklineData(metrics.map(m => m.cacheHitRate))}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2"
              />
            </svg>
            <div style={{ fontSize: '0.75rem', color: '#9ba1b0', marginTop: '0.5rem' }}>0-100%</div>
          </div>
        </div>
      )}

      {/* 상태 표시 */}
      {currentStats && (
        <div style={{
          background: 'rgba(15, 23, 42, 0.5)',
          border: '1px solid rgba(100, 108, 255, 0.2)',
          borderRadius: '10px',
          padding: '1rem'
        }}>
          <h4 style={{ fontSize: '0.9rem', color: '#fff', marginBottom: '0.8rem', margin: 0 }}>시스템 상태</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.85rem' }}>
            <div>
              <span style={{ color: '#9ba1b0' }}>활성 캐시 항목:</span>
              <span style={{ color: '#60a5fa', marginLeft: '0.5rem', fontWeight: 600 }}>
                {currentStats.system?.compute?.cached_queries || 0}
              </span>
            </div>
            <div>
              <span style={{ color: '#9ba1b0' }}>활성 쿼리:</span>
              <span style={{ color: '#22c55e', marginLeft: '0.5rem', fontWeight: 600 }}>
                {currentStats.system?.compute?.active_queries || 0}
              </span>
            </div>
            <div>
              <span style={{ color: '#9ba1b0' }}>저장 데이터 항목:</span>
              <span style={{ color: '#f59e0b', marginLeft: '0.5rem', fontWeight: 600 }}>
                {currentStats.system?.storage?.total_items || 0}
              </span>
            </div>
            <div>
              <span style={{ color: '#9ba1b0' }}>캐시 TTL:</span>
              <span style={{ color: '#a855f7', marginLeft: '0.5rem', fontWeight: 600 }}>
                {currentStats.system?.compute?.cache_ttl ? `${currentStats.system.compute.cache_ttl / 60}분` : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
