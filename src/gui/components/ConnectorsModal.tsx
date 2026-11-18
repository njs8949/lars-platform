import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

const apiBase = () => (window.location.hostname === 'localhost' ? 'http://localhost:8001/api' : '/api');

interface Issue { number: number; title: string; url: string }

/** 커넥터 설정: Slack 웹훅, GitHub 토큰. 값은 서버에만 저장되고 화면에는 연결 상태만 보인다. */
export const ConnectorsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [status, setStatus] = useState<{ slack: boolean; github: boolean }>({ slack: false, github: false });
  const [slackUrl, setSlackUrl] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [repo, setRepo] = useState('');
  const [issues, setIssues] = useState<Issue[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    try {
      const response = await fetch(`${apiBase()}/connectors`);
      setStatus(await response.json());
    } catch {
      setMessage('백엔드에 연결할 수 없습니다.');
    }
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    const body: Record<string, string> = {};
    if (slackUrl.trim()) body.slack_webhook = slackUrl.trim();
    if (githubToken.trim()) body.github_token = githubToken.trim();
    if (Object.keys(body).length === 0) { setMessage('저장할 값을 입력해 주세요.'); return; }
    try {
      const response = await fetch(`${apiBase()}/connectors`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || `HTTP ${response.status}`);
      setSlackUrl(''); setGithubToken('');
      setStatus({ slack: data.slack, github: data.github });
      setMessage('저장했습니다.');
    } catch (err) {
      setMessage(`저장 실패: ${(err as Error).message}`);
    }
  };

  const loadIssues = async () => {
    try {
      const response = await fetch(`${apiBase()}/connectors/github/issues?repo=${encodeURIComponent(repo.trim())}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || `HTTP ${response.status}`);
      setIssues(data.issues);
      setMessage(`열린 이슈 ${data.issues.length}개`);
    } catch (err) {
      setIssues([]);
      setMessage(`이슈 조회 실패: ${(err as Error).message}`);
    }
  };

  const field: React.CSSProperties = { width: '100%', padding: '9px 10px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'transparent', color: '#fff', fontFamily: 'inherit', boxSizing: 'border-box' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 520, maxWidth: '92vw', maxHeight: '80vh', overflowY: 'auto', background: '#1c1c1e', border: '1px solid var(--border-color)', borderRadius: 16, padding: 20, display: 'grid', gap: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#fff' }}>커넥터</div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}><X size={18} /></button>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.6 }}>
          키와 주소는 이 서버 파일에만 저장되고 화면에 다시 표시되지 않습니다. Slack 웹훅 주소나 GitHub 토큰을 넣으면 연결됩니다.
        </div>
        <div style={{ fontSize: 13, color: '#e5e7eb' }}>Slack: {status.slack ? '연결됨' : '연결 안 됨'}</div>
        <input style={field} type="password" value={slackUrl} onChange={(e) => setSlackUrl(e.target.value)} placeholder="Slack 수신 웹훅 주소 (https://hooks.slack.com/...)" />
        <div style={{ fontSize: 13, color: '#e5e7eb' }}>GitHub: {status.github ? '연결됨' : '연결 안 됨'}</div>
        <input style={field} type="password" value={githubToken} onChange={(e) => setGithubToken(e.target.value)} placeholder="GitHub 개인 액세스 토큰 (읽기 권한)" />
        <button className="feature-btn primary" onClick={save}>저장</button>
        {status.github && (
          <div style={{ display: 'grid', gap: 8, borderTop: '1px solid var(--border-color)', paddingTop: 12 }}>
            <div style={{ fontSize: 13, color: '#e5e7eb' }}>GitHub 열린 이슈 보기</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input style={field} value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="owner/repo" />
              <button className="feature-btn" onClick={loadIssues} disabled={!repo.trim()}>조회</button>
            </div>
            {issues.map((i) => (
              <a key={i.number} href={i.url} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: '#c7c9ff' }}>#{i.number} {i.title}</a>
            ))}
          </div>
        )}
        {message && <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{message}</div>}
      </div>
    </div>
  );
};

export default ConnectorsModal;
