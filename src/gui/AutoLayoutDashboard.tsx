import React, { useState, useMemo } from 'react';
import { Zap, Plus, Search, TrendingUp, Star, Eye, Zap as ZapIcon, CheckCircle2, Grid3x3, Box, Palette, RefreshCw } from 'lucide-react';
import { GlassmorphicIcon } from './components/GlassmorphicIcon';
import { FeatureHeader, KpiGrid, EmptyState, PanelStats } from './components/feature/FeatureUI';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';

export const AutoLayoutDashboard = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [projectName, setProjectName] = useState('');

  const [suggestions, setSuggestions] = useState<any[]>([]);

  const handleGetSuggestions = async () => {
    if (!projectName.trim()) {
      alert('프로젝트명을 입력해주세요');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/advanced-design/auto-layout/suggest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          project_name: projectName,
          design_elements: 'header,nav,main,footer'
        })
      });

      if (response.ok) {
        const data = await response.json();
        alert('AI 레이아웃 분석이 완료되었습니다!');
        setProjectName('');
        setShowNewModal(false);
      }
    } catch (error) {
      console.error('레이아웃 제안 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSuggestions = useMemo(() => {
    return suggestions.filter(s => {
      const matchesSearch = s.layout.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRating = selectedRating === null || s.rating >= selectedRating;
      return matchesSearch && matchesRating;
    });
  }, [suggestions, searchTerm, selectedRating]);

  const types = {
    responsive: { label: '반응형', icon: Grid3x3 },
    modular: { label: '모듈식', icon: Box },
    mixed: { label: '혼합형', icon: Palette },
    flexible: { label: '유연형', icon: RefreshCw }
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
            placeholder="레이아웃 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', background: 'linear-gradient(135deg, rgba(100,150,255,0.15) 0%, rgba(100,150,255,0.05) 100%)', border: '1px solid rgba(100,150,255,0.3)', borderRadius: '8px', color: '#e0e0e0', fontSize: '13px' }}
          />
          <Search size={14} style={{ position: 'absolute', right: '12px', top: '12px', color: 'rgba(224,224,224,0.4)' }} />
        </div>

        {/* 평점 필터 */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', color: 'rgba(224,224,224,0.5)', marginBottom: '8px', fontWeight: '600' }}>평점</div>
          {[5, 4, 3].map(rating => (
            <button
              key={rating}
              onClick={() => setSelectedRating(selectedRating === rating ? null : rating)}
              style={{
                display: 'block',
                width: '100%',
                padding: '8px 12px',
                marginBottom: '6px',
                background: selectedRating === rating ? 'rgba(100,150,255,0.3)' : 'rgba(100,150,255,0.1)',
                border: `1px solid ${selectedRating === rating ? 'rgba(100,150,255,0.5)' : 'rgba(100,150,255,0.2)'}`,
                borderRadius: '6px',
                color: '#e0e0e0',
                fontSize: '12px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s'
              }}
            >
              {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
            </button>
          ))}
        </div>

        {/* 레이아웃 타입 */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', color: 'rgba(224,224,224,0.5)', marginBottom: '8px', fontWeight: '600' }}>타입</div>
          {Object.entries(types).map(([key, typeInfo]) => {
            const Icon = typeInfo.icon;
            return (
              <div key={key} style={{ fontSize: '12px', color: '#cbd5e1', padding: '8px 0', borderBottom: '1px solid rgba(100,150,255,0.1)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon size={14} style={{ color: 'rgba(224,224,224,0.6)' }} />
                {typeInfo.label}
              </div>
            );
          })}
        </div>

        {/* 통계 */}
        <PanelStats items={[
          { label: '총 레이아웃', value: suggestions.length, tone: 'green' },
          { label: '평균 점수', value: '8.6', tone: 'amber' },
          { label: '추천', value: 'Grid 3-Column', tone: 'green' },
        ]} />
      </div>

      {/* 우측 콘텐츠 */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* 헤더 */}
        <div style={{ padding: '24px', borderBottom: '1px solid rgba(100,150,255,0.2)', background: 'linear-gradient(135deg, rgba(0,0,0,0.4) 0%, rgba(100,150,255,0.1) 100%)' }}>
          <FeatureHeader
            icon={<GlassmorphicIcon Icon={Zap} gradient="from-yellow-400 to-orange-500" size={40} />}
            title="자동 레이아웃 AI"
            subtitle="AI가 최적의 레이아웃을 제안합니다"
            badge="AI"
            actions={
              <>
            <button
              onClick={() => setShowNewModal(true)}
              style={{ padding: '10px 16px', background: '#646cff', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={16} /> 분석
            </button>
              </>
            }
          />
          <KpiGrid
            items={[
              { label: '총 레이아웃', value: suggestions.length, tone: 'amber' },
              { label: '평균 점수', value: '8.6', tone: 'green' },
              { label: '추천', value: 'Grid 3-Column', tone: 'blue' },
            ]}
          />
        </div>

        {suggestions.length === 0 && (
          <div style={{ margin: '24px' }}>
            <EmptyState
              icon={<GlassmorphicIcon Icon={Zap} gradient="from-yellow-400 to-orange-500" size={32} />}
              title="분석한 레이아웃이 없습니다"
              description="디자인을 입력하면 골든 레이시오와 반응형 기준으로 레이아웃 후보를 제안합니다."
              steps={['분석할 디자인 또는 콘텐츠 입력', '레이아웃 타입과 기준 선택', '추천 레이아웃을 이 화면에서 비교']}
              tab="auto-layout"
              examples={['상품 상세 페이지 레이아웃 추천', '모바일 홈 배치 최적화', '골든 레이시오 적용 검토']}
              action={{ label: '분석 시작', onClick: () => setShowNewModal(true) }}
            />
          </div>
        )}

        {/* 레이아웃 제안 */}
        <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {filteredSuggestions.map((suggestion, idx) => (
              <div key={suggestion.id} style={{ background: 'linear-gradient(135deg, rgba(100,150,255,0.15) 0%, rgba(100,150,255,0.05) 100%)', border: '1px solid rgba(100,150,255,0.3)', borderRadius: '14px', padding: '16px', transition: 'all 0.2s', cursor: 'pointer' }}>
                {/* 프리뷰 */}
                <div style={{ background: 'linear-gradient(135deg, rgba(100,150,255,0.15) 0%, rgba(100,150,255,0.05) 100%)', borderRadius: '8px', padding: '20px', marginBottom: '12px', fontSize: '32px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80px' }}>
                  {suggestion.preview}
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#fff', marginBottom: '4px' }}>{suggestion.layout}</h3>
                  <p style={{ fontSize: '12px', color: 'rgba(224,224,224,0.6)', lineHeight: '1.4' }}>{suggestion.description}</p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: 'rgba(224,224,224,0.5)', marginBottom: '4px' }}>AI 평가</div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#fcd34d' }}>{suggestion.score}/10</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'rgba(224,224,224,0.5)', marginBottom: '4px' }}>사용자</div>
                    <div style={{ fontSize: '14px', color: '#4ade80' }}>
                      {'★'.repeat(suggestion.rating)}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '6px', fontSize: '11px' }}>
                  {(() => {
                    const typeInfo = types[suggestion.type as keyof typeof types];
                    const Icon = typeInfo.icon;
                    return (
                      <span style={{ background: 'rgba(100,150,255,0.2)', padding: '6px 8px', borderRadius: '4px', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Icon size={12} />
                        {typeInfo.label}
                      </span>
                    );
                  })()}
                </div>

                <button style={{ width: '100%', marginTop: '12px', padding: '10px', background: 'rgba(100,150,255,0.2)', border: '1px solid rgba(100,150,255,0.3)', borderRadius: '6px', color: '#cbd5e1', cursor: 'pointer', fontSize: '12px', fontWeight: '600', transition: 'all 0.2s' }}>
                  <Eye size={14} style={{ display: 'inline', marginRight: '6px' }} />
                  미리보기
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 모달 */}
      {showNewModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', border: '1px solid rgba(100,150,255,0.3)', borderRadius: '16px', padding: '32px', width: '400px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#fff', marginBottom: '20px' }}>AI 레이아웃 분석</h2>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: 'rgba(224,224,224,0.7)', marginBottom: '8px', fontWeight: '600' }}>프로젝트명</label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="프로젝트명"
                style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, rgba(100,150,255,0.15) 0%, rgba(100,150,255,0.05) 100%)', border: '1px solid rgba(100,150,255,0.3)', borderRadius: '8px', color: '#e0e0e0', fontSize: '13px' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowNewModal(false)}
                style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid rgba(100,150,255,0.3)', borderRadius: '8px', color: '#cbd5e1', cursor: 'pointer', fontWeight: '600' }}
              >
                취소
              </button>
              <button
                onClick={handleGetSuggestions}
                disabled={loading}
                style={{ flex: 1, padding: '12px', background: '#646cff', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontWeight: '600' }}
              >
                {loading ? '분석중...' : '분석'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
