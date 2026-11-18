import React, { useEffect, useState } from 'react';
import { Copy, Check, Volume2, VolumeX, ThumbsUp, ThumbsDown, Send, PanelRight, RotateCcw } from 'lucide-react';

type Rating = 'like' | 'dislike' | null;
const FEEDBACK_KEY = 'lars_message_feedback';

const apiUrl = () => (window.location.hostname === 'localhost' ? 'http://localhost:8001/api' : '/api');

function loadRatings(): Record<string, Rating> {
  try {
    return JSON.parse(localStorage.getItem(FEEDBACK_KEY) || '{}');
  } catch {
    return {};
  }
}

/** AI 답변 아래의 복사, 음성으로 읽기, 좋아요/싫어요 버튼. */
export const MessageActions: React.FC<{ text: string; messageId: string; language?: string; onOpenCanvas?: () => void; onRegenerate?: () => void }> = ({ text, messageId, language = 'ko', onOpenCanvas, onRegenerate }) => {
  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [rating, setRating] = useState<Rating>(() => loadRatings()[messageId] ?? null);
  const [slackState, setSlackState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');

  const sendToSlack = async () => {
    setSlackState('sending');
    try {
      const apiBase = window.location.hostname === 'localhost' ? 'http://localhost:8001/api' : '/api';
      const response = await fetch(`${apiBase}/connectors/slack/send`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }),
      });
      setSlackState(response.ok ? 'sent' : 'failed');
    } catch {
      setSlackState('failed');
    }
    setTimeout(() => setSlackState('idle'), 2500);
  };

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement('textarea');
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      area.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const speak = () => {
    if (!('speechSynthesis' in window)) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const plain = text.replace(/[*_`#>]/g, '').replace(/\s+/g, ' ').trim();
    const utterance = new SpeechSynthesisUtterance(plain);
    utterance.lang = language === 'ko' ? 'ko-KR' : 'en-US';
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  };

  const rate = (next: 'like' | 'dislike') => {
    const value: Rating = rating === next ? null : next;
    setRating(value);
    try {
      const all = loadRatings();
      if (value) all[messageId] = value; else delete all[messageId];
      localStorage.setItem(FEEDBACK_KEY, JSON.stringify(all));
    } catch {
      /* 저장소를 쓸 수 없어도 화면 상태는 유지한다 */
    }
    if (value) {
      // 평가 데이터로 쓰도록 백엔드에도 남긴다 (실패해도 화면은 그대로 둔다)
      fetch(`${apiUrl()}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message_id: messageId, rating: value, text: text.slice(0, 4000) }),
      }).catch(() => undefined);
    }
  };

  const btn: React.CSSProperties = { background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center' };

  return (
    <div className="message-actions" style={{ display: 'flex', gap: '4px', marginTop: '10px' }}>
      <button style={btn} title={copied ? '복사됨' : '복사'} onClick={copy}>
        {copied ? <Check size={16} /> : <Copy size={16} />}
      </button>
      <button style={{ ...btn, color: speaking ? '#7aa2ff' : btn.color }} title={speaking ? '읽기 중지' : '음성으로 읽기'} onClick={speak}>
        {speaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
      </button>
      <button style={{ ...btn, color: slackState === 'sent' ? '#4ade80' : slackState === 'failed' ? '#ff6b9d' : btn.color }}
        title={slackState === 'sent' ? 'Slack으로 보냈습니다' : slackState === 'failed' ? 'Slack 전송 실패 (커넥터 설정 확인)' : 'Slack으로 보내기'}
        onClick={sendToSlack} disabled={slackState === 'sending'}>
        {slackState === 'sent' ? <Check size={16} /> : <Send size={16} />}
      </button>
      {onRegenerate && (
        <button style={btn} title={language === 'ko' ? '다시 생성' : 'Regenerate'} onClick={onRegenerate}>
          <RotateCcw size={16} />
        </button>
      )}
      {onOpenCanvas && (
        <button style={btn} title={language === 'ko' ? '캔버스로 열기' : 'Open in canvas'} onClick={onOpenCanvas}>
          <PanelRight size={16} />
        </button>
      )}
      <button style={{ ...btn, color: rating === 'like' ? '#4ade80' : btn.color }} title="좋아요" onClick={() => rate('like')}>
        <ThumbsUp size={16} />
      </button>
      <button style={{ ...btn, color: rating === 'dislike' ? '#ff6b9d' : btn.color }} title="싫어요" onClick={() => rate('dislike')}>
        <ThumbsDown size={16} />
      </button>
    </div>
  );
};

export default MessageActions;
