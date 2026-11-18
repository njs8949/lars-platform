import React, { useState, useEffect } from 'react';
import { Download, Palette } from 'lucide-react';
import './RekoraImageGenerator.css';

interface RekoraImageGeneratorProps {
  prompt: string;
  onImageGenerated?: (imageUrl: string) => void;
}

interface GeneratedImage {
  id: string;
  prompt: string;
  model: string;
  image_url: string;
  size: string;
}

const getApiUrl = () =>
  window.location.hostname === 'localhost' ? 'http://localhost:8001/api' : '/api';

const resolveImageUrl = (url: string) =>
  url.startsWith('/') ? `${getApiUrl().replace(/\/api$/, '')}${url}` : url;

export const RekoraImageGenerator: React.FC<RekoraImageGeneratorProps> = ({
  prompt,
  onImageGenerated
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [image, setImage] = useState<GeneratedImage | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!prompt) return;
    let cancelled = false;

    const generateImage = async () => {
      setIsGenerating(true);
      setError('');
      setImage(null);

      try {
        const response = await fetch(`${getApiUrl()}/image/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, model: 'dalle', quality: 'hd' })
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.detail || `HTTP ${response.status}`);
        }
        if (cancelled) return;
        setImage(data.image);
        onImageGenerated?.(resolveImageUrl(data.image.image_url));
      } catch (err) {
        if (!cancelled) setError(`이미지 생성 실패: ${(err as Error).message}`);
      } finally {
        if (!cancelled) setIsGenerating(false);
      }
    };

    generateImage();
    return () => {
      cancelled = true;
    };
  }, [prompt, onImageGenerated]);

  return (
    <div className="rekora-image-generator">
      {isGenerating && (
        <div className="generating-overlay">
          <div className="spinner" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Palette size={16} style={{ color: '#a78bfa' }} />이미지 생성 중...</div>
        </div>
      )}

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      {image && (
        <div className="image-container">
          <div className="svg-wrapper">
            <img src={resolveImageUrl(image.image_url)} alt={image.prompt} style={{ maxWidth: '100%', borderRadius: '8px' }} />
          </div>

          <div className="image-info">
            <div className="info-header">
              <span className="icon"><Palette size={16} style={{ color: '#a78bfa' }} /></span>
              <span className="title">AI 생성 이미지</span>
            </div>

            <div className="info-grid">
              <div className="info-item">
                <span className="label">모델:</span>
                <span className="value">{image.model}</span>
              </div>
              <div className="info-item">
                <span className="label">크기:</span>
                <span className="value">{image.size}</span>
              </div>
              <div className="info-item">
                <span className="label">프롬프트:</span>
                <span className="value" style={{ fontSize: '11px' }}>{image.prompt}</span>
              </div>
            </div>

            <div className="info-actions">
              <a className="action-btn download-btn" href={resolveImageUrl(image.image_url)} target="_blank" rel="noreferrer" download>
                <Download size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} />다운로드
              </a>
            </div>
          </div>
        </div>
      )}

      {!image && !isGenerating && !error && prompt && (
        <div className="empty-state">
          <span className="empty-icon"><Palette size={28} style={{ color: '#a78bfa' }} /></span>
          <p>이미지 생성 준비 중...</p>
        </div>
      )}
    </div>
  );
};

export default RekoraImageGenerator;
