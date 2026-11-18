import React, { useEffect, useState } from 'react';
import { Palette } from 'lucide-react';

const EXPECTED_MS = 90_000;
const PROGRESS_CAP = 95;

const stageLabel = (percent: number) => {
  if (percent < 30) return '프롬프트 분석 중';
  if (percent < 70) return '이미지 생성 중';
  if (percent < PROGRESS_CAP) return '마무리 처리 중';
  return '최종 확인 중';
};

export const ImageGenerationProgress: React.FC<{ startedAt: number; prompt: string }> = ({ startedAt, prompt }) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, []);

  const elapsed = Math.max(0, now - startedAt);
  const percent = Math.min(PROGRESS_CAP, Math.round(PROGRESS_CAP * (1 - Math.exp(-elapsed / (EXPECTED_MS / 3)))));

  return (
    <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(100, 108, 255, 0.08)', border: '1px solid rgba(100, 108, 255, 0.25)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
        <div className="spinner-small" />
        <Palette size={16} style={{ color: '#a78bfa' }} />
        <strong style={{ color: '#fff' }}>이미지 제작 중</strong>
      </div>
      <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '8px', wordBreak: 'keep-all' }}>{prompt}</div>
      <div style={{ height: '8px', borderRadius: '4px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <div style={{ width: `${percent}%`, height: '100%', background: 'linear-gradient(90deg, #646cff, #a78bfa)', transition: 'width 0.3s ease' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '13px', color: 'var(--text-main)' }}>
        <span>예상 진행률 {percent}% · {stageLabel(percent)}</span>
        <span style={{ color: 'var(--text-dim)' }}>{Math.floor(elapsed / 1000)}초 경과</span>
      </div>
      <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-dim)' }}>
        고품질 이미지는 1~2분 정도 걸릴 수 있습니다. 완료되면 자동으로 표시됩니다.
      </div>
    </div>
  );
};

export default ImageGenerationProgress;
