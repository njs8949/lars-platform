/** 커스텀 지시와 메모리(기억). 기기에 저장되며, 채팅 요청마다 백엔드로 함께 보낸다. */

export interface MemoryItem {
  id: string;
  text: string;
  createdAt: string;
}

const INSTRUCTIONS_KEY = 'prism_custom_instructions';
const MEMORIES_KEY = 'prism_memories';
const MEMORY_ON_KEY = 'prism_memory_enabled';

const read = (key: string, fallback: string): string => {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
};

export function getInstructions(): string {
  return read(INSTRUCTIONS_KEY, '');
}

export function setInstructions(text: string): void {
  try { localStorage.setItem(INSTRUCTIONS_KEY, text); } catch { /* 저장 불가 시 무시 */ }
}

export function getMemories(): MemoryItem[] {
  try {
    return JSON.parse(read(MEMORIES_KEY, '[]'));
  } catch {
    return [];
  }
}

function saveMemories(items: MemoryItem[]): void {
  try { localStorage.setItem(MEMORIES_KEY, JSON.stringify(items)); } catch { /* 무시 */ }
}

export function addMemory(text: string): MemoryItem[] {
  const trimmed = text.trim();
  const items = getMemories();
  if (!trimmed) return items;
  const next = [{ id: Date.now().toString(), text: trimmed, createdAt: new Date().toLocaleDateString('ko-KR') }, ...items];
  saveMemories(next);
  return next;
}

export function removeMemory(id: string): MemoryItem[] {
  const next = getMemories().filter((m) => m.id !== id);
  saveMemories(next);
  return next;
}

export function isMemoryEnabled(): boolean {
  return read(MEMORY_ON_KEY, '1') === '1';
}

export function setMemoryEnabled(on: boolean): void {
  try { localStorage.setItem(MEMORY_ON_KEY, on ? '1' : '0'); } catch { /* 무시 */ }
}

/** 채팅 요청에 실을 기억 목록 (끄면 빈 목록). */
export function memoryTexts(): string[] {
  return isMemoryEnabled() ? getMemories().map((m) => m.text) : [];
}
