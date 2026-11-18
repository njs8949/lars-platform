// 연결된 외부 에이전트(Claude, GPT). 키는 서버 금고에 암호화되어 있고, 이 파일은 키 값을 다루지 않는다.
// 한도를 넘으면 채팅이 streamAgent로 이어서 답한다. 호출은 서버가 중계하고 브라우저는 답변 조각만 받는다.

import { getToken } from './auth';

export type AgentProvider = 'anthropic' | 'openai';
export type Preferred = 'auto' | AgentProvider;

export interface AgentStatus {
  keys: Partial<Record<AgentProvider, { configured: boolean; last4: string; updated_at: string }>>;
  preferred: Preferred;
  vault_ready: boolean;
}

export const AGENT_LABEL: Record<AgentProvider, string> = { anthropic: 'Claude', openai: 'GPT' };

// 이전 버전이 이 기기에 남긴 평문 키를 지운다.
try { localStorage.removeItem('prism.connectedAgent'); } catch { /* 저장소를 쓸 수 없으면 할 일이 없다 */ }

const apiBase = () => (window.location.hostname === 'localhost' ? 'http://localhost:8001/api' : '/api');
const authHeaders = (): Record<string, string> => {
  const token = getToken();
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, { method, headers: authHeaders(), body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
  return data as T;
}

export const fetchAgentStatus = () => call<AgentStatus>('GET', '/agents/keys');
export const saveAgentKey = (provider: AgentProvider, key: string) => call<AgentStatus>('PUT', `/agents/keys/${provider}`, { key });
export const deleteAgentKey = (provider: AgentProvider) => call<AgentStatus>('DELETE', `/agents/keys/${provider}`);
export const setAgentPreferred = (preferred: Preferred) => call<AgentStatus>('PUT', '/agents/preferred', { preferred });

type Msg = { role: 'user' | 'assistant' | 'system'; content: string };

/** 서버가 중계하는 외부 에이전트 호출. onStart(제공자 이름), onDelta(누적 텍스트). 연결된 에이전트가 없으면 오류를 던진다. */
export async function streamAgent(messages: Msg[], onStart: (label: string) => void, onDelta: (text: string) => void, signal?: AbortSignal): Promise<string> {
  const res = await fetch(`${apiBase()}/agents/chat/stream`, {
    method: 'POST',
    headers: authHeaders(),
    signal,
    body: JSON.stringify({ messages }),
  });
  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || `외부 에이전트 호출에 실패했습니다 (HTTP ${res.status}).`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let text = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split('\n\n');
    buffer = blocks.pop() ?? '';
    for (const block of blocks) {
      const line = block.split('\n').find((l) => l.startsWith('data: '));
      if (!line) continue;
      const event = JSON.parse(line.slice(6));
      if (event.type === 'start') onStart(event.label);
      else if (event.type === 'delta') { text += event.text; onDelta(text); }
      else if (event.type === 'error') throw new Error(event.message);
    }
  }
  return text;
}
