import React, { useState } from 'react';
import { Check, Code2, FileCode } from 'lucide-react';
import { applyDevProposals, DevResult } from '../lib/aiRouter';

/** 개발 환경 결과: 요약, 작업 과정, 수정 제안(diff)과 확인 후 적용 버튼. */
export const DevResultCard: React.FC<{ result: DevResult }> = ({ result }) => {
  const [status, setStatus] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);

  const apply = async (indexes: number[]) => {
    setBusy(true);
    try {
      const targets = indexes.map((i) => result.proposals[i]);
      const { results } = await applyDevProposals(result.workspace, targets);
      setStatus((prev) => {
        const next = { ...prev };
        indexes.forEach((idx, k) => {
          next[idx] = results[k]?.ok ? '적용됨' : `실패: ${results[k]?.message ?? ''}`;
        });
        return next;
      });
    } catch (err) {
      setStatus((prev) => {
        const next = { ...prev };
        indexes.forEach((idx) => { next[idx] = `실패: ${(err as Error).message}`; });
        return next;
      });
    } finally {
      setBusy(false);
    }
  };

  const pending = result.proposals.map((_, i) => i).filter((i) => !status[i]);

  return (
    <div className="dev-result">
      <div className="dev-result-head">
        <Code2 size={14} /> Forge · <span className="dev-result-path">{result.workspace}</span>
      </div>
      {result.steps.length > 0 && (
        <details className="dev-result-steps">
          <summary>작업 과정 ({result.steps.length}단계)</summary>
          <ol>{result.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
        </details>
      )}
      {result.proposals.length === 0 ? (
        <div className="dev-result-none">수정 제안이 없습니다. 원본 파일은 변경되지 않았습니다.</div>
      ) : (
        <>
          <div className="dev-result-bar">
            <span>수정 제안 {result.proposals.length}개 · 아직 원본은 바뀌지 않았습니다</span>
            <button className="feature-btn primary" disabled={busy || pending.length === 0} onClick={() => apply(pending)}>
              모두 적용
            </button>
          </div>
          {result.proposals.map((p, i) => (
            <div key={i} className="dev-proposal">
              <div className="dev-proposal-head">
                <span><FileCode size={13} /> {p.path}</span>
                {status[i] ? (
                  <span className="dev-proposal-status">{status[i].startsWith('실패') ? status[i] : <><Check size={12} /> {status[i]}</>}</span>
                ) : (
                  <button className="feature-btn" disabled={busy} onClick={() => apply([i])}>적용</button>
                )}
              </div>
              <pre className="dev-diff">
                {p.diff.split('\n').map((line, n) => (
                  <div key={n} className={line.startsWith('+') && !line.startsWith('+++') ? 'add' : line.startsWith('-') && !line.startsWith('---') ? 'del' : ''}>{line || ' '}</div>
                ))}
              </pre>
            </div>
          ))}
        </>
      )}
    </div>
  );
};

export default DevResultCard;
