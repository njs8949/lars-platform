import React, { useState, useMemo } from 'react';
import { Zap, Plus, Search, TrendingUp, Gauge, Zap as Lightning, AlertCircle, Check, RefreshCw, Rocket, Activity, Sparkles } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { GlassmorphicIcon } from './components/GlassmorphicIcon';
import { FeatureHeader, KpiGrid, EmptyState, PanelStats } from './components/feature/FeatureUI';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';

export const PerformanceDashboard = () => {
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [selectedProjectPath, setSelectedProjectPath] = useState<string>('프로젝트 폴더 선택');
  const [fileInputRef, setFileInputRef] = useState<HTMLInputElement | null>(null);
  const [analyses, setAnalyses] = useState<any[]>([
    { id: 1, project: 'Landing Page', lcp: 1.2, fid: 45, cls: 0.05, score: 95, status: 'good', created: '2024-01-15' },
    { id: 2, project: 'Dashboard', lcp: 1.8, fid: 62, cls: 0.08, score: 88, status: 'good', created: '2024-01-14' },
    { id: 3, project: 'Mobile App', lcp: 2.1, fid: 78, cls: 0.12, score: 81, status: 'fair', created: '2024-01-13' }
  ]);

  const handleFolderSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const folder = (files[0] as any).webkitRelativePath?.split('/')[0] || files[0].name;
      setSelectedProjectPath(folder);
      setProjectName(folder);
    }
  };

  const handleAnalyze = async () => {
    const finalProjectName = projectName.trim() || selectedProjectPath;

    console.log('🔍 분석 시작:', { finalProjectName, selectedProjectPath, projectName });

    if (!finalProjectName || finalProjectName === '프로젝트 폴더 선택') {
      alert('프로젝트를 선택하거나 프로젝트명을 입력해주세요');
      return;
    }

    try {
      setLoading(true);
      const url = `${API_URL}/advanced-design/performance/analyze`;
      const body = new URLSearchParams({
        project_name: finalProjectName,
        project_path: selectedProjectPath === '프로젝트 폴더 선택' ? '' : selectedProjectPath,
        html_content: '<html></html>'
      });

      console.log('📡 API 요청:', { url, body: body.toString() });

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body
      });

      console.log('📨 API 응답 상태:', response.status, response.statusText);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ 분석 완료:', data);

        setAnalyses([{
          id: Date.now(),
          project: finalProjectName,
          lcp: data.metrics?.LCP?.score || 1.5,
          fid: data.metrics?.FID?.score || 50,
          cls: data.metrics?.CLS?.score || 0.05,
          score: data.performance_score || 95,
          status: data.performance_score >= 90 ? 'good' : data.performance_score >= 75 ? 'fair' : 'poor',
          created: new Date().toISOString().split('T')[0],
          recommendations: data.recommendations || [],
          summary: data.analysis_summary || {}
        }, ...analyses]);
        setProjectName('');
        setSelectedProjectPath('프로젝트 폴더 선택');
        setShowNewModal(false);
        alert('✅ 분석이 완료되었습니다!');
      } else {
        const errorData = await response.text();
        console.error('❌ API 에러:', response.status, errorData);
        alert(`분석 실패: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ 분석 실패:', error);
      alert(`네트워크 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      setLoading(false);
    }
  };

  const timelineData = [
    { date: '1/11', score: 82, lcp: 2.1, fid: 85 },
    { date: '1/12', score: 85, lcp: 1.9, fid: 72 },
    { date: '1/13', score: 88, lcp: 1.8, fid: 65 },
    { date: '1/14', score: 91, lcp: 1.5, fid: 48 },
    { date: '1/15', score: 95, lcp: 1.2, fid: 45 },
    { date: '1/16', score: 93, lcp: 1.4, fid: 52 }
  ];

  const filteredAnalyses = useMemo(() => {
    return analyses.filter(a => {
      const matchesSearch = a.project.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesMetric = !selectedMetric || a.status === selectedMetric;
      return matchesSearch && matchesMetric;
    });
  }, [analyses, searchTerm, selectedMetric]);

  const stats = {
    avgScore: Math.round(analyses.reduce((sum, a) => sum + a.score, 0) / analyses.length),
    goodCount: analyses.filter(a => a.score >= 90).length,
    avgLcp: (analyses.reduce((sum, a) => sum + a.lcp, 0) / analyses.length).toFixed(2),
    avgFid: Math.round(analyses.reduce((sum, a) => sum + a.fid, 0) / analyses.length),
    total: analyses.length
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return '#4ade80';
    if (score >= 75) return '#fcd34d';
    return '#ff6b9d';
  };

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%', background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}>
      {/* 좌측 사이드바 */}
      <div style={{ width: '280px', borderRight: '1px solid rgba(100,150,255,0.2)', overflow: 'auto', padding: '20px', background: 'rgba(0,0,0,0.3)' }}>
        <h3 style={{ fontSize: '13px', color: 'rgba(224,224,224,0.5)', textTransform: 'uppercase', fontWeight: '600', marginBottom: '20px' }}>필터</h3>

        {/* 검색 */}
        <div style={{ marginBottom: '16px', position: 'relative' }}>
          <input
            type="text"
            placeholder="프로젝트 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', background: 'rgba(100,150,255,0.1)', border: '1px solid rgba(100,150,255,0.2)', borderRadius: '8px', color: '#e0e0e0', fontSize: '13px' }}
          />
          <Search size={14} style={{ position: 'absolute', right: '12px', top: '12px', color: 'rgba(224,224,224,0.4)' }} />
        </div>

        {/* 성능 필터 */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', color: 'rgba(224,224,224,0.5)', marginBottom: '8px', fontWeight: '600' }}>성능</div>
          {[{ key: 'good', label: '좋음 (90+)', icon: Check, color: '#4ade80' }, { key: 'fair', label: '중간 (75-89)', icon: AlertCircle, color: '#fcd34d' }, { key: 'poor', label: '낮음 (-75)', icon: Rocket, color: '#ff6b9d' }].map(({ key, label, icon: Icon, color }) => (
            <button
              key={key}
              onClick={() => setSelectedMetric(selectedMetric === key ? null : key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                padding: '10px 12px',
                marginBottom: '6px',
                background: selectedMetric === key ? 'rgba(100,150,255,0.3)' : 'rgba(100,150,255,0.1)',
                border: `1px solid ${selectedMetric === key ? 'rgba(100,150,255,0.5)' : 'rgba(100,150,255,0.2)'}`,
                borderRadius: '6px',
                color: '#e0e0e0',
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <Icon size={14} color={color} />
              {label}
            </button>
          ))}
        </div>

        {/* 통계 */}
        <PanelStats items={[
          { label: '평균 점수', value: stats.avgScore, tone: 'green' },
          { label: '좋음', value: `${stats.goodCount}개`, tone: 'green' },
          { label: '평균 LCP', value: `${stats.avgLcp}s`, tone: 'amber' },
          { label: '평균 FID', value: `${stats.avgFid}ms`, tone: 'amber' },
        ]} />
      </div>

      {/* 우측 콘텐츠 */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* 헤더 */}
        <div style={{ padding: '24px', borderBottom: '1px solid rgba(100,150,255,0.2)', background: 'linear-gradient(135deg, rgba(0,0,0,0.4) 0%, rgba(100,150,255,0.1) 100%)' }}>
          <FeatureHeader
            icon={<GlassmorphicIcon Icon={Gauge} gradient="from-yellow-400 to-orange-500" size={40} />}
            title="성능 최적화"
            subtitle="성능 병목을 찾고 개선안을 제시합니다"
            badge="AI"
            actions={
              <>
            <button
              onClick={() => setShowNewModal(true)}
              style={{ padding: '10px 18px', background: 'linear-gradient(135deg, #646cff 0%, #4c47ff 100%)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 8px 16px rgba(100,108,255,0.3)' }}
            >
              <Rocket size={16} /> 분석 시작
            </button>
              </>
            }
          />
          <KpiGrid
            items={[
              { label: '분석 페이지', value: stats.total, tone: 'blue' },
              { label: '평균 점수', value: stats.total ? stats.avgScore : '-', tone: 'green' },
              { label: '우수 (90점 이상)', value: stats.goodCount, tone: 'violet' },
              { label: '평균 LCP', value: stats.total ? `${stats.avgLcp}s` : '-', tone: 'amber' },
            ]}
          />

          {/* 숨겨진 파일 input */}
          <input
            ref={setFileInputRef}
            type="file"
            webkitdirectory=""
            style={{ display: 'none' }}
            onChange={handleFolderSelect}
          />

          {/* 프로젝트 선택 */}
          <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <label style={{ fontSize: '13px', fontWeight: '600', color: 'rgba(224,224,224,0.7)' }}>분석할 프로젝트:</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
              <div style={{ padding: '10px 12px', background: 'linear-gradient(135deg, rgba(100,150,255,0.15) 0%, rgba(100,150,255,0.05) 100%)', border: '1px solid rgba(100,150,255,0.3)', borderRadius: '8px', color: '#e0e0e0', fontSize: '13px', fontWeight: '600', minWidth: '200px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                📁 {selectedProjectPath}
              </div>
              <button
                onClick={() => fileInputRef?.click()}
                style={{ padding: '10px 16px', background: 'linear-gradient(135deg, rgba(100,150,255,0.3) 0%, rgba(100,150,255,0.1) 100%)', color: '#cbd5e1', border: '1px solid rgba(100,150,255,0.3)', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', transition: 'all 0.2s' }}
              >
                📂 폴더 선택
              </button>
            </div>
            <button onClick={() => { setProjectName(selectedProjectPath); setShowNewModal(true); }} style={{ padding: '10px 16px', background: 'linear-gradient(135deg, #646cff 0%, #4c47ff 100%)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>분석</button>
          </div>

          {/* 성능 메트릭 요약 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
            {[
              { label: 'Lighthouse 점수', value: stats.avgScore, icon: <Gauge size={18} />, color: '#4ade80' },
              { label: 'LCP', value: `${stats.avgLcp}s`, icon: <Lightning size={18} />, color: '#fcd34d' },
              { label: 'FID', value: `${stats.avgFid}ms`, icon: <Zap size={18} />, color: '#f87171' },
              { label: '최적화됨', value: `${stats.goodCount}/${stats.total}`, icon: <Check size={18} />, color: '#4ade80' }
            ].map((metric, idx) => (
              <div key={idx} style={{ background: 'rgba(100,150,255,0.1)', border: '1px solid rgba(100,150,255,0.2)', borderRadius: '12px', padding: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ color: metric.color, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', background: `${metric.color}20`, borderRadius: '10px' }}>
                  {metric.icon}
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'rgba(224,224,224,0.6)' }}>{metric.label}</div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: metric.color }}>{metric.value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* 성능 추이 차트 */}
          <div style={{ background: 'rgba(100,150,255,0.1)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(100,150,255,0.2)' }}>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={timelineData}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4ade80" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#4ade80" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,150,255,0.1)" />
                <XAxis dataKey="date" stroke="rgba(224,224,224,0.4)" />
                <YAxis stroke="rgba(224,224,224,0.4)" />
                <Tooltip contentStyle={{ background: 'rgba(0,0,0,0.9)', border: '1px solid rgba(100,150,255,0.4)', borderRadius: '8px' }} />
                <Area type="monotone" dataKey="score" stroke="#4ade80" fillOpacity={1} fill="url(#colorScore)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        {analyses.length === 0 && (
          <div style={{ margin: '24px' }}>
            <EmptyState
              icon={<GlassmorphicIcon Icon={Gauge} gradient="from-yellow-400 to-orange-500" size={32} />}
              title="분석한 페이지가 없습니다"
              description="페이지 주소를 입력하면 로딩 속도, 반응성, 시각적 안정성을 측정하고 개선안을 제시합니다."
              steps={['분석할 페이지 주소 입력', '측정 기기와 네트워크 조건 선택', '점수와 개선 항목을 이 화면에서 확인']}
              tab="performance"
              examples={['랜딩 페이지 주소 측정', '모바일 로딩 속도 비교', 'LCP 개선 항목 찾기']}
              action={{ label: '분석 시작', onClick: () => setShowNewModal(true) }}
            />
          </div>
        )}

        {/* 분석 목록 */}
        <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
            {filteredAnalyses.map(analysis => (
              <div key={analysis.id} style={{ background: 'linear-gradient(135deg, rgba(100,150,255,0.15) 0%, rgba(100,150,255,0.05) 100%)', border: '1px solid rgba(100,150,255,0.3)', borderRadius: '16px', padding: '20px', transition: 'all 0.3s', cursor: 'pointer' }}>
                {/* 헤더 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#fff' }}>{analysis.project}</h3>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: getScoreColor(analysis.score),
                    padding: '6px 12px',
                    borderRadius: '8px',
                    color: '#000',
                    fontSize: '13px',
                    fontWeight: '700'
                  }}>
                    <Activity size={14} />
                    {analysis.score}
                  </div>
                </div>

                {/* 메트릭 */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  {[
                    { label: 'LCP', value: analysis.lcp.toFixed(2), unit: 's', color: '#fcd34d', icon: Lightning },
                    { label: 'FID', value: analysis.fid, unit: 'ms', color: '#f87171', icon: Zap },
                    { label: 'CLS', value: analysis.cls.toFixed(3), unit: '', color: '#60a5fa', icon: TrendingUp },
                    { label: '상태', value: '최적화', unit: '됨', color: '#4ade80', icon: Check }
                  ].map((metric, idx) => {
                    const Icon = metric.icon;
                    return (
                      <div key={idx} style={{ background: 'rgba(100,150,255,0.1)', borderRadius: '10px', padding: '12px', display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid rgba(100,150,255,0.15)' }}>
                        <div style={{ color: metric.color, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', background: `${metric.color}20`, borderRadius: '8px' }}>
                          <Icon size={16} />
                        </div>
                        <div>
                          <div style={{ fontSize: '10px', color: 'rgba(224,224,224,0.6)' }}>{metric.label}</div>
                          <div style={{ fontSize: '14px', fontWeight: '700', color: metric.color }}>
                            {metric.value}{metric.unit}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 프로젝트 통계 */}
                {analysis.summary && Object.keys(analysis.summary).length > 0 && (
                  <div style={{ background: 'rgba(100,150,255,0.05)', borderRadius: '10px', padding: '12px', marginBottom: '16px', border: '1px solid rgba(100,150,255,0.15)' }}>
                    <div style={{ fontSize: '11px', color: 'rgba(224,224,224,0.7)', fontWeight: '600', marginBottom: '8px' }}>📊 분석 통계</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', color: '#cbd5e1' }}>
                      <div>📁 파일: {analysis.summary.total_files}</div>
                      <div>📦 크기: {analysis.summary.total_size_mb}MB</div>
                      <div>📝 JS: {analysis.summary.js_files}</div>
                      <div>🎨 CSS: {analysis.summary.css_files}</div>
                      <div>🖼️ 이미지: {analysis.summary.image_files}</div>
                      <div>🔤 폰트: {analysis.summary.font_files}</div>
                    </div>
                  </div>
                )}

                {/* 최적화 제안 */}
                {analysis.recommendations && analysis.recommendations.length > 0 && (
                  <div style={{ background: 'rgba(100,150,255,0.05)', borderRadius: '10px', padding: '12px', marginBottom: '16px', border: '1px solid rgba(100,150,255,0.15)' }}>
                    <div style={{ fontSize: '11px', color: 'rgba(224,224,224,0.7)', fontWeight: '600', marginBottom: '8px' }}>💡 최적화 제안</div>
                    <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: '#cbd5e1', lineHeight: '1.6' }}>
                      {analysis.recommendations.slice(0, 5).map((rec, idx) => (
                        <li key={idx} style={{ marginBottom: '4px' }}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 액션 버튼 */}
                <button style={{
                  width: '100%',
                  padding: '10px',
                  background: 'linear-gradient(135deg, rgba(100,150,255,0.3) 0%, rgba(100,150,255,0.1) 100%)',
                  border: '1px solid rgba(100,150,255,0.3)',
                  borderRadius: '8px',
                  color: '#cbd5e1',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '600',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}>
                  <RefreshCw size={14} />
                  다시 분석
                </button>

                <div style={{ fontSize: '10px', color: 'rgba(224,224,224,0.4)', paddingTop: '12px', borderTop: '1px solid rgba(100,150,255,0.1)', marginTop: '12px' }}>
                  📅 {analysis.created}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 모달 */}
      {showNewModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', border: '1px solid rgba(100,150,255,0.2)', borderRadius: '16px', padding: '32px', width: '480px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#fff', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Zap size={20} color="#fcd34d" />
              성능 분석 추가
            </h2>

            {/* 폴더 선택 섹션 */}
            <div style={{ marginBottom: '24px', background: 'rgba(100,150,255,0.1)', border: '1px solid rgba(100,150,255,0.2)', borderRadius: '12px', padding: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: 'rgba(224,224,224,0.7)', marginBottom: '12px', fontWeight: '600' }}>📁 프로젝트 폴더 선택</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ flex: 1, padding: '10px 12px', background: 'rgba(100,150,255,0.05)', border: '1px solid rgba(100,150,255,0.2)', borderRadius: '8px', color: '#cbd5e1', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selectedProjectPath === '프로젝트 폴더 선택' ? '📂 폴더를 선택해주세요' : selectedProjectPath}
                </div>
                <button
                  onClick={() => fileInputRef?.click()}
                  style={{ padding: '10px 16px', background: 'linear-gradient(135deg, rgba(100,150,255,0.3) 0%, rgba(100,150,255,0.1) 100%)', border: '1px solid rgba(100,150,255,0.3)', borderRadius: '8px', color: '#cbd5e1', cursor: 'pointer', fontSize: '12px', fontWeight: '600', transition: 'all 0.2s', whiteSpace: 'nowrap' }}
                >
                  📂 선택
                </button>
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(224,224,224,0.4)' }}>💡 팁: 프로젝트 루트 폴더를 선택하시면 자동으로 분석됩니다</div>
            </div>

            {/* 프로젝트명 입력 섹션 */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: 'rgba(224,224,224,0.7)', marginBottom: '8px', fontWeight: '600' }}>프로젝트명 (선택사항)</label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder={selectedProjectPath === '프로젝트 폴더 선택' ? "직접 입력하거나 폴더를 선택해주세요" : "기본값: " + selectedProjectPath}
                style={{ width: '100%', padding: '12px', background: 'rgba(100,150,255,0.1)', border: '1px solid rgba(100,150,255,0.2)', borderRadius: '8px', color: '#e0e0e0', fontSize: '13px' }}
              />
            </div>

            {/* 버튼 */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => {
                  setShowNewModal(false);
                  setProjectName('');
                  setSelectedProjectPath('프로젝트 폴더 선택');
                }}
                style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid rgba(100,150,255,0.2)', borderRadius: '8px', color: '#cbd5e1', cursor: 'pointer', fontWeight: '600', transition: 'all 0.2s' }}
              >
                취소
              </button>
              <button
                onClick={(e) => {
                  console.log('🔘 분석 버튼 클릭됨!', { loading, projectName, selectedProjectPath });
                  e.preventDefault();
                  handleAnalyze();
                }}
                disabled={loading}
                style={{ flex: 1, padding: '12px', background: loading ? 'rgba(100,150,255,0.3)' : 'linear-gradient(135deg, #646cff 0%, #4c47ff 100%)', border: 'none', borderRadius: '8px', color: '#fff', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: '600', opacity: loading ? 0.6 : 1, transition: 'all 0.2s' }}
              >
                {loading ? '분석중...' : '✨ 분석 시작'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
