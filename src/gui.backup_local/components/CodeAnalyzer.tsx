import React, { useState } from 'react';
import { analyzeCode, CodeAnalysisResponse } from '../lib/ai';
import { Loader, Copy, AlertCircle } from 'lucide-react';
import './Generator.css';

interface CodeAnalyzerProps {
  language?: 'ko' | 'en';
  onClose?: () => void;
}

export const CodeAnalyzer: React.FC<CodeAnalyzerProps> = ({ language = 'ko', onClose }) => {
  const [code, setCode] = useState('');
  const [analysisType, setAnalysisType] = useState<
    'bugs' | 'improvements' | 'security' | 'performance' | 'general'
  >('general');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<CodeAnalysisResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const analysisTypes = {
    general: language === 'ko' ? '일반 분석' : 'General Analysis',
    bugs: language === 'ko' ? '버그 찾기' : 'Bug Detection',
    improvements: language === 'ko' ? '개선 제안' : 'Improvements',
    security: language === 'ko' ? '보안 분석' : 'Security Analysis',
    performance: language === 'ko' ? '성능 최적화' : 'Performance Optimization',
  };

  const handleAnalyze = async () => {
    if (!code.trim()) {
      setError(language === 'ko' ? '코드를 입력하세요' : 'Please enter code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await analyzeCode(code, analysisType, language);
      setResult(response.analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
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

  return (
    <div className="generator-container">
      {!result ? (
        <div className="generator-form">
          <h2>{language === 'ko' ? '💻 코드 분석' : '💻 Code Analyzer'}</h2>

          <div className="form-row">
            <div className="form-group">
              <label>{language === 'ko' ? '분석 유형' : 'Analysis Type'}</label>
              <select
                value={analysisType}
                onChange={(e) => setAnalysisType(e.target.value as any)}
              >
                {Object.entries(analysisTypes).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>{language === 'ko' ? '언어' : 'Language'}</label>
              <select value={language} disabled>
                <option value="ko">한국어</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>{language === 'ko' ? '코드' : 'Code'}</label>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={language === 'ko' ? '분석할 코드를 붙여넣기...' : 'Paste code to analyze...'}
              rows={10}
              style={{ fontFamily: "'Fira Code', monospace" }}
            />
          </div>

          {error && (
            <div className="error-message">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div className="form-actions">
            <button className="btn-generate" onClick={handleAnalyze} disabled={loading}>
              {loading ? (
                <>
                  <Loader size={16} className="spin" />
                  {language === 'ko' ? '분석 중...' : 'Analyzing...'}
                </>
              ) : (
                language === 'ko' ? '💻 코드 분석' : '💻 Analyze'
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
          <h2>{language === 'ko' ? '코드 분석 결과' : 'Analysis Results'}</h2>

          <div className="result-info">
            <span className="badge">
              {analysisTypes[result.analysis_type as keyof typeof analysisTypes]}
            </span>
            <span className="badge">{result.tokens_used} tokens</span>
          </div>

          <div className="result-content">
            <pre>{result.content}</pre>
          </div>

          <div className="result-actions">
            <button className="btn-action" onClick={handleCopy}>
              <Copy size={16} />
              {copied ? (language === 'ko' ? '복사됨!' : 'Copied!') : (language === 'ko' ? '복사' : 'Copy')}
            </button>

            <button
              className="btn-new"
              onClick={() => {
                setResult(null);
                setCode('');
                setError('');
              }}
            >
              {language === 'ko' ? '새로 분석' : 'New Analysis'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
