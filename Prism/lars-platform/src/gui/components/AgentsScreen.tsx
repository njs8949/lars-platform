/** 서버 기록 시각을 사용자의 시간대 HH:MM:SS로 바꾼다. 예전 기록(이미 HH:MM:SS인 문자열)은 그대로 쓴다. */
const formatLogTime = (at: string) => {
  if (/^\d{2}:\d{2}:\d{2}$/.test(at)) return at;
  const date = new Date(at);
  if (Number.isNaN(date.getTime())) return at;
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
};

import React, { useEffect, useState } from 'react';
import { Bot, Pause, Play, Trash2, Send, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';

const apiBase = () => (window.location.hostname === 'localhost' ? 'http://localhost:8001/api' : '/api');

interface CheckItem { text: string; status: 'pending' | 'done'; result: string }
interface LogLine { at: string; text: string }
interface Agent {
  id: string; goal: string; status: 'planning' | 'running' | 'waiting_user' | 'paused' | 'done' | 'failed';
  checklist: CheckItem[]; question: string | null; report: string; log: LogLine[]; steps: number; created: string;
}

const STATUS_LABEL: Record<Agent['status'], string> = {
  planning: '계획 중', running: '진행 중', waiting_user: '답변 필요', paused: '일시 정지', done: '완료', failed: '실패',
};

/** 자율 에이전트: 목표를 주면 체크리스트를 만들고 백그라운드에서 진행한다. 질문이 있으면 멈춰서 답을 기다린다. */
export const AgentsScreen: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [goal, setGoal] = useState('');
  const [answer, setAnswer] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadList = async () => {
    try {
      const response = await fetch(`${apiBase()}/agents`);
      const data = await response.json();
      setAgents(data.agents || []);
    } catch {
      setMessage('백엔드에 연결할 수 없습니다.');
    }
  };

  useEffect(() => {
    loadList();
    const timer = setInterval(loadList, 5000);
    return () => clearInterval(timer);
  }, []);

  const selected = agents.find((a) => a.id === selectedId) ?? null;

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

  const create = async () => {
    if (!goal.trim()) return;
    const data = await call('/agents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ goal: goal.trim() }) });
    if (data?.agent) {
      setSelectedId(data.agent.id);
      setGoal('');
    }
  };

  const sendAnswer = async () => {
    if (!selected || !answer.trim()) return;
    const data = await call(`/agents/${selected.id}/answer`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answer: answer.trim() }) });
    if (data) setAnswer('');
  };

  const toggle = (agent: Agent) => call(`/agents/${agent.id}/${agent.status === 'paused' ? 'resume' : 'pause'}`, { method: 'POST' });

  const remove = async (agent: Agent) => {
    const data = await call(`/agents/${agent.id}`, { method: 'DELETE' });
    if (data && selectedId === agent.id) setSelectedId(null);
  };

  const card: React.CSSProperties = { border: '1px solid var(--border-color)', borderRadius: 14, padding: 16 };
  const input: React.CSSProperties = { width: '100%', padding: '9px 10px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'transparent', color: '#fff', fontFamily: 'inherit', boxSizing: 'border-box' };

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%', width: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <Bot size={22} color="#c7c9ff" />
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>Pilot <span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(224,224,224,0.6)' }}>자율 에이전트</span></div>
          <div style={{ fontSize: 13, color: 'rgba(224,224,224,0.6)' }}>목표를 주면 체크리스트를 만들고, 백그라운드에서 항목을 처리한 뒤 검증해서 보고합니다. 모르는 것은 질문합니다.</div>
        </div>
      </div>

      <div style={{ ...card, display: 'grid', gap: 10, marginBottom: 18 }}>
        <textarea style={{ ...input, minHeight: 70, resize: 'vertical' }} value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="예: 우리 팀 주간 보고서에 넣을 핵심 지표 정의 3가지를 정리해줘" />
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="feature-btn primary" disabled={busy || !goal.trim()} onClick={create}>에이전트 시작</button>
        </div>
      </div>

      {message && <div style={{ marginBottom: 12, color: '#ff6b9d', fontSize: 13 }}>{message}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: selected ? 'minmax(220px, 300px) 1fr' : '1fr', gap: 16 }}>
        <div style={{ display: 'grid', gap: 8, alignContent: 'start' }}>
          {agents.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>아직 에이전트가 없습니다.</div>}
          {agents.map((agent) => (
            <button key={agent.id} onClick={() => { setSelectedId(agent.id); setAnswer(''); }} style={{ ...card, textAlign: 'left', cursor: 'pointer', background: selectedId === agent.id ? 'rgba(123,123,246,0.12)' : 'transparent', color: '#e5e7eb' }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{agent.goal.slice(0, 60)}</div>
              <div style={{ fontSize: 12, color: agent.status === 'waiting_user' ? '#fcd34d' : 'var(--text-dim)' }}>
                {STATUS_LABEL[agent.status]} · {agent.checklist.filter((c) => c.status === 'done').length}/{agent.checklist.length}
              </div>
            </button>
          ))}
        </div>

        {selected && (
          <div style={{ ...card, display: 'grid', gap: 12, alignContent: 'start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontWeight: 700, color: '#f1f5f9', flex: 1 }}>{selected.goal}</div>
              {(selected.status === 'running' || selected.status === 'paused' || selected.status === 'waiting_user') && (
                <button className="feature-btn" onClick={() => toggle(selected)} disabled={busy} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {selected.status === 'paused' ? <Play size={14} /> : <Pause size={14} />}
                  {selected.status === 'paused' ? '다시 시작' : '일시 정지'}
                </button>
              )}
              <button className="feature-btn" onClick={() => remove(selected)} disabled={busy} title="삭제"><Trash2 size={14} /></button>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
              상태: {STATUS_LABEL[selected.status]} {selected.status === 'planning' || selected.status === 'running' ? <Loader2 size={12} style={{ verticalAlign: 'middle' }} /> : null}
            </div>

            {selected.checklist.length > 0 && (
              <div style={{ display: 'grid', gap: 8 }}>
                {selected.checklist.map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, fontSize: 13, color: '#d1d5db' }}>
                    {item.status === 'done' ? <CheckCircle2 size={15} color="#4ade80" style={{ flexShrink: 0, marginTop: 2 }} /> : <span style={{ width: 15, flexShrink: 0 }}>○</span>}
                    <div>
                      <div>{item.text}</div>
                      {item.result && <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2, whiteSpace: 'pre-wrap' }}>{item.result}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selected.question && (
              <div style={{ padding: 12, borderRadius: 10, border: '1px solid rgba(252,211,77,0.4)', background: 'rgba(252,211,77,0.06)', display: 'grid', gap: 8 }}>
                <div style={{ fontSize: 13, color: '#fde68a', display: 'flex', gap: 6 }}><AlertTriangle size={14} /> {selected.question}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input style={{ ...input, flex: 1, minWidth: 0 }} value={answer} onChange={(e) => setAnswer(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') sendAnswer(); }} placeholder="답변을 입력하세요" />
                  <button className="feature-btn primary" onClick={sendAnswer} disabled={busy || !answer.trim()} style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', flexShrink: 0 }}><Send size={14} /> 보내기</button>
                </div>
              </div>
            )}

            {selected.report && (
              <div style={{ padding: 12, borderRadius: 10, background: 'rgba(74,222,128,0.07)', fontSize: 13, color: '#d1fae5', whiteSpace: 'pre-wrap' }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>최종 보고</div>
                {selected.report}
              </div>
            )}

            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#e5e7eb', marginBottom: 4 }}>활동 기록</div>
              <pre style={{ maxHeight: 220, overflowY: 'auto', whiteSpace: 'pre-wrap', fontSize: 12, color: '#cbd5e1', background: 'rgba(0,0,0,0.3)', padding: 10, borderRadius: 10, margin: 0 }}>
                {selected.log.map((l) => `[${formatLogTime(l.at)}] ${l.text}`).join('\n')}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentsScreen;
