import React, { useEffect, useState } from 'react';
import { CalendarClock, Trash2, Plus } from 'lucide-react';

const apiBase = () => (window.location.hostname === 'localhost' ? 'http://localhost:8001/api' : '/api');

interface Schedule {
  id: string;
  prompt: string;
  every_minutes: number;
  created: string;
  last_run: string | null;
  last_result: string;
  last_error: string;
}

const INTERVALS: { minutes: number; label: string }[] = [
  { minutes: 60, label: '1시간마다' },
  { minutes: 360, label: '6시간마다' },
  { minutes: 1440, label: '하루마다' },
  { minutes: 10080, label: '일주일마다' },
];

/** 예약 작업: 정해진 주기마다 질문을 실행하고 결과를 저장해 둔다. */
export const SchedulesScreen: React.FC = () => {
  const [items, setItems] = useState<Schedule[]>([]);
  const [prompt, setPrompt] = useState('');
  const [interval, setIntervalMinutes] = useState(1440);
  const [message, setMessage] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = async () => {
    try {
      const response = await fetch(`${apiBase()}/schedules`);
      const data = await response.json();
      setItems(data.schedules || []);
    } catch {
      setMessage('백엔드에 연결할 수 없습니다.');
    }
  };
  useEffect(() => { load(); const timer = setInterval(load, 30000); return () => clearInterval(timer); }, []);

  const create = async () => {
    if (!prompt.trim()) return;
    try {
      const response = await fetch(`${apiBase()}/schedules`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim(), every_minutes: interval }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || `HTTP ${response.status}`);
      setPrompt('');
      setMessage('예약을 만들었습니다. 첫 실행은 1분 안에 시작됩니다.');
      load();
    } catch (err) {
      setMessage(`만들기 실패: ${(err as Error).message}`);
    }
  };

  const remove = async (id: string) => {
    await fetch(`${apiBase()}/schedules/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%', boxSizing: 'border-box', maxWidth: 820 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <CalendarClock size={22} color="#c7c9ff" />
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>예약 작업</div>
          <div style={{ fontSize: 13, color: 'rgba(224,224,224,0.6)' }}>정해진 주기마다 질문을 실행하고 결과를 저장합니다.</div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 10, padding: 16, borderRadius: 14, border: '1px solid var(--border-color)', marginBottom: 20 }}>
        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} placeholder="예: 오늘의 주요 기술 뉴스를 세 줄로 요약해 줘"
          style={{ background: 'transparent', border: '1px solid var(--border-color)', borderRadius: 10, color: '#fff', padding: 10, fontFamily: 'inherit', resize: 'vertical' }} />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={interval} onChange={(e) => setIntervalMinutes(Number(e.target.value))}
            style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid var(--border-color)', background: '#1c1c1e', color: '#fff' }}>
            {INTERVALS.map((i) => <option key={i.minutes} value={i.minutes}>{i.label}</option>)}
          </select>
          <button className="feature-btn primary" onClick={create} disabled={!prompt.trim()} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={14} /> 예약 만들기
          </button>
          {message && <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{message}</span>}
        </div>
      </div>

      {items.length === 0 && <div style={{ fontSize: 13, color: 'rgba(224,224,224,0.5)' }}>아직 예약 작업이 없습니다.</div>}
      <div style={{ display: 'grid', gap: 10 }}>
        {items.map((item) => (
          <div key={item.id} style={{ padding: 14, borderRadius: 12, border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
              <button onClick={() => setOpenId(openId === item.id ? null : item.id)} style={{ textAlign: 'left', background: 'transparent', border: 'none', color: '#e5e7eb', cursor: 'pointer', flex: 1, fontSize: 14 }}>
                {item.prompt}
              </button>
              <button onClick={() => remove(item.id)} title="삭제" style={{ background: 'transparent', border: 'none', color: '#ff6b9d', cursor: 'pointer' }}><Trash2 size={15} /></button>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 6 }}>
              {INTERVALS.find((i) => i.minutes === item.every_minutes)?.label ?? `${item.every_minutes}분마다`} · 마지막 실행 {item.last_run ?? '없음'}
              {item.last_error && <span style={{ color: '#ff6b9d' }}> · 실패: {item.last_error}</span>}
            </div>
            {openId === item.id && item.last_result && (
              <div style={{ marginTop: 10, whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.6, color: '#d1d5db', borderTop: '1px solid var(--border-color)', paddingTop: 10 }}>{item.last_result}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SchedulesScreen;
