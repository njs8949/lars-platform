import React, { useState } from 'react';
import { X, Trash2, Plus } from 'lucide-react';
import { getInstructions, setInstructions, getMemories, addMemory, removeMemory, isMemoryEnabled, setMemoryEnabled, MemoryItem } from '../lib/personalization';

export type PersonalizeTab = 'instructions' | 'memory';

/** 커스텀 지시와 메모리를 관리하는 설정 창. */
export const PersonalizationModal: React.FC<{ tab: PersonalizeTab; onTab: (t: PersonalizeTab) => void; onClose: () => void }> = ({ tab, onTab, onClose }) => {
  const [instructions, setInstr] = useState(getInstructions());
  const [saved, setSaved] = useState(false);
  const [memories, setMemories] = useState<MemoryItem[]>(getMemories());
  const [draft, setDraft] = useState('');
  const [enabled, setEnabled] = useState(isMemoryEnabled());

  const saveInstructions = () => {
    setInstructions(instructions);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 14px', border: 'none', background: 'transparent', cursor: 'pointer',
    color: active ? '#fff' : 'var(--text-dim)', fontWeight: 700,
    borderBottom: active ? '2px solid #7b7bf6' : '2px solid transparent',
  });

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 520, maxWidth: '92vw', maxHeight: '80vh', background: '#1c1c1e', border: '1px solid var(--border-color)', borderRadius: 16, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 0' }}>
          <div>
            <button style={tabStyle(tab === 'instructions')} onClick={() => onTab('instructions')}>커스텀 지시</button>
            <button style={tabStyle(tab === 'memory')} onClick={() => onTab('memory')}>메모리</button>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}><X size={18} /></button>
        </div>
        <div style={{ padding: 16, overflowY: 'auto' }}>
          {tab === 'instructions' && (
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6 }}>
                모든 대화에 적용되는 지침입니다. 예: "답변은 짧게, 핵심 먼저", "코드에는 주석을 달아 주세요".
              </div>
              <textarea value={instructions} onChange={(e) => setInstr(e.target.value)} rows={8} maxLength={4000}
                style={{ background: 'transparent', border: '1px solid var(--border-color)', borderRadius: 10, color: '#fff', padding: 10, fontFamily: 'inherit', resize: 'vertical' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{instructions.length} / 4000</span>
                <button className="feature-btn primary" onClick={saveInstructions}>{saved ? '저장됨' : '저장'}</button>
              </div>
            </div>
          )}
          {tab === 'memory' && (
            <div style={{ display: 'grid', gap: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#e5e7eb' }}>
                <input type="checkbox" checked={enabled} onChange={(e) => { setEnabled(e.target.checked); setMemoryEnabled(e.target.checked); }} />
                기억 사용 (끄면 기억을 대화에 보내지 않습니다)
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="기억할 내용 (예: 저는 제조업 기획자입니다)"
                  onKeyDown={(e) => { if (e.key === 'Enter' && draft.trim()) { setMemories(addMemory(draft)); setDraft(''); } }}
                  style={{ flex: 1, padding: '8px 10px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'transparent', color: '#fff', fontFamily: 'inherit' }} />
                <button className="feature-btn primary" disabled={!draft.trim()} onClick={() => { setMemories(addMemory(draft)); setDraft(''); }} style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Plus size={14} /> 추가</button>
              </div>
              {memories.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>저장된 기억이 없습니다.</div>}
              {memories.map((m) => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 10, border: '1px solid var(--border-color)' }}>
                  <span style={{ flex: 1, fontSize: 13, color: '#e5e7eb' }}>{m.text}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{m.createdAt}</span>
                  <button onClick={() => setMemories(removeMemory(m.id))} title="삭제" style={{ background: 'transparent', border: 'none', color: '#ff6b9d', cursor: 'pointer' }}><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PersonalizationModal;
