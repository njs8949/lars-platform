import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event';
import { open } from '@tauri-apps/api/dialog';
import Files from './Files';
import Security from './Security';
import SecurityHub from './SecurityHub';
import Terminal from './Terminal';
import Logs from './Logs';
import Artifacts from './Artifacts';
import AmazonQAssistant from './AmazonQAssistant';
import Ecosystem from './Ecosystem';
import Settings from './Settings';
import { Auth } from './components/Auth';
import { GlassmorphicIcon } from './components/GlassmorphicIcon';
import GenerationResult from './components/GenerationResult';
import VoiceVisualizer from './components/VoiceVisualizer';
import { getToken, clearToken, getCurrentUser, User as AuthUser, logout } from './lib/auth';
import { autoDetectGenerationType, generateContentStream, parseStreamChunks } from './lib/generation';
import { textToSpeech } from './lib/tts';
import { startSpeechRecognition, stopSpeechRecognition, isRecording } from './lib/stt';
import { testElevenLabsAPI, listAvailableVoices } from './lib/tts-test';
import {
  FolderPlus,
  ShieldCheck,
  Terminal as TerminalIcon,
  ScrollText,
  Box,
  MessageSquare,
  Search,
  Plus,
  Play,
  CornerDownLeft,
  LayoutGrid,
  ChevronDown,
  X,
  Zap,
  Brain,
  Sparkles,
  Shield,
  Search as SearchIcon,
  Globe,
  Users,
  FolderOpen,
  LogOut,
  Mic,
  Volume2
} from 'lucide-react';
import './App.css';
import './components/GenerationResult.css';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatItem {
  id: string;
  title: string;
  date: string;
  input?: string;
  response?: string;
  messages?: ChatMessage[];
}

interface AttachedFile {
  name: string;
  path: string;
}

interface TokenInfo {
  input: number;
  output: number;
  total: number;
}

const CodeAgentRenderer = ({ content, onApplyPatch, onAppControl, tokens }: { content: string, onApplyPatch: (patchContent: string) => void, onAppControl: (script: string) => void, tokens?: { input: number; output: number; total: number } }) => {
  // JSON 형식 파싱 시도 (토큰 정보 포함 여부 확인)
  let displayContent = content;
  let tokenInfo: TokenInfo | null = tokens || null;
  let usedModel = '';

  // 메타데이터 라인 제거
  displayContent = content
    .split('\n')
    .filter(line => !line.startsWith('[TOKEN_UPDATE:') && !line.startsWith('[TOKENS_FINAL:'))
    .join('\n');

  try {
    const parsed = JSON.parse(content);
    if (parsed.content && parsed.tokens) {
      displayContent = parsed.content;
      tokenInfo = parsed.tokens;
      usedModel = parsed.model || '';
    }
  } catch (e) {
    // JSON이 아니면 그냥 원본 content 사용
    displayContent = displayContent;
  }

  const hasPatch = displayContent.includes("<<<< SEARCH");
  const hasAppControl = displayContent.includes("<<<< APP_CONTROL");

  let appScript = "";
  if (hasAppControl) {
    const match = displayContent.match(/<<<< APP_CONTROL\s*?\n?([\s\S]*?)\n?>>>>/);
    if (match) appScript = match[1].trim();
  }

  // 사용자에게 불필요한 내부 정보 필터링
  const filteredContent = displayContent
    .split('\n')
    .filter(line => !line.match(/^\[MCP Server\]|\^\[Router\]|\^\[AWS\]|\^\[검색 제공자\]|\^\[포트 번호\]/))
    .join('\n')
    .trim();

  return (
    <div className="agent-response-container">
      <div className="response-text">{filteredContent}</div>
      {hasPatch && (
        <div className="patch-action-box">
          <div className="patch-info">
            <span className="patch-icon">🔬</span>
            <span>LARS Rekora가 수술적 패치를 생성했습니다.</span>
          </div>
          <button className="apply-patch-btn" onClick={() => onApplyPatch(displayContent)}>변경 사항 적용</button>
        </div>
      )}
      {hasAppControl && (
        <div className="patch-action-box" style={{borderColor: '#a855f7', background: 'rgba(168, 85, 247, 0.1)'}}>
          <div className="patch-info">
            <span className="patch-icon">🍎</span>
            <span>LARS Omni-Control이 앱 제어 명령을 준비했습니다.</span>
          </div>
          <button className="apply-patch-btn" style={{background: '#a855f7'}} onClick={() => onAppControl(appScript)}>명령 실행 (Execute)</button>
        </div>
      )}
    </div>
  );
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'settings' | 'ecosystem'>('chat');
  const [generationType, setGenerationType] = useState<string | null>(null);
  const [generationMetadata, setGenerationMetadata] = useState<any | null>(null);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [input, setInput] = useState('');
  const [response, setResponse] = useState('');
  const [status, setStatus] = useState('IDLE');
  const [user, setUser] = useState({ name: 'Jongsoo', email: '(import.meta.env.VITE_CONTACT_EMAIL ?? "")' });
  const [language] = useState<'ko' | 'en'>('ko');
  const [generationMode, setGenerationMode] = useState<'orchestrated' | 'harmonized'>('harmonized');
  const [showHarmonizedConfirm, setShowHarmonizedConfirm] = useState(false);
  const [harmonizedData, setHarmonizedData] = useState<any>(null);
  const [voiceMode, setVoiceMode] = useState<'off' | 'input' | 'output'>('off');

  // Greeting 멘트
  const getGreeting = () => {
    const hour = new Date().getHours();
    const userName = authUser?.username || user.name;

    if (language === 'ko') {
      if (hour < 12) {
        return {
          title: `좋은 아침입니다, ${userName}님!`,
          subtitle: 'LARS Prism과 함께 하루를 시작하세요.',
          hint: '문서, 코드, 이미지... 무엇이든 만들어드립니다!',
        };
      } else if (hour < 18) {
        return {
          title: `안녕하세요, ${userName}님!`,
          subtitle: 'LARS Prism이 함께합니다.',
          hint: '생산성을 높이는 모든 것을 한곳에서',
        };
      } else {
        return {
          title: `좋은 저녁입니다, ${userName}님!`,
          subtitle: 'LARS Prism과 함께 저녁을 보내세요.',
          hint: '창의적인 아이디어를 현실로 만드세요',
        };
      }
    } else {
      if (hour < 12) {
        return {
          title: `Good morning, ${userName}!`,
          subtitle: 'Start your day with LARS Prism.',
          hint: 'Documents, code, images... create anything!',
        };
      } else if (hour < 18) {
        return {
          title: `Hello, ${userName}!`,
          subtitle: 'LARS Prism is here for you.',
          hint: 'Boost your productivity in one place',
        };
      } else {
        return {
          title: `Good evening, ${userName}!`,
          subtitle: 'Spend your evening with LARS Prism.',
          hint: 'Turn your creative ideas into reality',
        };
      }
    }
  };

  // --- 실시간 토큰 업데이트 ---
  const [currentTokens, setCurrentTokens] = useState({ input: 0, output: 0, total: 0 });

  // --- Enhanced 5-Tier Engine State ---
  const [activeModel, setActiveModel] = useState('LARS-Native');
  const [activeModelName, setActiveModelName] = useState('Fast & Creative');
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [dropdownTab, setDropdownTab] = useState<'core' | 'extended'>('core');

  const [chatHistory, setChatHistory] = useState<ChatItem[]>([]);
  const [currentChat, setCurrentChat] = useState<ChatItem | null>(null);
  const [hoveredChatId, setHoveredChatId] = useState<string | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [projectPath, setProjectPath] = useState<string>('');
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showQuickMenu, setShowQuickMenu] = useState<'none' | 'files' | 'security' | 'terminal' | 'logs' | 'artifacts' | 'amazon-q'>('none');

  const updateModelStates = (persona: string) => {
    const modelMapping: {[key: string]: string} = {
      'LARS-Native': 'Fast & Creative',
      'LARS-Cosmos': 'Deep Context',
      'LARS-Prime': 'Secure Logic',
      'LARS-Insight': 'Research & Fact',
      'LARS-Realtime': 'Live Trends',
      'GPT-4o': 'OpenAI',
      'Claude-3.5': 'Anthropic',
      'Gemini-Pro': 'Google',
      'Moonshot-Kimi': 'Moonshot AI'
    };
    setActiveModel(persona);
    setActiveModelName(modelMapping[persona] || persona);
  };

  const handleModelChange = async (persona: string) => {
    updateModelStates(persona);
    setShowModelMenu(false);
    try {
      if (window.__TAURI_IPC__) {
        const currentConfig = await invoke<any>('load_config');
        await invoke('save_config', { config: { ...currentConfig, modelType: persona } });
      }
    } catch (err) { console.error('Model change error:', err); }
  };

  // 인증 상태 확인
  React.useEffect(() => {
    const checkAuthStatus = async () => {
      const token = getToken();
      if (token) {
        try {
          const user = await getCurrentUser(token);
          setAuthUser(user);
          setIsAuthenticated(true);
          setUser({ name: user.username, email: user.email });
        } catch (err) {
          console.error('Failed to fetch user:', err);
          clearToken();
          setIsAuthenticated(false);
        }
      }
    };
    checkAuthStatus();
  }, []);

  const handleLogout = async () => {
    try {
      const token = getToken();
      if (token) {
        await logout(token);
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      clearToken();
      setIsAuthenticated(false);
      setAuthUser(null);
    }
  };

  // Tauri 이벤트 리스너 설정
  React.useEffect(() => {
    const setupListeners = async () => {
      // Tauri가 없으면 스킵 (웹 개발 서버)
      if (!window.__TAURI_IPC__) {
        console.log('[LISTENER] Tauri not available, skipping');
        return;
      }

      const { listen } = await import('@tauri-apps/api/event');
      console.log('[LISTENER] Starting listener setup...');

      try {
        await listen<[number, number]>('token-update', (event) => {
          const [input, output] = event.payload;
          setCurrentTokens({ input, output, total: input + output });
        });
      } catch (e) {
        console.warn('[LISTENER] token-update listener failed:', e);
      }

      try {
        await listen<[number, number, number]>('tokens-final', (event) => {
          const [input, output, total] = event.payload;
          setCurrentTokens({ input, output, total });
        });
      } catch (e) {
        console.warn('[LISTENER] tokens-final listener failed:', e);
      }

      try {
        await listen<string>('streaming-content', (event) => {
          console.log('[EVENT] streaming-content received:', event.payload.substring(0, 50));
          setResponse(prev => {
            console.log('[STATE] updating response with:', event.payload.substring(0, 30));
            return prev + event.payload;
          });
        });
      } catch (e) {
        console.warn('[LISTENER] streaming-content listener failed:', e);
      }

      console.log('[LISTENER] All listeners registered successfully');
    };

    setupListeners().catch(err => console.error('리스너 설정 실패:', err));
  }, []);

  const [executionMode, setExecutionMode] = useState<'query' | 'dev' | 'sub-agent'>('query');

  const handleSelectProjectPath = async () => {
    const selected = await open({ directory: true, multiple: false, title: '프로젝트 폴더 선택' });
    if (selected && typeof selected === 'string') setProjectPath(selected);
  };

  const handleCommand = async () => {
    if (!input.trim() && attachedFiles.length === 0) return;
    setStatus('ANALYZING');
    setResponse('');
    setCurrentTokens({ input: 0, output: 0, total: 0 });

    try {
      const userMessage = input.trim();
      const fileContext = attachedFiles.map(f => `@${f.path}`).join(' ');
      const fullPrompt = `${fileContext} ${userMessage}`.trim();

      // 1단계: 생성 타입 자동 감지
      let generationType_detected = 'chat';
      try {
        const classification = await autoDetectGenerationType(userMessage, [], language);
        generationType_detected = classification.generation_type;
        setGenerationType(generationType_detected);
        console.log(`[GENERATION] Type detected: ${generationType_detected} (confidence: ${classification.confidence})`);
      } catch (err) {
        console.log('[GENERATION] Auto-detection failed, using chat mode');
      }

      // 1.5단계: Harmonized 모드 확인
      if (generationMode === 'harmonized' && generationType_detected !== 'chat') {
        console.log('[HARMONIZED] Showing confirmation dialog...');
        setHarmonizedData({
          type: generationType_detected,
          prompt: userMessage,
          confidence: 0.85,
        });
        setShowHarmonizedConfirm(true);
        setStatus('IDLE');
        return;
      }

      // 2단계: 콘텐츠 생성 (스트리밍)
      let fullContent = '';
      let metadata: any = null;

      try {
        // 스트리밍 생성
        for await (const chunk of generateContentStream(userMessage, [], language)) {
          if (chunk.startsWith('[META]') && chunk.includes('[/META]')) {
            const metaJson = chunk.slice(6, chunk.indexOf('[/META]'));
            metadata = JSON.parse(metaJson);
            setGenerationMetadata(metadata);
          } else {
            fullContent += chunk;
            setResponse(fullContent);
          }
        }

        console.log(`[GENERATION] Content generated (type: ${generationType_detected})`);
      } catch (err) {
        console.error('[GENERATION] Streaming failed:', err);
        // Fallback: 기존 LARS 명령 실행
        try {
          if (executionMode === 'query') {
            fullContent = await invoke<string>('execute_lars_command', { command: fullPrompt, engine: activeModel });
          } else if (executionMode === 'sub-agent') {
            fullContent = await invoke<string>('execute_sub_agent', { goal: fullPrompt, agents: 'researcher,developer,reviewer' });
          } else {
            fullContent = await invoke<string>('execute_dev_command', { prompt: fullPrompt, engine: activeModel, autoApprove: true, projectPath });
          }
          setResponse(fullContent);
        } catch (invokeErr) {
          console.log('[DEV] Tauri not available in web mode');
          fullContent = '이 기능은 데스크톱 앱에서만 사용 가능합니다.';
          setResponse(fullContent);
        }
      }

      // 3단계: 채팅 히스토리에 저장
      const newChat: ChatItem = {
        id: Date.now().toString(),
        title: userMessage.substring(0, 50) || '대화',
        date: new Date().toLocaleDateString('ko-KR'),
        input: userMessage,
        response: fullContent,
        messages: [
          { role: 'user', content: userMessage },
          { role: 'assistant', content: fullContent }
        ]
      };
      const newHistory = [newChat, ...chatHistory];
      setChatHistory(newHistory);
      localStorage.setItem('lars_chat_history', JSON.stringify(newHistory));

      setInput('');
      setStatus('SUCCESS');

      // 음성 출력 모드에서는 응답을 음성으로 재생
      if (voiceMode === 'output' && generationType_detected !== 'code' && generationType_detected !== 'image') {
        console.log('[VOICE] Starting TTS for response...');
        // 약간의 딜레이 후 TTS 시작 (응답 표시 후)
        setTimeout(() => {
          textToSpeech(fullContent);
        }, 500);
      }
    } catch (error) {
      console.error('[ERROR] Command failed:', error);
      setResponse(`Error: ${error}`);
      setStatus('ERROR');
    }
  };

  const handleApplyPatch = async (patchContent: string) => {
    try {
      const resultLines = await invoke<string[]>('apply_patch', { responseText: patchContent });
      alert(resultLines.join('\n'));
    } catch (err) { alert(`오류: ${err}`); }
  };

  const handleAppControl = async (script: string) => {
    try {
      const res = await invoke<string>('execute_terminal_command', { 
        command: `osascript -e "${script.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"` 
      });
      alert(`실행 결과:\n${res || '명령이 완료되었습니다.'}`);
    } catch (err) { alert(`제어 실패: ${err}`); }
  };

  useEffect(() => {
    const unlisteners: Promise<() => void>[] = [];

    const setupListeners = async () => {
      try {
        unlisteners.push(await listen('menu-settings', () => setActiveTab('settings')));
      } catch (e) {
        console.warn('menu-settings listener not available');
      }

      try {
        unlisteners.push(await listen('menu-about', () => setShowAboutModal(true)));
      } catch (e) {
        console.warn('menu-about listener not available');
      }

      try {
        unlisteners.push(await listen('menu-toggle-sidebar', () => setSidebarCollapsed(prev => !prev)));
      } catch (e) {
        console.warn('menu-toggle-sidebar listener not available');
      }

      try {
        unlisteners.push(await listen('menu-show-logs', () => setShowQuickMenu('logs')));
      } catch (e) {
        console.warn('menu-show-logs listener not available');
      }

      try {
        unlisteners.push(await listen('menu-show-terminal', () => setShowQuickMenu('terminal')));
      } catch (e) {
        console.warn('menu-show-terminal listener not available');
      }
    };

    setupListeners();

    return () => {
      unlisteners.forEach(f => f.then(unlistener => unlistener()));
    };
  }, []);

  const attachFile = (file: AttachedFile) => {
    if (!attachedFiles.find(f => f.path === file.path)) { setAttachedFiles([...attachedFiles, file]); }
    setShowQuickMenu('none');
  };

  const handleClearHistory = () => {
    if (confirm('정말 모든 대화 기록을 삭제하시겠습니까?')) {
      setChatHistory([]);
      localStorage.removeItem('lars_chat_history');
    }
  };

  const handleNewChat = () => {
    setCurrentChat(null);
    setInput('');
    setResponse('');
    setAttachedFiles([]);
    setStatus('IDLE');
  };

  const handleDeleteChat = (chatId: string) => {
    const newHistory = chatHistory.filter(chat => chat.id !== chatId);
    setChatHistory(newHistory);
    localStorage.setItem('lars_chat_history', JSON.stringify(newHistory));
    if (currentChat?.id === chatId) {
      handleNewChat();
    }
  };

  const handleSelectChat = (chat: ChatItem) => {
    console.log('대화 선택:', chat);
    setCurrentChat(chat);
    setActiveTab('chat');

    // input 복원 (우선: input 필드 → fallback: messages)
    if (chat.input) {
      console.log('input 필드에서 복원:', chat.input);
      setInput(chat.input);
    } else if (chat.messages && chat.messages.length > 0) {
      console.log('messages에서 복원');
      const lastUserMessage = chat.messages.filter(m => m.role === 'user').pop();
      if (lastUserMessage) {
        console.log('user message:', lastUserMessage.content);
        setInput(lastUserMessage.content);
      }
    } else {
      console.log('input 데이터 없음');
    }

    // response 복원 (우선: response 필드 → fallback: messages)
    if (chat.response) {
      console.log('response 필드에서 복원:', chat.response.substring(0, 50));
      setResponse(chat.response);
    } else if (chat.messages && chat.messages.length > 0) {
      console.log('messages에서 response 복원');
      const lastAssistantMessage = chat.messages.filter(m => m.role === 'assistant').pop();
      if (lastAssistantMessage) {
        console.log('assistant message:', lastAssistantMessage.content.substring(0, 50));
        setResponse(lastAssistantMessage.content);
      }
    } else {
      console.log('response 데이터 없음');
    }
  };

  // ESC 키로 음성 모드 종료
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && voiceMode !== 'off') {
        setVoiceMode('off');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [voiceMode]);

  // 음성 입력 모드 관리
  useEffect(() => {
    if (voiceMode === 'input') {
      console.log('[VOICE] Starting speech recognition...');
      startSpeechRecognition({
        onRecordingStart: () => {
          console.log('[VOICE] Recording started');
        },
        onRecordingStop: () => {
          console.log('[VOICE] Recording stopped');
        },
        onTranscription: (text: string) => {
          console.log('[VOICE] Transcribed text:', text);
          // 변환된 텍스트를 입력창에 자동 입력
          setInput(text);
          // 자동으로 전송
          setStatus('ANALYZING');
          setTimeout(() => {
            // 조금의 딜레이 후 입력 필드 업데이트
            setInput(text);
          }, 100);
        },
        onError: (error: Error) => {
          console.error('[VOICE] STT Error:', error);
          setResponse(`음성 인식 오류: ${error.message}`);
        },
      });
    } else {
      // 음성 입력 모드 종료 시 녹음 중지
      stopSpeechRecognition();
    }
  }, [voiceMode]);

  // 디버그: 콘솔에서 테스트 함수 실행 가능하도록 설정
  useEffect(() => {
    (window as any).__LARS_DEBUG__ = {
      testElevenLabs: testElevenLabsAPI,
      listVoices: listAvailableVoices,
    };
    console.log('🔧 Debug tools available: window.__LARS_DEBUG__');
    console.log('- testElevenLabs(): Test ElevenLabs API');
    console.log('- listVoices(): List available voices');
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const config = await invoke<any>('load_config');
        if (config?.userName) setUser({ name: config.userName, email: config.userEmail });
        if (config?.modelType) updateModelStates(config.modelType);

        // localStorage에서 대화 히스토리 로드
        const savedHistory = localStorage.getItem('lars_chat_history');
        if (savedHistory) {
          try {
            setChatHistory(JSON.parse(savedHistory));
          } catch (e) {
            console.error('히스토리 파싱 실패:', e);
            setChatHistory([]);
          }
        } else {
          setChatHistory([]);
        }
      } catch (e) {
        console.error('Init failed:', e);
      }
    };
    init();

    const unlisteners: Array<() => void> = [];

    const setupListeners = async () => {
      try {
        try {
          const unlistenSettings = await listen('menu-settings', () => setActiveTab('settings'));
          if (typeof unlistenSettings === 'function') {
            unlisteners.push(unlistenSettings);
          }
        } catch (e) {
          console.warn('menu-settings listener not available');
        }

        try {
          const unlistenAbout = await listen('menu-about', () => setShowAboutModal(true));
          if (typeof unlistenAbout === 'function') {
            unlisteners.push(unlistenAbout);
          }
        } catch (e) {
          console.warn('menu-about listener not available');
        }
      } catch (e) {
        console.warn('setupListeners error:', e);
      }
    };

    setupListeners().catch(e => console.warn('Listener setup failed:', e));

    return () => {
      unlisteners.forEach(f => {
        if (typeof f === 'function') {
          try {
            f();
          } catch (e) {
            console.warn('Unlisten error:', e);
          }
        }
      });
    };
  }, []);

  const renderContent = () => {
    if (activeTab === 'settings') return <Settings onClose={() => setActiveTab('chat')} />;
    if (activeTab === 'ecosystem') return <div className="ecosystem-standalone"><Ecosystem /></div>;
    return (
      <div className="chat-content-area animate-in">
        <header className="viewport-header">
          <div className="model-selector-wrapper">
            <div className={`model-badge ${showModelMenu ? 'active' : ''}`} onClick={() => setShowModelMenu(!showModelMenu)}>
              <div className="badge-content-left">
                <span className="persona-name">{activeModel}</span>
                <span className="model-sep">|</span>
                <span className="actual-model">{activeModelName}</span>
              </div>
              <ChevronDown size={16} className="dropdown-arrow-icon" />
            </div>
            {showModelMenu && (
              <div className="model-dropdown">
                <div className="dropdown-tabs">
                  <button className={dropdownTab === 'core' ? 'active' : ''} onClick={(e) => { e.stopPropagation(); setDropdownTab('core'); }}>LARS 핵심 엔진</button>
                  <button className={dropdownTab === 'extended' ? 'active' : ''} onClick={(e) => { e.stopPropagation(); setDropdownTab('extended'); }}>확장 모델</button>
                </div>
                <div className="dropdown-scroll-area">
                  {[
                    { id: 'LARS-Native', name: 'LARS-Native', model: 'Execution', desc: '수술적 코딩 & 고속 구현 (Local High-Speed)', tab: 'core' },
                    { id: 'LARS-Cosmos', name: 'LARS-Cosmos', model: 'Architecture', desc: '글로벌 분석 & 지능형 연구 (Deep Context)', tab: 'core' },
                    { id: 'LARS-Prime', name: 'LARS-Prime', model: 'Logic', desc: '무결점 추론 & 보안 감사 (SOTA Intelligence)', tab: 'core' },
                    { id: 'GPT-4o', name: 'GPT-4o', model: 'OpenAI', desc: '범용 고성능 논리 모델', tab: 'extended' },
                    { id: 'Claude-3.5', name: 'Claude 3.5', model: 'Anthropic', desc: '지시 이행 & 정밀 추론', tab: 'extended' },
                    { id: 'Gemini-Pro', name: 'Gemini Pro', model: 'Google', desc: '긴 컨텍스트 & 멀티모달', tab: 'extended' },
                    { id: 'Local-Gemma', name: 'Local Gemma', model: 'Offline', desc: '보안을 위한 로컬 실행', tab: 'extended' }
                  ].filter(item => item.tab === dropdownTab).map(item => (
                    <button key={item.id} className={`model-option ${activeModel === item.id ? 'selected' : ''}`} onClick={() => handleModelChange(item.id)}>
                      <div className="option-name">{item.name} <span className="option-model-tag">{item.model}</span></div>
                      <div className="option-desc">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </header>

        <section className="chat-viewport">
          {chatHistory.length > 0 ? (
            <div className="chat-messages">
              {chatHistory.map((chat) => (
                <div key={chat.id} className="message-group">
                  <div className="message-bubble user">
                    <div className="message-content">{chat.input}</div>
                  </div>
                  <div className="message-bubble ai">
                    <div className="bubble-header">LARS Prism AI</div>
                    {generationType && generationType !== 'chat' && generationMetadata && chat.response === response ? (
                      <GenerationResult
                        content={chat.response}
                        generationType={generationType}
                        format={generationMetadata.primary_format || 'txt'}
                        metadata={generationMetadata}
                        language={language}
                      />
                    ) : (
                      <CodeAgentRenderer content={chat.response} onApplyPatch={handleApplyPatch} onAppControl={handleAppControl} tokens={currentTokens} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="welcome-screen">
              <h2>{getGreeting().title}</h2>
            </div>
          )}
        </section>

        {showQuickMenu !== 'none' && (
          <div className="quick-menu-overlay" onClick={() => setShowQuickMenu('none')}>
            <div className="quick-menu-wrapper" onClick={e => e.stopPropagation()}>
              <div className="quick-menu-content">
                {showQuickMenu === 'files' && <Files onSelectFile={(name, path) => attachFile({ name, path })} />}
                {showQuickMenu === 'security' && <SecurityHub onClose={() => setShowQuickMenu('none')} />}
                {showQuickMenu === 'artifacts' && <Artifacts onClose={() => setShowQuickMenu('none')} />}
                {showQuickMenu === 'amazon-q' && <AmazonQAssistant onClose={() => setShowQuickMenu('none')} />}
              </div>
            </div>
          </div>
        )}

        {voiceMode !== 'off' && (
          <VoiceVisualizer
            mode={voiceMode as 'input' | 'output'}
            isActive={voiceMode !== 'off'}
            onClose={() => setVoiceMode('off')}
          />
        )}

        {showHarmonizedConfirm && harmonizedData && (
          <div className="harmonized-modal-overlay" onClick={() => setShowHarmonizedConfirm(false)}>
            <div className="harmonized-modal" onClick={e => e.stopPropagation()}>
              <div className="harmonized-header">
                <h3>생성 준비 완료</h3>
                <button className="modal-close" onClick={() => setShowHarmonizedConfirm(false)}>✕</button>
              </div>
              <div className="harmonized-content">
                <div className="generation-type-display">
                  <span className="type-badge">{harmonizedData.type.toUpperCase()}</span>
                  <p className="confidence-text">신뢰도: {(harmonizedData.confidence * 100).toFixed(0)}%</p>
                </div>
                <div className="generation-preview">
                  <p className="preview-label">요청 내용</p>
                  <p className="preview-text">{harmonizedData.prompt}</p>
                </div>
              </div>
              <div className="harmonized-actions">
                <button className="action-btn cancel" onClick={() => setShowHarmonizedConfirm(false)}>취소</button>
                <button
                  className="action-btn proceed"
                  onClick={async () => {
                    setShowHarmonizedConfirm(false);
                    // 실제 생성 로직 실행
                    setStatus('ANALYZING');
                    setResponse('');
                    try {
                      let fullContent = '';
                      for await (const chunk of generateContentStream(harmonizedData.prompt, [], language)) {
                        if (chunk.startsWith('[META]') && chunk.includes('[/META]')) {
                          const metaJson = chunk.slice(6, chunk.indexOf('[/META]'));
                          const metadata = JSON.parse(metaJson);
                          setGenerationMetadata(metadata);
                        } else {
                          fullContent += chunk;
                          setResponse(fullContent);
                        }
                      }
                      const newChat: ChatItem = {
                        id: Date.now().toString(),
                        title: harmonizedData.prompt.substring(0, 50) || '대화',
                        date: new Date().toLocaleDateString('ko-KR'),
                        input: harmonizedData.prompt,
                        response: fullContent,
                        messages: [
                          { role: 'user', content: harmonizedData.prompt },
                          { role: 'assistant', content: fullContent }
                        ]
                      };
                      const newHistory = [newChat, ...chatHistory];
                      setChatHistory(newHistory);
                      localStorage.setItem('lars_chat_history', JSON.stringify(newHistory));
                      setInput('');
                      setStatus('SUCCESS');
                    } catch (err) {
                      console.error('[HARMONIZED] Generation failed:', err);
                      setResponse(`Error: ${err}`);
                      setStatus('ERROR');
                    }
                  }}
                >
                  진행
                </button>
              </div>
            </div>
          </div>
        )}

        <footer className="input-area">
          {attachedFiles.length > 0 && (
            <div className="attached-files-container">
              {attachedFiles.map(file => (
                <div key={file.path} className="file-chip">
                  <span className="chip-icon">📄</span>
                  <span className="chip-name">{file.name}</span>
                  <button className="chip-remove" onClick={() => setAttachedFiles(attachedFiles.filter(f => f.path !== file.path))}>×</button>
                </div>
              ))}
            </div>
          )}
          <div className="input-container">
            <div className="input-left">
              <div className="add-menu-wrapper">
                <button className={`add-btn ${showAddMenu ? 'active' : ''}`} onClick={() => setShowAddMenu(!showAddMenu)} title="기능 추가">
                  <Plus size={24} />
                </button>
              {showAddMenu && (
                <div className="add-menu-dropdown">
                  <button className="menu-item" onClick={() => { setExecutionMode('query'); setShowAddMenu(false); }}>
                    <GlassmorphicIcon Icon={Search} gradient="from-blue-400 to-cyan-500" size={32} />
                    <span className="item-text">쿼리</span>
                  </button>
                  <button className="menu-item" onClick={() => { setExecutionMode('dev'); setShowAddMenu(false); }}>
                    <GlassmorphicIcon Icon={Brain} gradient="from-green-400 to-emerald-500" size={32} />
                    <span className="item-text">개발</span>
                  </button>
                  <button className="menu-item" onClick={() => { setExecutionMode('sub-agent'); setShowAddMenu(false); }}>
                    <GlassmorphicIcon Icon={Users} gradient="from-violet-400 to-purple-500" size={32} />
                    <span className="item-text">서브 에이전트</span>
                  </button>
                  <div className="menu-divider" style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '8px 0' }} />
                  <button className="menu-item" onClick={() => { setShowQuickMenu('files'); setShowAddMenu(false); }}>
                    <GlassmorphicIcon Icon={FolderPlus} gradient="from-blue-400 to-indigo-500" size={32} />
                    <span className="item-text">파일 추가 (Context)</span>
                  </button>
                  <button className="menu-item" onClick={() => { setShowQuickMenu('security'); setShowAddMenu(false); }}>
                    <GlassmorphicIcon Icon={ShieldCheck} gradient="from-emerald-400 to-teal-500" size={32} />
                    <span className="item-text">보안 · 터미널 · 로그</span>
                  </button>
                  <button className="menu-item" onClick={() => { setShowQuickMenu('amazon-q'); setShowAddMenu(false); }}>
                    <GlassmorphicIcon Icon={Sparkles} gradient="from-amber-400 to-orange-500" size={32} />
                    <span className="item-text">Amazon Q (지능형 조수)</span>
                  </button>
                  <button className="menu-item" onClick={() => { setActiveTab('ecosystem'); setShowAddMenu(false); }}>
                    <GlassmorphicIcon Icon={LayoutGrid} gradient="from-indigo-400 to-cyan-500" size={32} />
                    <span className="item-text">LARS 에코시스템</span>
                  </button>
                  <button className="menu-item" onClick={() => { setShowQuickMenu('artifacts'); setShowAddMenu(false); }}>
                    <GlassmorphicIcon Icon={Box} gradient="from-purple-400 to-fuchsia-500" size={32} />
                    <span className="item-text">생성물 보관함 (Artifacts)</span>
                  </button>
                </div>
              )}
            </div>
            {executionMode === 'dev' && (
              <div className="project-path-row">
                <FolderOpen size={14} />
                <span className="path-text">
                  {projectPath || '프로젝트 폴더 (선택 사항)'}
                </span>
                <button className="path-select-btn" onClick={handleSelectProjectPath}>폴더 선택</button>
                {projectPath && (
                  <button className="path-clear-btn" onClick={() => setProjectPath('')}>✕</button>
                )}
              </div>
            )}
              <button
                className="generation-mode-toggle"
                onClick={() => setGenerationMode(generationMode === 'orchestrated' ? 'harmonized' : 'orchestrated')}
                title="모드 전환"
              >
                <div className={`toggle-slider ${generationMode}`}>
                  <div className="toggle-label orchestrated">
                    <Zap size={14} />
                  </div>
                  <div className="toggle-label harmonized">
                    <Brain size={14} />
                  </div>
                </div>
                <span className="toggle-text">
                  {generationMode === 'orchestrated' ? '자동 조율' : '협력 조화'}
                </span>
              </button>
            </div>

            <textarea
              placeholder={`${executionMode === 'query' ? '쿼리를 입력하세요' : executionMode === 'sub-agent' ? '에이전트에게 목표를 입력하세요' : '개발 루프 모드'} (Shift+Enter로 줄바꿈)`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCommand(); } }}
            />

            <div className="input-right">
              <button
                className={`voice-btn ${voiceMode}`}
                onClick={() => {
                  if (voiceMode === 'off') setVoiceMode('input');
                  else if (voiceMode === 'input') setVoiceMode('output');
                  else setVoiceMode('off');
                }}
                title={voiceMode === 'off' ? '음성 입력 활성화' : voiceMode === 'input' ? '음성 출력으로 전환' : '음성 비활성화'}
              >
                {voiceMode === 'off' && <Mic size={18} />}
                {voiceMode === 'input' && <Mic size={18} />}
                {voiceMode === 'output' && <Volume2 size={18} />}
              </button>
              <button className="send-btn" onClick={handleCommand} disabled={status === 'ANALYZING'}>
                {status === 'ANALYZING' ? <div className="spinner-small" /> : <CornerDownLeft size={24} />}
              </button>
            </div>
          </div>
        </footer>
      </div>
    );
  };

  // 인증되지 않으면 로그인/회원가입 페이지 표시
  if (!isAuthenticated) {
    return (
      <Auth
        onSuccess={() => {
          const token = getToken();
          if (token) {
            getCurrentUser(token)
              .then((user) => {
                setAuthUser(user);
                setUser({ name: user.username, email: user.email });
                setIsAuthenticated(true);
              })
              .catch((err) => {
                console.error('Failed to load user:', err);
              });
          }
        }}
      />
    );
  }

  return (
    <div className={`app-container ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <img src="/app-logo.png" className="logo-img" alt="Logo" />
            {!sidebarCollapsed && <span className="logo-text">LARS Prism</span>}
          </div>
          <button className="sidebar-toggle-btn" onClick={() => setSidebarCollapsed(!sidebarCollapsed)} title={sidebarCollapsed ? "펼치기" : "접기"}>
             {sidebarCollapsed ? '»' : '«'}
          </button>
        </div>
        <div className="sidebar-nav">
          <button className={`nav-item ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => { setActiveTab('chat'); handleNewChat(); }}>
            <MessageSquare size={20} /> {!sidebarCollapsed && <span>채팅</span>}
          </button>
          <button className={`nav-item ${activeTab === 'ecosystem' ? 'active' : ''}`} onClick={() => setActiveTab('ecosystem')}>
            <LayoutGrid size={20} /> {!sidebarCollapsed && <span>에코시스템</span>}
          </button>
        </div>
        <div className="sidebar-history">
          {!sidebarCollapsed && (
            <div className="history-label-row">
              <div className="history-label">RECENT CHATS</div>
              {chatHistory && chatHistory.length > 0 && (
                <button className="clear-history-btn" onClick={handleClearHistory} title="대화 기록 삭제">
                  <X size={16} />
                </button>
              )}
            </div>
          )}
          <div className="history-list">
            {chatHistory?.map(chat => (
              <div
                key={chat.id}
                className="history-item-wrapper"
                onMouseEnter={() => setHoveredChatId(chat.id)}
                onMouseLeave={() => setHoveredChatId(null)}
              >
                <button
                  className={`history-item ${currentChat?.id === chat.id ? 'active' : ''}`}
                  onClick={() => handleSelectChat(chat)}
                >
                  <MessageSquare size={18} />
                  {!sidebarCollapsed && <div className="history-info"><div className="history-title">{chat.title}</div></div>}
                </button>
                {!sidebarCollapsed && hoveredChatId === chat.id && (
                  <button
                    className="delete-chat-btn"
                    onClick={(e) => { e.stopPropagation(); handleDeleteChat(chat.id); }}
                    title="삭제"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="sidebar-footer">
           <div className="profile-summary" onClick={() => setActiveTab('settings')}>
             <div className="avatar-small">{user?.name ? user.name[0] : 'U'}</div>
             {!sidebarCollapsed && <div className="profile-info"><div className="profile-name">{user?.name}</div><div className="profile-email">{user?.email}</div></div>}
           </div>
           <button
             className="logout-btn"
             onClick={handleLogout}
             title="로그아웃"
           >
             <LogOut size={20} />
             {!sidebarCollapsed && <span>로그아웃</span>}
           </button>
        </div>
      </aside>
      <main className="main-content">
        {renderContent()}
      </main>

      {showAboutModal && (
        <div className="about-modal-backdrop" onClick={() => setShowAboutModal(false)}>
          <div className="about-modal" onClick={(e) => e.stopPropagation()}>
            <button className="about-close-btn" onClick={() => setShowAboutModal(false)}><X size={18} /></button>
            <img className="about-app-icon" src={`/app-logo.png?v=${Date.now()}`} alt="LARS Prism" />
            <h2 className="about-app-title">LARS Prism</h2>
            <p className="about-app-version">Version 1.4.0</p>
            <p className="about-app-copy">© 2026 LARS Inc. All rights reserved.</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
