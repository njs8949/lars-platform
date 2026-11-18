import React, { useState, useEffect } from 'react';
import { streamDeck, type Slide } from './lib/presentationStream';
import { LivePresentationPanel } from './components/LivePresentationPanel';
import { FileText, Palette, Plus, Download, Zap, Check2, Search, RotateCw, Trash2 } from 'lucide-react';
import { GlassmorphicIcon } from './components/GlassmorphicIcon';
import { FeatureHeader, KpiGrid, EmptyState } from './components/feature/FeatureUI';
import { DeckEditor } from './components/DeckEditor';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';

export const PresentationThemeDashboard = () => {
  const [activeView, setActiveView] = useState<'ppt' | 'theme'>('ppt');
  const [editingDeckId, setEditingDeckId] = useState<string | null>(null);
  const [decks, setDecks] = useState<{ id: string; title: string; slides: number; updated: string }[]>([]);
  const [deckTopic, setDeckTopic] = useState('');
  const [deckSlides, setDeckSlides] = useState(8);
  const [deckBusy, setDeckBusy] = useState(false);
  const [deckMessage, setDeckMessage] = useState('');
  const [liveOpen, setLiveOpen] = useState(false);
  const [liveStatus, setLiveStatus] = useState('');
  const [liveTitle, setLiveTitle] = useState('');
  const [liveSlides, setLiveSlides] = useState<Slide[]>([]);
  const [liveTotal, setLiveTotal] = useState(0);
  const [liveFinished, setLiveFinished] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [liveDeckId, setLiveDeckId] = useState<string | null>(null);

  const loadDecks = async () => {
    try {
      const res = await fetch(`${API_URL}/decks`);
      const data = await res.json();
      setDecks(data.decks || []);
    } catch {
      setDecks([]);
    }
  };

  const createDeck = async () => {
    if (!deckTopic.trim()) return;
    const topic = deckTopic;
    setDeckBusy(true);
    setDeckMessage('');
    setLiveOpen(true);
    setLiveStatus('준비 중');
    setLiveTitle('');
    setLiveSlides([]);
    setLiveTotal(0);
    setLiveFinished(false);
    setLiveError(null);
    setLiveDeckId(null);
    try {
      await streamDeck(topic, 'general', deckSlides, (e) => {
        if (e.type === 'status') setLiveStatus(e.message);
        else if (e.type === 'title') setLiveTitle(e.title);
        else if (e.type === 'slide') {
          setLiveTotal(e.total);
          setLiveSlides((prev) => [...prev, e.slide]);
          setLiveStatus('장표를 쓰는 중');
        } else if (e.type === 'done') {
          setLiveFinished(true);
          setLiveStatus('완료');
          setLiveDeckId(e.deck_id);
          setDeckTopic('');
          setEditingDeckId(e.deck_id);
        } else if (e.type === 'error') {
          setLiveError(e.message);
        }
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : '만들지 못했습니다.';
      setLiveError(message);
      setDeckMessage(message);
    } finally {
      setDeckBusy(false);
    }
  };

  useEffect(() => { loadDecks(); }, []);
  useEffect(() => { if (!editingDeckId) loadDecks(); }, [editingDeckId]);
  const [pptSearchTerm, setPptSearchTerm] = useState('');
  const [themeSearchTerm, setThemeSearchTerm] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [loading, setLoading] = useState(false);

  // PPT 데이터
  const [presentations, setPresentations] = useState([
    { id: 1, name: 'Q3 Report', slides: 24, status: 'completed', template: 'Modern Blue', size: '4.2MB', created: '2024-09-09', downloadCount: 12 },
    { id: 2, name: 'Product Demo', slides: 18, status: 'generating', template: 'Startup', size: '3.1MB', created: '2024-09-09', downloadCount: 5 },
    { id: 3, name: 'Team Training', slides: 32, status: 'completed', template: 'Academic', size: '5.8MB', created: '2024-09-08', downloadCount: 23 },
  ]);

  // 테마 데이터
  const [themes, setThemes] = useState([
    { id: 1, name: 'Modern Blue', category: 'Business', slides: 12, usage: 245, colors: ['#1e40af', '#0284c7', '#f0f9ff'] },
    { id: 2, name: 'Startup', category: 'Pitch', slides: 10, usage: 189, colors: ['#dc2626', '#f97316', '#fef3c7'] },
    { id: 3, name: 'Academic', category: 'Education', slides: 8, usage: 92, colors: ['#1f2937', '#4b5563', '#e5e7eb'] },
    { id: 4, name: 'Creative', category: 'Design', slides: 15, usage: 167, colors: ['#7c3aed', '#ec4899', '#06b6d4'] },
    { id: 5, name: 'Professional', category: 'Business', slides: 12, usage: 234, colors: ['#0f172a', '#1e293b', '#cbd5e1'] },
    { id: 6, name: 'Vibrant', category: 'Marketing', slides: 20, usage: 145, colors: ['#ff6b6b', '#4ecdc4', '#ffe66d'] },
  ]);

  const templates = [
    { id: 1, name: 'Modern Blue', category: 'Business', slides: 12, usage: 245, icon: '💼', featured: true },
    { id: 2, name: 'Startup', category: 'Pitch', slides: 10, usage: 189, icon: '🚀', featured: true },
    { id: 3, name: 'Academic', category: 'Education', slides: 8, usage: 92, icon: '📚', featured: false },
    { id: 4, name: 'Creative', category: 'Design', slides: 15, usage: 167, icon: '🎨', featured: false },
  ];

  const categories = ['Business', 'Pitch', 'Education', 'Design', 'Marketing'];

  const pptStats = {
    generatedPPT: presentations.filter(p => p.status === 'completed').length,
    templates: templates.length,
    avgGenTime: '2.3초',
    totalDownloads: presentations.reduce((sum, p) => sum + p.downloadCount, 0)
  };

  const themeStats = {
    totalThemes: themes.length,
    customThemes: 3,
    usedThemes: themes.length,
    avgColors: 3
  };

  // 데이터 로드
  useEffect(() => {
    loadData();
  }, [activeView]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (activeView === 'ppt') {
        const response = await fetch(`${API_URL}/presentations/`);
        if (response.ok) {
          const data = await response.json();
          setPresentations(data.data || []);
        }
      } else {
        const response = await fetch(`${API_URL}/presentations/themes/`);
        if (response.ok) {
          const data = await response.json();
          setThemes(data.data || []);
        }
      }
    } catch (error) {
      console.error('데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = async () => {
    if (!newItemName.trim()) {
      alert(activeView === 'ppt' ? '프레젠테이션 이름을 입력해주세요' : '테마 이름을 입력해주세요');
      return;
    }

    try {
      setLoading(true);
      if (activeView === 'ppt') {
        // 주제로 실제 발표 파일(.pptx)을 만들고 내려받는다
        const generated = await fetch(`http://localhost:8001/api/presentation/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic: newItemName, audience: 'general', num_slides: 8 })
        });
        const result = await generated.json();
        if (!generated.ok || !result.success || !result.pptx_base64) {
          alert(result.error || result.detail || '발표 자료를 만들지 못했습니다.');
        } else {
          const bytes = Uint8Array.from(atob(result.pptx_base64), (c) => c.charCodeAt(0));
          const url = URL.createObjectURL(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' }));
          const link = document.createElement('a');
          link.href = url;
          link.download = `${newItemName}.pptx`;
          link.click();
          URL.revokeObjectURL(url);
          // 목록에도 기록한다
          const record = await fetch(`${API_URL}/presentations/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newItemName, template: 'AI 생성', slides: result.slides_count })
          });
          if (record.ok) setPresentations([...presentations, await record.json()]);
        }
      } else {
        const response = await fetch(`${API_URL}/presentations/themes/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newItemName,
            category: 'Custom',
            colors: ['#3b82f6', '#8b5cf6', '#ec4899']
          })
        });

        if (response.ok) {
          const newTheme = await response.json();
          setThemes([...themes, newTheme]);
        }
      }

      setNewItemName('');
      setShowNewModal(false);
    } catch (error) {
      console.error('항목 생성 실패:', error);
      alert('항목 생성 실패');
    } finally {
      setLoading(false);
    }
  };

  const livePanel = (
    <LivePresentationPanel
      open={liveOpen}
      onToggle={() => setLiveOpen((o) => !o)}
      status={liveStatus}
      title={liveTitle}
      slides={liveSlides}
      total={liveTotal}
      finished={liveFinished}
      error={liveError}
      onOpenEditor={liveDeckId ? () => setEditingDeckId(liveDeckId) : undefined}
    />
  );

  if (editingDeckId) {
    return (
      <>
        <div style={{ height: '100%', width: '100%', overflow: 'auto', background: 'linear-gradient(135deg, #1a0f2e 0%, #16213e 100%)' }}>
          <DeckEditor deckId={editingDeckId} onBack={() => setEditingDeckId(null)} />
        </div>
        {livePanel}
      </>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
    <div style={{ display: 'flex', flex: 1, minHeight: 0, background: 'linear-gradient(135deg, #1a0f2e 0%, #16213e 100%)' }}>

      {/* 좌측 사이드바 */}
      <div style={{ width: '280px', borderRight: '1px solid rgba(216,180,254,0.2)', overflow: 'auto', display: 'flex', flexDirection: 'column', padding: '20px' }}>
        <div style={{ marginBottom: '20px', padding: '12px', borderRadius: '10px', background: 'rgba(216,180,254,0.06)', border: '1px solid rgba(216,180,254,0.15)' }}>
          <div style={{ fontSize: '12px', color: 'rgba(224,224,224,0.7)', fontWeight: '600', marginBottom: '8px' }}>편집 가능한 발표 자료</div>
          <input
            value={deckTopic}
            onChange={(e) => setDeckTopic(e.target.value)}
            placeholder="주제를 입력하세요"
            style={{ width: '100%', boxSizing: 'border-box', padding: '8px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', background: '#14141a', color: '#eee', fontSize: '13px' }}
          />
          <div style={{ display: 'flex', gap: '6px', marginTop: '8px', alignItems: 'center' }}>
            <label style={{ fontSize: '12px', color: 'rgba(224,224,224,0.6)' }}>장수
              <input type="number" min={4} max={15} value={deckSlides} onChange={(e) => setDeckSlides(Number(e.target.value) || 8)}
                style={{ width: '56px', marginLeft: '6px', padding: '4px', background: '#14141a', color: '#eee', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px' }} />
            </label>
            <button onClick={createDeck} disabled={deckBusy || !deckTopic.trim()}
              style={{ flex: 1, padding: '7px', borderRadius: '8px', border: 'none', background: '#8b5cf6', color: '#fff', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
              {deckBusy ? '만드는 중...' : '만들기'}
            </button>
          </div>
          {deckMessage && <div style={{ fontSize: '12px', color: '#fca5a5', marginTop: '6px' }}>{deckMessage}</div>}
          {decks.length > 0 && (
            <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {decks.slice(0, 8).map((d) => (
                <button key={d.id} onClick={() => setEditingDeckId(d.id)}
                  style={{ textAlign: 'left', padding: '6px 8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#e0e0e0', fontSize: '12px', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {d.title} <span style={{ color: '#888' }}>({d.slides}장)</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '12px', color: 'rgba(224,224,224,0.5)', textTransform: 'uppercase', fontWeight: '600', marginBottom: '12px' }}>뷰 선택</div>

          <button
            onClick={() => setActiveView('ppt')}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '12px 16px',
              marginBottom: '8px',
              background: activeView === 'ppt' ? 'linear-gradient(135deg, #d8b4fe, #c084fc)' : 'rgba(216,180,254,0.08)',
              border: activeView === 'ppt' ? '1px solid #d8b4fe' : '1px solid rgba(216,180,254,0.15)',
              borderRadius: '8px',
              color: activeView === 'ppt' ? '#000' : '#e0e0e0',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <FileText size={16} />
            프레젠테이션
          </button>

          <button
            onClick={() => setActiveView('theme')}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '12px 16px',
              marginBottom: '8px',
              background: activeView === 'theme' ? 'linear-gradient(135deg, #c084fc, #a78bfa)' : 'rgba(216,180,254,0.08)',
              border: activeView === 'theme' ? '1px solid #c084fc' : '1px solid rgba(216,180,254,0.15)',
              borderRadius: '8px',
              color: activeView === 'theme' ? '#000' : '#e0e0e0',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Palette size={16} />
            디자인 테마
          </button>

          <div style={{ marginTop: '20px', fontSize: '11px', color: 'rgba(224,224,224,0.5)', fontWeight: '600', marginBottom: '8px' }}>검색</div>

          {activeView === 'ppt' ? (
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="프레젠테이션..."
                value={pptSearchTerm}
                onChange={(e) => setPptSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', background: 'rgba(216,180,254,0.1)', border: '1px solid rgba(216,180,254,0.2)', borderRadius: '8px', color: '#e0e0e0', fontSize: '13px' }}
              />
              <Search size={14} style={{ position: 'absolute', right: '12px', top: '12px', color: 'rgba(224,224,224,0.4)' }} />
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="테마 검색..."
                value={themeSearchTerm}
                onChange={(e) => setThemeSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', background: 'rgba(216,180,254,0.1)', border: '1px solid rgba(216,180,254,0.2)', borderRadius: '8px', color: '#e0e0e0', fontSize: '13px' }}
              />
              <Search size={14} style={{ position: 'absolute', right: '12px', top: '12px', color: 'rgba(224,224,224,0.4)' }} />
            </div>
          )}
        </div>

        <div style={{ flex: 1 }} />

        <button
          onClick={() => setShowNewModal(true)}
          style={{ width: '100%', padding: '10px', background: 'linear-gradient(135deg, #d8b4fe, #c084fc)', color: '#000', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '13px' }}
        >
          <Plus size={16} />
          {activeView === 'ppt' ? '새 프레젠테이션' : '새 테마'}
        </button>
      </div>

      {/* 메인 콘텐츠 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* 헤더 */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(216,180,254,0.2)' }}>
          <FeatureHeader
            icon={<GlassmorphicIcon Icon={activeView === 'ppt' ? FileText : Palette} gradient={activeView === 'ppt' ? 'from-pink-400 to-red-500' : 'from-purple-400 to-pink-500'} size={40} />}
            title={activeView === 'ppt' ? 'PPT 자동 생성' : '디자인 테마'}
            subtitle={activeView === 'ppt' ? '프레젠테이션 제작 자동화' : '테마 맞춤 디자인'}
          />
          <KpiGrid
            items={activeView === 'ppt' ? [
              { label: '생성된 PPT', value: pptStats.generatedPPT, tone: 'violet' },
              { label: '템플릿', value: pptStats.templates, tone: 'violet' },
              { label: '평균 생성시간', value: pptStats.avgGenTime, tone: 'amber' },
              { label: '다운로드', value: pptStats.totalDownloads, tone: 'blue' },
            ] : [
              { label: '총 테마', value: themeStats.totalThemes, tone: 'violet' },
              { label: '커스텀 테마', value: themeStats.customThemes, tone: 'violet' },
              { label: '사용 중인 테마', value: themeStats.usedThemes, tone: 'green' },
              { label: '평균 색상', value: themeStats.avgColors, tone: 'amber' },
            ]}
          />
        </div>

        {/* 콘텐츠 */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
          {(activeView === 'ppt' ? presentations.length : themes.length) === 0 && (
            <div style={{ marginBottom: '24px' }}>
              <EmptyState
                icon={<GlassmorphicIcon Icon={activeView === 'ppt' ? FileText : Palette} gradient="from-purple-400 to-pink-500" size={32} />}
                title={activeView === 'ppt' ? '만든 프레젠테이션이 없습니다' : '등록된 테마가 없습니다'}
                description={activeView === 'ppt' ? '주제와 템플릿을 고르면 슬라이드 초안을 자동으로 만들어 드립니다.' : '색상과 폰트를 묶은 테마를 만들어 프레젠테이션에 일관되게 적용하세요.'}
                steps={activeView === 'ppt' ? ['주제와 대상 청중 입력', '템플릿과 테마 선택', '생성된 PPT를 이 화면에서 다운로드'] : ['기본 색상과 폰트 지정', '테마 이름 저장', '프레젠테이션에 적용']}
                tab={activeView === 'ppt' ? 'presentation' : 'color-font'}
                examples={activeView === 'ppt' ? ['분기 실적 발표 자료', '제품 소개 덱', '교육 세션 슬라이드'] : ['브랜드 컬러 테마 만들기', '다크 모드 테마 복제', '회사 템플릿 공유']}
                action={{ label: activeView === 'ppt' ? '새 프레젠테이션' : '새 테마', onClick: () => setShowNewModal(true) }}
              />
            </div>
          )}
          {activeView === 'ppt' ? (
            // PPT 프레젠테이션 목록
            <div>
              {presentations.map(p => (
                <div key={p.id} style={{ background: 'rgba(216,180,254,0.08)', padding: '16px', marginBottom: '12px', borderRadius: '10px', border: '1px solid rgba(216,180,254,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', marginBottom: '4px', color: '#e0e0e0' }}>{p.name}</div>
                    <div style={{ fontSize: '12px', color: 'rgba(224,224,224,0.6)' }}>{p.slides} 슬라이드 • {p.template} • {p.size}</div>
                  </div>
                  <span style={{ padding: '6px 12px', background: p.status === 'completed' ? 'rgba(74,222,128,0.2)' : 'rgba(252,212,45,0.2)', color: p.status === 'completed' ? '#4ade80' : '#fcd34d', borderRadius: '6px', fontSize: '11px', fontWeight: '600', marginRight: '12px' }}>
                    {p.status === 'completed' ? '✓ 완료' : '⏳ 생성중'}
                  </span>
                  <button style={{ padding: '8px 12px', background: 'rgba(216,180,254,0.2)', border: '1px solid #d8b4fe', color: '#d8b4fe', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '600' }}>
                    <Download size={14} />
                    다운
                  </button>
                </div>
              ))}
            </div>
          ) : (
            // 디자인 테마 그리드
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
              {themes.map(theme => (
                <div
                  key={theme.id}
                  style={{
                    background: 'linear-gradient(135deg, rgba(216,180,254,0.15), rgba(216,180,254,0.05))',
                    border: '1px solid rgba(216,180,254,0.2)',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 8px 24px rgba(216,180,254,0.2)'}
                  onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
                >
                  {/* 색상 프리뷰 */}
                  <div style={{ display: 'flex', height: '80px' }}>
                    {theme.colors.map((color, idx) => (
                      <div key={idx} style={{ flex: 1, background: color, borderRight: idx < theme.colors.length - 1 ? '1px solid rgba(0,0,0,0.1)' : 'none' }} />
                    ))}
                  </div>

                  <div style={{ padding: '12px' }}>
                    <div style={{ fontWeight: '600', marginBottom: '4px', color: '#d8b4fe' }}>{theme.name}</div>
                    <div style={{ fontSize: '12px', color: 'rgba(224,224,224,0.6)', marginBottom: '8px' }}>
                      {theme.category} • {theme.usage}회 사용
                    </div>
                    <button style={{ width: '100%', padding: '8px', background: 'linear-gradient(135deg, #d8b4fe, #c084fc)', color: '#000', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                      사용
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 새 항목 추가 모달 */}
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
            border: '1px solid rgba(216,180,254,0.2)',
            borderRadius: '12px',
            padding: '32px',
            maxWidth: '400px',
            width: '90%'
          }}>
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#f1f5f9', marginBottom: '8px' }}>
                {activeView === 'ppt' ? '새 프레젠테이션' : '새 테마'}
              </h2>
              <p style={{ fontSize: '13px', color: 'rgba(224,224,224,0.6)' }}>
                {activeView === 'ppt' ? '프레젠테이션 이름을 입력하세요' : '테마 이름을 입력하세요'}
              </p>
            </div>

            <input
              type="text"
              placeholder={activeView === 'ppt' ? '예: 분기별 보고서' : '예: 비즈니스 블루'}
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddNew()}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'rgba(216,180,254,0.1)',
                border: '1px solid rgba(216,180,254,0.2)',
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
                  setNewItemName('');
                }}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  background: 'rgba(216,180,254,0.1)',
                  border: '1px solid rgba(216,180,254,0.2)',
                  borderRadius: '8px',
                  color: '#d8b4fe',
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
                  background: 'linear-gradient(135deg, #d8b4fe, #c084fc)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#000',
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
    {livePanel}
    </div>
  );
};

export default PresentationThemeDashboard;