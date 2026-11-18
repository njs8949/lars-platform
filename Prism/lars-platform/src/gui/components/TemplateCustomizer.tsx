import React, { useState } from 'react';
import { X, Palette, Type, Zap } from 'lucide-react';
import '../styles/TemplateCustomizer.css';

interface TemplateCustomizerProps {
  isOpen: boolean;
  templateType: 'presentation' | 'document';
  templateName: string;
  onClose: () => void;
  onGenerate: (customization: any) => void;
  language?: string;
}

export const TemplateCustomizer: React.FC<TemplateCustomizerProps> = ({
  isOpen,
  templateType,
  templateName,
  onClose,
  onGenerate,
  language = 'ko'
}) => {
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#646cff');
  const [secondaryColor, setSecondaryColor] = useState('#a855f7');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = () => {
    setIsGenerating(true);

    const customization = {
      title: title || undefined,
      subtitle: subtitle || undefined,
      colors: {
        primary: hexToRgb(primaryColor),
        secondary: hexToRgb(secondaryColor)
      },
      palette: detectPalette(primaryColor)
    };

    onGenerate(customization);
    setIsGenerating(false);
    onClose();
  };

  const hexToRgb = (hex: string): [number, number, number] => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : [100, 116, 255];
  };

  const detectPalette = (color: string): string => {
    // Detect palette type based on primary color
    const palettes: { [key: string]: string } = {
      '646cff': 'corporate',
      'e67e22': 'creative',
      '16bcbc': 'modern',
      '2c3e50': 'elegant',
      'e74c3c': 'startup'
    };
    return palettes[color.toLowerCase()] || 'corporate';
  };

  if (!isOpen) return null;

  return (
    <div className="customizer-overlay" onClick={onClose}>
      <div className="customizer-modal" onClick={(e) => e.stopPropagation()}>
        <div className="customizer-header">
          <h2>{language === 'ko' ? '템플릿 커스터마이징' : 'Customize Template'}</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="customizer-content">
          {/* Title Section */}
          <div className="customizer-section">
            <label className="section-label">
              <Type size={18} />
              {language === 'ko' ? '제목' : 'Title'}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={language === 'ko' ? '프리젠테이션 제목을 입력하세요' : 'Enter presentation title'}
              className="customizer-input"
            />
          </div>

          {/* Subtitle Section */}
          <div className="customizer-section">
            <label className="section-label">
              <Type size={18} />
              {language === 'ko' ? '부제목' : 'Subtitle'}
            </label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder={language === 'ko' ? '부제목을 입력하세요' : 'Enter subtitle'}
              className="customizer-input"
            />
          </div>

          {/* Color Customization */}
          <div className="customizer-section">
            <label className="section-label">
              <Palette size={18} />
              {language === 'ko' ? '색상' : 'Colors'}
            </label>
            <div className="color-grid">
              <div className="color-picker">
                <label>{language === 'ko' ? '주 색상' : 'Primary'}</label>
                <div className="color-input-group">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="color-input"
                  />
                  <span className="color-value">{primaryColor}</span>
                </div>
              </div>

              <div className="color-picker">
                <label>{language === 'ko' ? '보조 색상' : 'Secondary'}</label>
                <div className="color-input-group">
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="color-input"
                  />
                  <span className="color-value">{secondaryColor}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="customizer-preview">
            <div
              className="preview-box"
              style={{
                background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`
              }}
            >
              <p className="preview-title">{title || 'Title'}</p>
              <p className="preview-subtitle">{subtitle || 'Subtitle'}</p>
            </div>
          </div>
        </div>

        <div className="customizer-footer">
          <button className="btn-cancel" onClick={onClose}>
            {language === 'ko' ? '취소' : 'Cancel'}
          </button>
          <button
            className="btn-generate"
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            <Zap size={18} />
            {isGenerating
              ? language === 'ko' ? '생성 중...' : 'Generating...'
              : language === 'ko' ? '커스텀 다운로드' : 'Download Custom'}
          </button>
        </div>
      </div>
    </div>
  );
};
