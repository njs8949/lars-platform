import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { open } from '@tauri-apps/api/dialog';
import {
  Folder,
  Zap,
  Unplug,
  Plus,
  Globe,
  LayoutGrid,
  ShoppingBag,
  Cpu,
  X,
  CheckCircle,
  Search,
  Filter,
  Database,
  Server,
  Layers,
  Lock,
  Eye,
  Brain,
  Package,
  Key,
  Download,
  Power,
  Trash2,
  AlertCircle,
  Image,
  Wand2,
  Clock,
  Settings
} from 'lucide-react';

interface Project {
  id: string;
  name: string;
  path: string;
  description: string;
}

interface Skill {
  id: string;
  name: string;
  capability: string;
  status: string;
}

interface Connector {
  id: string;
  name: string;
  service_type: string;
  status: string;
}

interface AppItem {
  id: string;
  name: string;
  desc: string;
  category: string;
  purpose?: string;
}

interface Agent {
  id: string;
  name: string;
  category: string;
  status: string;
  description: string;
  path?: string;
}

interface InstalledApp {
  id: string;
  name: string;
  desc: string;
  category: string;
  version: string;
  installed_at: string;
  enabled: boolean;
}

interface OAuthService {
  id: string;
  service: string;
  status: string;
  created_at?: string;
  expires_at?: string;
  last_used_at?: string;
  scopes?: string[];
  accessToken?: string;
  refreshToken?: string;
}

interface GeneratedImage {
  id: string;
  prompt: string;
  model: string;
  image_url: string;
  status: string;
  created_at: string;
  quality?: string;
  style?: string;
  size: string;
}

export default function Ecosystem() {
  const [activeTab, setActiveTab] = useState<'projects' | 'integrations' | 'agents' | 'oauth'>('projects');
  const [integrationsSubTab, setIntegrationsSubTab] = useState<'skills' | 'connectors' | 'apps'>('skills');
  const [projects, setProjects] = useState<Project[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [availableApps, setAvailableApps] = useState<AppItem[]>([]);
  const [installedApps, setInstalledApps] = useState<InstalledApp[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [oauthServices, setOAuthServices] = useState<OAuthService[]>([]);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedAgentCategory, setSelectedAgentCategory] = useState('All');

  // Image Generation State
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageModel, setImageModel] = useState('dalle');
  const [imageQuality, setImageQuality] = useState('hd');
  const [imageStyle, setImageStyle] = useState('vibrant');
  const [isGenerating, setIsGenerating] = useState(false);

  const [showAddForm, setShowAddForm] = useState<'none' | 'skill' | 'connector'>('none');
  const [showOAuthForm, setShowOAuthForm] = useState<'none' | 'github' | 'slack' | 'notion' | 'airtable' | 'google' | 'microsoft' | 'discord' | 'linear'>('none');
  const [oauthFormData, setOAuthFormData] = useState({ clientId: '', clientSecret: '', selectedScopes: [] as string[] });
  const [formData, setFormData] = useState({ name: '', detail: '' });
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState({ title: '', message: '', isError: false, onConfirm: () => {} });

  const loadData = async () => {
    try {
      console.log('[Ecosystem] 데이터 로드 시작...');

      // 기본 데이터 로드 (필수)
      const pResult = await invoke<Project[]>('get_projects').catch(e => { console.error('[Ecosystem] get_projects failed:', e); return []; });
      const sResult = await invoke<Skill[]>('get_skills').catch(e => { console.error('[Ecosystem] get_skills failed:', e); return []; });
      const cResult = await invoke<Connector[]>('get_connectors').catch(e => { console.error('[Ecosystem] get_connectors failed:', e); return []; });
      const aResult = await invoke<AppItem[]>('get_available_apps').catch(e => { console.error('[Ecosystem] get_available_apps failed:', e); return []; });

      console.log('[Ecosystem] 기본 데이터:', { projects: pResult?.length, skills: sResult?.length, connectors: cResult?.length, apps: aResult?.length });

      setProjects(pResult || []);
      setSkills(sResult || []);
      setConnectors(cResult || []);
      setAvailableApps(aResult || []);

      // 확장 기능 (실패해도 무시)
      invoke<InstalledApp[]>('get_installed_apps')
        .then(ia => { console.log('[Ecosystem] installed_apps:', ia?.length); setInstalledApps(ia || []); })
        .catch(e => { console.error('[Ecosystem] get_installed_apps failed:', e); setInstalledApps([]); });

      // Tauri invoke를 통해 이용 가능한 에이전트 가져오기
      invoke<Agent[]>('discover_agents')
        .then(agents => {
          console.log('[Ecosystem] agents:', agents?.length);
          setAgents(agents || []);
        })
        .catch(e => { console.error('[Ecosystem] discover_agents failed:', e); setAgents([]); });

      invoke<OAuthService[]>('get_oauth_services')
        .then(oa => { console.log('[Ecosystem] oauth_services:', oa?.length); setOAuthServices(oa || []); })
        .catch(e => { console.error('[Ecosystem] get_oauth_services failed:', e); setOAuthServices([]); });

      invoke<GeneratedImage[]>('get_image_history')
        .then(imgs => { console.log('[Ecosystem] generated_images:', imgs?.length); setGeneratedImages(imgs || []); })
        .catch(e => { console.error('[Ecosystem] get_image_history failed:', e); setGeneratedImages([]); });
    } catch (err) {
      console.error('[Ecosystem] 기본 데이터 로드 실패:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddProject = async () => {
    try {
      const selected = await open({ directory: true, multiple: false, title: '새 프로젝트 폴더 선택' });
      if (selected && typeof selected === 'string') {
        const folderName = selected.split('/').pop() || 'New Project';
        await invoke('add_project', { name: folderName, path: selected, description: 'LARS Prism 자율 코딩 프로젝트' });
        await loadData();
      }
    } catch (err) { alert(`프로젝트 추가 실패: ${err}`); }
  };

  const handleInstallApp = async (app: AppItem) => {
    const isInstalled = installedApps.some(ia => ia.id === app.id);
    if (isInstalled) return;
    try {
      await invoke('install_app', { app_id: app.id, config: {} });
      await loadData();
      alert(`✅ ${app.name} 앱이 설치되었습니다. 커넥터 탭에서 상세 설정을 완료하세요.`);
    } catch (err) { alert(`앱 설치 실패: ${err}`); }
  };

  const handleInstallAgent = async (agent: Agent) => {
    try {
      const response = await fetch(`http://localhost:8002/api/ecosystem/agents/${agent.id}/install`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();

      if (result.success) {
        await loadData();
        setModalData({
          title: '성공',
          message: `✅ ${agent.name} 에이전트가 설치되었습니다.`,
          isError: false,
          onConfirm: () => setShowModal(false)
        });
        setShowModal(true);
      } else {
        setModalData({
          title: '오류',
          message: `❌ 설치 실패: ${result.message || result.error}`,
          isError: true,
          onConfirm: () => setShowModal(false)
        });
        setShowModal(true);
      }
    } catch (err) {
      setModalData({
        title: '오류',
        message: `❌ 에이전트 설치 실패: ${err}`,
        isError: true,
        onConfirm: () => setShowModal(false)
      });
      setShowModal(true);
    }
  };

  const handleEnableAgent = async (agent: Agent) => {
    try {
      const response = await fetch(`http://localhost:8002/api/ecosystem/agents/${agent.id}/enable`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();

      if (result.success) {
        await loadData();
        setModalData({
          title: '성공',
          message: `✅ ${agent.name} 에이전트가 활성화되었습니다.`,
          isError: false,
          onConfirm: () => setShowModal(false)
        });
        setShowModal(true);
      } else {
        setModalData({
          title: '오류',
          message: `❌ 활성화 실패: ${result.error}`,
          isError: true,
          onConfirm: () => setShowModal(false)
        });
        setShowModal(true);
      }
    } catch (err) {
      setModalData({
        title: '오류',
        message: `❌ 에이전트 활성화 실패: ${err}`,
        isError: true,
        onConfirm: () => setShowModal(false)
      });
      setShowModal(true);
    }
  };

  const handleDisableAgent = async (agent: Agent) => {
    try {
      const response = await fetch(`http://localhost:8002/api/ecosystem/agents/${agent.id}/disable`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();

      if (result.success) {
        await loadData();
        setModalData({
          title: '성공',
          message: `✅ ${agent.name} 에이전트가 비활성화되었습니다.`,
          isError: false,
          onConfirm: () => setShowModal(false)
        });
        setShowModal(true);
      } else {
        const errorMsg = result.error || result.message || '알 수 없는 오류';
        setModalData({
          title: '오류',
          message: `❌ 비활성화 실패: ${errorMsg}`,
          isError: true,
          onConfirm: () => setShowModal(false)
        });
        setShowModal(true);
      }
    } catch (err) {
      setModalData({
        title: '오류',
        message: `❌ 에이전트 비활성화 실패: ${err}`,
        isError: true,
        onConfirm: () => setShowModal(false)
      });
      setShowModal(true);
    }
  };

  const handleSetupOAuth = async (service: string) => {
    if (!oauthFormData.clientId || !oauthFormData.clientSecret) {
      alert('Client ID와 Secret을 모두 입력하세요.');
      return;
    }
    if (!oauthFormData.selectedScopes || oauthFormData.selectedScopes.length === 0) {
      alert('최소 1개 이상의 권한을 선택하세요.');
      return;
    }
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 90); // 90일 후 만료

      await invoke('setup_oauth', {
        service,
        client_id: oauthFormData.clientId,
        client_secret: oauthFormData.clientSecret,
        scopes: oauthFormData.selectedScopes,
        expires_at: expiresAt.toISOString()
      });
      setOAuthFormData({ clientId: '', clientSecret: '', selectedScopes: [] });
      setShowOAuthForm('none');
      await loadData();
      alert(`✅ ${service.toUpperCase()} 연결이 완료되었습니다!`);
    } catch (err) { alert(`OAuth 설정 실패: ${err}`); }
  };

  const handleRemoveApp = async (app: InstalledApp) => {
    if (!confirm(`${app.name} 앱을 제거하시겠습니까?`)) return;
    try {
      await invoke('remove_app', { app_id: app.id });
      await loadData();
      alert(`✅ ${app.name} 앱이 제거되었습니다.`);
    } catch (err) { alert(`앱 제거 실패: ${err}`); }
  };

  const handleToggleApp = async (app: InstalledApp) => {
    try {
      if (!app.enabled) {
        await invoke('enable_app', { app_id: app.id });
      }
      await loadData();
    } catch (err) { alert(`앱 상태 변경 실패: ${err}`); }
  };

  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) {
      alert('프롬프트를 입력하세요.');
      return;
    }

    setIsGenerating(true);
    try {
      const result = await invoke<{ status: string; image: GeneratedImage }>('generate_image', {
        prompt: imagePrompt,
        model: imageModel,
        quality: imageQuality,
        style: imageStyle,
        size: '1024x1024'
      });

      if (result.image) {
        setGeneratedImages([result.image, ...generatedImages]);
        if (result.status === 'success') {
          alert(`✅ ${imageModel} 이미지가 생성되었습니다!`);
        } else {
          alert(`⏳ ${imageModel}에 요청을 보냈습니다. 생성 중...`);
        }
        setImagePrompt('');
      }
    } catch (err) {
      alert(`이미지 생성 실패: ${err}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!confirm('이 이미지를 삭제하시겠습니까?')) return;
    try {
      await invoke('delete_image', { image_id: imageId });
      setGeneratedImages(generatedImages.filter(img => img.id !== imageId));
      alert('✅ 이미지가 삭제되었습니다.');
    } catch (err) {
      alert(`이미지 삭제 실패: ${err}`);
    }
  };

  const handleFormSubmit = async () => {
    if (!formData.name || !formData.detail) { alert('모든 필드를 입력해 주세요.'); return; }
    try {
      if (showAddForm === 'skill') { await invoke('add_skill', { name: formData.name, capability: formData.detail }); }
      else if (showAddForm === 'connector') { await invoke('add_connector', { name: formData.name, service_type: formData.detail }); }
      setFormData({ name: '', detail: '' });
      setShowAddForm('none');
      await loadData();
    } catch (err) { alert(`추가 실패: ${err}`); }
  };

  // Filtering Logic
  const filteredApps = availableApps.filter(app => {
    const matchesSearch = app.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          app.desc.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || app.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['All', ...Array.from(new Set(availableApps.map(a => a.category)))];

  return (
    <div className="ecosystem-view animate-in">
      <header className="view-header">
        <h1 style={{color: 'white'}}>LARS Ecosystem</h1>
        <p className="view-subtitle">지능형 에이전트의 프로젝트와 기술 생태계를 관리합니다.</p>
      </header>

      <div className="ecosystem-tabs">
        <button className={activeTab === 'projects' ? 'active' : ''} onClick={() => setActiveTab('projects')}>
          <Folder size={18} /> 프로젝트
        </button>
        <button className={activeTab === 'agents' ? 'active' : ''} onClick={() => setActiveTab('agents')}>
          <Brain size={18} /> 에이전트
        </button>
        <button className={activeTab === 'integrations' ? 'active' : ''} onClick={() => setActiveTab('integrations')}>
          <Layers size={18} /> 통합
        </button>
        <button className={activeTab === 'oauth' ? 'active' : ''} onClick={() => setActiveTab('oauth')}>
          <Key size={18} /> OAuth
        </button>
      </div>

      <div className="ecosystem-content">
        {activeTab === 'projects' && (
          <div className="project-grid">
            <div className="add-card" onClick={handleAddProject}>
              <Plus size={32} />
              <span style={{marginTop: '1rem', fontWeight: 600}}>새 프로젝트 추가</span>
            </div>
            {projects?.map(p => (
              <div key={p.id} className="eco-card">
                <div className="card-header">
                  <Folder size={24} color="var(--accent-blue)" />
                  <span className="card-name">{p.name}</span>
                </div>
                <div className="card-path">{p.path}</div>
                <p className="card-desc">{p.description}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'integrations' && (
          <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
            {/* 서브탭 */}
            <div style={{display: 'flex', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem', flexWrap: 'wrap'}}>
              <button
                onClick={() => setIntegrationsSubTab('skills')}
                style={{
                  padding: '0.8rem 1.5rem',
                  background: integrationsSubTab === 'skills' ? 'var(--accent-blue)' : 'rgba(255,255,255,0.05)',
                  color: integrationsSubTab === 'skills' ? '#fff' : 'var(--text-dim)',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <Zap size={16} /> 스킬
              </button>
              <button
                onClick={() => setIntegrationsSubTab('connectors')}
                style={{
                  padding: '0.8rem 1.5rem',
                  background: integrationsSubTab === 'connectors' ? 'var(--accent-blue)' : 'rgba(255,255,255,0.05)',
                  color: integrationsSubTab === 'connectors' ? '#fff' : 'var(--text-dim)',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <Unplug size={16} /> 커넥터
              </button>
              <button
                onClick={() => setIntegrationsSubTab('apps')}
                style={{
                  padding: '0.8rem 1.5rem',
                  background: integrationsSubTab === 'apps' ? 'var(--accent-blue)' : 'rgba(255,255,255,0.05)',
                  color: integrationsSubTab === 'apps' ? '#fff' : 'var(--text-dim)',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <ShoppingBag size={16} /> 앱
              </button>
            </div>

            {/* 스킬 콘텐츠 */}
            {integrationsSubTab === 'skills' && (
              <div className="skills-list" style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                {showAddForm === 'skill' ? (
                  <div className="add-form-box" style={{background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--accent-blue)'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '1rem'}}>
                      <h3 style={{color: '#fff'}}>새로운 스킬 추가</h3>
                      <X size={20} style={{cursor: 'pointer'}} onClick={() => setShowAddForm('none')} />
                    </div>
                    <input type="text" placeholder="스킬 이름 (예: GitHub Search)" className="inline-input" style={{width: '100%', marginBottom: '1rem'}} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                    <input type="text" placeholder="스킬 설명 (기능 중심)" className="inline-input" style={{width: '100%', marginBottom: '1.5rem'}} value={formData.detail} onChange={e => setFormData({...formData, detail: e.target.value})} />
                    <button className="apply-btn" style={{width: '100%'}} onClick={handleFormSubmit}>스킬 등록하기</button>
                  </div>
                ) : (
                  <div className="add-skill-banner" onClick={() => setShowAddForm('skill')} style={{ background: 'rgba(100, 108, 255, 0.1)', border: '1px dashed var(--accent-blue)', padding: '1.5rem', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', cursor: 'pointer', color: 'var(--accent-blue)', fontWeight: 700 }}>
                    <Plus size={20} /> 새로운 스킬(Skill) 추가하기
                  </div>
                )}
                {skills?.map(s => (
                  <div key={s.id} className="eco-list-item" style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '16px'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '1.5rem'}}>
                      <Zap size={24} color="#ffd700" />
                      <div>
                        <div className="item-name" style={{fontWeight: 700, color: '#fff'}}>{s.name}</div>
                        <div className="item-cap" style={{fontSize: '0.9rem', color: 'var(--text-dim)'}}>{s.capability}</div>
                      </div>
                    </div>
                    <div className={`status-badge active`} style={{padding: '0.4rem 0.8rem', borderRadius: '8px', background: 'rgba(52, 199, 89, 0.15)', color: '#34c759', fontSize: '0.75rem', fontWeight: 800}}>ACTIVE</div>
                  </div>
                ))}
              </div>
            )}

            {/* 커넥터 콘텐츠 */}
            {integrationsSubTab === 'connectors' && (
              <div className="connectors-grid" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem'}}>
                {showAddForm === 'connector' ? (
                  <div className="add-form-box eco-card" style={{gridColumn: 'span 1', border: '1px solid var(--accent-blue)'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '1rem'}}>
                      <h3 style={{color: '#fff', fontSize: '1rem'}}>커넥터 연결</h3>
                      <X size={18} style={{cursor: 'pointer'}} onClick={() => setShowAddForm('none')} />
                    </div>
                    <input type="text" placeholder="이름 (예: My Slack)" className="inline-input" style={{width: '100%', marginBottom: '0.8rem', fontSize: '0.85rem'}} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                    <input type="text" placeholder="종류 (예: github, slack)" className="inline-input" style={{width: '100%', marginBottom: '1.2rem', fontSize: '0.85rem'}} value={formData.detail} onChange={e => setFormData({...formData, detail: e.target.value})} />
                    <button className="apply-btn" style={{width: '100%', padding: '0.6rem'}} onClick={handleFormSubmit}>연결</button>
                  </div>
                ) : (
                  <div className="add-card" onClick={() => setShowAddForm('connector')} style={{minHeight: '180px'}}>
                    <Plus size={32} />
                    <span style={{marginTop: '1rem', fontWeight: 600}}>커넥터 연결</span>
                  </div>
                )}
                {connectors?.map(c => (
                  <div key={c.id} className="eco-card" style={{padding: '1.5rem'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem'}}>
                      <Globe size={28} color="var(--accent-blue)" />
                      <div className={`status-text`} style={{fontSize: '0.75rem', color: '#34c759', fontWeight: 800}}>● {c.status.toUpperCase()}</div>
                    </div>
                    <div className="conn-name" style={{fontWeight: 700, color: '#fff', fontSize: '1.1rem'}}>{c.name}</div>
                    <div className="conn-type" style={{fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: '0.4rem'}}>{c.service_type}</div>
                  </div>
                ))}
              </div>
            )}

            {/* 앱 콘텐츠 */}
            {integrationsSubTab === 'apps' && (
          <div className="apps-view-container" style={{display: 'flex', flexDirection: 'column', gap: '2rem'}}>
            {installedApps.length > 0 && (
              <div>
                <h2 style={{color: '#fff', marginBottom: '1.5rem', fontSize: '1.2rem', fontWeight: 700}}>설치된 앱</h2>
                <div className="installed-apps-grid" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem'}}>
                  {installedApps.map(app => (
                    <div key={app.id} className="eco-card" style={{opacity: app.enabled ? 1 : 0.7, borderLeft: `4px solid ${app.enabled ? '#34c759' : 'var(--text-dim)'}`, paddingLeft: 'calc(1.5rem - 4px)'}}>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem'}}>
                        <div>
                          <div className="card-name" style={{marginBottom: '0.4rem'}}>{app.name}</div>
                          <div style={{fontSize: '0.8rem', color: 'var(--text-dim)'}}>v{app.version}</div>
                        </div>
                        <div style={{display: 'flex', gap: '0.5rem'}}>
                          <button
                            onClick={() => handleToggleApp(app)}
                            style={{padding: '0.4rem', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '6px', cursor: 'pointer', color: app.enabled ? '#34c759' : 'var(--text-dim)'}}
                            title={app.enabled ? '비활성화' : '활성화'}
                          >
                            <Power size={16} />
                          </button>
                          <button
                            onClick={() => handleRemoveApp(app)}
                            style={{padding: '0.4rem', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#ff3b30'}}
                            title="제거"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      <p className="card-desc" style={{fontSize: '0.85rem', marginBottom: '1rem'}}>{app.desc}</p>
                      <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-dim)', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)'}}>
                        <span>설치: {new Date(app.installed_at).toLocaleDateString('ko-KR')}</span>
                        <span style={{color: app.enabled ? '#34c759' : '#ff3b30'}}>{app.enabled ? '활성' : '비활성'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h2 style={{color: '#fff', marginBottom: '1.5rem', fontSize: '1.2rem', fontWeight: 700}}>앱 스토어</h2>
              <div className="ecosystem-controls" style={{marginBottom: '1.5rem'}}>
                <div className="search-wrapper">
                  <Search size={18} className="search-icon" />
                  <input
                    type="text"
                    placeholder="앱 검색..."
                    className="ecosystem-search"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="category-filters">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      className={`filter-chip ${selectedCategory === cat ? 'active' : ''}`}
                      onClick={() => setSelectedCategory(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="apps-grid">
                {filteredApps.map(app => {
                  const isInstalled = installedApps.some(ia => ia.id === app.id);
                  return (
                    <div key={app.id} className={`eco-card ${isInstalled ? 'installed' : ''}`} style={{opacity: isInstalled ? 0.6 : 1}}>
                      <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '1.2rem'}}>
                        <div style={{background: 'rgba(255,255,255,0.05)', padding: '0.8rem', borderRadius: '12px'}}>
                          <Package size={24} color={isInstalled ? "var(--text-dim)" : "var(--accent-purple)"} />
                        </div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--accent-purple)', fontWeight: 800, background: 'rgba(168, 85, 247, 0.1)', padding: '0.3rem 0.6rem', borderRadius: '6px', height: 'fit-content' }}>
                          {app.category.toUpperCase()}
                        </span>
                      </div>
                      <div className="card-name" style={{marginBottom: '0.6rem'}}>{app.name}</div>
                      <p className="card-desc" style={{fontSize: '0.9rem', marginBottom: '1rem', height: '4.5rem', overflow: 'hidden'}}>{app.desc}</p>

                      <div className="usage-guide" style={{background: 'rgba(255,255,255,0.03)', padding: '0.8rem', borderRadius: '12px', marginBottom: '1.5rem'}}>
                         <div style={{fontSize: '0.65rem', fontWeight: 800, color: 'var(--accent-blue)', marginBottom: '0.4rem', letterSpacing: '0.05em'}}>최적 용도</div>
                         <div style={{fontSize: '0.8rem', color: 'var(--text-main)', lineHeight: '1.4'}}>
                            {app.category === 'Workflow' && "복잡한 앱 간 워크플로우 자동화"}
                            {app.category === 'Agentic' && "Workspace - 멀티 에이전트 오케스트레이션"}
                            {app.category === 'RPA' && "GUI 작업 및 화면 조작 자동화"}
                            {app.category === 'Data' && "구조화된 데이터 저장 및 관리"}
                            {app.category === 'Document' && "문서 관리 자동화 및 지식 베이스"}
                            {app.category === 'System' && "내부 관리 시스템 및 대시보드"}
                         </div>
                      </div>

                      <button
                        className={isInstalled ? "installed-btn" : "apply-patch-btn"}
                        style={{ width: '100%', padding: '0.8rem', background: isInstalled ? 'rgba(255,255,255,0.05)' : '', color: isInstalled ? 'var(--text-dim)' : '', cursor: isInstalled ? 'default' : 'pointer' }}
                        onClick={() => handleInstallApp(app)}
                        disabled={isInstalled}
                      >
                        {isInstalled ? <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'}}><CheckCircle size={16}/> 설치됨</div> : "설치"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
            )}
          </div>
        )}

        {activeTab === 'agents' && (
          <div className="agents-view" style={{display: 'flex', flexDirection: 'column', gap: '2rem'}}>
            <div>
              <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem'}}>
                <h2 style={{color: '#fff', fontSize: '1.2rem', fontWeight: 700}}>발견된 에이전트 ({agents.length})</h2>
              </div>

              <div className="category-filters" style={{marginBottom: '1.5rem'}}>
                <button
                  className={`filter-chip ${selectedAgentCategory === 'All' ? 'active' : ''}`}
                  onClick={() => setSelectedAgentCategory('All')}
                >
                  모두
                </button>
                {Array.from(new Set(agents.map(a => a.category))).map(cat => (
                  <button
                    key={cat}
                    className={`filter-chip ${selectedAgentCategory === cat ? 'active' : ''}`}
                    onClick={() => setSelectedAgentCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="agents-grid" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem'}}>
                {agents
                  .filter(a => selectedAgentCategory === 'All' || a.category === selectedAgentCategory)
                  .map(agent => (
                    <div key={agent.id} className="eco-card" style={{display: 'flex', flexDirection: 'column'}}>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem'}}>
                        <div>
                          <div className="card-name" style={{marginBottom: '0.4rem'}}>{agent.name}</div>
                          <div style={{fontSize: '0.75rem', color: 'var(--accent-blue)', fontWeight: 700}}>{agent.category}</div>
                        </div>
                        <div className={`status-badge`} style={{
                          padding: '0.3rem 0.6rem',
                          borderRadius: '6px',
                          background: agent.status === 'installed' ? 'rgba(52, 199, 89, 0.15)' : agent.status === 'enabled' ? 'rgba(100, 108, 255, 0.15)' : 'rgba(255,255,255,0.1)',
                          color: agent.status === 'installed' ? '#34c759' : agent.status === 'enabled' ? 'var(--accent-blue)' : 'var(--text-dim)',
                          fontSize: '0.65rem',
                          fontWeight: 800
                        }}>
                          {agent.status === 'available' ? '설치 가능' : agent.status === 'installed' ? '설치됨' : '활성화됨'}
                        </div>
                      </div>

                      <p className="card-desc" style={{fontSize: '0.85rem', marginBottom: '1.5rem', flex: 1}}>{agent.description}</p>

                      <div style={{display: 'flex', gap: '0.8rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)'}}>
                        {agent.status === 'available' && (
                          <button
                            className="apply-patch-btn"
                            style={{flex: 1, padding: '0.6rem'}}
                            onClick={() => handleInstallAgent(agent)}
                          >
                            <Download size={14} style={{marginRight: '0.4rem', display: 'inline'}} />
                            설치
                          </button>
                        )}
                        {agent.status === 'installed' && (
                          <button
                            className="apply-patch-btn"
                            style={{flex: 1, padding: '0.6rem'}}
                            onClick={() => handleEnableAgent(agent)}
                          >
                            <Power size={14} style={{marginRight: '0.4rem', display: 'inline'}} />
                            활성화
                          </button>
                        )}
                        {agent.status === 'enabled' && (
                          <>
                            <button
                              style={{flex: 1, padding: '0.6rem', background: 'rgba(52, 199, 89, 0.1)', color: '#34c759', border: 'none', borderRadius: '8px', cursor: 'default', fontWeight: 700, fontSize: '0.85rem'}}
                              disabled
                            >
                              <CheckCircle size={14} style={{marginRight: '0.4rem', display: 'inline'}} />
                              활성화됨
                            </button>
                            <button
                              className="apply-patch-btn"
                              style={{flex: 1, padding: '0.6rem', background: 'rgba(255, 107, 107, 0.1)', color: '#ff6b6b'}}
                              onClick={() => handleDisableAgent(agent)}
                            >
                              <Power size={14} style={{marginRight: '0.4rem', display: 'inline'}} />
                              비활성화
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'oauth' && (
          <div className="oauth-view" style={{display: 'flex', flexDirection: 'column', gap: '2rem'}}>
            {/* 연결된 OAuth 서비스 */}
            {oauthServices.length > 0 && (
              <div>
                <h2 style={{color: '#fff', marginBottom: '1.5rem', fontSize: '1.2rem', fontWeight: 700}}>연결된 앱 및 서비스</h2>
                <div className="oauth-grid" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem'}}>
                  {oauthServices.map(service => {
                    const isExpired = service.expires_at && new Date(service.expires_at) < new Date();
                    const daysUntilExpiry = service.expires_at ? Math.ceil((new Date(service.expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;

                    return (
                      <div key={service.id} className="eco-card" style={{padding: '1.5rem', borderLeft: `4px solid ${isExpired ? '#ff3b30' : '#34c759'}`}}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem'}}>
                          <div>
                            <div style={{fontSize: '1.1rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                              {service.service.toUpperCase()}
                              <div style={{width: '8px', height: '8px', borderRadius: '50%', background: isExpired ? '#ff3b30' : '#34c759'}}></div>
                            </div>
                            <div style={{fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '0.2rem'}}>
                              {isExpired ? '만료됨' : '활성'}
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              if (window.confirm(`${service.service} 연결을 제거하시겠습니까?`)) {
                                setOAuthServices(oauthServices.filter(s => s.id !== service.id));
                              }
                            }}
                            style={{padding: '0.4rem', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#ff3b30'}}
                            title="연결 제거"
                          >
                            <X size={18} />
                          </button>
                        </div>

                        {/* 권한 스코프 */}
                        {service.scopes && service.scopes.length > 0 && (
                          <div style={{marginBottom: '1rem'}}>
                            <div style={{fontSize: '0.75rem', color: 'var(--accent-blue)', fontWeight: 700, marginBottom: '0.5rem', textTransform: 'uppercase'}}>권한</div>
                            <div style={{display: 'flex', flexWrap: 'wrap', gap: '0.4rem'}}>
                              {service.scopes.map(scope => (
                                <span key={scope} style={{background: 'rgba(100, 108, 255, 0.15)', padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.7rem', color: 'var(--accent-blue)'}}>
                                  {scope}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 토큰 정보 */}
                        <div style={{fontSize: '0.75rem', color: 'var(--text-dim)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)'}}>
                          <div>
                            <div style={{color: 'var(--text-dim)', marginBottom: '0.2rem'}}>설정일</div>
                            <div style={{color: '#fff', fontWeight: 600}}>{service.created_at ? new Date(service.created_at).toLocaleDateString('ko-KR') : '—'}</div>
                          </div>
                          <div>
                            <div style={{color: 'var(--text-dim)', marginBottom: '0.2rem'}}>
                              {isExpired ? '만료일' : '만료 예정'}
                            </div>
                            <div style={{color: isExpired ? '#ff3b30' : daysUntilExpiry && daysUntilExpiry < 7 ? '#ff9500' : '#fff', fontWeight: 600}}>
                              {daysUntilExpiry ? (isExpired ? '만료됨' : `${daysUntilExpiry}일`) : '무기한'}
                            </div>
                          </div>
                        </div>

                        {service.last_used_at && (
                          <div style={{fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.8rem', paddingTop: '0.8rem', borderTop: '1px solid rgba(255,255,255,0.1)'}}>
                            마지막 사용: {new Date(service.last_used_at).toLocaleDateString('ko-KR')}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* OAuth 서비스 설정 */}
            <div>
              <h2 style={{color: '#fff', marginBottom: '1.5rem', fontSize: '1.2rem', fontWeight: 700}}>새로운 앱 연결</h2>

              {showOAuthForm !== 'none' ? (
                <div className="oauth-form" style={{background: 'rgba(255,255,255,0.05)', padding: '2rem', borderRadius: '16px', border: '1px solid var(--accent-blue)', maxWidth: '700px'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
                    <h3 style={{color: '#fff', fontSize: '1.1rem', fontWeight: 700}}>{showOAuthForm.toUpperCase()} 연결 설정</h3>
                    <X size={20} style={{cursor: 'pointer'}} onClick={() => setShowOAuthForm('none')} />
                  </div>

                  {/* 리다이렉트 URI 정보 */}
                  <div style={{background: 'rgba(100, 108, 255, 0.1)', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid var(--accent-blue)'}}>
                    <div style={{fontSize: '0.8rem', color: 'var(--accent-blue)', fontWeight: 700, marginBottom: '0.5rem'}}>OAuth 리다이렉트 URI</div>
                    <div style={{fontSize: '0.75rem', color: '#fff', fontFamily: 'monospace', wordBreak: 'break-all'}}>
                      {typeof window !== 'undefined' ? `${window.location.origin}/oauth/callback/${showOAuthForm}` : 'http://localhost:5173/oauth/callback/service'}
                    </div>
                  </div>

                  <input
                    type="text"
                    placeholder="Client ID"
                    className="inline-input"
                    style={{width: '100%', marginBottom: '1rem'}}
                    value={oauthFormData.clientId}
                    onChange={e => setOAuthFormData({...oauthFormData, clientId: e.target.value})}
                  />

                  <input
                    type="password"
                    placeholder="Client Secret"
                    className="inline-input"
                    style={{width: '100%', marginBottom: '1rem'}}
                    value={oauthFormData.clientSecret}
                    onChange={e => setOAuthFormData({...oauthFormData, clientSecret: e.target.value})}
                  />

                  {/* 스코프 선택 */}
                  <div style={{marginBottom: '1.5rem'}}>
                    <label style={{display: 'block', fontSize: '0.85rem', color: 'var(--accent-blue)', marginBottom: '0.8rem', fontWeight: 700}}>
                      권한 선택 (필수)
                    </label>
                    <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.8rem'}}>
                      {['read:user', 'write:repo', 'admin:repo_hook', 'delete:repo'].map(scope => (
                        <label key={scope} style={{display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem'}}>
                          <input
                            type="checkbox"
                            checked={oauthFormData.selectedScopes?.includes(scope) || false}
                            onChange={e => {
                              const scopes = e.target.checked
                                ? [...(oauthFormData.selectedScopes || []), scope]
                                : (oauthFormData.selectedScopes || []).filter(s => s !== scope);
                              setOAuthFormData({...oauthFormData, selectedScopes: scopes});
                            }}
                            style={{cursor: 'pointer'}}
                          />
                          <span style={{color: 'var(--text-dim)'}}>{scope}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div style={{display: 'flex', gap: '1rem'}}>
                    <button
                      className="apply-btn"
                      style={{flex: 1}}
                      onClick={() => handleSetupOAuth(showOAuthForm)}
                    >
                      <Lock size={16} style={{marginRight: '0.4rem', display: 'inline'}} />
                      연결 저장
                    </button>
                    <button
                      style={{flex: 1, padding: '0.8rem', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-dim)', fontWeight: 600}}
                      onClick={() => setShowOAuthForm('none')}
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                <div className="oauth-services" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.5rem'}}>
                  {['github', 'slack', 'notion', 'airtable', 'google', 'microsoft', 'discord', 'linear'].map(service => {
                    const isConfigured = oauthServices.some(s => s.service === service);
                    return (
                      <div
                        key={service}
                        className="add-card"
                        onClick={() => !isConfigured && setShowOAuthForm(service as any)}
                        style={{opacity: isConfigured ? 0.5 : 1, cursor: isConfigured ? 'default' : 'pointer', position: 'relative'}}
                      >
                        {isConfigured ? (
                          <>
                            <CheckCircle size={32} color="#34c759" />
                            <span style={{marginTop: '1rem', fontWeight: 700, color: '#34c759'}}>연결됨</span>
                          </>
                        ) : (
                          <>
                            <Key size={32} />
                            <span style={{marginTop: '1rem', fontWeight: 700}}>
                              {service === 'microsoft' ? 'Microsoft' : service === 'google' ? 'Google' : service.charAt(0).toUpperCase() + service.slice(1)}
                            </span>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* OAuth 보안 안내 */}
            <div style={{background: 'rgba(100, 108, 255, 0.08)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(100, 108, 255, 0.2)'}}>
              <div style={{display: 'flex', gap: '0.8rem', fontSize: '0.85rem', color: 'var(--text-dim)'}}>
                <AlertCircle size={18} style={{flexShrink: 0, color: 'var(--accent-blue)', marginTop: '0.2rem'}} />
                <div>
                  <div style={{color: 'var(--accent-blue)', fontWeight: 700, marginBottom: '0.3rem'}}>보안 정보</div>
                  <div>Client Secret은 절대 공개하지 마세요. 의심스러운 활동이 감지되면 즉시 해당 OAuth 앱에서 토큰을 취소하세요.</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 모달 */}
        {showModal && (
          <div className="confirm-modal-backdrop" onClick={() => setShowModal(false)}>
            <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
              <div className="confirm-header">
                <img src={`/app-logo.png?v=${Date.now()}`} alt="LARS Prism" className="confirm-icon" />
                <h3>LARS Prism</h3>
              </div>
              <p className="confirm-message" style={{color: modalData.isError ? '#ff6b6b' : 'inherit'}}>
                {modalData.message}
              </p>
              <div className="confirm-buttons">
                <button
                  className="confirm-ok"
                  onClick={() => {
                    modalData.onConfirm();
                    setShowModal(false);
                  }}
                  style={{background: modalData.isError ? '#ff6b6b' : 'var(--accent-blue)', width: '100%'}}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
