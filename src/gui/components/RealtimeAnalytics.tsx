import React, { useState, useEffect, useRef } from 'react';
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine
} from 'recharts';

interface StreamData {
  timestamp: number;
  value: number;
  isAnomaly?: boolean;
}

interface StreamMetrics {
  mean: number;
  std: number;
  min: number;
  max: number;
  trend: string;
}

export const RealtimeAnalytics: React.FC = () => {
  const [streamId, setStreamId] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamData, setStreamData] = useState<StreamData[]>([]);
  const [metrics, setMetrics] = useState<StreamMetrics | null>(null);
  const [anomalies, setAnomalies] = useState<number[]>([]);
  const [alerts, setAlerts] = useState<string[]>([]);
  const streamIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const allValuesRef = useRef<number[]>([]);

  const handleStartStream = async () => {
    try {
      const newStreamId = `stream-${Date.now()}`;

      const response = await fetch('http://localhost:8001/api/prism/stream/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stream_id: newStreamId,
          stream_type: 'timeseries',
          window_size: 100,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setStreamId(result.stream_id);
        setIsStreaming(true);
        setStreamData([]);
        setAnomalies([]);
        setAlerts([]);
        allValuesRef.current = [];

        startStreamSimulation(result.stream_id);
      }
    } catch (error) {
      console.error('Stream start error:', error);
      setAlerts([...alerts, `❌ 스트림 시작 오류: ${error}`]);
    }
  };

  const startStreamSimulation = (id: string) => {
    let dataPoints = 0;

    streamIntervalRef.current = setInterval(async () => {
      // 센서 데이터 시뮬레이션
      const baseValue = 100 + Math.sin(dataPoints / 10) * 15;
      const noise = (Math.random() - 0.5) * 5;
      const anomalousValue = Math.random() > 0.95 ? baseValue * 2.5 : 0; // 5% 이상 확률
      const value = baseValue + noise + anomalousValue;

      const newDataPoint = value;
      allValuesRef.current.push(newDataPoint);

      // 슬라이딩 윈도우 (최대 100개)
      if (allValuesRef.current.length > 100) {
        allValuesRef.current = allValuesRef.current.slice(-100);
      }

      try {
        const response = await fetch('http://localhost:8001/api/prism/stream/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stream_id: id,
            values: [newDataPoint],
            window_size: 100,
            all_values: allValuesRef.current,
          }),
        });

        const result = await response.json();
        if (result.success) {
          // 데이터 포인트 추가
          const newDataWithTimestamp: StreamData = {
            timestamp: Date.now(),
            value: newDataPoint,
            isAnomaly: result.anomalies_detected > 0,
          };

          setStreamData(prev => {
            const updated = [...prev, newDataWithTimestamp];
            return updated.slice(-50); // 최근 50개만 표시
          });

          // 메트릭 업데이트
          if (result.statistics) {
            setMetrics({
              mean: result.statistics.mean,
              std: result.statistics.std_dev,
              min: result.statistics.min,
              max: result.statistics.max,
              trend: result.trend,
            });
          }

          // 이상탐지 처리
          if (result.anomalies_detected > 0) {
            setAnomalies(prev => [...prev, newDataPoint]);
            setAlerts(prev => [
              ...prev,
              `🚨 이상탐지: ${newDataPoint.toFixed(1)} (평균대비 ${((newDataPoint - result.statistics.mean) / result.statistics.std_dev).toFixed(1)}σ)`,
            ]);
          }
        }
      } catch (error) {
        console.error('Stream processing error:', error);
      }

      dataPoints++;
    }, 500); // 500ms마다 처리
  };

  const handleStopStream = async () => {
    setIsStreaming(false);
    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current);
      streamIntervalRef.current = null;
    }

    // 최종화
    if (streamId) {
      try {
        const response = await fetch('http://localhost:8001/api/prism/stream/finalize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stream_id: streamId,
            values: allValuesRef.current,
          }),
        });

        const result = await response.json();
        if (result.success) {
          setAlerts(prev => [...prev, `✅ 스트림 최종화 완료: ${result.total_points}개 포인트 분석`]);
        }
      } catch (error) {
        console.error('Stream finalize error:', error);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (streamIntervalRef.current) {
        clearInterval(streamIntervalRef.current);
      }
    };
  }, []);

  const chartData = streamData.map((d, idx) => ({
    idx,
    value: d.value,
    isAnomaly: d.isAnomaly,
  }));

  return (
    <div className="realtime-analytics-container">
      <style>{`
        .realtime-analytics-container {
          padding: 20px;
          background: linear-gradient(135deg, #1e1e2e 0%, #2d2d44 100%);
          border-radius: 12px;
          color: #e0e0e0;
          height: 100%;
          overflow-y: auto;
        }

        .realtime-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          border-bottom: 2px solid rgba(100, 200, 255, 0.3);
          padding-bottom: 16px;
        }

        .realtime-title {
          font-size: 24px;
          font-weight: bold;
          background: linear-gradient(90deg, #64c8ff, #ffd700);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .stream-status {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 16px;
          background: rgba(100, 200, 255, 0.1);
          border: 1px solid rgba(100, 200, 255, 0.3);
          border-radius: 6px;
        }

        .status-indicator {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #ff6b6b;
        }

        .status-indicator.active {
          background: #4ade80;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .control-buttons {
          display: flex;
          gap: 12px;
        }

        .stream-btn {
          padding: 10px 20px;
          background: linear-gradient(90deg, #64c8ff, #4a9fff);
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.3s ease;
        }

        .stream-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(100, 200, 255, 0.4);
        }

        .stream-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .stream-btn.stop {
          background: linear-gradient(90deg, #ff6b6b, #ee5a6f);
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 12px;
          margin: 20px 0;
        }

        .metric-card {
          background: rgba(100, 200, 255, 0.05);
          border: 1px solid rgba(100, 200, 255, 0.3);
          border-radius: 8px;
          padding: 16px;
          text-align: center;
        }

        .metric-label {
          font-size: 12px;
          color: rgba(224, 224, 224, 0.7);
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .metric-value {
          font-size: 20px;
          font-weight: bold;
          color: #64c8ff;
        }

        .metric-unit {
          font-size: 12px;
          color: rgba(224, 224, 224, 0.5);
          margin-top: 4px;
        }

        .chart-section {
          margin: 24px 0;
        }

        .section-title {
          font-size: 16px;
          font-weight: 600;
          color: #ffd700;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .chart-container {
          background: rgba(0, 0, 0, 0.3);
          border-radius: 8px;
          padding: 16px;
          border: 1px solid rgba(100, 200, 255, 0.2);
        }

        .alerts-section {
          margin: 24px 0;
          padding: 16px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 8px;
          border: 1px solid rgba(100, 200, 255, 0.2);
        }

        .alerts-title {
          font-size: 14px;
          font-weight: 600;
          color: #ffd700;
          margin-bottom: 12px;
        }

        .alert-item {
          padding: 8px 12px;
          background: rgba(255, 107, 107, 0.1);
          border-left: 3px solid #ff6b6b;
          border-radius: 4px;
          margin: 6px 0;
          font-size: 13px;
          color: #ff9999;
          max-height: 20px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .alert-item.success {
          background: rgba(74, 222, 128, 0.1);
          border-left-color: #4ade80;
          color: #86efac;
        }

        .data-summary {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 12px;
          margin: 16px 0;
        }

        .summary-badge {
          background: rgba(100, 200, 255, 0.1);
          border: 1px solid rgba(100, 200, 255, 0.3);
          border-radius: 6px;
          padding: 12px;
          text-align: center;
          font-size: 12px;
        }

        .summary-label {
          color: rgba(224, 224, 224, 0.7);
          margin-bottom: 4px;
        }

        .summary-value {
          font-size: 18px;
          font-weight: bold;
          color: #64c8ff;
        }

        .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: rgba(224, 224, 224, 0.5);
        }

        .empty-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }
      `}</style>

      <div className="realtime-header">
        <div className="realtime-title">📡 실시간 데이터 분석</div>
        <div className="stream-status">
          <div className={`status-indicator ${isStreaming ? 'active' : ''}`}></div>
          <span>{isStreaming ? '스트리밍 중...' : '준비됨'}</span>
        </div>
      </div>

      <div className="control-buttons">
        <button
          className="stream-btn"
          onClick={handleStartStream}
          disabled={isStreaming}
        >
          {isStreaming ? '스트리밍 중' : '✨ 스트림 시작'}
        </button>
        <button
          className="stream-btn stop"
          onClick={handleStopStream}
          disabled={!isStreaming}
        >
          ⏹ 스트림 중지
        </button>
      </div>

      {metrics && (
        <>
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-label">평균</div>
              <div className="metric-value">{metrics.mean.toFixed(1)}</div>
              <div className="metric-unit">units</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">표준편차</div>
              <div className="metric-value">{metrics.std.toFixed(1)}</div>
              <div className="metric-unit">σ</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">최소값</div>
              <div className="metric-value">{metrics.min.toFixed(1)}</div>
              <div className="metric-unit">min</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">최대값</div>
              <div className="metric-value">{metrics.max.toFixed(1)}</div>
              <div className="metric-unit">max</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">추세</div>
              <div className="metric-value">{metrics.trend === 'uptrend' ? '📈' : '📉'}</div>
              <div className="metric-unit">{metrics.trend}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">데이터 포인트</div>
              <div className="metric-value">{streamData.length}</div>
              <div className="metric-unit">points</div>
            </div>
          </div>

          <div className="chart-section">
            <div className="section-title">📊 실시간 데이터 흐름</div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#64c8ff" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#64c8ff" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(100, 200, 255, 0.2)" />
                  <XAxis dataKey="idx" stroke="#64c8ff" />
                  <YAxis stroke="#64c8ff" />
                  <Tooltip
                    contentStyle={{ background: 'rgba(0, 0, 0, 0.8)', border: '1px solid #64c8ff' }}
                    labelStyle={{ color: '#64c8ff' }}
                  />
                  <ReferenceLine y={metrics.mean} stroke="#ffd700" strokeDasharray="5 5" label="평균" />
                  <ReferenceLine y={metrics.mean + metrics.std * 2} stroke="#ff6b6b" strokeDasharray="5 5" label="이상 임계값" />
                  <Area type="monotone" dataKey="value" stroke="#64c8ff" fillOpacity={1} fill="url(#colorValue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="data-summary">
            <div className="summary-badge">
              <div className="summary-label">데이터 범위</div>
              <div className="summary-value">{(metrics.max - metrics.min).toFixed(1)}</div>
            </div>
            <div className="summary-badge">
              <div className="summary-label">변동계수</div>
              <div className="summary-value">{(metrics.std / metrics.mean * 100).toFixed(1)}%</div>
            </div>
            <div className="summary-badge">
              <div className="summary-label">이상치 개수</div>
              <div className="summary-value">{anomalies.length}</div>
            </div>
            <div className="summary-badge">
              <div className="summary-label">이상치율</div>
              <div className="summary-value">{streamData.length > 0 ? ((anomalies.length / streamData.length) * 100).toFixed(1) : 0}%</div>
            </div>
          </div>
        </>
      )}

      {alerts.length > 0 && (
        <div className="alerts-section">
          <div className="alerts-title">🔔 실시간 알림 ({alerts.length})</div>
          {alerts.slice(-10).map((alert, idx) => (
            <div key={idx} className={`alert-item ${alert.includes('✅') ? 'success' : ''}`}>
              {alert}
            </div>
          ))}
        </div>
      )}

      {!isStreaming && streamData.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📡</div>
          <div>스트림을 시작하여 실시간 데이터 분석을 시작하세요</div>
        </div>
      )}
    </div>
  );
};

export default RealtimeAnalytics;
