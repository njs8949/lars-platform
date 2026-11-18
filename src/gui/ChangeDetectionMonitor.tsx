import React, { useState, useMemo, useEffect } from 'react';
import { Eye, Plus, Search, Filter, Clock, AlertTriangle, CheckCircle2, TrendingDown, ArrowRight, Monitor, Bell, RefreshCw, BarChart3, GitCompare, Settings } from 'lucide-react';
import { GlassmorphicIcon } from './components/GlassmorphicIcon';
import { FeatureHeader, KpiGrid, EmptyState } from './components/feature/FeatureUI';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';

export const ChangeDetectionMonitor = () => {
  const [selectedView, setSelectedView] = useState<'timeline' | 'comparison' | 'management'>('timeline');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedSite, setSelectedSite] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newMonitorUrl, setNewMonitorUrl] = useState('');

  const [sites, setSites] = useState<any[]>([]);
  const [changes, setChanges] = useState<any[]>([]);
  const [checkingId, setCheckingId] = useState<string | null>(null);

  const loadAll = async () => {
    try {
      const [watchRes, changeRes] = await Promise.all([
        fetch(`${API_URL}/change-detection/`),
        fetch(`${API_URL}/change-detection/changes`),
      ]);
      if (watchRes.ok) setSites((await watchRes.json()).data || []);
      if (changeRes.ok) setChanges((await changeRes.json()).data || []);
    } catch (error) {
      console.error('변경 감지 목록 로드 실패:', error);
    }
  };

  const checkSite = async (siteId: string) => {
    setCheckingId(siteId);
    try {
      const response = await fetch(`${API_URL}/change-detection/${siteId}/check`, { method: 'POST' });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        alert(err.detail || '확인에 실패했습니다.');
      }
    } finally {
      setCheckingId(null);
      await loadAll();
    }
  };

  useEffect(() => { loadAll(); }, []);

  const handleAddMonitor = async () => {
    if (!newMonitorUrl.trim()) {
      alert('URL을 입력해주세요');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/change-detection/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: newMonitorUrl, name: new URL(newMonitorUrl).hostname })
      });

      if (response.ok) {
        await loadAll();
        setNewMonitorUrl('');
        setShowNewModal(false);
      }
    } catch (error) {
      console.error('모니터 추가 실패:', error);
      alert('모니터 추가 실패');
    } finally {
      setLoading(false);
    }
  };


  const filteredSites = useMemo(() => {
    return sites.filter(site => {
      const matchesSearch = site.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           site.url.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = !selectedStatus || site.status === selectedStatus;
      return matchesSearch && matchesStatus;
    });
  }, [sites, searchTerm, selectedStatus]);

  const filteredChanges = useMemo(() => {
    if (selectedSite) {
      return changes.filter(c => c.siteId === selectedSite);
    }
    return changes;
  }, [changes, selectedSite]);

  const stats = {
    totalSites: sites.length,
    monitoring: sites.filter(s => s.status === 'monitoring').length,
    totalChanges: changes.length,
    avgResponseTime: (sites.reduce((sum, s) => sum + s.responseTime, 0) / sites.length).toFixed(1)
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'monitoring': return '#4ade80';
      case 'alert': return '#ff6b9d';
      default: return '#64c8ff';
    }
  };

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%', background: 'linear-gradient(135deg, #1a3a3a 0%, #0d2626 100%)' }}>

      {/* 좌측 사이드바 */}
      <div style={{ width: '280px', borderRight: '1px solid rgba(0,212,212,0.2)', overflow: 'auto', display: 'flex', flexDirection: 'column', padding: '20px' }}>
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '12px', color: 'rgba(224,224,224,0.5)', textTransform: 'uppercase', fontWeight: '600', marginBottom: '12px' }}>필터</div>

          {/* 검색 */}
          <div style={{ marginBottom: '16px', position: 'relative' }}>
            <input
              type="text"
              placeholder="사이트 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,180,200,0.1)', border: '1px solid rgba(0,180,200,0.2)', borderRadius: '8px', color: '#e0e0e0', fontSize: '13px' }}
            />
            <Search size={14} style={{ position: 'absolute', right: '12px', top: '12px', color: 'rgba(224,224,224,0.4)' }} />
          </div>

          {/* 상태 필터 */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', color: 'rgba(224,224,224,0.5)', marginBottom: '8px', fontWeight: '600' }}>상태</div>
            {['monitoring', 'alert'].map(status => (
              <button
                key={status}
                onClick={() => setSelectedStatus(selectedStatus === status ? null : status)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 12px',
                  marginBottom: '6px',
                  background: selectedStatus === status ? `${getStatusColor(status)}20` : 'rgba(0,180,200,0.08)',
                  border: selectedStatus === status ? `1px solid ${getStatusColor(status)}` : '1px solid rgba(0,180,200,0.15)',
                  borderRadius: '6px',
                  color: '#e0e0e0',
                  cursor: 'pointer',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: getStatusColor(status) }} />
                {status === 'monitoring' ? '모니터링중' : '알림'}
              </button>
            ))}
          </div>

          {/* 모니터링 사이트 목록 */}
          <div>
            <div style={{ fontSize: '11px', color: 'rgba(224,224,224,0.5)', marginBottom: '8px', fontWeight: '600' }}>모니터링 사이트</div>
            {sites.map(site => (
              <button
                key={site.id}
                onClick={() => setSelectedSite(selectedSite === site.id ? null : site.id)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 12px',
                  marginBottom: '4px',
                  background: selectedSite === site.id ? 'rgba(0,180,200,0.2)' : 'rgba(0,180,200,0.08)',
                  border: selectedSite === site.id ? '1px solid #00d4d4' : '1px solid rgba(0,180,200,0.15)',
                  borderRadius: '6px',
                  color: '#e0e0e0',
                  cursor: 'pointer',
                  fontSize: '12px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: getStatusColor(site.status), flexShrink: 0 }} />
                  <span>{site.name}</span>
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
            style={{ width: '100%', padding: '10px', background: 'linear-gradient(135deg, #00d4d4, #00b8c8)', color: '#000', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '13px' }}>
            <Plus size={16} />
            모니터링 추가
          </button>
        </div>

        {/* 모니터링 추가 모달 */}
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
              border: '1px solid rgba(0,180,200,0.2)',
              borderRadius: '12px',
              padding: '32px',
              maxWidth: '400px',
              width: '90%'
            }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#f1f5f9', marginBottom: '8px' }}>모니터링 추가</h2>
              <p style={{ fontSize: '13px', color: 'rgba(224,224,224,0.6)', marginBottom: '24px' }}>모니터링할 웹사이트 URL을 입력하세요</p>

              <input
                type="url"
                placeholder="https://example.com"
                value={newMonitorUrl}
                onChange={(e) => setNewMonitorUrl(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddMonitor()}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'rgba(0,180,200,0.1)',
                  border: '1px solid rgba(0,180,200,0.2)',
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
                    setNewMonitorUrl('');
                  }}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    background: 'rgba(0,180,200,0.1)',
                    border: '1px solid rgba(0,180,200,0.2)',
                    borderRadius: '8px',
                    color: '#00d4d4',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '600'
                  }}
                >
                  취소
                </button>
                <button
                  onClick={handleAddMonitor}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    background: 'linear-gradient(135deg, #00d4d4, #00b8c8)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#000',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '600'
                  }}
                >
                  추가
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 메인 콘텐츠 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* 상단 헤더 */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(0,180,200,0.2)' }}>
          <FeatureHeader
            icon={<GlassmorphicIcon Icon={Eye} gradient="from-cyan-400 to-teal-500" size={40} />}
            title="변경 감시"
            subtitle="웹사이트 변경 추적"
            actions={
              <>
            {/* 뷰 전환 */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setSelectedView('timeline')}
                style={{ padding: '8px 16px', background: selectedView === 'timeline' ? 'rgba(0,180,200,0.2)' : 'rgba(0,180,200,0.08)', border: selectedView === 'timeline' ? '1px solid #00d4d4' : '1px solid rgba(0,180,200,0.15)', borderRadius: '6px', color: '#e0e0e0', cursor: 'pointer', fontSize: '12px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <BarChart3 size={14} />
                타임라인
              </button>
              <button
                onClick={() => setSelectedView('comparison')}
                style={{ padding: '8px 16px', background: selectedView === 'comparison' ? 'rgba(0,180,200,0.2)' : 'rgba(0,180,200,0.08)', border: selectedView === 'comparison' ? '1px solid #00d4d4' : '1px solid rgba(0,180,200,0.15)', borderRadius: '6px', color: '#e0e0e0', cursor: 'pointer', fontSize: '12px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <GitCompare size={14} />
                비교
              </button>
              <button
                onClick={() => setSelectedView('management')}
                style={{ padding: '8px 16px', background: selectedView === 'management' ? 'rgba(0,180,200,0.2)' : 'rgba(0,180,200,0.08)', border: selectedView === 'management' ? '1px solid #00d4d4' : '1px solid rgba(0,180,200,0.15)', borderRadius: '6px', color: '#e0e0e0', cursor: 'pointer', fontSize: '12px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Settings size={14} />
                관리
              </button>
            </div>
              </>
            }
          />
          <KpiGrid
            items={[
              { label: '모니터링 사이트', value: stats.totalSites, tone: 'blue' },
              { label: '활성', value: stats.monitoring, tone: 'green' },
              { label: '감지된 변경', value: stats.totalChanges, tone: 'amber' },
              { label: '평균 응답 시간', value: `${stats.avgResponseTime}s`, tone: 'violet' },
            ]}
          />
        </div>

        {/* 콘텐츠 */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>

          {stats.totalSites === 0 && (
            <div style={{ marginBottom: '24px' }}>
              <EmptyState
                icon={<GlassmorphicIcon Icon={Eye} gradient="from-cyan-400 to-teal-500" size={32} />}
                title="감시 중인 사이트가 없습니다"
                description="사이트 주소를 등록하면 주기적으로 확인하고, 내용이 바뀌면 변경 내역을 알려 줍니다."
                steps={['감시할 사이트 주소 등록', '확인 주기와 감지 범위 설정', '변경 내역과 알림을 이 화면에서 확인']}
                tab="change-detection"
                examples={['가격 변경 알림', '약관 문구 변경 감지', '공지 페이지 업데이트 추적']}
                action={{ label: '사이트 추가', onClick: () => setShowNewModal(true) }}
              />
            </div>
          )}

          {selectedView === 'timeline' && (
            <div style={{ maxWidth: '900px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '16px', color: '#e0e0e0' }}>변경 이력 타임라인</div>
              {filteredChanges.map((change, idx) => (
                <div key={change.id} style={{ display: 'flex', gap: '16px', marginBottom: '16px', position: 'relative' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(0,180,200,0.2)', border: '2px solid #00d4d4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Clock size={16} style={{ color: '#00d4d4' }} />
                    </div>
                    {idx < filteredChanges.length - 1 && (
                      <div style={{ width: '2px', height: '60px', background: 'rgba(0,180,200,0.2)', marginTop: '-8px' }} />
                    )}
                  </div>

                  <div style={{ flex: 1, background: 'rgba(0,180,200,0.08)', borderLeft: '3px solid #00d4d4', padding: '16px', borderRadius: '8px', border: '1px solid rgba(0,180,200,0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                      <div>
                        <div style={{ fontWeight: '600', color: '#00d4d4', marginBottom: '2px' }}>{change.type}</div>
                        <div style={{ fontSize: '12px', color: 'rgba(224,224,224,0.6)' }}>{change.description}</div>
                      </div>
                      <div style={{ fontSize: '11px', color: 'rgba(224,224,224,0.5)', textAlign: 'right' }}>
                        <div>{change.timestamp}</div>
                        <div style={{ marginTop: '4px', padding: '2px 8px', background: 'rgba(0,180,200,0.1)', borderRadius: '3px', display: 'inline-block', fontSize: '10px' }}>
                          {change.section}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedView === 'comparison' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(0,180,200,0.2)' }}>
                <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '12px', color: '#00d4d4' }}>이전 버전</div>
                <div style={{ background: 'rgba(0,0,0,0.5)', borderRadius: '8px', padding: '12px', fontFamily: 'monospace', fontSize: '11px', color: 'rgba(0,212,212,0.8)', height: '300px', overflow: 'auto' }}>
                  {'<div class="header">\n  <h1>Welcome</h1>\n  <p>Old content</p>\n</div>'}
                </div>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(0,180,200,0.2)' }}>
                <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '12px', color: '#00d4d4' }}>새 버전</div>
                <div style={{ background: 'rgba(0,0,0,0.5)', borderRadius: '8px', padding: '12px', fontFamily: 'monospace', fontSize: '11px', color: 'rgba(76,222,128,0.8)', height: '300px', overflow: 'auto' }}>
                  {'<div class="header">\n  <h1>Welcome v2</h1>\n  <p>New content updated</p>\n</div>'}
                </div>
              </div>
            </div>
          )}

          {selectedView === 'management' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {filteredSites.map(site => (
                <div key={site.id} style={{ background: 'linear-gradient(135deg, rgba(0,180,200,0.12), rgba(0,180,200,0.04))', border: '1px solid rgba(0,180,200,0.2)', borderRadius: '12px', padding: '16px', overflow: 'hidden' }}>
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div style={{ fontWeight: '600', color: '#e0e0e0' }}>{site.name}</div>
                      <span style={{ padding: '4px 10px', background: `${getStatusColor(site.status)}20`, color: getStatusColor(site.status), borderRadius: '4px', fontSize: '11px', fontWeight: '600' }}>
                        {site.status === 'monitoring' ? '활성' : '알림'}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'rgba(224,224,224,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {site.url}
                    </div>
                    <button
                      onClick={() => checkSite(site.id)}
                      disabled={checkingId === site.id}
                      style={{ marginTop: '8px', padding: '5px 12px', borderRadius: '6px', border: '1px solid rgba(0,180,200,0.5)', background: 'rgba(0,180,200,0.12)', color: '#e0e0e0', cursor: 'pointer', fontSize: '12px' }}
                    >
                      {checkingId === site.id ? '확인 중...' : '지금 확인'}
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px', fontSize: '12px' }}>
                    <div>
                      <div style={{ color: 'rgba(224,224,224,0.5)', fontSize: '10px', marginBottom: '2px', fontWeight: '600' }}>마지막 변경</div>
                      <div style={{ color: '#fcd34d' }}>{site.lastChange}</div>
                    </div>
                    <div>
                      <div style={{ color: 'rgba(224,224,224,0.5)', fontSize: '10px', marginBottom: '2px', fontWeight: '600' }}>변경 횟수</div>
                      <div style={{ color: '#00d4d4' }}>{site.changeCount}회</div>
                    </div>
                    <div>
                      <div style={{ color: 'rgba(224,224,224,0.5)', fontSize: '10px', marginBottom: '2px', fontWeight: '600' }}>변경 빈도</div>
                      <div style={{ color: site.changeFreq === '높음' || site.changeFreq === '매우 높음' ? '#ff6b9d' : '#4ade80' }}>{site.changeFreq}</div>
                    </div>
                    <div>
                      <div style={{ color: 'rgba(224,224,224,0.5)', fontSize: '10px', marginBottom: '2px', fontWeight: '600' }}>응답시간</div>
                      <div style={{ color: '#64c8ff' }}>{site.responseTime}s</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button style={{ flex: 1, padding: '8px', background: 'rgba(0,180,200,0.15)', border: '1px solid rgba(0,180,200,0.3)', borderRadius: '6px', color: '#00d4d4', cursor: 'pointer', fontSize: '11px', fontWeight: '600' }}>
                      편집
                    </button>
                    <button style={{ flex: 1, padding: '8px', background: 'rgba(0,180,200,0.08)', border: '1px solid rgba(0,180,200,0.15)', borderRadius: '6px', color: '#e0e0e0', cursor: 'pointer', fontSize: '11px', fontWeight: '600' }}>
                      삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChangeDetectionMonitor;
