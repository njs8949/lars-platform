import React, { useEffect, useState } from 'react';
import { getToken } from '../lib/auth';
import './ApiSettingsPanel.css';

// 설정 → API 설정. LARS 모델 API의 상태, 연결 확인, 키 목록(읽기 전용)을 보여 준다.
// 키 생성·폐기는 콘솔에서 한다. 비밀값은 여기서 다시 보여 주지 않는다.

const apiBase = () => (window.location.hostname === 'localhost' ? 'http://localhost:8001' : window.location.origin);

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  last_used_at: string | null;
  revoked_at: string | null;
  request_count: number;
}

interface Check {
  label: string;
  ok: boolean;
  detail: string;
}

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '사용 전');

export function ApiSettingsPanel({ onBack }: { onBack?: () => void }) {
  const [keys, setKeys] = useState<ApiKey[] | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [checks, setChecks] = useState<Check[] | null>(null);
  const [checking, setChecking] = useState(false);
  const [copied, setCopied] = useState(false);

  const base = `${window.location.origin}/api/v1`;
  const curl = `curl ${base}/chat/completions \\\n  -H "Authorization: Bearer $LARS_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"model": "lars-native", "messages": [{"role": "user", "content": "안녕하세요"}]}'`;
  const consoleUrl = `${window.location.origin}/console/#/keys`;

  const loadKeys = async () => {
    const token = getToken();
    if (!token) {
      setKeys(null);
      setLoginError('로그인이 필요합니다.');
      return;
    }
    try {
      const res = await fetch(`${apiBase()}/api/console/keys`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401) {
        setLoginError('로그인이 만료되었습니다. 다시 로그인해 주세요.');
        setKeys(null);
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setKeys(data.keys ?? []);
      setLoginError(null);
    } catch (e) {
      setLoginError(`키 정보를 불러오지 못했습니다: ${(e as Error).message}`);
    }
  };

  useEffect(() => { loadKeys(); }, []);

  const runChecks = async () => {
    setChecking(true);
    const out: Check[] = [];
    try {
      const h = await fetch(`${apiBase()}/api/health`);
      out.push({ label: '서버 상태', ok: h.ok, detail: h.ok ? '정상' : `응답 ${h.status}` });
    } catch {
      out.push({ label: '서버 상태', ok: false, detail: '서버에 연결하지 못했습니다' });
    }
    try {
      // 키 없이 호출했을 때 401이 와야 API 경로가 살아 있는 것이다.
      const v = await fetch(`${window.location.origin}/v1/models`);
      const ok = v.status === 401;
      out.push({ label: 'API 주소', ok, detail: ok ? '응답 정상 (인증 필요)' : `예상과 다른 응답 ${v.status}` });
    } catch {
      out.push({ label: 'API 주소', ok: false, detail: '주소에 연결하지 못했습니다' });
    }
    const token = getToken();
    out.push({ label: '로그인', ok: !!token, detail: token ? '로그인됨' : '로그인되지 않음' });
    const active = (keys ?? []).filter((k) => !k.revoked_at);
    out.push({ label: '사용 가능한 키', ok: active.length > 0, detail: active.length > 0 ? `${active.length}개` : '없음. 콘솔에서 키를 만드세요' });
    setChecks(out);
    setChecking(false);
  };

  const copyCurl = async () => {
    try {
      await navigator.clipboard.writeText(curl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* 복사 실패 시 코드 블록을 직접 선택하도록 둔다 */
    }
  };

  const active = (keys ?? []).filter((k) => !k.revoked_at);
  const totalCalls = active.reduce((sum, k) => sum + (k.request_count || 0), 0);

  return (
    <section className="settings-group animate-in">
      {onBack && <button className="back-link" onClick={onBack}>← 뒤로가기</button>}
      <h3 className="group-title">API 설정</h3>

      <div className="settings-list">
        <div className="settings-list-item no-hover">
          <div className="item-info-col">
            <span className="item-label">상태</span>
            <span className="item-desc">
              {loginError
                ? loginError
                : keys === null
                  ? '불러오는 중…'
                  : active.length > 0
                    ? `사용 가능 · 활성 키 ${active.length}개 · 누적 호출 ${totalCalls.toLocaleString('ko-KR')}회`
                    : '사용 가능한 키가 없습니다'}
            </span>
          </div>
        </div>

        <div className="settings-list-item no-hover">
          <div className="item-info-col">
            <span className="item-label">API 주소</span>
            <code className="api-code">{base}</code>
          </div>
        </div>

        <div className="settings-list-item no-hover">
          <div className="item-info-col">
            <span className="item-label">모델</span>
            <span className="item-desc">LARS Native(<code>lars-native</code>, 기본) · LARS Cosmos(<code>lars-cosmos</code>) · LARS Prime(<code>lars-prime</code>) · 확장: Rekora, Synzora, Aivora, K-EXAONE 2.5</span>
          </div>
        </div>

        <div className="settings-list-item no-hover">
          <div className="item-info-col">
            <span className="item-label">인증</span>
            <span className="item-desc">요청 헤더에 <code>Authorization: Bearer 키</code>를 넣습니다. 키는 콘솔에서 만듭니다.</span>
          </div>
        </div>
      </div>

      <h3 className="group-title">연결 확인</h3>
      <div className="settings-list">
        <div className="settings-list-item no-hover" style={{ justifyContent: 'space-between' }}>
          <span className="item-desc">서버, API 주소, 로그인, 키 상태를 한 번에 확인합니다.</span>
          <button className="api-btn" onClick={runChecks} disabled={checking}>{checking ? '확인 중…' : '연결 확인'}</button>
        </div>
        {checks && checks.map((c) => (
          <div className="settings-list-item no-hover" key={c.label}>
            <span className="item-label">{c.ok ? '✓' : '✕'} {c.label}</span>
            <span className="item-desc" style={{ color: c.ok ? '#86efac' : '#fca5a5' }}>{c.detail}</span>
          </div>
        ))}
      </div>

      <h3 className="group-title">내 키</h3>
      <div className="settings-list">
        {keys === null && !loginError && <div className="settings-list-item no-hover"><span className="item-desc">불러오는 중…</span></div>}
        {keys !== null && keys.length === 0 && (
          <div className="settings-list-item no-hover"><span className="item-desc">아직 만든 키가 없습니다.</span></div>
        )}
        {keys !== null && keys.slice(0, 5).map((k) => (
          <div className="settings-list-item no-hover" key={k.id}>
            <div className="item-info-col">
              <span className="item-label">{k.name} {k.revoked_at ? '(폐기됨)' : ''}</span>
              <span className="item-desc"><code>{k.prefix}</code> · 마지막 사용 {fmt(k.last_used_at)} · 요청 {k.request_count}회</span>
            </div>
          </div>
        ))}
        <div className="settings-list-item no-hover" style={{ justifyContent: 'space-between' }}>
          <span className="item-desc">키 만들기와 폐기는 콘솔에서 합니다.</span>
          <a className="api-btn" href={consoleUrl} target="_blank" rel="noreferrer">콘솔에서 관리 ↗</a>
        </div>
      </div>

      <h3 className="group-title">사용 예시</h3>
      <div className="settings-list">
        <div className="settings-list-item no-hover" style={{ display: 'block' }}>
          <pre className="api-code-block">{curl}</pre>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
            <span className="item-desc">키는 환경 변수 LARS_API_KEY에 넣어 쓰세요.</span>
            <button className="api-btn" onClick={copyCurl}>{copied ? '복사됨' : '복사'}</button>
          </div>
        </div>
      </div>
    </section>
  );
}
