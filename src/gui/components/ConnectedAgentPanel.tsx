import React, { useEffect, useState } from 'react';
import { fetchAgentStatus, saveAgentKey, deleteAgentKey, setAgentPreferred, AGENT_LABEL, type AgentProvider, type AgentStatus, type Preferred } from '../lib/connectedAgent';

// 설정 → 연결된 에이전트. 키는 서버 금고에 암호화되어 저장된다. 입력한 키는 저장 뒤 화면에서 지우고, 뒤 4자리만 보여 준다.

export function ConnectedAgentPanel({ onBack }: { onBack?: () => void }) {
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [drafts, setDrafts] = useState<Record<AgentProvider, string>>({ anthropic: '', openai: '' });
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = () => fetchAgentStatus().then(setStatus).catch((e) => setErr((e as Error).message));
  useEffect(() => { load(); }, []);

  const save = async (provider: AgentProvider) => {
    setBusy(provider); setErr(null); setMsg(null);
    try {
      const next = await saveAgentKey(provider, drafts[provider]);
      setStatus(next);
      setDrafts({ ...drafts, [provider]: '' });
      setMsg(`${AGENT_LABEL[provider]} 키를 안전하게 저장했습니다.`);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const remove = async (provider: AgentProvider) => {
    setBusy(provider); setErr(null); setMsg(null);
    try { setStatus(await deleteAgentKey(provider)); setMsg(`${AGENT_LABEL[provider]} 키를 삭제했습니다.`); }
    catch (e) { setErr((e as Error).message); }
    finally { setBusy(null); }
  };

  const changePreferred = async (preferred: Preferred) => {
    setErr(null);
    try { setStatus(await setAgentPreferred(preferred)); }
    catch (e) { setErr((e as Error).message); }
  };

  const row: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, padding: '0.75rem 0' };
  const input: React.CSSProperties = { width: '100%', padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid rgba(148,163,184,0.35)', background: 'transparent', color: 'inherit', font: 'inherit' };
  const providers: AgentProvider[] = ['anthropic', 'openai'];

  return (
    <section className="settings-group animate-in">
      {onBack && <button className="back-link" onClick={onBack}>← 뒤로가기</button>}
      <h3 className="group-title">연결된 에이전트</h3>
      <div className="settings-list">
        <div className="settings-list-item no-hover" style={{ display: 'block' }}>
          <span className="item-desc">
            사용량 한도를 넘으면 채팅은 여기에 연결한 에이전트로 이어서 답합니다. 키는 암호화되어 서버에 저장되고, 화면에는 다시 나타나지 않습니다.
          </span>
          {status && !status.vault_ready && (
            <div className="error-text" style={{ marginTop: 8 }}>서버에 키 보관 설정이 없어 지금은 키를 저장할 수 없습니다. 관리자에게 문의해 주세요.</div>
          )}
        </div>

        {providers.map((p) => {
          const info = status?.keys[p];
          return (
            <div className="settings-list-item no-hover" style={{ display: 'block' }} key={p}>
              <div style={row}>
                <div className="row-between">
                  <label className="item-label" htmlFor={`key-${p}`}>{AGENT_LABEL[p]} API 키</label>
                  <span className="item-desc">{info?.configured ? `연결됨 · ••••${info.last4}` : '연결 안 됨'}</span>
                </div>
                <input id={`key-${p}`} type="password" autoComplete="off" spellCheck={false} style={input}
                  value={drafts[p]} placeholder={info?.configured ? '새 키로 바꾸려면 입력' : p === 'anthropic' ? 'sk-ant-…' : 'sk-…'}
                  onChange={(e) => setDrafts({ ...drafts, [p]: e.target.value })} />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  {info?.configured && <button className="api-btn" onClick={() => remove(p)} disabled={busy === p}>삭제</button>}
                  <button className="api-btn" onClick={() => save(p)} disabled={busy === p || !drafts[p].trim() || !status?.vault_ready}>
                    {busy === p ? '저장 중…' : '저장'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        <div className="settings-list-item no-hover" style={{ display: 'block' }}>
          <div style={row}>
            <label className="item-label" htmlFor="preferred">우선 사용할 에이전트</label>
            <select id="preferred" style={input} value={status?.preferred ?? 'auto'} onChange={(e) => changePreferred(e.target.value as Preferred)}>
              <option value="auto">자동 (연결된 쪽)</option>
              <option value="anthropic">Claude</option>
              <option value="openai">GPT</option>
            </select>
          </div>
          <div className="item-desc">
            키는 서버에서 암호화되어 보관되고, 답변 호출도 서버가 대신합니다. 브라우저에는 키가 전달되지 않습니다. 외부 제공자로 보낸 내용은 해당 제공자의 정책을 따릅니다.
          </div>
        </div>

        {msg && <div className="item-desc" style={{ padding: '0.5rem 0' }}>{msg}</div>}
        {err && <div className="error-text" style={{ padding: '0.5rem 0' }}>{err}</div>}
      </div>
    </section>
  );
}
