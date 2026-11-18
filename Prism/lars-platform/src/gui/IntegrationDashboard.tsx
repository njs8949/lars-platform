import React, { useState, useMemo } from 'react';
import { Plug, Plus, AlertTriangle, CheckCircle, Network, Activity, Settings, Zap, Search, Filter, RefreshCw, Trash2, Map, Link2 } from 'lucide-react';
import { GlassmorphicIcon } from './components/GlassmorphicIcon';
import { FeatureHeader, KpiGrid, EmptyState } from './components/feature/FeatureUI';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';

export const IntegrationDashboard = () => {
  const [viewMode, setViewMode] = useState<'map' | 'connections' | 'issues'>('map');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newIntegrationName, setNewIntegrationName] = useState('');

  const [integrations, setIntegrations] = useState([
    { id: 1, name: 'Slack', status: 'connected', lastSync: '1분 전', events: 245, icon: '💬', uptime: 99.8, requests: 1245 },
    { id: 2, name: 'GitHub', status: 'connected', lastSync: '5분 전', events: 187, icon: '🔧', uptime: 100, requests: 892 },
    { id: 3, name: 'Jira', status: 'error', lastSync: '30분 전', events: 0, icon: '⚠️', uptime: 45.2, requests: 234 },
    { id: 4, name: 'Google Drive', status: 'connected', lastSync: '2분 전', events: 56, icon: '📁', uptime: 99.9, requests: 567 },
    { id: 5, name: 'Stripe', status: 'connected', lastSync: '10분 전', events: 89, icon: '💳', uptime: 99.99, requests: 432 },
  ]);

  const filteredIntegrations = useMemo(() => {
    return integrations.filter(i => {
      const matchesSearch = i.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = !selectedStatus || i.status === selectedStatus;
      return matchesSearch && matchesStatus;
    });
  }, [integrations, searchTerm, selectedStatus]);

  const stats = {
    activeConnections: integrations.filter(i => i.status === 'connected').length,
    dailyRequests: integrations.reduce((sum, i) => sum + i.requests, 0),
    errors: integrations.filter(i => i.status === 'error').length,
    avgUptime: (integrations.reduce((sum, i) => sum + i.uptime, 0) / integrations.length).toFixed(1)
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return '#4ade80';
      case 'error': return '#ff6b9d';
      default: return '#64c8ff';
    }
  };

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%', background: 'linear-gradient(135deg, #1f3d3d 0%, #0d2020 100%)' }}>

      {/* 좌측 사이드바 */}
      <div style={{ width: '280px', borderRight: '1px solid rgba(0,212,212,0.2)', overflow: 'auto', display: 'flex', flexDirection: 'column', padding: '20px' }}>
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '12px', color: 'rgba(224,224,224,0.5)', textTransform: 'uppercase', fontWeight: '600', marginBottom: '12px' }}>필터</div>

          <div style={{ marginBottom: '16px', position: 'relative' }}>
            <input type="text" placeholder="통합 검색..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,180,200,0.1)', border: '1px solid rgba(0,180,200,0.2)', borderRadius: '8px', color: '#e0e0e0', fontSize: '13px' }} />
            <Search size={14} style={{ position: 'absolute', right: '12px', top: '12px', color: 'rgba(224,224,224,0.4)' }} />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', color: 'rgba(224,224,224,0.5)', marginBottom: '8px', fontWeight: '600' }}>상태</div>
            {['connected', 'error'].map(status => (
              <button key={status} onClick={() => setSelectedStatus(selectedStatus === status ? null : status)} style={{ width: '100%', textAlign: 'left', padding: '8px 12px', marginBottom: '6px', background: selectedStatus === status ? `${getStatusColor(status)}20` : 'rgba(0,180,200,0.08)', border: selectedStatus === status ? `1px solid ${getStatusColor(status)}` : '1px solid rgba(0,180,200,0.15)', borderRadius: '6px', color: '#e0e0e0', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: getStatusColor(status) }} />
                {status === 'connected' ? '연결됨' : '오류'}
              </button>
            ))}
          </div>

          <div>
            <div style={{ fontSize: '11px', color: 'rgba(224,224,224,0.5)', marginBottom: '8px', fontWeight: '600' }}>통합 서비스</div>
            {integrations.map(i => (
              <button key={i.id} onClick={() => setSelectedStatus(i.status)} style={{ width: '100%', textAlign: 'left', padding: '8px 12px', marginBottom: '4px', background: 'rgba(0,180,200,0.08)', border: '1px solid rgba(0,180,200,0.15)', borderRadius: '6px', color: '#e0e0e0', cursor: 'pointer', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: getStatusColor(i.status), flexShrink: 0 }} />
                  <span>{i.name}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1 }} />

        <button
          onClick={() => setShowNewModal(true)}
          style={{ width: '100%', padding: '10px', background: 'linear-gradient(135deg, #00d4d4, #00b8c8)', color: '#000', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '13px' }}>
          <Plus size={16} />
          통합 추가
        </button>

        {/* 통합 추가 모달 */}
        {showNewModal && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
          }}>
            <div style={{
              background: 'rgba(30, 41, 59, 0.95)', border: '1px solid rgba(0,180,200,0.2)',
              borderRadius: '12px', padding: '32px', maxWidth: '400px', width: '90%'
            }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#f1f5f9', marginBottom: '8px' }}>통합 추가</h2>
              <p style={{ fontSize: '13px', color: 'rgba(224,224,224,0.6)', marginBottom: '24px' }}>통합할 서비스를 선택하세요</p>
              <input type="text" placeholder="서비스 이름" value={newIntegrationName}
                onChange={(e) => setNewIntegrationName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && setShowNewModal(false)}
                style={{ width: '100%', padding: '12px 16px', background: 'rgba(0,180,200,0.1)',
                  border: '1px solid rgba(0,180,200,0.2)', borderRadius: '8px', color: '#e0e0e0',
                  fontSize: '14px', marginBottom: '24px', boxSizing: 'border-box' }} autoFocus />
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => { setShowNewModal(false); setNewIntegrationName(''); }}
                  style={{ flex: 1, padding: '12px 16px', background: 'rgba(0,180,200,0.1)',
                    border: '1px solid rgba(0,180,200,0.2)', borderRadius: '8px', color: '#00d4d4',
                    cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>취소</button>
                <button onClick={() => { setShowNewModal(false); setNewIntegrationName(''); }}
                  style={{ flex: 1, padding: '12px 16px', background: 'linear-gradient(135deg, #00d4d4, #00b8c8)',
                    border: 'none', borderRadius: '8px', color: '#000', cursor: 'pointer',
                    fontSize: '13px', fontWeight: '600' }}>추가</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 메인 콘텐츠 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(0,180,200,0.2)' }}>
          <FeatureHeader
            icon={<GlassmorphicIcon Icon={Plug} gradient="from-cyan-400 to-teal-500" size={40} />}
            title="통합 대시보드"
            subtitle="서비스 통합 관리"
            actions={
              <>
            <div style={{ display: 'flex', gap: '8px' }}>
              {['map', 'connections', 'issues'].map(mode => (
                <button key={mode} onClick={() => setViewMode(mode as any)} style={{ padding: '8px 16px', background: viewMode === mode ? 'rgba(0,180,200,0.2)' : 'rgba(0,180,200,0.08)', border: viewMode === mode ? '1px solid #00d4d4' : '1px solid rgba(0,180,200,0.15)', borderRadius: '6px', color: '#e0e0e0', cursor: 'pointer', fontSize: '12px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {mode === 'map' && <><Map size={14} />맵</>}
                  {mode === 'connections' && <><Link2 size={14} />연결</>}
                  {mode === 'issues' && <><AlertTriangle size={14} />이슈</>}
                </button>
              ))}
            </div>
              </>
            }
          />
          <KpiGrid
            items={[
              { label: '활성 연결', value: stats.activeConnections, tone: 'blue' },
              { label: '일일 요청', value: stats.dailyRequests.toLocaleString(), tone: 'green' },
              { label: '오류', value: stats.errors, tone: 'red' },
              { label: '평균 가동률', value: integrations.length ? `${stats.avgUptime}%` : '-', tone: 'amber' },
            ]}
          />
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
          {integrations.length === 0 && (
            <div style={{ marginBottom: '24px' }}>
              <EmptyState
                icon={<GlassmorphicIcon Icon={Plug} gradient="from-cyan-400 to-teal-500" size={32} />}
                title="연결된 서비스가 없습니다"
                description="외부 서비스를 연결하면 상태, 요청량, 오류를 한곳에서 관리할 수 있습니다."
                steps={['연결할 서비스 선택', '인증 정보와 동기화 주기 설정', '연결 상태와 이슈를 이 화면에서 확인']}
                tab="integration"
                examples={['Slack 알림 연결', 'GitHub 이슈 동기화', 'Google Drive 파일 가져오기']}
                action={{ label: '서비스 연결', onClick: () => setShowNewModal(true) }}
              />
            </div>
          )}

          {viewMode === 'map' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
              {filteredIntegrations.map(service => (
                <div key={service.id} style={{ background: 'linear-gradient(135deg, rgba(0,180,200,0.12), rgba(0,180,200,0.04))', border: '1px solid rgba(0,180,200,0.2)', borderRadius: '12px', padding: '16px', overflow: 'hidden' }}>
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div style={{ fontSize: '24px' }}>{service.icon}</div>
                      <span style={{ padding: '4px 10px', background: `${getStatusColor(service.status)}20`, color: getStatusColor(service.status), borderRadius: '4px', fontSize: '11px', fontWeight: '600' }}>
                        {service.status === 'connected' ? '✓' : '✗'}
                      </span>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#e0e0e0', marginBottom: '2px' }}>{service.name}</div>
                    <div style={{ fontSize: '11px', color: 'rgba(224,224,224,0.5)' }}>마지막: {service.lastSync}</div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px', fontSize: '12px' }}>
                    <div>
                      <div style={{ color: 'rgba(224,224,224,0.5)', fontSize: '10px', marginBottom: '2px', fontWeight: '600' }}>가동률</div>
                      <div style={{ color: '#00d4d4', fontWeight: '600' }}>{service.uptime}%</div>
                    </div>
                    <div>
                      <div style={{ color: 'rgba(224,224,224,0.5)', fontSize: '10px', marginBottom: '2px', fontWeight: '600' }}>요청</div>
                      <div style={{ color: '#4ade80', fontWeight: '600' }}>{service.requests}</div>
                    </div>
                  </div>

                  <button style={{ width: '100%', padding: '8px', background: 'rgba(0,180,200,0.15)', border: '1px solid rgba(0,180,200,0.3)', borderRadius: '6px', color: '#00d4d4', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                    자세히
                  </button>
                </div>
              ))}
            </div>
          )}

          {viewMode === 'connections' && (
            <div>
              {filteredIntegrations.map(i => (
                <div key={i.id} style={{ background: 'rgba(0,180,200,0.08)', padding: '16px', marginBottom: '12px', borderRadius: '10px', border: '1px solid rgba(0,180,200,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                    <div style={{ fontSize: '24px' }}>{i.icon}</div>
                    <div>
                      <div style={{ fontWeight: '600', marginBottom: '2px', color: '#e0e0e0' }}>{i.name}</div>
                      <div style={{ fontSize: '12px', color: 'rgba(224,224,224,0.6)' }}>이벤트: {i.events} • 마지막 동기화: {i.lastSync}</div>
                    </div>
                  </div>
                  <span style={{ padding: '6px 12px', background: `${getStatusColor(i.status)}20`, color: getStatusColor(i.status), borderRadius: '6px', fontSize: '11px', fontWeight: '600', marginRight: '12px' }}>
                    {i.status === 'connected' ? '연결됨' : '오류'}
                  </span>
                  <button style={{ padding: '8px 12px', background: 'rgba(0,180,200,0.15)', border: '1px solid rgba(0,180,200,0.3)', borderRadius: '6px', color: '#00d4d4', cursor: 'pointer', fontSize: '11px', fontWeight: '600' }}>
                    수정
                  </button>
                </div>
              ))}
            </div>
          )}

          {viewMode === 'issues' && (
            <div>
              {integrations.filter(i => i.status === 'error').length > 0 ? (
                <div>
                  {integrations.filter(i => i.status === 'error').map(i => (
                    <div key={i.id} style={{ background: 'rgba(255,107,157,0.08)', borderLeft: '3px solid #ff6b9d', padding: '16px', marginBottom: '12px', borderRadius: '8px', border: '1px solid rgba(255,107,157,0.2)', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <AlertTriangle size={20} style={{ color: '#ff6b9d', flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '600', marginBottom: '4px', color: '#ff6b9d' }}>{i.name} 연결 오류</div>
                        <div style={{ fontSize: '12px', color: 'rgba(224,224,224,0.6)', marginBottom: '8px' }}>마지막 시도: {i.lastSync}</div>
                        <button style={{ padding: '6px 12px', background: 'rgba(255,107,157,0.2)', border: '1px solid #ff6b9d', color: '#ff6b9d', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <RefreshCw size={12} />
                          재시도
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(224,224,224,0.3)' }}>
                  <CheckCircle size={48} style={{ margin: '0 auto 16px', color: '#4ade80' }} />
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#e0e0e0' }}>모든 통합이 정상 작동 중입니다</div>
                  <div style={{ fontSize: '12px', marginTop: '8px' }}>오류가 감지되지 않았습니다</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IntegrationDashboard;
