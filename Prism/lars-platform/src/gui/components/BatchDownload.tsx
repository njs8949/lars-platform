import React, { useState } from 'react';
import { Download, Check, AlertCircle } from 'lucide-react';
import '../styles/BatchDownload.css';

interface BatchDownloadProps {
  templates: Array<{ id: string; name: string; type: 'presentation' | 'document' }>;
  onClose: () => void;
  language?: string;
}

export const BatchDownload: React.FC<BatchDownloadProps> = ({
  templates,
  onClose,
  language = 'ko'
}) => {
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(
    new Set(templates.map(t => t.id))
  );
  const [isDownloading, setIsDownloading] = useState(false);

  const toggleTemplate = (id: string) => {
    const newSelected = new Set(selectedTemplates);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedTemplates(newSelected);
  };

  const handleBatchDownload = async () => {
    if (selectedTemplates.size === 0) {
      alert(language === 'ko' ? '최소 하나의 템플릿을 선택해주세요' : 'Select at least one template');
      return;
    }

    setIsDownloading(true);

    try {
      const selectedList = templates.filter(t => selectedTemplates.has(t.id));

      const response = await fetch('http://localhost:8001/api/template/batch-download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          templates: selectedList.map(t => ({
            type: t.type,
            name: t.id
          }))
        })
      });

      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `templates_batch_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      onClose();
    } catch (error) {
      console.error('Batch download error:', error);
      alert(language === 'ko' ? '다운로드 실패' : 'Download failed');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="batch-modal-overlay">
      <div className="batch-modal">
        <div className="batch-header">
          <h2>{language === 'ko' ? '일괄 다운로드' : 'Batch Download'}</h2>
          <p className="batch-subtitle">
            {language === 'ko'
              ? '여러 템플릿을 한 번에 다운로드하세요 (ZIP)'
              : 'Download multiple templates at once (ZIP)'}
          </p>
        </div>

        <div className="batch-content">
          <div className="template-list">
            {templates.map(template => (
              <div
                key={template.id}
                className={`template-item ${selectedTemplates.has(template.id) ? 'selected' : ''}`}
                onClick={() => toggleTemplate(template.id)}
              >
                <input
                  type="checkbox"
                  checked={selectedTemplates.has(template.id)}
                  onChange={() => {}}
                  className="template-checkbox"
                />
                <div className="template-info">
                  <div className="template-name">{template.name}</div>
                  <div className="template-type">
                    {template.type === 'presentation' ? '🎨 Presentation' : '📄 Document'}
                  </div>
                </div>
                {selectedTemplates.has(template.id) && (
                  <Check size={20} className="check-icon" />
                )}
              </div>
            ))}
          </div>

          <div className="batch-stats">
            <div className="stat">
              <span className="stat-label">
                {language === 'ko' ? '선택됨:' : 'Selected:'}
              </span>
              <span className="stat-value">{selectedTemplates.size} / {templates.length}</span>
            </div>
          </div>

          <div className="batch-info">
            <AlertCircle size={16} />
            <p>{language === 'ko'
              ? '모든 선택된 템플릿이 ZIP 파일로 함께 다운로드됩니다'
              : 'All selected templates will be downloaded together as a ZIP file'}</p>
          </div>
        </div>

        <div className="batch-footer">
          <button className="btn-cancel" onClick={onClose}>
            {language === 'ko' ? '취소' : 'Cancel'}
          </button>
          <button
            className="btn-download-batch"
            onClick={handleBatchDownload}
            disabled={isDownloading || selectedTemplates.size === 0}
          >
            <Download size={18} />
            {isDownloading
              ? language === 'ko' ? '다운로드 중...' : 'Downloading...'
              : language === 'ko' ? `${selectedTemplates.size}개 다운로드` : `Download ${selectedTemplates.size}`}
          </button>
        </div>
      </div>
    </div>
  );
};
