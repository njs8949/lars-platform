import React, { useState } from 'react';
import { generateDocument, downloadMarkdown, DocumentResponse } from '../lib/ai';
import { Loader, Download, Copy, AlertCircle } from 'lucide-react';
import './Generator.css';

interface DocumentGeneratorProps {
  onClose?: () => void;
}

export const DocumentGenerator: React.FC<DocumentGeneratorProps> = ({ onClose }) => {
  const [title, setTitle] = useState('');
  const [contentType, setContentType] = useState<'report' | 'memo' | 'proposal' | 'summary' | 'email'>('report');
  const [prompt, setPrompt] = useState('');
  const [language, setLanguage] = useState<'ko' | 'en'>('ko');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<DocumentResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const contentTypes = {
    report: language === 'ko' ? '보고서' : 'Report',
    memo: language === 'ko' ? '메모' : 'Memo',
    proposal: language === 'ko' ? '제안서' : 'Proposal',
    summary: language === 'ko' ? '요약' : 'Summary',
    email: language === 'ko' ? '이메일' : 'Email',
  };

  const handleGenerate = async () => {
    if (!title.trim() || !prompt.trim()) {
      setError(language === 'ko' ? '제목과 내용을 입력하세요' : 'Please enter title and content');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await generateDocument(title, contentType, prompt, language);
      setResult(response.document);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (result?.content) {
      navigator.clipboard.writeText(result.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (result?.content) {
      downloadMarkdown(`${title || 'document'}.md`, result.content);
    }
  };

  return (
    <div className="generator-container">
      {!result ? (
        <div className="generator-form">
          <h2>{language === 'ko' ? '📝 문서 생성' : '📝 Document Generator'}</h2>

          <div className="form-group">
            <label>{language === 'ko' ? '문서 제목' : 'Document Title'}</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={language === 'ko' ? '예: 분기별 보고서' : 'e.g., Quarterly Report'}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>{language === 'ko' ? '문서 유형' : 'Document Type'}</label>
              <select value={contentType} onChange={(e) => setContentType(e.target.value as any)}>
                {Object.entries(contentTypes).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>{language === 'ko' ? '언어' : 'Language'}</label>
              <select value={language} onChange={(e) => setLanguage(e.target.value as 'ko' | 'en')}>
                <option value="ko">한국어</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>{language === 'ko' ? '내용 요청' : 'Content Request'}</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                language === 'ko'
                  ? '예: 2024년 상반기 매출 분석, 주요 성과, 향후 계획을 포함해줘'
                  : 'e.g., Include H1 2024 sales analysis, key achievements, and future plans'
              }
              rows={6}
            />
          </div>

          {error && (
            <div className="error-message">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div className="form-actions">
            <button
              className="btn-generate"
              onClick={handleGenerate}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader size={16} className="spin" />
                  {language === 'ko' ? '생성 중...' : 'Generating...'}
                </>
              ) : (
                language === 'ko' ? '📄 문서 생성' : '📄 Generate'
              )}
            </button>
            {onClose && (
              <button className="btn-cancel" onClick={onClose}>
                {language === 'ko' ? '닫기' : 'Close'}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="generator-result">
          <h2>{result.title}</h2>

          <div className="result-info">
            <span className="badge">{contentTypes[result.type as keyof typeof contentTypes]}</span>
            <span className="badge">{result.tokens_used} tokens</span>
          </div>

          <div className="result-content">
            <pre>{result.content}</pre>
          </div>

          <div className="result-actions">
            <button
              className="btn-action"
              onClick={handleCopy}
              title={language === 'ko' ? '클립보드에 복사' : 'Copy to clipboard'}
            >
              <Copy size={16} />
              {copied ? (language === 'ko' ? '복사됨!' : 'Copied!') : (language === 'ko' ? '복사' : 'Copy')}
            </button>

            <button
              className="btn-action"
              onClick={handleDownload}
              title={language === 'ko' ? 'Markdown 파일로 다운로드' : 'Download as Markdown'}
            >
              <Download size={16} />
              {language === 'ko' ? '다운로드' : 'Download'}
            </button>

            <button
              className="btn-new"
              onClick={() => {
                setResult(null);
                setTitle('');
                setPrompt('');
                setError('');
              }}
            >
              {language === 'ko' ? '새로 만들기' : 'New Document'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
