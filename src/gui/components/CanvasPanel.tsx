import React, { useState } from 'react';
import { X, Copy, Check, Download } from 'lucide-react';

/** 캔버스: 답변을 채팅 옆 패널에서 직접 고치고, 복사하거나 파일로 저장한다. */
export const CanvasPanel: React.FC<{ title: string; content: string; onChange: (text: string) => void; onClose: () => void }> = ({ title, content, onChange, onClose }) => {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try { await navigator.clipboard.writeText(content); } catch { /* 무시 */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const download = () => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[\\/:*?"<>|]+/g, '_').slice(0, 40) || 'canvas'}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <aside className="canvas-panel">
      <div className="canvas-head">
        <div className="canvas-title">{title}</div>
        <div className="canvas-actions">
          <button onClick={copy} title="복사">{copied ? <Check size={15} /> : <Copy size={15} />}</button>
          <button onClick={download} title="파일로 저장"><Download size={15} /></button>
          <button onClick={onClose} title="닫기"><X size={15} /></button>
        </div>
      </div>
      <textarea className="canvas-editor" value={content} onChange={(e) => onChange(e.target.value)} spellCheck={false} />
    </aside>
  );
};

export default CanvasPanel;
