import React, { useEffect, useState } from 'react';
import { Cloud, RefreshCw, FolderOpen, CheckCircle2, AlertTriangle, Rocket } from 'lucide-react';

const apiBase = () => (window.location.hostname === 'localhost' ? 'http://localhost:8001/api' : '/api');

type Provider = 'aws' | 'gcp' | 'azure';
interface ToolInfo { label: string; cli: string; installed: boolean; logged_in: boolean; account: string; hint: string }
interface PlanStep { title: string; command: string; note: string }
interface Plan {
  id: string; provider_label: string; region: string; method: string; name: string; folder: string;
  resources: string[]; steps: PlanStep[]; warnings: string[]; expected_url: string;
}
interface Job { id: string; status: 'running' | 'done' | 'failed'; log: string[]; url: string }

const DEFAULT_REGION: Record<Provider, string> = { aws: 'ap-northeast-2', gcp: 'asia-northeast3', azure: 'koreacentral' };
const PROVIDER_NAME: Record<Provider, string> = { aws: 'AWS', gcp: 'Google Cloud', azure: 'Azure' };

/** 클라우드 배포: 폴더 선택 → 계획 확인 → 확인 후 실행. 키는 앱에 입력하지 않고 각 클라우드 CLI 로그인을 쓴다. */
export const CloudDeployScreen: React.FC = () => {
  const [tools, setTools] = useState<Record<string, ToolInfo>>({});
  const [provider, setProvider] = useState<Provider>('aws');
  const [method, setMethod] = useState<'static' | 'container'>('static');
  const [folder, setFolder] = useState('');
  const [name, setName] = useState('');
  const [region, setRegion] = useState(DEFAULT_REGION.aws);
  const [project, setProject] = useState('');
  const [plan, setPlan] = useState<Plan | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [job, setJob] = useState<Job | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadTools = async () => {
    try {
      const response = await fetch(`${apiBase()}/deploy/tools`);
      const data = await response.json();
      setTools(data.tools || {});
    } catch {
      setMessage('백엔드에 연결할 수 없습니다.');
    }
  };
  useEffect(() => { loadTools(); }, []);

  useEffect(() => {
    setRegion(DEFAULT_REGION[provider]);
    setPlan(null);
    setAgreed(false);
  }, [provider]);

  useEffect(() => { setPlan(null); setAgreed(false); }, [method, folder, name, region, project]);

  // 실행 중인 작업의 로그를 주기적으로 가져온다
  useEffect(() => {
    if (!job || job.status !== 'running') return;
    const timer = setInterval(async () => {
      try {
        const response = await fetch(`${apiBase()}/deploy/jobs/${job.id}`);
        const data = await response.json();
        if (data.job) setJob(data.job);
      } catch { /* 다음 주기에 다시 시도 */ }
    }, 2000);
    return () => clearInterval(timer);
  }, [job]);

  const pickFolder = async () => {
    try {
      const dialog = await import('@tauri-apps/api/dialog');
      const selected = await dialog.open({ directory: true, multiple: false, title: '배포할 폴더 선택' });
      if (typeof selected === 'string') setFolder(selected);
    } catch {
      /* 브라우저에서는 경로를 직접 입력한다 */
    }
  };

  const makePlan = async () => {
    setBusy(true); setMessage(null); setPlan(null);
    try {
      const response = await fetch(`${apiBase()}/deploy/plan`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder: folder.trim(), provider, method, name: name.trim(), region: region.trim(), project: project.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || `HTTP ${response.status}`);
      setPlan(data.plan);
    } catch (err) {
      setMessage(`계획 실패: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const execute = async () => {
    if (!plan || !agreed) return;
    setBusy(true);
    try {
      const response = await fetch(`${apiBase()}/deploy/execute`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: plan.id, confirmed: true }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || `HTTP ${response.status}`);
      setJob(data.job);
    } catch (err) {
      setMessage(`실행 실패: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const field: React.CSSProperties = { width: '100%', padding: '9px 10px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'transparent', color: '#fff', fontFamily: 'inherit', boxSizing: 'border-box' };
  const card = (active: boolean): React.CSSProperties => ({
    flex: 1, minWidth: 150, padding: 14, borderRadius: 14, cursor: 'pointer', textAlign: 'left',
    border: `1px solid ${active ? 'rgba(123,123,246,0.6)' : 'var(--border-color)'}`,
    background: active ? 'rgba(123,123,246,0.12)' : 'rgba(255,255,255,0.02)', color: '#e5e7eb',
  });

  const tool = tools[provider];
  const canPlan = !!folder.trim() && !!name.trim() && !busy && (provider !== 'gcp' || !!project.trim());

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%', width: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <Cloud size={22} color="#c7c9ff" />
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>클라우드 배포</div>
          <div style={{ fontSize: 13, color: 'rgba(224,224,224,0.6)' }}>폴더를 고르고, 클라우드와 방식을 정한 뒤, 계획을 확인하고 배포합니다.</div>
        </div>
        <button onClick={loadTools} style={{ marginLeft: 'auto', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: 10, padding: '6px 10px', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={14} /> 상태 새로고침
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 18 }}>
        {(Object.keys(PROVIDER_NAME) as Provider[]).map((key) => {
          const t = tools[key];
          return (
            <div key={key} onClick={() => setProvider(key)} style={card(provider === key)}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>{PROVIDER_NAME[key]}</div>
              {!t ? <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>확인 중…</div> : (
                <>
                  <div style={{ fontSize: 12, color: t.installed ? '#4ade80' : '#ff6b9d' }}>{t.installed ? 'CLI 설치됨' : 'CLI 설치 안 됨'}</div>
                  <div style={{ fontSize: 12, color: t.logged_in ? '#4ade80' : '#fcd34d' }}>{t.logged_in ? `로그인됨 · ${t.account}` : '로그인 필요'}</div>
                  {(!t.installed || !t.logged_in) && <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6 }}>{t.hint}</div>}
                </>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'grid', gap: 12, padding: 16, borderRadius: 14, border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input style={{ ...field, flex: 1, minWidth: 0 }} value={folder} onChange={(e) => setFolder(e.target.value)} placeholder="배포할 폴더 경로" />
          <button onClick={pickFolder} className="feature-btn" style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', flexShrink: 0 }}><FolderOpen size={14} /> 폴더 선택</button>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['static', 'container'] as const).map((m) => (
            <button key={m} onClick={() => setMethod(m)} style={{ ...card(method === m), flex: 1 }}>
              <div style={{ fontWeight: 700 }}>{m === 'static' ? '정적 사이트' : '컨테이너'}</div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{m === 'static' ? '빌드된 HTML/JS/CSS 파일을 올립니다.' : '서버 앱(Dockerfile 또는 소스)을 실행합니다.'}</div>
            </button>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <input style={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="서비스 이름 (소문자, 예: my-site)" />
          <input style={field} value={region} onChange={(e) => setRegion(e.target.value)} placeholder="리전" />
        </div>
        {provider === 'gcp' && (
          <input style={field} value={project} onChange={(e) => setProject(e.target.value)} placeholder="Google Cloud 프로젝트 ID (예: my-project-123)" />
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="feature-btn primary" disabled={!canPlan || (tool && !tool.installed)} onClick={makePlan}>계획 보기</button>
        </div>
      </div>

      {message && <div style={{ marginTop: 12, color: '#ff6b9d', fontSize: 13 }}>{message}</div>}

      {plan && (
        <div style={{ marginTop: 18, display: 'grid', gap: 12, padding: 16, borderRadius: 14, border: '1px solid rgba(123,123,246,0.4)' }}>
          <div style={{ fontWeight: 700, color: '#f1f5f9' }}>배포 계획 · {plan.provider_label} · {plan.region}</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>폴더: {plan.folder}</div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#e5e7eb', marginBottom: 4 }}>만들어지는 리소스</div>
            {plan.resources.map((r, i) => <div key={i} style={{ fontSize: 13, color: '#d1d5db' }}>• {r}</div>)}
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#e5e7eb', marginBottom: 4 }}>실행할 단계 ({plan.steps.length})</div>
            <ol style={{ margin: 0, paddingLeft: 20, fontSize: 12, color: '#cbd5e1', lineHeight: 1.7 }}>
              {plan.steps.map((s, i) => <li key={i}><b>{s.title}</b><div style={{ fontFamily: 'ui-monospace, Menlo, monospace', color: 'var(--text-dim)', wordBreak: 'break-all' }}>{s.command}</div></li>)}
            </ol>
          </div>
          {plan.warnings.length > 0 && (
            <div style={{ fontSize: 12, color: '#fcd34d', display: 'grid', gap: 4 }}>
              {plan.warnings.map((w, i) => <div key={i}><AlertTriangle size={12} /> {w}</div>)}
            </div>
          )}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#e5e7eb' }}>
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
            위 리소스를 실제로 만들고 비용이 발생할 수 있음을 확인했습니다.
          </label>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="feature-btn primary" disabled={!agreed || busy || job?.status === 'running'} onClick={execute} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Rocket size={14} /> 배포 실행
            </button>
          </div>
        </div>
      )}

      {job && (
        <div style={{ marginTop: 18, padding: 16, borderRadius: 14, border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: '#f1f5f9', marginBottom: 8 }}>
            {job.status === 'done' ? <CheckCircle2 size={16} color="#4ade80" /> : job.status === 'failed' ? <AlertTriangle size={16} color="#ff6b9d" /> : null}
            {job.status === 'running' ? '배포 진행 중…' : job.status === 'done' ? '배포 완료' : '배포 실패'}
          </div>
          {job.url && <a href={job.url} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: '#c7c9ff' }}>{job.url}</a>}
          <pre style={{ marginTop: 10, maxHeight: 280, overflowY: 'auto', whiteSpace: 'pre-wrap', fontSize: 12, color: '#cbd5e1', background: 'rgba(0,0,0,0.3)', padding: 10, borderRadius: 10 }}>
            {job.log.join('\n')}
          </pre>
        </div>
      )}
    </div>
  );
};

export default CloudDeployScreen;
