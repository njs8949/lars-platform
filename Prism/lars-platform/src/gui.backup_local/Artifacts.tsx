import React, { useState, useEffect } from 'react';
import { Box, Code, FileText, Settings, Download, Plus, Trash2, Copy, X } from 'lucide-react';

interface Artifact {
  id: string;
  type: 'CODE' | 'DOC' | 'CONFIG' | 'WEB';
  name: string;
  content: string;
  date: string;
  size: string;
}

function Artifacts({ onClose }: { onClose?: () => void }) {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);
  const [formData, setFormData] = useState({ type: 'CODE', name: '', content: '' });

  // localStorage에서 artifact 로드
  useEffect(() => {
    const saved = localStorage.getItem('lars_artifacts');
    if (saved) {
      try {
        setArtifacts(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load artifacts:', e);
      }
    }
  }, []);

  // localStorage에 artifact 저장
  const saveArtifacts = (newArtifacts: Artifact[]) => {
    setArtifacts(newArtifacts);
    localStorage.setItem('lars_artifacts', JSON.stringify(newArtifacts));
  };

  const createArtifact = () => {
    if (!formData.name.trim() || !formData.content.trim()) return;

    const newArtifact: Artifact = {
      id: Date.now().toString(),
      type: formData.type as 'CODE' | 'DOC' | 'CONFIG' | 'WEB',
      name: formData.name,
      content: formData.content,
      date: '방금 전',
      size: `${Math.ceil(formData.content.length / 1024)}KB`
    };

    saveArtifacts([newArtifact, ...artifacts]);
    setFormData({ type: 'CODE', name: '', content: '' });
    setShowCreateForm(false);
  };

  const deleteArtifact = (id: string) => {
    saveArtifacts(artifacts.filter(a => a.id !== id));
    setSelectedArtifact(null);
  };

  const downloadArtifact = (artifact: Artifact) => {
    const element = document.createElement('a');
    const file = new Blob([artifact.content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = artifact.name;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="artifacts-view animate-in" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <header className="view-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
        <div>
          <div style={{display: 'flex', alignItems: 'center', gap: '0.8rem'}}>
            <Box size={24} color="#a855f7" />
            <h2>생성물 보관함 (LARS Artifacts)</h2>
          </div>
          <p className="view-desc">에이전트가 생성한 모든 디지털 결과물들을 안전하게 보관하고 관리합니다.</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              padding: '0.5rem',
              borderRadius: '0.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              hover: 'rgba(255,255,255,0.2)'
            }}
            title="닫기"
          >
            <X size={20} />
          </button>
        )}
      </header>

      {/* 생성 폼 */}
      {showCreateForm && (
        <div style={{
          padding: '1.5rem',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '0.75rem',
          marginBottom: '1.5rem',
          borderLeft: '3px solid #a855f7'
        }}>
          <h3 style={{marginTop: 0, marginBottom: '1rem', color: '#fff'}}>새 생성물 만들기</h3>
          <div style={{display: 'grid', gap: '1rem'}}>
            <select
              value={formData.type}
              onChange={(e) => setFormData({...formData, type: e.target.value})}
              style={{
                padding: '0.5rem',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '0.5rem',
                color: '#fff',
                cursor: 'pointer'
              }}
            >
              <option value="CODE">코드</option>
              <option value="DOC">문서</option>
              <option value="CONFIG">설정</option>
              <option value="WEB">웹</option>
            </select>
            <input
              type="text"
              placeholder="생성물 이름"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              style={{
                padding: '0.5rem',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '0.5rem',
                color: '#fff'
              }}
            />
            <textarea
              placeholder="생성물 내용"
              value={formData.content}
              onChange={(e) => setFormData({...formData, content: e.target.value})}
              style={{
                padding: '0.75rem',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '0.5rem',
                color: '#fff',
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                minHeight: '150px',
                resize: 'vertical'
              }}
            />
            <div style={{display: 'flex', gap: '0.75rem'}}>
              <button
                onClick={createArtifact}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: '#a855f7',
                  border: 'none',
                  borderRadius: '0.5rem',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                생성
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: '0.5rem',
                  color: '#fff',
                  cursor: 'pointer'
                }}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 생성물 목록 또는 상세 보기 */}
      <div style={{flex: 1, overflowY: 'auto'}}>
        {selectedArtifact ? (
          // 상세 보기
          <div style={{
            padding: '1.5rem',
            background: 'rgba(255,255,255,0.02)',
            borderRadius: '0.75rem',
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            flexDirection: 'column',
            height: '100%'
          }}>
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem'}}>
              <h3 style={{marginTop: 0, marginBottom: 0, color: '#fff'}}>{selectedArtifact.name}</h3>
              <button
                onClick={() => setSelectedArtifact(null)}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  color: '#fff',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  borderRadius: '0.25rem'
                }}
              >
                ← 목록으로
              </button>
            </div>
            <p style={{color: '#9ba1b0', fontSize: '0.875rem', marginBottom: '1rem'}}>
              {selectedArtifact.date} • {selectedArtifact.size} • {selectedArtifact.type}
            </p>
            <pre style={{
              flex: 1,
              overflow: 'auto',
              background: 'rgba(0,0,0,0.3)',
              padding: '1rem',
              borderRadius: '0.5rem',
              color: '#0f0',
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word',
              marginBottom: '1rem'
            }}>
              {selectedArtifact.content}
            </pre>
            <div style={{display: 'flex', gap: '0.75rem'}}>
              <button
                onClick={() => downloadArtifact(selectedArtifact)}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: '#0f0',
                  border: 'none',
                  borderRadius: '0.5rem',
                  color: '#000',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                <Download size={16} style={{display: 'inline', marginRight: '0.5rem'}} />
                다운로드
              </button>
              <button
                onClick={() => deleteArtifact(selectedArtifact.id)}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: '#ef4444',
                  border: 'none',
                  borderRadius: '0.5rem',
                  color: '#fff',
                  cursor: 'pointer'
                }}
              >
                <Trash2 size={16} style={{display: 'inline', marginRight: '0.5rem'}} />
                삭제
              </button>
            </div>
          </div>
        ) : (
          // 목록 보기
          <>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              style={{
                marginBottom: '1rem',
                padding: '0.75rem 1.5rem',
                background: '#a855f7',
                border: 'none',
                borderRadius: '0.5rem',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontWeight: '500'
              }}
            >
              <Plus size={18} />
              새 생성물 만들기
            </button>

            {artifacts.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '3rem',
                color: '#9ba1b0'
              }}>
                <p>생성된 생성물이 없습니다.</p>
                <p style={{fontSize: '0.875rem'}}>새 생성물을 만들어 보세요!</p>
              </div>
            ) : (
              <div className="artifact-grid">
                {artifacts.map((art) => (
                  <div
                    key={art.id}
                    className="artifact-card"
                    onClick={() => setSelectedArtifact(art)}
                    style={{cursor: 'pointer', transition: 'all 0.2s'}}
                    onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                    onMouseOut={(e) => (e.currentTarget.style.background = '')}
                  >
                    <div className="art-icon">
                      {art.type === 'CODE' ? <Code size={32} color="var(--accent-blue)" /> :
                       art.type === 'DOC' ? <FileText size={32} color="#f97316" /> :
                       art.type === 'WEB' ? <span style={{fontSize: '24px'}}>🌐</span> :
                       <Settings size={32} color="#9ba1b0" />}
                    </div>
                    <div className="art-info">
                      <div className="art-name">{art.name}</div>
                      <div style={{display: 'flex', gap: '1rem'}}>
                        <span className="art-date">{art.date}</span>
                        <span className="art-date">•</span>
                        <span className="art-date">{art.size}</span>
                      </div>
                    </div>
                    <button
                      className="mini-btn btn-download"
                      title="다운로드"
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadArtifact(art);
                      }}
                    >
                      <Download size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default Artifacts;
