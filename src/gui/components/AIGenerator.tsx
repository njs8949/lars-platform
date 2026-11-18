import React, { useState } from 'react';
import { X, Zap, Send } from 'lucide-react';
import '../styles/AIGenerator.css';

interface AIGeneratorProps {
  isOpen: boolean;
  templateType: 'presentation' | 'document';
  templateName: string;
  onClose: () => void;
  onGenerate: (params: any) => void;
  language?: string;
}

export const AIGenerator: React.FC<AIGeneratorProps> = ({
  isOpen,
  templateType,
  templateName,
  onClose,
  onGenerate,
  language = 'ko'
}) => {
  const [topic, setTopic] = useState('');
  const [details, setDetails] = useState('');
  const [audience, setAudience] = useState('General');
  const [style, setStyle] = useState('professional');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = () => {
    if (!topic.trim()) {
      alert(language === 'ko' ? '주제를 입력해주세요' : 'Please enter a topic');
      return;
    }

    setIsGenerating(true);

    const params = {
      topic,
      details,
      audience,
      style
    };

    onGenerate(params);
    setIsGenerating(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="ai-generator-overlay" onClick={onClose}>
      <div className="ai-generator-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ai-generator-header">
          <div className="header-title">
            <Zap size={24} className="zap-icon" />
            <h2>{language === 'ko' ? 'AI로 콘텐츠 생성' : 'Generate with AI'}</h2>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="ai-generator-content">
          {/* Topic */}
          <div className="ai-section">
            <label className="ai-label">
              {language === 'ko' ? '주제 (필수)' : 'Topic (Required)'}
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder={language === 'ko'
                ? '예: 2026년 비즈니스 전략, 마케팅 계획'
                : 'e.g., Business Strategy 2026, Marketing Plan'}
              className="ai-input-text"
            />
          </div>

          {/* Details */}
          <div className="ai-section">
            <label className="ai-label">
              {language === 'ko' ? '상세 설명' : 'Details'}
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder={language === 'ko'
                ? '주제에 대한 추가 정보를 입력하세요'
                : 'Provide additional context...'}
              className="ai-input-textarea"
              rows={4}
            />
          </div>

          {/* Audience */}
          <div className="ai-section">
            <label className="ai-label">
              {language === 'ko' ? '대상 청중' : 'Target Audience'}
            </label>
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              className="ai-select"
            >
              <option value="General">{language === 'ko' ? '일반' : 'General'}</option>
              <option value="Executive">{language === 'ko' ? '경영진' : 'Executive'}</option>
              <option value="Technical">{language === 'ko' ? '기술팀' : 'Technical'}</option>
              <option value="Sales">{language === 'ko' ? '영업팀' : 'Sales'}</option>
              <option value="Marketing">{language === 'ko' ? '마케팅팀' : 'Marketing'}</option>
              <option value="Investors">{language === 'ko' ? '투자자' : 'Investors'}</option>
            </select>
          </div>

          {/* Style */}
          <div className="ai-section">
            <label className="ai-label">
              {language === 'ko' ? '스타일' : 'Style'}
            </label>
            <div className="style-buttons">
              {['professional', 'creative', 'modern'].map(s => (
                <button
                  key={s}
                  className={`style-btn ${style === s ? 'active' : ''}`}
                  onClick={() => setStyle(s)}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="ai-info">
            <p className="info-text">
              {language === 'ko'
                ? '✨ AI가 주제에 맞는 전문적인 콘텐츠를 자동으로 생성합니다'
                : '✨ AI will automatically generate professional content based on your topic'}
            </p>
          </div>
        </div>

        <div className="ai-generator-footer">
          <button className="btn-cancel" onClick={onClose}>
            {language === 'ko' ? '취소' : 'Cancel'}
          </button>
          <button
            className="btn-generate-ai"
            onClick={handleGenerate}
            disabled={isGenerating || !topic.trim()}
          >
            <Send size={18} />
            {isGenerating
              ? language === 'ko' ? '생성 중...' : 'Generating...'
              : language === 'ko' ? 'AI로 생성' : 'Generate'}
          </button>
        </div>
      </div>
    </div>
  );
};
