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
  scopes?: string[];
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
  const [activeTab, setActiveTab] = useState<'projects' | 'skills' | 'connectors' | 'apps' | 'agents' | 'oauth' | 'images'>('projects');
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
  const [showOAuthForm, setShowOAuthForm] = useState<'none' | 'github' | 'slack' | 'notion' | 'airtable'>('none');
  const [oauthFormData, setOAuthFormData] = useState({ clientId: '', clientSecret: '' });
  const [formData, setFormData] = useState({ name: '', detail: '' });

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

      invoke<Agent[]>('discover_agents')
        .then(ag => { console.log('[Ecosystem] agents:', ag?.length); setAgents(ag || []); })
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
      await invoke('install_agent', { agentId: agent.id });
      await loadData();
      alert(`✅ ${agent.name} 에이전트가 설치되었습니다.`);
    } catch (err) { alert(`에이전트 설치 실패: ${err}`); }
  };

  const handleEnableAgent = async (agent: Agent) => {
    try {
      await invoke('enable_agent', { agentId: agent.id });
      await loadData();
      alert(`✅ ${agent.name} 에이전트가 활성화되었습니다.`);
    } catch (err) { alert(`에이전트 활성화 실패: ${err}`); }
  };

  const handleSetupOAuth = async (service: string) => {
    if (!oauthFormData.clientId || !oauthFormData.clientSecret) {
      alert('Client ID와 Secret을 모두 입력하세요.');
      return;
    }
    try {
      await invoke('setup_oauth', {
        service,
        client_id: oauthFormData.clientId,
        client_secret: oauthFormData.clientSecret
      });
      setOAuthFormData({ clientId: '', clientSecret: '' });
      setShowOAuthForm('none');
      await loadData();
      alert(`✅ ${service.toUpperCase()} OAuth 설정이 완료되었습니다.`);
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
        <button className={activeTab === 'skills' ? 'active' : ''} onClick={() => setActiveTab('skills')}>
          <Zap size={18} /> 스킬
        </button>
        <button className={activeTab === 'connectors' ? 'active' : ''} onClick={() => setActiveTab('connectors')}>
          <Unplug size={18} /> 커넥터
        </button>
        <button className={activeTab === 'apps' ? 'active' : ''} onClick={() => setActiveTab('apps')}>
          <ShoppingBag size={18} /> 앱
        </button>
        <button className={activeTab === 'oauth' ? 'active' : ''} onClick={() => setActiveTab('oauth')}>
          <Key size={18} /> OAuth
        </button>
        <button className={activeTab === 'images' ? 'active' : ''} onClick={() => setActiveTab('images')}>
          <Wand2 size={18} /> 이미지 스튜디오
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

        {activeTab === 'skills' && (
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

        {activeTab === 'connectors' && (
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

        {activeTab === 'apps' && (
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
                            {app.category === 'Agentic' && "멀티 에이전트 협업 및 오케스트레이션"}
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
                          <button
                            style={{flex: 1, padding: '0.6rem', background: 'rgba(52, 199, 89, 0.1)', color: '#34c759', border: 'none', borderRadius: '8px', cursor: 'default', fontWeight: 700, fontSize: '0.85rem'}}
                            disabled
                          >
                            <CheckCircle size={14} style={{marginRight: '0.4rem', display: 'inline'}} />
                            활성화됨
                          </button>
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
            {oauthServices.length > 0 && (
              <div>
                <h2 style={{color: '#fff', marginBottom: '1.5rem', fontSize: '1.2rem', fontWeight: 700}}>연결된 OAuth 서비스</h2>
                <div className="oauth-grid" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem'}}>
                  {oauthServices.map(service => (
                    <div key={service.id} className="eco-card">
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
                        <div style={{fontSize: '1rem', fontWeight: 700, color: '#fff'}}>{service.service.toUpperCase()}</div>
                        <div style={{display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem', color: '#34c759', fontWeight: 800}}>
                          <div style={{width: '8px', height: '8px', borderRadius: '50%', background: '#34c759'}}></div>
                          CONNECTED
                        </div>
                      </div>
                      <div style={{fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '1rem'}}>
                        {service.scopes && service.scopes.length > 0 && (
                          <div>
                            <span style={{color: 'var(--accent-blue)', fontWeight: 700}}>스코프:</span>
                            <div style={{marginTop: '0.4rem', display: 'flex', flexWrap: 'wrap', gap: '0.4rem'}}>
                              {service.scopes.map(scope => (
                                <span key={scope} style={{background: 'rgba(100, 108, 255, 0.1)', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.7rem'}}>
                                  {scope}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      {service.created_at && (
                        <div style={{fontSize: '0.75rem', color: 'var(--text-dim)', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.8rem'}}>
                          설정: {new Date(service.created_at).toLocaleDateString('ko-KR')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h2 style={{color: '#fff', marginBottom: '1.5rem', fontSize: '1.2rem', fontWeight: 700}}>OAuth 서비스 설정</h2>

              {showOAuthForm !== 'none' ? (
                <div className="oauth-form" style={{background: 'rgba(255,255,255,0.05)', padding: '2rem', borderRadius: '16px', border: '1px solid var(--accent-blue)', maxWidth: '600px'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
                    <h3 style={{color: '#fff', fontSize: '1.1rem', fontWeight: 700}}>{showOAuthForm.toUpperCase()} 설정</h3>
                    <X size={20} style={{cursor: 'pointer'}} onClick={() => setShowOAuthForm('none')} />
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
                    style={{width: '100%', marginBottom: '1.5rem'}}
                    value={oauthFormData.clientSecret}
                    onChange={e => setOAuthFormData({...oauthFormData, clientSecret: e.target.value})}
                  />

                  <button
                    className="apply-btn"
                    style={{width: '100%'}}
                    onClick={() => handleSetupOAuth(showOAuthForm)}
                  >
                    <Lock size={16} style={{marginRight: '0.4rem', display: 'inline'}} />
                    설정 저장
                  </button>
                </div>
              ) : (
                <div className="oauth-services" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.5rem'}}>
                  {['github', 'slack', 'notion', 'airtable'].map(service => {
                    const isConfigured = oauthServices.some(s => s.service === service);
                    return (
                      <div
                        key={service}
                        className="add-card"
                        onClick={() => !isConfigured && setShowOAuthForm(service as any)}
                        style={{opacity: isConfigured ? 0.5 : 1, cursor: isConfigured ? 'default' : 'pointer'}}
                      >
                        {isConfigured ? (
                          <>
                            <CheckCircle size={32} color="#34c759" />
                            <span style={{marginTop: '1rem', fontWeight: 700, color: '#34c759'}}>설정됨</span>
                          </>
                        ) : (
                          <>
                            <Key size={32} />
                            <span style={{marginTop: '1rem', fontWeight: 700}}>{service.charAt(0).toUpperCase() + service.slice(1)}</span>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'images' && (
          <div className="image-studio-view" style={{display: 'flex', flexDirection: 'column', gap: '2rem'}}>
            {/* 이미지 생성 폼 */}
            <div className="generation-form" style={{background: 'rgba(168, 85, 247, 0.1)', padding: '2rem', borderRadius: '16px', border: '1px solid var(--accent-purple)'}}>
              <h2 style={{color: '#fff', marginBottom: '1.5rem', fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.8rem'}}>
                <Wand2 size={24} color='var(--accent-purple)' />
                AI 이미지 생성 스튜디오
              </h2>

              <div style={{display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem'}}>
                <textarea
                  placeholder="이미지를 설명하세요... (예: a beautiful futuristic city at sunset, cyberpunk style)"
                  value={imagePrompt}
                  onChange={e => setImagePrompt(e.target.value)}
                  style={{
                    width: '100%',
                    minHeight: '100px',
                    padding: '1rem',
                    borderRadius: '12px',
                    border: '1px solid rgba(100, 108, 255, 0.3)',
                    background: 'rgba(255,255,255,0.05)',
                    color: '#fff',
                    fontFamily: 'monospace',
                    fontSize: '0.9rem',
                    resize: 'vertical'
                  }}
                  disabled={isGenerating}
                />
              </div>

              <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem'}}>
                <div>
                  <label style={{display: 'block', fontSize: '0.85rem', color: 'var(--accent-blue)', marginBottom: '0.4rem', fontWeight: 700}}>
                    모델
                  </label>
                  <select
                    value={imageModel}
                    onChange={e => setImageModel(e.target.value)}
                    disabled={isGenerating}
                    style={{
                      width: '100%',
                      padding: '0.8rem',
                      borderRadius: '8px',
                      border: '1px solid rgba(100, 108, 255, 0.3)',
                      background: 'rgba(255,255,255,0.05)',
                      color: '#fff',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="dalle">🎨 DALL-E 3</option>
                    <option value="stable-diffusion">⚡ Stable Diffusion 3</option>
                    <option value="huggingface">🤗 HuggingFace</option>
                  </select>
                </div>

                <div>
                  <label style={{display: 'block', fontSize: '0.85rem', color: 'var(--accent-blue)', marginBottom: '0.4rem', fontWeight: 700}}>
                    품질
                  </label>
                  <select
                    value={imageQuality}
                    onChange={e => setImageQuality(e.target.value)}
                    disabled={isGenerating}
                    style={{
                      width: '100%',
                      padding: '0.8rem',
                      borderRadius: '8px',
                      border: '1px solid rgba(100, 108, 255, 0.3)',
                      background: 'rgba(255,255,255,0.05)',
                      color: '#fff',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="standard">Standard</option>
                    <option value="hd">HD (고품질)</option>
                    <option value="ultra">Ultra (최고품질)</option>
                  </select>
                </div>

                <div>
                  <label style={{display: 'block', fontSize: '0.85rem', color: 'var(--accent-blue)', marginBottom: '0.4rem', fontWeight: 700}}>
                    스타일
                  </label>
                  <select
                    value={imageStyle}
                    onChange={e => setImageStyle(e.target.value)}
                    disabled={isGenerating}
                    style={{
                      width: '100%',
                      padding: '0.8rem',
                      borderRadius: '8px',
                      border: '1px solid rgba(100, 108, 255, 0.3)',
                      background: 'rgba(255,255,255,0.05)',
                      color: '#fff',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="vibrant">Vibrant</option>
                    <option value="photorealistic">Photorealistic</option>
                    <option value="painting">Painting</option>
                    <option value="anime">Anime</option>
                    <option value="sketch">Sketch</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleGenerateImage}
                disabled={isGenerating || !imagePrompt.trim()}
                style={{
                  width: '100%',
                  padding: '1rem',
                  background: isGenerating ? 'rgba(100, 108, 255, 0.3)' : 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '12px',
                  fontWeight: 700,
                  fontSize: '1rem',
                  cursor: isGenerating ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.8rem'
                }}
              >
                {isGenerating ? (
                  <>
                    <div style={{width: '16px', height: '16px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite'}} />
                    생성 중...
                  </>
                ) : (
                  <>
                    <Wand2 size={20} />
                    이미지 생성
                  </>
                )}
              </button>
            </div>

            {/* 생성 이력 */}
            {generatedImages.length > 0 && (
              <div>
                <h2 style={{color: '#fff', marginBottom: '1.5rem', fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.8rem'}}>
                  <Clock size={20} />
                  생성 이력 ({generatedImages.length})
                </h2>

                <div className="gallery-grid" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem'}}>
                  {generatedImages.map(img => (
                    <div key={img.id} className="eco-card" style={{overflow: 'hidden', display: 'flex', flexDirection: 'column'}}>
                      <div style={{position: 'relative', width: '100%', paddingBottom: '100%', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', overflow: 'hidden'}}>
                        <img
                          src={img.image_url}
                          alt={img.prompt}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/280?text=Image+Error';
                          }}
                        />
                        <div style={{
                          position: 'absolute',
                          top: '0.5rem',
                          right: '0.5rem',
                          background: 'rgba(0,0,0,0.7)',
                          padding: '0.4rem 0.8rem',
                          borderRadius: '6px',
                          fontSize: '0.7rem',
                          color: 'var(--accent-blue)',
                          fontWeight: 700
                        }}>
                          {img.model.toUpperCase()}
                        </div>
                      </div>

                      <div style={{padding: '1rem', display: 'flex', flexDirection: 'column', flex: 1}}>
                        <p style={{fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: '0.8rem', lineHeight: '1.4', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'}}>
                          {img.prompt}
                        </p>

                        <div style={{fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '0.8rem', display: 'flex', gap: '1rem', flexWrap: 'wrap'}}>
                          {img.quality && <span>품질: {img.quality}</span>}
                          {img.style && <span>스타일: {img.style}</span>}
                          <span>{new Date(img.created_at).toLocaleDateString('ko-KR')}</span>
                        </div>

                        <div style={{
                          display: 'flex',
                          gap: '0.5rem',
                          paddingTop: '0.8rem',
                          borderTop: '1px solid rgba(255,255,255,0.1)',
                          marginTop: 'auto'
                        }}>
                          <a
                            href={img.image_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              flex: 1,
                              padding: '0.6rem',
                              background: 'rgba(100, 108, 255, 0.1)',
                              color: 'var(--accent-blue)',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              textAlign: 'center',
                              fontWeight: 700,
                              fontSize: '0.75rem',
                              textDecoration: 'none'
                            }}
                          >
                            열기
                          </a>
                          <button
                            onClick={() => handleDeleteImage(img.id)}
                            style={{
                              padding: '0.6rem',
                              background: 'rgba(255,255,255,0.05)',
                              color: '#ff3b30',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontWeight: 700
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {generatedImages.length === 0 && !isGenerating && (
              <div style={{
                textAlign: 'center',
                padding: '3rem',
                color: 'var(--text-dim)',
                borderRadius: '16px',
                border: '1px dashed rgba(100, 108, 255, 0.3)'
              }}>
                <Image size={48} style={{margin: '0 auto 1rem', opacity: 0.5}} />
                <p style={{fontSize: '1rem', marginBottom: '0.5rem'}}>생성된 이미지가 없습니다</p>
                <p style={{fontSize: '0.9rem'}}>DALL-E 3, Stable Diffusion, 또는 HuggingFace를 사용하여 이미지를 생성해보세요!</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
