import React, { useEffect, useMemo, useState } from 'react';
import { Playground, Limits, DataControls, Files, Skills, Webhooks, Batches, Teams } from './Pages';

// ---------- 설정 ----------

// 상대 경로: 운영은 같은 도메인, 개발은 vite 프록시(CONSOLE_API)로 전달
const API = '/api';
const MAIN_APP = '/';
const KRW_PER_USD = 1300; // 표시용 참고 환율 (실제 청구 환율 아님)
type Range = '24h' | '7d' | '14d' | '30d';
const RANGES: Range[] = ['24h', '7d', '14d', '30d'];

// ---------- 타입 ----------

interface Totals { requests: number; input_tokens: number; output_tokens: number; estimated_cost: number }
interface Bucket extends Totals { unpriced_requests: number }
interface Point { date: string; requests: number; input_tokens: number; output_tokens: number; estimated_cost: number }
interface Overview {
  range: Range;
  month: { totals: Totals & { unpriced_requests: number }; by_model: Record<string, Bucket>; by_feature: Record<string, Bucket>; prices_configured: boolean; period_start: string };
  week: Totals;
  session: Totals;
  series: Point[];
  catalog: string[];
  limits: { monthly_tokens?: number; weekly_tokens?: number; session_tokens?: number };
  billing: { connected: boolean };
  scope: string;
}
interface LogRow { ts: string; provider: string; model: string; feature: string; input_tokens: number; output_tokens: number; known: boolean; estimated_cost: number | null }
interface UpdateEntry { title: string; items: string[] }
interface ApiKey { id: string; name: string; prefix: string; created_at: string; last_used_at: string | null; revoked_at: string | null; request_count: number }

// ---------- 표시 사전 ----------

const FEATURE_LABEL: Record<string, string> = {
  chat: '채팅', 'chat-tool': '도구 호출 채팅', llm: 'LLM 호출', routed: '자동 라우팅', ai: 'AI 응답',
  generation: '생성', browser: '브라우저 작업', agent: '에이전트', skill: '스킬', schedule: '예약 작업', assistant: 'AI 어시스턴트', code: '코드 에이전트',
};
const PALETTE = ['#8ea4f0', '#d9a07f', '#cfd3c4', '#bcd3c6', '#c9b6e4', '#e8c77a'];

// ---------- 포맷·도우미 ----------

const nf = new Intl.NumberFormat('ko-KR');
const int = (n: number) => nf.format(Math.round(n || 0));
const tok = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : int(n));
const usd = (n: number) => `US$${(n || 0).toFixed(2)}`;
const krw = (n: number) => `약 ₩${int((n || 0) * KRW_PER_USD)}`;
const when = (iso: string) => new Date(iso).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
const token = () => { try { return localStorage.getItem('auth_token'); } catch { return null; } };
const storedUser = (): { username?: string; email?: string } => { try { return JSON.parse(localStorage.getItem('auth_user') || '{}'); } catch { return {}; } };
// 정식 모델 이름 -> 이미지와 설명. 이미지는 public/models 에 있다.
const MODEL_META: Record<string, { img?: string; desc: string }> = {
  'LARS Native': { img: 'lars-native.png', desc: '빠른 구현과 실행에 집중한 LARS 핵심 엔진' },
  'LARS Cosmos': { img: 'lars-cosmos.png', desc: '깊이 있는 분석과 아키텍처 관점의 LARS 핵심 엔진' },
  'LARS Prime': { img: 'lars-native.png', desc: '데이터 검증과 근거 중심의 LARS 핵심 엔진' },
  'Rekora': { img: 'rekora.png', desc: '3D 설계와 비주얼 디자인 확장 모델' },
  'Synzora': { img: 'synzora.png', desc: '데이터 그래프와 관계 분석 확장 모델' },
  'Aivora': { img: 'aivora.png', desc: '감정 분석 확장 모델' },
  'Luminaic': { img: 'luminaic.png', desc: '대규모 분석 확장 모델' },
  'K-EXAONE 2.5': { img: 'k-exaone.png', desc: '에이전트형 한국어 모델 (LG AI Research)' },
  '기타': { desc: '확인되지 않은 이름으로 들어온 호출' },
};

// 모델 카드 상단 이미지. 이미지가 없으면 모델 이름별 색 블록을 쓴다.
function ModelArt({ name }: { name: string }) {
  const meta = MODEL_META[name];
  if (meta?.img) {
    return <div className="model-art model-art-img"><img src={`/console/models/${meta.img}`} alt={name} loading="lazy" /></div>;
  }
  return <div className="model-art" style={{ background: colorOf(name) }} aria-hidden="true" />;
}

const colorOf = (name: string) => { let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0; return PALETTE[h % PALETTE.length]; };
const greeting = () => { const h = new Date().getHours(); return h < 6 ? '좋은 새벽입니다' : h < 12 ? '좋은 아침입니다' : h < 18 ? '좋은 오후입니다' : '좋은 저녁입니다'; };
const featureName = (k: string) => FEATURE_LABEL[k] ?? k;

async function api<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token() ?? ''}` } });
  if (res.status === 401) throw new Error('로그인이 만료되었습니다. Prism 앱에서 다시 로그인해 주세요.');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ---------- 차트 ----------

function Spark({ values, color = 'var(--accent)' }: { values: number[]; color?: string }) {
  const W = 320, H = 64;
  const max = Math.max(1, ...values);
  const pts = values.map((v, i) => `${values.length > 1 ? (i / (values.length - 1)) * W : W / 2},${H - (v / max) * (H - 6) - 3}`);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" aria-hidden="true">
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function Bars({ rows, pick, range }: { rows: Point[]; pick: 'requests' | 'tokens' | 'cost'; range: Range }) {
  const [hover, setHover] = useState<number | null>(null);
  const val = (r: Point) => (pick === 'requests' ? r.requests : pick === 'cost' ? r.estimated_cost : r.input_tokens + r.output_tokens);
  const max = Math.max(1, ...rows.map(val));
  const W = 700, H = 170, gap = 3;
  const bw = rows.length ? (W - gap * (rows.length - 1)) / rows.length : 0;
  const label = (d: string) => (range === '24h' ? `${d.slice(11)}시` : d.slice(5));
  const h = hover !== null ? rows[hover] : null;
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H + 22}`} width="100%" height={H + 22} role="img" aria-label="기간별 추이">
        <line x1="0" x2={W} y1={H} y2={H} stroke="var(--line)" />
        {rows.map((r, i) => {
          const v = val(r);
          const bh = (v / max) * (H - 6);
          const x = i * (bw + gap);
          return (
            <g key={r.date} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={x} y={H - bh} width={Math.max(bw, 2)} height={Math.max(bh, v ? 2 : 0)} rx="2"
                fill={hover === i ? 'var(--accent-strong)' : 'var(--accent)'} opacity={hover === null || hover === i ? 1 : 0.55} />
              {(rows.length <= 14 || i % Math.ceil(rows.length / 7) === 0) && (
                <text x={x + bw / 2} y={H + 16} fontSize="11" textAnchor="middle" fill="var(--muted)">{label(r.date)}</text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="hint">
        {h ? `${label(h.date)} · 요청 ${int(h.requests)}회 · 토큰 ${tok(h.input_tokens + h.output_tokens)} · ${usd(h.estimated_cost)}` : '막대에 마우스를 올리면 시간별 값이 보입니다.'}
      </div>
    </div>
  );
}

function Ring({ pct }: { pct: number }) {
  const r = 22, c = 2 * Math.PI * r, p = Math.max(0, Math.min(100, pct));
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" aria-label={`한도 사용 ${p.toFixed(0)}%`}>
      <circle cx="28" cy="28" r={r} fill="none" stroke="var(--line)" strokeWidth="6" />
      <circle cx="28" cy="28" r={r} fill="none" stroke={p >= 100 ? 'var(--bad)' : p >= 80 ? 'var(--warn)' : 'var(--accent)'}
        strokeWidth="6" strokeLinecap="round" strokeDasharray={`${(p / 100) * c} ${c}`} transform="rotate(-90 28 28)" />
    </svg>
  );
}

function RangeTabs({ value, onChange }: { value: Range; onChange: (r: Range) => void }) {
  return (
    <div className="seg" role="tablist" aria-label="기간">
      {RANGES.map((r) => (
        <button key={r} role="tab" aria-selected={value === r} className={value === r ? 'on' : ''} onClick={() => onChange(r)}>{r}</button>
      ))}
    </div>
  );
}

// ---------- 사이드바 ----------

function Sidebar({ route }: { route: string }) {
  const link = (href: string, label: string, key: string, external = false) => (
    <a className={`nav-link ${route === key ? 'active' : ''}`} href={href} target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined}>
      {label}{external ? ' ↗' : ''}
    </a>
  );
  return (
    <nav className="sidebar" aria-label="콘솔 메뉴">
      {link('#/', '대시보드', 'home')}
      <div className="nav-section">빌드</div>
      {link('#/models', '모델', 'models')}
      {link('#/playground', '플레이그라운드', 'playground')}
      {link('#/batches', '배치', 'batches')}
      {link('#/keys', 'API 키', 'keys')}
      {link('#/logs', '로그', 'logs')}
      {link('#/resources', '리소스', 'resources')}
      {link('#/files', '파일', 'files')}
      {link('#/skills', '스킬', 'skills')}
      {link('#/webhooks', '웹훅', 'webhooks')}
      {link(MAIN_APP, '채팅 (Prism 앱)', 'chat', true)}
      <div className="nav-section">조직</div>
      {link('#/usage', '지출 및 사용량', 'usage')}
      {link('#/teams', '팀', 'teams')}
      {link('#/limits', '한도 설정', 'limits')}
      {link('#/data', '데이터 제어', 'data')}
      {link('#/settings', '설정', 'settings')}
    </nav>
  );
}

// ---------- 페이지: 대시보드 ----------

function Home({ data, range, setRange, updates }: { data: Overview; range: Range; setRange: (r: Range) => void; updates: UpdateEntry[] }) {
  const s = data.series;
  const tokens = s.map((r) => r.input_tokens + r.output_tokens);
  const reqs = s.map((r) => r.requests);
  const costs = s.map((r) => r.estimated_cost);
  const sumTok = tokens.reduce((a, b) => a + b, 0);
  const sumReq = reqs.reduce((a, b) => a + b, 0);
  const sumCost = costs.reduce((a, b) => a + b, 0);
  const monthTok = data.month.totals.input_tokens + data.month.totals.output_tokens;
  const limit = data.limits.monthly_tokens;
  const models = Object.entries(data.month.by_model).sort((a, b) => b[1].requests - a[1].requests);
  const user = storedUser();
  const label = range === '24h' ? '최근 24시간' : `최근 ${range.replace('d', '')}일`;

  return (
    <>
      <div className="page-head">
        <h1>{user.username ? `${user.username}님, ${greeting()}` : greeting()}</h1>
        <div className="head-actions">
          <a className="btn ghost" href={MAIN_APP} target="_blank" rel="noreferrer">채팅 열기 ↗</a>
          <a className="btn primary" href="#/usage">지출 및 사용량</a>
        </div>
      </div>

      <section className="card">
        <div className="card-label">시작하기</div>
        <div className="grid3 tight">
          <Step done={data.month.totals.requests > 0} title="첫 요청 보내기" text="Prism 채팅에서 질문하면 기록이 쌓입니다." href={MAIN_APP} />
          <Step done={Object.keys(data.limits).length > 0} title="사용 한도 설정" text="월간·세션 한도를 정하면 진행률이 보입니다." href="#/settings" />
          <Step done={data.month.prices_configured} title="모델 가격표 설정" text="가격표가 있어야 토큰이 비용으로 바뀝니다." href="#/settings" />
        </div>
      </section>

      <div className="section-head">
        <h2>사용 현황</h2>
        <RangeTabs value={range} onChange={setRange} />
      </div>
      <div className="grid3">
        <section className="card">
          <div className="card-label">토큰 ({label})</div>
          <div className="big">{tok(sumTok)}</div>
          <Spark values={tokens} />
        </section>
        <section className="card">
          <div className="card-label">요청 ({label})</div>
          <div className="big">{int(sumReq)}</div>
          <Spark values={reqs} color="#7bc49a" />
        </section>
        <section className="card">
          <div className="card-label row-between">
            <span>이번 달 한도</span>
            {limit ? <span className="pill">{Math.min(100, (monthTok / limit) * 100).toFixed(0)}%</span> : null}
          </div>
          <div className="row-between">
            <div>
              <div className="big">{data.month.prices_configured ? usd(data.month.totals.estimated_cost) : '가격 미설정'}</div>
              <div className="sub">{limit ? `토큰 ${tok(monthTok)} / ${tok(limit)}` : '월 한도 미설정'}</div>
            </div>
            {limit ? <Ring pct={(monthTok / limit) * 100} /> : null}
          </div>
        </section>
      </div>

      <section className="card wide">
        <div className="row-between">
          <div>
            <div className="card-label">토큰 추이</div>
            <div className="sub">{label} · 비용 {data.month.prices_configured ? usd(sumCost) : '—'}</div>
          </div>
        </div>
        <div className="chart-wrap">
          {sumReq === 0 ? <div className="empty">이 기간에 기록된 사용량이 없습니다. 채팅을 사용하면 쌓입니다.</div> : <Bars rows={s} pick="tokens" range={range} />}
        </div>
      </section>

      <div className="section-head"><h2>추천 모델</h2><a className="link" href="#/models">모든 모델 →</a></div>
      {models.length === 0 ? (
        <div className="empty card">이번 달 모델 호출 기록이 없습니다.</div>
      ) : (
        <div className="model-grid">
          {models.slice(0, 3).map(([key, b]) => {
            return (
              <section className="model-card" key={key}>
                <ModelArt name={key} />
                <div className="model-body">
                  <div className="model-name">{key}</div>
                  <div className="sub">{MODEL_META[key]?.desc ?? ''}</div>
                  <div className="sub">요청 {int(b.requests)}회</div>
                  <div className="sub">토큰 {tok(b.input_tokens + b.output_tokens)} · {data.month.prices_configured ? usd(b.estimated_cost) : '가격 미설정'}</div>
                </div>
              </section>
            );
          })}
        </div>
      )}

      <div className="section-head"><h2>빌드</h2></div>
      <div className="grid3">
        <Resource title="채팅" text="Prism 앱에서 대화하고 도구를 사용합니다." href={MAIN_APP} />
        <Resource title="앱 및 확장" text="외부 서비스를 연결하고 앱을 설치합니다." href={MAIN_APP} />
        <Resource title="데이터 웨어하우스" text="데이터를 저장하고 쿼리합니다." href={MAIN_APP} />
      </div>

      <div className="section-head"><h2>업데이트</h2></div>
      <section className="card">
        {updates.length === 0 ? <div className="sub">표시할 업데이트가 없습니다.</div> : updates.slice(0, 3).map((u) => (
          <div className="update" key={u.title}>
            <div className="step-title">{u.title}</div>
            <ul>{u.items.map((it) => <li key={it} className="sub">{it}</li>)}</ul>
          </div>
        ))}
      </section>
    </>
  );
}

function Step({ done, title, text, href }: { done: boolean; title: string; text: string; href: string }) {
  return (
    <a className="card step" href={href} target={href.startsWith('#') ? undefined : '_blank'} rel="noreferrer">
      <span className={`check ${done ? 'done' : ''}`}>{done ? '✓' : ''}</span>
      <div>
        <div className="step-title">{title}</div>
        <div className="sub">{text}</div>
      </div>
    </a>
  );
}

function Resource({ title, text, href }: { title: string; text: string; href: string }) {
  return (
    <a className="card resource" href={href} target="_blank" rel="noreferrer">
      <div className="step-title">{title} ↗</div>
      <div className="sub">{text}</div>
    </a>
  );
}

// ---------- 페이지: 모델 ----------

function Models({ data }: { data: Overview }) {
  // 프리즘 모델 전체를 항상 보여 주고, 호출 기록이 있으면 숫자를 채운다. 목록에 없는 이름('기타')은 기록이 있을 때만 붙인다.
  const zero: Bucket = { requests: 0, input_tokens: 0, output_tokens: 0, estimated_cost: 0, unpriced_requests: 0 };
  const catalog = data.catalog ?? [];
  const extra = Object.keys(data.month.by_model).filter((k) => !catalog.includes(k));
  const entries: [string, Bucket][] = [
    ...catalog.map((name): [string, Bucket] => [name, data.month.by_model[name] ?? zero]),
    ...extra.map((name): [string, Bucket] => [name, data.month.by_model[name]]),
  ];
  return (
    <>
      <div className="page-head"><h1>모델</h1></div>
      <p className="sub">이번 달 이 서버에서 호출된 모델입니다. 비용은 가격표가 있는 모델에만 계산됩니다.</p>
      {entries.length === 0 ? <div className="empty card">모델 목록을 불러오지 못했습니다.</div> : (
        <div className="model-grid">
          {entries.map(([key, b]) => {
            return (
              <section className="model-card" key={key}>
                <ModelArt name={key} />
                <div className="model-body">
                  <div className="model-name">{key}</div>
                  <div className="sub">{MODEL_META[key]?.desc ?? '이 서버에서 호출된 모델'}</div>
                  {b.requests === 0 && <div className="sub">이번 달 호출 기록 없음</div>}
                  <div className="kv"><span>요청</span><span>{int(b.requests)}</span></div>
                  <div className="kv"><span>입력 / 출력 토큰</span><span>{tok(b.input_tokens)} / {tok(b.output_tokens)}</span></div>
                  <div className="kv"><span>추정 비용</span><span>{data.month.prices_configured && b.unpriced_requests < b.requests ? usd(b.estimated_cost) : '가격 미설정'}</span></div>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}

// ---------- 페이지: 로그 ----------

function Logs({ rows }: { rows: LogRow[] }) {
  const [feature, setFeature] = useState('all');
  const [model, setModel] = useState('all');
  const features = Array.from(new Set(rows.map((r) => r.feature)));
  const models = Array.from(new Set(rows.map((r) => `${r.provider}:${r.model}`)));
  const shown = rows.filter((r) => (feature === 'all' || r.feature === feature) && (model === 'all' || `${r.provider}:${r.model}` === model));
  return (
    <>
      <div className="page-head"><h1>로그</h1></div>
      <p className="sub">최근 호출 기록입니다. 프롬프트와 응답 내용은 저장하지 않습니다.</p>
      <div className="filters">
        <select value={feature} onChange={(e) => setFeature(e.target.value)} aria-label="기능 필터">
          <option value="all">모든 기능</option>
          {features.map((f) => <option key={f} value={f}>{featureName(f)}</option>)}
        </select>
        <select value={model} onChange={(e) => setModel(e.target.value)} aria-label="모델 필터">
          <option value="all">모든 모델</option>
          {models.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <span className="sub">{shown.length}건</span>
      </div>
      <section className="card wide">
        {shown.length === 0 ? <div className="empty">표시할 기록이 없습니다.</div> : (
          <div className="table-scroll">
            <table className="table">
              <thead><tr><th>시간</th><th>모델</th><th>기능</th><th className="num">입력</th><th className="num">출력</th><th className="num">추정 비용</th><th>상태</th></tr></thead>
              <tbody>
                {shown.map((r, i) => (
                  <tr key={`${r.ts}-${i}`}>
                    <td>{when(r.ts)}</td>
                    <td>{r.provider}:{r.model}</td>
                    <td>{featureName(r.feature)}</td>
                    <td className="num">{int(r.input_tokens)}</td>
                    <td className="num">{int(r.output_tokens)}</td>
                    <td className="num">{r.estimated_cost === null ? '—' : usd(r.estimated_cost)}</td>
                    <td><span className={`status ${r.known ? 'ok' : 'warn'}`}>{r.known ? '기록됨' : '토큰 미확인'}</span></td>
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

// ---------- 페이지: 리소스 ----------

function Resources() {
  const items = [
    { t: '채팅', d: '대화, 도구 호출, 웹 검색을 사용합니다.' },
    { t: '앱 및 확장', d: 'Google, GitHub, Notion, Slack, Outlook 같은 서비스를 연결합니다.' },
    { t: '데이터 웨어하우스', d: '데이터를 저장하고 SQL로 조회합니다.' },
    { t: '통계 분석', d: '기술통계, 상관, 회귀, 시계열 분석을 실행합니다.' },
    { t: '자율 에이전트', d: '목표를 주면 단계별로 작업을 수행합니다.' },
    { t: '프로젝트·덱 편집기', d: '프로젝트 단위로 자료를 모으고 슬라이드를 만듭니다.' },
  ];
  return (
    <>
      <div className="page-head"><h1>리소스</h1></div>
      <div className="grid3">
        {items.map((i) => <Resource key={i.t} title={i.t} text={i.d} href={MAIN_APP} />)}
      </div>
    </>
  );
}

// ---------- 페이지: 지출 및 사용량 ----------

function Usage({ data, range, setRange }: { data: Overview; range: Range; setRange: (r: Range) => void }) {
  const limitRow = (name: string, used: number, max?: number) => max ? (
    <div className="limit" key={name}>
      <div className="row-between"><span>{name}</span><span className="sub">{tok(used)} / {tok(max)} 토큰</span></div>
      <div className="bar"><div style={{ width: `${Math.min(100, (used / max) * 100)}%`, background: used >= max ? 'var(--bad)' : used >= max * 0.8 ? 'var(--warn)' : 'var(--accent)' }} /></div>
    </div>
  ) : null;
  const table = (obj: Record<string, Bucket>, nameOf: (k: string) => string) =>
    Object.entries(obj).sort((a, b) => b[1].requests - a[1].requests).map(([k, b]) => (
      <tr key={k}>
        <td>{nameOf(k)}</td>
        <td className="num">{int(b.requests)}</td>
        <td className="num">{tok(b.input_tokens)}</td>
        <td className="num">{tok(b.output_tokens)}</td>
        <td className="num">{b.unpriced_requests === b.requests ? '가격 미설정' : usd(b.estimated_cost)}</td>
      </tr>
    ));
  const hasLimit = data.limits.monthly_tokens || data.limits.weekly_tokens || data.limits.session_tokens;
  return (
    <>
      <div className="page-head">
        <h1>지출 및 사용량</h1>
        <RangeTabs value={range} onChange={setRange} />
      </div>
      <div className="notice">
        {data.scope} {data.billing.connected ? '' : '실제 청구 금액은 결제 서버 연동 후 표시됩니다.'}
      </div>
      {hasLimit ? (
        <section className="card wide">
          <div className="card-label">사용 한도</div>
          {limitRow('월간', data.month.totals.input_tokens + data.month.totals.output_tokens, data.limits.monthly_tokens)}
          {limitRow('최근 7일', data.week.input_tokens + data.week.output_tokens, data.limits.weekly_tokens)}
          {limitRow('이번 세션', data.session.input_tokens + data.session.output_tokens, data.limits.session_tokens)}
        </section>
      ) : null}
      <section className="card wide">
        <div className="card-label">모델별 (이번 달)</div>
        <div className="table-scroll">
          <table className="table">
            <thead><tr><th>모델</th><th className="num">요청</th><th className="num">입력</th><th className="num">출력</th><th className="num">추정 비용</th></tr></thead>
            <tbody>{table(data.month.by_model, (k) => k) || <tr><td colSpan={5} className="empty-cell">기록이 없습니다.</td></tr>}</tbody>
          </table>
        </div>
      </section>
      <section className="card wide">
        <div className="card-label">기능별 (이번 달)</div>
        <div className="table-scroll">
          <table className="table">
            <thead><tr><th>기능</th><th className="num">요청</th><th className="num">입력</th><th className="num">출력</th><th className="num">추정 비용</th></tr></thead>
            <tbody>{table(data.month.by_feature, featureName) || <tr><td colSpan={5} className="empty-cell">기록이 없습니다.</td></tr>}</tbody>
          </table>
        </div>
      </section>
    </>
  );
}

// ---------- 페이지: API 키 ----------

function ApiKeys() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [name, setName] = useState('');
  const [created, setCreated] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pendingRevoke, setPendingRevoke] = useState<string | null>(null);
  const base = `${window.location.origin}/api/v1`;
  const authed = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token() ?? ''}` });

  const reload = async () => {
    try {
      const d = await api<{ keys: ApiKey[] }>('/console/keys');
      setKeys(d.keys);
    } catch (e) {
      setMsg((e as Error).message);
    }
  };
  useEffect(() => { reload(); }, []);

  const create = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    setMsg(null);
    setCopied(false);
    try {
      const res = await fetch(`${API}/console/keys`, { method: 'POST', headers: authed(), body: JSON.stringify({ name: name.trim() }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.detail || `HTTP ${res.status}`);
      setCreated(d.secret);
      setName('');
      await reload();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (id: string) => {
    if (pendingRevoke !== id) { setPendingRevoke(id); return; }
    setPendingRevoke(null);
    try {
      const res = await fetch(`${API}/console/keys/${id}`, { method: 'DELETE', headers: authed() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await reload();
    } catch (e) {
      setMsg((e as Error).message);
    }
  };

  const copy = async () => {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created);
      setCopied(true);
    } catch {
      setMsg('복사하지 못했습니다. 키를 직접 선택해서 복사해 주세요.');
    }
  };

  const active = keys.filter((k) => !k.revoked_at);
  const curl = `curl ${base}/chat/completions \\\n  -H "Authorization: Bearer $LARS_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"model": "lars-native", "messages": [{"role": "user", "content": "안녕하세요"}]}'`;
  const py = `import os, requests\n\nr = requests.post(\n    "${base}/chat/completions",\n    headers={"Authorization": f"Bearer {os.environ['LARS_API_KEY']}"},\n    json={"model": "lars-native", "messages": [{"role": "user", "content": "안녕하세요"}]},\n)\nprint(r.json()["choices"][0]["message"]["content"])`;

  return (
    <>
      <div className="page-head">
        <h1>API 키</h1>
      </div>
      <p className="sub">LARS 모델을 내 앱에서 호출할 때 쓰는 키입니다. 키는 사람마다 따로 만들고, 쓰지 않으면 폐기하세요.</p>

      {created && (
        <section className="card wide secret">
          <div className="card-label">새 키가 만들어졌습니다</div>
          <div className="sub">이 키는 지금만 보입니다. 안전한 곳에 복사해 두세요. 잃어버리면 새로 만들어야 합니다.</div>
          <div className="secret-row">
            <code className="secret-value">{created}</code>
            <button className="btn ghost small" onClick={copy}>{copied ? '복사됨' : '복사'}</button>
          </div>
          <button className="link" onClick={() => { setCreated(null); setCopied(false); }}>닫기</button>
        </section>
      )}

      <section className="card wide">
        <div className="card-label">새 키 만들기</div>
        <div className="create-row">
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="예: 사내 챗봇"
            aria-label="키 이름" onKeyDown={(e) => { if (e.key === 'Enter') create(); }} />
          <button className="btn primary" onClick={create} disabled={busy || !name.trim()}>{busy ? '만드는 중…' : '키 만들기'}</button>
        </div>
        {msg && <div className="error-text">{msg}</div>}
      </section>

      <section className="card wide">
        <div className="card-label">내 키 ({active.length}개 사용 중)</div>
        {keys.length === 0 ? (
          <div className="empty">아직 만든 키가 없습니다.</div>
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead><tr><th>이름</th><th>키</th><th>생성</th><th>마지막 사용</th><th className="num">요청</th><th>상태</th><th /></tr></thead>
              <tbody>
                {keys.map((k) => (
                  <tr key={k.id}>
                    <td>{k.name}</td>
                    <td><code>{k.prefix}</code></td>
                    <td>{when(k.created_at)}</td>
                    <td>{k.last_used_at ? when(k.last_used_at) : '사용 전'}</td>
                    <td className="num">{int(k.request_count)}</td>
                    <td>{k.revoked_at ? <span className="status warn">폐기됨</span> : <span className="status ok">사용 가능</span>}</td>
                    <td>
                      {!k.revoked_at && (
                        <button className="link danger" onClick={() => revoke(k.id)}>
                          {pendingRevoke === k.id ? '한 번 더 눌러 폐기' : '폐기'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="section-head"><h2>사용 방법</h2></div>
      <section className="card wide">
        <div className="kv"><span>기본 주소</span><code>{base}</code></div>
        <div className="kv"><span>기본 모델</span><code>lars-native</code></div>
        <div className="kv"><span>사용 가능</span><span className="sub">lars-cosmos · lars-prime · rekora · synzora · aivora · exaone (GET /v1/models 로 확인)</span></div>
        <div className="kv"><span>한도</span><span className="sub">분당 60회 · 메시지 40개 · 메시지당 20,000자 · 응답 최대 4,096 토큰</span></div>
        <div className="card-label code-label">curl</div>
        <pre className="code">{curl}</pre>
        <div className="card-label code-label">Python</div>
        <pre className="code">{py}</pre>
        <div className="sub">키는 환경 변수 LARS_API_KEY에 넣어 쓰세요. 코드에 직접 적으면 유출되기 쉽습니다.</div>
        <div className="sub">요청에 <code>"stream": true</code>를 넣으면 토큰이 생성되는 대로 서버 전송 이벤트(SSE)로 받습니다.</div>
      </section>
    </>
  );
}

// ---------- 페이지: 설정 ----------

function Settings({ data }: { data: Overview }) {
  const user = storedUser();
  return (
    <>
      <div className="page-head"><h1>설정</h1></div>
      <section className="card wide">
        <div className="card-label">계정</div>
        <div className="kv"><span>사용자</span><span>{user.username || '—'}</span></div>
        <div className="kv"><span>이메일</span><span>{user.email || '—'}</span></div>
        <div className="kv"><span>집계 시작</span><span>{data.month.period_start.replace('T', ' ')}</span></div>
      </section>
      <section className="card wide">
        <div className="card-label">결제</div>
        <div className="kv"><span>결제 서버 연결</span><span>{data.billing.connected ? '연결됨' : '미연결'}</span></div>
        <div className="kv"><span>모델 가격표</span><span>{data.month.prices_configured ? '설정됨' : '미설정'}</span></div>
        <div className="sub">원화 표시는 1 USD = ₩{int(KRW_PER_USD)} 참고 환율입니다.</div>
      </section>
      <section className="card wide">
        <div className="card-label">로그아웃</div>
        <div className="sub">로그아웃은 Prism 앱에서 합니다.</div>
        <a className="btn ghost" href={MAIN_APP} target="_blank" rel="noreferrer">Prism 앱 열기 ↗</a>
      </section>
    </>
  );
}

// ---------- 앱 셸 ----------

function useRoute(): string {
  const read = () => (window.location.hash.replace(/^#\/?/, '') || 'home');
  const [r, setR] = useState(read);
  useEffect(() => {
    const on = () => setR(read());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return r;
}

export default function App() {
  const route = useRoute();
  const signedIn = !!token();
  const [range, setRange] = useState<Range>('7d');
  const [data, setData] = useState<Overview | null>(null);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [updates, setUpdates] = useState<UpdateEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [o, l, u] = await Promise.all([
        api<Overview>(`/console/overview?range=${range}`),
        api<{ rows: LogRow[] }>('/console/logs?limit=200'),
        api<{ entries: UpdateEntry[] }>('/console/updates'),
      ]);
      setData(o);
      setLogs(l.rows);
      setUpdates(u.entries);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (signedIn) load(); }, [signedIn, range]);

  const body = useMemo(() => {
    if (!signedIn) {
      return (
        <div className="card center">
          <div className="big">로그인이 필요합니다</div>
          <div className="sub">Prism 앱에서 로그인한 뒤 이 콘솔을 열어 주세요.</div>
          <a className="btn primary" href={MAIN_APP}>Prism 앱으로 이동</a>
        </div>
      );
    }
    if (route === 'playground') return <Playground />;
    if (route === 'limits') return <Limits />;
    if (route === 'data') return <DataControls />;
    if (route === 'files') return <Files />;
    if (route === 'skills') return <Skills />;
    if (route === 'webhooks') return <Webhooks />;
    if (route === 'batches') return <Batches />;
    if (route === 'teams') return <Teams />;
    if (error && !data) return <div className="card center"><div className="big">불러오지 못했습니다</div><div className="sub">{error}</div><button className="btn ghost" onClick={load}>다시 시도</button></div>;
    if (!data) return <div className="empty">불러오는 중…</div>;
    if (route === 'keys') return <ApiKeys />;
    if (route === 'models') return <Models data={data} />;
    if (route === 'logs') return <Logs rows={logs} />;
    if (route === 'resources') return <Resources />;
    if (route === 'usage') return <Usage data={data} range={range} setRange={setRange} />;
    if (route === 'settings') return <Settings data={data} />;
    return <Home data={data} range={range} setRange={setRange} updates={updates} />;
  }, [signedIn, error, data, logs, updates, route, range]);

  return (
    <div className="shell">
      <header className="topbar">
        <a className="brand" href="#/">Prism <span>Console</span></a>
        <div className="search" role="search">
          <input placeholder="콘솔 검색…" aria-label="콘솔 검색" />
          <kbd>⌘K</kbd>
        </div>
        <div className="top-actions">
          {data && <span className="sub">이번 달 {data.month.prices_configured ? usd(data.month.totals.estimated_cost) : '비용 미설정'}</span>}
          <button className="btn ghost small" onClick={load} disabled={loading || !signedIn}>{loading ? '갱신 중…' : '새로고침'}</button>
        </div>
      </header>
      <div className="body">
        <Sidebar route={signedIn ? route : 'home'} />
        <main className="main">{body}</main>
      </div>
    </div>
  );
}
