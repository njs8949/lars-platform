import React, { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { Terminal as TerminalIcon, Send } from 'lucide-react';

function Terminal() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState<string[]>(['LARS Prism Integrated Terminal v1.4.0', '시스템 에이전트와 통신할 준비가 되었습니다.']);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newOutput = [...output, `\n> ${input}`];
    setOutput(newOutput);
    const currentCmd = input;
    setInput('');

    try {
      const result = await invoke<string>('execute_terminal_command', { command: currentCmd });
      setOutput(prev => [...prev, result]);
    } catch (err) {
      setOutput(prev => [...prev, `[ERROR] ${err}`]);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [output]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="terminal-view animate-in" onClick={() => inputRef.current?.focus()}>
      <header className="view-header" style={{background: 'rgba(0,0,0,0.4)', borderBottom: '1px solid #333'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '0.8rem'}}>
          <TerminalIcon size={24} color="var(--accent-blue)" />
          <h2>시스템 통합 터미널</h2>
        </div>
        <p className="view-desc" style={{fontSize: '0.9rem'}}>에이전트 환경에서 직접 명령어를 실행하고 결과를 분석합니다.</p>
      </header>
      
      <div className="terminal-output" ref={scrollRef}>
        {output.map((line, i) => (
          <pre key={i} className="terminal-line">{line}</pre>
        ))}
      </div>

      <form className="terminal-input-area" onSubmit={handleCommand}>
        <span className="terminal-prompt">›</span>
        <input 
          ref={inputRef}
          type="text" 
          value={input} 
          onChange={(e) => setInput(e.target.value)}
          placeholder="명령어를 입력하세요..."
          autoComplete="off"
        />
        <button type="submit" style={{background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer'}}>
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}

export default Terminal;
