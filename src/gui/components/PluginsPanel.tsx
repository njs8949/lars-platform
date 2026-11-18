import React, { useEffect, useMemo, useState } from 'react';
import { Search, RefreshCw, Plus, X, Trash2, Play, Check, AlertTriangle } from 'lucide-react';
import { getToken } from '../lib/auth';

const apiBase = () => (window.location.hostname === 'localhost' ? 'http://localhost:8001/api' : '/api');

interface ToolDef { name: string; description: string; method: string; path: string; parameters: Record<string, string> }
interface Plugin {
  id: string; name: string; description: string; version: string; endpoint: string; auth: 'none' | 'bearer';
  tools: ToolDef[]; enabled: boolean; has_token: boolean;
}
interface Preview { plugin: Plugin; warnings: string[]; replaces: boolean }
interface OAuthService {
  key: string; name: string; icon: string; color: string; category: string; description: string;
  configured: boolean; connected: boolean; installed: boolean;
}
interface CatalogApp {
  key: string; name: string; category: string; icon: string; color: string; description: string;
  manifest: Record<string, unknown>;
}

const SAMPLE = `{
  "id": "weather-check",
  "name": "날씨 조회",
  "version": "1.0.0",
  "description": "도시 이름으로 현재 날씨를 조회합니다.",
  "endpoint": "https://api.example.com",
  "auth": { "type": "none" },
  "tools": [
    {
      "name": "get_weather",
      "description": "도시의 현재 날씨를 가져옵니다.",
      "method": "GET",
      "path": "/weather",
      "parameters": { "city": "string" }
    }
  ]
}`;

const COLORS: Record<string, string> = { clock: '#6366f1', units: '#0ea5e9', calc: '#f59e0b', dday: '#10b981' };

const card: React.CSSProperties = {
  border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 14, background: 'rgba(255,255,255,0.03)',
};
const input: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)',
  background: 'transparent', color: '#fff', fontFamily: 'inherit', boxSizing: 'border-box',
};
const btn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', flexShrink: 0 };

// 실제 서비스의 공식 아이콘 (public/icons 에 있는 파일)
const SERVICE_ICON: Record<string, string> = {
  'google-drive': '/icons/google-drive.webp',
  'google-calendar': '/icons/google-calendar.svg',
  gmail: '/icons/gmail.svg',
  github: '/icons/github.webp',
  outlook: '/icons/outlook.webp',
  notion: '/icons/notion.png',
  slack: '/icons/slack.jpg',
};

function IconBadge({ icon, color, size = 40, src }: { icon: string; color: string; size?: number; src?: string }) {
  if (src) {
    return (
      <div style={{
        width: size, height: size, borderRadius: 10, background: '#ffffff', display: 'flex',
        alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: size * 0.16, boxSizing: 'border-box',
      }}>
        <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </div>
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: 10, background: color, display: 'flex',
      alignItems: 'center', justifyContent: 'center', fontSize: size * 0.5, flexShrink: 0,
    }}>{icon || '🧩'}</div>
  );
}

/** 앱 및 확장: 추천 앱을 카드로 설치하고, 설치한 앱의 도구를 켜고 끈다. 직접 추가도 가능하다. */
export const PluginsPanel: React.FC = () => {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [catalog, setCatalog] = useState<CatalogApp[]>([]);
  const [services, setServices] = useState<OAuthService[]>([]);
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [manifestText, setManifestText] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [reviewed, setReviewed] = useState(false);
  const [tokenDraft, setTokenDraft] = useState<Record<string, string>>({});
  const [paramDraft, setParamDraft] = useState<Record<string, Record<string, string>>>({});
  const [runResult, setRunResult] = useState<Record<string, string>>({});
  const [runConfirm, setRunConfirm] = useState<Record<string, boolean>>({});

  const headers = (json: boolean): Record<string, string> => ({
    Authorization: `Bearer ${getToken() ?? ''}`, ...(json ? { 'Content-Type': 'application/json' } : {}),
  });

  const load = async () => {
    try {
      const response = await fetch(`${apiBase()}/plugins`, { headers: headers(false) });
      const data = await response.json();
      setPlugins(data.plugins || []);
    } catch {
      setMessage('백엔드에 연결할 수 없습니다.');
    }
    try {
      const response = await fetch(`${apiBase()}/plugins/catalog`);
      const data = await response.json();
      setCatalog(data.apps || []);
    } catch {
      setCatalog([]);
    }
    try {
      const response = await fetch(`${apiBase()}/oauth/services`, { headers: headers(false) });
      const data = await response.json();
      setServices(data.services || []);
    } catch {
      setServices([]);
    }
  };
  useEffect(() => {
    load();
    const params = new URLSearchParams(window.location.search);
    const result = params.get('oauth');
    if (result) {
      const name = params.get('service') || '';
      setMessage(result === 'ok' ? `${name} 연결이 완료되었습니다.` : '연결하지 못했습니다. 다시 시도해 주세요.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // 실제 서비스: 연결 주소를 받아 서비스 로그인 화면으로 이동한다.
  const connectService = async (service: OAuthService) => {
    const data = await post(`/oauth/${service.key}/start`, 'POST');
    if (data?.url) window.location.href = data.url;
  };
  const disconnectService = async (service: OAuthService) => {
    if (!window.confirm(`${service.name} 연결을 해제할까요? 저장된 토큰이 지워지고 앱이 삭제됩니다.`)) return;
    await post(`/oauth/${service.key}`, 'DELETE');
    load();
  };

  const post = async (path: string, method: string, body?: unknown) => {
    setBusy(true); setMessage(null);
    try {
      const response = await fetch(`${apiBase()}${path}`, {
        method, headers: headers(body !== undefined), body: body === undefined ? undefined : JSON.stringify(body),
      });
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

  const installedIds = useMemo(() => new Set(plugins.map((p) => p.id)), [plugins]);
  const q = query.trim().toLowerCase();
  const matches = (name: string, desc: string) => !q || name.toLowerCase().includes(q) || desc.toLowerCase().includes(q);
  const installedShown = plugins.filter((p) => matches(p.name, p.description));
  const catalogShown = catalog.filter((c) => matches(c.name, c.description));
  const detail = plugins.find((p) => p.id === detailId) || null;

  // 추천 앱 설치: 우리 서버가 제공하는 앱이므로 버튼을 누른 것을 확인으로 본다.
  const installCatalog = async (app: CatalogApp) => {
    const data = await post('/plugins/install', 'POST', { manifest: app.manifest, confirmed: true });
    if (data) await load();
  };
  const toggle = async (plugin: Plugin) => { await post(`/plugins/${plugin.id}`, 'PUT', { enabled: !plugin.enabled }); load(); };
  const remove = async (plugin: Plugin) => {
    if (!window.confirm(`'${plugin.name}' 앱을 삭제할까요?`)) return;
    await post(`/plugins/${plugin.id}`, 'DELETE');
    setDetailId(null);
    load();
  };
  const saveToken = async (plugin: Plugin) => {
    await post(`/plugins/${plugin.id}/token`, 'PUT', { token: tokenDraft[plugin.id] || '' });
    setTokenDraft({ ...tokenDraft, [plugin.id]: '' });
    load();
  };
  const run = async (plugin: Plugin, tool: ToolDef) => {
    const key = `${plugin.id}:${tool.name}`;
    const data = await post(`/plugins/${plugin.id}/call`, 'POST', {
      tool: tool.name, params: paramDraft[key] || {}, confirmed: !!runConfirm[key],
    });
    if (data) setRunResult({ ...runResult, [key]: `HTTP ${data.result.status}${data.result.truncated ? ' (64KB까지만 표시)' : ''}\n${data.result.body}` });
  };

  // 직접 추가
  const check = async () => {
    let manifest: unknown;
    try { manifest = JSON.parse(manifestText); } catch { setMessage('JSON 형식이 올바르지 않습니다.'); return; }
    const data = await post('/plugins/preview', 'POST', { manifest });
    if (data) { setPreview(data); setReviewed(false); }
  };
  const installCustom = async () => {
    if (!preview) return;
    const data = await post('/plugins/install', 'POST', { manifest: JSON.parse(manifestText), confirmed: reviewed });
    if (data) { setPreview(null); setManifestText(''); setAddOpen(false); await load(); }
  };

  const toolBox = (plugin: Plugin, tool: ToolDef) => {
    const key = `${plugin.id}:${tool.name}`;
    return (
      <div key={key} style={{ ...card, display: 'grid', gap: 8 }}>
        <div style={{ fontSize: 13, color: '#e5e7eb' }}><b>{tool.name}</b> <span style={{ color: 'rgba(255,255,255,0.5)' }}>{tool.description}</span></div>
        {Object.entries(tool.parameters).map(([pname, ptype]) => (
          <input key={pname} style={input} placeholder={`${pname} (${ptype})`} value={(paramDraft[key] || {})[pname] || ''}
            onChange={(e) => setParamDraft({ ...paramDraft, [key]: { ...(paramDraft[key] || {}), [pname]: e.target.value } })} />
        ))}
        <label style={{ fontSize: 12, color: '#e5e7eb', display: 'flex', gap: 6 }}>
          <input type="checkbox" checked={!!runConfirm[key]} onChange={(e) => setRunConfirm({ ...runConfirm, [key]: e.target.checked })} />
          위 입력값이 {plugin.endpoint}로 전송되는 것을 확인했습니다.
        </label>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="feature-btn primary" style={btn} disabled={busy || !runConfirm[key]} onClick={() => run(plugin, tool)}><Play size={14} /> 실행</button>
        </div>
        {runResult[key] && (
          <pre style={{ maxHeight: 200, overflowY: 'auto', whiteSpace: 'pre-wrap', fontSize: 12, color: '#cbd5e1', background: 'rgba(0,0,0,0.3)', padding: 10, borderRadius: 8, margin: 0 }}>{runResult[key]}</pre>
        )}
      </div>
    );
  };

  return (
    <section className="settings-group animate-in" style={{ display: 'grid', gap: 18 }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <h3 className="group-title" style={{ margin: 0, flex: 1 }}>앱 및 확장</h3>
        <div style={{ position: 'relative', minWidth: 220 }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: 10, color: 'rgba(255,255,255,0.45)' }} />
          <input style={{ ...input, paddingLeft: 32 }} placeholder="앱 검색" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <button className="feature-btn" style={btn} onClick={load} title="새로고침"><RefreshCw size={14} /></button>
        <button className="feature-btn primary" style={btn} onClick={() => { setAddOpen(true); setPreview(null); setMessage(null); }}>
          <Plus size={14} /> 직접 추가
        </button>
      </div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>
        앱을 설치하면 채팅에서 모델이 필요할 때 앱의 기능을 쓸 수 있습니다. 앱이 외부로 내용을 보내는 경우 승인 카드가 먼저 나옵니다.
      </div>
      {message && <div style={{ color: '#ff6b9d', fontSize: 13 }}>{message}</div>}

      {/* 설치된 앱 */}
      <div style={{ display: 'grid', gap: 10 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>설치된 앱 ({plugins.length})</div>
        {installedShown.length === 0 && <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>아직 연결한 앱이 없습니다. 아래 인기 서비스에서 연결하거나 직접 추가해 보세요.</div>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
          {installedShown.map((p) => (
            <div key={p.id} style={{ ...card, display: 'flex', gap: 12, alignItems: 'center', cursor: 'pointer' }} onClick={() => setDetailId(p.id)}>
              <IconBadge icon={catalog.find((c) => c.key === p.id)?.icon || '🧩'} color={COLORS[p.id] || '#64748b'} src={SERVICE_ICON[p.id]} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, color: '#f1f5f9', fontWeight: 600 }}>{p.name}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.description}</div>
              </div>
              <input type="checkbox" className="ios-switch" checked={p.enabled} disabled={busy}
                onClick={(e) => e.stopPropagation()} onChange={() => toggle(p)} title={p.enabled ? '켜짐' : '꺼짐'} />
            </div>
          ))}
        </div>
      </div>

      {/* 실제 서비스 */}
      <div style={{ display: 'grid', gap: 10 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>인기 서비스</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
          연결하면 서비스 계정으로 로그인해서 동의한 범위 안에서만 읽습니다. 연결 해제는 언제든 할 수 있습니다.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
          {services.filter((svc) => matches(svc.name, svc.description)).map((svc) => (
            <div key={svc.key} style={{ ...card, display: 'flex', gap: 12, alignItems: 'center' }}>
              <IconBadge icon={svc.icon} color={svc.color} src={SERVICE_ICON[svc.key]} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, color: '#f1f5f9', fontWeight: 600 }}>{svc.name}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{svc.description}</div>
              </div>
              {!svc.configured ? (
                <span style={{ fontSize: 12, color: '#fcd34d' }} title="서버에 클라이언트 ID와 비밀값을 넣어야 연결할 수 있습니다">설정 필요</span>
              ) : svc.connected ? (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: '#86efac', display: 'inline-flex', gap: 4, alignItems: 'center' }}><Check size={13} /> 연결됨</span>
                  <button className="feature-btn" style={btn} disabled={busy} onClick={() => disconnectService(svc)}>해제</button>
                </div>
              ) : (
                <button className="feature-btn primary" style={btn} disabled={busy} onClick={() => connectService(svc)}>연결하기</button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 앱 상세: 도구, 토큰, 실행 */}
      {detail && (
        <div onClick={() => setDetailId(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...card, background: '#111827', width: 'min(640px, 100%)', maxHeight: '86vh', overflowY: 'auto', display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <IconBadge icon={catalog.find((c) => c.key === detail.id)?.icon || '🧩'} color={COLORS[detail.id] || '#64748b'} src={SERVICE_ICON[detail.id]} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, color: '#f1f5f9', fontWeight: 700 }}>{detail.name} <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>v{detail.version}</span></div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{detail.description}</div>
              </div>
              <button className="feature-btn" style={btn} onClick={() => setDetailId(null)} title="닫기"><X size={14} /></button>
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>서비스: {detail.endpoint} · 인증: {detail.auth === 'bearer' ? '토큰' : '없음'}</div>
            {detail.auth === 'bearer' && (
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="password" style={{ ...input, flex: 1, minWidth: 0 }} value={tokenDraft[detail.id] || ''}
                  onChange={(e) => setTokenDraft({ ...tokenDraft, [detail.id]: e.target.value })}
                  placeholder={detail.has_token ? '토큰 저장됨 (새 값을 넣으면 바꿉니다)' : '서비스 토큰 입력'} />
                <button className="feature-btn" style={btn} disabled={busy} onClick={() => saveToken(detail)}>토큰 저장</button>
              </div>
            )}
            <div style={{ display: 'grid', gap: 10 }}>
              {detail.enabled
                ? detail.tools.map((tool) => toolBox(detail, tool))
                : <div style={{ fontSize: 13, color: '#fcd34d' }}>이 앱은 꺼져 있습니다. 목록의 스위치를 켜면 도구를 쓸 수 있습니다.</div>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button className="feature-btn" style={{ ...btn, color: '#fca5a5' }} disabled={busy} onClick={() => remove(detail)}><Trash2 size={14} /> 삭제</button>
              <button className="feature-btn" style={btn} onClick={() => setDetailId(null)}>닫기</button>
            </div>
          </div>
        </div>
      )}

      {/* 직접 추가 */}
      {addOpen && (
        <div onClick={() => setAddOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...card, background: '#111827', width: 'min(640px, 100%)', maxHeight: '86vh', overflowY: 'auto', display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ flex: 1, fontSize: 16, color: '#f1f5f9', fontWeight: 700 }}>앱 직접 추가</div>
              <button className="feature-btn" style={btn} onClick={() => setAddOpen(false)} title="닫기"><X size={14} /></button>
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>앱의 매니페스트(JSON)를 붙여 넣으면 내용을 검사한 뒤 설치합니다.</div>
            <textarea style={{ ...input, minHeight: 160, fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12 }} value={manifestText}
              onChange={(e) => setManifestText(e.target.value)} placeholder={SAMPLE} />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
              <button className="feature-btn" style={btn} onClick={() => setManifestText(SAMPLE)}>예시 넣기</button>
              <button className="feature-btn" style={btn} disabled={busy || !manifestText.trim()} onClick={check}>내용 검사하기</button>
            </div>
            {preview && (
              <div style={{ ...card, display: 'grid', gap: 10, borderColor: 'rgba(123,123,246,0.45)' }}>
                <div style={{ fontWeight: 700, color: '#f1f5f9' }}>설치 전 확인 · {preview.plugin.name}</div>
                <div style={{ fontSize: 13, color: '#d1d5db' }}>{preview.plugin.description}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>서비스: {preview.plugin.endpoint} · 인증: {preview.plugin.auth === 'bearer' ? '토큰' : '없음'}</div>
                {preview.plugin.tools.map((t) => (
                  <div key={t.name} style={{ fontSize: 12, color: '#cbd5e1' }}>• {t.name} ({t.method} {t.path}) — {t.description}</div>
                ))}
                {preview.replaces && <div style={{ fontSize: 12, color: '#fcd34d' }}>같은 id의 앱이 있어 설치하면 덮어씁니다.</div>}
                <div style={{ padding: 10, borderRadius: 8, border: '1px solid rgba(252,211,77,0.45)', background: 'rgba(252,211,77,0.07)', display: 'grid', gap: 6 }}>
                  {preview.warnings.map((w, i) => <div key={i} style={{ fontSize: 12, color: '#fde68a', display: 'flex', gap: 6 }}><AlertTriangle size={13} /> {w}</div>)}
                </div>
                <label style={{ fontSize: 13, color: '#e5e7eb', display: 'flex', gap: 6 }}>
                  <input type="checkbox" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} /> 서비스 주소와 도구 내용을 확인했습니다.
                </label>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button className="feature-btn" style={btn} onClick={() => setPreview(null)}>취소</button>
                  <button className="feature-btn primary" style={btn} disabled={busy || !reviewed} onClick={installCustom}><Check size={14} /> 설치</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default PluginsPanel;
