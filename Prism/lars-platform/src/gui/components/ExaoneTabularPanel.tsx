import React, { useState } from 'react';
import { Zap } from 'lucide-react';

type Task = 'classification' | 'regression';

interface TabularResult {
  task: Task;
  target: string;
  data: {
    labels?: (string | number)[][];
    predictions?: number[][];
    target_columns?: string[];
  };
}

const apiUrl = () => (window.location.hostname === 'localhost' ? 'http://localhost:8001/api' : '/api');

/** EXAONE Tabular: 학습 CSV로 학습하고 예측 CSV의 행을 예측한다 (LG AI API). */
export const ExaoneTabularPanel: React.FC = () => {
  const [task, setTask] = useState<Task>('classification');
  const [trainFile, setTrainFile] = useState<File | null>(null);
  const [testFile, setTestFile] = useState<File | null>(null);
  const [target, setTarget] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TabularResult | null>(null);

  const canRun = !!trainFile && !!testFile && target.trim() !== '' && !loading;

  const run = async () => {
    if (!trainFile || !testFile) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const form = new FormData();
      form.append('train_file', trainFile);
      form.append('test_file', testFile);
      form.append('task', task);
      form.append('target', target.trim());
      const response = await fetch(`${apiUrl()}/model/exaone-tabular/predict`, { method: 'POST', body: form });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.detail || `HTTP ${response.status}`);
      }
      setResult(body as TabularResult);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const rows: (string | number)[][] | null = result
    ? (result.data.labels as (string | number)[][] | undefined) ?? (result.data.predictions as number[][] | undefined) ?? null
    : null;

  return (
    <div className="input-section" style={{ marginTop: '24px' }}>
      <label className="input-label">EXAONE 표형 데이터 예측 (LG AI)</label>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
        <button className={`tab-btn ${task === 'classification' ? 'active' : ''}`} onClick={() => setTask('classification')}>분류</button>
        <button className={`tab-btn ${task === 'regression' ? 'active' : ''}`} onClick={() => setTask('regression')}>회귀</button>
      </div>
      <div style={{ display: 'grid', gap: '10px' }}>
        <label style={{ fontSize: '13px', color: 'rgba(224,224,224,0.7)' }}>
          학습 CSV (정답 열 포함)
          <input type="file" accept=".csv,text/csv" onChange={(e) => setTrainFile(e.target.files?.[0] ?? null)} style={{ display: 'block', marginTop: '4px' }} />
        </label>
        <label style={{ fontSize: '13px', color: 'rgba(224,224,224,0.7)' }}>
          예측 CSV (정답 열 없이)
          <input type="file" accept=".csv,text/csv" onChange={(e) => setTestFile(e.target.files?.[0] ?? null)} style={{ display: 'block', marginTop: '4px' }} />
        </label>
        <input
          className="input-field"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder={task === 'classification' ? '예측할 열 이름 (예: churn)' : '예측할 열 이름 (예: price)'}
        />
      </div>
      <div className="button-group" style={{ marginTop: '12px' }}>
        <button className="analyze-btn" onClick={run} disabled={!canRun} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Zap size={18} />
          {loading ? '예측 중...' : 'EXAONE으로 예측'}
        </button>
      </div>
      {error && <div style={{ marginTop: '12px', color: '#ff6b9d', fontSize: '13px' }}>❌ {error}</div>}
      {result && rows && (
        <div style={{ marginTop: '16px' }}>
          <div style={{ fontSize: '13px', color: 'rgba(224,224,224,0.7)', marginBottom: '8px' }}>
            {result.task === 'classification' ? '예측 라벨' : '예측값'} · {result.target} · {rows.length}행
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '6px', borderBottom: '1px solid rgba(100,150,255,0.2)' }}>#</th>
                <th style={{ textAlign: 'left', padding: '6px', borderBottom: '1px solid rgba(100,150,255,0.2)' }}>{result.target}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={idx}>
                  <td style={{ padding: '6px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{idx + 1}</td>
                  <td style={{ padding: '6px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{String(row[0])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ExaoneTabularPanel;
