import React, { useState, useEffect } from 'react';
import {
  Cloud, Server, Settings, CheckCircle, AlertCircle, Loader,
  Github, Key, Plus, Edit2, Trash2, ExternalLink, Copy
} from 'lucide-react';
import { GlassmorphicIcon } from './components/GlassmorphicIcon';
import DeploymentObservability from './components/DeploymentObservability';

interface CloudProvider {
  id: string;
  name: string;
  icon: string;
  description: string;
  regions: string[];
}

interface DeploymentConfig {
  id: string;
  name: string;
  provider: string;
  region: string;
  instanceType: string;
  apiKey?: string;
  secretKey?: string;
  projectPath: string;
  status: 'idle' | 'deploying' | 'deployed' | 'failed';
  lastDeployed?: string;
  url?: string;
}

interface DeploymentLog {
  timestamp: string;
  message: string;
  status: 'info' | 'success' | 'warning' | 'error';
}

const CLOUD_PROVIDERS: CloudProvider[] = [
  {
    id: 'aws',
    name: 'Amazon AWS',
    icon: '/aws-logo.jpg',
    description: 'EC2, Lightsail, ECS 지원',
    regions: ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-northeast-1', 'ap-southeast-1']
  },
  {
    id: 'azure',
    name: 'Microsoft Azure',
    icon: '/azure-logo.png',
    description: 'App Service, VMs 지원',
    regions: ['eastus', 'westus', 'northeurope', 'southeastasia']
  },
  {
    id: 'gcp',
    name: 'Google Cloud',
    icon: '/gcp-logo.png',
    description: 'Compute Engine, Cloud Run 지원',
    regions: ['us-central1', 'us-west1', 'europe-west1', 'asia-east1']
  },
  {
    id: 'digitalocean',
    name: 'DigitalOcean',
    icon: '/digitalocean-logo.svg',
    description: 'Droplets, App Platform 지원',
    regions: ['nyc1', 'sfo2', 'lon1', 'sgp1', 'blr1']
  },
  {
    id: 'heroku',
    name: 'Heroku',
    icon: '/heroku-logo.jpg',
    description: 'Platform as a Service',
    regions: ['us', 'eu']
  },
  {
    id: 'vercel',
    name: 'Vercel',
    icon: '/vercel-logo.jpeg',
    description: '프론트엔드 배포 (Next.js, React)',
    regions: ['auto']
  }
];


export default function DeploymentDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'deploy' | 'history' | 'observability'>('overview');
  const [deployments, setDeployments] = useState<DeploymentConfig[]>([]);
  const [deploymentLogs, setDeploymentLogs] = useState<DeploymentLog[]>([]);
  const [showNewDeployment, setShowNewDeployment] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    region: '',
    instanceType: 't2.micro',
    apiKey: '',
    secretKey: ''
  });
  const [deploying, setDeploying] = useState(false);

  const containerStyle = {
    display: 'flex',
    flexDirection: 'column' as const,
    width: '100%',
    height: '100%',
    overflow: 'auto',
    padding: '32px 48px'
  };

  useEffect(() => {
    loadDeployments();
  }, []);

  const loadDeployments = async () => {
    try {
      const response = await fetch('http://localhost:8002/api/deployment/configs');
      const data = await response.json();
      if (data.success) {
        setDeployments(data.configs || []);
      }
    } catch (err) {
      console.error('배포 설정 로드 실패:', err);
    }
  };

  const handleDeploy = async () => {
    if (!selectedProvider || !formData.name) {
      alert('필수 정보를 입력해주세요');
      return;
    }

    setDeploying(true);
    addLog('배포 시작...', 'info');

    try {
      const response = await fetch('http://localhost:8002/api/deployment/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          provider: selectedProvider,
          region: formData.region,
          instanceType: formData.instanceType,
          apiKey: formData.apiKey,
          secretKey: formData.secretKey
        })
      });

      const result = await response.json();

      if (result.success) {
        addLog(`✅ 배포 성공: ${result.url}`, 'success');
        loadDeployments();
        setShowNewDeployment(false);
        resetForm();
      } else {
        addLog(`❌ 배포 실패: ${result.error}`, 'error');
      }
    } catch (err) {
      addLog(`❌ 배포 중 오류: ${err}`, 'error');
    } finally {
      setDeploying(false);
    }
  };

  const addLog = (message: string, status: 'info' | 'success' | 'warning' | 'error') => {
    const newLog: DeploymentLog = {
      timestamp: new Date().toLocaleTimeString('ko-KR'),
      message,
      status
    };
    setDeploymentLogs(prev => [newLog, ...prev].slice(0, 50));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      region: '',
      instanceType: 't2.micro',
      apiKey: '',
      secretKey: ''
    });
    setSelectedProvider(null);
  };

  return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '2px solid rgba(100, 200, 255, 0.3)', paddingBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <GlassmorphicIcon Icon={Cloud} gradient="from-blue-400 to-cyan-500" size={28} />
          <div style={{ fontSize: '24px', fontWeight: 'bold', background: 'linear-gradient(90deg, #64c8ff, #ffd700)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>클라우드 배포</div>
        </div>
        <button
          onClick={() => {
            setShowNewDeployment(true);
            setActiveTab('deploy');
          }}
          style={{ padding: '8px 16px', background: 'linear-gradient(90deg, #64c8ff, #4a9fff)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Plus size={18} />
          새 배포
        </button>
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {[
          { id: 'overview', label: '개요' },
          { id: 'deploy', label: '배포 설정' },
          { id: 'observability', label: '모니터링' },
          { id: 'history', label: '배포 로그' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: '8px 16px',
              border: '2px solid transparent',
              background: activeTab === tab.id ? 'linear-gradient(90deg, #64c8ff, #4a9fff)' : 'rgba(100, 200, 255, 0.1)',
              color: activeTab === tab.id ? '#fff' : '#e0e0e0',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '500',
              transition: 'all 0.3s ease'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 개요 탭 */}
      {activeTab === 'overview' && (
        <div>
          {deployments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', opacity: 0.6 }}>
              <Cloud size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
              <p>배포된 프로젝트가 없습니다.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
              {deployments.map(deploy => (
                <div key={deploy.id} style={{ background: 'rgba(100, 200, 255, 0.1)', border: '1px solid rgba(100, 200, 255, 0.3)', borderRadius: '8px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: '600', color: '#ffd700' }}>{deploy.name}</div>
                      <div style={{ fontSize: '12px', color: 'rgba(224, 224, 224, 0.6)', marginTop: '4px' }}>{deploy.provider.toUpperCase()} • {deploy.region}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px', background: deploy.status === 'deployed' ? 'rgba(52, 199, 89, 0.2)' : 'rgba(255, 107, 107, 0.2)', borderRadius: '4px' }}>
                      {deploy.status === 'deployed' ? <CheckCircle size={16} color="#34c759" /> : <AlertCircle size={16} color="#ff6b6b" />}
                      <span style={{ fontSize: '12px', color: deploy.status === 'deployed' ? '#34c759' : '#ff6b6b' }}>{deploy.status}</span>
                    </div>
                  </div>
                  {deploy.url && (
                    <div style={{ padding: '8px', background: 'rgba(0, 0, 0, 0.3)', borderRadius: '4px', marginBottom: '12px', fontSize: '12px', wordBreak: 'break-all', color: '#64c8ff' }}>
                      {deploy.url}
                    </div>
                  )}
                  <div style={{ fontSize: '12px', color: 'rgba(224, 224, 224, 0.6)', marginBottom: '12px' }}>
                    마지막 배포: {deploy.lastDeployed || '배포되지 않음'}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button style={{ flex: 1, padding: '6px', background: 'rgba(100, 200, 255, 0.2)', border: '1px solid rgba(100, 200, 255, 0.3)', color: '#64c8ff', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                      다시 배포
                    </button>
                    <button style={{ flex: 1, padding: '6px', background: 'rgba(255, 107, 107, 0.2)', border: '1px solid rgba(255, 107, 107, 0.3)', color: '#ff6b6b', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                      제거
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 배포 설정 탭 */}
      {activeTab === 'deploy' && (
        <div>
          <h3 style={{ marginBottom: '16px', color: '#64c8ff' }}>클라우드 서비스 선택</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
            {CLOUD_PROVIDERS.map(provider => (
              <div
                key={provider.id}
                onClick={() => setSelectedProvider(provider.id)}
                style={{
                  padding: '16px',
                  background: selectedProvider === provider.id ? 'rgba(100, 200, 255, 0.2)' : 'rgba(100, 200, 255, 0.1)',
                  border: selectedProvider === provider.id ? '2px solid #64c8ff' : '1px solid rgba(100, 200, 255, 0.3)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.3s ease'
                }}
              >
                <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'center' }}>
                  <img src={provider.icon} alt={provider.name} style={{ height: '48px', maxWidth: '100%', objectFit: 'contain' }} />
                </div>
                <div style={{ fontWeight: '600', marginBottom: '4px', color: '#ffd700' }}>{provider.name}</div>
                <div style={{ fontSize: '12px', color: 'rgba(224, 224, 224, 0.6)' }}>{provider.description}</div>
              </div>
            ))}
          </div>

          {selectedProvider && (
            <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '20px', borderRadius: '8px', border: '1px solid rgba(100, 200, 255, 0.2)' }}>
              <h3 style={{ marginBottom: '16px', color: '#64c8ff' }}>배포 설정</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                <input
                  type="text"
                  placeholder="배포 이름"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  style={{ padding: '10px', background: 'rgba(0, 0, 0, 0.5)', border: '1px solid rgba(100, 200, 255, 0.3)', borderRadius: '6px', color: '#e0e0e0' }}
                />
                <select
                  value={formData.region}
                  onChange={e => setFormData({ ...formData, region: e.target.value })}
                  style={{ padding: '10px', background: 'rgba(0, 0, 0, 0.5)', border: '1px solid rgba(100, 200, 255, 0.3)', borderRadius: '6px', color: '#e0e0e0' }}
                >
                  <option value="">지역 선택</option>
                  {CLOUD_PROVIDERS.find(p => p.id === selectedProvider)?.regions.map(region => (
                    <option key={region} value={region}>{region}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="API Key"
                  value={formData.apiKey}
                  onChange={e => setFormData({ ...formData, apiKey: e.target.value })}
                  style={{ padding: '10px', background: 'rgba(0, 0, 0, 0.5)', border: '1px solid rgba(100, 200, 255, 0.3)', borderRadius: '6px', color: '#e0e0e0', gridColumn: '1 / -1' }}
                />
                <input
                  type="password"
                  placeholder="Secret Key"
                  value={formData.secretKey}
                  onChange={e => setFormData({ ...formData, secretKey: e.target.value })}
                  style={{ padding: '10px', background: 'rgba(0, 0, 0, 0.5)', border: '1px solid rgba(100, 200, 255, 0.3)', borderRadius: '6px', color: '#e0e0e0', gridColumn: '1 / -1' }}
                />
              </div>
              <button
                onClick={handleDeploy}
                disabled={deploying}
                style={{
                  marginTop: '16px',
                  padding: '10px 20px',
                  background: deploying ? 'rgba(100, 200, 255, 0.3)' : 'linear-gradient(90deg, #64c8ff, #4a9fff)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: deploying ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {deploying ? <Loader size={18} /> : <Server size={18} />}
                {deploying ? '배포 중...' : '배포 시작'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* 옵저빌리티 탭 */}
      {activeTab === 'observability' && deployments.length > 0 && (
        <DeploymentObservability
          deploymentId={deployments[0]?.id || ''}
          deploymentName={deployments[0]?.name || ''}
        />
      )}

      {activeTab === 'observability' && deployments.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', opacity: 0.6 }}>
          <Cloud size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
          <p>모니터링할 배포된 프로젝트가 없습니다.</p>
        </div>
      )}

      {/* 배포 로그 탭 */}
      {activeTab === 'history' && (
        <div style={{ maxHeight: '600px', overflow: 'auto' }}>
          {deploymentLogs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', opacity: 0.6 }}>배포 로그가 없습니다.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {deploymentLogs.map((log, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    gap: '12px',
                    padding: '12px',
                    background: log.status === 'error' ? 'rgba(255, 107, 107, 0.1)' : log.status === 'success' ? 'rgba(52, 199, 89, 0.1)' : 'rgba(100, 200, 255, 0.1)',
                    border: `1px solid rgba(${log.status === 'error' ? '255, 107, 107' : log.status === 'success' ? '52, 199, 89' : '100, 200, 255'}, 0.3)`,
                    borderRadius: '6px'
                  }}
                >
                  <span style={{ fontSize: '12px', color: 'rgba(224, 224, 224, 0.5)', minWidth: '80px' }}>{log.timestamp}</span>
                  <span style={{ fontSize: '13px', color: log.status === 'error' ? '#ff6b6b' : log.status === 'success' ? '#34c759' : '#64c8ff' }}>{log.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
