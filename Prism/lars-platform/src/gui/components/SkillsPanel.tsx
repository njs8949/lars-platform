import React, { useEffect, useState } from 'react';
import { Upload, Wand2, FileText, Trash2, AlertTriangle, Check, X } from 'lucide-react';

const apiBase = () => (window.location.hostname === 'localhost' ? 'http://localhost:8001/api' : '/api');

interface Installed { name: string; description: string; enabled: boolean; warned: boolean; files: number; installed_at: string }
interface Staged {
  token: string; name: string; description: string; body_preview: string;
  files: { path: string; size: number }[]; warnings: string[]; note: string; script_notice: string;
}

/** 스킬 설치: ZIP 또는 SKILL.md 업로드, 또는 목적을 말해 초안 만들기 → 검사 → 미리보기 → 확인 후 설치 */
export const SkillsPanel: React.FC = () => {
  const [skills, setSkills] = useState<Installed[]>([]);
  const [staged, setStaged] = useState<Staged | null>(null);
  const [text, setText] = useState('');
  const [goal, setGoal] = useState('');
  const [acceptWarnings, setAcceptWarnings] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    try {
      const response = await fetch(`${apiBase()}/skills`);
      const data = await response.json();
      setSkills(data.skills || []);
    } catch {
      setMessage('백엔드에 연결할 수 없습니다.');
    }
  };
  useEffect(() => { load(); }, []);

  const post = async (path: string, body: unknown) => {
    setBusy(true); setMessage(null);
    try {
      const response = await fetch(`${apiBase()}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || `HTTP ${response.status}`);
      return data;
    } catch (err) {
      setMessage((err as Error).message);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const stageText = async () => {
    const data = await post('/skills/text', { skill_md: text });
    if (data?.staged) { setStaged(data.staged); setAcceptWarnings(false); setReviewed(false); }
  };
  const draft = async () => {
    const data = await post('/skills/draft', { goal });
    if (data?.staged) { setStaged(data.staged); setText(''); setAcceptWarnings(false); setReviewed(false); }
  };
  const uploadFile = async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    setBusy(true); setMessage(null);
    try {
      const response = await fetch(`${apiBase()}/skills/upload`, { method: 'POST', body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || `HTTP ${response.status}`);
      setStaged(data.staged); setAcceptWarnings(false); setReviewed(false);
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const install = async () => {
    if (!staged) return;
    const data = await post('/skills/install', { token: staged.token, accept_warnings: acceptWarnings, confirmed: reviewed });
    if (data) { setStaged(null); await load(); }
  };
  const cancel = async () => {
    if (staged) await post('/skills/discard', { token: staged.token });
    setStaged(null);
  };
  const toggle = async (skill: Installed) => {
    setBusy(true);
    await fetch(`${apiBase()}/skills/${skill.name}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: !skill.enabled }) });
    setBusy(false);
    load();
  };
  const remove = async (skill: Installed) => {
    if (!window.confirm(`'${skill.name}' 스킬을 삭제할까요?`)) return;
    await fetch(`${apiBase()}/skills/${skill.name}`, { method: 'DELETE' });
    load();
  };

  const card: React.CSSProperties = { border: '1px solid var(--border-color)', borderRadius: 12, padding: 14 };
  const input: React.CSSProperties = { width: '100%', padding: '9px 10px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'transparent', color: '#fff', fontFamily: 'inherit', boxSizing: 'border-box' };
  const btn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', flexShrink: 0 };

  return (
    <section className="settings-group animate-in">
      <h3 className="group-title">스킬 (Skills)</h3>
      <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 14, lineHeight: 1.6 }}>
        스킬은 SKILL.md(머리말 name, description과 지침)가 들어 있는 폴더입니다. 질문과 관련될 때 지침이 대화에 적용됩니다.
        스킬 안의 스크립트는 자동으로 실행되지 않습니다.
      </div>

      <div style={{ ...card, display: 'grid', gap: 10, marginBottom: 14 }}>
        <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 14 }}>설치하기</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label className="feature-btn" style={{ ...btn, cursor: 'pointer' }}>
            <Upload size={14} /> ZIP 또는 SKILL.md 올리기
            <input type="file" accept=".zip,.md" style={{ display: 'none' }} disabled={busy}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = ''; }} />
          </label>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input style={{ ...input, flex: 1, minWidth: 0 }} value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="만들고 싶은 스킬을 말해 주세요 (예: 회의록을 요약하고 액션 아이템을 뽑는 스킬)" />
          <button className="feature-btn" style={btn} disabled={busy || !goal.trim()} onClick={draft}><Wand2 size={14} /> 초안 만들기</button>
        </div>
        <textarea style={{ ...input, minHeight: 80, fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12 }} value={text} onChange={(e) => setText(e.target.value)}
          placeholder={'---\nname: meeting-notes\ndescription: 회의록을 요약하고 액션 아이템을 정리할 때 쓴다\n---\n# 지침\n...'} />
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="feature-btn" style={btn} disabled={busy || !text.trim()} onClick={stageText}><FileText size={14} /> 내용 검사하기</button>
        </div>
        {message && <div style={{ color: '#ff6b9d', fontSize: 13 }}>{message}</div>}
      </div>

      {staged && (
        <div style={{ ...card, display: 'grid', gap: 10, marginBottom: 14, borderColor: 'rgba(123,123,246,0.45)' }}>
          <div style={{ fontWeight: 700, color: '#f1f5f9' }}>설치 전 확인 · {staged.name}</div>
          <div style={{ fontSize: 13, color: '#d1d5db' }}>{staged.description}</div>
          {staged.note && <div style={{ fontSize: 12, color: '#fcd34d' }}>{staged.note}</div>}
          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>파일 {staged.files.length}개: {staged.files.map((f) => f.path).join(', ')}</div>
          <pre style={{ maxHeight: 180, overflowY: 'auto', whiteSpace: 'pre-wrap', fontSize: 12, color: '#cbd5e1', background: 'rgba(0,0,0,0.3)', padding: 10, borderRadius: 8, margin: 0 }}>{staged.body_preview}</pre>
          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{staged.script_notice}</div>
          {staged.warnings.length > 0 && (
            <div style={{ padding: 10, borderRadius: 8, border: '1px solid rgba(252,211,77,0.45)', background: 'rgba(252,211,77,0.07)', display: 'grid', gap: 6 }}>
              <div style={{ fontSize: 13, color: '#fde68a', display: 'flex', gap: 6 }}><AlertTriangle size={14} /> 위험할 수 있는 내용이 있습니다</div>
              {staged.warnings.map((w, i) => <div key={i} style={{ fontSize: 12, color: '#fde68a' }}>• {w}</div>)}
              <label style={{ fontSize: 12, color: '#e5e7eb', display: 'flex', gap: 6 }}>
                <input type="checkbox" checked={acceptWarnings} onChange={(e) => setAcceptWarnings(e.target.checked)} /> 위 경고를 확인했고 그래도 설치합니다.
              </label>
            </div>
          )}
          <label style={{ fontSize: 13, color: '#e5e7eb', display: 'flex', gap: 6 }}>
            <input type="checkbox" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} /> 지침 내용을 확인했습니다.
          </label>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="feature-btn" style={btn} onClick={cancel} disabled={busy}><X size={14} /> 취소</button>
            <button className="feature-btn primary" style={btn} onClick={install} disabled={busy || !reviewed || (staged.warnings.length > 0 && !acceptWarnings)}><Check size={14} /> 설치</button>
          </div>
        </div>
      )}

      <div style={{ ...card, display: 'grid', gap: 10 }}>
        <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 14 }}>설치된 스킬 ({skills.length})</div>
        {skills.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>아직 설치된 스킬이 없습니다.</div>}
        {skills.map((skill) => (
          <div key={skill.name} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, color: '#f1f5f9', fontWeight: 600 }}>{skill.name}{skill.warned && <span style={{ marginLeft: 8, fontSize: 11, color: '#fcd34d' }}>경고 허용됨</span>}</div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{skill.description}</div>
            </div>
            <input type="checkbox" className="ios-switch" checked={skill.enabled} disabled={busy} onChange={() => toggle(skill)} />
            <button className="feature-btn" style={btn} onClick={() => remove(skill)} disabled={busy} title="삭제"><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
    </section>
  );
};

export default SkillsPanel;
