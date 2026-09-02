import React, { useState } from 'react';
import { Loader, Download, AlertCircle, RefreshCw } from 'lucide-react';
import './Generator.css';

interface ImageGeneratorProps {
  language?: 'ko' | 'en';
  onClose?: () => void;
}

export const ImageGenerator: React.FC<ImageGeneratorProps> = ({ language = 'ko', onClose }) => {
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('realistic');
  const [size, setSize] = useState('512x512');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const styles = {
    realistic: language === 'ko' ? '현실적' : 'Realistic',
    anime: language === 'ko' ? '애니메이션' : 'Anime',
    oil_painting: language === 'ko' ? '유화' : 'Oil Painting',
    watercolor: language === 'ko' ? '수채화' : 'Watercolor',
    digital_art: language === 'ko' ? '디지털 아트' : 'Digital Art',
    photorealistic: language === 'ko' ? '초현실적' : 'Photorealistic',
  };

  const sizes = ['512x512', '768x768', '1024x1024'];

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError(language === 'ko' ? '프롬프트를 입력하세요' : 'Please enter a prompt');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // TODO: Integrate with Stability AI or OpenAI DALL-E
      // For now, show a placeholder message
      setError(
        language === 'ko'
          ? '이미지 생성 기능은 곧 제공됩니다. Stability AI 또는 OpenAI DALL-E 통합 예정'
          : 'Image generation coming soon. Stability AI or OpenAI DALL-E integration planned'
      );

      // Mock response for demonstration
      setImageUrl(
        'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="512" height="512"%3E%3Crect fill="%23333" width="512" height="512"/%3E%3Ctext x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%23fff" font-size="24" font-family="Arial"%3E[Image Generation Coming Soon]%3C/text%3E%3C/svg%3E'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (imageUrl) {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = `generated-image-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="generator-container">
      {!imageUrl ? (
        <div className="generator-form">
          <h2>{language === 'ko' ? '🎨 이미지 생성' : '🎨 Image Generator'}</h2>

          <div className="form-group">
            <label>{language === 'ko' ? '프롬프트' : 'Prompt'}</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                language === 'ko'
                  ? '예: 푸른 하늘과 산을 배경으로 한 판타지 성...'
                  : 'e.g., A fantasy castle with blue sky and mountains...'
              }
              rows={6}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>{language === 'ko' ? '스타일' : 'Style'}</label>
              <select value={style} onChange={(e) => setStyle(e.target.value)}>
                {Object.entries(styles).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>{language === 'ko' ? '크기' : 'Size'}</label>
              <select value={size} onChange={(e) => setSize(e.target.value)}>
                {sizes.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
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
                language === 'ko' ? '🎨 이미지 생성' : '🎨 Generate'
              )}
            </button>
            {onClose && (
              <button className="btn-cancel" onClick={onClose}>
                {language === 'ko' ? '닫기' : 'Close'}
              </button>
            )}
          </div>

          <div
            style={{
              padding: '12px',
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '8px',
              color: '#60a5fa',
              fontSize: '12px',
              marginTop: '16px',
            }}
          >
            ℹ️{' '}
            {language === 'ko'
              ? 'Stability AI 또는 OpenAI DALL-E와 통합될 예정입니다.'
              : 'Will integrate with Stability AI or OpenAI DALL-E.'}
          </div>
        </div>
      ) : (
        <div className="generator-result">
          <h2>{language === 'ko' ? '생성된 이미지' : 'Generated Image'}</h2>

          <div style={{ marginBottom: '20px' }}>
            <img
              src={imageUrl}
              alt="Generated"
              style={{
                maxWidth: '100%',
                maxHeight: '400px',
                borderRadius: '8px',
                border: '1px solid rgba(71, 85, 105, 0.3)',
              }}
            />
          </div>

          <div style={{ marginBottom: '12px', fontSize: '13px', color: '#cbd5e1' }}>
            <strong>{language === 'ko' ? '프롬프트:' : 'Prompt:'}</strong>
            <p style={{ marginTop: '6px', whiteSpace: 'pre-wrap' }}>{prompt}</p>
          </div>

          <div className="result-actions">
            <button className="btn-action" onClick={handleDownload}>
              <Download size={16} />
              {language === 'ko' ? '다운로드' : 'Download'}
            </button>

            <button
              className="btn-new"
              onClick={() => {
                setImageUrl(null);
                setPrompt('');
                setError('');
              }}
            >
              <RefreshCw size={16} />
              {language === 'ko' ? '새로 생성' : 'Generate New'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
