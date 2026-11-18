import React, { useEffect, useState } from 'react';
import { MousePointerClick, Pause, Play, Square, Trash2, Send, Check, X, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';

const apiBase = () => (window.location.hostname === 'localhost' ? 'http://localhost:8001/api' : '/api');

interface BrowserAction { action: string; outcome: string }
interface LogLine { at: string; text: string }
interface Pending { reason: string; label: string }
interface BrowserTask {
  id: string; goal: string; allowed_domains: string[]; start_url: string;
  status: 'starting' | 'running' | 'waiting_approval' | 'waiting_user' | 'paused' | 'done' | 'failed' | 'stopped';
  actions: BrowserAction[]; question: string | null; pending: Pending | null; result: string; log: LogLine[]; created: string;
}

const STATUS_LABEL: Record<BrowserTask['status'], string> = {
  starting: '시작 중', running: '진행 중', waiting_approval: '승인 필요', waiting_user: '답변 필요',
  paused: '일시 정지', done: '완료', failed: '실패', stopped: '중지됨',
};
const ACTIVE = ['starting', 'running', 'waiting_approval', 'waiting_user', 'paused'];

/** 브라우저 조작: 허용한 사이트 안에서 페이지를 읽고 클릭·입력한다. 되돌리기 어려운 동작은 승인을 받는다. */
export const BrowserTasksScreen: React.FC = () => {
  const [tasks, setTasks] = useState<BrowserTask[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [goal, setGoal] = useState('');
  const [domains, setDomains] = useState('');
  const [startUrl, setStartUrl] = useState('');
  const [answer, setAnswer] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadList = async () => {
    try {
      const response = await fetch(`${apiBase()}/browser-tasks`);
      const data = await response.json();
      setTasks(data.tasks || []);
    } catch {
      setMessage('백엔드에 연결할 수 없습니다.');
    }
  };

  useEffect(() => {
    loadList();
    const timer = setInterval(loadList, 3000);
    return () => clearInterval(timer);
  }, []);

  const selected = tasks.find((t) => t.id === selectedId) ?? null;

  const call = async (path: string, init?: RequestInit) => {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`${apiBase()}${path}`, init);
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || `HTTP ${response.status}`);
      await loadList();
      return data;
    } catch (err) {
      setMessage((err as Error).message);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const json = (body: unknown): RequestInit => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

  const create = async () => {
    const allowed = domains.split(',').map((d) => d.trim()).filter(Boolean);
    const data = await call('/browser-tasks', json({ goal: goal.trim(), allowed_domains: allowed, start_url: startUrl.trim() }));
    if (data?.task) {
      setSelectedId(data.task.id);
      setGoal('');
    }
  };

  const sendAnswer = async () => {
    if (!selected || !answer.trim()) return;
    const data = await call(`/browser-tasks/${selected.id}/answer`, json({ answer: answer.trim() }));
    if (data) setAnswer('');
  };

  const decide = (ok: boolean) => selected && call(`/browser-tasks/${selected.id}/approve`, json({ approve: ok }));
  const control = (action: 'pause' | 'resume' | 'stop') => selected && call(`/browser-tasks/${selected.id}/${action}`, { method: 'POST' });
  const remove = async () => {
    if (!selected) return;
    const data = await call(`/browser-tasks/${selected.id}`, { method: 'DELETE' });
    if (data) setSelectedId(null);
  };

  const card: React.CSSProperties = { border: '1px solid var(--border-color)', borderRadius: 14, padding: 16 };
  const input: React.CSSProperties = { width: '100%', padding: '9px 10px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'transparent', color: '#fff', fontFamily: 'inherit', boxSizing: 'border-box' };
  const anyActive = tasks.some((t) => ACTIVE.includes(t.status));

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%', width: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <MousePointerClick size={22} color="#c7c9ff" />
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>브라우저 조작</div>
          <div style={{ fontSize: 13, color: 'rgba(224,224,224,0.6)' }}>허용한 사이트 안에서 페이지를 읽고 클릭·입력합니다. 구매·제출·로그인 같은 동작은 실행 전에 승인을 받고, 비밀번호와 카드 정보는 직접 입력하셔야 합니다.</div>
        </div>
      </div>

      <div style={{ ...card, display: 'grid', gap: 10, marginBottom: 18 }}>
        <textarea style={{ ...input, minHeight: 64, resize: 'vertical' }} value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="예: 검색 사이트에서 '프리즘'을 검색하고 첫 번째 결과 제목을 알려줘" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <input style={input} value={domains} onChange={(e) => setDomains(e.target.value)} placeholder="허용 도메인 (쉼표로 구분, 예: naver.com, google.com)" />
          <input style={input} value={startUrl} onChange={(e) => setStartUrl(e.target.value)} placeholder="시작 주소 (선택, 예: https://www.naver.com)" />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: anyActive ? '#fcd34d' : 'var(--text-dim)' }}>{anyActive ? '이미 실행 중인 작업이 있어 새로 시작할 수 없습니다.' : '브라우저 창이 열리고 작업이 보입니다.'}</span>
          <button className="feature-btn primary" disabled={busy || anyActive || !goal.trim() || !domains.trim()} onClick={create}>작업 시작</button>
        </div>
      </div>

      {message && <div style={{ marginBottom: 12, color: '#ff6b9d', fontSize: 13 }}>{message}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: selected ? 'minmax(220px, 300px) 1fr' : '1fr', gap: 16 }}>
        <div style={{ display: 'grid', gap: 8, alignContent: 'start' }}>
          {tasks.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>아직 작업이 없습니다.</div>}
          {tasks.map((task) => (
            <button key={task.id} onClick={() => { setSelectedId(task.id); setAnswer(''); }} style={{ ...card, textAlign: 'left', cursor: 'pointer', background: selectedId === task.id ? 'rgba(123,123,246,0.12)' : 'transparent', color: '#e5e7eb' }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{task.goal.slice(0, 60)}</div>
              <div style={{ fontSize: 12, color: ['waiting_approval', 'waiting_user'].includes(task.status) ? '#fcd34d' : 'var(--text-dim)' }}>{STATUS_LABEL[task.status]} · 동작 {task.actions.length}개</div>
            </button>
          ))}
        </div>

        {selected && (
          <div style={{ ...card, display: 'grid', gap: 12, alignContent: 'start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ fontWeight: 700, color: '#f1f5f9', flex: 1 }}>{selected.goal}</div>
              {(selected.status === 'running' || selected.status === 'waiting_user' || selected.status === 'waiting_approval') && (
                <button className="feature-btn" disabled={busy} onClick={() => control('pause')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Pause size={14} /> 정지</button>
              )}
              {selected.status === 'paused' && (
                <button className="feature-btn" disabled={busy} onClick={() => control('resume')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Play size={14} /> 다시 시작</button>
              )}
              {ACTIVE.includes(selected.status) && (
                <button className="feature-btn" disabled={busy} onClick={() => control('stop')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Square size={14} /> 중지</button>
              )}
              {!ACTIVE.includes(selected.status) && (
                <button className="feature-btn" disabled={busy} onClick={remove} title="삭제"><Trash2 size={14} /></button>
              )}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
              상태: {STATUS_LABEL[selected.status]} {['starting', 'running'].includes(selected.status) ? <Loader2 size={12} style={{ verticalAlign: 'middle' }} /> : null}
              <span style={{ marginLeft: 10 }}>허용: {selected.allowed_domains.join(', ')}</span>
            </div>

            {selected.status === 'waiting_approval' && selected.pending && (
              <div style={{ padding: 12, borderRadius: 10, border: '1px solid rgba(252,211,77,0.5)', background: 'rgba(252,211,77,0.07)', display: 'grid', gap: 8 }}>
                <div style={{ fontSize: 13, color: '#fde68a', display: 'flex', gap: 6 }}><AlertTriangle size={14} /> 이 동작을 실행할까요? {selected.pending.reason}</div>
                <div style={{ fontSize: 12, color: '#e5e7eb' }}>대상: {selected.pending.label || '(이름 없음)'}</div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button className="feature-btn" disabled={busy} onClick={() => decide(false)} style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}><X size={14} /> 거절</button>
                  <button className="feature-btn primary" disabled={busy} onClick={() => decide(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}><Check size={14} /> 승인하고 실행</button>
                </div>
              </div>
            )}

            {selected.status === 'waiting_user' && selected.question && (
              <div style={{ padding: 12, borderRadius: 10, border: '1px solid rgba(252,211,77,0.4)', background: 'rgba(252,211,77,0.06)', display: 'grid', gap: 8 }}>
                <div style={{ fontSize: 13, color: '#fde68a' }}>{selected.question}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input style={{ ...input, flex: 1, minWidth: 0 }} value={answer} onChange={(e) => setAnswer(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') sendAnswer(); }} placeholder="답변을 입력하세요 (비밀번호 등은 브라우저 창에서 직접 입력)" />
                  <button className="feature-btn primary" disabled={busy || !answer.trim()} onClick={sendAnswer} style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', flexShrink: 0 }}><Send size={14} /> 보내기</button>
                </div>
              </div>
            )}

            {selected.result && (
              <div style={{ padding: 12, borderRadius: 10, background: 'rgba(74,222,128,0.07)', fontSize: 13, color: '#d1fae5', whiteSpace: 'pre-wrap' }}>
                <div style={{ fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}><CheckCircle2 size={14} /> 결과</div>
                {selected.result}
              </div>
            )}

            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#e5e7eb', marginBottom: 4 }}>동작 기록</div>
              <div style={{ display: 'grid', gap: 4, marginBottom: 8 }}>
                {selected.actions.map((a, i) => (
                  <div key={i} style={{ fontSize: 12, color: '#cbd5e1' }}>{i + 1}. {a.action} → <span style={{ color: 'var(--text-dim)' }}>{a.outcome}</span></div>
                ))}
              </div>
              <pre style={{ maxHeight: 200, overflowY: 'auto', whiteSpace: 'pre-wrap', fontSize: 12, color: '#cbd5e1', background: 'rgba(0,0,0,0.3)', padding: 10, borderRadius: 10, margin: 0 }}>
                {selected.log.map((l) => `[${l.at}] ${l.text}`).join('\n')}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BrowserTasksScreen;
