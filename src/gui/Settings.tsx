import React, { useState, useEffect } from 'react';
import { SaveStatus, type SaveState } from './components/SaveStatus';

// 로컬 개발은 localhost:8001, 배포 환경은 같은 도메인의 /api 를 쓴다
const DEMO_TOKEN = 'dev-demo-token';
const settingsApiBase = () => (window.location.hostname === 'localhost' ? 'http://localhost:8001/api' : '/api');
import { useFeatureFlag } from './lib/featureFlags';
import { SkillsPanel } from './components/SkillsPanel';
import { PluginsPanel } from './components/PluginsPanel';
import { invoke } from '@tauri-apps/api/tauri';
import { GlassmorphicIcon } from './components/GlassmorphicIcon';
import { PrismMonitor } from './components/PrismMonitor';
import { Pricing } from './components/Pricing';
import { Payment } from './components/Payment';
import { ChangePassword } from './components/Auth/ChangePassword';
import { ApiSettingsPanel } from './components/ApiSettingsPanel';
import { ConnectedAgentPanel } from './components/ConnectedAgentPanel';
import { getToken, getCurrentUser } from './lib/auth';
import { PRIVACY_POLICY, TERMS_OF_SERVICE } from './LegalContent';
import ImportExport from './components/ImportExport';
import {
  User,
  Mail,
  Phone,
  Plus,
  Brain,
  Bell,
  LayoutGrid,
  Database,
  Lock,
  Download,
  Trash2,
  Key,
  Zap,
  Sparkles,
  LucideIcon,
  Monitor,
  Shield,
  Thermometer,
  Info,
  ShieldAlert,
  FileText,
  HelpCircle,
  ChevronLeft,
  Settings as SettingsIcon,
  Cloud,
  ChevronRight,
  ShieldCheck,
  CreditCard,
  Building2,
  Package,
  BarChart3,
  Cog,
  RefreshCw,
  HardDrive,
  Target,
  Wrench,
  AlertTriangle as AlertIcon,
  TrendingUp,
  Save,
  CheckCircle2,
  AlertCircle as AlertCircleIcon,
  Lightbulb,
  Check,
  Cpu,
  Radio as RAMIcon,
  Zap as SpeedIcon,
  Puzzle,
  Bot,
  History,
  Plug
} from 'lucide-react';

interface Config {
  apiKey: string;
  openaiKey: string;
  anthropicKey: string;
  moonshotKey: string;
  modelType: string;
  useLocalModel: boolean;
  ollamaEndpoint: string;
  securityLevel: string;
  userName: string;
  userEmail: string;
  phoneNumber: string;
  avatarUrl: string;
  enableTokenOptimization: boolean;
  enableMemory: boolean;
  enableNotifications: boolean;
  theme: string;
  language: string;
  encryptionEnabled: boolean;
  enableOmniControl: boolean;
  temperature: number;
  autoApplyPatches: boolean;
  piiScrubbingLevel: string;
  terminalShell: string;
}

interface SettingsProps {
  onClose: () => void;
  onSave?: (config: Config) => void;
  onOpenBrowser?: () => void;
}

const SETTINGS_TEXTS = {
  ko: {
    title: '설정',
    accountProfile: '계정 및 프로필',
    profileInfo: '프로필 정보',
    intelligentService: 'LARS 지능형 서비스',
    features: 'LARS 기능 기술 설정',
    omniControl: 'LARS Omni-Control (시스템 협업)',
    security: '안전 및 보안 (PII)',
    data: '데이터 제어 및 기록',
    save: '설정 저장',
  },
  en: {
    title: 'Settings',
    accountProfile: 'Account & Profile',
    profileInfo: 'Profile Information',
    intelligentService: 'LARS Intelligent Service',
    features: 'LARS Features Settings',
    omniControl: 'LARS Omni-Control (System Integration)',
    security: 'Security & Safety (PII)',
    data: 'Data Control & History',
    save: 'Save Settings',
  },
  ja: {
    title: '設定',
    accountProfile: 'アカウント＆プロフィール',
    profileInfo: 'プロフィール情報',
    intelligentService: 'LARS インテリジェントサービス',
    features: 'LARS機能設定',
    omniControl: 'LARS Omni-Control (システム統合)',
    security: 'セキュリティ＆安全 (PII)',
    data: 'データ制御と履歴',
    save: '設定を保存',
  },
  zh: {
    title: '设置',
    accountProfile: '账户和资料',
    profileInfo: '资料信息',
    intelligentService: 'LARS 智能服务',
    features: 'LARS 功能设置',
    omniControl: 'LARS Omni-Control (系统集成)',
    security: '安全和防护 (PII)',
    data: '数据控制和历史记录',
    save: '保存设置',
  }
};

interface SettingsItemProps {
  icon?: LucideIcon;
  gradient?: string;
  emoji?: string;
  imgSrc?: string;
  label: string;
  value?: string;
  onClick?: () => void;
  showArrow?: boolean;
  danger?: boolean;
}

type ActiveSection = string;

const SettingsItem = ({ icon: Icon, gradient, emoji, imgSrc, label, value, onClick, showArrow = true, danger = false }: SettingsItemProps) => (
  <div className={`settings-list-item ${onClick ? '' : 'no-hover'} ${danger ? 'danger-action' : ''}`} onClick={onClick}>
    <div className="item-left">
      {imgSrc ? (
        <img src={imgSrc} className="item-img-icon" alt={label} />
      ) : Icon ? (
        <span className="item-icon menu-plain-icon" style={{ display: 'inline-flex', width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={18} />
        </span>
      ) : (
        <span className="item-icon">{emoji}</span>
      )}
      <span className={`item-label ${danger ? 'danger' : ''}`}>{label}</span>
    </div>
    <div className="item-right">
      {value && <span className="item-value">{value}</span>}
      {showArrow && <span className="item-arrow">›</span>}
    </div>
  </div>
);

function Settings({ onClose, onSave, onOpenBrowser }: SettingsProps) {
  const [currentLanguage] = useState<'ko' | 'en' | 'ja' | 'zh'>(() => {
    // 앱에서 고른 언어(app_language)를 먼저 쓰고, 없으면 시스템 언어에 따라 자동 감지
    try {
      const saved = localStorage.getItem('app_language');
      if (saved === 'ko' || saved === 'en' || saved === 'ja' || saved === 'zh') return saved;
    } catch { /* 저장소를 못 읽으면 시스템 언어를 쓴다 */ }
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith('ko')) return 'ko';
    if (browserLang.startsWith('ja')) return 'ja';
    if (browserLang.startsWith('zh')) return 'zh';
    return 'en'; // 기본값 영문
  });

  const [config, setConfig] = useState<Config>({
    apiKey: '',
    openaiKey: '',
    anthropicKey: '',
    moonshotKey: '',
    modelType: 'LARS-Native',
    useLocalModel: false,
    ollamaEndpoint: 'http://localhost:11434',
    securityLevel: 'Standard',
    userName: 'Jongsoo',
    userEmail: '',
    phoneNumber: '+821096849284',
    avatarUrl: '',
    enableTokenOptimization: true,
    enableMemory: true,
    enableNotifications: true,
    theme: 'dark',
    language: 'ko',
    encryptionEnabled: false,
    enableOmniControl: true,
    temperature: 0.7,
    autoApplyPatches: false,
    piiScrubbingLevel: 'Standard',
    terminalShell: 'zsh'
  });

  const [saveStatus, setSaveStatus] = useState<SaveState>(null);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [baseline, setBaseline] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<ActiveSection>('');
  const [browserControlOn, setBrowserControlOn] = useFeatureFlag('browser_control');
  const [usageData, setUsageData] = useState<any>(null);
  const [usageError, setUsageError] = useState('');
  const [usageLoading, setUsageLoading] = useState(false);

  const loadUsage = async () => {
    setUsageLoading(true);
    setUsageError('');
    try {
      const base = window.location.hostname === 'localhost' ? 'http://localhost:8001/api' : '/api';
      const response = await fetch(`${base}/billing/summary`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setUsageData(await response.json());
    } catch (err) {
      setUsageError(`사용량을 불러오지 못했습니다: ${(err as Error).message}`);
    } finally {
      setUsageLoading(false);
    }
  };

  useEffect(() => {
    if (activeSection === 'usage') loadUsage();
  }, [activeSection]);
  const [selectedPlan, setSelectedPlan] = useState<{ tier: string; cycle: 'monthly' | 'yearly' }>({ tier: 'pro', cycle: 'monthly' });
  const [npuInfo, setNpuInfo] = useState<any>(null);
  const [npuLoading, setNpuLoading] = useState(false);
  const [detectedAgents, setDetectedAgents] = useState<any>(() => {
    const saved = localStorage.getItem('detectedAgents');
    return saved ? JSON.parse(saved) : null;
  });
  const [isDetecting, setIsDetecting] = useState(false);

  // Prism 3계층 아키텍처 통계
  const [prismStats, setPrismStats] = useState<any>(null);
  const [prismUserStats, setPrismUserStats] = useState<any>(null);
  const [prismLoading, setPrismLoading] = useState(false);
  const userId = localStorage.getItem('prism_user_id') || 'unknown';

  // 불러오기가 끝난 시점의 설정을 기준으로 삼아, 바뀐 내용이 있는지 본다
  useEffect(() => {
    if (loaded && baseline === null) setBaseline(JSON.stringify(config));
  }, [loaded]);
  const isDirty = baseline !== null && JSON.stringify(config) !== baseline;

  useEffect(() => {
    const initConfig = async () => {
      try {
        // 저장된 에이전트 타입 로드
        const savedModelType = localStorage.getItem('modelType');
        if (savedModelType) {
          setConfig(prev => ({ ...prev, modelType: savedModelType }));
        }

        // 저장된 설정 로드 (Tauri 환경에서만)
        try {
          const savedConfig = await invoke<Config>('load_config');
          setConfig(prev => ({ ...prev, ...savedConfig }));
        } catch (e) {
          // Tauri 환경이 아니면 무시
        }

        // 로그인한 사용자 정보 로드
        const token = getToken();
        if (token) {
          try {
            const user = await getCurrentUser(token);
            setConfig(prev => ({ ...prev, userEmail: user.email, userName: user.username }));
          } catch (error) {
            console.error('사용자 정보 로드 실패:', error);
          }
          // 이 계정에 저장해 둔 프로필과 설정을 불러온다 (로그아웃 후 다시 로그인해도 유지)
          try {
            if (token === DEMO_TOKEN) throw new Error('demo account');
            const res = await fetch(`${settingsApiBase()}/auth/profile`, { headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) {
              const data = await res.json();
              const profile = data.profile || {};
              const saved = data.settings || {};
              setConfig(prev => ({
                ...prev,
                ...saved,
                userName: profile.displayName || prev.userName,
                phoneNumber: profile.phone ?? prev.phoneNumber,
                avatarUrl: profile.avatarUrl ?? prev.avatarUrl,
              }));
              if (saved.modelType) localStorage.setItem('modelType', saved.modelType);
            }
          } catch (error) {
            console.error('저장된 프로필 불러오기 실패:', error);
          }
        }
      } catch (error) {
        console.error('설정 불러오기 실패:', error);
      }
    };
    initConfig().finally(() => setLoaded(true));
  }, []);

  const handleSave = async () => {
    try {
      // 에이전트 타입 저장 (이 기기)
      localStorage.setItem('modelType', config.modelType);

      // 계정에 저장: 프로필 + 비밀이 아닌 설정 (API 키는 서버에 보내지 않는다)
      const token = await getToken();
      let serverError: string | null = null;
      if (token === DEMO_TOKEN) {
        // 데모 계정은 서버 계정이 아니므로 프로필을 서버에 저장할 수 없다
        setSaveStatus({ kind: 'error', text: '데모 계정은 서버에 저장할 수 없습니다. 회원 계정으로 로그인해 주세요.' });
        return;
      }
      if (token) {
        try {
          const response = await fetch(`${settingsApiBase()}/auth/profile`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
              profile: {
                displayName: config.userName,
                phone: config.phoneNumber || '',
                avatarUrl: config.avatarUrl || '',
              },
              settings: {
                modelType: config.modelType,
                securityLevel: config.securityLevel,
                useLocalModel: config.useLocalModel,
                ollamaEndpoint: config.ollamaEndpoint,
                enableTokenOptimization: config.enableTokenOptimization,
                enableMemory: config.enableMemory,
                enableNotifications: config.enableNotifications,
                theme: config.theme,
                language: config.language,
                encryptionEnabled: config.encryptionEnabled,
                enableOmniControl: config.enableOmniControl,
                autoApplyPatches: config.autoApplyPatches,
                piiScrubbingLevel: config.piiScrubbingLevel,
                terminalShell: config.terminalShell,
              },
            }),
          });
          if (!response.ok) {
            if (response.status === 401) serverError = '로그인이 만료되었습니다. 다시 로그인해 주세요.';
            else if (response.status === 413) serverError = '이미지 크기가 너무 큽니다.';
            else serverError = `서버 응답 ${response.status}`;
          }
        } catch (err) {
          serverError = '서버에 연결하지 못했습니다.';
          console.error('프로필 저장 실패:', err);
        }
      }

      // 데스크톱 앱에서는 기기에도 저장
      try {
        await invoke('save_config', { config });
      } catch (e) {
        // 웹 환경에서는 Tauri 저장이 없으므로 무시
      }

      if (serverError) {
        setSaveStatus({ kind: 'error', text: `저장하지 못했습니다: ${serverError}` });
        return;
      }
      setBaseline(JSON.stringify(config));
      setSaveStatus({ kind: 'success', text: '설정이 저장되었습니다.' });
      if (onSave) {
        onSave(config);
      }
      setTimeout(() => setSaveStatus(null), 2500);
    } catch (error) {
      setSaveStatus({ kind: 'error', text: `저장하지 못했습니다: ${error}` });
    }
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'account':
        return (
          <section className="settings-group animate-in">
            <button className="back-link" onClick={() => setActiveSection('main')}><ChevronLeft size={16} /> 뒤로가기</button>
            <h3 className="group-title">계정 정보</h3>
            <div className="settings-list">
              <div className="settings-list-item no-hover">
                <span className="item-label">프로필 이미지</span>
                <div style={{marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '1rem'}}>
                  {config.avatarUrl && <img src={config.avatarUrl} alt="Profile" style={{width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover'}} />}
                  <label style={{cursor: 'pointer', padding: '0.5rem 1rem', backgroundColor: '#4f46e5', borderRadius: '8px', color: 'white', fontSize: '0.875rem'}}>
                    업로드
                    <input
                      type="file"
                      accept="image/*"
                      style={{display: 'none'}}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const dataUrl = event.target?.result as string;
                            setConfig({...config, avatarUrl: dataUrl});
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
              <div className="settings-list-item no-hover">
                <span className="item-label">사용자 이름</span>
                <input type="text" className="inline-input" value={config.userName} onChange={(e) => setConfig({...config, userName: e.target.value})} />
              </div>
              <div className="settings-list-item no-hover">
                <span className="item-label">이메일</span>
                <input type="text" className="inline-input" value={config.userEmail} onChange={(e) => setConfig({...config, userEmail: e.target.value})} />
              </div>
              <SettingsItem
                icon={Lock}
                gradient="from-orange-400 to-red-500"
                label="비밀번호 변경"
                onClick={() => setActiveSection('changePassword')}
                showArrow={true}
              />
              <SettingsItem
                icon={Key}
                gradient="from-indigo-400 to-violet-500"
                label="API 설정"
                value="키·연결 확인"
                onClick={() => setActiveSection('api')}
                showArrow={true}
              />
            </div>
          </section>
        );
      case 'changePassword':
        return (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <ChangePassword
              onSuccess={() => {
                setTimeout(() => setActiveSection('account'), 2000);
              }}
            />
          </div>
        );
      case 'apps':
        return (
          <section className="settings-group animate-in">
            <button className="back-link" onClick={() => setActiveSection('main')}><ChevronLeft size={16} /> 뒤로가기</button>
            <h3 className="group-title">LARS Omni-Control</h3>
            <div className="settings-list">
              <div className="settings-list-item no-hover">
                <div className="item-info-col">
                  <span className="item-label">Omni-Control 활성화</span>
                  <span className="item-desc">AI가 운영체제의 다른 애플리케이션을 직접 제어하고 협업하도록 허용합니다.</span>
                </div>
                <input type="checkbox" className="ios-switch" checked={config.enableOmniControl} onChange={(e) => setConfig({...config, enableOmniControl: e.target.checked})} />
              </div>

              <div className="settings-list-item no-hover">
                <div className="item-info-col">
                  <span className="item-label">브라우저 조작</span>
                  <span className="item-desc">켜면 사이드바에 "브라우저 조작" 메뉴가 나타납니다. 허용한 사이트 안에서 Chrome 창을 띄워 페이지를 읽고 클릭·입력합니다. 구매·제출·로그인 같은 동작은 실행 전에 승인을 받으며, 비밀번호와 카드 정보는 직접 입력해야 합니다.</span>
                </div>
                <input type="checkbox" className="ios-switch" checked={browserControlOn} onChange={(e) => setBrowserControlOn(e.target.checked)} />
              </div>
              {browserControlOn && onOpenBrowser && (
                <button className="back-link" onClick={onOpenBrowser} style={{marginTop: '0.5rem'}}>브라우저 조작 화면 열기</button>
              )}
            </div>
          </section>
        );
      case 'security':
        return (
          <section className="settings-group animate-in">
            <button className="back-link" onClick={() => setActiveSection('main')}><ChevronLeft size={16} /> 뒤로가기</button>
            <h3 className="group-title">안전 및 보안 (Shieldora)</h3>
            <div className="settings-list">
              <div className="settings-list-item no-hover">
                <span className="item-label">개인정보 보호(PII) 수준</span>
                <select className="inline-select" value={config.piiScrubbingLevel} onChange={(e) => setConfig({...config, piiScrubbingLevel: e.target.value})}>
                  <option value="Strict">Strict (강력함)</option>
                  <option value="Standard">Standard (표준)</option>
                  <option value="Disabled">Disabled (해제)</option>
                </select>
              </div>
              <div className="settings-list-item no-hover">
                <div className="item-info-col">
                  <span className="item-label">로컬 데이터 암호화</span>
                  <span className="item-desc">디스크에 저장되는 모든 설정과 기록을 암호화합니다.</span>
                </div>
                <input type="checkbox" className="ios-switch" checked={config.encryptionEnabled} onChange={(e) => setConfig({...config, encryptionEnabled: e.target.checked})} />
              </div>
            </div>
          </section>
        );
      case 'data':
        return (
          <section className="settings-group animate-in">
            <button className="back-link" onClick={() => setActiveSection('main')}><ChevronLeft size={16} /> 뒤로가기</button>
            <h3 className="group-title">데이터 제어 및 기록</h3>
            <div className="settings-list">
              <SettingsItem icon={Download} gradient="from-emerald-400 to-teal-500" label="내 데이터 내보내기" value="JSON" onClick={() => alert('추출 준비 중...')} />
              <SettingsItem icon={History} gradient="from-red-500 to-rose-600" label="모든 대화 기록 삭제" danger showArrow={false} onClick={() => confirm('모든 기록을 삭제하시겠습니까?') && alert('삭제 완료')} />
            </div>
          </section>
        );
      case 'connected-agent':
      case 'developer':
        const handleDetectAgents = async () => {
          setIsDetecting(true);
          console.log('[DETECT] 🔍 에이전트 감지 시작...');
          try {
            console.log('[DETECT] API 호출: http://127.0.0.1:8000/api/agent/detect');
            const response = await fetch('http://127.0.0.1:8000/api/agent/detect', {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' },
              timeout: 30000
            });

            console.log('[DETECT] 응답 상태:', response.status);

            if (response.ok) {
              const data = await response.json();
              console.log('[DETECT] ✅ 감지 완료:', data);
              setDetectedAgents(data.detected_agents);
              // localStorage에 저장
              localStorage.setItem('detectedAgents', JSON.stringify(data.detected_agents));
              alert('✅ 에이전트 감지 완료!');
            } else {
              const errorText = await response.text();
              console.error('[DETECT] ❌ 응답 오류:', response.status, errorText);
              alert(`❌ 에이전트 감지 실패 (상태: ${response.status})`);
            }
          } catch (e) {
            console.error('[DETECT] ❌ 에이전트 감지 실패:', e);
            const errorMsg = e instanceof Error ? e.message : String(e);
            alert('❌ 에이전트 감지 실패:\n\n' + errorMsg + '\n\n• Backend 서버(8000)가 실행 중인지 확인하세요\n• 네트워크 연결을 확인하세요');
          } finally {
            setIsDetecting(false);
          }
        };

        return (
          <div style={{overflowY: 'auto', height: 'calc(100vh - 120px)', paddingRight: '1rem', paddingBottom: '4rem'}}>
            <button className="back-link" onClick={() => setActiveSection('main')}><ChevronLeft size={16} /> 뒤로가기</button>
            <ConnectedAgentPanel />
            <section className="settings-group">
            <h3 className="group-title">로컬 에이전트 감지</h3>
            <div className="settings-list">

              <div className="settings-list-item no-hover">
                <div className="item-info-col">
                  <span className="item-label">활성 에이전트</span>
                  <span className="item-desc">시스템에 설치된 에이전트를 자동 감지하여 사용합니다. 아래 "에이전트 감지" 버튼을 클릭하면 설치된 에이전트를 확인할 수 있습니다.</span>
                </div>
              </div>

              <div className="settings-list-item no-hover" style={{marginTop: '1.5rem', padding: '1rem', background: 'rgba(59, 130, 246, 0.08)', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.2)'}}>
                <button
                  onClick={handleDetectAgents}
                  disabled={isDetecting}
                  style={{
                    width: '100%',
                    padding: '0.8rem',
                    borderRadius: '6px',
                    background: isDetecting ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)',
                    border: '1px solid rgba(59, 130, 246, 0.5)',
                    color: '#3b82f6',
                    cursor: isDetecting ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {isDetecting ? '🔍 에이전트 감지 중...' : '🔍 에이전트 감지'}
                </button>
              </div>

              {detectedAgents && (
                <div style={{marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)'}}>
                  <h4 style={{color: '#fff', fontSize: '1rem', fontWeight: 600, marginBottom: '1rem'}}>📦 감지된 에이전트</h4>

                  {/* LARS-Native */}
                  <div className="settings-list-item no-hover" style={{marginBottom: '1.5rem', padding: '1rem', background: detectedAgents['LARS-Native']?.installed ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)', borderRadius: '8px', border: `1px solid ${detectedAgents['LARS-Native']?.installed ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem'}}>
                      <span style={{fontSize: '1.2rem'}}>◆</span>
                      <span style={{fontWeight: 600, color: '#fff'}}>LARS-Native</span>
                      <span style={{marginLeft: 'auto', fontSize: '0.85rem', fontWeight: 600, color: detectedAgents['LARS-Native']?.installed ? '#10b981' : '#ef4444'}}>
                        {detectedAgents['LARS-Native']?.installed ? '✅ 설치됨' : '❌ 설치 안됨'}
                      </span>
                    </div>
                    {detectedAgents['LARS-Native']?.installed && (
                      <div style={{fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '0.5rem'}}>
                        엔드포인트: {detectedAgents['LARS-Native']?.endpoint}
                      </div>
                    )}
                  </div>

                  {/* GPT-4 */}
                  <div className="settings-list-item no-hover" style={{marginBottom: '1.5rem', padding: '1rem', background: detectedAgents['GPT-4']?.installed ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)', borderRadius: '8px', border: `1px solid ${detectedAgents['GPT-4']?.installed ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem'}}>
                      <span style={{fontSize: '1.2rem'}}>◉</span>
                      <span style={{fontWeight: 600, color: '#fff'}}>GPT-4 (OpenAI)</span>
                      <span style={{marginLeft: 'auto', fontSize: '0.85rem', fontWeight: 600, color: detectedAgents['GPT-4']?.installed ? '#10b981' : '#ef4444'}}>
                        {detectedAgents['GPT-4']?.installed ? '✅ 설치됨' : '❌ 설치 안됨'}
                      </span>
                    </div>
                    {!detectedAgents['GPT-4']?.installed && (
                      <a href="https://platform.openai.com/docs/quickstart" target="_blank" rel="noopener noreferrer" style={{fontSize: '0.8rem', color: 'var(--accent-blue)', textDecoration: 'none', display: 'block', marginTop: '0.5rem'}}>
                        → 설치하기
                      </a>
                    )}
                  </div>

                  {/* Claude-3 */}
                  <div className="settings-list-item no-hover" style={{marginBottom: '1.5rem', padding: '1rem', background: detectedAgents['Claude-3']?.installed ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)', borderRadius: '8px', border: `1px solid ${detectedAgents['Claude-3']?.installed ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem'}}>
                      <span style={{fontSize: '1.2rem'}}>Ⓐ</span>
                      <span style={{fontWeight: 600, color: '#fff'}}>Claude 3 (Anthropic)</span>
                      <span style={{marginLeft: 'auto', fontSize: '0.85rem', fontWeight: 600, color: detectedAgents['Claude-3']?.installed ? '#10b981' : '#ef4444'}}>
                        {detectedAgents['Claude-3']?.installed ? '✅ 설치됨' : '❌ 설치 안됨'}
                      </span>
                    </div>
                    {!detectedAgents['Claude-3']?.installed && (
                      <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" style={{fontSize: '0.8rem', color: 'var(--accent-blue)', textDecoration: 'none', display: 'block', marginTop: '0.5rem'}}>
                        → 설치하기
                      </a>
                    )}
                  </div>

                  {/* Gemini */}
                  <div className="settings-list-item no-hover" style={{marginBottom: '1.5rem', padding: '1rem', background: detectedAgents['Gemini']?.installed ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)', borderRadius: '8px', border: `1px solid ${detectedAgents['Gemini']?.installed ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem'}}>
                      <span style={{fontSize: '1.2rem'}}>✦</span>
                      <span style={{fontWeight: 600, color: '#fff'}}>Gemini (Google)</span>
                      <span style={{marginLeft: 'auto', fontSize: '0.85rem', fontWeight: 600, color: detectedAgents['Gemini']?.installed ? '#10b981' : '#ef4444'}}>
                        {detectedAgents['Gemini']?.installed ? '✅ 설치됨' : '❌ 설치 안됨'}
                      </span>
                    </div>
                    {!detectedAgents['Gemini']?.installed && (
                      <a href="https://cloud.google.com/sdk" target="_blank" rel="noopener noreferrer" style={{fontSize: '0.8rem', color: 'var(--accent-blue)', textDecoration: 'none', display: 'block', marginTop: '0.5rem'}}>
                        → 설치하기
                      </a>
                    )}
                  </div>

                  {/* Kimi */}
                  <div className="settings-list-item no-hover" style={{marginBottom: '1.5rem', padding: '1rem', background: detectedAgents['Kimi']?.installed ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)', borderRadius: '8px', border: `1px solid ${detectedAgents['Kimi']?.installed ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem'}}>
                      <span style={{fontSize: '1.2rem'}}>◐</span>
                      <span style={{fontWeight: 600, color: '#fff'}}>Kimi (Moonshot)</span>
                      <span style={{marginLeft: 'auto', fontSize: '0.85rem', fontWeight: 600, color: detectedAgents['Kimi']?.installed ? '#10b981' : '#ef4444'}}>
                        {detectedAgents['Kimi']?.installed ? '✅ 설치됨' : '❌ 설치 안됨'}
                      </span>
                    </div>
                    {!detectedAgents['Kimi']?.installed && (
                      <a href="https://platform.moonshot.cn" target="_blank" rel="noopener noreferrer" style={{fontSize: '0.8rem', color: 'var(--accent-blue)', textDecoration: 'none', display: 'block', marginTop: '0.5rem'}}>
                        → 설치하기
                      </a>
                    )}
                  </div>
                </div>
              )}

              <div className="settings-list-item no-hover" style={{marginTop: '2rem', padding: '1rem', background: 'rgba(96, 165, 250, 0.08)', borderRadius: '8px', border: '1px solid rgba(96, 165, 250, 0.2)'}}>
                <div className="item-info-col">
                  <span className="item-label" style={{color: 'var(--accent-blue)', fontWeight: 600}}>💡 사용 방법</span>
                  <span className="item-desc" style={{marginTop: '0.5rem'}}>
                    1. "에이전트 감지" 버튼을 클릭하여 설치된 에이전트를 확인합니다<br/>
                    2. 설치되지 않은 에이전트는 링크를 클릭하여 설치할 수 있습니다<br/>
                    3. Chat에서 에이전트를 선택하여 사용합니다
                  </span>
                </div>
              </div>

              <div className="settings-list-item no-hover" style={{marginTop: '1rem', padding: '1rem', background: 'rgba(168, 85, 247, 0.08)', borderRadius: '8px', border: '1px solid rgba(168, 85, 247, 0.2)'}}>
                <div className="item-info-col">
                  <span className="item-label" style={{color: '#c4b5fd', fontWeight: 600}}>🔒 보안</span>
                  <span className="item-desc" style={{marginTop: '0.5rem'}}>• API 키를 입력할 필요가 없습니다<br/>• 로컬 시스템의 에이전트만 사용합니다<br/>• 모든 통신은 로컬에서 이루어집니다</span>
                </div>
              </div>
            </div>
            </section>
          </div>
        );
      case 'hardware':
        return (
          <section className="settings-group animate-in">
            <button className="back-link" onClick={() => setActiveSection('main')}><ChevronLeft size={16} /> 뒤로가기</button>
            <h3 className="group-title">하드웨어 정보 및 NPU 상태</h3>
            <div className="settings-list">
              {npuLoading ? (
                <div className="settings-list-item no-hover">
                  <span className="item-label">로딩 중...</span>
                </div>
              ) : npuInfo && !npuInfo.error ? (
                <>
                  <div className="settings-list-item no-hover" style={{background: 'rgba(168, 85, 247, 0.08)', padding: '1rem', borderRadius: '12px', marginBottom: '1rem', border: '1px solid rgba(168, 85, 247, 0.2)'}}>
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.9rem'}}>
                      <div>
                        <div style={{color: 'var(--text-dim)', fontSize: '0.8rem', marginBottom: '0.3rem'}}>칩 모델</div>
                        <div style={{fontWeight: 600, color: '#fff'}}>{npuInfo.chip_name}</div>
                      </div>
                      <div>
                        <div style={{color: 'var(--text-dim)', fontSize: '0.8rem', marginBottom: '0.3rem'}}>Apple Silicon</div>
                        <div style={{fontWeight: 600, color: npuInfo.is_apple_silicon ? '#10b981' : '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                          {npuInfo.is_apple_silicon ? <><CheckCircle2 size={16} /> Yes</> : <><AlertIcon size={16} /> No</>}
                        </div>
                      </div>
                      <div>
                        <div style={{color: 'var(--text-dim)', fontSize: '0.8rem', marginBottom: '0.3rem'}}>Neural Engine 코어</div>
                        <div style={{fontWeight: 600, color: '#f59e0b'}}>{npuInfo.ane_cores}개</div>
                      </div>
                      <div>
                        <div style={{color: 'var(--text-dim)', fontSize: '0.8rem', marginBottom: '0.3rem'}}>ANE TOPS</div>
                        <div style={{fontWeight: 600, color: '#f59e0b'}}>~{npuInfo.ane_tops.toFixed(1)} TFLOPS</div>
                      </div>
                      <div>
                        <div style={{color: 'var(--text-dim)', fontSize: '0.8rem', marginBottom: '0.3rem'}}>CPU 코어</div>
                        <div style={{fontWeight: 600, color: '#3b82f6'}}>{npuInfo.cpu_cores}개</div>
                      </div>
                      <div>
                        <div style={{color: 'var(--text-dim)', fontSize: '0.8rem', marginBottom: '0.3rem'}}>통합 메모리</div>
                        <div style={{fontWeight: 600, color: '#8b5cf6'}}>{npuInfo.memory_gb}GB</div>
                      </div>
                    </div>
                  </div>
                  <div style={{background: 'rgba(34, 197, 94, 0.08)', padding: '1rem', borderRadius: '12px', marginBottom: '1rem', border: '1px solid rgba(34, 197, 94, 0.2)'}}>
                    <div style={{fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '0.8rem', textTransform: 'uppercase'}}>사용 가능한 백엔드</div>
                    <div style={{display: 'flex', gap: '0.8rem', flexWrap: 'wrap'}}>
                      {npuInfo.available_backends.map((backend: string) => (
                        <span key={backend} style={{background: 'rgba(34, 197, 94, 0.15)', padding: '0.4rem 0.8rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 600, color: '#10b981', border: '1px solid rgba(34, 197, 94, 0.3)', display: 'flex', alignItems: 'center', gap: '0.4rem'}}>
                          {backend === 'mlx' && <><TrendingUp size={14} /> MLX</>}
                          {backend === 'coremltools' && <><Wrench size={14} /> CoreML</>}
                          {backend === 'mps' && <><Zap size={14} /> Metal</>}
                        </span>
                      ))}
                      {npuInfo.available_backends.length === 0 && (
                        <span style={{color: 'var(--text-dim)', fontSize: '0.85rem'}}>CPU만 사용 가능</span>
                      )}
                    </div>
                    <div style={{marginTop: '0.8rem', fontSize: '0.8rem', color: 'var(--text-dim)'}}>
                      추천 백엔드: <span style={{fontWeight: 600, color: '#10b981'}}>{npuInfo.recommended_backend}</span>
                    </div>
                  </div>
                  <div style={{background: 'rgba(59, 130, 246, 0.08)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.2)'}}>
                    <div style={{fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}><Lightbulb size={16} style={{color: '#60a5fa'}} /> 권장사항</div>
                    <ul style={{listStyle: 'none', padding: 0, fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: '1.6'}}>
                      <li style={{display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem'}}><Check size={16} style={{color: '#22c55e', marginTop: '0.2rem', flexShrink: 0}} /> MLX-LM으로 로컬 추론 시 ANE 가속 활용 (프라이버시 보호)</li>
                      <li style={{display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem'}}><Check size={16} style={{color: '#22c55e', marginTop: '0.2rem', flexShrink: 0}} /> LARS-Edge 엔진으로 오프라인 사용 가능</li>
                      <li style={{display: 'flex', alignItems: 'flex-start', gap: '0.5rem'}}><Check size={16} style={{color: '#22c55e', marginTop: '0.2rem', flexShrink: 0}} /> 512GB 메모리로 70B 모델도 8-bit로 로드 가능</li>
                    </ul>
                  </div>
                </>
              ) : (
                <div className="settings-list-item no-hover">
                  <span className="item-label" style={{color: '#ef4444'}}>NPU 정보를 불러올 수 없습니다.</span>
                </div>
              )}
            </div>
          </section>
        );
      case 'info':
        return (
          <section className="settings-group animate-in">
            <button className="back-link" onClick={() => setActiveSection('main')}><ChevronLeft size={16} /> 뒤로가기</button>
            <h3 className="group-title">애플리케이션 정보</h3>
            <div className="settings-list">
              <SettingsItem icon={HelpCircle} gradient="from-blue-400 to-indigo-400" label="도움말 센터" value="지원 요청" onClick={() => setActiveSection('support')} />
              <SettingsItem icon={FileText} gradient="from-slate-400 to-zinc-500" label="서비스 이용약관" onClick={() => setActiveSection('terms')} />
              <SettingsItem icon={ShieldCheck} gradient="from-blue-400 to-cyan-500" label="개인정보처리방침" onClick={() => setActiveSection('privacy')} />
              <SettingsItem icon={Building2} gradient="from-indigo-400 to-blue-500" label="회사 정보" onClick={() => setActiveSection('company')} />
              <div className="settings-list-item no-hover">
                <div className="item-left">
                  <div className="item-icon-container">
                    <GlassmorphicIcon Icon={Info} gradient="from-purple-400 to-pink-400" size={32} />
                  </div>
                  <span className="item-label">버전</span>
                </div>
                <span className="item-value">v1.4.0 (Stable)</span>
              </div>
            </div>
          </section>
        );
      case 'support':
        return (
          <section className="settings-group animate-in" style={{textAlign: 'center', padding: '1rem'}}>
            <button className="back-link" onClick={() => setActiveSection('info')} style={{textAlign: 'left', display: 'block', width: '100%', marginBottom: '1.5rem'}}><ChevronLeft size={16} /> 뒤로가기</button>
            <div className="support-info-container">
              <img src="/lars-ci.png" alt="LARS CI" style={{width: '180px', marginBottom: '1.5rem', borderRadius: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)'}} />
              <h3 style={{color: '#fff', fontSize: '1.4rem', fontWeight: 800, marginBottom: '1rem'}}>LARS 기술 지원 센터</h3>
              <p style={{color: 'var(--text-dim)', fontSize: '0.9rem', marginBottom: '2rem', lineHeight: '1.6'}}>문제가 발생하거나 기술 지원이 필요한 경우 아래의 고유 지원 식별자를 담당자에게 전달해 주세요.</p>
              
              <div className="support-id-box" style={{background: 'rgba(255,255,255,0.04)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-color)', marginBottom: '1.5rem'}}>
                <label style={{display: 'block', fontSize: '0.7rem', fontWeight: 800, color: 'var(--accent-blue)', textTransform: 'uppercase', marginBottom: '0.8rem', letterSpacing: '0.05em'}}>System Support ID</label>
                <code style={{fontSize: '0.8rem', color: '#fff', wordBreak: 'break-all', fontFamily: 'Fira Code, monospace', lineHeight: '1.5'}}>
                  lars @Library/Containers/com.microsoft.Excel/Data/Library/Application Support/Microsoft/Office/CLP/import.meta.env.VITE_CONTACT_EMAIL ?? ""541e93-f2fb-40c1-9185-ee1f47490d9d_ADAL.gz
                </code>
              </div>
              
              <button 
                className="mini-btn btn-download" 
                style={{margin: '0 auto', padding: '0.8rem 2rem'}}
                onClick={() => {
                  navigator.clipboard.writeText('lars @Library/Containers/com.microsoft.Excel/Data/Library/Application Support/Microsoft/Office/CLP/lars@lars-technologies.com541e93-f2fb-40c1-9185-ee1f47490d9d_ADAL.gz');
                  alert('지원 ID가 클립보드에 복사되었습니다.');
                }}
              >
                지원 ID 복사하기
              </button>
            </div>
          </section>
        );
      case 'privacy':
        return (
          <section className="settings-group animate-in">
            <button className="back-link" onClick={() => setActiveSection('info')}><ChevronLeft size={16} /> 뒤로가기</button>
            <h3 className="group-title">개인정보처리방침</h3>
            <div className="legal-text-container" style={{background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '16px', color: 'var(--text-dim)', fontSize: '0.9rem', lineHeight: '1.6', maxHeight: '50vh', overflowY: 'auto'}}>
              <pre style={{whiteSpace: 'pre-wrap', fontFamily: 'inherit'}}>{PRIVACY_POLICY}</pre>
            </div>
          </section>
        );
      case 'terms':
        return (
          <section className="settings-group animate-in">
            <button className="back-link" onClick={() => setActiveSection('info')}><ChevronLeft size={16} /> 뒤로가기</button>
            <h3 className="group-title">서비스 이용약관</h3>
            <div className="legal-text-container" style={{background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '16px', color: 'var(--text-dim)', fontSize: '0.9rem', lineHeight: '1.6', maxHeight: '50vh', overflowY: 'auto'}}>
              <pre style={{whiteSpace: 'pre-wrap', fontFamily: 'inherit'}}>{TERMS_OF_SERVICE}</pre>
            </div>
          </section>
        );
      case 'company':
        return (
          <section className="settings-group animate-in">
            <button className="back-link" onClick={() => setActiveSection('info')}><ChevronLeft size={16} /> 뒤로가기</button>
            <h3 className="group-title">회사 정보</h3>
            <div className="legal-text-container" style={{background: 'rgba(255,255,255,0.03)', padding: '2rem', borderRadius: '16px', color: 'var(--text-dim)', fontSize: '0.95rem', lineHeight: '1.8'}}>
              <div style={{marginBottom: '1.5rem'}}>
                <h4 style={{color: '#fff', fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem'}}>회사 개요</h4>
                <div style={{display: 'grid', gridTemplateColumns: '140px 1fr', gap: '0.8rem'}}>
                  <span style={{color: 'var(--accent-blue)', fontWeight: 500}}>상호명:</span>
                  <span>엘에이알에스(LARS Inc.)</span>

                  <span style={{color: 'var(--accent-blue)', fontWeight: 500}}>대표자:</span>
                  <span>남종수</span>

                  <span style={{color: 'var(--accent-blue)', fontWeight: 500}}>사업자등록번호:</span>
                  <span>373-35-01874</span>

                  <span style={{color: 'var(--accent-blue)', fontWeight: 500}}>통신판매업신고:</span>
                  <span>2025-서울서초-3944</span>
                </div>
              </div>

              <div style={{marginBottom: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)'}}>
                <h4 style={{color: '#fff', fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem'}}>연락처</h4>
                <div style={{display: 'grid', gridTemplateColumns: '140px 1fr', gap: '0.8rem'}}>
                  <span style={{color: 'var(--accent-blue)', fontWeight: 500}}>고객센터:</span>
                  <span><a href={`mailto:${import.meta.env.VITE_CONTACT_EMAIL || 'lars@lars-technologies.com'}`} style={{color: 'var(--accent-blue)', textDecoration: 'none', cursor: 'pointer'}}>{import.meta.env.VITE_CONTACT_EMAIL || 'lars@lars-technologies.com'}</a></span>

                  <span style={{color: 'var(--accent-blue)', fontWeight: 500}}>운영시간:</span>
                  <span>평일 10:00 ~ 18:00 (토·일·공휴일 휴무)</span>
                </div>
              </div>

              <div style={{paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)'}}>
                <h4 style={{color: '#fff', fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem'}}>본사 주소</h4>
                <div style={{display: 'grid', gridTemplateColumns: '140px 1fr', gap: '0.8rem'}}>
                  <span style={{color: 'var(--accent-blue)', fontWeight: 500}}>주소:</span>
                  <span>서울시 마포구 월드컵북로350, 401호</span>
                </div>
              </div>
            </div>
          </section>
        );
      case 'api':
        return (
          <div style={{overflowY: 'auto', height: 'calc(100vh - 120px)', paddingRight: '1rem', paddingBottom: '4rem'}}>
            <ApiSettingsPanel onBack={() => setActiveSection('main')} />
          </div>
        );
      case 'usage': {
        const totals = usageData?.totals || {};
        const fmt = (n: number) => Number(n || 0).toLocaleString('ko-KR');
        const costText = (entry: any) => {
          if (entry.unpriced_requests && entry.unpriced_requests === entry.requests) return '단가 미설정';
          const note = entry.unpriced_requests ? ` (단가 미설정 ${entry.unpriced_requests}건 제외)` : '';
          return `${Number(entry.estimated_cost || 0).toFixed(4)}${note}`;
        };
        const rowsOf = (bucket: any) => Object.entries(bucket || {}) as [string, any][];
        const FEATURE_LABEL: Record<string, string> = {
          chat: '채팅', 'chat-tool': '채팅 도구', ai: 'AI 도구', generation: '문서·이미지 생성', presentation: '발표 자료',
          browser: '브라우저 작업', skill: '스킬 생성', llm: '기타 작업', routed: '기타 작업', agent: '에이전트 작업',
        };
        const cell: React.CSSProperties = { padding: '0.5rem 0.75rem', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: '0.85rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums' };
        const nameCell: React.CSSProperties = { ...cell, textAlign: 'left' };
        const totalTokens = Number(totals.input_tokens || 0) + Number(totals.output_tokens || 0);
        const meter = (label: string, sub: string, used: number, limit: number | undefined, share?: number) => {
          const hasLimit = !!limit && limit > 0;
          const pct = hasLimit ? Math.min(100, (used / (limit as number)) * 100) : (share ?? 0);
          return (
            <div key={label} style={{display: 'grid', gridTemplateColumns: '150px 1fr 110px', gap: '1rem', alignItems: 'center', padding: '0.9rem 0', borderBottom: '1px solid rgba(255,255,255,0.06)'}}>
              <div>
                <div style={{fontSize: '0.9rem', color: '#f1f5f9', fontWeight: 600}}>{label}</div>
                <div style={{fontSize: '0.75rem', color: 'rgba(224,224,224,0.55)', marginTop: '0.2rem'}}>{sub}</div>
              </div>
              <div style={{height: '8px', borderRadius: '999px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden'}}>
                <div style={{width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', borderRadius: '999px', transition: 'width 0.3s'}} />
              </div>
              <div style={{textAlign: 'right', fontSize: '0.85rem', color: '#e5e7eb'}}>
                {hasLimit ? `${pct.toFixed(0)}% 사용됨` : `${fmt(used)} 토큰 사용 · 한도 미설정`}
              </div>
            </div>
          );
        };
        const monthEnd = new Date(); monthEnd.setMonth(monthEnd.getMonth() + 1, 1); monthEnd.setHours(0, 0, 0, 0);
        const limits = usageData?.limits || {};
        const sessionTotals = usageData?.session?.totals || {};
        const sessionTokens = Number(sessionTotals.input_tokens || 0) + Number(sessionTotals.output_tokens || 0);
        const weekTotals = usageData?.week || {};
        const weekTokens = Number(weekTotals.input_tokens || 0) + Number(weekTotals.output_tokens || 0);
        return (
          <div style={{overflowY: 'auto', height: 'calc(100vh - 120px)', paddingRight: '1rem', paddingBottom: '4rem'}}>
            <button className="back-link" onClick={() => setActiveSection('main')} style={{marginBottom: '1rem', paddingLeft: '1rem'}}><ChevronLeft size={16} /> 뒤로가기</button>
            <section className="settings-group animate-in">
              <h3 className="group-title">사용량</h3>
              {usageData && (
                <div style={{fontSize: '0.8rem', color: 'rgba(224,224,224,0.6)', marginBottom: '1rem'}}>
                  집계 기간: {new Date(usageData.period_start).toLocaleDateString('ko-KR')} ~ {new Date(usageData.period_end).toLocaleString('ko-KR')} (이번 달 1일부터)
                </div>
              )}
              {usageError && <div style={{color: '#ff6b9d', fontSize: '0.85rem', marginBottom: '1rem'}}>{usageError}</div>}
              {usageLoading && <div style={{fontSize: '0.85rem', color: 'rgba(224,224,224,0.6)'}}>불러오는 중...</div>}
              {usageData && (
                <>
                  <div style={{marginBottom: '1.25rem', padding: '0.25rem 1rem', borderRadius: '12px', border: '1px solid var(--border-color)'}}>
                    {meter('현재 세션', `${usageData.session?.start ? new Date(usageData.session.start).toLocaleString('ko-KR') : ''}부터 · 앱 재시작 시 초기화`, sessionTokens, limits.session_tokens)}
                    {meter('이번 주', '최근 7일 누적 사용량', weekTokens, limits.weekly_tokens)}
                    {meter('이번 달', `${monthEnd.toLocaleDateString('ko-KR')} 0:00에 초기화`, totalTokens, limits.monthly_tokens)}
                    <div style={{fontSize: '0.75rem', color: 'rgba(224,224,224,0.5)', padding: '0.6rem 0'}}>
                      한도는 계정 정책에 따라 설정되며, 설정된 경우 사용률(%)로 표시됩니다.
                    </div>
                  </div>
                  <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.25rem'}}>
                    {[
                      ['요청 수', fmt(totals.requests)],
                      ['입력 토큰', fmt(totals.input_tokens)],
                      ['출력 토큰', fmt(totals.output_tokens)],
                      ['추정 비용', totals.unpriced_requests ? `${Number(totals.estimated_cost || 0).toFixed(4)} + 단가 미설정 ${totals.unpriced_requests}건` : Number(totals.estimated_cost || 0).toFixed(4)],
                    ].map(([label, value]) => (
                      <div key={label} style={{padding: '0.9rem', borderRadius: '10px', border: '1px solid var(--border-color)'}}>
                        <div style={{fontSize: '0.75rem', color: 'rgba(224,224,224,0.6)'}}>{label}</div>
                        <div style={{fontSize: '1.15rem', fontWeight: 700, color: '#fff', marginTop: '0.25rem'}}>{value}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{fontSize: '0.85rem', fontWeight: 700, color: '#e5e7eb', marginBottom: '0.5rem'}}>LARS 모델별</div>
                  <table style={{width: '100%', borderCollapse: 'collapse', marginBottom: '1.25rem'}}>
                    <thead><tr><th style={nameCell}>모델</th><th style={cell}>요청</th><th style={cell}>입력</th><th style={cell}>출력</th><th style={{...cell, textAlign: 'right'}}>추정 비용</th></tr></thead>
                    <tbody>
                      {rowsOf(usageData.by_model).length === 0 && <tr><td style={nameCell} colSpan={5}>이번 달 기록이 없습니다.</td></tr>}
                      {rowsOf(usageData.by_model).map(([name, entry]) => (
                        <tr key={name}><td style={nameCell}>{name}</td><td style={cell}>{fmt(entry.requests)}</td><td style={cell}>{fmt(entry.input_tokens)}</td><td style={cell}>{fmt(entry.output_tokens)}</td><td style={cell}>{costText(entry)}</td></tr>
                      ))}
                    </tbody>
                  </table>

                  <div style={{fontSize: '0.85rem', fontWeight: 700, color: '#e5e7eb', marginBottom: '0.5rem'}}>기능별</div>
                  <table style={{width: '100%', borderCollapse: 'collapse', marginBottom: '1.25rem'}}>
                    <thead><tr><th style={nameCell}>기능</th><th style={cell}>요청</th><th style={cell}>입력</th><th style={cell}>출력</th></tr></thead>
                    <tbody>
                      {rowsOf(usageData.by_feature).length === 0 && <tr><td style={nameCell} colSpan={4}>이번 달 기록이 없습니다.</td></tr>}
                      {rowsOf(usageData.by_feature).map(([name, entry]) => (
                        <tr key={name}><td style={nameCell}>{FEATURE_LABEL[name] || '기타 작업'}</td><td style={cell}>{fmt(entry.requests)}</td><td style={cell}>{fmt(entry.input_tokens)}</td><td style={cell}>{fmt(entry.output_tokens)}</td></tr>
                      ))}
                    </tbody>
                  </table>

                </>
              )}
              <div style={{display: 'flex', gap: '0.5rem', marginTop: '1rem'}}>
                <button className="back-link" onClick={loadUsage} disabled={usageLoading}><RefreshCw size={14} /> 새로고침</button>
                <button className="back-link" onClick={() => setActiveSection('pricing')}><CreditCard size={14} /> 구독 및 결제 보기</button>
              </div>
            </section>
          </div>
        );
      }
      case 'pricing':
        return (
          <div style={{overflowY: 'auto', height: 'calc(100vh - 120px)', paddingRight: '1rem', paddingBottom: '4rem'}}>
            <button className="back-link" onClick={() => setActiveSection('main')} style={{marginBottom: '1rem', paddingLeft: '1rem'}}><ChevronLeft size={16} /> 뒤로가기</button>
            <Pricing
              isEmbedded={false}
              language={config.language}
              paymentMethod="auto"
              onUpgrade={(tier: string, cycle: 'monthly' | 'yearly') => {
                setSelectedPlan({ tier, cycle });
                setActiveSection('payment');
              }}
            />
          </div>
        );
      case 'payment':
        return (
          <div style={{overflowY: 'auto', height: '100%'}}>
            <section className="settings-group animate-in">
              <button className="back-link" onClick={() => setActiveSection('pricing')}><ChevronLeft size={16} /> 뒤로가기</button>
              <Payment
                isEmbedded={true}
                tier={selectedPlan.tier}
                billingCycle={selectedPlan.cycle}
                language={config.language}
                onSuccess={() => setActiveSection('main')}
                onCancel={() => setActiveSection('pricing')}
              />
            </section>
          </div>
        );
      case 'prism-features':
        return (
          <section className="settings-group animate-in">
            <button className="back-link" onClick={() => setActiveSection('main')}><ChevronLeft size={16} /> 뒤로가기</button>
            <h3 className="group-title">Prism 기능 설정</h3>
            <div className="settings-list">
              <SettingsItem icon={Sparkles} gradient="from-blue-400 to-indigo-500" label="온보딩 플로우" onClick={() => setActiveSection('prism-onboarding')} showArrow={true} />
              <SettingsItem icon={Zap} gradient="from-yellow-400 to-orange-500" label="빠른 시작 가이드" onClick={() => setActiveSection('prism-quickstart')} showArrow={true} />
              <SettingsItem icon={Sparkles} gradient="from-violet-400 to-purple-600" label="스킬 (Skills)" onClick={() => setActiveSection('prism-skills')} />
              <SettingsItem icon={Puzzle} gradient="from-fuchsia-400 to-pink-500" label="플러그인 (Plugins)" onClick={() => setActiveSection('prism-plugins')} />
              <SettingsItem icon={Cloud} gradient="from-cyan-400 to-blue-500" label="클라우드 배포" onClick={() => setActiveSection('prism-deployment')} showArrow={true} />
              <SettingsItem icon={Package} gradient="from-purple-400 to-pink-500" label="에코시스템" onClick={() => setActiveSection('prism-ecosystem')} showArrow={true} />
              <SettingsItem icon={BarChart3} gradient="from-emerald-400 to-teal-500" label="통계 분석" onClick={() => setActiveSection('prism-statistics')} showArrow={true} />
              <SettingsItem icon={LayoutGrid} gradient="from-orange-400 to-red-500" label="대시보드" onClick={() => setActiveSection('prism-dashboards')} showArrow={true} />
              <SettingsItem icon={Monitor} gradient="from-indigo-400 to-purple-500" label="UI/UX 설정" onClick={() => setActiveSection('prism-ui')} showArrow={true} />
            </div>
          </section>
        );
      case 'prism-skills':
        return (
          <div style={{overflowY: 'auto', height: 'calc(100vh - 120px)', paddingRight: '1rem', paddingBottom: '4rem'}}>
            <button className="back-link" onClick={() => setActiveSection('prism-features')} style={{marginBottom: '1rem', paddingLeft: '1rem'}}><ChevronLeft size={16} /> 뒤로가기</button>
            <SkillsPanel />
          </div>
        );
      case 'prism-plugins':
        return (
          <div style={{overflowY: 'auto', height: 'calc(100vh - 120px)', paddingRight: '1rem', paddingBottom: '4rem'}}>
            <button className="back-link" onClick={() => setActiveSection('prism-features')} style={{marginBottom: '1rem', paddingLeft: '1rem'}}><ChevronLeft size={16} /> 뒤로가기</button>
            <PluginsPanel />
          </div>
        );
      case 'prism-onboarding':
        return (
          <section className="settings-group animate-in">
            <button className="back-link" onClick={() => setActiveSection('prism-features')}><ChevronLeft size={16} /> 뒤로가기</button>
            <h3 className="group-title">온보딩 플로우 설정</h3>
            <div className="settings-list">
              <div className="settings-list-item no-hover">
                <div className="item-info-col">
                  <span className="item-label">온보딩 활성화</span>
                  <span className="item-desc">새로운 사용자를 위한 단계별 가이드를 표시합니다</span>
                </div>
                <input
                  type="checkbox"
                  className="ios-switch"
                  defaultChecked={!localStorage.getItem('onboarding_completed')}
                  onChange={(e) => {
                    if (e.target.checked) {
                      localStorage.removeItem('onboarding_completed');
                    } else {
                      localStorage.setItem('onboarding_completed', '1');
                    }
                  }}
                />
              </div>
              <div className="settings-list-item no-hover">
                <div className="item-info-col">
                  <span className="item-label">시작 시 자동 표시</span>
                  <span className="item-desc">앱 실행 시 온보딩을 자동으로 표시합니다</span>
                </div>
                <input type="checkbox" className="ios-switch" defaultChecked={true} />
              </div>
              <div className="settings-list-item no-hover">
                <span className="item-label">온보딩 진행률</span>
                <input type="text" className="inline-input" value="6 / 6 단계" disabled />
              </div>
            </div>
          </section>
        );
      case 'prism-quickstart':
        return (
          <section className="settings-group animate-in">
            <button className="back-link" onClick={() => setActiveSection('prism-features')}><ChevronLeft size={16} /> 뒤로가기</button>
            <h3 className="group-title">빠른 시작 가이드 설정</h3>
            <div className="settings-list">
              <div className="settings-list-item no-hover">
                <div className="item-info-col">
                  <span className="item-label">빠른 시작 활성화</span>
                  <span className="item-desc">Quick Start 가이드 메뉴를 표시합니다</span>
                </div>
                <input type="checkbox" className="ios-switch" defaultChecked={true} />
              </div>
              <div className="settings-list-item no-hover">
                <div className="item-info-col">
                  <span className="item-label">팁 표시</span>
                  <span className="item-desc">각 카드에 유용한 팁을 표시합니다</span>
                </div>
                <input type="checkbox" className="ios-switch" defaultChecked={true} />
              </div>
              <div className="settings-list-item no-hover">
                <span className="item-label">즐겨찾기 가이드</span>
                <select className="inline-select" defaultValue="all">
                  <option value="all">모두 표시</option>
                  <option value="ocr">OCR</option>
                  <option value="scraping">Web Scraping</option>
                  <option value="statistics">통계 분석</option>
                  <option value="workflow">워크플로우</option>
                  <option value="deployment">배포</option>
                  <option value="ecosystem">에코시스템</option>
                </select>
              </div>
            </div>
          </section>
        );
      case 'prism-deployment':
        return (
          <section className="settings-group animate-in">
            <button className="back-link" onClick={() => setActiveSection('prism-features')}><ChevronLeft size={16} /> 뒤로가기</button>
            <h3 className="group-title">클라우드 배포 설정</h3>
            <div className="settings-list">
              <div className="settings-list-item no-hover">
                <span className="item-label">기본 클라우드 제공자</span>
                <select className="inline-select" defaultValue="aws">
                  <option value="aws">AWS</option>
                  <option value="azure">Microsoft Azure</option>
                  <option value="gcp">Google Cloud</option>
                  <option value="digitalocean">DigitalOcean</option>
                  <option value="heroku">Heroku</option>
                  <option value="vercel">Vercel</option>
                </select>
              </div>
              <div className="settings-list-item no-hover">
                <div className="item-info-col">
                  <span className="item-label">자동 자격증명 저장</span>
                  <span className="item-desc">배포 시 인증정보를 로컬에 저장합니다</span>
                </div>
                <input type="checkbox" className="ios-switch" defaultChecked={true} />
              </div>
              <div className="settings-list-item no-hover">
                <div className="item-info-col">
                  <span className="item-label">배포 완료 알림</span>
                  <span className="item-desc">배포가 완료될 때 알림을 표시합니다</span>
                </div>
                <input type="checkbox" className="ios-switch" defaultChecked={true} />
              </div>
              <div className="settings-list-item no-hover">
                <span className="item-label">배포 히스토리 보관 수</span>
                <input type="number" className="inline-input" defaultValue="10" min="1" max="500" />
              </div>
            </div>
          </section>
        );
      case 'prism-ecosystem':
        return (
          <section className="settings-group animate-in">
            <button className="back-link" onClick={() => setActiveSection('prism-features')}><ChevronLeft size={16} /> 뒤로가기</button>
            <h3 className="group-title">에코시스템 설정</h3>
            <div className="settings-list">
              <div className="settings-list-item no-hover">
                <div className="item-info-col">
                  <span className="item-label">자동 업데이트</span>
                  <span className="item-desc">설치된 에이전트를 자동으로 업데이트합니다</span>
                </div>
                <input type="checkbox" className="ios-switch" defaultChecked={true} />
              </div>
              <div className="settings-list-item no-hover">
                <span className="item-label">최대 활성 에이전트 수</span>
                <input type="number" className="inline-input" defaultValue="5" min="1" max="20" />
              </div>
              <div className="settings-list-item no-hover">
                <div className="item-info-col">
                  <span className="item-label">에이전트 충돌 감지</span>
                  <span className="item-desc">호환되지 않는 에이전트 조합을 경고합니다</span>
                </div>
                <input type="checkbox" className="ios-switch" defaultChecked={true} />
              </div>
            </div>
          </section>
        );
      case 'prism-statistics':
        return (
          <section className="settings-group animate-in">
            <button className="back-link" onClick={() => setActiveSection('prism-features')}><ChevronLeft size={16} /> 뒤로가기</button>
            <h3 className="group-title">통계 분석 설정</h3>
            <div className="settings-list">
              <div className="settings-list-item no-hover">
                <div className="item-info-col">
                  <span className="item-label">자동 분석</span>
                  <span className="item-desc">데이터 업로드 시 자동으로 분석을 수행합니다</span>
                </div>
                <input type="checkbox" className="ios-switch" defaultChecked={true} />
              </div>
              <div className="settings-list-item no-hover">
                <span className="item-label">기본 차트 타입</span>
                <select className="inline-select" defaultValue="line">
                  <option value="line">선형 차트</option>
                  <option value="bar">막대 차트</option>
                  <option value="pie">파이 차트</option>
                  <option value="scatter">산점도</option>
                  <option value="histogram">히스토그램</option>
                </select>
              </div>
              <div className="settings-list-item no-hover">
                <span className="item-label">내보내기 형식</span>
                <select className="inline-select" defaultValue="json">
                  <option value="json">JSON</option>
                  <option value="csv">CSV</option>
                  <option value="excel">Excel</option>
                  <option value="pdf">PDF</option>
                </select>
              </div>
              <div className="settings-list-item no-hover">
                <span className="item-label">데이터 보관 기간 (일)</span>
                <input type="number" className="inline-input" defaultValue="90" min="30" max="365" />
              </div>
            </div>
          </section>
        );
      case 'prism-dashboards':
        return (
          <section className="settings-group animate-in">
            <button className="back-link" onClick={() => setActiveSection('prism-features')}><ChevronLeft size={16} /> 뒤로가기</button>
            <h3 className="group-title">대시보드 설정</h3>
            <div className="settings-list">
              <div className="settings-list-item no-hover">
                <span className="item-label">기본 레이아웃</span>
                <select className="inline-select" defaultValue="grid">
                  <option value="grid">그리드 레이아웃</option>
                  <option value="list">리스트 레이아웃</option>
                  <option value="compact">컴팩트 레이아웃</option>
                </select>
              </div>
              <div className="settings-list-item no-hover">
                <div className="item-info-col">
                  <span className="item-label">알림 활성화</span>
                  <span className="item-desc">대시보드에서 알림 배너를 표시합니다</span>
                </div>
                <input type="checkbox" className="ios-switch" defaultChecked={true} />
              </div>
              <div className="settings-list-item no-hover">
                <span className="item-label">새로고침 간격 (초)</span>
                <input type="number" className="inline-input" defaultValue="30" min="1" max="60" />
              </div>
              <div className="settings-list-item no-hover">
                <div className="item-info-col">
                  <span className="item-label">결과 캐싱</span>
                  <span className="item-desc">대시보드 결과를 캐시하여 성능을 개선합니다</span>
                </div>
                <input type="checkbox" className="ios-switch" defaultChecked={true} />
              </div>
            </div>
          </section>
        );
      case 'import-export':
        return (
          <section className="settings-group animate-in">
            <button className="back-link" onClick={() => setActiveSection('main')}><ChevronLeft size={16} /> 뒤로가기</button>
            <h3 className="group-title">설정 불러오기 & 내보내기</h3>
            <ImportExport
              onImport={(data) => {
                setConfig(prev => ({ ...prev, ...data }));
                alert('✅ 설정이 성공적으로 불러워졌습니다!');
              }}
              onExport={() => ({
                modelType: config.modelType,
                temperature: config.temperature,
                // 키는 내보내기 파일에 넣지 않는다 (외부 에이전트 키는 서버 금고에 암호화되어 있다)
                settings: {
                  theme: config.theme,
                  language: config.language,
                  encryptionEnabled: config.encryptionEnabled,
                  enableTokenOptimization: config.enableTokenOptimization,
                  enableMemory: config.enableMemory,
                  enableNotifications: config.enableNotifications
                },
                exportedAt: new Date().toISOString(),
                version: '1.4.0'
              })}
            />
          </section>
        );
      case 'prism-ui':
        return (
          <section className="settings-group animate-in">
            <button className="back-link" onClick={() => setActiveSection('prism-features')}><ChevronLeft size={16} /> 뒤로가기</button>
            <h3 className="group-title">UI/UX 설정</h3>
            <div className="settings-list">
              <div className="settings-list-item no-hover">
                <div className="item-info-col">
                  <span className="item-label">다크 모드</span>
                  <span className="item-desc">어두운 테마를 사용합니다</span>
                </div>
                <input type="checkbox" className="ios-switch" defaultChecked={true} />
              </div>
              <div className="settings-list-item no-hover">
                <div className="item-info-col">
                  <span className="item-label">컴팩트 모드</span>
                  <span className="item-desc">더 많은 정보를 한 화면에 표시합니다</span>
                </div>
                <input type="checkbox" className="ios-switch" defaultChecked={false} />
              </div>
              <div className="settings-list-item no-hover">
                <div className="item-info-col">
                  <span className="item-label">애니메이션 활성화</span>
                  <span className="item-desc">UI 전환 시 부드러운 애니메이션을 표시합니다</span>
                </div>
                <input type="checkbox" className="ios-switch" defaultChecked={true} />
              </div>
              <div className="settings-list-item no-hover">
                <span className="item-label">글꼴 크기</span>
                <select className="inline-select" defaultValue="medium">
                  <option value="small">작음</option>
                  <option value="medium">중간</option>
                  <option value="large">큼</option>
                </select>
              </div>
            </div>
          </section>
        );
      case 'prism':
        return (
          <div style={{overflowY: 'auto', height: '100%', display: 'flex', flexDirection: 'column', gap: '1rem'}}>
            <button className="back-link" onClick={() => setActiveSection('main')} style={{marginBottom: '1rem'}}><ChevronLeft size={16} /> 뒤로가기</button>

            <section className="settings-group animate-in">
              <h3 className="group-title">Prism 3계층 아키텍처 통계</h3>
              <p style={{fontSize: '0.9rem', color: '#9ba1b0', marginBottom: '1rem'}}>실시간 데이터 스토리지, 컴퓨팅 리소스, 서비스 메트릭스</p>

              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem'}}>
                <div style={{background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '8px', padding: '1rem'}}>
                  <div style={{fontSize: '0.8rem', color: '#9ba1b0', marginBottom: '0.5rem'}}>사용자 ID</div>
                  <div style={{fontSize: '0.85rem', color: '#60a5fa', fontFamily: 'monospace', wordBreak: 'break-all'}}>{userId}</div>
                </div>
                <div style={{background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '8px', padding: '1rem'}}>
                  <div style={{fontSize: '0.8rem', color: '#9ba1b0', marginBottom: '0.5rem'}}>상태</div>
                  <div style={{fontSize: '0.85rem', color: '#22c55e', fontWeight: 600}}>✓ 활성</div>
                </div>
              </div>

              <div style={{background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.1)'}}>
                <h4 style={{color: '#fff', fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}><Cog size={20} style={{color: '#60a5fa'}} /> 통계 수집 설정</h4>
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                  <div className="settings-list-item no-hover">
                    <div className="item-info-col">
                      <span className="item-label">자동 수집 활성화</span>
                      <span className="item-desc">백그라운드에서 자동으로 통계를 수집합니다</span>
                    </div>
                    <input type="checkbox" className="ios-switch" defaultChecked={true} />
                  </div>
                  <div className="settings-list-item no-hover">
                    <div className="item-info-col">
                      <span className="item-label">실시간 모니터링</span>
                      <span className="item-desc">실시간으로 메트릭을 추적합니다</span>
                    </div>
                    <input type="checkbox" className="ios-switch" defaultChecked={true} />
                  </div>
                </div>
              </div>

              <div style={{background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.1)'}}>
                <h4 style={{color: '#fff', fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}><RefreshCw size={20} style={{color: '#fbbf24'}} /> 수집 주기 설정</h4>
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                  <div className="settings-list-item no-hover">
                    <span className="item-label">수집 간격 (초)</span>
                    <input type="number" className="inline-input" defaultValue="60" min="10" max="600" />
                  </div>
                  <div className="settings-list-item no-hover">
                    <span className="item-label">배치 크기</span>
                    <input type="number" className="inline-input" defaultValue="100" min="10" max="1000" />
                  </div>
                </div>
              </div>

              <div style={{background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.1)'}}>
                <h4 style={{color: '#fff', fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}><HardDrive size={20} style={{color: '#10b981'}} /> 데이터 보관 정책</h4>
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                  <div className="settings-list-item no-hover">
                    <span className="item-label">보관 기간 (일)</span>
                    <input type="number" className="inline-input" defaultValue="90" min="30" max="365" />
                  </div>
                  <div className="settings-list-item no-hover">
                    <span className="item-label">최대 저장소 (GB)</span>
                    <input type="number" className="inline-input" defaultValue="10" min="1" max="100" />
                  </div>
                  <div className="settings-list-item no-hover">
                    <div className="item-info-col">
                      <span className="item-label">자동 정리</span>
                      <span className="item-desc">오래된 데이터를 자동으로 제거합니다</span>
                    </div>
                    <input type="checkbox" className="ios-switch" defaultChecked={true} />
                  </div>
                  <div className="settings-list-item no-hover">
                    <div className="item-info-col">
                      <span className="item-label">압축 활성화</span>
                      <span className="item-desc">저장된 데이터를 압축하여 용량 절약</span>
                    </div>
                    <input type="checkbox" className="ios-switch" defaultChecked={true} />
                  </div>
                </div>
              </div>

              <div style={{background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.1)'}}>
                <h4 style={{color: '#fff', fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}><Bell size={20} style={{color: '#f87171'}} /> 알림 설정</h4>
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                  <div className="settings-list-item no-hover">
                    <div className="item-info-col">
                      <span className="item-label">비정상 감지 알림</span>
                      <span className="item-desc">비정상적인 메트릭 변화를 알립니다</span>
                    </div>
                    <input type="checkbox" className="ios-switch" defaultChecked={true} />
                  </div>
                  <div className="settings-list-item no-hover">
                    <div className="item-info-col">
                      <span className="item-label">용량 부족 알림</span>
                      <span className="item-desc">저장소 용량 부족 시 알립니다</span>
                    </div>
                    <input type="checkbox" className="ios-switch" defaultChecked={true} />
                  </div>
                </div>
              </div>

              <div style={{background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.1)'}}>
                <h4 style={{color: '#fff', fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}><BarChart3 size={20} style={{color: '#06b6d4'}} /> API 및 내보내기</h4>
                <div style={{display: 'grid', gridTemplateColumns: '1fr', gap: '1rem'}}>
                  <div className="settings-list-item no-hover">
                    <span className="item-label">기본 내보내기 형식</span>
                    <select className="inline-select" defaultValue="json">
                      <option value="json">JSON</option>
                      <option value="csv">CSV</option>
                      <option value="parquet">Parquet</option>
                    </select>
                  </div>
                  <div className="settings-list-item no-hover">
                    <div className="item-info-col">
                      <span className="item-label">REST API 활성화</span>
                      <span className="item-desc">외부 시스템에서 통계에 접근할 수 있습니다</span>
                    </div>
                    <input type="checkbox" className="ios-switch" defaultChecked={false} />
                  </div>
                </div>
              </div>

              <div style={{background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.1)'}}>
                <h4 style={{color: '#fff', fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}><Target size={20} style={{color: '#8b5cf6'}} /> 필터 및 세분화</h4>
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                  <div className="settings-list-item no-hover">
                    <span className="item-label">추적할 메트릭</span>
                    <select className="inline-select" defaultValue="all">
                      <option value="all">모두</option>
                      <option value="performance">성능</option>
                      <option value="usage">사용량</option>
                      <option value="errors">에러</option>
                    </select>
                  </div>
                  <div className="settings-list-item no-hover">
                    <span className="item-label">세분화 수준</span>
                    <select className="inline-select" defaultValue="hourly">
                      <option value="minute">분 단위</option>
                      <option value="hourly">시간 단위</option>
                      <option value="daily">일 단위</option>
                      <option value="weekly">주 단위</option>
                    </select>
                  </div>
                </div>
              </div>

              <div style={{background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem', border: '1px solid rgba(255,255,255,0.1)'}}>
                <h4 style={{color: '#fff', fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}><Wrench size={20} style={{color: '#ec4899'}} /> 유지보수</h4>
                <div style={{display: 'grid', gridTemplateColumns: '1fr', gap: '0.8rem'}}>
                  <button style={{
                    padding: '0.8rem',
                    background: 'rgba(59, 130, 246, 0.2)',
                    border: '1px solid rgba(59, 130, 246, 0.5)',
                    borderRadius: '6px',
                    color: '#3b82f6',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    transition: 'all 0.3s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}>
                    <RefreshCw size={16} /> 캐시 초기화
                  </button>
                  <button style={{
                    padding: '0.8rem',
                    background: 'rgba(34, 197, 94, 0.2)',
                    border: '1px solid rgba(34, 197, 94, 0.5)',
                    borderRadius: '6px',
                    color: '#22c55e',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    transition: 'all 0.3s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}>
                    <Download size={16} /> 통계 내보내기
                  </button>
                  <button style={{
                    padding: '0.8rem',
                    background: 'rgba(168, 85, 247, 0.2)',
                    border: '1px solid rgba(168, 85, 247, 0.5)',
                    borderRadius: '6px',
                    color: '#a855f7',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    transition: 'all 0.3s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}>
                    <Trash2 size={16} /> 오래된 데이터 정리
                  </button>
                </div>
              </div>

              <button
                onClick={async () => {
                  setPrismLoading(true);
                  try {
                    const apiUrl = localStorage.getItem('apiUrl') || 'http://localhost:8001/api';

                    // 시스템 통계
                    const sysRes = await fetch(`${apiUrl}/agent/prism/stats`);
                    if (sysRes.ok) setPrismStats(await sysRes.json());

                    // 사용자 통계
                    const userRes = await fetch(`${apiUrl}/agent/prism/stats/user/${userId}`);
                    if (userRes.ok) setPrismUserStats(await userRes.json());
                  } catch (err) {
                    console.error('Prism 통계 로드 실패:', err);
                  } finally {
                    setPrismLoading(false);
                  }
                }}
                style={{
                  background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                  color: '#fff',
                  border: 'none',
                  padding: '0.8rem 1.2rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  transition: 'all 0.2s'
                }}
                disabled={prismLoading}
              >
                {prismLoading ? '로딩 중...' : '통계 새로고침'}
              </button>
            </section>

            {prismStats && (
              <section className="settings-group animate-in">
                <h4 style={{color: '#fff', fontSize: '1rem', fontWeight: 600, marginBottom: '1rem'}}>📊 시스템 통계</h4>
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                  <div style={{background: 'rgba(15, 23, 42, 0.5)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '8px', padding: '1rem'}}>
                    <div style={{fontSize: '0.8rem', color: '#9ba1b0', marginBottom: '0.3rem'}}>총 사용자</div>
                    <div style={{fontSize: '1.8rem', color: '#60a5fa', fontWeight: 700}}>{prismStats.services?.total_users || 0}</div>
                  </div>
                  <div style={{background: 'rgba(15, 23, 42, 0.5)', border: '1px solid rgba(34, 197, 94, 0.2)', borderRadius: '8px', padding: '1rem'}}>
                    <div style={{fontSize: '0.8rem', color: '#9ba1b0', marginBottom: '0.3rem'}}>총 쿼리</div>
                    <div style={{fontSize: '1.8rem', color: '#22c55e', fontWeight: 700}}>{prismStats.services?.total_queries || 0}</div>
                  </div>
                  <div style={{background: 'rgba(15, 23, 42, 0.5)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '8px', padding: '1rem'}}>
                    <div style={{fontSize: '0.8rem', color: '#9ba1b0', marginBottom: '0.3rem'}}>평균 실행시간</div>
                    <div style={{fontSize: '1.8rem', color: '#f59e0b', fontWeight: 700}}>{(prismStats.services?.avg_execution_time || 0).toFixed(2)}s</div>
                  </div>
                  <div style={{background: 'rgba(15, 23, 42, 0.5)', border: '1px solid rgba(168, 85, 247, 0.2)', borderRadius: '8px', padding: '1rem'}}>
                    <div style={{fontSize: '0.8rem', color: '#9ba1b0', marginBottom: '0.3rem'}}>저장소 크기</div>
                    <div style={{fontSize: '1.8rem', color: '#a855f7', fontWeight: 700}}>{((prismStats.storage?.total_size || 0) / 1024 / 1024).toFixed(1)} MB</div>
                  </div>
                </div>
              </section>
            )}

            {/* PrismMonitor 통합 */}
            <section className="settings-group animate-in">
              <PrismMonitor
                userId={userId}
                apiUrl={localStorage.getItem('apiUrl') || 'http://localhost:8001/api'}
              />
            </section>

            {prismUserStats && (
              <section className="settings-group animate-in">
                <h4 style={{color: '#fff', fontSize: '1rem', fontWeight: 600, marginBottom: '1rem'}}>👤 개인 통계</h4>
                <div style={{display: 'grid', gridTemplateColumns: '1fr', gap: '0.8rem'}}>
                  {prismUserStats.query_history && prismUserStats.query_history.length > 0 ? (
                    <>
                      <div style={{fontSize: '0.9rem', color: '#cbd5e1'}}>
                        <strong>최근 쿼리:</strong> {prismUserStats.query_history[0]?.created_at?.split('T')[0]}
                      </div>
                      <div style={{fontSize: '0.9rem', color: '#cbd5e1'}}>
                        <strong>총 쿼리 수:</strong> {prismUserStats.query_history?.length || 0}개
                      </div>
                      <div style={{fontSize: '0.9rem', color: '#cbd5e1'}}>
                        <strong>평균 실행시간:</strong> {prismUserStats.query_history?.reduce((sum: number, q: any) => sum + (q.execution_time || 0), 0) / (prismUserStats.query_history?.length || 1).toFixed(2)}s
                      </div>
                    </>
                  ) : (
                    <div style={{fontSize: '0.9rem', color: '#9ba1b0'}}>아직 쿼리 기록이 없습니다.</div>
                  )}
                </div>
              </section>
            )}
          </div>
        );
      default:
        return (
          <>
            <section className="settings-group">
              <h3 className="group-title">계정 및 프로필</h3>
              <div className="settings-list">
                <SettingsItem icon={User} gradient="from-blue-400 to-indigo-400" label="프로필 정보" value={config.userName} onClick={() => setActiveSection('account')} />
                <SettingsItem icon={CreditCard} gradient="from-emerald-400 to-teal-500" label="사용량" value="확인" onClick={() => setActiveSection('usage')} />
                <SettingsItem icon={Key} gradient="from-indigo-400 to-violet-500" label="API 설정" value="확인" onClick={() => setActiveSection('api')} />
                <SettingsItem icon={Cloud} gradient="from-amber-400 to-orange-400" label="LARS 지능형 서비스" value="Active (Pro)" onClick={() => setActiveSection('pricing')} />
                <SettingsItem icon={Thermometer} gradient="from-cyan-400 to-blue-500" label="Prism 3계층 통계" value="Real-time" onClick={() => {
                  setActiveSection('prism');
                  setPrismLoading(true);
                }} />
              </div>
            </section>

            <section className="settings-group">
              <h3 className="group-title">Prism 플랫폼 설정</h3>
              <div className="settings-list">
                <SettingsItem icon={Sparkles} gradient="from-cyan-400 to-blue-500" label="Prism 기능 설정" value="7개 기능" onClick={() => setActiveSection('prism-features')} />
              </div>
            </section>

            <section className="settings-group">
              <h3 className="group-title">설정 관리</h3>
              <div className="settings-list">
                <SettingsItem icon={Download} gradient="from-purple-400 to-pink-500" label="설정 불러오기 & 내보내기" value="다중 플랫폼" onClick={() => setActiveSection('import-export')} />
              </div>
            </section>

            <section className="settings-group">
              <h3 className="group-title">LARS 지능형 기능 설정</h3>
              <div className="settings-list">
                <SettingsItem icon={Monitor} gradient="from-indigo-500 to-purple-600" label="LARS Omni-Control (시스템 협업)" value={config.enableOmniControl ? "On" : "Off"} onClick={() => setActiveSection('apps')} />
                <SettingsItem icon={Shield} gradient="from-slate-400 to-zinc-500" label="안전 및 보안 (PII)" onClick={() => setActiveSection('security')} />
                <SettingsItem icon={Database} gradient="from-yellow-400 to-orange-400" label="데이터 제어 및 기록" onClick={() => setActiveSection('data')} />
                <SettingsItem icon={Bot} gradient="from-purple-500 to-pink-500" label="에이전트 (Agents)" value="키 · 감지" onClick={() => setActiveSection('developer')} />
                <SettingsItem icon={Zap} gradient="from-yellow-500 to-orange-500" label="하드웨어 정보 (NPU/ANE)" onClick={() => {
                  setNpuLoading(true);
                  invoke('get_npu_info')
                    .then((info: any) => {
                      setNpuInfo(info);
                      setActiveSection('hardware');
                    })
                    .catch((err) => {
                      console.error('NPU 정보 로드 실패:', err);
                      setNpuInfo({ error: err });
                      setActiveSection('hardware');
                    })
                    .finally(() => setNpuLoading(false));
                }} />
                <SettingsItem icon={Info} gradient="from-gray-400 to-gray-600" label="정보 및 법적 고지" value="v1.4.0" onClick={() => setActiveSection('info')} />
              </div>
            </section>
          </>
        );
    }
  };

  return (
    <div className="settings-standalone" onClick={(e) => { if(e.target === e.currentTarget) onClose(); }}>
      <div className="settings-window">
        <header className="settings-window-header">
          <h2 className="window-title">{SETTINGS_TEXTS[currentLanguage as keyof typeof SETTINGS_TEXTS]?.title || '설정'}</h2>
          <button className="window-close-btn" onClick={onClose}>×</button>
        </header>

        <div className="settings-window-content">
          {renderSection()}
        </div>

        <footer className="settings-window-footer">
          <SaveStatus status={saveStatus} />
          {isDirty && !saving && <span style={{ fontSize: 12, color: 'var(--text-dim)', marginRight: 4 }}>저장되지 않은 변경 사항</span>}
          <button
            className="apply-btn"
            disabled={saving || !isDirty}
            onClick={async () => {
              setSaving(true);
              try {
                await handleSave();
              } finally {
                setSaving(false);
              }
            }}
            style={{ opacity: !isDirty && !saving ? 0.55 : 1, cursor: !isDirty || saving ? 'default' : 'pointer' }}
          >
            {saving ? '저장 중...' : (SETTINGS_TEXTS[currentLanguage as keyof typeof SETTINGS_TEXTS]?.save || '설정 저장')}
          </button>
        </footer>
      </div>
    </div>
  );
}

export default Settings;
