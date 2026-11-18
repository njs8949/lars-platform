import React, { useState, useMemo } from 'react';
import { FileText, Plus, Download, Zap, Check2, BarChart3, Layout, Palette, Search, Filter, RotateCw, Trash2 } from 'lucide-react';
import { GlassmorphicIcon } from './components/GlassmorphicIcon';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';

export const PPTGenerationDashboard = () => {
  const [viewMode, setViewMode] = useState<'templates' | 'gallery' | 'history'>('templates');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newPptName, setNewPptName] = useState('');

  const [templates, setTemplates] = useState([
    { id: 1, name: 'Modern Blue', category: 'Business', slides: 12, usage: 245, icon: '💼', featured: true },
    { id: 2, name: 'Startup', category: 'Pitch', slides: 10, usage: 189, icon: '🚀', featured: true },
    { id: 3, name: 'Academic', category: 'Education', slides: 8, usage: 92, icon: '📚', featured: false },
    { id: 4, name: 'Creative', category: 'Design', slides: 15, usage: 167, icon: '🎨', featured: false },
  ]);

  const presentations = [
    { id: 1, name: 'Q3 Report', slides: 24, status: 'completed', template: 'Modern Blue', size: '4.2MB', created: '2024-09-09', downloadCount: 12 },
    { id: 2, name: 'Product Demo', slides: 18, status: 'generating', template: 'Startup', size: '3.1MB', created: '2024-09-09', downloadCount: 5 },
    { id: 3, name: 'Team Training', slides: 32, status: 'completed', template: 'Academic', size: '5.8MB', created: '2024-09-08', downloadCount: 23 },
  ];

  const categories = ['Business', 'Pitch', 'Education', 'Design', 'Marketing'];

  const filteredTemplates = useMemo(() => {
    return templates.filter(t => {
      const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = !selectedCategory || t.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [templates, searchTerm, selectedCategory]);

  const stats = {
    generatedPPT: presentations.filter(p => p.status === 'completed').length,
    templates: templates.length,
    avgGenTime: '2.3초',
    totalDownloads: presentations.reduce((sum, p) => sum + p.downloadCount, 0)
  };

  const getStatusColor = (status: string) => {
    return status === 'completed' ? '#4ade80' : '#fcd34d';
  };

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%', background: 'linear-gradient(135deg, #3d1f2d 0%, #1a0f15 100%)' }}>

      {/* 좌측 사이드바 */}
      <div style={{ width: '280px', borderRight: '1px solid rgba(216,180,254,0.2)', overflow: 'auto', display: 'flex', flexDirection: 'column', padding: '20px' }}>
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '12px', color: 'rgba(224,224,224,0.5)', textTransform: 'uppercase', fontWeight: '600', marginBottom: '12px' }}>필터</div>

          <div style={{ marginBottom: '16px', position: 'relative' }}>
            <input type="text" placeholder="검색..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '10px 12px', background: 'rgba(200,50,150,0.1)', border: '1px solid rgba(200,50,150,0.2)', borderRadius: '8px', color: '#e0e0e0', fontSize: '13px' }} />
            <Search size={14} style={{ position: 'absolute', right: '12px', top: '12px', color: 'rgba(224,224,224,0.4)' }} />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', color: 'rgba(224,224,224,0.5)', marginBottom: '8px', fontWeight: '600' }}>카테고리</div>
            {categories.map(cat => (
              <button key={cat} onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)} style={{ width: '100%', textAlign: 'left', padding: '8px 12px', marginBottom: '6px', background: selectedCategory === cat ? 'rgba(200,50,150,0.2)' : 'rgba(200,50,150,0.08)', border: selectedCategory === cat ? '1px solid #d8b4fe' : '1px solid rgba(200,50,150,0.15)', borderRadius: '6px', color: '#e0e0e0', cursor: 'pointer', fontSize: '13px' }}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1 }} />

        <button
          onClick={() => setShowNewModal(true)}
          style={{ width: '100%', padding: '10px', background: 'linear-gradient(135deg, #d8b4fe, #c084fc)', color: '#000', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '13px' }}>
          <Plus size={16} />
          새 프레젠테이션
        </button>
      </div>

      {/* 메인 콘텐츠 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(216,180,254,0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <GlassmorphicIcon Icon={FileText} gradient="from-pink-400 to-red-500" size={40} />
              <div>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>PPT 자동 생성</div>
                <div style={{ fontSize: '12px', color: 'rgba(224,224,224,0.6)' }}>프레젠테이션 제작</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              {['templates', 'gallery', 'history'].map(mode => (
                <button key={mode} onClick={() => setViewMode(mode as any)} style={{ padding: '8px 16px', background: viewMode === mode ? 'rgba(200,50,150,0.2)' : 'rgba(200,50,150,0.08)', border: viewMode === mode ? '1px solid #d8b4fe' : '1px solid rgba(200,50,150,0.15)', borderRadius: '6px', color: '#e0e0e0', cursor: 'pointer', fontSize: '12px', fontWeight: '500' }}>
                  {mode === 'templates' && '🎨 템플릿'}
                  {mode === 'gallery' && '📑 갤러리'}
                  {mode === 'history' && '⏰ 이력'}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            <div style={{ background: 'rgba(200,50,150,0.08)', padding: '16px', borderRadius: '10px', border: '1px solid rgba(200,50,150,0.2)' }}>
              <div style={{ fontSize: '11px', color: 'rgba(224,224,224,0.6)', textTransform: 'uppercase', fontWeight: '600', marginBottom: '4px' }}>생성된 PPT</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#d8b4fe' }}>{stats.generatedPPT}</div>
            </div>
            <div style={{ background: 'rgba(200,50,150,0.08)', padding: '16px', borderRadius: '10px', border: '1px solid rgba(200,50,150,0.2)' }}>
              <div style={{ fontSize: '11px', color: 'rgba(224,224,224,0.6)', textTransform: 'uppercase', fontWeight: '600', marginBottom: '4px' }}>템플릿</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#d8b4fe' }}>{stats.templates}</div>
            </div>
            <div style={{ background: 'rgba(200,50,150,0.08)', padding: '16px', borderRadius: '10px', border: '1px solid rgba(200,50,150,0.2)' }}>
              <div style={{ fontSize: '11px', color: 'rgba(224,224,224,0.6)', textTransform: 'uppercase', fontWeight: '600', marginBottom: '4px' }}>평균 생성시간</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#fcd34d' }}>{stats.avgGenTime}</div>
            </div>
            <div style={{ background: 'rgba(200,50,150,0.08)', padding: '16px', borderRadius: '10px', border: '1px solid rgba(200,50,150,0.2)' }}>
              <div style={{ fontSize: '11px', color: 'rgba(224,224,224,0.6)', textTransform: 'uppercase', fontWeight: '600', marginBottom: '4px' }}>다운로드</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#64c8ff' }}>{stats.totalDownloads}</div>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>

          {viewMode === 'templates' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
              {filteredTemplates.map(t => (
                <div key={t.id} style={{ background: 'linear-gradient(135deg, rgba(200,50,150,0.15), rgba(200,50,150,0.05))', border: '1px solid rgba(200,50,150,0.2)', borderRadius: '12px', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 8px 24px rgba(200,50,150,0.2)'} onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}>
                  <div style={{ background: 'rgba(200,50,150,0.15)', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>{t.icon}</div>
                  <div style={{ padding: '12px' }}>
                    <div style={{ fontWeight: '600', marginBottom: '4px', color: '#d8b4fe' }}>{t.name}</div>
                    <div style={{ fontSize: '12px', color: 'rgba(224,224,224,0.6)', marginBottom: '8px' }}>{t.category} • {t.slides} 슬라이드</div>
                    <div style={{ fontSize: '11px', color: 'rgba(224,224,224,0.5)', marginBottom: '10px' }}>사용: {t.usage}회</div>
                    <button style={{ width: '100%', padding: '8px', background: 'linear-gradient(135deg, #d8b4fe, #c084fc)', color: '#000', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>사용</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {viewMode === 'gallery' && (
            <div>
              {presentations.map(p => (
                <div key={p.id} style={{ background: 'rgba(200,50,150,0.08)', padding: '16px', marginBottom: '12px', borderRadius: '10px', border: '1px solid rgba(200,50,150,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', marginBottom: '4px', color: '#e0e0e0' }}>{p.name}</div>
                    <div style={{ fontSize: '12px', color: 'rgba(224,224,224,0.6)' }}>{p.slides} 슬라이드 • {p.template} • {p.size}</div>
                  </div>
                  <span style={{ padding: '6px 12px', background: p.status === 'completed' ? 'rgba(74,222,128,0.2)' : 'rgba(252,212,45,0.2)', color: getStatusColor(p.status), borderRadius: '6px', fontSize: '11px', fontWeight: '600', marginRight: '12px' }}>
                    {p.status === 'completed' ? '✓ 완료' : '⏳ 생성중'}
                  </span>
                  <button style={{ padding: '8px 12px', background: 'rgba(200,50,150,0.2)', border: '1px solid #d8b4fe', color: '#d8b4fe', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '600' }}>
                    <Download size={14} />
                    다운
                  </button>
                </div>
              ))}
            </div>
          )}

          {viewMode === 'history' && (
            <div>
              {presentations.map(p => (
                <div key={p.id} style={{ background: 'rgba(200,50,150,0.08)', padding: '14px', marginBottom: '10px', borderRadius: '8px', border: '1px solid rgba(200,50,150,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', marginBottom: '2px', fontSize: '13px' }}>{p.name}</div>
                    <div style={{ fontSize: '11px', color: 'rgba(224,224,224,0.5)' }}>{p.created} • {p.downloadCount}회 다운로드</div>
                  </div>
                  <button style={{ padding: '6px 12px', background: 'rgba(200,50,150,0.1)', border: '1px solid rgba(200,50,150,0.2)', borderRadius: '4px', color: '#d8b4fe', cursor: 'pointer', fontSize: '11px', fontWeight: '600' }}>
                    재생성
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 새 프레젠테이션 모달 */}
      {showNewModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            background: 'rgba(30, 41, 59, 0.95)', border: '1px solid rgba(216,180,254,0.2)',
            borderRadius: '12px', padding: '32px', maxWidth: '400px', width: '90%'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#f1f5f9', marginBottom: '8px' }}>새 프레젠테이션</h2>
            <p style={{ fontSize: '13px', color: 'rgba(224,224,224,0.6)', marginBottom: '24px' }}>프레젠테이션 이름을 입력하세요</p>
            <input type="text" placeholder="프레젠테이션 이름" value={newPptName} onChange={(e) => setNewPptName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && setShowNewModal(false)}
              style={{ width: '100%', padding: '12px 16px', background: 'rgba(216,180,254,0.1)',
                border: '1px solid rgba(216,180,254,0.2)', borderRadius: '8px', color: '#e0e0e0',
                fontSize: '14px', marginBottom: '24px', boxSizing: 'border-box' }} autoFocus />
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => { setShowNewModal(false); setNewPptName(''); }}
                style={{ flex: 1, padding: '12px 16px', background: 'rgba(216,180,254,0.1)',
                  border: '1px solid rgba(216,180,254,0.2)', borderRadius: '8px', color: '#d8b4fe',
                  cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>취소</button>
              <button onClick={() => { setShowNewModal(false); setNewPptName(''); }}
                style={{ flex: 1, padding: '12px 16px', background: 'linear-gradient(135deg, #d8b4fe, #c084fc)',
                  border: 'none', borderRadius: '8px', color: '#000', cursor: 'pointer',
                  fontSize: '13px', fontWeight: '600' }}>생성</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PPTGenerationDashboard;
