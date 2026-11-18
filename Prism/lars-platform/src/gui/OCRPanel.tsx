import React, { useState, useMemo, useEffect } from 'react';
import { FileText, Upload, Search, Filter, Eye, Download, Languages, CheckCircle2, AlertCircle, Clock, RotateCw, Zap, Image, Edit2 } from 'lucide-react';
import { GlassmorphicIcon } from './components/GlassmorphicIcon';
import { FeatureHeader, KpiGrid, EmptyState, ConfidenceBadge } from './components/feature/FeatureUI';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';

export const OCRPanel = () => {
  const [viewMode, setViewMode] = useState<'gallery' | 'editor'>('gallery');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [confidenceRange, setConfidenceRange] = useState([0, 100]);
  const [selectedDoc, setSelectedDoc] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [lastJob, setLastJob] = useState<any | null>(null);

  const [documents, setDocuments] = useState<any[]>([]);

  // 데이터 로드
  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/ocr/jobs/`);
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.data || []);
      }
    } catch (error) {
      console.error('작업 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = async () => {
    if (!newDocName.trim()) {
      alert('문서 이름을 입력해주세요');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/ocr/jobs/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newDocName, language: 'ko' })
      });

      if (response.ok) {
        const created = await response.json();
        const job = created.data;
        if (selectedFile && job?.id) {
          const form = new FormData();
          form.append('file', selectedFile);
          const run = await fetch(`${API_URL}/ocr/jobs/${job.id}/file`, { method: 'POST', body: form });
          const result = await run.json();
          setLastJob(result.data ?? null);
          if (!run.ok || !result.success) alert(result.detail || result.data?.error || 'OCR 처리에 실패했습니다.');
        }
        await loadJobs();
        setNewDocName('');
        setSelectedFile(null);
        setShowNewModal(false);
      }
    } catch (error) {
      console.error('작업 생성 실패:', error);
      alert('작업 생성 실패');
    } finally {
      setLoading(false);
    }
  };

  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = !selectedStatus || doc.status === selectedStatus;
      const matchesLanguage = !selectedLanguage || doc.lang === selectedLanguage;
      const matchesConfidence = doc.confidence >= confidenceRange[0] && doc.confidence <= confidenceRange[1];
      return matchesSearch && matchesStatus && matchesLanguage && matchesConfidence;
    });
  }, [documents, searchTerm, selectedStatus, selectedLanguage, confidenceRange]);

  const stats = {
    totalDocs: documents.length,
    completed: documents.filter(d => d.status === 'completed').length,
    avgConfidence: Math.round(documents.filter(d => d.status === 'completed').reduce((sum, d) => sum + d.confidence, 0) / documents.filter(d => d.status === 'completed').length),
    totalPages: documents.reduce((sum, d) => sum + d.pages, 0)
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 size={16} style={{ color: '#4ade80' }} />;
      case 'processing': return <Clock size={16} style={{ color: '#fcd34d' }} />;
      case 'error': return <AlertCircle size={16} style={{ color: '#ff6b9d' }} />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#4ade80';
      case 'processing': return '#fcd34d';
      case 'error': return '#ff6b9d';
      default: return '#64c8ff';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return '완료';
      case 'processing': return '처리중';
      case 'error': return '오류';
      default: return '대기';
    }
  };

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%', background: 'linear-gradient(135deg, #2d1b4e 0%, #1a0033 100%)' }}>

      {/* 좌측 사이드바 */}
      <div style={{ width: '280px', borderRight: '1px solid rgba(155,89,182,0.2)', overflow: 'auto', display: 'flex', flexDirection: 'column', padding: '20px' }}>
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '12px', color: 'rgba(224,224,224,0.5)', textTransform: 'uppercase', fontWeight: '600', marginBottom: '12px' }}>필터</div>

          {/* 검색 */}
          <div style={{ marginBottom: '16px', position: 'relative' }}>
            <input
              type="text"
              placeholder="문서 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', background: 'rgba(155,89,182,0.1)', border: '1px solid rgba(155,89,182,0.2)', borderRadius: '8px', color: '#e0e0e0', fontSize: '13px' }}
            />
            <Search size={14} style={{ position: 'absolute', right: '12px', top: '12px', color: 'rgba(224,224,224,0.4)' }} />
          </div>

          {/* 상태 필터 */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', color: 'rgba(224,224,224,0.5)', marginBottom: '8px', fontWeight: '600' }}>상태</div>
            {['completed', 'processing', 'error'].map(status => (
              <button
                key={status}
                onClick={() => setSelectedStatus(selectedStatus === status ? null : status)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 12px',
                  marginBottom: '6px',
                  background: selectedStatus === status ? `${getStatusColor(status)}20` : 'rgba(155,89,182,0.08)',
                  border: selectedStatus === status ? `1px solid ${getStatusColor(status)}` : '1px solid rgba(155,89,182,0.15)',
                  borderRadius: '6px',
                  color: '#e0e0e0',
                  cursor: 'pointer',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {getStatusIcon(status)}
                {getStatusLabel(status)}
              </button>
            ))}
          </div>

          {/* 언어 필터 */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', color: 'rgba(224,224,224,0.5)', marginBottom: '8px', fontWeight: '600' }}>언어</div>
            {['Korean', 'English', 'Mixed'].map(lang => (
              <button
                key={lang}
                onClick={() => setSelectedLanguage(selectedLanguage === lang ? null : lang)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 12px',
                  marginBottom: '6px',
                  background: selectedLanguage === lang ? 'rgba(155,89,182,0.2)' : 'rgba(155,89,182,0.08)',
                  border: selectedLanguage === lang ? '1px solid #d8b4fe' : '1px solid rgba(155,89,182,0.15)',
                  borderRadius: '6px',
                  color: '#e0e0e0',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                {lang}
              </button>
            ))}
          </div>

          {/* 정확도 범위 */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', color: 'rgba(224,224,224,0.5)', marginBottom: '8px', fontWeight: '600' }}>정확도</div>
            <div style={{ color: '#d8b4fe', fontSize: '12px', fontWeight: '600', marginBottom: '8px' }}>{confidenceRange[0]}% - {confidenceRange[1]}%</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setConfidenceRange([80, 100])} style={{ flex: 1, padding: '6px', background: confidenceRange[0] === 80 ? 'rgba(155,89,182,0.2)' : 'rgba(155,89,182,0.08)', border: '1px solid rgba(155,89,182,0.15)', borderRadius: '4px', color: '#e0e0e0', cursor: 'pointer', fontSize: '11px' }}>높음</button>
              <button onClick={() => setConfidenceRange([0, 100])} style={{ flex: 1, padding: '6px', background: confidenceRange[0] === 0 && confidenceRange[1] === 100 ? 'rgba(155,89,182,0.2)' : 'rgba(155,89,182,0.08)', border: '1px solid rgba(155,89,182,0.15)', borderRadius: '4px', color: '#e0e0e0', cursor: 'pointer', fontSize: '11px' }}>전체</button>
            </div>
          </div>
        </div>

        <div style={{ flex: 1 }} />

        {/* 액션 버튼 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            onClick={() => setShowNewModal(true)}
            style={{ width: '100%', padding: '10px', background: 'linear-gradient(135deg, #d8b4fe, #c084fc)', color: '#000', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '13px' }}>
            <Upload size={16} />
            문서 업로드
          </button>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* 상단 헤더 */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(155,89,182,0.2)' }}>
          <FeatureHeader
            icon={<GlassmorphicIcon Icon={FileText} gradient="from-purple-400 to-pink-500" size={40} />}
            title="문서 OCR"
            subtitle="AI 기반 문자 인식"
            actions={
              <>
            {/* 뷰 전환 */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setViewMode('gallery')}
                style={{ padding: '8px 16px', background: viewMode === 'gallery' ? 'rgba(155,89,182,0.2)' : 'rgba(155,89,182,0.08)', border: viewMode === 'gallery' ? '1px solid #d8b4fe' : '1px solid rgba(155,89,182,0.15)', borderRadius: '6px', color: '#e0e0e0', cursor: 'pointer', fontSize: '12px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Image size={14} />
                갤러리
              </button>
              <button
                onClick={() => setViewMode('editor')}
                style={{ padding: '8px 16px', background: viewMode === 'editor' ? 'rgba(155,89,182,0.2)' : 'rgba(155,89,182,0.08)', border: viewMode === 'editor' ? '1px solid #d8b4fe' : '1px solid rgba(155,89,182,0.15)', borderRadius: '6px', color: '#e0e0e0', cursor: 'pointer', fontSize: '12px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Edit2 size={14} />
                편집
              </button>
            </div>
              </>
            }
          />
          <KpiGrid
            items={[
              { label: '처리된 문서', value: stats.completed, tone: 'purple' },
              { label: '평균 정확도', value: stats.totalDocs ? `${stats.avgConfidence}%` : '-', tone: 'green' },
              { label: '총 페이지', value: stats.totalPages, tone: 'amber' },
              { label: '총 문서', value: stats.totalDocs, tone: 'blue' },
            ]}
          />
        </div>

        {/* 콘텐츠 */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>

          {stats.totalDocs === 0 && (
            <div style={{ marginBottom: '24px' }}>
              <EmptyState
                icon={<GlassmorphicIcon Icon={FileText} gradient="from-purple-400 to-pink-500" size={32} />}
                title="아직 처리한 문서가 없습니다"
                description="PDF나 이미지를 올리면 글자를 인식해 텍스트와 필드를 추출하고 정확도를 보여줍니다."
                steps={['인식할 문서(PDF, PNG, JPG) 추가', '언어와 인식 옵션 선택', '추출 결과와 정확도를 이 화면에서 확인']}
                tab="ocr"
                examples={['영수증 금액 추출', '계약서 조항 텍스트화', '명함 정보 정리']}
                action={{ label: '새 문서 추가', onClick: () => setShowNewModal(true) }}
              />
            </div>
          )}

          {viewMode === 'gallery' ? (
            <>
              {/* 업로드 존 */}
              <div style={{ background: 'rgba(155,89,182,0.1)', borderRadius: '12px', padding: '32px', border: '2px dashed rgba(155,89,182,0.4)', textAlign: 'center', cursor: 'pointer', marginBottom: '24px', transition: 'all 0.3s' }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#d8b4fe'; e.currentTarget.style.background = 'rgba(155,89,182,0.15)'; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(155,89,182,0.4)'; e.currentTarget.style.background = 'rgba(155,89,182,0.1)'; }}>
                <Upload size={40} style={{ margin: '0 auto 12px', color: '#d8b4fe' }} />
                <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px', color: '#e0e0e0' }}>문서를 드래그하세요</div>
                <div style={{ fontSize: '12px', color: 'rgba(224,224,224,0.5)' }}>PDF, PNG, JPG, TIFF 지원</div>
              </div>

              {/* 문서 그리드 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                {filteredDocuments.map(doc => (
                  <div
                    key={doc.id}
                    onClick={() => setSelectedDoc(selectedDoc === doc.id ? null : doc.id)}
                    style={{
                      background: 'linear-gradient(135deg, rgba(155,89,182,0.15), rgba(155,89,182,0.05))',
                      border: selectedDoc === doc.id ? '2px solid #d8b4fe' : '1px solid rgba(155,89,182,0.2)',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 8px 24px rgba(155,89,182,0.2)'}
                    onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
                  >
                    <div style={{ padding: '16px', borderBottom: '1px solid rgba(155,89,182,0.1)' }}>
                      <div style={{ display: 'flex', alignItems: 'start', gap: '12px', marginBottom: '12px' }}>
                        <FileText size={24} style={{ color: '#d8b4fe', flexShrink: 0 }} />
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                          <div style={{ fontWeight: '600', marginBottom: '2px', color: '#e0e0e0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</div>
                          <div style={{ fontSize: '11px', color: 'rgba(224,224,224,0.5)' }}>{doc.pages}페이지</div>
                        </div>
                        <div style={{ fontSize: '12px', padding: '4px 8px', background: `${getStatusColor(doc.status)}20`, color: getStatusColor(doc.status), borderRadius: '4px', fontWeight: '600', whiteSpace: 'nowrap' }}>
                          {getStatusLabel(doc.status)}
                        </div>
                      </div>

                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <ConfidenceBadge value={doc.confidence} />
                          <span style={{ fontSize: '10px', color: 'rgba(224,224,224,0.5)' }}>{doc.lang}</span>
                        </div>
                        <div style={{ width: '100%', height: '6px', background: 'rgba(155,89,182,0.2)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', background: 'linear-gradient(90deg, #d8b4fe, #c084fc)', width: `${doc.confidence}%` }} />
                        </div>
                      </div>

                      <div style={{ fontSize: '10px', color: 'rgba(224,224,224,0.5)', marginBottom: '8px' }}>
                        {doc.uploadDate} • {doc.size}
                      </div>

                      <button style={{ width: '100%', padding: '8px', background: 'rgba(155,89,182,0.15)', border: '1px solid rgba(155,89,182,0.3)', borderRadius: '6px', color: '#d8b4fe', cursor: 'pointer', fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                        <Eye size={12} />
                        보기
                      </button>
                    </div>

                    {selectedDoc === doc.id && (
                      <div style={{ padding: '12px', background: 'rgba(0,0,0,0.3)', borderTop: '1px solid rgba(155,89,182,0.1)', fontSize: '11px', color: 'rgba(224,224,224,0.7)' }}>
                        <div style={{ marginBottom: '6px' }}>처리시간: {doc.processedTime}</div>
                        <div>업로드: {doc.uploadDate}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            /* 편집 뷰 */
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', height: '100%' }}>
              <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(155,89,182,0.2)', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#d8b4fe', fontWeight: '600' }}>
                  📷 원본 이미지
                </div>
                <div style={{ flex: 1, background: 'rgba(0,0,0,0.5)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>📄</div>
                    <div style={{ fontSize: '12px', color: 'rgba(224,224,224,0.5)' }}>이미지 미리보기</div>
                  </div>
                </div>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(155,89,182,0.2)', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#d8b4fe', fontWeight: '600' }}>
                  ✏️ 인식된 텍스트
                </div>
                <textarea
                  style={{
                    flex: 1,
                    background: 'rgba(0,0,0,0.5)',
                    border: 'none',
                    padding: '12px',
                    borderRadius: '8px',
                    color: '#e0e0e0',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    resize: 'none'
                  }}
                  defaultValue="인식된 텍스트가 여기에 표시됩니다. 편집할 수 있습니다."
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 문서 업로드 모달 */}
      {lastJob && (
        <div style={{ margin: '0 0 16px', padding: '16px', borderRadius: 12, border: '1px solid rgba(216,180,254,0.25)', background: 'rgba(216,180,254,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, color: '#f1f5f9', fontWeight: 600 }}>
            <span>{lastJob.name} · {lastJob.status === 'done' ? `정확도 ${lastJob.confidence}%` : '처리 실패'}</span>
            <button onClick={() => setLastJob(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>닫기</button>
          </div>
          {lastJob.status === 'done'
            ? <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13, color: '#e2e8f0', margin: 0, maxHeight: 240, overflowY: 'auto' }}>{lastJob.text || '(인식된 글자가 없습니다)'}</pre>
            : <div style={{ fontSize: 13, color: '#fca5a5' }}>{lastJob.error}</div>}
        </div>
      )}
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
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#f1f5f9', marginBottom: '8px' }}>문서 업로드</h2>
            <p style={{ fontSize: '13px', color: 'rgba(224,224,224,0.6)', marginBottom: '24px' }}>문서를 선택하고 이름을 입력하세요</p>

            <div style={{
              width: '100%',
              padding: '20px',
              background: 'rgba(216,180,254,0.1)',
              border: '2px dashed rgba(216,180,254,0.3)',
              borderRadius: '8px',
              textAlign: 'center',
              marginBottom: '16px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px'
            }} onClick={() => document.getElementById('file-input')?.click()}>
              <input
                id="file-input"
                type="file"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setSelectedFile(file);
                    setNewDocName(file.name);
                  }
                }}
              />
              <Upload size={24} style={{ color: '#d8b4fe' }} />
              <p style={{ color: '#d8b4fe', fontSize: '13px', margin: 0 }}>
                {selectedFile ? `선택됨: ${selectedFile.name}` : '클릭하여 파일 선택 (png, jpg, tif, bmp, webp, 텍스트 PDF)'}
              </p>
            </div>

            <input
              type="text"
              placeholder="예: 계약서.pdf"
              value={newDocName}
              onChange={(e) => setNewDocName(e.target.value)}
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
            />

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => {
                  setShowNewModal(false);
                  setNewDocName('');
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
                업로드
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OCRPanel;
