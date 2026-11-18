import React from 'react';
import type { Slide } from '../lib/presentationStream';

// 발표 자료가 만들어지는 동안 오른쪽에 떠 있는 미리보기 패널.
// 슬라이드가 완성되는 대로 한 장씩 아래에 붙는다.

interface Props {
  open: boolean;
  onToggle: () => void;
  status: string;
  title: string;
  slides: Slide[];
  total: number;
  finished: boolean;
  error: string | null;
  onOpenEditor?: () => void;
}

const panelStyle: React.CSSProperties = {
  position: 'fixed', top: 72, right: 0, bottom: 24, width: 380, zIndex: 900,
  display: 'flex', flexDirection: 'column', gap: 10, padding: 16, boxSizing: 'border-box',
  background: 'rgba(22, 14, 40, 0.96)', borderLeft: '1px solid rgba(216,180,254,0.3)',
  borderRadius: '14px 0 0 14px', color: '#e0e0e0', boxShadow: '-12px 0 30px rgba(0,0,0,0.35)',
};

const cardStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #2a1f47, #1b2440)', border: '1px solid rgba(216,180,254,0.25)',
  borderRadius: 10, padding: 12, animation: 'livePanelIn 0.35s ease-out',
};

function SlideBody({ slide }: { slide: Slide }) {
  const layout = slide.layout;
  if (layout === 'title') {
    return (<><div style={{ fontSize: 16, fontWeight: 700 }}>{slide.title}</div>
      {slide.subtitle && <div style={{ fontSize: 12, color: 'rgba(224,224,224,0.7)', marginTop: 4 }}>{slide.subtitle}</div>}</>);
  }
  if (layout === 'table_of_contents') {
    return (<ol style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.6 }}>
      {(slide.items || []).map((it: string, i: number) => <li key={i}>{it}</li>)}</ol>);
  }
  if (layout === 'stats') {
    return (<><div style={{ fontWeight: 600, marginBottom: 6 }}>{slide.title}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {(slide.stats || []).map((s: any, i: number) => (
          <div key={i} style={{ background: 'rgba(216,180,254,0.08)', borderRadius: 8, padding: 8 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#e9d5ff' }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'rgba(224,224,224,0.7)' }}>{s.label}</div>
          </div>))}
      </div></>);
  }
  if (layout === 'steps') {
    return (<><div style={{ fontWeight: 600, marginBottom: 6 }}>{slide.title}</div>
      {(slide.steps || []).map((s: any, i: number) => (
        <div key={i} style={{ fontSize: 12, marginBottom: 4 }}><b>{i + 1}. {s.title}</b> <span style={{ color: 'rgba(224,224,224,0.75)' }}>{s.text}</span></div>))}</>);
  }
  if (layout === 'columns') {
    return (<><div style={{ fontWeight: 600, marginBottom: 6 }}>{slide.title}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {(slide.columns || []).map((c: any, i: number) => (
          <div key={i}><div style={{ fontSize: 12, fontWeight: 700, color: '#e9d5ff' }}>{c.heading}</div>
            <ul style={{ margin: '4px 0 0', paddingLeft: 14, fontSize: 11 }}>{(c.bullets || []).map((b: string, j: number) => <li key={j}>{b}</li>)}</ul></div>))}
      </div></>);
  }
  if (layout === 'table') {
    const t = slide.table || {};
    return (<><div style={{ fontWeight: 600, marginBottom: 6 }}>{slide.title}</div>
      <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
        <thead><tr>{(t.header || []).map((h: string, i: number) => <th key={i} style={{ textAlign: 'left', padding: 3, color: '#e9d5ff' }}>{h}</th>)}</tr></thead>
        <tbody>{(t.rows || []).map((r: string[], i: number) => <tr key={i}>{r.map((v, j) => <td key={j} style={{ padding: 3, borderTop: '1px solid rgba(216,180,254,0.15)' }}>{v}</td>)}</tr>)}</tbody>
      </table></>);
  }
  if (layout === 'conclusion') {
    return (<><div style={{ fontWeight: 600, marginBottom: 6 }}>결론</div>
      <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12 }}>{(slide.key_points || []).map((k: string, i: number) => <li key={i}>{k}</li>)}</ul>
      {slide.call_to_action && <div style={{ fontSize: 12, marginTop: 6, color: '#e9d5ff' }}>{slide.call_to_action}</div>}</>);
  }
  // content (기본)
  return (<><div style={{ fontWeight: 600, marginBottom: 6 }}>{slide.title}</div>
    <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, lineHeight: 1.6 }}>{(slide.bullets || []).map((b: string, i: number) => <li key={i}>{b}</li>)}</ul></>);
}

export function LivePresentationPanel(props: Props) {
  const { open, onToggle, status, title, slides, total, finished, error, onOpenEditor } = props;
  if (!open) {
    return (
      <button onClick={onToggle} aria-label="발표 자료 미리보기 열기"
        style={{ position: 'fixed', right: 0, top: '50%', transform: 'translateY(-50%)', zIndex: 900, writingMode: 'vertical-rl',
          padding: '14px 8px', border: '1px solid rgba(216,180,254,0.4)', borderRight: 'none', borderRadius: '10px 0 0 10px',
          background: 'linear-gradient(135deg, #d8b4fe, #c084fc)', color: '#000', fontWeight: 700, cursor: 'pointer' }}>
        미리보기 {slides.length}{total ? `/${total}` : ''}
      </button>
    );
  }
  return (
    <aside style={panelStyle} aria-label="발표 자료 실시간 미리보기">
      <style>{`@keyframes livePanelIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }`}</style>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#f3e8ff' }}>{title || '발표 자료'}</div>
          <div style={{ fontSize: 12, color: error ? '#fca5a5' : '#c4b5fd' }}>
            {error ? error : finished ? `완료 · ${slides.length}장` : `${status || '준비 중'}${total ? ` · ${slides.length}/${total}장` : ''}`}
          </div>
        </div>
        <button onClick={onToggle} aria-label="패널 닫기" style={{ background: 'transparent', border: 'none', color: '#e0e0e0', fontSize: 18, cursor: 'pointer' }}>×</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gap: 10, paddingRight: 4 }}>
        {slides.length === 0 && !error && <div style={{ fontSize: 12, color: 'rgba(224,224,224,0.6)' }}>첫 장이 완성되면 여기에 바로 보입니다.</div>}
        {slides.map((s, i) => (
          <div key={i} style={cardStyle}>
            <div style={{ fontSize: 10, color: '#c4b5fd', marginBottom: 6 }}>{i + 1}</div>
            <SlideBody slide={s} />
          </div>
        ))}
      </div>
      {finished && onOpenEditor && (
        <button onClick={onOpenEditor}
          style={{ padding: '10px 14px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #d8b4fe, #c084fc)', color: '#000', fontWeight: 700, cursor: 'pointer' }}>
          편집기 열기
        </button>
      )}
    </aside>
  );
}
