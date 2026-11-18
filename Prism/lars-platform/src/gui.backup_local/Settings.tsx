import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { GlassmorphicIcon } from './components/GlassmorphicIcon';
import { Pricing } from './components/Pricing';
import { Payment } from './components/Payment';
import { ChangePassword } from './components/Auth/ChangePassword';
import { PRIVACY_POLICY, TERMS_OF_SERVICE } from './LegalContent';
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
  CreditCard
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
}

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

const SettingsItem = ({ icon: Icon, gradient, emoji, imgSrc, label, value, onClick, showArrow = true, danger = false }: SettingsItemProps) => (
  <div className={`settings-list-item ${onClick ? '' : 'no-hover'} ${danger ? 'danger-action' : ''}`} onClick={onClick}>
    <div className="item-left">
      {imgSrc ? (
        <img src={imgSrc} className="item-img-icon" alt={label} />
      ) : Icon && gradient ? (
        <div className="item-icon-container">
          <GlassmorphicIcon Icon={Icon} gradient={gradient} size={32} />
        </div>
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

function Settings({ onClose }: SettingsProps) {
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
    userEmail: 'import.meta.env.VITE_CONTACT_EMAIL ?? ""',
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

  const [saveStatus, setSaveStatus] = useState('');
  const [activeSection, setActiveSection] = useState<'main' | 'personal' | 'memory' | 'notifications' | 'apps' | 'data' | 'security' | 'account' | 'changePassword' | 'advanced' | 'info' | 'developer' | 'privacy' | 'terms' | 'pricing' | 'payment' | 'support' | 'hardware'>('main');
  const [selectedPlan, setSelectedPlan] = useState<{ tier: string; cycle: 'monthly' | 'yearly' }>({ tier: 'pro', cycle: 'monthly' });
  const [npuInfo, setNpuInfo] = useState<any>(null);
  const [npuLoading, setNpuLoading] = useState(false);

  useEffect(() => {
    const initConfig = async () => {
      try {
        const savedConfig = await invoke<Config>('load_config');
        setConfig(prev => ({ ...prev, ...savedConfig }));
      } catch (error) {
        console.error('설정 불러오기 실패:', error);
      }
    };
    initConfig();
  }, []);

  const handleSave = async () => {
    try {
      await invoke('save_config', { config });
      setSaveStatus('✅ 설정이 저장되었습니다.');
      setTimeout(() => setSaveStatus(''), 2000);
    } catch (error) {
      setSaveStatus(`❌ 저장 실패: ${error}`);
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
                  <span className="item-desc">AI가 macOS의 다른 애플리케이션을 직접 제어하고 협업하도록 허용합니다.</span>
                </div>
                <input type="checkbox" className="ios-switch" checked={config.enableOmniControl} onChange={(e) => setConfig({...config, enableOmniControl: e.target.checked})} />
              </div>
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
              <SettingsItem icon={Trash2} gradient="from-red-500 to-rose-600" label="모든 대화 기록 삭제" danger showArrow={false} onClick={() => confirm('모든 기록을 삭제하시겠습니까?') && alert('삭제 완료')} />
            </div>
          </section>
        );
      case 'developer':
        return (
          <section className="settings-group animate-in">
            <button className="back-link" onClick={() => setActiveSection('main')}><ChevronLeft size={16} /> 뒤로가기</button>
            <h3 className="group-title">개발자 및 전문가 설정</h3>
            <div className="settings-list">
              <div className="settings-list-item no-hover">
                <div className="item-info-col">
                  <span className="item-label">개인 API 키 사용</span>
                  <span className="item-desc">LARS Cloud 대신 본인의 API 키를 직접 사용하여 엔진을 구동합니다.</span>
                </div>
              </div>
              <div className="settings-list-item no-hover">
                <span className="item-label">OpenAI Key</span>
                <input type="password" placeholder="sk-..." className="inline-input" value={config.openaiKey} onChange={(e) => setConfig({...config, openaiKey: e.target.value})} />
              </div>
              <div className="settings-list-item no-hover">
                <span className="item-label">Anthropic Key</span>
                <input type="password" placeholder="sk-ant-..." className="inline-input" value={config.anthropicKey} onChange={(e) => setConfig({...config, anthropicKey: e.target.value})} />
              </div>
              <div className="settings-list-item no-hover">
                <span className="item-label">Kimi Key</span>
                <input type="password" placeholder="sk-..." className="inline-input" value={config.moonshotKey} onChange={(e) => setConfig({...config, moonshotKey: e.target.value})} />
              </div>
            </div>
          </section>
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
              ) : npuInfo ? (
                <>
                  <div className="settings-list-item no-hover" style={{background: 'rgba(168, 85, 247, 0.08)', padding: '1rem', borderRadius: '12px', marginBottom: '1rem', border: '1px solid rgba(168, 85, 247, 0.2)'}}>
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.9rem'}}>
                      <div>
                        <div style={{color: 'var(--text-dim)', fontSize: '0.8rem', marginBottom: '0.3rem'}}>칩 모델</div>
                        <div style={{fontWeight: 600, color: '#fff'}}>{npuInfo.chip_name}</div>
                      </div>
                      <div>
                        <div style={{color: 'var(--text-dim)', fontSize: '0.8rem', marginBottom: '0.3rem'}}>Apple Silicon</div>
                        <div style={{fontWeight: 600, color: npuInfo.is_apple_silicon ? '#10b981' : '#ef4444'}}>
                          {npuInfo.is_apple_silicon ? '✅ Yes' : '❌ No'}
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
                        <span key={backend} style={{background: 'rgba(34, 197, 94, 0.15)', padding: '0.4rem 0.8rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 600, color: '#10b981', border: '1px solid rgba(34, 197, 94, 0.3)'}}>
                          {backend === 'mlx' && '🚀 MLX'}
                          {backend === 'coremltools' && '🔧 CoreML'}
                          {backend === 'mps' && '⚡ Metal'}
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
                    <div style={{fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '0.8rem'}}>💡 권장사항</div>
                    <ul style={{listStyle: 'none', padding: 0, fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: '1.6'}}>
                      <li>✓ MLX-LM으로 로컬 추론 시 ANE 가속 활용 (프라이버시 보호)</li>
                      <li>✓ LARS-Edge 엔진으로 오프라인 사용 가능</li>
                      <li>✓ 512GB 메모리로 70B 모델도 8-bit로 로드 가능</li>
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
              <SettingsItem icon={ShieldCheck} gradient="from-emerald-400 to-teal-500" label="개인정보처리방침" onClick={() => setActiveSection('privacy')} />
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
      case 'pricing':
        return (
          <div style={{overflowY: 'auto', height: '100%'}}>
            <button className="back-link" onClick={() => setActiveSection('main')} style={{marginBottom: '1rem'}}><ChevronLeft size={16} /> 뒤로가기</button>
            <Pricing
              isEmbedded={true}
              language={config.language}
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
                onSuccess={() => setActiveSection('main')}
                onCancel={() => setActiveSection('pricing')}
              />
            </section>
          </div>
        );
      default:
        return (
          <>
            <section className="settings-group">
              <h3 className="group-title">계정 및 프로필</h3>
              <div className="settings-list">
                <SettingsItem icon={User} gradient="from-blue-400 to-indigo-400" label="프로필 정보" value={config.userName} onClick={() => setActiveSection('account')} />
                <SettingsItem icon={Cloud} gradient="from-amber-400 to-orange-400" label="LARS 지능형 서비스" value="Active (Pro)" onClick={() => setActiveSection('pricing')} />
              </div>
            </section>

            <section className="settings-group">
              <h3 className="group-title">LARS 지능형 기능 설정</h3>
              <div className="settings-list">
                <SettingsItem icon={Monitor} gradient="from-indigo-500 to-purple-600" label="LARS Omni-Control (시스템 협업)" value={config.enableOmniControl ? "On" : "Off"} onClick={() => setActiveSection('apps')} />
                <SettingsItem icon={Shield} gradient="from-slate-400 to-zinc-500" label="안전 및 보안 (PII)" onClick={() => setActiveSection('security')} />
                <SettingsItem icon={Database} gradient="from-yellow-400 to-orange-400" label="데이터 제어 및 기록" onClick={() => setActiveSection('data')} />
                <SettingsItem icon={SettingsIcon} gradient="from-gray-400 to-slate-500" label="전문가 모드 (API Keys)" onClick={() => setActiveSection('developer')} />
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
          <h2 className="window-title">설정</h2>
          <button className="window-close-btn" onClick={onClose}>×</button>
        </header>

        <div className="settings-window-content">
          {renderSection()}
        </div>

        <footer className="settings-window-footer">
          <span className="save-status-msg">{saveStatus}</span>
          <button className="apply-btn" onClick={handleSave}>설정 저장</button>
        </footer>
      </div>
    </div>
  );
}

export default Settings;
