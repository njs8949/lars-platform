import React, { useEffect, useState } from 'react';

const PROGRESS_CAP = 95;

// 발표 자료, 심층 리서치처럼 몇 분 걸리는 작업의 진행 표시. 실제 진행률을 알 수 없으므로 예상 시간 기준으로 보여 준다.
export const ToolGenerationProgress: React.FC<{
  title: string;
  icon: React.ReactNode;
  startedAt: number;
  detail: string;
  expectedMs: number;
  stages: [string, string, string, string];
  note: string;
}> = ({ title, icon, startedAt, detail, expectedMs, stages, note }) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, []);

  const elapsed = Math.max(0, now - startedAt);
  const percent = Math.min(PROGRESS_CAP, Math.round(PROGRESS_CAP * (1 - Math.exp(-elapsed / (expectedMs / 3)))));
  const stage = percent < 25 ? stages[0] : percent < 55 ? stages[1] : percent < 85 ? stages[2] : stages[3];

  return (
    <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(100, 108, 255, 0.08)', border: '1px solid rgba(100, 108, 255, 0.25)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
        <div className="spinner-small" />
        <span style={{ display: 'inline-flex', color: '#a78bfa' }}>{icon}</span>
        <strong style={{ color: '#fff' }}>{title}</strong>
      </div>
      <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '8px', wordBreak: 'keep-all' }}>{detail}</div>
      <div style={{ height: '8px', borderRadius: '4px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <div style={{ width: `${percent}%`, height: '100%', background: 'linear-gradient(90deg, #646cff, #a78bfa)', transition: 'width 0.3s ease' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '13px', color: 'var(--text-main)' }}>
        <span>예상 진행률 {percent}% · {stage}</span>
        <span style={{ color: 'var(--text-dim)' }}>{Math.floor(elapsed / 1000)}초 경과</span>
      </div>
      <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-dim)' }}>{note}</div>
    </div>
  );
};

export default ToolGenerationProgress;
