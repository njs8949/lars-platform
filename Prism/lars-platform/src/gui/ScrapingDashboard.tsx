import React, { useState, useMemo, useEffect } from 'react';
import { Globe, Plus, Search, Filter, Play, Pause, RotateCw, MoreVertical, TrendingUp, AlertTriangle, Check2, Clock, Zap, Grid2X2, List } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { GlassmorphicIcon } from './components/GlassmorphicIcon';
import { FeatureHeader, KpiGrid, EmptyState } from './components/feature/FeatureUI';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';

export const ScrapingDashboard = () => {
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedCrawlers, setSelectedCrawlers] = useState<number[]>([]);
  const [expandedCrawler, setExpandedCrawler] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newJobUrl, setNewJobUrl] = useState('');

  const [crawlers, setCrawlers] = useState<any[]>([]);

  // 데이터 로드
  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/scraping/jobs/`);
      if (response.ok) {
        const data = await response.json();
        setCrawlers(data.data || []);
      }
      const timeline = await fetch(`${API_URL}/scraping/timeline`);
      if (timeline.ok) setTimelineData((await timeline.json()).data || []);
    } catch (error) {
      console.error('작업 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const runNow = async (jobId: string) => {
    setRunningId(jobId);
    try {
      await fetch(`${API_URL}/scraping/jobs/${jobId}/run`, { method: 'POST' });
    } finally {
      setRunningId(null);
      await loadJobs();
    }
  };

  const handleAddNew = async () => {
    if (!newJobUrl.trim()) {
      alert('URL을 입력해주세요');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/scraping/jobs/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: newJobUrl, name: new URL(newJobUrl).hostname })
      });

      if (response.ok) {
        await loadJobs();
        setNewJobUrl('');
        setShowNewModal(false);
      }
    } catch (error) {
      console.error('작업 생성 실패:', error);
      alert('작업 생성 실패');
    } finally {
      setLoading(false);
    }
  };

  const [timelineData, setTimelineData] = useState<any[]>([]);
  const [runningId, setRunningId] = useState<string | null>(null);

  const filteredCrawlers = useMemo(() => {
    return crawlers.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           c.url.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = !selectedStatus || c.status === selectedStatus;
      return matchesSearch && matchesStatus;
    });
  }, [crawlers, searchTerm, selectedStatus]);

  const stats = {
    totalCrawlers: crawlers.length,
    running: crawlers.filter(c => c.status === 'running').length,
    totalPages: crawlers.reduce((sum, c) => sum + c.pages, 0),
    totalErrors: crawlers.reduce((sum, c) => sum + c.errors, 0)
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return '#4ade80';
      case 'idle': return '#64c8ff';
      case 'error': return '#ff6b9d';
      default: return '#fcd34d';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'running': return '실행중';
      case 'idle': return '대기중';
      case 'error': return '오류';
      default: return '완료';
    }
  };

  const toggleSelectCrawler = (id: number) => {
    setSelectedCrawlers(prev =>
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedCrawlers.length === filteredCrawlers.length) {
      setSelectedCrawlers([]);
    } else {
      setSelectedCrawlers(filteredCrawlers.map(c => c.id));
    }
  };

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%', background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}>

      {/* 좌측 사이드바 */}
      <div style={{ width: '280px', borderRight: '1px solid rgba(100,150,255,0.2)', overflow: 'auto', display: 'flex', flexDirection: 'column', padding: '20px' }}>
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '12px', color: 'rgba(224,224,224,0.5)', textTransform: 'uppercase', fontWeight: '600', marginBottom: '12px' }}>필터</div>

          {/* 검색 */}
          <div style={{ marginBottom: '16px', position: 'relative' }}>
            <input
              type="text"
              placeholder="크롤러 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', background: 'rgba(100,150,255,0.1)', border: '1px solid rgba(100,150,255,0.2)', borderRadius: '8px', color: '#e0e0e0', fontSize: '13px' }}
            />
            <Search size={14} style={{ position: 'absolute', right: '12px', top: '12px', color: 'rgba(224,224,224,0.4)' }} />
          </div>

          {/* 상태 필터 */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', color: 'rgba(224,224,224,0.5)', marginBottom: '8px', fontWeight: '600' }}>상태</div>
            {['running', 'idle', 'error'].map(status => (
              <button
                key={status}
                onClick={() => setSelectedStatus(selectedStatus === status ? null : status)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 12px',
                  marginBottom: '6px',
                  background: selectedStatus === status ? `${getStatusColor(status)}20` : 'rgba(100,150,255,0.08)',
                  border: selectedStatus === status ? `1px solid ${getStatusColor(status)}` : '1px solid rgba(100,150,255,0.15)',
                  borderRadius: '6px',
                  color: '#e0e0e0',
                  cursor: 'pointer',
                  fontSize: '13px',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: getStatusColor(status) }} />
                {getStatusLabel(status)}
              </button>
            ))}
          </div>

          {/* 크롤러 목록 */}
          <div>
            <div style={{ fontSize: '11px', color: 'rgba(224,224,224,0.5)', marginBottom: '8px', fontWeight: '600' }}>크롤러</div>
            {crawlers.length === 0 && (
              <div style={{ fontSize: '12px', color: 'rgba(224,224,224,0.4)', padding: '8px 2px' }}>등록된 크롤러가 없습니다</div>
            )}
            {crawlers.map(crawler => (
              <button
                key={crawler.id}
                onClick={() => setSelectedStatus(crawler.status)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 12px',
                  marginBottom: '4px',
                  background: 'rgba(100,150,255,0.08)',
                  border: '1px solid rgba(100,150,255,0.15)',
                  borderRadius: '6px',
                  color: '#e0e0e0',
                  cursor: 'pointer',
                  fontSize: '12px',
                  transition: 'all 0.2s',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: getStatusColor(crawler.status), flexShrink: 0 }} />
                  <span>{crawler.name}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1 }} />

        {/* 액션 버튼 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            onClick={() => setShowNewModal(true)}
            style={{ width: '100%', padding: '10px', background: 'linear-gradient(135deg, #6496ff, #4975d4)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '13px' }}>
            <Plus size={16} />
            새 크롤러
          </button>
          {selectedCrawlers.length > 0 && (
            <button style={{ width: '100%', padding: '10px', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', color: '#4ade80', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '13px' }}>
              <Play size={14} />
              실행 ({selectedCrawlers.length})
            </button>
          )}
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* 상단 헤더 */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(100,150,255,0.2)' }}>
          <FeatureHeader
            icon={<GlassmorphicIcon Icon={Globe} gradient="from-blue-400 to-cyan-500" size={40} />}
            title="웹 스크래핑"
            subtitle="크롤러 모니터링"
            actions={
              <>
            {/* 뷰 전환 */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setViewMode('card')}
                style={{ padding: '8px 16px', background: viewMode === 'card' ? 'rgba(100,150,255,0.2)' : 'rgba(100,150,255,0.08)', border: viewMode === 'card' ? '1px solid #6496ff' : '1px solid rgba(100,150,255,0.15)', borderRadius: '6px', color: '#e0e0e0', cursor: 'pointer', fontSize: '12px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Grid2X2 size={14} />
                카드
              </button>
              <button
                onClick={() => setViewMode('list')}
                style={{ padding: '8px 16px', background: viewMode === 'list' ? 'rgba(100,150,255,0.2)' : 'rgba(100,150,255,0.08)', border: viewMode === 'list' ? '1px solid #6496ff' : '1px solid rgba(100,150,255,0.15)', borderRadius: '6px', color: '#e0e0e0', cursor: 'pointer', fontSize: '12px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <List size={14} />
                목록
              </button>
            </div>
              </>
            }
          />
          <KpiGrid
            items={[
              { label: '총 크롤러', value: stats.totalCrawlers, tone: 'blue' },
              { label: '실행중', value: stats.running, tone: 'green' },
              { label: '크롤링 페이지', value: stats.totalPages.toLocaleString(), tone: 'amber' },
              { label: '에러', value: stats.totalErrors, tone: 'red' },
            ]}
          />
        </div>

        {/* 콘텐츠 */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>

          {crawlers.length === 0 && (
            <div style={{ marginBottom: '24px' }}>
              <EmptyState
                icon={<GlassmorphicIcon Icon={Globe} gradient="from-blue-400 to-cyan-500" size={32} />}
                title="아직 등록된 크롤러가 없습니다"
                description="URL을 등록하면 페이지를 주기적으로 수집하고, 실행 상태와 에러를 여기서 모니터링합니다."
                steps={['새 크롤러에서 수집할 URL 등록', '실행 주기와 수집 범위 설정', '실행 결과와 에러를 이 화면에서 확인']}
                tab="scraping"
                examples={['경쟁사 가격 페이지 수집', '뉴스 제목 매일 수집', '채용 공고 변화 추적']}
                action={{ label: '새 크롤러 만들기', onClick: () => setShowNewModal(true) }}
              />
            </div>
          )}

          {/* 실시간 타임라인 */}
          {crawlers.length > 0 && (
          <div style={{ marginBottom: '24px', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(100,150,255,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#e0e0e0' }}>실시간 요청 현황</div>
              <div style={{ fontSize: '11px', color: 'rgba(224,224,224,0.5)' }}>최근 6시간</div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={timelineData}>
                <defs>
                  <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4ade80" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4ade80" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,150,255,0.1)" />
                <XAxis dataKey="time" stroke="rgba(224,224,224,0.3)" />
                <YAxis stroke="rgba(224,224,224,0.3)" />
                <Tooltip contentStyle={{ background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(100,150,255,0.3)', borderRadius: '8px' }} />
                <Area type="monotone" dataKey="success" stroke="#4ade80" fillOpacity={1} fill="url(#colorSuccess)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          )}

          {/* 크롤러 뷰 */}
          {viewMode === 'card' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              {filteredCrawlers.map(crawler => (
                <div
                  key={crawler.id}
                  style={{
                    background: 'linear-gradient(135deg, rgba(100,150,255,0.12), rgba(100,150,255,0.04))',
                    border: '1px solid rgba(100,150,255,0.2)',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    transition: 'all 0.2s',
                    cursor: 'pointer'
                  }}
                  onClick={() => setExpandedCrawler(expandedCrawler === crawler.id ? null : crawler.id)}
                  onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 8px 24px rgba(100,150,255,0.15)'}
                  onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
                >
                  <div style={{ padding: '16px', borderBottom: '1px solid rgba(100,150,255,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px', color: '#e0e0e0' }}>{crawler.name}</div>
                        <div style={{ fontSize: '11px', color: 'rgba(224,224,224,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '250px' }}>{crawler.url}</div>
                      </div>
                      <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', background: `${getStatusColor(crawler.status)}20`, color: getStatusColor(crawler.status), display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: getStatusColor(crawler.status) }} />
                        {getStatusLabel(crawler.status)}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '12px', marginBottom: '12px' }}>
                      <div>
                        <div style={{ color: 'rgba(224,224,224,0.5)', marginBottom: '2px', fontSize: '10px', textTransform: 'uppercase', fontWeight: '600' }}>페이지</div>
                        <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#6496ff' }}>{crawler.pages.toLocaleString()}</div>
                      </div>
                      <div>
                        <div style={{ color: 'rgba(224,224,224,0.5)', marginBottom: '2px', fontSize: '10px', textTransform: 'uppercase', fontWeight: '600' }}>에러</div>
                        <div style={{ fontSize: '16px', fontWeight: 'bold', color: crawler.errors > 0 ? '#ff6b9d' : '#4ade80' }}>{crawler.errors}</div>
                      </div>
                      <div>
                        <div style={{ color: 'rgba(224,224,224,0.5)', marginBottom: '2px', fontSize: '10px', textTransform: 'uppercase', fontWeight: '600' }}>속도</div>
                        <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#fcd34d' }}>{crawler.speed}s/페이지</div>
                      </div>
                      <div>
                        <div style={{ color: 'rgba(224,224,224,0.5)', marginBottom: '2px', fontSize: '10px', textTransform: 'uppercase', fontWeight: '600' }}>성공률</div>
                        <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#4ade80' }}>{crawler.successRate}%</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button style={{ flex: 1, padding: '8px', background: 'rgba(100,150,255,0.15)', border: '1px solid rgba(100,150,255,0.3)', borderRadius: '6px', color: '#6496ff', cursor: 'pointer', fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                        <Play size={12} />
                        실행
                      </button>
                      <button style={{ flex: 1, padding: '8px', background: 'rgba(100,150,255,0.08)', border: '1px solid rgba(100,150,255,0.15)', borderRadius: '6px', color: '#e0e0e0', cursor: 'pointer', fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                        <RotateCw size={12} />
                        수정
                      </button>
                    </div>
                  </div>

                  {expandedCrawler === crawler.id && (
                    <div style={{ padding: '16px', background: 'rgba(100,150,255,0.08)', fontSize: '12px', color: 'rgba(224,224,224,0.7)' }}>
                      <div style={{ marginBottom: '8px' }}>
                        <div style={{ color: 'rgba(224,224,224,0.5)', fontSize: '10px', fontWeight: '600', marginBottom: '2px' }}>마지막 실행</div>
                        {crawler.lastRun}
                      </div>
                      <div>
                        <div style={{ color: 'rgba(224,224,224,0.5)', fontSize: '10px', fontWeight: '600', marginBottom: '2px' }}>실행 주기</div>
                        {crawler.frequency}
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); runNow(crawler.id); }}
                        disabled={runningId === crawler.id}
                        style={{ marginTop: '12px', padding: '6px 14px', borderRadius: '6px', border: '1px solid rgba(100,150,255,0.5)', background: 'rgba(100,150,255,0.15)', color: '#e0e0e0', cursor: 'pointer', fontSize: '12px' }}
                      >
                        {runningId === crawler.id ? '실행 중...' : '지금 실행'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            /* 목록 뷰 */
            <div style={{ overflowX: 'auto', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid rgba(100,150,255,0.2)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(100,150,255,0.2)', background: 'rgba(100,150,255,0.08)' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#6496ff' }}>
                      <input
                        type="checkbox"
                        checked={selectedCrawlers.length === filteredCrawlers.length && filteredCrawlers.length > 0}
                        onChange={selectAll}
                        style={{ cursor: 'pointer' }}
                      />
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#6496ff' }}>이름</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#6496ff' }}>URL</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#6496ff' }}>상태</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#6496ff' }}>페이지</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#6496ff' }}>에러</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#6496ff' }}>성공률</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#6496ff' }}>액션</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCrawlers.map(crawler => (
                    <tr key={crawler.id} style={{ borderBottom: '1px solid rgba(100,150,255,0.1)', background: selectedCrawlers.includes(crawler.id) ? 'rgba(100,150,255,0.1)' : 'transparent' }}>
                      <td style={{ padding: '12px' }}>
                        <input
                          type="checkbox"
                          checked={selectedCrawlers.includes(crawler.id)}
                          onChange={() => toggleSelectCrawler(crawler.id)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ padding: '12px', fontWeight: '600' }}>{crawler.name}</td>
                      <td style={{ padding: '12px', fontSize: '12px', color: 'rgba(224,224,224,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>{crawler.url}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', background: `${getStatusColor(crawler.status)}20`, color: getStatusColor(crawler.status) }}>
                          {getStatusLabel(crawler.status)}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#6496ff' }}>{crawler.pages.toLocaleString()}</td>
                      <td style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: crawler.errors > 0 ? '#ff6b9d' : '#4ade80' }}>{crawler.errors}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                          <div style={{ width: '40px', height: '4px', background: 'rgba(100,150,255,0.2)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${crawler.successRate}%`, height: '100%', background: crawler.successRate > 95 ? '#4ade80' : crawler.successRate > 80 ? '#fcd34d' : '#ff6b9d' }} />
                          </div>
                          <span style={{ fontSize: '11px', color: 'rgba(224,224,224,0.6)', minWidth: '30px' }}>{crawler.successRate}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <button style={{ padding: '4px 8px', background: 'rgba(100,150,255,0.15)', border: '1px solid rgba(100,150,255,0.3)', borderRadius: '4px', color: '#6496ff', cursor: 'pointer', fontSize: '11px' }}>
                          자세히
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 새 크롤러 모달 */}
      {showNewModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'rgba(30, 41, 59, 0.95)',
            border: '1px solid rgba(100,150,255,0.2)',
            borderRadius: '12px',
            padding: '32px',
            maxWidth: '400px',
            width: '90%'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#f1f5f9', marginBottom: '8px' }}>새 크롤러</h2>
            <p style={{ fontSize: '13px', color: 'rgba(224,224,224,0.6)', marginBottom: '24px' }}>스크래핑할 URL을 입력하세요</p>

            <input
              type="text"
              placeholder="https://example.com"
              value={newJobUrl}
              onChange={(e) => setNewJobUrl(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddNew()}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'rgba(100,150,255,0.1)',
                border: '1px solid rgba(100,150,255,0.2)',
                borderRadius: '8px',
                color: '#e0e0e0',
                fontSize: '14px',
                marginBottom: '24px',
                boxSizing: 'border-box'
              }}
              autoFocus
            />

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => {
                  setShowNewModal(false);
                  setNewJobUrl('');
                }}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  background: 'rgba(100,150,255,0.1)',
                  border: '1px solid rgba(100,150,255,0.2)',
                  borderRadius: '8px',
                  color: '#6496ff',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '600'
                }}
              >
                취소
              </button>
              <button
                onClick={handleAddNew}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  background: 'linear-gradient(135deg, #6496ff, #4975d4)',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '600'
                }}
              >
                생성
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScrapingDashboard;
