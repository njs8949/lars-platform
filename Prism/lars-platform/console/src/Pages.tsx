import React, { useEffect, useState } from 'react';

// 콘솔의 플레이그라운드, 한도 설정, 데이터 제어 화면.
// 모든 요청은 로그인 토큰으로 보내고, 관리자 전용 작업은 서버에서도 한 번 더 확인한다.

const API = '/api';
const token = (): string | null => { try { return localStorage.getItem('auth_token'); } catch { return null; } };

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token() ?? ''}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 401) throw new Error('로그인이 만료되었습니다. Prism 앱에서 다시 로그인해 주세요.');
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
  return data as T;
}

const nf = new Intl.NumberFormat('ko-KR');
const int = (n: number) => nf.format(Math.round(n || 0));
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString('ko-KR') : '—');

// 콘솔 모델 이름 -> API 모델 ID. 엔진이 없는 모델은 준비 중으로 둔다.
const PLAY_MODELS: { id: string | null; name: string; desc: string }[] = [
  { id: 'lars-native', name: 'LARS Native', desc: '빠른 구현과 실행' },
  { id: 'lars-cosmos', name: 'LARS Cosmos', desc: '깊이 있는 분석과 아키텍처' },
  { id: 'lars-prime', name: 'LARS Prime', desc: '데이터 검증과 근거 중심' },
  { id: 'rekora', name: 'Rekora', desc: '3D 설계와 비주얼 디자인' },
  { id: 'synzora', name: 'Synzora', desc: '데이터 그래프와 관계 분석' },
  { id: 'aivora', name: 'Aivora', desc: '감정 분석' },
  { id: 'exaone', name: 'K-EXAONE 2.5', desc: '에이전트형 한국어 모델' },
  { id: null, name: 'Luminaic', desc: '준비 중' },
];

type Msg = { role: 'user' | 'assistant' | 'system'; content: string };

export function Playground() {
  const [modelId, setModelId] = useState('lars-native');
  const [system, setSystem] = useState('');
  const [history, setHistory] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    const next: Msg[] = [...history, { role: 'user', content: text }];
    setHistory(next);
    setInput('');
    setBusy(true);
    setError(null);
    try {
      const messages = [...(system.trim() ? [{ role: 'system', content: system.trim() }] : []), ...next];
      const data = await call<{ reply: string }>('POST', '/console/playground', { model: modelId, messages });
      setHistory([...next, { role: 'assistant', content: data.reply }]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const current = PLAY_MODELS.find((m) => m.id === modelId);
  return (
    <>
      <div className="page-head"><h1>플레이그라운드</h1>
        <button className="btn ghost small" onClick={() => { setHistory([]); setError(null); }} disabled={busy}>대화 지우기</button>
      </div>
      <p className="sub">프리즘 모델을 콘솔에서 바로 호출합니다. 호출은 사용량에 기록되지만, 대화 내용은 서버에 저장하지 않습니다.</p>

      <section className="card wide">
        <div className="row-between">
          <label className="field-label" htmlFor="pg-model">모델</label>
          <select id="pg-model" className="select" value={modelId} onChange={(e) => setModelId(e.target.value)}>
            {PLAY_MODELS.map((m) => (
              <option key={m.name} value={m.id ?? ''} disabled={!m.id}>{m.name}{m.id ? '' : ' (준비 중)'}</option>
            ))}
          </select>
        </div>
        <div className="sub">{current?.desc}</div>
        <label className="field-label" htmlFor="pg-system" style={{ marginTop: 12, display: 'block' }}>시스템 지침 (선택)</label>
        <textarea id="pg-system" className="textarea" rows={2} value={system} onChange={(e) => setSystem(e.target.value)} placeholder="모든 대화에 적용할 지침" />
      </section>

      <section className="card wide chat-log" aria-live="polite">
        {history.length === 0 && <div className="empty">메시지를 입력해 대화를 시작하세요.</div>}
        {history.map((m, i) => (
          <div key={i} className={`bubble ${m.role}`}>
            <div className="bubble-role">{m.role === 'user' ? '나' : current?.name ?? '모델'}</div>
            <div className="bubble-text">{m.content}</div>
          </div>
        ))}
        {busy && <div className="sub">응답을 기다리는 중…</div>}
        {error && <div className="error-text">{error}</div>}
      </section>

      <section className="card wide">
        <textarea className="textarea" rows={3} value={input} placeholder="메시지를 입력하세요 (Enter 보내기, Shift+Enter 줄바꿈)"
          aria-label="메시지 입력" disabled={busy || !current?.id}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
        <div className="row-between" style={{ marginTop: 8 }}>
          <span className="sub">분당 20회까지 보낼 수 있습니다.</span>
          <button className="btn primary" onClick={send} disabled={busy || !input.trim() || !current?.id}>보내기</button>
        </div>
      </section>
    </>
  );
}

export function Limits() {
  const [limits, setLimits] = useState<Record<string, string>>({ monthly_tokens: '', weekly_tokens: '', session_tokens: '' });
  const [isAdmin, setIsAdmin] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    call<{ limits: Record<string, number>; is_admin: boolean }>('GET', '/console/limits')
      .then((d) => {
        setIsAdmin(d.is_admin);
        setLimits({
          monthly_tokens: String(d.limits.monthly_tokens ?? ''),
          weekly_tokens: String(d.limits.weekly_tokens ?? ''),
          session_tokens: String(d.limits.session_tokens ?? ''),
        });
      })
      .catch((e) => setErr((e as Error).message));
  }, []);

  const save = async () => {
    setBusy(true); setMsg(null); setErr(null);
    try {
      const body = Object.fromEntries(Object.entries(limits).map(([k, v]) => [k, v === '' ? null : Number(v)]));
      const d = await call<{ limits: Record<string, number> }>('PUT', '/console/limits', body);
      setMsg(`저장했습니다. 현재 한도: ${Object.keys(d.limits).length === 0 ? '제한 없음' : Object.entries(d.limits).map(([k, v]) => `${k} ${int(v)}`).join(', ')}`);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const rows: [string, string, string][] = [
    ['monthly_tokens', '월간 한도', '이번 달 입력과 출력 토큰의 합계'],
    ['weekly_tokens', '최근 7일 한도', '최근 7일 토큰의 합계'],
    ['session_tokens', '세션 한도', '서버를 띄운 뒤부터의 토큰 합계'],
  ];
  return (
    <>
      <div className="page-head"><h1>한도 설정</h1></div>
      <p className="sub">토큰 한도를 넘으면 사용량 화면에서 빨간색으로 표시됩니다. 빈칸은 제한 없음입니다.</p>
      {!isAdmin && <div className="notice">관리자만 한도를 바꿀 수 있습니다. 현재 값은 보기만 할 수 있습니다.</div>}
      <section className="card wide">
        {rows.map(([key, label, desc]) => (
          <div className="kv limit-row" key={key}>
            <div>
              <div className="step-title">{label}</div>
              <div className="sub">{desc}</div>
            </div>
            <input className="num-input" type="number" min={0} inputMode="numeric" aria-label={label}
              value={limits[key]} disabled={!isAdmin || busy}
              placeholder="제한 없음"
              onChange={(e) => setLimits({ ...limits, [key]: e.target.value })} />
          </div>
        ))}
        <div className="row-between" style={{ marginTop: 12 }}>
          <span className="sub">{msg}{err && <span className="error-text">{err}</span>}</span>
          <button className="btn primary" onClick={save} disabled={!isAdmin || busy}>{busy ? '저장 중…' : '저장'}</button>
        </div>
      </section>
    </>
  );
}

export function DataControls() {
  const [info, setInfo] = useState<any>(null);
  const [days, setDays] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pendingPrune, setPendingPrune] = useState(false);

  const load = async () => {
    try {
      const d = await call<any>('GET', '/console/data');
      setInfo(d);
      setIsAdmin(d.is_admin);
      setDays(String(d.retention_days || 0));
    } catch (e) {
      setErr((e as Error).message);
    }
  };
  useEffect(() => { load(); }, []);

  const saveRetention = async () => {
    setErr(null); setMsg(null);
    try {
      await call('PUT', '/console/data/retention', { days: Number(days) || 0 });
      setMsg(Number(days) ? `${days}일이 지난 기록은 '지금 정리'로 지울 수 있습니다.` : '보관 기간을 무기한으로 설정했습니다.');
      load();
    } catch (e) { setErr((e as Error).message); }
  };

  const prune = async () => {
    if (!pendingPrune) { setPendingPrune(true); return; }
    setPendingPrune(false); setErr(null); setMsg(null);
    try {
      const d = await call<{ removed: number }>('POST', '/console/data/prune');
      setMsg(`${int(d.removed)}건을 지웠습니다.`);
      load();
    } catch (e) { setErr((e as Error).message); }
  };

  const exportCsv = async () => {
    setErr(null);
    try {
      const res = await fetch(`${API}/console/usage.csv`, { headers: { Authorization: `Bearer ${token() ?? ''}` } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement('a');
      a.href = url; a.download = 'prism-usage.csv';
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (e) { setErr((e as Error).message); }
  };

  return (
    <>
      <div className="page-head"><h1>데이터 제어</h1></div>
      <p className="sub">콘솔에 쌓이는 사용량 기록을 확인하고 관리합니다. 프롬프트와 응답 내용은 저장하지 않습니다.</p>

      <section className="card wide">
        <div className="card-label">저장되는 내용</div>
        {(info?.stores ?? []).map((s: string) => <div className="sub" key={s}>· {s}</div>)}
      </section>

      <section className="card wide">
        <div className="card-label">현재 기록</div>
        <div className="kv"><span>기록 수</span><span>{int(info?.records ?? 0)}건</span></div>
        <div className="kv"><span>가장 오래된 기록</span><span>{when(info?.oldest)}</span></div>
        <div className="kv"><span>가장 최근 기록</span><span>{when(info?.newest)}</span></div>
        <div className="kv"><span>보관 기간</span><span>{info?.retention_days ? `${info.retention_days}일` : '무기한'}</span></div>
      </section>

      {!isAdmin && <div className="notice">관리자만 보관 기간을 바꾸거나 기록을 지울 수 있습니다.</div>}

      <section className="card wide">
        <div className="card-label">보관 기간</div>
        <div className="create-row">
          <input className="num-input" type="number" min={0} max={3650} aria-label="보관 일수" value={days}
            disabled={!isAdmin} onChange={(e) => setDays(e.target.value)} placeholder="0 = 무기한" />
          <span className="sub" style={{ alignSelf: 'center' }}>일 (0 = 무기한)</span>
          <button className="btn primary" onClick={saveRetention} disabled={!isAdmin}>저장</button>
        </div>
        <div className="row-between" style={{ marginTop: 14 }}>
          <div className="sub">기간이 지난 기록은 자동으로 지워지지 않습니다. 필요할 때 아래 버튼으로 정리합니다.</div>
          <button className="btn ghost" onClick={prune} disabled={!isAdmin || !info?.retention_days}>
            {pendingPrune ? '한 번 더 눌러 지우기' : '지금 정리'}
          </button>
        </div>
      </section>

      <section className="card wide">
        <div className="card-label">내보내기</div>
        <div className="row-between">
          <span className="sub">사용량 기록을 CSV 파일로 받습니다. 키 ID와 내용은 포함되지 않습니다.</span>
          <button className="btn ghost" onClick={exportCsv} disabled={!isAdmin}>CSV 내려받기</button>
        </div>
      </section>

      {msg && <div className="notice">{msg}</div>}
      {err && <div className="error-text">{err}</div>}
    </>
  );
}

// ---------- 리소스: 파일, 스킬, 웹훅 ----------

const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleString('ko-KR') : '—');
const fmtSize = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)}MB` : `${Math.max(1, Math.round(n / 1024))}KB`);

export function Files() {
  const [files, setFiles] = useState<any[]>([]);
  const [allowed, setAllowed] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  const load = () => call<any>('GET', '/console/files').then((d) => { setFiles(d.files); setAllowed(d.allowed); }).catch((e) => setErr((e as Error).message));
  useEffect(() => { load(); }, []);

  const upload = async (file: File) => {
    setBusy(true); setErr(null); setMsg(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${API}/console/files`, { method: 'POST', headers: { Authorization: `Bearer ${token() ?? ''}` }, body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
      setMsg(`${data.file.name} 을(를) 올렸습니다.`);
      load();
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };

  const download = async (f: any) => {
    try {
      const res = await fetch(`${API}/console/files/${f.id}/content`, { headers: { Authorization: `Bearer ${token() ?? ''}` } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement('a'); a.href = url; a.download = f.name;
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch (e) { setErr((e as Error).message); }
  };

  const remove = async (id: string) => {
    if (pending !== id) { setPending(id); return; }
    setPending(null);
    try { await call('DELETE', `/console/files/${id}`); load(); } catch (e) { setErr((e as Error).message); }
  };

  return (
    <>
      <div className="page-head"><h1>파일</h1></div>
      <p className="sub">콘솔에 올려 둘 파일입니다. 10MB까지, {allowed.join(' · ')} 형식을 올릴 수 있습니다. 올린 파일은 나만 볼 수 있습니다.</p>
      <section className="card wide">
        <label className="btn primary" style={{ cursor: busy ? 'default' : 'pointer', width: 'fit-content' }}>
          {busy ? '올리는 중…' : '파일 선택'}
          <input type="file" hidden disabled={busy} accept={allowed.join(',')}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ''; }} />
        </label>
        {msg && <div className="sub" style={{ marginTop: 8 }}>{msg}</div>}
        {err && <div className="error-text">{err}</div>}
      </section>
      <section className="card wide">
        {files.length === 0 ? <div className="empty">올린 파일이 없습니다.</div> : (
          <div className="table-scroll">
            <table className="table">
              <thead><tr><th>이름</th><th className="num">크기</th><th>올린 시각</th><th /></tr></thead>
              <tbody>
                {files.map((f) => (
                  <tr key={f.id}>
                    <td>{f.name}</td>
                    <td className="num">{fmtSize(f.size)}</td>
                    <td>{fmtDate(f.created_at)}</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button className="link" onClick={() => download(f)}>내려받기</button>{' '}
                      <button className="link danger" onClick={() => remove(f.id)}>{pending === f.id ? '한 번 더 눌러 삭제' : '삭제'}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

export function Skills() {
  const [skills, setSkills] = useState<any[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    call<{ skills: any[] }>('GET', '/console/skills').then((d) => setSkills(d.skills)).catch((e) => setErr((e as Error).message));
  }, []);
  return (
    <>
      <div className="page-head"><h1>스킬</h1></div>
      <p className="sub">프리즘에 설치된 스킬 목록입니다. 설치와 활성화는 Prism 앱의 설정 → 스킬에서 합니다.</p>
      {err && <div className="error-text">{err}</div>}
      {skills === null && !err && <div className="empty">불러오는 중…</div>}
      {skills && skills.length === 0 && <div className="empty card">설치된 스킬이 없습니다.</div>}
      {skills && skills.length > 0 && (
        <div className="model-grid">
          {skills.map((s) => (
            <section className="card" key={s.name}>
              <div className="step-title">{s.name} <span className={`status ${s.enabled ? 'ok' : 'warn'}`}>{s.enabled ? '사용 중' : '꺼짐'}</span></div>
              <div className="sub" style={{ marginTop: 6 }}>{s.description || '설명이 없습니다.'}</div>
              <div className="sub" style={{ marginTop: 8 }}>파일 {s.files}개 · 설치 {s.installed_at ? fmtDate(s.installed_at) : '—'}</div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}

export function Webhooks() {
  const [hooks, setHooks] = useState<any[]>([]);
  const [events, setEvents] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [created, setCreated] = useState<{ secret: string; name: string } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  const load = () => call<any>('GET', '/console/webhooks').then((d) => { setHooks(d.webhooks); setEvents(d.events); }).catch((e) => setErr((e as Error).message));
  useEffect(() => { load(); }, []);

  const create = async () => {
    setErr(null); setMsg(null);
    try {
      const d = await call<any>('POST', '/console/webhooks', { name: name.trim(), url: url.trim(), events: picked });
      setCreated({ secret: d.webhook.secret, name: d.webhook.name });
      setName(''); setUrl(''); setPicked([]);
      load();
    } catch (e) { setErr((e as Error).message); }
  };

  const test = async (id: string) => {
    setErr(null); setMsg(null);
    try {
      const d = await call<any>('POST', `/console/webhooks/${id}/test`);
      setMsg(d.ok ? `테스트 전송 성공 (응답 ${d.status})` : `테스트 전송 실패 (응답 ${d.status || '없음'})`);
    } catch (e) { setErr((e as Error).message); }
  };

  const remove = async (id: string) => {
    if (pending !== id) { setPending(id); return; }
    setPending(null);
    try { await call('DELETE', `/console/webhooks/${id}`); load(); } catch (e) { setErr((e as Error).message); }
  };

  return (
    <>
      <div className="page-head"><h1>웹훅</h1></div>
      <p className="sub">이벤트가 생기면 등록한 주소로 알립니다. 주소는 https만 쓸 수 있고, 내부 네트워크 주소는 막혀 있습니다.</p>

      {created && (
        <section className="card wide secret">
          <div className="card-label">'{created.name}' 웹훅 서명 비밀값</div>
          <div className="sub">이 값은 지금만 보입니다. 받는 쪽에서 X-Prism-Signature 헤더를 검증할 때 씁니다.</div>
          <code className="secret-value" style={{ display: 'block', marginTop: 8 }}>{created.secret}</code>
          <button className="link" onClick={() => setCreated(null)}>닫기</button>
        </section>
      )}

      <section className="card wide">
        <div className="card-label">새 웹훅</div>
        <div className="create-row">
          <input className="text-input" placeholder="이름" aria-label="웹훅 이름" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
          <input className="text-input" placeholder="https://example.com/hook" aria-label="웹훅 주소" value={url} onChange={(e) => setUrl(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 10 }}>
          {events.map((ev) => (
            <label key={ev} className="sub" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input type="checkbox" checked={picked.includes(ev)} onChange={(e) => setPicked(e.target.checked ? [...picked, ev] : picked.filter((x) => x !== ev))} />
              {ev === 'limit.reached' ? '토큰 한도에 도달' : ev}
            </label>
          ))}
        </div>
        <div className="row-between" style={{ marginTop: 10 }}>
          <span className="sub">최대 10개</span>
          <button className="btn primary" onClick={create} disabled={!name.trim() || !url.trim() || picked.length === 0}>만들기</button>
        </div>
      </section>

      {msg && <div className="notice">{msg}</div>}
      {err && <div className="error-text">{err}</div>}

      <section className="card wide">
        {hooks.length === 0 ? <div className="empty">등록한 웹훅이 없습니다.</div> : (
          <div className="table-scroll">
            <table className="table">
              <thead><tr><th>이름</th><th>주소</th><th>이벤트</th><th>만든 시각</th><th /></tr></thead>
              <tbody>
                {hooks.map((h) => (
                  <tr key={h.id}>
                    <td>{h.name}</td>
                    <td><code>{h.url}</code></td>
                    <td>{h.events.join(', ')}</td>
                    <td>{fmtDate(h.created_at)}</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button className="link" onClick={() => test(h.id)}>테스트</button>{' '}
                      <button className="link danger" onClick={() => remove(h.id)}>{pending === h.id ? '한 번 더 눌러 삭제' : '삭제'}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

// ---------- 배치 ----------

export function Batches() {
  const [models, setModels] = useState<{ id: string; name: string }[]>([]);
  const [modelId, setModelId] = useState('lars-native');
  const [text, setText] = useState('');
  const [jobs, setJobs] = useState<any[]>([]);
  const [open, setOpen] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setModels([
      { id: 'lars-native', name: 'LARS Native' }, { id: 'lars-cosmos', name: 'LARS Cosmos' }, { id: 'lars-prime', name: 'LARS Prime' },
      { id: 'rekora', name: 'Rekora' }, { id: 'synzora', name: 'Synzora' }, { id: 'aivora', name: 'Aivora' }, { id: 'exaone', name: 'K-EXAONE 2.5' },
    ]);
  }, []);

  const load = () => call<any>('GET', '/console/batches').then((d) => setJobs(d.batches)).catch((e) => setErr((e as Error).message));
  useEffect(() => { load(); }, []);
  // 진행 중인 작업이 있으면 주기적으로 새로 고친다.
  useEffect(() => {
    if (!jobs.some((j) => j.status === 'queued' || j.status === 'running')) return;
    const t = setTimeout(load, 2000);
    return () => clearTimeout(t);
  }, [jobs]);

  const prompts = text.split('\n').map((s) => s.trim()).filter(Boolean);

  const submit = async () => {
    setBusy(true); setErr(null);
    try {
      await call('POST', '/console/batches', { model: modelId, prompts });
      setText('');
      load();
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };

  const show = async (id: string) => {
    try { setOpen((await call<any>('GET', `/console/batches/${id}`)).batch); } catch (e) { setErr((e as Error).message); }
  };

  return (
    <>
      <div className="page-head"><h1>배치</h1></div>
      <p className="sub">프롬프트를 한 줄에 하나씩 넣으면 백그라운드에서 순서대로 처리합니다. 한 번에 최대 50개입니다.</p>
      <section className="card wide">
        <div className="row-between">
          <label className="field-label" htmlFor="batch-model">모델</label>
          <select id="batch-model" className="select" value={modelId} onChange={(e) => setModelId(e.target.value)}>
            {models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <textarea className="textarea" rows={6} style={{ marginTop: 10 }} aria-label="프롬프트 목록" value={text}
          placeholder={'한 줄에 프롬프트 하나\n예: 이 문장을 영어로 바꿔 줘: 안녕하세요'} onChange={(e) => setText(e.target.value)} />
        <div className="row-between" style={{ marginTop: 8 }}>
          <span className="sub">{prompts.length}개 / 최대 50개</span>
          <button className="btn primary" onClick={submit} disabled={busy || prompts.length === 0 || prompts.length > 50}>제출</button>
        </div>
        {err && <div className="error-text">{err}</div>}
      </section>

      <section className="card wide">
        <div className="card-label">작업 목록</div>
        {jobs.length === 0 ? <div className="empty">아직 제출한 배치가 없습니다.</div> : (
          <div className="table-scroll">
            <table className="table">
              <thead><tr><th>시각</th><th>모델</th><th>상태</th><th className="num">진행</th><th /></tr></thead>
              <tbody>
                {jobs.map((j) => (
                  <tr key={j.id}>
                    <td>{fmtDate(j.created_at)}</td>
                    <td>{j.model}</td>
                    <td><span className={`status ${j.status === 'done' ? 'ok' : j.status === 'partial' ? 'warn' : ''}`}>{({ queued: '대기 중', running: '처리 중', done: '완료', partial: '일부 실패' } as Record<string, string>)[j.status] ?? j.status}</span></td>
                    <td className="num">{j.done} / {j.total}</td>
                    <td style={{ textAlign: 'right' }}><button className="link" onClick={() => show(j.id)}>결과 보기</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {open && (
        <section className="card wide">
          <div className="row-between">
            <div className="card-label">결과 ({open.done} / {open.total})</div>
            <button className="link" onClick={() => setOpen(null)}>닫기</button>
          </div>
          {open.results.length === 0 && <div className="sub">아직 처리된 결과가 없습니다.</div>}
          {open.results.map((r: any) => (
            <div className="bubble assistant" key={r.index} style={{ marginTop: 8 }}>
              <div className="bubble-role">{r.index + 1}번</div>
              <div className="bubble-text">{r.output ?? r.error}</div>
            </div>
          ))}
        </section>
      )}
    </>
  );
}

// ---------- 팀 ----------

export function Teams() {
  const [teams, setTeams] = useState<any[]>([]);
  const [current, setCurrent] = useState<any | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  const load = () => call<any>('GET', '/console/teams').then((d) => setTeams(d.teams)).catch((e) => setErr((e as Error).message));
  useEffect(() => { load(); }, []);

  const open = async (id: string) => {
    setErr(null); setMsg(null);
    try { setCurrent(await call<any>('GET', `/console/teams/${id}`)); } catch (e) { setErr((e as Error).message); }
  };

  const create = async () => {
    setErr(null);
    try { await call('POST', '/console/teams', { name: name.trim() }); setName(''); load(); } catch (e) { setErr((e as Error).message); }
  };

  const addMember = async () => {
    if (!current) return;
    setErr(null); setMsg(null);
    try {
      await call('POST', `/console/teams/${current.team.id}/members`, { email: email.trim() });
      setEmail(''); setMsg('멤버를 추가했습니다. 그 사람이 로그인하면 팀이 보입니다.');
      open(current.team.id);
    } catch (e) { setErr((e as Error).message); }
  };

  const removeMember = async (addr: string) => {
    if (!current) return;
    if (pending !== addr) { setPending(addr); return; }
    setPending(null);
    try { await call('DELETE', `/console/teams/${current.team.id}/members/${encodeURIComponent(addr)}`); open(current.team.id); } catch (e) { setErr((e as Error).message); }
  };

  if (current) {
    const t = current.team;
    return (
      <>
        <div className="page-head">
          <h1>{t.name}</h1>
          <button className="btn ghost small" onClick={() => { setCurrent(null); load(); }}>팀 목록</button>
        </div>
        <section className="card wide">
          <div className="card-label">멤버 ({t.members.length + 1}명)</div>
          <div className="kv"><span>{t.owner}</span><span className="status ok">팀장</span></div>
          {t.members.map((m: any) => (
            <div className="kv" key={m.email}>
              <span>{m.email}</span>
              {t.is_owner && <button className="link danger" onClick={() => removeMember(m.email)}>{pending === m.email ? '한 번 더 눌러 빼기' : '빼기'}</button>}
            </div>
          ))}
          {t.is_owner && (
            <div className="create-row" style={{ marginTop: 12 }}>
              <input className="text-input" type="email" placeholder="멤버 이메일" aria-label="멤버 이메일" value={email} onChange={(e) => setEmail(e.target.value)} />
              <button className="btn primary" onClick={addMember} disabled={!email.trim()}>추가</button>
            </div>
          )}
          {!t.is_owner && <div className="sub" style={{ marginTop: 10 }}>팀장만 멤버를 추가하거나 뺄 수 있습니다.</div>}
        </section>

        <section className="card wide">
          <div className="card-label">팀원별 API 사용량 (이번 기록 전체)</div>
          <div className="table-scroll">
            <table className="table">
              <thead><tr><th>팀원</th><th className="num">요청</th><th className="num">입력</th><th className="num">출력</th><th>마지막 호출</th></tr></thead>
              <tbody>
                {current.usage.map((u: any) => (
                  <tr key={u.email}>
                    <td>{u.email}</td>
                    <td className="num">{int(u.requests)}</td>
                    <td className="num">{int(u.input_tokens)}</td>
                    <td className="num">{int(u.output_tokens)}</td>
                    <td>{fmtDate(u.last_call)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="sub" style={{ marginTop: 8 }}>팀원이 만든 API 키의 호출을 합산합니다. 콘솔 플레이그라운드 호출은 사용자별로 기록되지 않아 포함되지 않습니다.</div>
        </section>
        {msg && <div className="notice">{msg}</div>}
        {err && <div className="error-text">{err}</div>}
      </>
    );
  }

  return (
    <>
      <div className="page-head"><h1>팀</h1></div>
      <p className="sub">팀을 만들고 멤버를 추가하면 멤버별 API 사용량을 한눈에 볼 수 있습니다.</p>
      <section className="card wide">
        <div className="create-row">
          <input className="text-input" placeholder="팀 이름" aria-label="팀 이름" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
          <button className="btn primary" onClick={create} disabled={!name.trim()}>팀 만들기</button>
        </div>
        {err && <div className="error-text">{err}</div>}
      </section>
      <section className="card wide">
        {teams.length === 0 ? <div className="empty">속한 팀이 없습니다.</div> : teams.map((t) => (
          <div className="kv" key={t.id}>
            <span>{t.name} <span className="sub">· 멤버 {t.members}명{t.is_owner ? ' · 내가 팀장' : ''}</span></span>
            <button className="link" onClick={() => open(t.id)}>열기</button>
          </div>
        ))}
      </section>
    </>
  );
}
