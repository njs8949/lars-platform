import React, { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import {
  Shield, Terminal as TerminalIcon, ScrollText,
  RefreshCw, Wrench, Send, Play, Square,
  Key, Bug, Cloud, CheckCircle, AlertTriangle, XCircle, X
} from 'lucide-react';

// ── 타입 ────────────────────────────────────────────────────────
type HubTab = 'security' | 'terminal' | 'logs';

interface SecretFinding   { file: string; line: number; pattern: string; severity: string; }
interface VulnFinding     { package: string; version: string; id: string; summary: string; severity: string; }
interface SecurityScore   { score: number; grade: string; summary: string; recommendations: string[]; breakdown: any; }
interface SecurityReport  {
  generated_at: string;
  score: SecurityScore;
  secrets: { total_findings: number; by_severity: Record<string, number>; findings: SecretFinding[]; };
  vulnerabilities: { packages_checked: number; total_vulnerabilities: number; vulnerabilities: VulnFinding[]; };
  aws?: { total_findings: number; findings: any[]; mock: boolean; services_checked: string[]; };
  sbom_components?: number;
  mock_mode?: boolean;
}
interface LogEntry { timestamp: string; level: string; message: string; }

// ── 공통 유틸 ────────────────────────────────────────────────────
const gradeColor: Record<string, string> = { A:'#34c759', B:'#34c759', C:'#fbbf24', D:'#f97316', F:'#ef4444' };
const sevColor:   Record<string, string> = { CRITICAL:'#ef4444', HIGH:'#f97316', MEDIUM:'#fbbf24', LOW:'#6b7280', INFO:'#6b7280' };

// ══════════════════════════════════════════════════════════════════
// SecurityTab — Supply Chain 스캔 + 패치
// ══════════════════════════════════════════════════════════════════
// spin 애니메이션 (인라인 style에 넣기 위해 <style> 삽입)
const spinStyle = `@keyframes spin { to { transform: rotate(360deg); } }`;

function SecurityTab() {
  const [report,   setReport]   = useState<SecurityReport | null>(null);
  const [scanning, setScanning] = useState(false);
  const [patching, setPatching] = useState(false);
  const [msg,      setMsg]      = useState('');
  const [ignored,  setIgnored]  = useState<Set<string>>(new Set());

  const loadReport = async () => {
    try {
      const raw = await invoke<string>('load_security_report');
      setReport(JSON.parse(raw));
    } catch { /* no report yet */ }
  };

  useEffect(() => { loadReport(); }, []);

  const runScan = async () => {
    setScanning(true); setMsg('스캔 실행 중...');
    try {
      await invoke<string>('run_security_scan');
      await loadReport();
      setMsg('✓ 스캔 완료');
    } catch (e) { setMsg(`✗ 스캔 실패: ${e}`); }
    finally { setScanning(false); }
  };

  const applyPatch = async () => {
    setPatching(true);
    setMsg('🔧 패치 적용 중... (완료 후 자동 재스캔)');
    try {
      // 1) 패치 실행 (Tauri 내부에서 재스캔까지 처리)
      const patchResult = await invoke<string>('apply_security_patches', { patchTypes: ['secrets', 'vulns'] });
      // 2) 갱신된 리포트 로드 (재스캔 완료 대기 포함됨)
      await loadReport();
      // 패치 결과 파싱해서 요약 표시
      try {
        const data = JSON.parse(patchResult);
        const n = (data.patched || []).length;
        setMsg(`✓ 패치 완료 ${n}건 · 재스캔 반영됨`);
      } catch { setMsg('✓ 패치 완료 · 재스캔 반영됨'); }
    } catch (e) { setMsg(`✗ 패치 실패: ${e}`); }
    finally { setPatching(false); }
  };

  const score = report?.score;
  const gc    = gradeColor[score?.grade ?? ''] ?? '#ffffff';
  const hasIssues = (report?.secrets.total_findings ?? 0) + (report?.vulnerabilities.total_vulnerabilities ?? 0) > 0;

  return (
    <div style={{ padding: '1rem', overflowY: 'auto', height: '100%', position:'relative' }}>
      <style>{spinStyle}</style>

      {/* 헤더 */}
      <div style={{ display:'flex', alignItems:'center', gap:'0.8rem', marginBottom:'1rem', flexWrap:'wrap' }}>
        <Shield size={22} color="#34c759" />
        <span style={{ fontWeight:700, fontSize:'1rem' }}>Supply Chain 보안 스캔</span>
        <div style={{ marginLeft:'auto', display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
          <button className="action-btn" onClick={runScan} disabled={scanning || patching}
            style={{ background:'#1e3a2f', color:'#34c759', border:'1px solid #34c759', borderRadius:8, padding:'6px 14px', cursor:'pointer', display:'flex', alignItems:'center', gap:6, fontSize:'0.85rem' }}>
            <RefreshCw size={14} className={scanning ? 'spin' : ''} />
            {scanning ? '스캔 중...' : '스캔 실행'}
          </button>
          {hasIssues && (
            <button onClick={applyPatch} disabled={scanning || patching}
              style={{ background:'#2a1e3a', color:'#a78bfa', border:'1px solid #a78bfa', borderRadius:8, padding:'6px 14px', cursor:'pointer', display:'flex', alignItems:'center', gap:6, fontSize:'0.85rem' }}>
              <Wrench size={14} />
              {patching ? '패치 중...' : '자동 패치 적용'}
            </button>
          )}
        </div>
      </div>

      {msg && <div style={{ padding:'8px 12px', borderRadius:6, background:'rgba(255,255,255,0.07)', marginBottom:'0.8rem', fontSize:'0.82rem', color:'#aaa' }}>{msg}</div>}

      {/* 로딩 오버레이 — 기존 결과를 가리지 않고 위에 표시 */}
      {(scanning || patching) && (
        <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.55)', zIndex:10, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12, borderRadius:12 }}>
          <div style={{ width:36, height:36, border:'3px solid #34c759', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
          <span style={{ color:'#34c759', fontSize:'0.9rem' }}>{msg}</span>
        </div>
      )}

      {!report ? (
        <div style={{ textAlign:'center', padding:'3rem', color:'var(--text-dim)' }}>
          스캔 결과가 없습니다. <strong>스캔 실행</strong>을 눌러주세요.
        </div>
      ) : (
        <>
          {/* 점수 카드 */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:'0.6rem', marginBottom:'1rem' }}>
            {[
              { label:'종합 점수', value:`${score!.score}/100`, sub:`Grade ${score!.grade}`, color: gc },
              { label:'시크릿', value:`${report.secrets.total_findings}개`, sub:`C:${report.secrets.by_severity['CRITICAL']??0} H:${report.secrets.by_severity['HIGH']??0}`, color: report.secrets.total_findings ? '#f97316' : '#34c759' },
              { label:'CVE', value:`${report.vulnerabilities.total_vulnerabilities}개`, sub:`${report.vulnerabilities.packages_checked}개 패키지`, color: report.vulnerabilities.total_vulnerabilities ? '#ef4444' : '#34c759' },
              { label:'AWS', value:`${report.aws?.total_findings ?? 0}개`, sub: report.aws?.mock ? '(mock)' : '(live)', color: (report.aws?.total_findings ?? 0) ? '#fbbf24' : '#34c759' },
            ].map(c => (
              <div key={c.label} style={{ background:'rgba(255,255,255,0.05)', borderRadius:10, padding:'0.7rem 0.9rem', borderLeft:`3px solid ${c.color}` }}>
                <div style={{ fontSize:'0.72rem', color:'var(--text-dim)', marginBottom:2 }}>{c.label}</div>
                <div style={{ fontSize:'1.1rem', fontWeight:700, color: c.color }}>{c.value}</div>
                <div style={{ fontSize:'0.7rem', color:'var(--text-dim)' }}>{c.sub}</div>
              </div>
            ))}
          </div>

          {/* 시크릿 목록 */}
          {report.secrets.findings.filter(f => !ignored.has(`s_${f.file}_${f.line}`)).length > 0 && (
            <Section title={`🔑 시크릿 (${report.secrets.findings.filter(f=>!ignored.has(`s_${f.file}_${f.line}`)).length}개)`} color="#f97316">
              {report.secrets.findings.filter(f => !ignored.has(`s_${f.file}_${f.line}`)).map((f, i) => (
                <FindingRow key={i} color={sevColor[f.severity]??'#fff'}
                  badge={f.severity}
                  main={`${f.file}:${f.line}`}
                  sub={f.pattern}
                  onIgnore={() => setIgnored(p => new Set([...p, `s_${f.file}_${f.line}`]))} />
              ))}
            </Section>
          )}
          {report.secrets.total_findings === 0 && <OkRow label="시크릿 없음" />}

          {/* CVE 목록 */}
          {(report.vulnerabilities.vulnerabilities ?? []).filter(v => !ignored.has(`v_${v.id}`)).length > 0 && (
            <Section title={`🐛 CVE (${(report.vulnerabilities.vulnerabilities??[]).filter(v=>!ignored.has(`v_${v.id}`)).length}개)`} color="#ef4444">
              {(report.vulnerabilities.vulnerabilities??[]).filter(v=>!ignored.has(`v_${v.id}`)).map((v,i)=>(
                <FindingRow key={i} color={sevColor[v.severity]??'#fff'}
                  badge={v.severity}
                  main={`${v.package} ${v.version}`}
                  sub={v.id + (v.summary ? ' — ' + v.summary.slice(0,60) : '')}
                  onIgnore={() => setIgnored(p => new Set([...p, `v_${v.id}`]))} />
              ))}
            </Section>
          )}
          {report.vulnerabilities.total_vulnerabilities === 0 && <OkRow label="CVE 없음" />}

          {/* AWS */}
          {(report.aws?.findings ?? []).length > 0 && (
            <Section title={`☁️ AWS (${report.aws!.findings.length}개) · ${report.aws!.mock?'mock':'live'}`} color="#fbbf24">
              {report.aws!.findings.map((f,i)=>(
                <FindingRow key={i} color={sevColor[f.severity]??'#fff'} badge={f.service} main={f.title} sub={f.description?.slice(0,80)??''} />
              ))}
            </Section>
          )}

          {/* 권고사항 */}
          {score!.recommendations.length > 0 && (
            <Section title="💡 권고사항" color="#6366f1">
              {score!.recommendations.map((r,i)=>(
                <div key={i} style={{ padding:'5px 0', fontSize:'0.82rem', color:'var(--text-secondary)', display:'flex', gap:8 }}>
                  <span style={{ color:'#6366f1', fontWeight:700 }}>{i+1}.</span>{r}
                </div>
              ))}
            </Section>
          )}

          <div style={{ fontSize:'0.72rem', color:'var(--text-dim)', marginTop:'0.8rem' }}>
            마지막 스캔: {new Date(report.generated_at).toLocaleString()}
          </div>
        </>
      )}
    </div>
  );
}

// ── 서브 컴포넌트 ────────────────────────────────────────────────
function Section({ title, color, children }: { title:string; color:string; children:React.ReactNode }) {
  return (
    <div style={{ marginBottom:'0.8rem' }}>
      <div style={{ fontSize:'0.78rem', fontWeight:700, color, marginBottom:'0.3rem', borderBottom:`1px solid ${color}33`, paddingBottom:4 }}>{title}</div>
      {children}
    </div>
  );
}
function FindingRow({ color, badge, main, sub, onIgnore }: { color:string; badge:string; main:string; sub:string; onIgnore?:()=>void }) {
  return (
    <div style={{ display:'flex', alignItems:'flex-start', gap:8, padding:'4px 0', fontSize:'0.8rem' }}>
      <span style={{ color, fontWeight:700, minWidth:70, fontSize:'0.72rem' }}>{badge}</span>
      <div style={{ flex:1 }}>
        <div style={{ color:'#e2e8f0' }}>{main}</div>
        {sub && <div style={{ color:'var(--text-dim)', fontSize:'0.72rem' }}>{sub}</div>}
      </div>
      {onIgnore && (
        <button onClick={onIgnore} title="무시" style={{ background:'transparent', border:'none', color:'#555', cursor:'pointer', padding:2 }}>
          <X size={12} />
        </button>
      )}
    </div>
  );
}
function OkRow({ label }: { label:string }) {
  return <div style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 0', fontSize:'0.8rem', color:'#34c759' }}><CheckCircle size={13} />{label}</div>;
}

// ══════════════════════════════════════════════════════════════════
// TerminalTab
// ══════════════════════════════════════════════════════════════════
function TerminalTab() {
  const [input,  setInput]  = useState('');
  const [output, setOutput] = useState<string[]>(['LARS Prism Integrated Terminal v1.4.0', '시스템 에이전트와 통신할 준비가 되었습니다.']);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  const handleCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const cmd = input.trim();
    setOutput(p => [...p, `\n> ${cmd}`]);
    setInput('');
    try {
      const result = await invoke<string>('execute_terminal_command', { command: cmd });
      setOutput(p => [...p, result]);
    } catch (err) { setOutput(p => [...p, `[ERROR] ${err}`]); }
  };

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [output]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', padding:'0.8rem' }} onClick={() => inputRef.current?.focus()}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:'0.5rem' }}>
        <TerminalIcon size={16} color="#94a3b8" />
        <span style={{ fontSize:'0.82rem', color:'#94a3b8' }}>통합 터미널</span>
      </div>
      <div ref={scrollRef} style={{ flex:1, overflowY:'auto', background:'rgba(0,0,0,0.4)', borderRadius:8, padding:'0.8rem', fontFamily:'monospace', fontSize:'0.78rem', color:'#e2e8f0', whiteSpace:'pre-wrap', wordBreak:'break-all' }}>
        {output.map((line, i) => <div key={i}>{line}</div>)}
      </div>
      <form onSubmit={handleCommand} style={{ display:'flex', gap:8, marginTop:'0.5rem' }}>
        <span style={{ color:'#34c759', fontFamily:'monospace', fontSize:'0.82rem', alignSelf:'center' }}>$</span>
        <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
          style={{ flex:1, background:'rgba(255,255,255,0.07)', border:'1px solid #333', borderRadius:6, padding:'6px 10px', color:'#e2e8f0', fontFamily:'monospace', fontSize:'0.82rem', outline:'none' }}
          placeholder="명령어 입력..." autoComplete="off" spellCheck={false} />
        <button type="submit" style={{ background:'#1e3a2f', color:'#34c759', border:'1px solid #34c759', borderRadius:6, padding:'6px 12px', cursor:'pointer' }}>
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// LogsTab
// ══════════════════════════════════════════════════════════════════
function LogsTab() {
  const [logs,        setLogs]        = useState<LogEntry[]>([]);
  const [isStreaming, setIsStreaming] = useState(true);

  useEffect(() => {
    if (!isStreaming) return;
    const msgs = ['Synzora: 워크스페이스 인덱싱 완료','Shieldora: PII 마스킹 처리됨','Rekora: 검색 패턴 최적화 중...','Brain: Gemini-Pro 엔진 전환 시도','System: AppleScript 실행 권한 확인됨'];
    const levels = ['INFO','INFO','INFO','WARN','ERROR'];
    const id = setInterval(() => {
      setLogs(p => [{ timestamp: new Date().toLocaleTimeString(), level: levels[Math.floor(Math.random()*levels.length)], message: msgs[Math.floor(Math.random()*msgs.length)] }, ...p].slice(0,100));
    }, 1500);
    return () => clearInterval(id);
  }, [isStreaming]);

  const lvlColor: Record<string,string> = { INFO:'#60a5fa', WARN:'#fbbf24', ERROR:'#ef4444' };

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', padding:'0.8rem' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:'0.5rem' }}>
        <ScrollText size={16} color="#f97316" />
        <span style={{ fontSize:'0.82rem', color:'#f97316' }}>실시간 로그 모니터</span>
        <button onClick={() => setIsStreaming(p=>!p)}
          style={{ marginLeft:'auto', background: isStreaming?'rgba(239,68,68,0.15)':'rgba(52,199,89,0.15)', border:`1px solid ${isStreaming?'#ef4444':'#34c759'}`, color: isStreaming?'#ef4444':'#34c759', borderRadius:6, padding:'4px 10px', cursor:'pointer', fontSize:'0.75rem', display:'flex', alignItems:'center', gap:4 }}>
          {isStreaming ? <><Square size={11} fill="currentColor" /> 중지</> : <><Play size={11} fill="currentColor" /> 시작</>}
        </button>
      </div>
      <div style={{ flex:1, overflowY:'auto', background:'rgba(0,0,0,0.4)', borderRadius:8, padding:'0.6rem' }}>
        {logs.map((log, i) => (
          <div key={i} style={{ display:'flex', gap:10, padding:'3px 0', fontFamily:'monospace', fontSize:'0.75rem', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
            <span style={{ color:'#555', minWidth:70 }}>{log.timestamp}</span>
            <span style={{ color: lvlColor[log.level]??'#fff', minWidth:42, fontWeight:700 }}>{log.level}</span>
            <span style={{ color:'#cbd5e1' }}>{log.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// SecurityHub — 통합 패널
// ══════════════════════════════════════════════════════════════════
function SecurityHub({ onClose }: { onClose?: () => void }) {
  const [tab, setTab] = useState<HubTab>('security');

  const tabs: { id: HubTab; label: string; icon: React.ReactNode; color: string }[] = [
    { id:'security', label:'보안 스캔',    icon:<Shield size={14} />,       color:'#34c759' },
    { id:'terminal', label:'통합 터미널',  icon:<TerminalIcon size={14} />, color:'#94a3b8' },
    { id:'logs',     label:'로그 모니터',  icon:<ScrollText size={14} />,   color:'#f97316' },
  ];

  return (
    <div className="security-hub animate-in" style={{ display:'flex', flexDirection:'column', height:'100%', background:'var(--bg-secondary, #0f1117)', borderRadius:12, overflow:'hidden', border:'1px solid rgba(255,255,255,0.08)' }}>
      {/* 탭 바 */}
      <div style={{ display:'flex', background:'rgba(0,0,0,0.3)', borderBottom:'1px solid rgba(255,255,255,0.08)', flexShrink:0, paddingRight:'0.5rem' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'10px 18px', background:'transparent', border:'none', cursor:'pointer', fontSize:'0.82rem', fontWeight: tab===t.id ? 700 : 400, color: tab===t.id ? t.color : '#666', borderBottom: tab===t.id ? `2px solid ${t.color}` : '2px solid transparent', transition:'all 0.15s' }}>
            {t.icon}{t.label}
          </button>
        ))}
        {onClose && (
          <button onClick={onClose}
            style={{ marginLeft:'auto', display:'flex', alignItems:'center', justifyContent:'center', background:'transparent', border:'none', cursor:'pointer', color:'#666', padding:'10px 14px', transition:'color 0.15s', fontSize:'0.82rem' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#999')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#666')}
            title="닫기">
            <X size={16} />
          </button>
        )}
      </div>

      {/* 탭 컨텐츠 */}
      <div style={{ flex:1, overflow:'hidden', minHeight:0 }}>
        {tab === 'security' && <SecurityTab />}
        {tab === 'terminal' && <TerminalTab />}
        {tab === 'logs'     && <LogsTab />}
      </div>
    </div>
  );
}

export default SecurityHub;
