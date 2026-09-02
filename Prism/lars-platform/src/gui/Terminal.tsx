import React, { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { Terminal as TerminalIcon, Send } from 'lucide-react';

function Terminal() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState<string[]>([
    'LARS Prism Integrated Terminal v1.4.0',
    '시스템 에이전트와 통신할 준비가 되었습니다.',
    '',
    '📋 사용 가능한 명령어:',
    '  • ollama llama2 <질문>   - 로컬 AI 모델 (예: ollama llama2 hello)',
    '  • ollama mistral <질문>  - 로컬 Mistral 모델',
    '  • cat <파일경로>          - 파일 읽기 (예: cat package.json)',
    '  • write <경로> <내용>     - 파일 쓰기 (예: write test.txt hello)',
    '  • ls                     - 파일 목록 보기',
    '  • pwd                    - 현재 디렉토리 경로',
    '  • 기타 shell 명령어       - 일반 터미널 명령어 실행',
    ''
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newOutput = [...output, `\n> ${input}`];
    setOutput(newOutput);
    const currentCmd = input.trim();
    setInput('');

    try {
      // 특별 명령어 처리
      if (currentCmd.startsWith('claude ')) {
        // Claude 에이전트는 외부 API가 필요함
        const args = currentCmd.substring(7).trim();
        const errorMsg = `[❌ 에러] Claude 에이전트는 API 키 설정이 필요합니다.\n\n대신 로컬 모델을 사용하세요:\n• ollama llama2 ${args}\n• ollama mistral ${args}\n\n또는 Ecosystem에서 Claude API 키를 설정하세요.`;
        setOutput(prev => [...prev, errorMsg]);
      } else if (currentCmd.startsWith('cat ')) {
        // 파일 읽기
        const filepath = currentCmd.substring(4).trim();
        const result = await invoke<string>('execute_terminal_command', { command: `cat "${filepath}"` });
        setOutput(prev => [...prev, result]);
      } else if (currentCmd.startsWith('write ')) {
        // 파일 쓰기: write <filepath> <content>
        const parts = currentCmd.substring(6).split(' ');
        if (parts.length >= 2) {
          const filepath = parts[0];
          const content = currentCmd.substring(6 + filepath.length + 1).trim();
          const result = await invoke<string>('execute_terminal_command', { command: `echo "${content}" > "${filepath}"` });
          setOutput(prev => [...prev, `✅ 파일 저장 완료: ${filepath}`, result]);
        } else {
          setOutput(prev => [...prev, `[ERROR] 사용법: write <filepath> <content>`]);
        }
      } else if (currentCmd.startsWith('ls') || currentCmd.startsWith('pwd') || currentCmd.startsWith('echo ')) {
        // 기본 shell 명령어
        const result = await invoke<string>('execute_terminal_command', { command: currentCmd });
        setOutput(prev => [...prev, result]);
      } else {
        // 그 외의 명령어
        const result = await invoke<string>('execute_terminal_command', { command: currentCmd });
        setOutput(prev => [...prev, result]);
      }
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
