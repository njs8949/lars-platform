import React, { useState } from 'react';
import { getToken } from '../lib/auth';

const apiBase = () => (window.location.hostname === 'localhost' ? 'http://localhost:8001/api' : '/api');

export interface PluginProposal {
  plugin_id: string;
  plugin_name: string;
  tool: string;
  description: string;
  destination: string;
  params: Record<string, unknown>;
}

interface Props {
  proposal: PluginProposal;
  onDismiss: () => void;
}

// 모델이 고른 앱 도구를 바로 실행하지 않고, 보낼 내용을 보여 준 뒤 사용자가 승인할 때만 실행한다.
export function PluginApprovalCard({ proposal, onDismiss }: Props) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const approve = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`${apiBase()}/plugins/${proposal.plugin_id}/call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken() ?? ''}` },
        body: JSON.stringify({ tool: proposal.tool, params: proposal.params, confirmed: true }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || `HTTP ${response.status}`);
      setResult(data.result?.body ?? '');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const box: React.CSSProperties = {
    marginTop: 12, padding: 14, borderRadius: 12,
    background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(96,165,250,0.35)', color: '#e2e8f0', fontSize: 13,
  };
  const btn = (primary: boolean): React.CSSProperties => ({
    padding: '6px 14px', borderRadius: 8, cursor: busy ? 'default' : 'pointer', fontSize: 13,
    border: primary ? 'none' : '1px solid rgba(148,163,184,0.5)',
    background: primary ? '#2563eb' : 'transparent', color: '#fff', opacity: busy ? 0.6 : 1,
  });

  return (
    <div style={box}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>
        앱 「{proposal.plugin_name}」의 「{proposal.tool}」 실행 요청
      </div>
      {proposal.description && <div style={{ color: '#94a3b8', marginBottom: 8 }}>{proposal.description}</div>}
      <div style={{ marginBottom: 6 }}>보낼 곳: <code>{proposal.destination}</code></div>
      <pre style={{ margin: 0, padding: 10, borderRadius: 8, background: 'rgba(0,0,0,0.3)', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
        {JSON.stringify(proposal.params, null, 2)}
      </pre>
      {result === null ? (
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button style={btn(true)} disabled={busy} onClick={approve}>{busy ? '실행 중…' : '승인하고 실행'}</button>
          <button style={btn(false)} disabled={busy} onClick={onDismiss}>거절</button>
        </div>
      ) : (
        <div style={{ marginTop: 10 }}>
          <div style={{ color: '#86efac', marginBottom: 6 }}>실행 결과</div>
          <pre style={{ margin: 0, padding: 10, borderRadius: 8, background: 'rgba(0,0,0,0.3)', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{result}</pre>
          <button style={{ ...btn(false), marginTop: 8 }} onClick={onDismiss}>닫기</button>
        </div>
      )}
      {error && <div style={{ color: '#fca5a5', marginTop: 8 }}>실행 실패: {error}</div>}
    </div>
  );
}

export interface ConnectPrompt {
  service: string;
  name: string;
  configured: boolean;
}

// 채팅에서 연결되지 않은 서비스를 언급하면 보여 주는 안내. 누르면 앱 및 확장 화면으로 이동한다.
export function ConnectPromptCard({ prompt, onOpen, onDismiss }: { prompt: ConnectPrompt; onOpen: () => void; onDismiss: () => void }) {
  const box: React.CSSProperties = {
    marginTop: 12, padding: 14, borderRadius: 12,
    background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(250,204,21,0.35)', color: '#e2e8f0', fontSize: 13,
    display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
  };
  return (
    <div style={box}>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontWeight: 600 }}>{prompt.name} 연결이 필요합니다</div>
        <div style={{ color: '#94a3b8', marginTop: 4 }}>
          {prompt.configured ? '연결하면 이 서비스의 정보를 답변에 사용할 수 있습니다.' : '서비스 연결 설정이 아직 없습니다. 관리자에게 설정을 요청해 주세요.'}
        </div>
      </div>
      {prompt.configured && (
        <button onClick={onOpen} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer', fontSize: 13 }}>연결하러 가기</button>
      )}
      <button onClick={onDismiss} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(148,163,184,0.5)', background: 'transparent', color: '#fff', cursor: 'pointer', fontSize: 13 }}>닫기</button>
    </div>
  );
}
