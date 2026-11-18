import React, { useState, useMemo } from 'react';
import { Mic, Plus, Search, PlayCircle, StopCircle, Volume2, AlertCircle, Radio, Check, Clock, MessageCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import { GlassmorphicIcon } from './components/GlassmorphicIcon';
import { FeatureHeader } from './components/feature/FeatureUI';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';

export const VoiceDesignDashboard = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);

  const [commands, setCommands] = useState<any[]>([
    { id: 1, text: '타이틀 크기를 20px로 증가', action: '크기 증가', status: 'executed', created: '2024-01-15 14:30' },
    { id: 2, text: '주요색을 파란색으로 변경', action: '색상 변경', status: 'executed', created: '2024-01-15 14:15' },
    { id: 3, text: '모바일 뷰로 최적화', action: '반응형 조정', status: 'executed', created: '2024-01-15 14:00' },
    { id: 4, text: '다크 모드 활성화', action: '테마 변경', status: 'pending', created: '2024-01-15 13:45' }
  ]);

  const startRecording = async () => {
    setIsRecording(true);
    // 실제 음성 인식은 Web Speech API 사용
    setTimeout(() => {
      setIsRecording(false);
    }, 2000);
  };

  const stopRecording = async () => {
    setIsRecording(false);
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/advanced-design/voice/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          command: '샘플 명령어',
          project_name: 'Current Project'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setCommands([{
          id: Date.now(),
          text: data.command,
          action: data.action,
          status: 'executed',
          created: new Date().toLocaleString('ko-KR')
        }, ...commands]);
      }
    } catch (error) {
      console.error('음성 명령 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCommands = useMemo(() => {
    return commands.filter(c =>
      c.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.action.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [commands, searchTerm]);

  const examples = [
    '타이틀 더 크게 해줘',
    '색상을 따뜻하게 변경',
    '모바일에서도 잘 보이게',
    '배경 투명하게',
    '간격을 조정해줘',
    '폰트를 바꿔줘'
  ];

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%', background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}>
      {/* 좌측 사이드바 */}
      <div style={{ width: '280px', borderRight: '1px solid rgba(100,150,255,0.2)', overflow: 'auto', padding: '20px', background: 'rgba(0,0,0,0.3)' }}>
        <h3 style={{ fontSize: '13px', color: 'rgba(224,224,224,0.5)', textTransform: 'uppercase', fontWeight: '600', marginBottom: '20px' }}>필터</h3>

        {/* 검색 */}
        <div style={{ marginBottom: '20px', position: 'relative' }}>
          <input
            type="text"
            placeholder="명령어 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', background: 'rgba(100,150,255,0.1)', border: '1px solid rgba(100,150,255,0.2)', borderRadius: '8px', color: '#e0e0e0', fontSize: '13px' }}
          />
          <Search size={14} style={{ position: 'absolute', right: '12px', top: '12px', color: 'rgba(224,224,224,0.4)' }} />
        </div>

        {/* 음성 인식 팁 */}
        <div style={{ background: 'rgba(100,150,255,0.1)', border: '1px solid rgba(100,150,255,0.2)', borderRadius: '8px', padding: '12px', marginBottom: '20px' }}>
          <h4 style={{ fontSize: '11px', color: 'rgba(224,224,224,0.7)', fontWeight: '600', marginBottom: '8px' }}>💡 팁</h4>
          <ul style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.6', marginLeft: '12px', listStyleType: 'disc' }}>
            <li>명확하게 발음해주세요</li>
            <li>한국어 또는 영어 모두 가능</li>
            <li>3초 이상 침묵하면 자동 종료</li>
          </ul>
        </div>

        {/* 통계 */}
        <div style={{ borderTop: '1px solid rgba(100,150,255,0.2)', paddingTop: '16px' }}>
          <h4 style={{ fontSize: '11px', color: 'rgba(224,224,224,0.5)', marginBottom: '12px', fontWeight: '600' }}>통계</h4>
          <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '2' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Mic size={14} />총: <span style={{ color: '#4ade80', fontWeight: '600' }}>{commands.length}</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle2 size={14} color="#4ade80" />실행: <span style={{ color: '#4ade80', fontWeight: '600' }}>{commands.filter(c => c.status === 'executed').length}</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><AlertTriangle size={14} color="#fcd34d" />대기: <span style={{ color: '#fcd34d', fontWeight: '600' }}>{commands.filter(c => c.status === 'pending').length}</span></div>
          </div>
        </div>
      </div>

      {/* 우측 콘텐츠 */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* 헤더 */}
        <div style={{ padding: '24px', borderBottom: '1px solid rgba(100,150,255,0.2)', background: 'rgba(0,0,0,0.2)' }}>
          <FeatureHeader
            icon={<GlassmorphicIcon Icon={Mic} gradient="from-red-400 to-pink-500" size={40} />}
            title="음성 명령 디자인"
            subtitle="음성으로 디자인 명령을 내립니다"
          />
          <div style={{ height: '24px' }} />

          {/* 음성 인식 버튼 */}
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={loading}
            style={{
              padding: '18px 36px',
              background: isRecording
                ? 'linear-gradient(135deg, #ff6b9d 0%, #ff4d7d 100%)'
                : 'linear-gradient(135deg, #646cff 0%, #4c47ff 100%)',
              color: '#fff',
              border: isRecording ? '2px solid #ff3d7d' : '2px solid rgba(255,255,255,0.3)',
              borderRadius: '14px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              transition: 'all 0.3s',
              boxShadow: isRecording ? '0 0 30px rgba(255, 107, 157, 0.5)' : '0 8px 24px rgba(100,108,255,0.3)',
              position: 'relative'
            }}
          >
            {isRecording && (
              <div style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                borderRadius: '14px',
                border: '2px solid #ff3d7d',
                animation: 'pulse 1.5s infinite',
                pointerEvents: 'none'
              }} />
            )}
            {isRecording ? (
              <>
                <Radio size={20} />
                <span>녹음 중...</span>
              </>
            ) : (
              <>
                <Mic size={20} />
                <span>음성 시작</span>
              </>
            )}
          </button>

          {/* 예제 명령어 */}
          <div style={{ marginTop: '24px' }}>
            <p style={{ fontSize: '13px', color: 'rgba(224,224,224,0.6)', marginBottom: '12px', fontWeight: '600' }}>예제 명령어:</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px' }}>
              {examples.map((example, idx) => (
                <button
                  key={idx}
                  style={{
                    padding: '10px 12px',
                    background: 'rgba(100,150,255,0.15)',
                    border: '1px solid rgba(100,150,255,0.3)',
                    borderRadius: '6px',
                    color: '#cbd5e1',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  🎙️ {example}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 명령 기록 */}
        <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#fff', marginBottom: '16px' }}>명령 기록</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredCommands.length > 0 ? filteredCommands.map((command, idx) => (
              <div key={command.id} style={{
                background: 'linear-gradient(135deg, rgba(100,150,255,0.15) 0%, rgba(100,150,255,0.05) 100%)',
                border: '1px solid rgba(100,150,255,0.3)',
                borderRadius: '14px',
                padding: '16px',
                transition: 'all 0.3s',
                display: 'flex',
                gap: '14px',
                alignItems: 'flex-start'
              }}>
                {/* 상태 아이콘 */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '40px',
                  height: '40px',
                  background: command.status === 'executed' ? 'rgba(74, 222, 128, 0.2)' : 'rgba(252, 211, 77, 0.2)',
                  borderRadius: '10px',
                  color: command.status === 'executed' ? '#4ade80' : '#fcd34d',
                  flexShrink: 0
                }}>
                  {command.status === 'executed' ? <Check size={20} /> : <Clock size={20} />}
                </div>

                {/* 내용 */}
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#fff', marginBottom: '6px' }}>"{command.text}"</h3>
                  <div style={{ fontSize: '12px', color: 'rgba(224,224,224,0.6)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MessageCircle size={14} />
                    {command.action}
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(224,224,224,0.4)' }}>
                    🕐 {command.created}
                  </div>
                </div>
              </div>
            )) : (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(224,224,224,0.4)', fontSize: '14px' }}>
                아직 음성 명령이 없습니다
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
