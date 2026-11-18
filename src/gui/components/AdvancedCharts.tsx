import React, { useState, useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, ScatterChart, Scatter, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  Heatmap
} from 'recharts';
import {
  TrendingUp, BarChart3, PieChart as PieChartIcon,
  Dot as ScatterIcon, Combine, Radar as RadarIcon,
  Plus, Trash2, Activity, LayoutGrid
} from 'lucide-react';
import { GlassmorphicIcon } from './GlassmorphicIcon';

type ChartType = 'line' | 'bar' | 'pie' | 'area' | 'scatter' | 'composed' | 'radar';

interface ChartConfig {
  type: ChartType;
  title: string;
  data: any[];
  xDataKey?: string;
  yDataKey?: string;
  colors?: string[];
  showLegend?: boolean;
  showGrid?: boolean;
  animated?: boolean;
}

export const AdvancedCharts: React.FC = () => {
  const [selectedChart, setSelectedChart] = useState<ChartType>('line');
  const [customData, setCustomData] = useState<string>('');
  const [chartConfigs, setChartConfigs] = useState<ChartConfig[]>([]);

  // 샘플 데이터
  const sampleLineData = [
    { month: '1월', revenue: 4000, profit: 2400, cost: 1600 },
    { month: '2월', revenue: 3000, profit: 1398, cost: 1600 },
    { month: '3월', revenue: 2000, profit: 9800, cost: 2300 },
    { month: '4월', revenue: 2780, profit: 3908, cost: 2000 },
    { month: '5월', revenue: 1890, profit: 4800, cost: 2100 },
    { month: '6월', revenue: 2390, profit: 3800, cost: 2200 },
  ];

  const samplePieData = [
    { name: 'Frontend', value: 35 },
    { name: 'Backend', value: 25 },
    { name: 'DevOps', value: 20 },
    { name: 'Testing', value: 15 },
    { name: 'Documentation', value: 5 },
  ];

  const sampleRadarData = [
    { category: '속도', value: 85 },
    { category: '정확성', value: 92 },
    { category: '메모리', value: 78 },
    { category: '확장성', value: 88 },
    { category: '안정성', value: 95 },
  ];

  const sampleScatterData = [
    { x: 20, y: 45 },
    { x: 30, y: 55 },
    { x: 40, y: 48 },
    { x: 50, y: 65 },
    { x: 60, y: 70 },
    { x: 70, y: 75 },
    { x: 80, y: 68 },
  ];

  const COLORS = ['#64c8ff', '#ffd700', '#4ade80', '#ff6b6b', '#a78bfa', '#06b6d4'];

  const renderChart = (config: ChartConfig) => {
    const commonProps = {
      data: config.data,
      margin: { top: 5, right: 30, left: 0, bottom: 5 }
    };

    switch (config.type) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(100, 200, 255, 0.2)" />
              <XAxis dataKey={config.xDataKey || 'month'} stroke="#64c8ff" />
              <YAxis stroke="#64c8ff" />
              <Tooltip contentStyle={{ background: 'rgba(0, 0, 0, 0.8)', border: '1px solid #64c8ff' }} />
              {config.showLegend && <Legend />}
              <Line type="monotone" dataKey="revenue" stroke={COLORS[0]} strokeWidth={2} dot={{ fill: COLORS[0], r: 4 }} />
              <Line type="monotone" dataKey="profit" stroke={COLORS[1]} strokeWidth={2} dot={{ fill: COLORS[1], r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(100, 200, 255, 0.2)" />
              <XAxis dataKey={config.xDataKey || 'month'} stroke="#64c8ff" />
              <YAxis stroke="#64c8ff" />
              <Tooltip contentStyle={{ background: 'rgba(0, 0, 0, 0.8)', border: '1px solid #64c8ff' }} />
              {config.showLegend && <Legend />}
              <Bar dataKey="revenue" fill={COLORS[0]} radius={[8, 8, 0, 0]} />
              <Bar dataKey="profit" fill={COLORS[1]} radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart {...commonProps}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS[0]} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={COLORS[0]} stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS[1]} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={COLORS[1]} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(100, 200, 255, 0.2)" />
              <XAxis dataKey={config.xDataKey || 'month'} stroke="#64c8ff" />
              <YAxis stroke="#64c8ff" />
              <Tooltip contentStyle={{ background: 'rgba(0, 0, 0, 0.8)', border: '1px solid #64c8ff' }} />
              {config.showLegend && <Legend />}
              <Area type="monotone" dataKey="revenue" stroke={COLORS[0]} fillOpacity={1} fill="url(#colorRevenue)" />
              <Area type="monotone" dataKey="profit" stroke={COLORS[1]} fillOpacity={1} fill="url(#colorProfit)" />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={samplePieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name} ${value}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {samplePieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: 'rgba(0, 0, 0, 0.8)', border: '1px solid #64c8ff' }} />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(100, 200, 255, 0.2)" />
              <XAxis type="number" dataKey="x" stroke="#64c8ff" />
              <YAxis type="number" dataKey="y" stroke="#64c8ff" />
              <Tooltip contentStyle={{ background: 'rgba(0, 0, 0, 0.8)', border: '1px solid #64c8ff' }} />
              <Scatter name="데이터" data={sampleScatterData} fill={COLORS[0]} />
            </ScatterChart>
          </ResponsiveContainer>
        );

      case 'composed':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(100, 200, 255, 0.2)" />
              <XAxis dataKey={config.xDataKey || 'month'} stroke="#64c8ff" />
              <YAxis stroke="#64c8ff" />
              <Tooltip contentStyle={{ background: 'rgba(0, 0, 0, 0.8)', border: '1px solid #64c8ff' }} />
              {config.showLegend && <Legend />}
              <Area type="monotone" dataKey="revenue" fill={COLORS[0]} stroke={COLORS[0]} fillOpacity={0.4} />
              <Line type="monotone" dataKey="profit" stroke={COLORS[1]} strokeWidth={2} />
              <Bar dataKey="cost" fill={COLORS[2]} />
            </ComposedChart>
          </ResponsiveContainer>
        );

      case 'radar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={sampleRadarData}>
              <PolarGrid stroke="rgba(100, 200, 255, 0.3)" />
              <PolarAngleAxis dataKey="category" stroke="#64c8ff" />
              <PolarRadiusAxis stroke="#64c8ff" />
              <Radar name="성능" dataKey="value" stroke={COLORS[0]} fill={COLORS[0]} fillOpacity={0.6} />
              <Tooltip contentStyle={{ background: 'rgba(0, 0, 0, 0.8)', border: '1px solid #64c8ff' }} />
            </RadarChart>
          </ResponsiveContainer>
        );

      default:
        return <div>차트 타입을 선택하세요</div>;
    }
  };

  const handleAddChart = () => {
    const newChart: ChartConfig = {
      type: selectedChart,
      title: `${selectedChart.toUpperCase()} Chart`,
      data: selectedChart === 'radar' ? sampleRadarData : selectedChart === 'scatter' ? sampleScatterData : selectedChart === 'pie' ? samplePieData : sampleLineData,
      showLegend: true,
      showGrid: true,
      animated: true,
    };
    setChartConfigs([...chartConfigs, newChart]);
  };

  const handleRemoveChart = (index: number) => {
    setChartConfigs(chartConfigs.filter((_, i) => i !== index));
  };

  return (
    <div className="advanced-charts-container">
      <style>{`
        .advanced-charts-container {
          padding: 20px;
          background: linear-gradient(135deg, #1e1e2e 0%, #2d2d44 100%);
          border-radius: 12px;
          color: #e0e0e0;
          height: 100%;
          overflow-y: auto;
        }

        .charts-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          border-bottom: 2px solid rgba(100, 200, 255, 0.3);
          padding-bottom: 16px;
        }

        .charts-title {
          font-size: 24px;
          font-weight: bold;
          background: linear-gradient(90deg, #64c8ff, #ffd700);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .chart-selector {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin: 16px 0;
          padding: 16px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 8px;
          border: 1px solid rgba(100, 200, 255, 0.2);
        }

        .chart-type-btn {
          padding: 8px 16px;
          background: rgba(100, 200, 255, 0.1);
          color: #e0e0e0;
          border: 2px solid transparent;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.3s ease;
          font-weight: 500;
          text-transform: uppercase;
          font-size: 12px;
        }

        .chart-type-btn:hover {
          background: rgba(100, 200, 255, 0.2);
          border-color: #64c8ff;
        }

        .chart-type-btn.active {
          background: linear-gradient(90deg, #64c8ff, #4a9fff);
          border-color: #64c8ff;
        }

        .add-chart-btn {
          padding: 10px 20px;
          background: linear-gradient(90deg, #4ade80, #22c55e);
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.3s ease;
        }

        .add-chart-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(74, 222, 128, 0.4);
        }

        .charts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
          gap: 20px;
          margin: 20px 0;
        }

        .chart-card {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(100, 200, 255, 0.2);
          border-radius: 8px;
          padding: 16px;
          position: relative;
        }

        .chart-card-title {
          font-size: 14px;
          font-weight: 600;
          color: #ffd700;
          margin-bottom: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .chart-card-remove {
          background: #ff6b6b;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 4px 12px;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.3s ease;
        }

        .chart-card-remove:hover {
          background: #ff5252;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: rgba(224, 224, 224, 0.5);
        }

        .empty-icon {
          font-size: 64px;
          margin-bottom: 16px;
        }

        .chart-types-info {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 12px;
          margin: 20px 0;
        }

        .info-badge {
          background: rgba(100, 200, 255, 0.1);
          border: 1px solid rgba(100, 200, 255, 0.3);
          border-radius: 6px;
          padding: 12px;
          text-align: center;
          font-size: 12px;
        }

        .info-icon {
          font-size: 20px;
          margin-bottom: 4px;
        }

        .info-title {
          font-weight: 600;
          color: #64c8ff;
        }

        .responsive-note {
          padding: 12px;
          background: rgba(100, 200, 255, 0.05);
          border-left: 3px solid #64c8ff;
          border-radius: 4px;
          margin: 16px 0;
          font-size: 12px;
          color: rgba(224, 224, 224, 0.8);
        }

        @media (max-width: 1000px) {
          .charts-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="charts-header">
        <div className="charts-title">📊 고급 시각화 대시보드</div>
      </div>

      <div className="responsive-note">
        💡 다양한 차트 타입을 선택하고 조합하여 데이터를 시각화하세요. 각 차트는 독립적으로 상호작용할 수 있습니다.
      </div>

      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#ffd700' }}>📈 차트 타입 선택</div>
        <div className="chart-selector">
          {['line', 'bar', 'area', 'pie', 'scatter', 'composed', 'radar'].map((type) => {
            const iconMap: { [key: string]: any } = {
              line: TrendingUp,
              bar: BarChart3,
              area: TrendingUp,
              pie: PieChartIcon,
              scatter: ScatterIcon,
              composed: Combine,
              radar: RadarIcon
            };
            const gradientMap: { [key: string]: string } = {
              line: 'from-blue-400 to-cyan-500',
              bar: 'from-purple-400 to-pink-500',
              area: 'from-green-400 to-emerald-500',
              pie: 'from-orange-400 to-red-500',
              scatter: 'from-yellow-400 to-amber-500',
              composed: 'from-indigo-400 to-purple-500',
              radar: 'from-pink-400 to-rose-500'
            };
            return (
              <button
                key={type}
                className={`chart-type-btn ${selectedChart === type ? 'active' : ''}`}
                onClick={() => setSelectedChart(type as ChartType)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <GlassmorphicIcon
                    Icon={iconMap[type]}
                    gradient={gradientMap[type]}
                    size={18}
                  />
                </div>
                {type}
              </button>
            );
          })}
        </div>
        <button className="add-chart-btn" onClick={handleAddChart} style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
          <GlassmorphicIcon Icon={Plus} gradient="from-green-400 to-emerald-500" size={20} />
          차트 추가
        </button>
      </div>

      <div className="chart-types-info">
        <div className="info-badge">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
            <GlassmorphicIcon Icon={TrendingUp} gradient="from-blue-400 to-cyan-500" size={24} />
          </div>
          <div className="info-title">Line</div>
          <div style={{ fontSize: '11px', marginTop: '4px' }}>추세 분석</div>
        </div>
        <div className="info-badge">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
            <GlassmorphicIcon Icon={BarChart3} gradient="from-purple-400 to-pink-500" size={24} />
          </div>
          <div className="info-title">Bar</div>
          <div style={{ fontSize: '11px', marginTop: '4px' }}>비교 분석</div>
        </div>
        <div className="info-badge">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
            <GlassmorphicIcon Icon={Activity} gradient="from-green-400 to-emerald-500" size={24} />
          </div>
          <div className="info-title">Area</div>
          <div style={{ fontSize: '11px', marginTop: '4px' }}>누적 표현</div>
        </div>
        <div className="info-badge">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
            <GlassmorphicIcon Icon={PieChartIcon} gradient="from-orange-400 to-red-500" size={24} />
          </div>
          <div className="info-title">Pie</div>
          <div style={{ fontSize: '11px', marginTop: '4px' }}>비율 표현</div>
        </div>
        <div className="info-badge">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
            <GlassmorphicIcon Icon={ScatterIcon} gradient="from-yellow-400 to-amber-500" size={24} />
          </div>
          <div className="info-title">Scatter</div>
          <div style={{ fontSize: '11px', marginTop: '4px' }}>상관관계</div>
        </div>
        <div className="info-badge">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
            <GlassmorphicIcon Icon={RadarIcon} gradient="from-pink-400 to-rose-500" size={24} />
          </div>
          <div className="info-title">Radar</div>
          <div style={{ fontSize: '11px', marginTop: '4px' }}>다차원 비교</div>
        </div>
      </div>

      {chartConfigs.length > 0 ? (
        <div className="charts-grid">
          {chartConfigs.map((config, index) => (
            <div key={index} className="chart-card">
              <div className="chart-card-title">
                <span>{config.title}</span>
                <button
                  className="chart-card-remove"
                  onClick={() => handleRemoveChart(index)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <GlassmorphicIcon Icon={Trash2} gradient="from-red-400 to-pink-500" size={16} />
                  제거
                </button>
              </div>
              {renderChart(config)}
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <GlassmorphicIcon Icon={LayoutGrid} gradient="from-blue-400 to-purple-500" size={48} />
          </div>
          <div>차트를 추가하여 시각화를 시작하세요</div>
          <div style={{ fontSize: '12px', marginTop: '8px', color: 'rgba(224, 224, 224, 0.3)' }}>
            위에서 차트 타입을 선택하고 "차트 추가" 버튼을 클릭하세요
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedCharts;
