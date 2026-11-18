import React, { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';

type Slide = Record<string, any>;
type Deck = {
  id: string;
  title: string;
  theme: { preset: string; font: string; overrides: Record<string, string> };
  slides: Slide[];
  history?: unknown[];
};

const LAYOUT_LABEL: Record<string, string> = {
  title: '표지',
  table_of_contents: '목차',
  section: '구분 장',
  content: '본문(글머리)',
  stats: '수치 카드',
  steps: '단계 흐름',
  columns: '두 칸 비교',
  table: '표',
  conclusion: '핵심 정리',
};

const PRESETS = [
  { id: 'corporate', label: '기업형 (파랑)' },
  { id: 'midnight', label: '다크 (남색)' },
  { id: 'warm', label: '따뜻함 (주황)' },
  { id: 'minimal', label: '미니멀 (흑백)' },
];

const COLOR_KEYS: { key: string; label: string }[] = [
  { key: 'primary', label: '기본색' },
  { key: 'accent', label: '강조색' },
  { key: 'bg', label: '배경' },
  { key: 'ink', label: '본문 글자' },
];

const lines = (value: string) => value.split('\n').map((x) => x.trim()).filter(Boolean);
const joinLines = (values: unknown) => (Array.isArray(values) ? values.map(String).join('\n') : '');

// 장표 한 장을 편집 폼 값으로 바꾸고, 폼 값을 다시 장표로 바꾼다.
function toForm(slide: Slide): Record<string, string> {
  switch (slide.layout) {
    case 'title':
      return { title: slide.title || '', subtitle: slide.subtitle || '', author: slide.author || '' };
    case 'table_of_contents':
      return { items: joinLines(slide.items) };
    case 'section':
      return { number: slide.number || '', title: slide.title || '' };
    case 'stats':
      return { title: slide.title || '', stats: (slide.stats || []).map((s: any) => `${s.value} | ${s.label}`).join('\n') };
    case 'steps':
      return { title: slide.title || '', steps: (slide.steps || []).map((s: any) => `${s.title} | ${s.text}`).join('\n') };
    case 'columns': {
      const cols = slide.columns || [];
      return {
        title: slide.title || '',
        heading1: cols[0]?.heading || '', bullets1: joinLines(cols[0]?.bullets),
        heading2: cols[1]?.heading || '', bullets2: joinLines(cols[1]?.bullets),
      };
    }
    case 'table': {
      const table = slide.table || {};
      return {
        title: slide.title || '',
        header: (table.header || []).join(', '),
        rows: (table.rows || []).map((r: string[]) => r.join(' | ')).join('\n'),
      };
    }
    case 'conclusion':
      return { key_points: joinLines(slide.key_points), call_to_action: slide.call_to_action || '' };
    default:
      return { title: slide.title || '', body: slide.body || '', bullets: joinLines(slide.bullets) };
  }
}

function fromForm(layout: string, f: Record<string, string>, notes: string): Slide {
  const base: Slide = { layout, notes };
  switch (layout) {
    case 'title':
      return { ...base, title: f.title, subtitle: f.subtitle, author: f.author };
    case 'table_of_contents':
      return { ...base, items: lines(f.items || '') };
    case 'section':
      return { ...base, number: f.number, title: f.title };
    case 'stats':
      return {
        ...base, title: f.title,
        stats: lines(f.stats || '').map((row) => {
          const [value, ...label] = row.split('|');
          return { value: value.trim(), label: label.join('|').trim() };
        }),
      };
    case 'steps':
      return {
        ...base, title: f.title,
        steps: lines(f.steps || '').map((row) => {
          const [title, ...text] = row.split('|');
          return { title: title.trim(), text: text.join('|').trim() };
        }),
      };
    case 'columns':
      return {
        ...base, title: f.title,
        columns: [
          { heading: f.heading1, bullets: lines(f.bullets1 || '') },
          { heading: f.heading2, bullets: lines(f.bullets2 || '') },
        ],
      };
    case 'table':
      return {
        ...base, title: f.title,
        table: {
          header: (f.header || '').split(',').map((x) => x.trim()).filter(Boolean),
          rows: lines(f.rows || '').map((row) => row.split('|').map((x) => x.trim())),
        },
      };
    case 'conclusion':
      return { ...base, key_points: lines(f.key_points || ''), call_to_action: f.call_to_action };
    default:
      return { ...base, title: f.title, body: f.body, bullets: lines(f.bullets || '') };
  }
}

const field: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.12)', background: '#14141a', color: '#eee', fontSize: 13,
  fontFamily: 'inherit', marginTop: 4,
};
const button: React.CSSProperties = {
  padding: '7px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)',
  background: 'transparent', color: '#ddd', cursor: 'pointer', fontSize: 12,
};
const primaryButton: React.CSSProperties = { ...button, background: '#4F46E5', borderColor: '#4F46E5', color: '#fff' };

export const DeckEditor = ({ deckId, onBack }: { deckId: string; onBack: () => void }) => {
  const [deck, setDeck] = useState<Deck | null>(null);
  const [index, setIndex] = useState(0);
  const [form, setForm] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [instruction, setInstruction] = useState('');

  const load = async () => {
    const res = await fetch(`${API_URL}/decks/${deckId}`);
    const data = await res.json();
    setDeck(data);
    setIndex((i) => Math.min(i, data.slides.length - 1));
  };

  useEffect(() => { load().catch(() => setMessage('발표 자료를 불러오지 못했습니다.')); }, [deckId]);

  useEffect(() => {
    if (!deck || !deck.slides[index]) return;
    const slide = deck.slides[index];
    setForm(toForm(slide));
    setNotes(slide.notes || '');
    setDirty(false);
  }, [deck, index]);

  const current = deck?.slides[index];

  const setField = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const replaceSlides = (slides: Slide[], theme?: Deck['theme']) => {
    setDeck((prev) => (prev ? { ...prev, slides, theme: theme || prev.theme } : prev));
  };

  const save = async (nextSlides?: Slide[], nextTheme?: Deck['theme'], nextTitle?: string) => {
    if (!deck) return;
    setBusy(true);
    setMessage('');
    try {
      const body: Record<string, unknown> = {};
      body.slides = nextSlides ?? deck.slides;
      body.theme = nextTheme ?? deck.theme;
      if (nextTitle !== undefined) body.title = nextTitle;
      const res = await fetch(`${API_URL}/decks/${deckId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).detail || '저장 실패');
      setDeck(await res.json());
      setMessage('저장했습니다.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '저장하지 못했습니다.');
    } finally {
      setBusy(false);
    }
  };

  const applySlideEdit = async () => {
    if (!deck || !current) return;
    const edited = fromForm(current.layout, form, notes);
    const next = deck.slides.map((s, i) => (i === index ? edited : s));
    await save(next);
    setDirty(false);
  };

  const moveSlide = async (dir: -1 | 1) => {
    if (!deck) return;
    const target = index + dir;
    if (target < 0 || target >= deck.slides.length) return;
    const next = [...deck.slides];
    [next[index], next[target]] = [next[target], next[index]];
    await save(next);
    setIndex(target);
  };

  const removeSlide = async () => {
    if (!deck || deck.slides.length <= 1) return;
    const next = deck.slides.filter((_, i) => i !== index);
    await save(next);
    setIndex(Math.max(0, index - 1));
  };

  const addSlide = async (layout: string) => {
    if (!deck) return;
    const blank: Slide = layout === 'stats'
      ? { layout, title: '새 수치 장', stats: [{ value: '0', label: '설명' }] }
      : layout === 'steps'
        ? { layout, title: '새 단계 장', steps: [{ title: '1단계', text: '설명' }, { title: '2단계', text: '설명' }] }
        : layout === 'columns'
          ? { layout, title: '새 비교 장', columns: [{ heading: '항목 A', bullets: ['내용'] }, { heading: '항목 B', bullets: ['내용'] }] }
          : layout === 'table'
            ? { layout, title: '새 표 장', table: { header: ['항목', '내용'], rows: [['예시', '내용']] } }
            : { layout, title: '새 장', bullets: ['내용을 입력하세요'] };
    const next = [...deck.slides.slice(0, index + 1), blank, ...deck.slides.slice(index + 1)];
    await save(next);
    setIndex(index + 1);
  };

  const applyPreset = async (preset: string) => {
    if (!deck) return;
    const theme = { ...deck.theme, preset };
    setDeck({ ...deck, theme });
    await save(undefined, theme);
  };

  const applyColor = async (key: string, value: string) => {
    if (!deck) return;
    const theme = { ...deck.theme, overrides: { ...deck.theme.overrides, [key]: value.replace('#', '').toUpperCase() } };
    setDeck({ ...deck, theme });
    await save(undefined, theme);
  };

  const applyFont = async (font: string) => {
    if (!deck) return;
    const theme = { ...deck.theme, font };
    setDeck({ ...deck, theme });
  };

  const runAssist = async () => {
    if (!instruction.trim()) return;
    setBusy(true);
    setMessage('');
    try {
      const res = await fetch(`${API_URL}/decks/${deckId}/assist`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ instruction }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || '수정하지 못했습니다.');
      setDeck(data.deck);
      setInstruction('');
      setMessage(`적용했습니다: ${data.summary}`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '수정하지 못했습니다.');
    } finally {
      setBusy(false);
    }
  };

  const undo = async () => {
    setBusy(true);
    try {
      const res = await fetch(`${API_URL}/decks/${deckId}/undo`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || '되돌릴 수 없습니다.');
      setDeck(data);
      setMessage('이전 상태로 되돌렸습니다.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '되돌리지 못했습니다.');
    } finally {
      setBusy(false);
    }
  };

  const download = async () => {
    setBusy(true);
    setMessage('');
    try {
      const res = await fetch(`${API_URL}/decks/${deckId}/render`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || '파일을 만들지 못했습니다.');
      const bytes = Uint8Array.from(atob(data.pptx_base64), (c) => c.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename;
      a.click();
      URL.revokeObjectURL(url);
      setMessage(`.pptx를 내려받았습니다 (${data.slides_count}장).`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '내려받지 못했습니다.');
    } finally {
      setBusy(false);
    }
  };

  if (!deck) return <div style={{ padding: 24, color: '#aaa' }}>{message || '불러오는 중...'}</div>;

  const overrides = deck.theme.overrides || {};
  const colorValue = (key: string) => `#${(overrides[key] || '').padEnd(6, '0').slice(0, 6) || '000000'}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16, color: '#e5e7eb', width: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <button style={button} onClick={onBack}>← 목록</button>
        <input
          style={{ ...field, marginTop: 0, width: 320, fontWeight: 600 }}
          value={deck.title}
          onChange={(e) => setDeck({ ...deck, title: e.target.value })}
          onBlur={() => save(undefined, undefined, deck.title)}
        />
        <div style={{ flex: 1 }} />
        <button style={button} onClick={undo} disabled={busy}>실행 취소</button>
        <button style={primaryButton} onClick={download} disabled={busy}>.pptx 내려받기</button>
      </div>

      {message && <div style={{ fontSize: 13, color: '#c7c9ff' }}>{message}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '220px minmax(0,1fr) 260px', gap: 14, alignItems: 'start' }}>
        {/* 장 목록 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {deck.slides.map((s, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              style={{
                ...button, textAlign: 'left', padding: '8px 10px',
                background: i === index ? 'rgba(99,102,241,0.2)' : 'transparent',
                borderColor: i === index ? '#6366f1' : 'rgba(255,255,255,0.1)',
              }}
            >
              <div style={{ fontSize: 11, color: '#888' }}>{i + 1}. {LAYOUT_LABEL[s.layout] || s.layout}</div>
              <div style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {s.title || s.items?.[0] || s.number || '(제목 없음)'}
              </div>
            </button>
          ))}
          <select style={field} value="" onChange={(e) => e.target.value && addSlide(e.target.value)}>
            <option value="">+ 장 추가 (현재 장 뒤)</option>
            {Object.entries(LAYOUT_LABEL).filter(([k]) => k !== 'title' && k !== 'table_of_contents').map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        {/* 장 편집 */}
        {current && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: 'rgba(255,255,255,0.03)', padding: 14, borderRadius: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <strong style={{ fontSize: 14 }}>{index + 1}장 · {LAYOUT_LABEL[current.layout] || current.layout}</strong>
              <div style={{ flex: 1 }} />
              <button style={button} onClick={() => moveSlide(-1)} disabled={busy || index === 0}>↑</button>
              <button style={button} onClick={() => moveSlide(1)} disabled={busy || index === deck.slides.length - 1}>↓</button>
              <button style={button} onClick={removeSlide} disabled={busy || deck.slides.length <= 1}>삭제</button>
            </div>

            <EditFields layout={current.layout} form={form} setField={setField} />

            <label style={{ fontSize: 12, color: '#999' }}>발표자 노트
              <textarea style={{ ...field, minHeight: 60 }} value={notes} onChange={(e) => { setNotes(e.target.value); setDirty(true); }} />
            </label>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              {dirty && <span style={{ fontSize: 12, color: '#fbbf24', alignSelf: 'center' }}>저장되지 않은 변경</span>}
              <button style={primaryButton} onClick={applySlideEdit} disabled={busy || !dirty}>이 장 저장</button>
            </div>
          </div>
        )}

        {/* 테마와 AI 수정 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, background: 'rgba(255,255,255,0.03)', padding: 14, borderRadius: 12 }}>
          <strong style={{ fontSize: 13 }}>테마</strong>
          <select style={field} value={deck.theme.preset} onChange={(e) => applyPreset(e.target.value)}>
            {PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
          {COLOR_KEYS.map(({ key, label }) => (
            <label key={key} style={{ fontSize: 12, color: '#999', display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="color" value={colorValue(key)} onChange={(e) => applyColor(key, e.target.value)} />
              {label}
            </label>
          ))}
          <label style={{ fontSize: 12, color: '#999' }}>글꼴
            <input style={field} value={deck.theme.font} placeholder="Apple SD Gothic Neo" onChange={(e) => applyFont(e.target.value)} onBlur={() => save(undefined, deck.theme)} />
          </label>

          <strong style={{ fontSize: 13, marginTop: 6 }}>AI로 디자인 수정</strong>
          <textarea
            style={{ ...field, minHeight: 80 }}
            placeholder="예: 어두운 테마로 바꾸고 강조색은 초록색으로. 5장은 단계 흐름으로."
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
          />
          <button style={primaryButton} onClick={runAssist} disabled={busy || !instruction.trim()}>
            {busy ? '처리 중...' : '적용'}
          </button>
        </div>
      </div>
    </div>
  );
};

function EditFields({ layout, form, setField }: { layout: string; form: Record<string, string>; setField: (k: string, v: string) => void }) {
  const input = (key: string, label: string, multi = false, hint = '') => (
    <label key={key} style={{ fontSize: 12, color: '#999' }}>
      {label}{hint && <span style={{ color: '#666' }}> ({hint})</span>}
      {multi
        ? <textarea style={{ ...field, minHeight: 90 }} value={form[key] || ''} onChange={(e) => setField(key, e.target.value)} />
        : <input style={field} value={form[key] || ''} onChange={(e) => setField(key, e.target.value)} />}
    </label>
  );
  switch (layout) {
    case 'title':
      return <>{input('title', '제목')}{input('subtitle', '부제')}{input('author', '작성자 / 날짜')}</>;
    case 'table_of_contents':
      return <>{input('items', '목차 항목', true, '한 줄에 하나')}</>;
    case 'section':
      return <>{input('number', '번호')}{input('title', '제목')}</>;
    case 'stats':
      return <>{input('title', '제목')}{input('stats', '수치 카드', true, '한 줄에 하나: 값 | 설명, 최대 4개')}</>;
    case 'steps':
      return <>{input('title', '제목')}{input('steps', '단계', true, '한 줄에 하나: 단계 이름 | 설명, 최대 5개')}</>;
    case 'columns':
      return <>
        {input('title', '제목')}
        {input('heading1', '왼쪽 제목')}{input('bullets1', '왼쪽 내용', true, '한 줄에 하나')}
        {input('heading2', '오른쪽 제목')}{input('bullets2', '오른쪽 내용', true, '한 줄에 하나')}
      </>;
    case 'table':
      return <>{input('title', '제목')}{input('header', '열 제목', false, '쉼표로 구분')}{input('rows', '행', true, '한 줄에 하나, 칸은 | 로 구분')}</>;
    case 'conclusion':
      return <>{input('key_points', '핵심 문장', true, '한 줄에 하나, 최대 3개')}{input('call_to_action', '마무리 행동')}</>;
    default:
      return <>{input('title', '제목')}{input('body', '도입 문장')}{input('bullets', '글머리 기호', true, '한 줄에 하나, 최대 6개')}</>;
  }
}

export default DeckEditor;
