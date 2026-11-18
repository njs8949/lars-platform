import React, { useState } from 'react';
import { Plus, Trash2, Gauge } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';

interface StepRow { id: string; name: string; minutes: string; dependsOn: string }
interface OptimizeResult {
  order: string[];
  critical_path: string[];
  critical_path_minutes: number;
  sequential_minutes: number;
  speedup: number;
  parallel_groups: { stage: number; steps: string[]; minutes: number }[];
  bottleneck: string;
  suggestions: string[];
  warnings: string[];
}

const EMPTY: StepRow[] = [
  { id: 'collect', name: '데이터 수집', minutes: '30', dependsOn: '' },
  { id: 'analyze', name: '분석', minutes: '20', dependsOn: 'collect' },
  { id: 'report', name: '보고서 작성', minutes: '45', dependsOn: 'analyze' },
];

/** 워크플로 최적화: 단계, 소요 시간, 의존 관계를 입력하면 실행 순서, 임계 경로, 병렬 가능 단계, 병목을 계산한다. */
export const WorkflowOptimizerPanel = () => {
  const [rows, setRows] = useState<StepRow[]>(EMPTY);
  const [result, setResult] = useState<OptimizeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const update = (index: number, patch: Partial<StepRow>) =>
    setRows(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const optimize = async () => {
    setBusy(true);
    setError(null);
    try {
      const steps = rows.filter((r) => r.id.trim()).map((r) => ({
        id: r.id.trim(),
        name: r.name.trim() || r.id.trim(),
        minutes: Number(r.minutes) || 0,
        depends_on: r.dependsOn.split(',').map((d) => d.trim()).filter(Boolean),
      }));
      const response = await fetch(`${API_URL}/workflow/optimize`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ steps }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || `HTTP ${response.status}`);
      setResult(data.data);
    } catch (err) {
      setResult(null);
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const card: React.CSSProperties = { border: '1px solid rgba(100,150,255,0.2)', borderRadius: 12, padding: 14, background: 'rgba(0,0,0,0.2)' };
  const input: React.CSSProperties = { padding: '7px 9px', borderRadius: 8, border: '1px solid rgba(100,150,255,0.25)', background: 'transparent', color: '#e0e0e0', minWidth: 0, boxSizing: 'border-box' };

  return (
    <div style={{ ...card, display: 'grid', gap: 12, margin: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#f1f5f9', fontWeight: 700 }}>
        <Gauge size={16} /> 워크플로 최적화
      </div>
      <div style={{ fontSize: 12, color: 'rgba(224,224,224,0.6)' }}>단계 id, 소요 시간(분), 먼저 끝나야 하는 단계 id(쉼표로 구분)를 입력하면 실행 순서와 가장 오래 걸리는 경로를 계산합니다.</div>
      <div style={{ display: 'grid', gap: 6 }}>
        {rows.map((row, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 90px 1fr 36px', gap: 6 }}>
            <input style={input} value={row.id} onChange={(e) => update(i, { id: e.target.value })} placeholder="id" />
            <input style={input} value={row.name} onChange={(e) => update(i, { name: e.target.value })} placeholder="단계 이름" />
            <input style={input} value={row.minutes} onChange={(e) => update(i, { minutes: e.target.value })} placeholder="분" inputMode="decimal" />
            <input style={input} value={row.dependsOn} onChange={(e) => update(i, { dependsOn: e.target.value })} placeholder="선행 단계 id (예: collect, analyze)" />
            <button onClick={() => setRows(rows.filter((_, j) => j !== i))} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }} title="삭제"><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
        <button onClick={() => setRows([...rows, { id: '', name: '', minutes: '0', dependsOn: '' }])} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(100,150,255,0.3)', background: 'transparent', color: '#e0e0e0', cursor: 'pointer' }}><Plus size={14} /> 단계 추가</button>
        <button onClick={optimize} disabled={busy} style={{ padding: '6px 16px', borderRadius: 8, border: 'none', background: '#6366f1', color: '#fff', cursor: 'pointer' }}>{busy ? '계산 중...' : '최적화 분석'}</button>
      </div>
      {error && <div style={{ color: '#ff6b9d', fontSize: 13 }}>{error}</div>}
      {result && (
        <div style={{ display: 'grid', gap: 8, fontSize: 13, color: '#e0e0e0' }}>
          <div>실행 순서: {result.order.join(' → ')}</div>
          <div>가장 오래 걸리는 경로: {result.critical_path.join(' → ')} ({result.critical_path_minutes}분)</div>
          <div>순차 실행 {result.sequential_minutes}분 → 병렬 실행 최소 {result.critical_path_minutes}분 (약 {result.speedup}배)</div>
          <div>병목 단계: {result.bottleneck}</div>
          {result.parallel_groups.map((g) => (
            <div key={g.stage} style={{ color: 'rgba(224,224,224,0.75)' }}>{g.stage}단계: {g.steps.join(', ')} ({g.minutes}분)</div>
          ))}
          {result.suggestions.map((s, i) => <div key={i} style={{ color: '#fde68a' }}>• {s}</div>)}
          {result.warnings.map((w, i) => <div key={i} style={{ color: '#fcd34d' }}>! {w}</div>)}
        </div>
      )}
    </div>
  );
};

export default WorkflowOptimizerPanel;
