import React, { useState, useMemo } from 'react';
import { Globe, Plus, Search, Flag, Check, AlertCircle, Globe as GlobeIcon, CheckCircle2 } from 'lucide-react';
import { GlassmorphicIcon } from './components/GlassmorphicIcon';
import { FeatureHeader, KpiGrid, EmptyState, PanelStats } from './components/feature/FeatureUI';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';

export const MultilingualDashboard = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [primaryLang, setPrimaryLang] = useState('ko');

  const [projects, setProjects] = useState<any[]>([
    { id: 1, name: 'Portfolio', primary: 'ko', languages: ['en', 'ja', 'zh', 'ar'], status: 'complete', created: '2024-01-15' },
    { id: 2, name: 'E-commerce', primary: 'en', languages: ['ko', 'ja', 'es', 'fr'], status: 'complete', created: '2024-01-14' },
    { id: 3, name: 'Blog', primary: 'ko', languages: ['en'], status: 'in-progress', created: '2024-01-13' }
  ]);

  const languages = [
    { code: 'ko', name: '한국어', flag: '🇰🇷', rtl: false },
    { code: 'en', name: 'English', flag: '🇺🇸', rtl: false },
    { code: 'ja', name: '日本語', flag: '🇯🇵', rtl: false },
    { code: 'zh', name: '中文', flag: '🇨🇳', rtl: false },
    { code: 'ar', name: 'العربية', flag: '🇸🇦', rtl: true },
    { code: 'es', name: 'Español', flag: '🇪🇸', rtl: false },
    { code: 'fr', name: 'Français', flag: '🇫🇷', rtl: false },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪', rtl: false },
    { code: 'ru', name: 'Русский', flag: '🇷🇺', rtl: false },
    { code: 'pt', name: 'Português', flag: '🇵🇹', rtl: false },
    { code: 'th', name: 'ไทย', flag: '🇹🇭', rtl: false },
    { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳', rtl: false }
  ];

  const handleGenerateMultilingual = async () => {
    if (!projectName.trim()) {
      alert('프로젝트명을 입력해주세요');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/advanced-design/multilingual/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          project_name: projectName,
          primary_language: primaryLang,
          target_languages: 'en,ja,zh,ar'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setProjects([{
          id: Date.now(),
          name: projectName,
          primary: primaryLang,
          languages: ['en', 'ja', 'zh', 'ar'],
          status: 'complete',
          created: new Date().toISOString().split('T')[0]
        }, ...projects]);
        setProjectName('');
        setShowNewModal(false);
      }
    } catch (error) {
      console.error('다국어 생성 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = useMemo(() => {
    return projects.filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [projects, searchTerm]);

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%', background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}>
      {/* 좌측 사이드바 */}
      <div style={{ width: '280px', borderRight: '1px solid rgba(100,150,255,0.2)', overflow: 'auto', padding: '20px', background: 'rgba(0,0,0,0.3)' }}>
        <h3 style={{ fontSize: '13px', color: 'rgba(224,224,224,0.5)', textTransform: 'uppercase', fontWeight: '600', marginBottom: '20px' }}>지원 언어</h3>

        {/* 검색 */}
        <div style={{ marginBottom: '16px', position: 'relative' }}>
          <input
            type="text"
            placeholder="프로젝트 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', background: 'linear-gradient(135deg, rgba(100,150,255,0.15) 0%, rgba(100,150,255,0.05) 100%)', border: '1px solid rgba(100,150,255,0.3)', borderRadius: '8px', color: '#e0e0e0', fontSize: '13px' }}
          />
          <Search size={14} style={{ position: 'absolute', right: '12px', top: '12px', color: 'rgba(224,224,224,0.4)' }} />
        </div>

        {/* 언어 목록 */}
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {languages.map(lang => (
            <button
              key={lang.code}
              onClick={() => setSelectedLanguage(selectedLanguage === lang.code ? null : lang.code)}
              style={{
                display: 'block',
                width: '100%',
                padding: '10px 12px',
                marginBottom: '6px',
                background: selectedLanguage === lang.code ? 'rgba(100,150,255,0.3)' : 'rgba(100,150,255,0.1)',
                border: `1px solid ${selectedLanguage === lang.code ? 'rgba(100,150,255,0.5)' : 'rgba(100,150,255,0.2)'}`,
                borderRadius: '6px',
                color: '#e0e0e0',
                fontSize: '12px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s'
              }}
            >
              {lang.flag} {lang.name} {lang.rtl ? '(RTL)' : ''}
            </button>
          ))}
        </div>

        {/* 통계 */}
        <PanelStats items={[
          { label: '총 프로젝트', value: projects.length, tone: 'green' },
          { label: '지원 언어', value: languages.length, tone: 'green' },
          { label: '완료', value: projects.filter(p => p.status === 'complete').length, tone: 'green' },
        ]} />
      </div>

      {/* 우측 콘텐츠 */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* 헤더 */}
        <div style={{ padding: '24px', borderBottom: '1px solid rgba(100,150,255,0.2)', background: 'linear-gradient(135deg, rgba(0,0,0,0.4) 0%, rgba(100,150,255,0.1) 100%)' }}>
          <FeatureHeader
            icon={<GlassmorphicIcon Icon={Globe} gradient="from-blue-400 to-cyan-500" size={40} />}
            title="다국어 & 문화 최적화"
            subtitle="언어와 문화에 맞게 콘텐츠를 조정합니다"
            badge="AI"
            actions={
              <>
            <button
              onClick={() => setShowNewModal(true)}
              style={{ padding: '10px 16px', background: '#646cff', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={16} /> 프로젝트 생성
            </button>
              </>
            }
          />
          <KpiGrid
            items={[
              { label: '총 프로젝트', value: projects.length, tone: 'blue' },
              { label: '지원 언어', value: languages.length, tone: 'green' },
            ]}
          />
        </div>
        {projects.length === 0 && (
          <div style={{ margin: '24px' }}>
            <EmptyState
              icon={<GlassmorphicIcon Icon={Globe} gradient="from-blue-400 to-cyan-500" size={32} />}
              title="다국어 프로젝트가 없습니다"
              description="주 언어와 대상 언어를 정하면 문화권에 맞춘 번역과 현지화 기준을 제안합니다."
              steps={['주 언어와 대상 언어 선택', '문화권별 표현 기준 검토', '현지화 결과를 이 화면에서 확인']}
              tab="multilingual"
              examples={['한국어 랜딩을 영어·일본어로', '앱 문구 현지화 검토', '문화권별 색상 표현 확인']}
              action={{ label: '프로젝트 생성', onClick: () => setShowNewModal(true) }}
            />
          </div>
        )}

        {/* 프로젝트 목록 */}
        <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
            {filteredProjects.map(project => (
              <div key={project.id} style={{ background: 'linear-gradient(135deg, rgba(100,150,255,0.15) 0%, rgba(100,150,255,0.05) 100%)', border: '1px solid rgba(100,150,255,0.3)', borderRadius: '14px', padding: '16px', transition: 'all 0.2s' }}>
                <div style={{ marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#fff', marginBottom: '4px' }}>{project.name}</h3>
                  <div style={{ fontSize: '12px', color: 'rgba(224,224,224,0.6)' }}>
                    기본: {languages.find(l => l.code === project.primary)?.flag} {languages.find(l => l.code === project.primary)?.name}
                  </div>
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '11px', color: 'rgba(224,224,224,0.5)', marginBottom: '6px', fontWeight: '600' }}>지원 언어</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {project.languages.map(langCode => {
                      const lang = languages.find(l => l.code === langCode);
                      return (
                        <div key={langCode} style={{ background: 'rgba(100,150,255,0.2)', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', color: '#cbd5e1' }}>
                          {lang?.flag} {lang?.code.toUpperCase()}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', paddingTop: '12px', borderTop: '1px solid rgba(100,150,255,0.1)', color: 'rgba(224,224,224,0.5)' }}>
                  <div>생성: {project.created}</div>
                  <div style={{ background: project.status === 'complete' ? 'rgba(74, 222, 128, 0.2)' : 'rgba(100, 150, 255, 0.2)', padding: '4px 8px', borderRadius: '4px', color: project.status === 'complete' ? '#4ade80' : '#cbd5e1', fontSize: '10px', fontWeight: '600' }}>
                    {project.status === 'complete' ? '✓ 완료' : '진행중'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 모달 */}
      {showNewModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', border: '1px solid rgba(100,150,255,0.3)', borderRadius: '16px', padding: '32px', width: '400px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#fff', marginBottom: '20px' }}>다국어 프로젝트 생성</h2>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: 'rgba(224,224,224,0.7)', marginBottom: '8px', fontWeight: '600' }}>프로젝트명</label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="프로젝트명"
                style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, rgba(100,150,255,0.15) 0%, rgba(100,150,255,0.05) 100%)', border: '1px solid rgba(100,150,255,0.3)', borderRadius: '8px', color: '#e0e0e0', fontSize: '13px', marginBottom: '12px' }}
              />
              <label style={{ display: 'block', fontSize: '12px', color: 'rgba(224,224,224,0.7)', marginBottom: '8px', fontWeight: '600' }}>기본 언어</label>
              <select
                value={primaryLang}
                onChange={(e) => setPrimaryLang(e.target.value)}
                style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, rgba(100,150,255,0.15) 0%, rgba(100,150,255,0.05) 100%)', border: '1px solid rgba(100,150,255,0.3)', borderRadius: '8px', color: '#e0e0e0', fontSize: '13px' }}
              >
                {languages.map(lang => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.name}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowNewModal(false)}
                style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid rgba(100,150,255,0.3)', borderRadius: '8px', color: '#cbd5e1', cursor: 'pointer', fontWeight: '600' }}
              >
                취소
              </button>
              <button
                onClick={handleGenerateMultilingual}
                disabled={loading}
                style={{ flex: 1, padding: '12px', background: '#646cff', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontWeight: '600' }}
              >
                {loading ? '생성중...' : '생성'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
