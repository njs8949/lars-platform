import React, { useState, useMemo, useEffect } from 'react';
import { Users, Plus, Mail, DollarSign, TrendingUp, Phone, Search, Filter, Eye, EyeOff, ChevronDown, X, Check, Clock, Grid2X2, Table } from 'lucide-react';
import { GlassmorphicIcon } from './components/GlassmorphicIcon';
import { FeatureHeader, KpiGrid, EmptyState } from './components/feature/FeatureUI';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';

export const CRMDashboard = () => {
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [selectedContacts, setSelectedContacts] = useState<number[]>([]);
  const [expandedFilters, setExpandedFilters] = useState(false);
  const [valueRange, setValueRange] = useState([0, 100000]);
  const [loading, setLoading] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');

  const [contacts, setContacts] = useState<any[]>([]);

  // 데이터 로드
  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/crm/contacts/`);
      if (response.ok) {
        const data = await response.json();
        setContacts(data.data || []);
      }
    } catch (error) {
      console.error('연락처 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = async () => {
    if (!newContactName.trim()) {
      alert('연락처 이름을 입력해주세요');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/crm/contacts/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newContactName, email: newContactEmail, stage: 'Lead', value: 0 })
      });

      if (response.ok) {
        await loadContacts();
        setNewContactName('');
        setNewContactEmail('');
        setShowNewModal(false);
      }
    } catch (error) {
      console.error('연락처 생성 실패:', error);
      alert('연락처 생성 실패');
    } finally {
      setLoading(false);
    }
  };

  const stages = ['Lead', 'Prospect', 'Negotiation', 'Closed'];

  const filteredContacts = useMemo(() => {
    return contacts.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           c.company.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStage = !selectedStage || c.stage === selectedStage;
      const matchesValue = c.value >= valueRange[0] && c.value <= valueRange[1];
      return matchesSearch && matchesStage && matchesValue;
    });
  }, [contacts, searchTerm, selectedStage, valueRange]);

  const contactsByStage = useMemo(() => {
    return stages.map(stage => ({
      stage,
      contacts: filteredContacts.filter(c => c.stage === stage),
      total: filteredContacts.filter(c => c.stage === stage).length
    }));
  }, [filteredContacts]);

  const stats = {
    totalContacts: contacts.length,
    activeDeals: contacts.filter(c => c.stage !== 'Lead' && c.stage !== 'Closed').length,
    totalValue: contacts.reduce((sum, c) => sum + c.value, 0),
    avgProbability: Math.round(contacts.reduce((sum, c) => sum + c.probability, 0) / contacts.length)
  };

  const toggleSelectContact = (id: number) => {
    setSelectedContacts(prev =>
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedContacts.length === filteredContacts.length) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(filteredContacts.map(c => c.id));
    }
  };

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%', background: 'linear-gradient(135deg, #1a2e5e 0%, #0f1a3d 100%)' }}>

      {/* 좌측 사이드바 */}
      <div style={{ width: '280px', borderRight: '1px solid rgba(100,150,255,0.2)', overflow: 'auto', display: 'flex', flexDirection: 'column', padding: '20px' }}>
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '12px', color: 'rgba(224,224,224,0.5)', textTransform: 'uppercase', fontWeight: '600', marginBottom: '12px' }}>필터</div>

          {/* 검색 */}
          <div style={{ marginBottom: '16px', position: 'relative' }}>
            <input
              type="text"
              placeholder="이름/회사 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', background: 'rgba(100,150,255,0.1)', border: '1px solid rgba(100,150,255,0.2)', borderRadius: '8px', color: '#e0e0e0', fontSize: '13px' }}
            />
            <Search size={14} style={{ position: 'absolute', right: '12px', top: '12px', color: 'rgba(224,224,224,0.4)' }} />
          </div>

          {/* 단계 필터 */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', color: 'rgba(224,224,224,0.5)', marginBottom: '8px', fontWeight: '600' }}>단계</div>
            {stages.map(stage => (
              <button
                key={stage}
                onClick={() => setSelectedStage(selectedStage === stage ? null : stage)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 12px',
                  marginBottom: '6px',
                  background: selectedStage === stage ? 'rgba(100,150,255,0.2)' : 'rgba(100,150,255,0.08)',
                  border: selectedStage === stage ? '1px solid #6496ff' : '1px solid rgba(100,150,255,0.15)',
                  borderRadius: '6px',
                  color: '#e0e0e0',
                  cursor: 'pointer',
                  fontSize: '13px',
                  transition: 'all 0.2s'
                }}
              >
                {stage}
              </button>
            ))}
          </div>

          {/* 거래 가치 범위 */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', color: 'rgba(224,224,224,0.5)', marginBottom: '8px', fontWeight: '600' }}>거래 가치</div>
            <div style={{ color: '#6496ff', fontSize: '12px', fontWeight: '600', marginBottom: '8px' }}>${valueRange[0].toLocaleString()} - ${valueRange[1].toLocaleString()}</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setValueRange([0, 50000])} style={{ flex: 1, padding: '6px', background: valueRange[1] === 50000 ? 'rgba(100,150,255,0.2)' : 'rgba(100,150,255,0.08)', border: '1px solid rgba(100,150,255,0.15)', borderRadius: '4px', color: '#e0e0e0', cursor: 'pointer', fontSize: '11px' }}>소</button>
              <button onClick={() => setValueRange([0, 100000])} style={{ flex: 1, padding: '6px', background: valueRange[1] === 100000 ? 'rgba(100,150,255,0.2)' : 'rgba(100,150,255,0.08)', border: '1px solid rgba(100,150,255,0.15)', borderRadius: '4px', color: '#e0e0e0', cursor: 'pointer', fontSize: '11px' }}>중</button>
              <button onClick={() => setValueRange([0, 500000])} style={{ flex: 1, padding: '6px', background: valueRange[1] === 500000 ? 'rgba(100,150,255,0.2)' : 'rgba(100,150,255,0.08)', border: '1px solid rgba(100,150,255,0.15)', borderRadius: '4px', color: '#e0e0e0', cursor: 'pointer', fontSize: '11px' }}>대</button>
            </div>
          </div>

          {/* 필터 초기화 */}
          {(searchTerm || selectedStage || valueRange[1] !== 100000) && (
            <button
              onClick={() => { setSearchTerm(''); setSelectedStage(null); setValueRange([0, 100000]); }}
              style={{ width: '100%', padding: '8px 12px', background: 'rgba(255,107,157,0.1)', border: '1px solid rgba(255,107,157,0.2)', borderRadius: '6px', color: '#ff6b9d', cursor: 'pointer', fontSize: '12px', fontWeight: '500' }}
            >
              필터 초기화
            </button>
          )}
        </div>

        <div style={{ flex: 1 }} />

        {/* 액션 버튼 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            onClick={() => setShowNewModal(true)}
            style={{ width: '100%', padding: '10px', background: 'linear-gradient(135deg, #6496ff, #4975d4)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '13px' }}>
            <Plus size={16} />
            새 연락처
          </button>
          <button style={{ width: '100%', padding: '10px', background: 'rgba(100,150,255,0.1)', border: '1px solid rgba(100,150,255,0.2)', color: '#6496ff', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
            새 거래
          </button>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* 상단 헤더 */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(100,150,255,0.2)' }}>
          <FeatureHeader
            icon={<GlassmorphicIcon Icon={Users} gradient="from-blue-400 to-indigo-500" size={40} />}
            title="CRM 시스템"
            subtitle="고객 관계 관리"
            actions={
              <>
            {/* 뷰 전환 */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setViewMode('kanban')}
                style={{ padding: '8px 16px', background: viewMode === 'kanban' ? 'rgba(100,150,255,0.2)' : 'rgba(100,150,255,0.08)', border: viewMode === 'kanban' ? '1px solid #6496ff' : '1px solid rgba(100,150,255,0.15)', borderRadius: '6px', color: '#e0e0e0', cursor: 'pointer', fontSize: '12px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Grid2X2 size={14} />
                칸반
              </button>
              <button
                onClick={() => setViewMode('table')}
                style={{ padding: '8px 16px', background: viewMode === 'table' ? 'rgba(100,150,255,0.2)' : 'rgba(100,150,255,0.08)', border: viewMode === 'table' ? '1px solid #6496ff' : '1px solid rgba(100,150,255,0.15)', borderRadius: '6px', color: '#e0e0e0', cursor: 'pointer', fontSize: '12px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Table size={14} />
                테이블
              </button>
            </div>
              </>
            }
          />
          <KpiGrid
            items={[
              { label: '총 연락처', value: stats.totalContacts, tone: 'blue' },
              { label: '활성 거래', value: stats.activeDeals, tone: 'green' },
              { label: '총 거래가', value: `$${(stats.totalValue / 1000).toFixed(0)}k`, tone: 'amber' },
              { label: '평균 성약률', value: stats.totalContacts ? `${stats.avgProbability}%` : '-', tone: 'violet' },
            ]}
          />
        </div>

        {/* 콘텐츠 */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>

          {stats.totalContacts === 0 && (
            <div style={{ marginBottom: '24px' }}>
              <EmptyState
                icon={<GlassmorphicIcon Icon={Users} gradient="from-blue-400 to-indigo-500" size={32} />}
                title="등록된 연락처가 없습니다"
                description="고객 연락처를 추가하면 거래 단계, 예상 거래가, 성약률을 한눈에 관리할 수 있습니다."
                steps={['고객 연락처 등록', '거래 단계와 예상 금액 입력', '파이프라인과 성약률을 이 화면에서 확인']}
                tab="crm"
                examples={['CSV로 연락처 가져오기', '이번 달 리드 우선순위', '휴면 고객 다시 연락하기']}
                action={{ label: '연락처 추가', onClick: () => setShowNewModal(true) }}
              />
            </div>
          )}

          {viewMode === 'kanban' ? (
            /* 칸반 뷰 */
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', height: 'fit-content' }}>
              {contactsByStage.map(({ stage, contacts: stageContacts }) => (
                <div key={stage}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '600', color: '#6496ff' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#6496ff' }} />
                      {stage}
                    </div>
                    <div style={{ fontSize: '12px', color: 'rgba(224,224,224,0.5)', fontWeight: '600' }}>{stageContacts.length}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {stageContacts.map(contact => (
                      <div
                        key={contact.id}
                        style={{
                          background: 'linear-gradient(135deg, rgba(100,150,255,0.15), rgba(100,150,255,0.05))',
                          border: '1px solid rgba(100,150,255,0.2)',
                          borderRadius: '8px',
                          padding: '12px',
                          cursor: 'move',
                          transition: 'all 0.2s',
                          position: 'relative'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(100,150,255,0.2)'}
                        onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
                      >
                        <div style={{ fontWeight: '600', marginBottom: '4px', color: '#e0e0e0' }}>{contact.name}</div>
                        <div style={{ fontSize: '12px', color: 'rgba(224,224,224,0.6)', marginBottom: '8px' }}>{contact.company}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ fontSize: '13px', fontWeight: '600', color: '#fcd34d' }}>${contact.value.toLocaleString()}</div>
                          <div style={{ fontSize: '11px', padding: '3px 8px', background: 'rgba(255,152,0,0.2)', color: '#ff9800', borderRadius: '4px', fontWeight: '600' }}>{contact.probability}%</div>
                        </div>
                      </div>
                    ))}
                    {stageContacts.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '20px', color: 'rgba(224,224,224,0.2)', fontSize: '12px' }}>비어있음</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* 테이블 뷰 */
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'rgba(224,224,224,0.6)' }}>
                  결과: {filteredContacts.length} / {contacts.length}
                </div>
                {selectedContacts.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button style={{ padding: '6px 12px', background: 'rgba(100,150,255,0.1)', border: '1px solid rgba(100,150,255,0.2)', borderRadius: '4px', color: '#6496ff', fontSize: '12px', cursor: 'pointer' }}>
                      선택한 {selectedContacts.length}개 내보내기
                    </button>
                    <button style={{ padding: '6px 12px', background: 'rgba(255,107,157,0.1)', border: '1px solid rgba(255,107,157,0.2)', borderRadius: '4px', color: '#ff6b9d', fontSize: '12px', cursor: 'pointer' }}>
                      삭제
                    </button>
                  </div>
                )}
              </div>

              <div style={{ overflowX: 'auto', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid rgba(100,150,255,0.2)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(100,150,255,0.2)', background: 'rgba(100,150,255,0.08)' }}>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#6496ff' }}>
                        <input
                          type="checkbox"
                          checked={selectedContacts.length === filteredContacts.length && filteredContacts.length > 0}
                          onChange={selectAll}
                          style={{ cursor: 'pointer' }}
                        />
                      </th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#6496ff' }}>이름</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#6496ff' }}>회사</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#6496ff' }}>연락처</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#6496ff' }}>단계</th>
                      <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#6496ff' }}>거래가</th>
                      <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#6496ff' }}>성약률</th>
                      <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#6496ff' }}>액션</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContacts.map(contact => (
                      <tr key={contact.id} style={{ borderBottom: '1px solid rgba(100,150,255,0.1)', background: selectedContacts.includes(contact.id) ? 'rgba(100,150,255,0.1)' : 'transparent', transition: 'background 0.2s' }}>
                        <td style={{ padding: '12px' }}>
                          <input
                            type="checkbox"
                            checked={selectedContacts.includes(contact.id)}
                            onChange={() => toggleSelectContact(contact.id)}
                            style={{ cursor: 'pointer' }}
                          />
                        </td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ fontWeight: '600', marginBottom: '2px' }}>{contact.name}</div>
                          <div style={{ fontSize: '11px', color: 'rgba(224,224,224,0.5)' }}>{contact.email}</div>
                        </td>
                        <td style={{ padding: '12px' }}>{contact.company}</td>
                        <td style={{ padding: '12px', fontSize: '12px' }}>
                          <button style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', background: 'rgba(100,150,255,0.1)', border: '1px solid rgba(100,150,255,0.2)', borderRadius: '4px', color: '#6496ff', cursor: 'pointer', fontSize: '11px' }}>
                            <Phone size={12} />
                            {contact.phone}
                          </button>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span style={{ padding: '4px 10px', background: 'rgba(100,150,255,0.15)', borderRadius: '6px', fontSize: '11px', fontWeight: '600', color: '#6496ff' }}>
                            {contact.stage}
                          </span>
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#fcd34d' }}>
                          ${contact.value.toLocaleString()}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                            <div style={{ width: '40px', height: '4px', background: 'rgba(100,150,255,0.2)', borderRadius: '2px', overflow: 'hidden' }}>
                              <div style={{ width: `${contact.probability}%`, height: '100%', background: `hsl(${contact.probability * 1.2}, 100%, 50%)`, borderRadius: '2px' }} />
                            </div>
                            <span style={{ fontSize: '11px', color: 'rgba(224,224,224,0.6)', minWidth: '28px' }}>{contact.probability}%</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <button style={{ padding: '4px 8px', background: 'rgba(100,150,255,0.15)', border: '1px solid rgba(100,150,255,0.3)', borderRadius: '4px', color: '#6496ff', cursor: 'pointer', fontSize: '11px', fontWeight: '600' }}>
                            보기
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 새 연락처 모달 */}
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
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#f1f5f9', marginBottom: '8px' }}>새 연락처</h2>
            <p style={{ fontSize: '13px', color: 'rgba(224,224,224,0.6)', marginBottom: '24px' }}>연락처 정보를 입력하세요</p>

            <input
              type="text"
              placeholder="이름"
              value={newContactName}
              onChange={(e) => setNewContactName(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'rgba(100,150,255,0.1)',
                border: '1px solid rgba(100,150,255,0.2)',
                borderRadius: '8px',
                color: '#e0e0e0',
                fontSize: '14px',
                marginBottom: '12px',
                boxSizing: 'border-box'
              }}
              autoFocus
            />

            <input
              type="email"
              placeholder="이메일"
              value={newContactEmail}
              onChange={(e) => setNewContactEmail(e.target.value)}
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
            />

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => {
                  setShowNewModal(false);
                  setNewContactName('');
                  setNewContactEmail('');
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
                추가
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CRMDashboard;
