import React, { useState } from 'react';
import { Search, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';

interface AuditCheck { check: string; status: 'excellent' | 'warning' | 'fail'; score: number; detail: string }
interface Keyword { keyword: string; count: number; density: number }
interface AuditResult { url: string; score: number; checks: AuditCheck[]; word_count: number; elapsed_ms: number; keywords: Keyword[] }

const STATUS_STYLE: Record<AuditCheck['status'], { color: string; label: string }> = {
  excellent: { color: '#4ade80', label: '통과' },
  warning: { color: '#fcd34d', label: '개선 필요' },
  fail: { color: '#ff6b9d', label: '문제' },
};

/** SEO 진단: 주소를 읽어 실제 점검 결과와 본문 키워드를 보여 준다. 검색량·순위·경쟁사는 외부 데이터 연결이 필요하다. */
export const SEOAnalyticsDashboard = () => {
  const [url, setUrl] = useState('');
  const [keyword, setKeyword] = useState('');
  const [result, setResult] = useState<AuditResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAudit = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/seo/audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), keyword: keyword.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || `HTTP ${response.status}`);
      setResult(data.data);
    } catch (err) {
      setResult(null);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const card: React.CSSProperties = { border: '1px solid rgba(100,150,255,0.2)', borderRadius: 12, padding: 16, background: 'rgba(0,0,0,0.2)' };
  const input: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(100,150,255,0.25)', background: 'transparent', color: '#e0e0e0', boxSizing: 'border-box' };

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%', boxSizing: 'border-box', display: 'grid', gap: 16, alignContent: 'start' }}>
      <div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>SEO 진단</div>
        <div style={{ fontSize: 13, color: 'rgba(224,224,224,0.6)', marginTop: 4 }}>페이지를 직접 읽어 제목, 설명, 제목 구조, 이미지, 속도 등을 점검하고 본문 키워드를 뽑습니다.</div>
      </div>

      <div style={{ ...card, display: 'grid', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input style={{ ...input, flex: 1, minWidth: 0 }} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="진단할 주소 (https://example.com)" />
          <input style={{ ...input, width: 200 }} value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="목표 키워드 (선택)" />
          <button onClick={runAudit} disabled={loading || !url.trim()} style={{ padding: '9px 16px', borderRadius: 8, border: 'none', background: '#6366f1', color: '#fff', cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Search size={14} /> {loading ? '진단 중...' : '진단하기'}
          </button>
        </div>
        {error && <div style={{ color: '#ff6b9d', fontSize: 13 }}>{error}</div>}
      </div>

      {result && (
        <>
          <div style={{ ...card, display: 'flex', gap: 24, alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 12, color: 'rgba(224,224,224,0.6)' }}>종합 점수</div>
              <div style={{ fontSize: 36, fontWeight: 800, color: result.score >= 80 ? '#4ade80' : result.score >= 60 ? '#fcd34d' : '#ff6b9d' }}>{result.score}</div>
            </div>
            <div style={{ fontSize: 13, color: 'rgba(224,224,224,0.7)', lineHeight: 1.7 }}>
              <div>주소: {result.url}</div>
              <div>단어 {result.word_count.toLocaleString()}개 · 응답 {result.elapsed_ms}ms</div>
            </div>
          </div>

          <div style={{ ...card, display: 'grid', gap: 10 }}>
            <div style={{ fontWeight: 700, color: '#f1f5f9' }}>점검 결과</div>
            {result.checks.map((c) => (
              <div key={c.check} style={{ display: 'grid', gridTemplateColumns: '160px 110px 1fr', gap: 10, alignItems: 'center', fontSize: 13, padding: '6px 0', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ color: '#e0e0e0', fontWeight: 600 }}>{c.check}</span>
                <span style={{ color: STATUS_STYLE[c.status].color, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {c.status === 'excellent' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />} {STATUS_STYLE[c.status].label}
                </span>
                <span style={{ color: 'rgba(224,224,224,0.7)' }}>{c.detail}</span>
              </div>
            ))}
          </div>

          <div style={{ ...card }}>
            <div style={{ fontWeight: 700, color: '#f1f5f9', marginBottom: 10 }}>본문 키워드 (많이 나온 순)</div>
            {result.keywords.length === 0 && <div style={{ fontSize: 13, color: 'rgba(224,224,224,0.6)' }}>추출된 키워드가 없습니다.</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px', gap: '6px 12px', fontSize: 13 }}>
              <span style={{ color: 'rgba(224,224,224,0.5)' }}>키워드</span><span style={{ color: 'rgba(224,224,224,0.5)', textAlign: 'right' }}>횟수</span><span style={{ color: 'rgba(224,224,224,0.5)', textAlign: 'right' }}>밀도</span>
              {result.keywords.map((k) => (
                <React.Fragment key={k.keyword}>
                  <span style={{ color: '#e0e0e0' }}>{k.keyword}</span>
                  <span style={{ textAlign: 'right', color: '#e0e0e0' }}>{k.count}</span>
                  <span style={{ textAlign: 'right', color: '#e0e0e0' }}>{k.density}%</span>
                </React.Fragment>
              ))}
            </div>
          </div>
        </>
      )}

      <div style={{ ...card, display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13, color: 'rgba(224,224,224,0.7)' }}>
        <Info size={16} style={{ flexShrink: 0, marginTop: 2 }} />
        <span>검색량, 검색 순위, 경쟁사 비교는 검색 데이터 연결(예: Google Search Console)이 필요해서 지금은 표시하지 않습니다.</span>
      </div>
    </div>
  );
};

export default SEOAnalyticsDashboard;
