import React, { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { Shield, RefreshCw, Wrench, Clock, Key, Bug, Cloud, CheckCircle, AlertTriangle, AlertCircle, XCircle, X } from 'lucide-react';

// ── 타입 정의 ───────────────────────────────────────────────────
interface SecretFinding {
  file: string;
  line: number;
  pattern: string;
  severity: string;
  preview: string;
}

interface VulnFinding {
  package: string;
  version: string;
  ecosystem: string;
  id: string;
  summary: string;
  severity: string;
  aliases: string[];
}

interface ScoreBreakdown {
  secret_penalty: number;
  vuln_penalty: number;
  aws_penalty: number;
  secrets: number;
  vulnerabilities: number;
  aws_findings: number;
}

interface SecurityScore {
  score: number;
  grade: string;
  summary: string;
  recommendations: string[];
  breakdown: ScoreBreakdown;
}

interface SecurityReport {
  generated_at: string;
  workspace: string;
  score: SecurityScore;
  secrets: {
    scanned_files: number;
    total_findings: number;
    by_severity: Record<string, number>;
    findings: SecretFinding[];
  };
  vulnerabilities: {
    packages_checked: number;
    total_vulnerabilities: number;
    vulnerabilities: VulnFinding[];
    errors: string[];
  };
  aws?: {
    total_findings: number;
    findings: any[];
  };
}

// ── 유틸 ────────────────────────────────────────────────────────
function scoreColor(score: number): string {
  if (score >= 80) return '#34c759';
  if (score >= 60) return '#ffd60a';
  if (score >= 40) return '#ff9f0a';
  return '#ff3b30';
}

function severityIcon(sev: string) {
  const s = sev.toUpperCase();
  if (s === 'CRITICAL' || s === 'HIGH')
    return <XCircle size={14} color="#ff3b30" />;
  if (s === 'MODERATE' || s === 'MEDIUM')
    return <AlertTriangle size={14} color="#ff9f0a" />;
  return <AlertCircle size={14} color="#ffd60a" />;
}

function timeAgo(iso: string): string {
  if (!iso) return '-';
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}초 전`;
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  return `${Math.floor(diff / 3600)}시간 전`;
}

// ── 컴포넌트 ────────────────────────────────────────────────────
function Security() {
  const [report, setReport] = useState<SecurityReport | null>(null);
  const [scanning, setScanning] = useState(false);
  const [patching, setPatching] = useState(false);
  const [scanLog, setScanLog] = useState<string>('');
  const [ignoredSecrets, setIgnoredSecrets] = useState<Set<string>>(new Set());
  const [ignoredVulns, setIgnoredVulns] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const loadReport = useCallback(async () => {
    try {
      const raw = await invoke<string>('load_security_report');
      const parsed: SecurityReport = JSON.parse(raw);
      setReport(parsed);
      setError(null);
    } catch (e: any) {
      setError(`리포트 로드 실패: ${e}`);
    }
  }, []);

  useEffect(() => { loadReport(); }, [loadReport]);

  const runScan = async () => {
    setScanning(true);
    setScanLog('');
    setError(null);
    try {
      const result = await invoke<string>('run_security_scan');
      setScanLog(result || '스캔 완료');
      await loadReport();
    } catch (e: any) {
      setError(`스캔 실패: ${e}`);
    } finally {
      setScanning(false);
    }
  };

  const applyPatches = async () => {
    setPatching(true);
    setError(null);
    try {
      const result = await invoke<string>('apply_security_patches', {
        patchTypes: ['secrets', 'vulns'],
      });
      setScanLog(result || '패치 완료');
      await loadReport();
    } catch (e: any) {
      setError(`패치 실패: ${e}`);
    } finally {
      setPatching(false);
    }
  };

  const score = report?.score?.score ?? null;
  const grade = report?.score?.grade ?? '-';
  const breakdown = report?.score?.breakdown;
  const secrets = report?.secrets?.findings ?? [];
  const vulns = report?.vulnerabilities?.vulnerabilities ?? [];
  const awsCount = report?.aws?.total_findings ?? 0;
  const generatedAt = report?.generated_at ?? '';

  const visibleSecrets = secrets.filter((_, i) => !ignoredSecrets.has(`s-${i}`));
  const visibleVulns = vulns.filter((_, i) => !ignoredVulns.has(`v-${i}`));

  return (
    <div className="security-container animate-in">
      {/* 헤더 */}
      <header className="view-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <Shield size={32} color="var(--accent-blue)" />
          <div>
            <h2 style={{ margin: 0 }}>LARS Shieldora — Supply Chain Security</h2>
            <p className="view-desc" style={{ margin: 0 }}>공급망 취약점 스캔 및 자동 패치</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginTop: '1rem', flexWrap: 'wrap' }}>
          <button
            className="btn-primary"
            onClick={runScan}
            disabled={scanning || patching}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <RefreshCw size={15} className={scanning ? 'spin' : ''} />
            {scanning ? '스캔 중...' : '스캔 실행'}
          </button>
          <button
            className="btn-secondary"
            onClick={applyPatches}
            disabled={scanning || patching || !report}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Wrench size={15} />
            {patching ? '패치 적용 중...' : '자동 패치 적용'}
          </button>
          {generatedAt && (
            <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Clock size={12} />
              마지막: {timeAgo(generatedAt)}
            </span>
          )}
        </div>
      </header>

      {/* 오류 배너 */}
      {error && (
        <div style={{ background: 'rgba(255,59,48,0.15)', border: '1px solid rgba(255,59,48,0.4)', borderRadius: '8px', padding: '0.8rem 1rem', marginBottom: '1rem', color: '#ff3b30', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      {/* 스캔 로그 */}
      {scanLog && (
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.8rem 1rem', marginBottom: '1rem', fontSize: '0.8rem', color: 'var(--text-dim)', fontFamily: 'monospace', whiteSpace: 'pre-wrap', maxHeight: '100px', overflow: 'auto' }}>
          {scanLog}
        </div>
      )}

      {/* 점수 카드 */}
      <div className="security-dashboard" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '1.5rem' }}>
        <div className="stat-card" style={{ borderLeft: `3px solid ${score !== null ? scoreColor(score) : 'var(--border)'}` }}>
          <label>종합 점수</label>
          <div className="stat-value" style={{ color: score !== null ? scoreColor(score) : 'var(--text-dim)', fontSize: '2rem' }}>
            {score !== null ? `${score}/100` : '-'}
          </div>
          <span className="item-desc" style={{ color: score !== null ? scoreColor(score) : 'var(--text-dim)', fontWeight: 600 }}>
            Grade {grade}
          </span>
        </div>

        <div className="stat-card" style={{ borderLeft: '3px solid #ff9f0a' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <label>시크릿</label>
            <Key size={16} color="#ff9f0a" />
          </div>
          <div className="stat-value" style={{ color: (breakdown?.secrets ?? 0) > 0 ? '#ff9f0a' : '#34c759' }}>
            {breakdown?.secrets ?? secrets.length}
          </div>
          <span className="item-desc">MEDIUM severity</span>
        </div>

        <div className="stat-card" style={{ borderLeft: '3px solid #ff3b30' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <label>CVE</label>
            <Bug size={16} color="#ff3b30" />
          </div>
          <div className="stat-value" style={{ color: (breakdown?.vulnerabilities ?? 0) > 0 ? '#ff3b30' : '#34c759' }}>
            {breakdown?.vulnerabilities ?? vulns.length}
          </div>
          <span className="item-desc">취약 패키지</span>
        </div>

        <div className="stat-card" style={{ borderLeft: `3px solid ${awsCount > 0 ? '#ff9f0a' : '#34c759'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <label>AWS 이슈</label>
            <Cloud size={16} color={awsCount > 0 ? '#ff9f0a' : '#34c759'} />
          </div>
          <div className="stat-value" style={{ color: awsCount > 0 ? '#ff9f0a' : '#34c759' }}>
            {awsCount}
          </div>
          <span className="item-desc">{awsCount === 0 ? 'SecurityHub / IAM 정상' : '조치 필요'}</span>
        </div>
      </div>

      {/* 권고사항 */}
      {(report?.score?.recommendations?.length ?? 0) > 0 && (
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px', padding: '1rem 1.2rem', marginBottom: '1.5rem' }}>
          <h4 style={{ margin: '0 0 0.6rem', color: 'var(--text-dim)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>권고사항</h4>
          {report!.score.recommendations.map((r, i) => (
            <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.3rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              <span style={{ color: '#ff9f0a', flexShrink: 0 }}>→</span>
              {r}
            </div>
          ))}
        </div>
      )}

      {/* Secrets */}
      <section style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.8rem' }}>
          <Key size={16} color="#ff9f0a" />
          Secrets ({visibleSecrets.length})
          {secrets.length > visibleSecrets.length && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 400 }}>
              &nbsp;({secrets.length - visibleSecrets.length}개 무시됨)
            </span>
          )}
        </h3>
        {visibleSecrets.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#34c759', padding: '0.8rem', background: 'var(--bg-secondary)', borderRadius: '8px', fontSize: '0.85rem' }}>
            <CheckCircle size={15} /> 시크릿 없음
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {secrets.map((f, i) => {
              const key = `s-${i}`;
              if (ignoredSecrets.has(key)) return null;
              return (
                <div key={key} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.7rem 1rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                  <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', flex: 1 }}>
                    <div style={{ marginTop: '2px', flexShrink: 0 }}>{severityIcon(f.severity)}</div>
                    <div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                        {f.file}:{f.line}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                        {f.pattern}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.15rem', fontFamily: 'monospace' }}>
                        {f.preview}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setIgnoredSecrets(prev => new Set([...prev, key]))}
                    style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '5px', padding: '0.2rem 0.5rem', cursor: 'pointer', color: 'var(--text-dim)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.2rem', flexShrink: 0 }}
                  >
                    <X size={11} /> 무시
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* CVEs */}
      <section style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.8rem' }}>
          <Bug size={16} color="#ff3b30" />
          CVEs ({visibleVulns.length})
          {vulns.length > visibleVulns.length && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 400 }}>
              &nbsp;({vulns.length - visibleVulns.length}개 무시됨)
            </span>
          )}
        </h3>
        {visibleVulns.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#34c759', padding: '0.8rem', background: 'var(--bg-secondary)', borderRadius: '8px', fontSize: '0.85rem' }}>
            <CheckCircle size={15} /> 취약점 없음
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {vulns.map((v, i) => {
              const key = `v-${i}`;
              if (ignoredVulns.has(key)) return null;
              const cveId = v.aliases?.[0] ?? v.id;
              return (
                <div key={key} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.7rem 1rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                  <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', flex: 1 }}>
                    <div style={{ marginTop: '2px', flexShrink: 0 }}>{severityIcon(v.severity)}</div>
                    <div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--accent-blue)', fontFamily: 'monospace', fontWeight: 600 }}>
                        {cveId}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                        <span style={{ fontFamily: 'monospace', background: 'rgba(255,255,255,0.06)', padding: '0 0.3rem', borderRadius: '3px' }}>{v.package} {v.version}</span>
                        {' '}— {v.ecosystem}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                        {v.summary}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setIgnoredVulns(prev => new Set([...prev, key]))}
                    style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '5px', padding: '0.2rem 0.5rem', cursor: 'pointer', color: 'var(--text-dim)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.2rem', flexShrink: 0 }}
                  >
                    <X size={11} /> 무시
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* AWS */}
      <section>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.8rem' }}>
          <Cloud size={16} color={awsCount > 0 ? '#ff9f0a' : '#34c759'} />
          AWS Findings ({awsCount})
        </h3>
        {awsCount === 0 ? (
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.8rem 1rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <CheckCircle size={15} color="#34c759" />
            <span style={{ fontSize: '0.85rem', color: '#34c759' }}>
              SecurityHub / GuardDuty / Inspector / IAM — 이슈 없음
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {report?.aws?.findings?.map((f: any, i: number) => (
              <div key={i} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.7rem 1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {JSON.stringify(f)}
              </div>
            ))}
          </div>
        )}
      </section>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
        .btn-primary { background: var(--accent-blue); color: #fff; border: none; border-radius: 7px; padding: 0.5rem 1rem; cursor: pointer; font-size: 0.85rem; font-weight: 600; transition: opacity 0.15s; }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-secondary { background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--border); border-radius: 7px; padding: 0.5rem 1rem; cursor: pointer; font-size: 0.85rem; font-weight: 500; transition: opacity 0.15s; }
        .btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
    </div>
  );
}

export default Security;
