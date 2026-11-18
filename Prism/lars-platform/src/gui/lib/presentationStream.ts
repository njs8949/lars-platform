// 발표 자료 스트림 클라이언트. 서버가 보내는 서버 전송 이벤트(SSE)를 읽어 이벤트 단위로 넘긴다.

export type Slide = { layout: string; title?: string; [key: string]: any };

export type DeckEvent =
  | { type: 'status'; message: string }
  | { type: 'title'; title: string }
  | { type: 'slide'; index: number; total: number; slide: Slide }
  | { type: 'done'; deck_id: string; title: string; slides_count: number }
  | { type: 'error'; message: string };

const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8001/api';

export async function streamDeck(topic: string, audience: string, numSlides: number, onEvent: (e: DeckEvent) => void): Promise<void> {
  const res = await fetch(`${API_BASE}/decks/generate/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic, audience, num_slides: numSlides }),
  });
  if (!res.ok || !res.body) {
    throw new Error(`발표 자료를 만들지 못했습니다 (HTTP ${res.status})`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let cut = buffer.indexOf('\n\n');
    while (cut >= 0) {
      const block = buffer.slice(0, cut);
      buffer = buffer.slice(cut + 2);
      for (const line of block.split('\n')) {
        if (line.startsWith('data: ')) onEvent(JSON.parse(line.slice(6)) as DeckEvent);
      }
      cut = buffer.indexOf('\n\n');
    }
  }
}
