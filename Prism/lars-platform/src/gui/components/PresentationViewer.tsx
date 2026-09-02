import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw, Download, Edit2 } from 'lucide-react';
import './PresentationViewer.css';

interface Slide {
  order: number;
  title: string;
  content: string;
  bullets: string[];
  visual?: string;
}

interface PresentationViewerProps {
  slides: Slide[];
  onRegenerateSlide?: (slideIndex: number) => void;
  onDownloadPPTX?: () => void;
}

const PresentationViewer: React.FC<PresentationViewerProps> = ({
  slides,
  onRegenerateSlide,
  onDownloadPPTX,
}) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  if (!slides || slides.length === 0) {
    return <div className="presentation-viewer-empty">슬라이드가 없습니다.</div>;
  }

  const currentSlide = slides[currentSlideIndex];

  const goToNextSlide = () => {
    if (currentSlideIndex < slides.length - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1);
    }
  };

  const goToPreviousSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(currentSlideIndex - 1);
    }
  };

  const slideNumber = currentSlideIndex + 1;
  const totalSlides = slides.length;
  const progress = (slideNumber / totalSlides) * 100;

  return (
    <div className="presentation-viewer">
      {/* 메인 슬라이드 */}
      <div className="slide-display">
        <div className="slide-card">
          {/* 헤더 */}
          <div className="slide-header">
            <h2>{currentSlide.title}</h2>
            <div className="slide-meta">슬라이드 {slideNumber}/{totalSlides}</div>
          </div>

          {/* 콘텐츠 */}
          <div className="slide-content">
            {currentSlide.content && <p className="main-content">{currentSlide.content}</p>}

            {currentSlide.bullets && currentSlide.bullets.length > 0 && (
              <ul className="bullet-points">
                {currentSlide.bullets.map((bullet, idx) => (
                  <li key={idx}>
                    <span className="bullet-marker">▸</span>
                    {bullet}
                  </li>
                ))}
              </ul>
            )}

            {currentSlide.visual && (
              <div className="visual-placeholder">
                <div className="visual-icon">📊</div>
                <p>{currentSlide.visual}</p>
              </div>
            )}
          </div>

          {/* 푸터 */}
          <div className="slide-footer">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* 컨트롤 패널 */}
      <div className="controls-panel">
        {/* 네비게이션 */}
        <div className="navigation">
          <button
            className="nav-button"
            onClick={goToPreviousSlide}
            disabled={currentSlideIndex === 0}
            title="이전 슬라이드"
          >
            <ChevronLeft size={20} />
          </button>

          <span className="slide-counter">{slideNumber}/{totalSlides}</span>

          <button
            className="nav-button"
            onClick={goToNextSlide}
            disabled={currentSlideIndex === slides.length - 1}
            title="다음 슬라이드"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* 액션 버튼 */}
        <div className="action-buttons">
          {onRegenerateSlide && (
            <button
              className="action-button regenerate"
              onClick={() => onRegenerateSlide(currentSlideIndex)}
              title="이 슬라이드 다시 작성"
            >
              <RotateCcw size={16} />
              다시 작성
            </button>
          )}

          {onDownloadPPTX && (
            <button
              className="action-button download"
              onClick={onDownloadPPTX}
              title="PPTX 파일 다운로드"
            >
              <Download size={16} />
              다운로드
            </button>
          )}
        </div>
      </div>

      {/* 썸네일 스트립 */}
      <div className="thumbnails">
        <div className="thumbnails-scroll">
          {slides.map((slide, idx) => (
            <div
              key={idx}
              className={`thumbnail ${idx === currentSlideIndex ? 'active' : ''}`}
              onClick={() => setCurrentSlideIndex(idx)}
              title={slide.title}
            >
              <div className="thumbnail-number">{idx + 1}</div>
              <div className="thumbnail-title">{slide.title.substring(0, 15)}...</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PresentationViewer;
