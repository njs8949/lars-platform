import React, { useState, useEffect } from 'react';
import { ExaoneTabularPanel } from './components/ExaoneTabularPanel';
import {
  LineChart, Line, BarChart, Bar, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import {
  BarChart3, TrendingUp, Target, Activity, Brain,
  LayoutDashboard, TrendingDown, Zap, AlertCircle, Radio, Sparkles
} from 'lucide-react';
import { GlassmorphicIcon } from './components/GlassmorphicIcon';
import RealtimeAnalytics from './components/RealtimeAnalytics';
import AdvancedCharts from './components/AdvancedCharts';

interface StatisticsResult {
  success: boolean;
  analysis?: string;
  results?: any;
  error?: string;
}

interface DashboardData {
  timestamp: string;
  kpis: { [key: string]: { current: number; average: number; trend: string } };
  trends: { [key: string]: string };
  anomalies: { [key: string]: number };
  forecasts: { [key: string]: number[] };
}

export const Statistics: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'descriptive' | 'timeseries' | 'forecast' | 'anomaly' | 'dashboard' | 'realtime' | 'advanced'>('dashboard');
  const [dataInput, setDataInput] = useState<string>('10,20,30,40,50,60,70,80,90,100');
  const [results, setResults] = useState<StatisticsResult | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);

  // 샘플 데이터
  const sampleTimeSeries = [
    { time: '1월', value: 100, forecast: 105 },
    { time: '2월', value: 120, forecast: 118 },
    { time: '3월', value: 115, forecast: 130 },
    { time: '4월', value: 140, forecast: 135 },
    { time: '5월', value: 135, forecast: 142 },
    { time: '6월', value: 160, forecast: 158 },
  ];

  const anomalyData = [
    { id: 0, value: 10, type: 'normal' },
    { id: 1, value: 12, type: 'normal' },
    { id: 2, value: 15, type: 'normal' },
    { id: 3, value: 14, type: 'normal' },
    { id: 4, value: 100, type: 'anomaly' },
    { id: 5, value: 16, type: 'normal' },
  ];

  const handleAnalyze = async (endpoint: string) => {
    setLoading(true);
    try {
      const data = dataInput.split(',').map(v => parseFloat(v.trim()));

      const payload = (() => {
        switch (endpoint) {
          case 'descriptive':
            return { data };
          case 'timeseries':
            return { data };
          case 'forecast':
            return { data, periods: 3, method: 'exponential' };
          case 'anomaly-detection':
            return { data, method: 'zscore', threshold: 2.5 };
          default:
            return { data };
        }
      })();

      const response = await fetch(`http://localhost:8001/api/prism/statistics/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      setResults(result);
    } catch (error) {
      setResults({ success: false, error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  const handleLoadDashboard = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8001/api/prism/statistics/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          datasets: {
            sales: [100, 120, 140, 135, 150, 165, 180],
            users: [50, 55, 65, 70, 75, 85, 95],
            engagement: [30, 35, 40, 38, 45, 52, 60],
          },
        }),
      });

      const result = await response.json();
      if (result.success) {
        setDashboard(result.dashboard);
      }
    } catch (error) {
      console.error('Dashboard load error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleLoadDashboard();
  }, []);

  return (
    <div className="statistics-container">
      <style>{`
        .statistics-container {
          padding: 20px;
          background: linear-gradient(135deg, #1e1e2e 0%, #2d2d44 100%);
          border-radius: 12px;
          height: 100%;
          overflow-y: auto;
          color: #e0e0e0;
        }

        .stats-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          border-bottom: 2px solid rgba(100, 200, 255, 0.3);
          padding-bottom: 16px;
        }

        .stats-title {
          font-size: 24px;
          font-weight: bold;
          background: linear-gradient(90deg, #64c8ff, #ffd700);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .tab-buttons {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .tab-btn {
          padding: 8px 16px;
          border: 2px solid transparent;
          background: rgba(100, 200, 255, 0.1);
          color: #e0e0e0;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.3s ease;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .tab-btn:hover {
          background: rgba(100, 200, 255, 0.2);
          border-color: #64c8ff;
        }

        .tab-btn.active {
          background: linear-gradient(90deg, #64c8ff, #4a9fff);
          border-color: #64c8ff;
          color: #fff;
        }

        .input-section {
          margin: 20px 0;
          padding: 16px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 8px;
          border: 1px solid rgba(100, 200, 255, 0.2);
        }

        .input-label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
          font-size: 14px;
        }

        .input-field {
          width: 100%;
          padding: 10px;
          background: rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(100, 200, 255, 0.3);
          border-radius: 6px;
          color: #e0e0e0;
          font-family: monospace;
          margin-bottom: 12px;
        }

        .button-group {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .analyze-btn {
          padding: 10px 20px;
          background: linear-gradient(90deg, #64c8ff, #4a9fff);
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.3s ease;
        }

        .analyze-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(100, 200, 255, 0.4);
        }

        .analyze-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .results-section {
          margin-top: 24px;
          padding: 16px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 8px;
          border: 1px solid rgba(100, 200, 255, 0.2);
        }

        .chart-container {
          background: rgba(0, 0, 0, 0.5);
          border-radius: 8px;
          padding: 16px;
          margin: 16px 0;
          border: 1px solid rgba(100, 200, 255, 0.2);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
          margin: 16px 0;
        }

        .stat-card {
          background: rgba(100, 200, 255, 0.1);
          border: 1px solid rgba(100, 200, 255, 0.3);
          border-radius: 8px;
          padding: 12px;
          display: flex;
          flex-direction: column;
        }

        .stat-label {
          font-size: 12px;
          color: rgba(224, 224, 224, 0.7);
          margin-bottom: 4px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .stat-value {
          font-size: 20px;
          font-weight: bold;
          color: #64c8ff;
        }

        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 12px;
          margin: 16px 0;
        }

        .kpi-card {
          background: rgba(100, 200, 255, 0.05);
          border: 1px solid rgba(100, 200, 255, 0.3);
          border-radius: 8px;
          padding: 16px;
          text-align: center;
        }

        .kpi-name {
          font-size: 12px;
          color: rgba(224, 224, 224, 0.7);
          margin-bottom: 8px;
        }

        .kpi-current {
          font-size: 24px;
          font-weight: bold;
          color: #ffd700;
          margin-bottom: 4px;
        }

        .kpi-trend {
          font-size: 12px;
          color: #64c8ff;
        }

        .trend-up {
          color: #4ade80;
        }

        .trend-down {
          color: #ff6b6b;
        }

        .error-message {
          background: rgba(255, 107, 107, 0.1);
          border: 1px solid #ff6b6b;
          color: #ff9999;
          padding: 12px;
          border-radius: 6px;
          margin: 12px 0;
        }

        .loading {
          text-align: center;
          padding: 20px;
          color: #64c8ff;
        }

        .spinner {
          display: inline-block;
          width: 20px;
          height: 20px;
          border: 3px solid rgba(100, 200, 255, 0.3);
          border-top-color: #64c8ff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .metrics-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 8px;
          margin: 8px 0;
        }

        .metric-badge {
          background: rgba(100, 200, 255, 0.1);
          border: 1px solid rgba(100, 200, 255, 0.3);
          border-radius: 4px;
          padding: 6px 10px;
          font-size: 12px;
          text-align: center;
        }

        .metric-label {
          color: rgba(224, 224, 224, 0.7);
          font-size: 10px;
        }

        .metric-value {
          color: #64c8ff;
          font-weight: bold;
          margin-top: 2px;
        }
      `}</style>

      <div className="stats-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <GlassmorphicIcon Icon={BarChart3} gradient="from-blue-400 to-cyan-500" size={28} />
          <div className="stats-title">Prism 통계 분석 엔진</div>
        </div>
        <div className="tab-buttons">
          <button
            className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <LayoutDashboard size={18} />
            대시보드
          </button>
          <button
            className={`tab-btn ${activeTab === 'descriptive' ? 'active' : ''}`}
            onClick={() => setActiveTab('descriptive')}
          >
            <BarChart3 size={18} />
            기술통계
          </button>
          <button
            className={`tab-btn ${activeTab === 'timeseries' ? 'active' : ''}`}
            onClick={() => setActiveTab('timeseries')}
          >
            <TrendingDown size={18} />
            시계열
          </button>
          <button
            className={`tab-btn ${activeTab === 'forecast' ? 'active' : ''}`}
            onClick={() => setActiveTab('forecast')}
          >
            <Zap size={18} />
            예측
          </button>
          <button
            className={`tab-btn ${activeTab === 'anomaly' ? 'active' : ''}`}
            onClick={() => setActiveTab('anomaly')}
          >
            <AlertCircle size={18} />
            이상탐지
          </button>
          <button
            className={`tab-btn ${activeTab === 'realtime' ? 'active' : ''}`}
            onClick={() => setActiveTab('realtime')}
          >
            <Radio size={18} />
            실시간 분석
          </button>
          <button
            className={`tab-btn ${activeTab === 'advanced' ? 'active' : ''}`}
            onClick={() => setActiveTab('advanced')}
          >
            <Sparkles size={18} />
            고급 시각화
          </button>
        </div>
      </div>

      {activeTab === 'realtime' && (
        <RealtimeAnalytics />
      )}

      {activeTab === 'advanced' && (
        <AdvancedCharts />
      )}

      {activeTab === 'dashboard' && (
        <div>
          <button className="analyze-btn" onClick={handleLoadDashboard} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <LayoutDashboard size={18} />
            {loading ? '로드 중...' : '대시보드 새로고침'}
          </button>

          {dashboard && (
            <div className="results-section">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <GlassmorphicIcon Icon={TrendingUp} gradient="from-green-400 to-emerald-500" size={20} />
                핵심 성과 지표 (KPI)
              </h3>
              <div className="kpi-grid">
                {Object.entries(dashboard.kpis).map(([name, data]: [string, any]) => (
                  <div key={name} className="kpi-card">
                    <div className="kpi-name">{name.toUpperCase()}</div>
                    <div className="kpi-current">{data.current.toFixed(1)}</div>
                    <div className={`kpi-trend ${data.trend === 'up' ? 'trend-up' : 'trend-down'}`}>
                      {data.trend === 'up' ? '📈' : '📉'} {data.average.toFixed(1)}
                    </div>
                  </div>
                ))}
              </div>

              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <GlassmorphicIcon Icon={Activity} gradient="from-blue-400 to-cyan-500" size={20} />
                시계열 추세
              </h3>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={sampleTimeSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(100, 200, 255, 0.2)" />
                    <XAxis dataKey="time" stroke="#64c8ff" />
                    <YAxis stroke="#64c8ff" />
                    <Tooltip
                      contentStyle={{ background: 'rgba(0, 0, 0, 0.8)', border: '1px solid #64c8ff' }}
                      labelStyle={{ color: '#64c8ff' }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="value" stroke="#64c8ff" strokeWidth={2} name="실제값" />
                    <Line type="monotone" dataKey="forecast" stroke="#ffd700" strokeWidth={2} name="예측값" strokeDasharray="5 5" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <GlassmorphicIcon Icon={Target} gradient="from-orange-400 to-red-500" size={20} />
                예측 데이터
              </h3>
              <div className="chart-container">
                <div className="stats-grid">
                  {Object.entries(dashboard.forecasts).map(([name, forecasts]: [string, any]) => (
                    <div key={name}>
                      <div className="stat-label">{name} 예측</div>
                      <div className="metrics-row">
                        {forecasts.map((value: number, idx: number) => (
                          <div key={idx} className="metric-badge">
                            <div className="metric-label">T+{idx + 1}</div>
                            <div className="metric-value">{value.toFixed(1)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'forecast' && <ExaoneTabularPanel />}
      {(activeTab === 'descriptive' || activeTab === 'timeseries' || activeTab === 'forecast' || activeTab === 'anomaly') && (
        <>
          <div className="input-section">
            <label className="input-label">데이터 입력 (쉼표로 구분)</label>
            <input
              className="input-field"
              value={dataInput}
              onChange={(e) => setDataInput(e.target.value)}
              placeholder="예: 10,20,30,40,50"
            />
            <div className="button-group">
              {activeTab === 'descriptive' && (
                <button
                  className="analyze-btn"
                  onClick={() => handleAnalyze('descriptive')}
                  disabled={loading}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <BarChart3 size={18} />
                  {loading ? '분석 중...' : '기술통계 분석'}
                </button>
              )}
              {activeTab === 'timeseries' && (
                <button
                  className="analyze-btn"
                  onClick={() => handleAnalyze('timeseries')}
                  disabled={loading}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <TrendingDown size={18} />
                  {loading ? '분석 중...' : '시계열 분석'}
                </button>
              )}
              {activeTab === 'forecast' && (
                <button
                  className="analyze-btn"
                  onClick={() => handleAnalyze('forecast')}
                  disabled={loading}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <Zap size={18} />
                  {loading ? '분석 중...' : '예측 생성'}
                </button>
              )}
              {activeTab === 'anomaly' && (
                <button
                  className="analyze-btn"
                  onClick={() => handleAnalyze('anomaly-detection')}
                  disabled={loading}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <AlertCircle size={18} />
                  {loading ? '분석 중...' : '이상탐지'}
                </button>
              )}
            </div>
          </div>

          {loading && (
            <div className="loading">
              <div className="spinner"></div>
              <p>분석 중...</p>
            </div>
          )}

          {results && (
            <div className="results-section">
              {results.success && results.results ? (
                <>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <GlassmorphicIcon Icon={Brain} gradient="from-purple-400 to-pink-500" size={20} />
                    분석 결과
                  </h3>

                  {activeTab === 'descriptive' && (
                    <>
                      <div className="stats-grid">
                        <div className="stat-card">
                          <span className="stat-label">평균</span>
                          <span className="stat-value">{results.results.mean?.toFixed(2)}</span>
                        </div>
                        <div className="stat-card">
                          <span className="stat-label">중앙값</span>
                          <span className="stat-value">{results.results.median?.toFixed(2)}</span>
                        </div>
                        <div className="stat-card">
                          <span className="stat-label">표준편차</span>
                          <span className="stat-value">{results.results.std_dev?.toFixed(2)}</span>
                        </div>
                        <div className="stat-card">
                          <span className="stat-label">분산</span>
                          <span className="stat-value">{results.results.variance?.toFixed(2)}</span>
                        </div>
                        <div className="stat-card">
                          <span className="stat-label">최소값</span>
                          <span className="stat-value">{results.results.min?.toFixed(2)}</span>
                        </div>
                        <div className="stat-card">
                          <span className="stat-label">최대값</span>
                          <span className="stat-value">{results.results.max?.toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="chart-container">
                        <ResponsiveContainer width="100%" height={400}>
                          <BarChart data={dataInput.split(',').map((v, i) => ({ idx: i, value: parseFloat(v) }))}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(100, 200, 255, 0.2)" />
                            <XAxis dataKey="idx" stroke="#64c8ff" />
                            <YAxis stroke="#64c8ff" />
                            <Tooltip
                              contentStyle={{ background: 'rgba(0, 0, 0, 0.8)', border: '1px solid #64c8ff' }}
                              labelStyle={{ color: '#64c8ff' }}
                            />
                            <Bar dataKey="value" fill="#64c8ff" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </>
                  )}

                  {activeTab === 'timeseries' && (
                    <>
                      <div className="stats-grid">
                        <div className="stat-card">
                          <span className="stat-label">추세</span>
                          <span className="stat-value">{results.results.trend === 'uptrend' ? '📈' : '📉'}</span>
                        </div>
                        <div className="stat-card">
                          <span className="stat-label">계절성</span>
                          <span className="stat-value">{results.results.seasonality ? '있음' : '없음'}</span>
                        </div>
                        <div className="stat-card">
                          <span className="stat-label">변동성</span>
                          <span className="stat-value">{results.results.volatility?.toFixed(2)}</span>
                        </div>
                        <div className="stat-card">
                          <span className="stat-label">자기상관</span>
                          <span className="stat-value">{results.results.autocorrelation?.toFixed(2)}</span>
                        </div>
                      </div>
                    </>
                  )}

                  {activeTab === 'forecast' && (
                    <>
                      <div className="chart-container">
                        <ResponsiveContainer width="100%" height={400}>
                          <LineChart data={sampleTimeSeries}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(100, 200, 255, 0.2)" />
                            <XAxis dataKey="time" stroke="#64c8ff" />
                            <YAxis stroke="#64c8ff" />
                            <Tooltip
                              contentStyle={{ background: 'rgba(0, 0, 0, 0.8)', border: '1px solid #64c8ff' }}
                              labelStyle={{ color: '#64c8ff' }}
                            />
                            <Legend />
                            <Line type="monotone" dataKey="value" stroke="#64c8ff" strokeWidth={2} name="실제값" />
                            <Line type="monotone" dataKey="forecast" stroke="#ffd700" strokeWidth={2} name="예측값" strokeDasharray="5 5" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="stats-grid">
                        {results.results.forecasts?.map((forecast: number, idx: number) => (
                          <div key={idx} className="stat-card">
                            <span className="stat-label">예측 T+{idx + 1}</span>
                            <span className="stat-value">{forecast.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {activeTab === 'anomaly' && (
                    <>
                      <div className="stats-grid">
                        <div className="stat-card">
                          <span className="stat-label">이상 개수</span>
                          <span className="stat-value">{results.results.anomalies_count}</span>
                        </div>
                        <div className="stat-card">
                          <span className="stat-label">이상 비율</span>
                          <span className="stat-value">{results.results.anomaly_rate?.toFixed(1)}%</span>
                        </div>
                        <div className="stat-card">
                          <span className="stat-label">심각도</span>
                          <span className="stat-value">{results.results.severity}</span>
                        </div>
                      </div>

                      <div className="chart-container">
                        <ResponsiveContainer width="100%" height={400}>
                          <ScatterChart>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(100, 200, 255, 0.2)" />
                            <XAxis dataKey="id" stroke="#64c8ff" />
                            <YAxis stroke="#64c8ff" />
                            <Tooltip
                              contentStyle={{ background: 'rgba(0, 0, 0, 0.8)', border: '1px solid #64c8ff' }}
                              labelStyle={{ color: '#64c8ff' }}
                            />
                            <Scatter name="정상" data={anomalyData.filter(d => d.type === 'normal')} fill="#64c8ff" />
                            <Scatter name="이상" data={anomalyData.filter(d => d.type === 'anomaly')} fill="#ff6b6b" />
                          </ScatterChart>
                        </ResponsiveContainer>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="error-message">
                  ❌ 오류: {results.error}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Statistics;
