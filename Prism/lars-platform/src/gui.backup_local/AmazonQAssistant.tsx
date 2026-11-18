import React, { useState } from 'react';
import { Sparkles, Send, X, Bot, ShieldCheck } from 'lucide-react';
import { invoke } from '@tauri-apps/api/tauri';

interface AmazonQAssistantProps {
  onClose: () => void;
}

export default function AmazonQAssistant({ onClose }: AmazonQAssistantProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([
    { role: 'assistant', content: '안녕하세요! Amazon Q입니다. 클라우드 아키텍처나 비즈니스 인사이트에 대해 무엇이든 물어보세요.' }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setInput('');
    setIsLoading(true);

    try {
      // Tauri 명령으로 실제 Amazon Q 쿼리 실행
      const response = await invoke<string>('amazon_q_query', { question: userMsg });
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response
      }]);
    } catch (error) {
      console.error('Amazon Q 오류:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `[오류] ${error instanceof Error ? error.message : '알 수 없는 오류 발생'}`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="amazon-q-container animate-in">
      <header className="view-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '0.8rem'}}>
          <div style={{background: 'linear-gradient(135deg, #ff9900, #ff5500)', padding: '0.6rem', borderRadius: '12px'}}>
            <Sparkles size={24} color="white" />
          </div>
          <div>
            <h2 style={{color: 'white', fontSize: '1.5rem'}}>Amazon Q Assistant</h2>
            <p className="view-desc">AI 기반 클라우드 지능 및 비즈니스 조수</p>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            padding: '0.5rem',
            borderRadius: '0.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="닫기"
        >
          <X size={20} />
        </button>
      </header>

      <div className="q-chat-viewport">
        {messages.map((msg, idx) => (
          <div key={idx} className={`q-msg-bubble ${msg.role}`}>
            <div className="q-msg-icon">
              {msg.role === 'assistant' ? <Bot size={16} /> : <div className="user-icon-small" />}
            </div>
            <div className="q-msg-content">{msg.content}</div>
          </div>
        ))}
        {isLoading && (
          <div className="q-msg-bubble assistant">
             <div className="q-msg-content">추론 중... <span className="loading-dots" /></div>
          </div>
        )}
      </div>

      <div className="q-input-area">
        <div className="q-input-wrapper">
          <input 
            type="text" 
            placeholder="클라우드 인프라에 대해 질문하세요..." 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button className="q-send-btn" onClick={handleSend}>
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
