import React, { useState, useEffect } from 'react';
import { ScrollText, Play, Square } from 'lucide-react';

function Logs() {
  const [logs, setLogs] = useState<{timestamp: string, level: string, message: string}[]>([]);
  const [isStreaming, setIsStreaming] = useState(true);

  useEffect(() => {
    if (!isStreaming) return;
    
    const interval = setInterval(() => {
      const levels = ['INFO', 'INFO', 'INFO', 'WARN', 'ERROR'];
      const messages = [
        'Synzora: 워크스페이스 인덱싱 완료',
        'Shieldora: PII 마스킹 처리됨',
        'Rekora: 검색 패턴 최적화 중...',
        'Brain: Gemini-Pro 엔진 전환 시도',
        'System: AppleScript 실행 권한 확인됨'
      ];
      const newLog = {
        timestamp: new Date().toLocaleTimeString(),
        level: levels[Math.floor(Math.random() * levels.length)],
        message: messages[Math.floor(Math.random() * messages.length)]
      };
      setLogs(prev => [newLog, ...prev].slice(0, 100));
    }, 1500);
    return () => clearInterval(interval);
  }, [isStreaming]);

  return (
    <div className="logs-view animate-in">
      <header className="view-header">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '0.8rem'}}>
            <ScrollText size={24} color="#f97316" />
            <h2>실시간 시스템 로그 (Live Stream)</h2>
          </div>
          <button 
            className={`mini-btn ${isStreaming ? 'btn-streaming-stop' : 'btn-streaming-start'}`}
            onClick={() => setIsStreaming(!isStreaming)}
          >
            {isStreaming ? <><Square size={14} fill="currentColor" /> 중지</> : <><Play size={14} fill="currentColor" /> 시작</>}
          </button>
        </div>
        <p className="view-desc">LARS 에이전트의 내부 추론 및 시스템 처리 과정을 실시간으로 모니터링합니다.</p>
      </header>
      
      <div className="log-monitor">
        {logs.map((log, i) => (
          <div key={i} className={`log-entry ${log.level.toLowerCase()}`}>
            <span className="log-ts">{log.timestamp}</span>
            <span className="log-lvl">{log.level}</span>
            <span className="log-msg">{log.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Logs;
