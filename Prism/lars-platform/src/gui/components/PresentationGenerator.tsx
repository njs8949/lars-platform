import React, { useState } from 'react';
import { generatePresentation, downloadJSON, PresentationResponse } from '../lib/ai';
import { Loader, Download, Copy, AlertCircle } from 'lucide-react';
import './Generator.css';

interface PresentationGeneratorProps {
  language?: 'ko' | 'en';
  onClose?: () => void;
}

export const PresentationGenerator: React.FC<PresentationGeneratorProps> = ({
  language = 'ko',
  onClose,
}) => {
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [numSlides, setNumSlides] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<PresentationResponse | null>(null);
  const [copiedSlide, setCopiedSlide] = useState<number | null>(null);

  const handleGenerate = async () => {
    if (!title.trim() || !topic.trim()) {
      setError(language === 'ko' ? '제목과 주제를 입력하세요' : 'Please enter title and topic');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await generatePresentation(title, topic, numSlides, language);
      setResult(response.presentation);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCopySlide = (slideNum: number, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedSlide(slideNum);
    setTimeout(() => setCopiedSlide(null), 2000);
  };

  const handleDownload = () => {
    if (result) {
      downloadJSON(`${title || 'presentation'}-slides.json`, result);
    }
  };

  return (
    <div className="generator-container">
      {!result ? (
        <div className="generator-form">
          <h2>{language === 'ko' ? '📊 프리젠테이션 생성' : '📊 Presentation Generator'}</h2>

          <div className="form-group">
            <label>{language === 'ko' ? '프리젠테이션 제목' : 'Presentation Title'}</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={language === 'ko' ? '예: 2024년 사업 전략' : 'e.g., 2024 Business Strategy'}
            />
          </div>

          <div className="form-group">
            <label>{language === 'ko' ? '주제/내용' : 'Topic/Content'}</label>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder={
                language === 'ko'
                  ? '예: 시장 분석, 신제품 출시 전략, ROI 예측을 포함한 프리젠테이션'
                  : 'e.g., Market analysis, new product launch strategy, ROI projections'
              }
              rows={4}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>{language === 'ko' ? '슬라이드 수' : 'Number of Slides'}</label>
              <select value={numSlides} onChange={(e) => setNumSlides(Number(e.target.value))}>
                {[5, 10, 15, 20, 30].map((num) => (
                  <option key={num} value={num}>
                    {num} {language === 'ko' ? '개' : 'slides'}
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

          {error && (
            <div className="error-message">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div className="form-actions">
            <button className="btn-generate" onClick={handleGenerate} disabled={loading}>
              {loading ? (
                <>
                  <Loader size={16} className="spin" />
                  {language === 'ko' ? '생성 중...' : 'Generating...'}
                </>
              ) : (
                language === 'ko' ? '📊 프리젠테이션 생성' : '📊 Generate'
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
            <span className="badge">{result.num_slides} Slides</span>
            <span className="badge">{result.tokens_used} tokens</span>
          </div>

          <div className="slides-container">
            {result.slides.map((slide) => (
              <div key={slide.slide_num} className="slide-card">
                <div className="slide-header">
                  <h3>{`Slide ${slide.slide_num}: ${slide.title}`}</h3>
                  <button
                    className="btn-copy-slide"
                    onClick={() => handleCopySlide(slide.slide_num, slide.content)}
                    title={language === 'ko' ? '복사' : 'Copy'}
                  >
                    {copiedSlide === slide.slide_num ? (
                      language === 'ko' ? '✓ 복사됨' : '✓ Copied'
                    ) : (
                      <Copy size={14} />
                    )}
                  </button>
                </div>

                <div className="slide-content">
                  <p>{slide.content}</p>
                </div>

                <div className="slide-notes">
                  <strong>{language === 'ko' ? '발표자 노트:' : 'Speaker Notes:'}</strong>
                  <p>{slide.speaker_notes}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="result-actions">
            <button className="btn-action" onClick={handleDownload} title="JSON 형식으로 다운로드">
              <Download size={16} />
              {language === 'ko' ? 'JSON 다운로드' : 'Download JSON'}
            </button>

            <button
              className="btn-new"
              onClick={() => {
                setResult(null);
                setTitle('');
                setTopic('');
                setError('');
              }}
            >
              {language === 'ko' ? '새로 만들기' : 'New Presentation'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
