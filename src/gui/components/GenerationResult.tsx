import React, { useState } from 'react';
import { Download, Copy, ExternalLink } from 'lucide-react';

interface GenerationResultProps {
  content: string;
  generationType: string;
  format: string;
  metadata?: Record<string, any>;
  language?: 'ko' | 'en';
}

const GenerationResult: React.FC<GenerationResultProps> = ({
  content,
  generationType,
  format,
  metadata,
  language = 'ko',
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `generated-${generationType}.${getFileExtension(format)}`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const getFileExtension = (fmt: string): string => {
    const extensions: Record<string, string> = {
      'docx': 'docx',
      'pdf': 'pdf',
      'markdown': 'md',
      'pptx': 'pptx',
      'html_slides': 'html',
      'python': 'py',
      'javascript': 'js',
      'typescript': 'ts',
      'html': 'html',
      'css': 'css',
      'png': 'png',
      'jpeg': 'jpg',
      'json': 'json',
      'csv': 'csv',
    };
    return extensions[fmt] || 'txt';
  };

  const getTypeIcon = (): string => {
    switch (generationType) {
      case 'document': return '📄';
      case 'presentation': return '📊';
      case 'code': return '💻';
      case 'image': return '🖼️';
      case 'analysis': return '📈';
      default: return '✨';
    }
  };

  const getTypeLabel = (): string => {
    const labels: Record<string, Record<string, string>> = {
      'ko': {
        'document': '문서',
        'presentation': '프레젠테이션',
        'code': '코드',
        'image': '이미지',
        'analysis': '분석',
        'chat': '채팅',
      },
      'en': {
        'document': 'Document',
        'presentation': 'Presentation',
        'code': 'Code',
        'image': 'Image',
        'analysis': 'Analysis',
        'chat': 'Chat',
      },
    };
    return labels[language || 'ko'][generationType] || generationType;
  };

  return (
    <div className="generation-result">
      <div className="result-header">
        <div className="result-type">
          <span className="type-icon">{getTypeIcon()}</span>
          <div className="type-info">
            <div className="type-label">{getTypeLabel()}</div>
            <div className="type-format">{format.toUpperCase()}</div>
          </div>
        </div>

        <div className="result-actions">
          <button
            className="action-btn"
            onClick={handleCopy}
            title={language === 'ko' ? '복사' : 'Copy'}
          >
            <Copy size={18} />
            {copied && <span className="copy-feedback">{language === 'ko' ? '복사됨' : 'Copied'}</span>}
          </button>
          <button
            className="action-btn"
            onClick={handleDownload}
            title={language === 'ko' ? '다운로드' : 'Download'}
          >
            <Download size={18} />
          </button>
        </div>
      </div>

      <div className="result-preview">
        {generationType === 'code' && (
          <pre className="code-preview"><code>{content.slice(0, 500)}</code></pre>
        )}
        {generationType === 'document' && (
          <div className="document-preview">{content.slice(0, 300)}...</div>
        )}
        {generationType === 'presentation' && (
          <div className="presentation-preview">
            <div className="slide-count">
              {content.split('---').length} {language === 'ko' ? '슬라이드' : 'slides'}
            </div>
          </div>
        )}
        {generationType === 'image' && (
          <div className="image-preview">
            <div className="image-placeholder">🖼️ {language === 'ko' ? '이미지 생성 중...' : 'Generating image...'}</div>
          </div>
        )}
        {generationType === 'analysis' && (
          <pre className="analysis-preview"><code>{content.slice(0, 300)}</code></pre>
        )}
        {generationType === 'chat' && (
          <div className="chat-preview">{content.slice(0, 300)}...</div>
        )}
      </div>

      {metadata && (
        <div className="result-metadata">
          <div className="meta-item">
            <span className="meta-label">{language === 'ko' ? '신뢰도' : 'Confidence'}</span>
            <span className="meta-value">{(metadata.confidence * 100).toFixed(0)}%</span>
          </div>
          {metadata.alternative_formats && metadata.alternative_formats.length > 0 && (
            <div className="meta-item">
              <span className="meta-label">{language === 'ko' ? '변환 가능' : 'Convert to'}</span>
              <span className="meta-value">{metadata.alternative_formats.join(', ').toUpperCase()}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GenerationResult;
