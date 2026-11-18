import React, { useState } from 'react';
import {
  Upload,
  Download,
  FileJson,
  Settings as SettingsIcon,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronDown
} from 'lucide-react';

interface ImportExportProps {
  onImport?: (data: any) => void;
  onExport?: () => any;
}

interface PlatformConfig {
  name: string;
  icon: string;
  color: string;
  description: string;
}

const PLATFORMS: Record<string, PlatformConfig> = {
  openai: {
    name: 'OpenAI',
    icon: '◉',
    color: '#10a37f',
    description: 'OpenAI API 키 및 프로젝트 설정'
  },
  anthropic: {
    name: 'Anthropic Claude',
    icon: 'Ⓐ',
    color: '#9d4edd',
    description: 'Claude API 및 모델 설정'
  },
  google: {
    name: 'Google Gemini',
    icon: '✦',
    color: '#4285f4',
    description: 'Gemini API 및 프로젝트 설정'
  },
  moonshot: {
    name: 'Kimi (Moonshot)',
    icon: '◐',
    color: '#ff6b6b',
    description: 'Moonshot API 및 설정'
  },
  custom: {
    name: '사용자 정의',
    icon: '⚙️',
    color: '#6c757d',
    description: 'JSON 형식의 커스텀 설정'
  }
};

export default function ImportExport({ onImport, onExport }: ImportExportProps) {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('openai');
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [expandedPlatform, setExpandedPlatform] = useState<string>('openai');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const content = await file.text();
      const data = JSON.parse(content);

      // 플랫폼별 설정 변환
      const convertedData = convertPlatformConfig(selectedPlatform, data);

      if (onImport) {
        onImport(convertedData);
      }

      setImportStatus('success');
      setStatusMessage(`✅ ${PLATFORMS[selectedPlatform].name} 설정을 성공적으로 불러왔습니다!`);
      setTimeout(() => setImportStatus('idle'), 3000);
    } catch (error) {
      setImportStatus('error');
      setStatusMessage(`❌ 파일을 불러오지 못했습니다: ${error instanceof Error ? error.message : '알 수 없는 에러'}`);
      setTimeout(() => setImportStatus('idle'), 3000);
    }
  };

  const convertPlatformConfig = (platform: string, config: any): any => {
    switch (platform) {
      case 'openai':
        return {
          modelType: 'GPT-4',
          apiKey: config.api_key || config.apiKey || '',
          provider: 'openai',
          models: config.models || [],
          settings: {
            temperature: config.temperature || 0.7,
            maxTokens: config.max_tokens || config.maxTokens || 2048,
            topP: config.top_p || config.topP || 1
          },
          importedFrom: 'OpenAI',
          importedAt: new Date().toISOString()
        };
      case 'anthropic':
        return {
          modelType: 'Claude-3',
          apiKey: config.api_key || config.apiKey || '',
          provider: 'anthropic',
          models: config.models || ['claude-3-opus', 'claude-3-sonnet'],
          settings: {
            temperature: config.temperature || 0.7,
            maxTokens: config.max_tokens || config.maxTokens || 4096,
            thinking: config.thinking_enabled || false
          },
          importedFrom: 'Anthropic',
          importedAt: new Date().toISOString()
        };
      case 'google':
        return {
          modelType: 'Gemini',
          apiKey: config.api_key || config.apiKey || '',
          provider: 'google',
          projectId: config.project_id || config.projectId || '',
          models: config.models || ['gemini-pro'],
          settings: {
            temperature: config.temperature || 0.7,
            maxOutputTokens: config.max_output_tokens || config.maxOutputTokens || 2048,
            topK: config.top_k || config.topK || 40,
            topP: config.top_p || config.topP || 0.95
          },
          importedFrom: 'Google Gemini',
          importedAt: new Date().toISOString()
        };
      case 'moonshot':
        return {
          modelType: 'Kimi',
          apiKey: config.api_key || config.apiKey || '',
          provider: 'moonshot',
          models: config.models || ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
          settings: {
            temperature: config.temperature || 0.7,
            maxTokens: config.max_tokens || config.maxTokens || 4096,
            topP: config.top_p || config.topP || 1
          },
          importedFrom: 'Moonshot/Kimi',
          importedAt: new Date().toISOString()
        };
      default:
        return {
          ...config,
          importedFrom: 'Custom',
          importedAt: new Date().toISOString()
        };
    }
  };

  const handleExport = () => {
    if (onExport) {
      const data = onExport();
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `prism-config-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* 탭 선택 */}
      <div style={{ display: 'flex', gap: '0.8rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
        <button
          onClick={() => setActiveTab('import')}
          style={{
            padding: '0.8rem 1.5rem',
            background: activeTab === 'import' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
            border: activeTab === 'import' ? '1px solid rgba(59, 130, 246, 0.5)' : 'none',
            borderRadius: '6px',
            color: activeTab === 'import' ? '#3b82f6' : '#9ba1b0',
            cursor: 'pointer',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.3s'
          }}
        >
          <Upload size={16} /> 불러오기
        </button>
        <button
          onClick={() => setActiveTab('export')}
          style={{
            padding: '0.8rem 1.5rem',
            background: activeTab === 'export' ? 'rgba(34, 197, 94, 0.2)' : 'transparent',
            border: activeTab === 'export' ? '1px solid rgba(34, 197, 94, 0.5)' : 'none',
            borderRadius: '6px',
            color: activeTab === 'export' ? '#22c55e' : '#9ba1b0',
            cursor: 'pointer',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.3s'
          }}
        >
          <Download size={16} /> 내보내기
        </button>
      </div>

      {/* Import 탭 */}
      {activeTab === 'import' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h4 style={{ color: '#fff', fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>지원되는 플랫폼</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {Object.entries(PLATFORMS).map(([key, platform]) => (
                <div
                  key={key}
                  onClick={() => setExpandedPlatform(expandedPlatform === key ? '' : key)}
                  style={{
                    background: selectedPlatform === key ? `rgba(${platform.color}, 0.15)` : 'rgba(255,255,255,0.02)',
                    border: selectedPlatform === key ? `1px solid ${platform.color}` : '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    padding: '1rem',
                    cursor: 'pointer',
                    transition: 'all 0.3s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flex: 1 }}>
                      <span style={{ fontSize: '1.2rem' }}>{platform.icon}</span>
                      <div>
                        <div style={{ color: '#fff', fontWeight: 600, marginBottom: '0.3rem' }}>{platform.name}</div>
                        <div style={{ fontSize: '0.85rem', color: '#9ba1b0' }}>{platform.description}</div>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="platform"
                      value={key}
                      checked={selectedPlatform === key}
                      onChange={(e) => setSelectedPlatform(e.target.value)}
                      style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                    />
                  </div>

                  {/* 세부 정보 */}
                  {expandedPlatform === key && (
                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: '0.9rem', color: '#9ba1b0' }}>
                      {key === 'openai' && (
                        <>
                          <div style={{ marginBottom: '0.5rem' }}>• API 키 (api_key 또는 apiKey)</div>
                          <div style={{ marginBottom: '0.5rem' }}>• 모델 목록 (models)</div>
                          <div style={{ marginBottom: '0.5rem' }}>• 온도 (temperature)</div>
                          <div>• 최대 토큰 (max_tokens)</div>
                        </>
                      )}
                      {key === 'anthropic' && (
                        <>
                          <div style={{ marginBottom: '0.5rem' }}>• API 키 (api_key)</div>
                          <div style={{ marginBottom: '0.5rem' }}>• 모델 목록 (models)</div>
                          <div style={{ marginBottom: '0.5rem' }}>• 온도 (temperature)</div>
                          <div>• Extended Thinking 활성화 (thinking_enabled)</div>
                        </>
                      )}
                      {key === 'google' && (
                        <>
                          <div style={{ marginBottom: '0.5rem' }}>• API 키 (api_key)</div>
                          <div style={{ marginBottom: '0.5rem' }}>• 프로젝트 ID (project_id)</div>
                          <div style={{ marginBottom: '0.5rem' }}>• 모델 목록 (models)</div>
                          <div>• 온도, Top K, Top P 설정</div>
                        </>
                      )}
                      {key === 'moonshot' && (
                        <>
                          <div style={{ marginBottom: '0.5rem' }}>• API 키 (api_key)</div>
                          <div style={{ marginBottom: '0.5rem' }}>• 모델 목록 (8k, 32k, 128k)</div>
                          <div style={{ marginBottom: '0.5rem' }}>• 온도 (temperature)</div>
                          <div>• 최대 토큰 (max_tokens)</div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 파일 업로드 */}
          <div style={{
            background: 'rgba(59, 130, 246, 0.1)',
            border: '2px dashed rgba(59, 130, 246, 0.5)',
            borderRadius: '12px',
            padding: '2rem',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s'
          }}>
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              id="import-file-input"
            />
            <label htmlFor="import-file-input" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.8rem' }}>
              <FileJson size={32} style={{ color: '#3b82f6' }} />
              <div>
                <div style={{ color: '#fff', fontWeight: 600, marginBottom: '0.3rem' }}>JSON 파일을 여기로 드래그하세요</div>
                <div style={{ fontSize: '0.9rem', color: '#9ba1b0' }}>또는 클릭하여 파일 선택</div>
              </div>
            </label>
          </div>

          {/* 상태 메시지 */}
          {importStatus !== 'idle' && (
            <div style={{
              background: importStatus === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              border: `1px solid ${importStatus === 'success' ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)'}`,
              borderRadius: '8px',
              padding: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.8rem',
              color: importStatus === 'success' ? '#22c55e' : '#ef4444'
            }}>
              {importStatus === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
              <span>{statusMessage}</span>
            </div>
          )}

          {/* 설명 */}
          <div style={{ background: 'rgba(96, 165, 250, 0.1)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(96, 165, 250, 0.3)' }}>
            <div style={{ fontSize: '0.9rem', color: '#9ba1b0', lineHeight: '1.6' }}>
              <strong style={{ color: '#60a5fa' }}>💡 사용 방법:</strong><br />
              1. 불러올 플랫폼을 선택합니다<br />
              2. 해당 플랫폼의 설정 JSON 파일을 준비합니다<br />
              3. 파일을 드래그하거나 클릭하여 업로드합니다<br />
              4. Prism이 자동으로 설정을 변환하여 불러옵니다
            </div>
          </div>
        </div>
      )}

      {/* Export 탭 */}
      {activeTab === 'export' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h4 style={{ color: '#fff', fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <SettingsIcon size={20} style={{ color: '#60a5fa' }} /> 현재 Prism 설정 내보내기
            </h4>
            <div style={{ color: '#9ba1b0', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.6' }}>
              현재 Prism의 모든 설정과 구성을 JSON 형식으로 다운로드합니다. 이를 통해:
              <ul style={{ marginTop: '0.8rem', marginBottom: '0.8rem', paddingLeft: '1.5rem' }}>
                <li>설정 백업</li>
                <li>다른 장치로 설정 이전</li>
                <li>다른 AI 플랫폼으로 설정 변환</li>
                <li>버전 관리 및 히스토리 추적</li>
              </ul>
            </div>

            <button
              onClick={handleExport}
              style={{
                width: '100%',
                padding: '1rem',
                background: 'linear-gradient(135deg, #10b981, #34d399)',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontWeight: 600,
                fontSize: '1rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.8rem',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <Download size={20} /> Prism 설정 내보내기
            </button>
          </div>

          {/* 내보내기 형식 설명 */}
          <div style={{ background: 'rgba(96, 165, 250, 0.1)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(96, 165, 250, 0.3)' }}>
            <div style={{ fontSize: '0.9rem', color: '#9ba1b0', lineHeight: '1.6' }}>
              <strong style={{ color: '#60a5fa' }}>📦 내보내기 형식:</strong><br />
              포함되는 내용: API 키, 모델 설정, 온도/토큰 등 매개변수, UI 선호도, 통합 설정, 불러온 외부 설정 정보<br />
              <br />
              <strong style={{ color: '#60a5fa' }}>⚠️ 보안 주의:</strong><br />
              내보낸 파일에는 API 키가 포함됩니다. 안전한 위치에 보관하세요!
            </div>
          </div>

          {/* 내보내기 옵션들 */}
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h4 style={{ color: '#fff', fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>내보내기 옵션</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: 'pointer', color: '#e0e0e0' }}>
                <input type="checkbox" defaultChecked={true} />
                <span>API 키 포함</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: 'pointer', color: '#e0e0e0' }}>
                <input type="checkbox" defaultChecked={true} />
                <span>모델 설정 포함</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: 'pointer', color: '#e0e0e0' }}>
                <input type="checkbox" defaultChecked={true} />
                <span>UI 선호도 포함</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: 'pointer', color: '#e0e0e0' }}>
                <input type="checkbox" defaultChecked={false} />
                <span>암호화 (API 키 보호)</span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
