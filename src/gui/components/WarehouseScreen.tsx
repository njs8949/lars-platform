import React, { useEffect, useState } from 'react';
import { Database, Upload, Play, Trash2, Table2, History } from 'lucide-react';
import { getToken } from '../lib/auth';

const apiBase = () => (window.location.hostname === 'localhost' ? 'http://localhost:8001/api' : '/api');
const authHeaders = (): Record<string, string> => ({ Authorization: `Bearer ${getToken() ?? ''}` });

interface Column { name: string; type: string }
interface TableInfo { name: string; columns: Column[]; rows: number; source: string; loaded_at: string }
interface QueryResult { columns: string[]; rows: any[][]; truncated: boolean; elapsed_ms: number }
interface HistoryData { queries: { sql: string; rows: number; elapsed_ms: number; ran_at: string }[]; loads: { table: string; source: string; mode: string; rows: number; loaded_at: string }[] }

async function parse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || `서버 응답 ${res.status}`);
  }
  return res.json() as Promise<T>;
}

const box: React.CSSProperties = { border: '1px solid var(--border-color)', borderRadius: 12, padding: 14 };
const input: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: '#14141a', color: '#eee', fontSize: 13, fontFamily: 'inherit' };
const btn: React.CSSProperties = { padding: '7px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#ddd', cursor: 'pointer', fontSize: 12 };
const primary: React.CSSProperties = { ...btn, background: '#4F46E5', borderColor: '#4F46E5', color: '#fff' };

/** 데이터 웨어하우스: 파일을 테이블로 적재하고, 테이블을 살펴보고, SQL로 조회한다. */
export const WarehouseScreen: React.FC = () => {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ columns: string[]; rows: any[][] } | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [tableName, setTableName] = useState('');
  const [mode, setMode] = useState<'replace' | 'append'>('replace');
  const [sql, setSql] = useState('');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [history, setHistory] = useState<HistoryData | null>(null);
  const [tab, setTab] = useState<'preview' | 'history'>('preview');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [confirmDrop, setConfirmDrop] = useState(false);

  const reload = async () => {
    try {
      const data = await parse<{ tables: TableInfo[] }>(await fetch(`${apiBase()}/warehouse/tables`, { headers: authHeaders() }));
      setTables(data.tables);
      if (!sql && data.tables[0]) setSql(`SELECT * FROM "${data.tables[0].name}" LIMIT 100`);
    } catch (err) {
      setMessage({ kind: 'err', text: err instanceof Error ? err.message : '목록을 불러오지 못했습니다.' });
    }
  };

  const reloadHistory = async () => {
    try {
      setHistory(await parse<HistoryData>(await fetch(`${apiBase()}/warehouse/history`, { headers: authHeaders() })));
    } catch {
      setHistory(null);
    }
  };

  useEffect(() => { reload(); reloadHistory(); }, []);

  const openTable = async (name: string) => {
    setSelected(name);
    setConfirmDrop(false);
    try {
      setPreview(await parse(await fetch(`${apiBase()}/warehouse/tables/${encodeURIComponent(name)}`, { headers: authHeaders() })));
    } catch (err) {
      setPreview(null);
      setMessage({ kind: 'err', text: err instanceof Error ? err.message : '미리보기를 불러오지 못했습니다.' });
    }
  };

  const load = async () => {
    if (!file) return;
    setBusy(true);
    setMessage(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const url = `${apiBase()}/warehouse/tables?mode=${mode}&table=${encodeURIComponent(tableName.trim())}`;
      const data = await parse<{ table: string; rows_loaded: number; rows_total: number }>(await fetch(url, { method: 'POST', headers: authHeaders(), body: form }));
      setMessage({ kind: 'ok', text: `${data.table} 테이블에 ${data.rows_loaded.toLocaleString()}행 적재했습니다. (총 ${data.rows_total.toLocaleString()}행)` });
      setFile(null);
      setTableName('');
      await reload();
      await reloadHistory();
      openTable(data.table);
    } catch (err) {
      setMessage({ kind: 'err', text: err instanceof Error ? err.message : '적재하지 못했습니다.' });
    } finally {
      setBusy(false);
    }
  };

  const runQuery = async () => {
    if (!sql.trim()) return;
    setBusy(true);
    setMessage(null);
    try {
      setResult(await parse<QueryResult>(await fetch(`${apiBase()}/warehouse/query`, {
        method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ sql }),
      })));
      reloadHistory();
    } catch (err) {
      setResult(null);
      setMessage({ kind: 'err', text: err instanceof Error ? err.message : '쿼리를 실행하지 못했습니다.' });
    } finally {
      setBusy(false);
    }
  };

  const dropTable = async () => {
    if (!selected) return;
    if (!confirmDrop) { setConfirmDrop(true); return; }
    try {
      await parse(await fetch(`${apiBase()}/warehouse/tables/${encodeURIComponent(selected)}`, { method: 'DELETE', headers: authHeaders() }));
      setSelected(null);
      setPreview(null);
      setConfirmDrop(false);
      reload();
    } catch (err) {
      setMessage({ kind: 'err', text: err instanceof Error ? err.message : '삭제하지 못했습니다.' });
    }
  };

  const current = tables.find((t) => t.name === selected) ?? null;

  return (
    <div style={{ padding: 24, height: '100%', boxSizing: 'border-box', overflowY: 'auto', color: '#e5e7eb' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <Database size={26} style={{ color: '#a78bfa' }} />
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>데이터 웨어하우스</div>
          <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>파일을 테이블로 적재하고, SQL로 조회합니다. 조회는 읽기 전용입니다.</div>
        </div>
      </div>

      {message && (
        <div style={{ ...box, marginBottom: 14, color: message.kind === 'ok' ? '#34d399' : '#f87171', fontSize: 13 }}>{message.text}</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '300px minmax(0,1fr)', gap: 16, alignItems: 'start' }}>
        {/* 왼쪽: 적재와 테이블 목록 */}
        <div style={{ display: 'grid', gap: 14 }}>
          <div style={{ ...box, display: 'grid', gap: 8 }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>파일 적재</div>
            <input type="file" accept=".csv,.txt,.xlsx,.xls" onChange={(e) => setFile(e.target.files?.[0] ?? null)} style={{ fontSize: 12 }} />
            <input style={input} value={tableName} onChange={(e) => setTableName(e.target.value)} placeholder={file ? `테이블 이름 (비우면 ${file.name.replace(/\.[^.]+$/, '')})` : '테이블 이름'} />
            <select style={input} value={mode} onChange={(e) => setMode(e.target.value as 'replace' | 'append')}>
              <option value="replace">덮어쓰기 (새 버전으로 교체)</option>
              <option value="append">추가 (기존 테이블 뒤에 행 추가)</option>
            </select>
            <button style={primary} onClick={load} disabled={!file || busy}><Upload size={13} /> {busy ? '적재 중...' : '적재하기'}</button>
            <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>CSV, TXT, XLSX 파일 · 최대 50MB · 최대 100만 행</div>
          </div>

          <div style={{ ...box }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>테이블 {tables.length}개</div>
            {tables.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>아직 적재한 테이블이 없습니다. 파일을 올려 시작하세요.</div>}
            <div style={{ display: 'grid', gap: 6 }}>
              {tables.map((t) => (
                <button key={t.name} onClick={() => openTable(t.name)} style={{ ...btn, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, borderColor: selected === t.name ? '#6366f1' : 'rgba(255,255,255,0.1)', background: selected === t.name ? 'rgba(99,102,241,0.15)' : 'transparent' }}>
                  <Table2 size={14} />
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
                  <span style={{ color: 'var(--text-dim)' }}>{t.rows.toLocaleString()}행</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 오른쪽: 테이블 상세, SQL, 이력 */}
        <div style={{ display: 'grid', gap: 14, minWidth: 0 }}>
          {current && (
            <div style={{ ...box }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 15, flex: 1 }}>{current.name}</div>
                <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{current.source ? `${current.source} · ${current.loaded_at}` : ''}</span>
                <button style={{ ...btn, color: '#f87171', display: 'flex', alignItems: 'center', gap: 4 }} onClick={dropTable}>
                  <Trash2 size={12} /> {confirmDrop ? '한 번 더 누르면 삭제' : '테이블 삭제'}
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                {current.columns.map((c) => (
                  <span key={c.name} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 999, background: 'rgba(255,255,255,0.06)' }}>{c.name} <span style={{ color: '#a78bfa' }}>{c.type}</span></span>
                ))}
              </div>
              {preview && (
                <div style={{ overflowX: 'auto', maxHeight: 260, border: '1px solid var(--border-color)', borderRadius: 8 }}>
                  <table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%' }}>
                    <thead><tr>{preview.columns.map((c) => <th key={c} style={{ textAlign: 'left', padding: '6px 10px', position: 'sticky', top: 0, background: '#1c1c22', borderBottom: '1px solid var(--border-color)' }}>{c}</th>)}</tr></thead>
                    <tbody>{preview.rows.map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j} style={{ padding: '5px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{v === null ? '' : String(v)}</td>)}</tr>)}</tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          <div style={{ ...box }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>SQL 조회</div>
            <textarea
              value={sql}
              onChange={(e) => setSql(e.target.value)}
              onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') runQuery(); }}
              rows={4}
              style={{ ...input, fontFamily: 'ui-monospace, Menlo, monospace', resize: 'vertical' }}
              placeholder='SELECT 지역, AVG(점수) FROM "학생성적" GROUP BY 지역'
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <button style={primary} onClick={runQuery} disabled={busy || !sql.trim()}><Play size={13} /> 실행</button>
              <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Cmd/Ctrl+Enter · 조회(SELECT, WITH)만 · 최대 1,000행 · 8초 제한</span>
            </div>
            {result && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 6 }}>
                  {result.rows.length.toLocaleString()}행 · {result.elapsed_ms}ms{result.truncated ? ' · 1,000행까지만 표시' : ''}
                </div>
                <div style={{ overflowX: 'auto', maxHeight: 360, border: '1px solid var(--border-color)', borderRadius: 8 }}>
                  <table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%' }}>
                    <thead><tr>{result.columns.map((c) => <th key={c} style={{ textAlign: 'left', padding: '6px 10px', position: 'sticky', top: 0, background: '#1c1c22', borderBottom: '1px solid var(--border-color)' }}>{c}</th>)}</tr></thead>
                    <tbody>{result.rows.map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j} style={{ padding: '5px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{v === null ? '' : String(v)}</td>)}</tr>)}</tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <div style={{ ...box }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <button style={{ ...btn, background: tab === 'history' ? 'rgba(99,102,241,0.2)' : 'transparent' }} onClick={() => { setTab('history'); reloadHistory(); }}><History size={12} /> 이력</button>
            </div>
            {tab === 'history' && history && (
              <div style={{ display: 'grid', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>적재 이력</div>
                  {history.loads.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>기록이 없습니다.</div>}
                  {history.loads.map((l, i) => (
                    <div key={i} style={{ fontSize: 12, padding: '4px 0', color: '#d1d5db' }}>{l.loaded_at} · {l.table} · {l.source} · {l.mode === 'append' ? '추가' : '덮어쓰기'} · {l.rows.toLocaleString()}행</div>
                  ))}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>쿼리 이력 (눌러서 다시 불러오기)</div>
                  {history.queries.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>기록이 없습니다.</div>}
                  {history.queries.map((q, i) => (
                    <button key={i} onClick={() => setSql(q.sql)} style={{ ...btn, display: 'block', width: '100%', textAlign: 'left', marginBottom: 4, fontFamily: 'ui-monospace, Menlo, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {q.ran_at} · {q.rows}행 · {q.sql}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WarehouseScreen;
