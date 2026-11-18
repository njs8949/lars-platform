import React, { useEffect, useState } from 'react';
import { MessageSquare, RotateCcw, Send, Sparkles, X } from 'lucide-react';
import {
  runRoutedAi,
  ROUTED_TAB_ENGINE,
  ASSISTANT_PREFILL_EVENT,
  FOLLOW_UP_PROMPTS,
  TAB_STARTERS,
  RoutedReply,
} from '../lib/aiRouter';
import './RoutedAssistantPanel.css';

interface Turn {
  role: 'user' | 'assistant';
  content: string;
  error?: boolean;
  meta?: RoutedReply;
}

const HISTORY_LIMIT = 10;

function provenanceLabel(meta: RoutedReply): string {
  if (meta.backend === 'ollama') return '로컬 모델 응답';
  if (meta.backend === 'claude-fallback') return '로컬 모델이 꺼져 있어 Claude로 응답';
  return 'Claude 응답';
}

export const RoutedAssistantPanel: React.FC<{ tab: string }> = ({ tab }) => {
  const info = ROUTED_TAB_ENGINE[tab];
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [lastFailed, setLastFailed] = useState<string | null>(null);

  // 화면 안의 칩이 질문 초안을 넘기면 패널을 열고 입력창을 채운다.
  useEffect(() => {
    const onPrefill = (event: Event) => {
      const detail = (event as CustomEvent<{ tab: string; text: string }>).detail;
      if (!detail || detail.tab !== tab) return;
      setOpen(true);
      setInput(detail.text);
    };
    window.addEventListener(ASSISTANT_PREFILL_EVENT, onPrefill);
    return () => window.removeEventListener(ASSISTANT_PREFILL_EVENT, onPrefill);
  }, [tab]);

  if (!info) return null;

  const send = async (text?: string) => {
    const message = (text ?? input).trim();
    if (!message || busy) return;
    const history = turns
      .filter((t) => !t.error)
      .slice(-HISTORY_LIMIT)
      .map((t) => ({ role: t.role, content: t.content }));
    setTurns((prev) => [...prev, { role: 'user', content: message }]);
    setInput('');
    setLastFailed(null);
    setBusy(true);
    try {
      const result = await runRoutedAi(tab, message, history);
      setTurns((prev) => [...prev, { role: 'assistant', content: result.reply, meta: result }]);
    } catch (err) {
      // 실패하면 질문을 입력창에 되돌려 놓고, 다시 시도할 수 있게 한다.
      setTurns((prev) => [...prev, { role: 'assistant', content: `❌ ${(err as Error).message}`, error: true }]);
      setLastFailed(message);
      setInput(message);
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button className="routed-assistant-fab" onClick={() => setOpen(true)} title={`${info.label} 어시스턴트`}>
        <MessageSquare size={18} />
        <span>{info.label}</span>
      </button>
    );
  }

  const starters = TAB_STARTERS[tab] ?? [];
  const lastTurn = turns[turns.length - 1];
  const showFollowUps = !busy && lastTurn?.role === 'assistant' && !lastTurn.error;

  return (
    <div className="routed-assistant-panel">
      <div className="routed-assistant-header">
        <span className="routed-assistant-title">
          <Sparkles size={14} /> {info.label} 어시스턴트
        </span>
        <button className="routed-assistant-close" onClick={() => setOpen(false)} title="닫기">
          <X size={16} />
        </button>
      </div>
      <div className="routed-assistant-body">
        {turns.length === 0 && (
          <div className="routed-assistant-start">
            <div className="routed-assistant-empty">이 화면의 작업에 대해 물어보세요.</div>
            <div className="routed-assistant-chips">
              {starters.map((text) => (
                <button key={text} className="routed-assistant-chip" onClick={() => send(text)}>
                  {text}
                </button>
              ))}
            </div>
          </div>
        )}
        {turns.map((turn, index) => (
          <div key={index} className={`routed-assistant-turn ${turn.role}${turn.error ? ' error' : ''}`}>
            {turn.content}
            {turn.role === 'assistant' && turn.meta && (
              <div className="routed-assistant-provenance">
                {turn.meta.engine} · {provenanceLabel(turn.meta)}
              </div>
            )}
            {turn.error && lastFailed && index === turns.length - 1 && (
              <button className="routed-assistant-retry" onClick={() => send(lastFailed)}>
                <RotateCcw size={12} /> 다시 시도
              </button>
            )}
          </div>
        ))}
        {busy && <div className="routed-assistant-turn assistant">생각하는 중...</div>}
        {showFollowUps && (
          <div className="routed-assistant-followups">
            {FOLLOW_UP_PROMPTS.map((text) => (
              <button key={text} className="routed-assistant-chip" onClick={() => send(text)}>
                {text}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="routed-assistant-input">
        <textarea
          value={input}
          placeholder="질문 입력 (Enter 전송, Shift+Enter 줄바꿈)"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              send();
            }
          }}
        />
        <button onClick={() => send()} disabled={busy || !input.trim()} title="전송">
          <Send size={16} />
        </button>
      </div>
    </div>
  );
};

export default RoutedAssistantPanel;
