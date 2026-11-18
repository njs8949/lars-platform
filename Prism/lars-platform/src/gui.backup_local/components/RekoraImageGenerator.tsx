import React, { useState, useEffect } from 'react';
import { larsImageGenerator } from '../../lib/larsImageGenerator';
import './RekoraImageGenerator.css';

interface RekoraImageGeneratorProps {
  prompt: string;
  onImageGenerated?: (imageUrl: string) => void;
}

export const RekoraImageGenerator: React.FC<RekoraImageGeneratorProps> = ({
  prompt,
  onImageGenerated
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [svgContent, setSvgContent] = useState<string>('');
  const [imageInfo, setImageInfo] = useState<any>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!prompt) return;

    const generateImage = async () => {
      setIsGenerating(true);
      setError('');

      try {
        const { generateAdvancedImage } = await import('../../lib/larsImageGenerator');
        const result = await generateAdvancedImage(prompt);
        setSvgContent(result.svg);
        setImageInfo({
          style: result.style,
          category: result.category,
          description: result.description,
          width: result.width,
          height: result.height
        });

        // 콜백
        if (onImageGenerated) {
          onImageGenerated(result.svg);
        }
      } catch (err) {
        setError(`이미지 생성 실패: ${err}`);
      } finally {
        setIsGenerating(false);
      }
    };

    generateImage();
  }, [prompt, onImageGenerated]);

  return (
    <div className="rekora-image-generator">
      {isGenerating && (
        <div className="generating-overlay">
          <div className="spinner">🎨 이미지 생성 중...</div>
        </div>
      )}

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      {svgContent && (
        <div className="image-container">
          <div className="svg-wrapper">
            <div
              dangerouslySetInnerHTML={{ __html: svgContent }}
              className="svg-render"
            />
          </div>

          {imageInfo && (
            <div className="image-info">
              <div className="info-header">
                <span className="icon">🎨</span>
                <span className="title">Rekora 생성 이미지</span>
              </div>

              <div className="info-grid">
                <div className="info-item">
                  <span className="label">스타일:</span>
                  <span className="value">{imageInfo.style}</span>
                </div>

                <div className="info-item">
                  <span className="label">분류:</span>
                  <span className="value">{imageInfo.category === '3d' ? '3D' : '2D'}</span>
                </div>

                <div className="info-item">
                  <span className="label">크기:</span>
                  <span className="value">
                    {imageInfo.width}×{imageInfo.height}px
                  </span>
                </div>

                <div className="info-item">
                  <span className="label">설명:</span>
                  <span className="value" style={{ fontSize: '11px' }}>{imageInfo.description}</span>
                </div>
              </div>

              <div className="info-actions">
                <button className="action-btn download-btn" title="SVG 다운로드">
                  📥 SVG
                </button>
                <button className="action-btn copy-btn" title="SVG 복사">
                  📋 복사
                </button>
                <button className="action-btn share-btn" title="공유">
                  📤 공유
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {!svgContent && !isGenerating && prompt && (
        <div className="empty-state">
          <span className="empty-icon">🎨</span>
          <p>이미지 생성 준비 중...</p>
        </div>
      )}
    </div>
  );
};

export default RekoraImageGenerator;
