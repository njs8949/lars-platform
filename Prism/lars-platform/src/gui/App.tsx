import React, { useState, useEffect, useCallback, useRef } from 'react';
import PptxGenJS from 'pptxgenjs';
// import { initializeDatadogRUM, trackCustomEvent } from './rum-init';

// Tauri imports - conditional for web/desktop
const isTauri = typeof window !== 'undefined' && '__TAURI_IPC__' in window;
let invoke: any = async () => null;
let listen: any = async () => null;
let open: any = async () => null;
let confirm_dialog: any = async () => false;

if (isTauri) {
  try {
    const tauri = await import('@tauri-apps/api/tauri');
    const event = await import('@tauri-apps/api/event');
    const dialog = await import('@tauri-apps/api/dialog');
    invoke = tauri.invoke;
    listen = event.listen;
    open = dialog.open;
    confirm_dialog = dialog.ask;
  } catch (e) {
    console.warn('Tauri not available, running in web mode');
  }
}
import Files from './Files';
import Security from './Security';
import SecurityHub from './SecurityHub';
import Terminal from './Terminal';
import Logs from './Logs';
import Artifacts from './Artifacts';
import AmazonQAssistant from './AmazonQAssistant';
import Ecosystem from './Ecosystem';
import Settings from './Settings';
import Statistics from './Statistics';
import WorkspaceMode from './components/WorkspaceMode';
import WorkspaceResult from './components/WorkspaceResult';
import SourceCitations from './components/SourceCitations';
import { Auth } from './components/Auth';
import { GlassmorphicIcon } from './components/GlassmorphicIcon';
import GenerationResult from './components/GenerationResult';
import VoiceVisualizer from './components/VoiceVisualizer';
import DocumentGenerator from './components/DocumentGenerator';
import PresentationGenerator from './components/PresentationGenerator';
import CodeAnalyzer from './components/CodeAnalyzer';
import ImageGenerator from './components/ImageGenerator';
import RekoraImageGenerator from './components/RekoraImageGenerator';
import ImageGenerationProgress from './components/ImageGenerationProgress';
import ToolGenerationProgress from './components/ToolGenerationProgress';
import WarehouseScreen from './components/WarehouseScreen';
import PresentationSvgIcon from './components/icons/PresentationSvgIcon';
import ArtifactFileIcon from './components/icons/ArtifactFileIcon';
import RoutedAssistantPanel from './components/RoutedAssistantPanel';
import { FeatureHeader } from './components/feature/FeatureUI';
import { MessageActions } from './components/MessageActions';
import { ProjectsScreen, type Project } from './components/ProjectsScreen';
import { listProjectsApi, createProjectApi, patchProjectApi, deleteProjectApi, uploadProjectFileApi, deleteProjectFileApi } from './lib/projects';
import { DevResultCard } from './components/DevResultCard';
import { ForgePanel } from './components/ForgePanel';
import { PersonalizationModal, type PersonalizeTab } from './components/PersonalizationModal';
import { ConnectorsModal } from './components/ConnectorsModal';
import { SchedulesScreen } from './components/SchedulesScreen';
import { AgentsScreen } from './components/AgentsScreen';
import { BrowserTasksScreen } from './components/BrowserTasksScreen';
import { MarkdownMessage } from './components/MarkdownMessage';
import { useFeatureFlag } from './lib/featureFlags';
import { CanvasPanel } from './components/CanvasPanel';
import { CloudDeployScreen } from './components/CloudDeployScreen';
import { getInstructions, memoryTexts } from './lib/personalization';
import { ROUTED_TAB_ENGINE, runRoutedAi, runExaoneStream, detectFeatureTab, featureLabel, detectScreenOpen, runDevAgent, type DevResult } from './lib/aiRouter';
import PresentationViewer from './components/PresentationViewer';
import ScrapingDashboard from './ScrapingDashboard';
import OCRPanel from './OCRPanel';
import ChangeDetectionMonitor from './ChangeDetectionMonitor';
import DeploymentDashboard from './DeploymentDashboard';
import OnboardingFlow from './components/OnboardingFlow';
import QuickStartDashboard from './components/QuickStartDashboard';
import SEOAnalyticsDashboard from './SEOAnalyticsDashboard';
import CRMDashboard from './CRMDashboard';
import AdvancedWorkflowExecutor from './AdvancedWorkflowExecutor';
import { WorkflowOptimizerPanel } from './components/WorkflowOptimizerPanel';
import PresentationThemeDashboard from './PresentationThemeDashboard';
import { streamAgent } from './lib/connectedAgent';
import IntegrationDashboard from './IntegrationDashboard';
import { PerformanceDashboard } from './PerformanceDashboard';
import { VersionControlDashboard } from './VersionControlDashboard';
import { VoiceDesignDashboard } from './VoiceDesignDashboard';
import { MultilingualDashboard } from './MultilingualDashboard';
import { CollaborationDashboard } from './CollaborationDashboard';
import { AutoLayoutDashboard } from './AutoLayoutDashboard';
import { XRPreviewDashboard } from './XRPreviewDashboard';
import { getToken, clearToken, getCurrentUser, User as AuthUser, logout, getStoredUser, setUser as setStoredUser } from './lib/auth';
import { PluginApprovalCard, PluginProposal, ConnectPromptCard, ConnectPrompt } from './components/PluginApprovalCard';
import { PluginsPanel } from './components/PluginsPanel';
import { Puzzle } from 'lucide-react';
import { autoDetectGenerationType, generateContentStream, parseStreamChunks } from './lib/generation';
import { textToSpeech } from './lib/tts';
import { startSpeechRecognition, stopSpeechRecognition, isRecording } from './lib/stt';
import { WebsiteThemePreview, PresentationThemePreview, DocumentThemePreview } from './components/ThemePreview';
import { ThemeLibrary } from './components/ThemeLibrary';
import { testElevenLabsAPI, listAvailableVoices } from './lib/tts-test';
import { AgentPoolVisualization } from './components/AgentPoolVisualization';
import { AgentPoolState, AgentPoolConfig, AgentTask } from '../types/agent';
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
  Volume2,
  GitBranch,
  ClipboardList,
  BarChart3,
  Palette,
  Download,
  Database,
  Activity,
  Send,
  Wrench,
  FileText,
  PresentationIcon,
  Globe as GlobeIcon,
  Eye,
  TrendingUp,
  Stethoscope,
  Mail,
  Grid,
  History,
  Layout,
  Wand2,
  Smartphone,
  Layers,
  Monitor,
  AlertCircle,
  AlertTriangle,
  Cloud,
  BookOpen,
  Settings as SettingsIcon,
  Info as InfoIcon,
  HelpCircle as HelpIcon,
  ChevronRight,
  PanelLeft,
  Trash2,
  Code2,
  Check as CheckIcon,
  Ghost,
  Bot,
  Pencil,
  MousePointerClick,
  Share2,
  CalendarClock
} from 'lucide-react';
import './App.css';
import './components/GenerationResult.css';

// 다국어 텍스트
const TEXTS = {
  ko: {
    chat: '채팅',
    ecosystem: '에코시스템',
    recentChats: '최근 대화',
    fastCreative: 'Fast & Creative',
    deepContext: 'Deep Context',
    secureLogic: 'Secure Logic',
    researchFact: 'Research & Fact',
    liveTrends: 'Live Trends',
    logOut: '로그아웃',
    inputPlaceholder: '메세지 보내기 (Shift+Enter로 줄바꿈)',
    query: '쿼리',
    dev: '개발',
    subAgent: '서브 에이전트',
    orchestrated: '자동 조율',
    harmonized: '협력 조화',
    themes: '디자인 테마',
    website: '웹사이트',
    presentation: '프레젠테이션',
    document: '문서',
  },
  en: {
    chat: 'Chat',
    ecosystem: 'Ecosystem',
    recentChats: 'Recent Chats',
    fastCreative: 'Fast & Creative',
    deepContext: 'Deep Context',
    secureLogic: 'Secure Logic',
    researchFact: 'Research & Fact',
    liveTrends: 'Live Trends',
    logOut: 'Logout',
    inputPlaceholder: 'Send message (Shift+Enter for new line)',
    query: 'Query',
    dev: 'Development',
    subAgent: 'Sub-Agent',
    orchestrated: 'Auto Orchestration',
    harmonized: 'Harmonized Collaboration',
    themes: 'Design Themes',
    website: 'Website',
    presentation: 'Presentation',
    document: 'Document',
  },
  ja: {
    chat: 'チャット',
    ecosystem: 'エコシステム',
    recentChats: '最近のチャット',
    fastCreative: 'Fast & Creative',
    deepContext: 'Deep Context',
    secureLogic: 'Secure Logic',
    researchFact: 'Research & Fact',
    liveTrends: 'Live Trends',
    logOut: 'ログアウト',
    inputPlaceholder: 'メッセージを送信 (Shift+Enterで改行)',
    query: 'クエリ',
    dev: '開発',
    subAgent: 'サブエージェント',
    orchestrated: '自動編成',
    harmonized: '調和協力',
    themes: 'デザインテーマ',
    website: 'ウェブサイト',
    presentation: 'プレゼンテーション',
    document: 'ドキュメント',
  },
  zh: {
    chat: '聊天',
    ecosystem: '生态系统',
    recentChats: '最近聊天',
    fastCreative: 'Fast & Creative',
    deepContext: 'Deep Context',
    secureLogic: 'Secure Logic',
    researchFact: 'Research & Fact',
    liveTrends: 'Live Trends',
    logOut: '注销',
    inputPlaceholder: '输入课程 (Shift+Enter换行)',
    query: '查询',
    dev: '开发',
    subAgent: '子代理',
    orchestrated: '自动编排',
    harmonized: '和谐协作',
    themes: '设计主题',
    website: '网站',
    presentation: '演示文稿',
    document: '文档',
  }
};

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: Array<{tool: string; parameters: any; result: any}>;
}

interface ChatItem {
  id: string;
  title: string;
  date: string;
  input?: string;
  response?: string;
  messages?: ChatMessage[];
  imageUrl?: string;
  projectId?: string;
  devResult?: DevResult;
  thinking?: string;
  feature?: { tab: string; label: string; engine: string; backend: string };
  sources?: { title: string; url: string }[];
  artifact?: { name: string; mime: string; base64: string };
}

/** 입력창 모드: 다음 질문을 이 기능으로 처리한다 (웹 검색, 심층 리서치 등). */
type ComposerTool = 'none' | 'web' | 'research' | 'image' | 'ppt' | 'doc' | 'scrape' | 'seo' | 'data';

const TOOL_LABELS: Record<ComposerTool, string> = {
  none: '', web: '웹 검색', research: '심층 리서치', image: '이미지 생성', ppt: '발표 자료', doc: '문서 작성',
  scrape: '웹 페이지 읽기', seo: 'SEO 진단', data: '데이터 분석',
};

const CHAT_API_BASE = () => (window.location.hostname === 'localhost' ? 'http://localhost:8001/api' : '/api');

async function uploadChatAttachment(file: File): Promise<{ id: string; name: string; kind: string; truncated: boolean }> {
  const form = new FormData();
  form.append('file', file);
  const response = await fetch(`${CHAT_API_BASE()}/chat/attachments`, { method: 'POST', body: form });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || '파일을 읽지 못했습니다.');
  return { id: data.id, name: data.name, kind: data.kind, truncated: data.truncated };
}

async function runChatTool(tool: string, message: string, attachmentIds: string[], history: { role: string; content: string }[]) {
  const response = await fetch(`${CHAT_API_BASE()}/chat/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tool, message, attachment_ids: attachmentIds, history }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || '실행에 실패했습니다.');
  return data as { reply: string; sources: { title: string; url: string }[]; artifact?: { name: string; mime: string; base64: string } };
}

function downloadBase64(name: string, mime: string, base64: string) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
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

type NavItem = { tab: string; label: string };
type NavGroup = { id: string; label: string; icon: React.ComponentType<{ size?: number }>; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    id: 'data-engine',
    label: '데이터 엔진',
    icon: Database,
    items: [
      { tab: 'scraping', label: '웹 스크래핑' },
      { tab: 'ocr', label: 'OCR' },
      { tab: 'change-detection', label: '변경 감지' },
      { tab: 'warehouse', label: '데이터 웨어하우스' },
    ],
  },
  {
    id: 'analysis',
    label: '분석 & 통합',
    icon: Activity,
    items: [
      { tab: 'seo', label: 'SEO 분석' },
      { tab: 'crm', label: 'CRM' },
      { tab: 'workflows', label: '워크플로우' },
    ],
  },
  {
    id: 'output',
    label: '출력 & 통합',
    icon: Send,
    items: [
      { tab: 'presentation', label: '테마' },
      { tab: 'integration', label: '통합 대시보드' },
    ],
  },
  {
    id: 'ai-design',
    label: 'AI 디자인',
    icon: Palette,
    items: [
      { tab: 'branding', label: '브랜딩 가이드' },
      { tab: 'color-font', label: '색상/폰트' },
      { tab: 'auto-layout', label: '자동 레이아웃' },
      { tab: 'collaboration', label: '협업 디자인' },
      { tab: 'xr-preview', label: 'AR/VR 미리보기' },
    ],
  },
  {
    id: 'platform',
    label: '플랫폼 도구',
    icon: Wrench,
    items: [
      { tab: 'cross-platform', label: '크로스플랫폼' },
      { tab: 'performance', label: '성능 최적화' },
      { tab: 'version-control', label: '버전 관리' },
      { tab: 'voice-design', label: '음성 명령' },
      { tab: 'multilingual', label: '다국어 최적화' },
    ],
  },
];

const CodeAgentRenderer = ({ content, onApplyPatch, onAppControl, tokens }: { content: string, onApplyPatch: (patchContent: string) => void, onAppControl: (script: string) => void, tokens?: { input: number; output: number; total: number } }) => {
  try {
    // 콘텐츠가 비어있으면 기본 메시지 반환
    if (!content || !content.trim()) {
      return (
        <div className="agent-response-container">
          <div className="response-text" style={{ color: 'rgba(224,224,224,0.6)', fontStyle: 'italic' }}>
            요청을 처리하고 있습니다...
          </div>
        </div>
      );
    }

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
        <div className="response-text">{filteredContent ? <MarkdownMessage text={filteredContent} /> : '응답을 생성하지 못했습니다.'}</div>
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
  } catch (error) {
    console.error('CodeAgentRenderer 에러:', error);
    return (
      <div className="agent-response-container">
        <div className="response-text" style={{ color: '#ff6b6b' }}>
          오류: 응답을 렌더링하는 중에 문제가 발생했습니다.
        </div>
      </div>
    );
  }
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  // 사이드바는 클로드·ChatGPT처럼 완전히 접힌다 (아이콘 막대 없음). true = 접힘.
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('sidebar_collapsed');
      if (saved !== null) return saved === '1';
    } catch { /* 저장소를 못 읽으면 기본값 사용 */ }
    return typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches;
  });
  useEffect(() => {
    try { localStorage.setItem('sidebar_collapsed', sidebarCollapsed ? '1' : '0'); } catch { /* 무시 */ }
  }, [sidebarCollapsed]);
  useEffect(() => {
    // Cmd+B (Mac) / Ctrl+B: 사이드바 토글 (클로드와 동일)
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setSidebarCollapsed((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [projectViewId, setProjectViewId] = useState<string | null>(null);
  const [autoSendPending, setAutoSendPending] = useState(false);
  // 채팅 모드: 일반 채팅 또는 개발 환경(작업 폴더의 코드를 읽고 수정 제안을 만든다)
  const [chatMode, setChatModeState] = useState<'chat' | 'dev'>(() => (localStorage.getItem('prism_chat_mode') === 'dev' ? 'dev' : 'chat'));
  const [devWorkspace, setDevWorkspace] = useState<string>(() => localStorage.getItem('prism_dev_workspace') || '');
  const setChatMode = (mode: 'chat' | 'dev') => {
    setChatModeState(mode);
    try { localStorage.setItem('prism_chat_mode', mode); } catch { /* 무시 */ }
  };
  const updateDevWorkspace = (path: string) => {
    setDevWorkspace(path);
    try { localStorage.setItem('prism_dev_workspace', path); } catch { /* 무시 */ }
  };
  const pickDevWorkspace = async () => {
    try {
      const dialog = await import('@tauri-apps/api/dialog');
      const selected = await dialog.open({ directory: true, multiple: false, title: '작업 폴더 선택' });
      if (typeof selected === 'string') updateDevWorkspace(selected);
    } catch {
      /* 데스크톱 밖(브라우저)에서는 경로를 직접 입력한다 */
    }
  };
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [modeMenuOpen, setModeMenuOpen] = useState(false);
  const [personalizeTab, setPersonalizeTab] = useState<PersonalizeTab | null>(null);
  // 임시 채팅: 켜져 있으면 대화를 기록에 저장하지 않는다
  const [temporaryChat, setTemporaryChat] = useState(false);
  // 심층 리서치 모드: 다음 질문을 출처 기반 보고서로 만든다
  const [researchMode, setResearchMode] = useState(false);
  const [connectorsOpen, setConnectorsOpen] = useState(false);
  // 음성 대화: 말하기 → 답변 읽기 → 다시 듣기를 반복한다
  const [voiceConversation, setVoiceConversation] = useState(false);
  // 사고 과정: 켜면 모델이 생각한 내용을 답변 위에 접어서 보여 준다
  // 캔버스: 답변을 옆 패널에서 편집
  const [canvas, setCanvas] = useState<{ title: string; content: string } | null>(null);
  const [regenPending, setRegenPending] = useState(false);
  // 질문 수정: 말풍선이 편집창으로 바뀐 상태 (null이면 평소 표시)
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);
  const [thinkingOn, setThinkingOn] = useState<boolean>(() => localStorage.getItem('prism_thinking') === '1');
  const toggleThinking = () => {
    setThinkingOn((v) => {
      const next = !v;
      try { localStorage.setItem('prism_thinking', next ? '1' : '0'); } catch { /* 무시 */ }
      return next;
    });
  };
  const voiceConversationRef = useRef(false);
  const speakThenListen = (text: string) => {
    if (!voiceConversationRef.current || !('speechSynthesis' in window)) return;
    const plain = text.replace(/[*_`#>\[\]]/g, '').replace(/\s+/g, ' ').trim();
    if (!plain) { setVoiceMode('input'); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(plain.slice(0, 1500));
    utterance.lang = 'ko-KR';
    const resume = () => {
      if (!voiceConversationRef.current) return;
      // 같은 모드로 바로 바꾸면 인식이 다시 시작되지 않으므로 잠깐 끈다
      setVoiceMode('off');
      setTimeout(() => { if (voiceConversationRef.current) setVoiceMode('input'); }, 300);
    };
    utterance.onend = resume;
    utterance.onerror = resume;
    window.speechSynthesis.speak(utterance);
  };
  const toggleVoiceConversation = () => {
    const next = !voiceConversation;
    voiceConversationRef.current = next;
    setVoiceConversation(next);
    if (next) {
      setVoiceMode('input');
    } else {
      setVoiceMode('off');
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    }
  };
  const [shareNotice, setShareNotice] = useState<string | null>(null);
  const exportCurrentChat = () => {
    if (!currentChat) return;
    const messages = currentChat.messages?.length
      ? currentChat.messages
      : [{ role: 'user', content: currentChat.input || '' }, { role: 'assistant', content: currentChat.response || '' }];
    const lines = [`# ${currentChat.title}`, '', `- 날짜: ${currentChat.date}`, '', '---', ''];
    messages.filter((m) => m.content).forEach((m) => {
      lines.push(m.role === 'user' ? '## 사용자' : '## LARS Prism AI', '', m.content, '');
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeTitle = currentChat.title.replace(/[\\/:*?"<>|]+/g, '_').slice(0, 40) || 'chat';
    a.href = url;
    a.download = `${safeTitle}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const shareCurrentChat = async () => {
    if (!currentChat) return;
    const messages = currentChat.messages?.length
      ? currentChat.messages
      : [{ role: 'user', content: currentChat.input || '' }, { role: 'assistant', content: currentChat.response || '' }];
    const apiBase = window.location.hostname === 'localhost' ? 'http://localhost:8001/api' : '/api';
    try {
      const response = await fetch(`${apiBase}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: currentChat.title, messages: messages.filter((m) => m.content) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || `HTTP ${response.status}`);
      const origin = apiBase.startsWith('http') ? apiBase.replace(/\/api$/, '') : window.location.origin;
      const url = `${origin}${data.path}`;
      try { await navigator.clipboard.writeText(url); } catch { /* 복사 불가 환경에서는 안내만 */ }
      setShareNotice(`공유 링크를 복사했습니다: ${url}`);
    } catch (err) {
      setShareNotice(`공유 실패: ${(err as Error).message}`);
    }
    setTimeout(() => setShareNotice(null), 6000);
  };
  const [pendingImage, setPendingImage] = useState<{ chatId: string; startedAt: number; prompt: string } | null>(null);
  const [pendingTool, setPendingTool] = useState<{ chatId: string; startedAt: number; tool: 'ppt' | 'research'; detail: string } | null>(null);
  const [isNarrow, setIsNarrow] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const onChange = (e: MediaQueryListEvent) => setIsNarrow(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  const [browserControlOn] = useFeatureFlag('browser_control');
  const [activeTab, setActiveTab] = useState<'chat' | 'warehouse' | 'plugins' | 'projects' | 'scheduled' | 'settings' | 'ecosystem' | 'statistics' | 'presentation' | 'scraping' | 'ocr' | 'change-detection' | 'seo' | 'crm' | 'workflows' | 'integration' | 'themes' | 'workspace' | 'history' | 'branding' | 'color-font' | 'cross-platform' | 'performance' | 'version-control' | 'voice-design' | 'multilingual' | 'collaboration' | 'auto-layout' | 'xr-preview' | 'deployment' | 'quick-start'>('chat');
  const [generationType, setGenerationType] = useState<string | null>(null);
  const [generationMetadata, setGenerationMetadata] = useState<any | null>(null);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const changeLanguage = (next: 'ko' | 'en' | 'ja' | 'zh') => {
    setLanguageState(next);
    try { localStorage.setItem('app_language', next); } catch { /* 저장 실패해도 화면은 바뀐다 */ }
    setLanguageMenuOpen(false);
    setProfileMenuOpen(false);
  };
  const [input, setInput] = useState('');

  // 다시 생성 / 질문 수정: 마지막 교환을 지우고 질문을 입력창에 되돌린 뒤 (다시 생성이면) 자동으로 보낸다
  useEffect(() => {
    if (regenPending && input.trim()) {
      setRegenPending(false);
      handleCommand();
    }
  }, [regenPending, input]);
  const lastUserText = (chat: ChatItem) => [...(chat.messages || [])].reverse().find((m) => m.role === 'user')?.content ?? chat.input ?? '';
  // 편집한 질문을 보낸다: 마지막 교환을 지우고, 편집한 글로 다시 보낸다 (재전송 흐름 재사용)
  const resendEditedQuestion = (text: string) => {
    if (!currentChat || !text.trim()) return;
    const trimmed = (currentChat.messages || []).slice(0, -2);
    setCurrentChat({ ...currentChat, messages: trimmed, response: '', imageUrl: undefined, devResult: undefined, thinking: undefined, feature: undefined });
    setEditingQuestion(null);
    setInput(text.trim());
    setRegenPending(true);
  };
  const reopenLastQuestion = (autoSend: boolean) => {
    if (!currentChat) return;
    const question = lastUserText(currentChat);
    if (!question) return;
    const trimmed = (currentChat.messages || []).slice(0, -2);
    setCurrentChat({ ...currentChat, messages: trimmed, response: '', imageUrl: undefined, devResult: undefined, thinking: undefined, feature: undefined });
    setInput(question);
    if (autoSend) setRegenPending(true);
  };
  const [response, setResponse] = useState('');
  const [pluginProposals, setPluginProposals] = useState<Array<{ key: string; chatId: string; proposal: PluginProposal }>>([]);
  const [connectPrompts, setConnectPrompts] = useState<Array<{ key: string; chatId: string; prompt: ConnectPrompt }>>([]);
  const [presentationSlides, setPresentationSlides] = useState<any[]>([]);
  const [status, setStatus] = useState('IDLE');
  const [user, setUser] = useState({
    name: 'Jongsoo Nam',
    email: 'lars@lars-technologies.com',
    avatarUrl: null as string | null
  });
  const [language, setLanguageState] = useState<'ko' | 'en' | 'ja' | 'zh'>(() => {
    // localStorage에서 언어 설정 확인, 없으면 시스템 언어 감지
    const saved = localStorage.getItem('app_language');
    if (saved === 'ko' || saved === 'en' || saved === 'ja' || saved === 'zh') {
      return saved;
    }

    // 시스템 언어에 따라 자동 감지
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith('ko')) return 'ko';
    if (browserLang.startsWith('ja')) return 'ja';
    if (browserLang.startsWith('zh')) return 'zh';
    return 'ko'; // 기본값 한국어
  });
  const [generationMode, setGenerationMode] = useState<'workspace' | 'chat'>('chat');
  const [showHarmonizedConfirm, setShowHarmonizedConfirm] = useState(false);
  const [harmonizedData, setHarmonizedData] = useState<any>(null);
  const [voiceMode, setVoiceMode] = useState<'off' | 'input' | 'output'>('off');
  const [modelType, setModelType] = useState<string>(() => localStorage.getItem('modelType') || 'LARS-Native');
  const [detectedAgents, setDetectedAgents] = useState<any>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [selectedThemeType, setSelectedThemeType] = useState<'website' | 'presentation' | 'document'>('website');
  const [selectedThemes, setSelectedThemes] = useState({
    website: 'minimal',
    presentation: 'corporate',
    document: 'professional'
  });
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [workspaceSteps, setWorkspaceSteps] = useState<any[]>([]);
  const [searchSources, setSearchSources] = useState<any[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('onboarding_completed'));
  const [deleteNotification, setDeleteNotification] = useState<{show: boolean, message: string}>({show: false, message: ''});

  // Prism 3계층 아키텍처 사용자 ID
  const [userId] = useState<string>(() => {
    const stored = localStorage.getItem('prism_user_id');
    if (stored) return stored;
    const generated = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('prism_user_id', generated);
    return generated;
  });

  // Greeting 멘트
  const getGreeting = () => {
    const hour = new Date().getHours();
    // authUser에서 사용자명을 가져옴 (로그인한 실제 사용자명)
    const userName = authUser?.username || 'LARS User';

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
  // 다른 대화로 옮기면 편집 중이던 질문은 닫는다
  useEffect(() => { setEditingQuestion(null); }, [currentChat?.id]);
  const [hoveredChatId, setHoveredChatId] = useState<string | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [projectPath, setProjectPath] = useState<string>('');
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [composerTool, setComposerTool] = useState<ComposerTool>('none');
  const [chatAttachments, setChatAttachments] = useState<{ id: string; name: string; kind: string; truncated: boolean }[]>([]);
  const [attachBusy, setAttachBusy] = useState(false);
  const [showQuickMenu, setShowQuickMenu] = useState<'none' | 'files' | 'security' | 'terminal' | 'logs' | 'artifacts' | 'amazon-q'>('none');

  const updateModelStates = (persona: string) => {
    const modelMapping: {[key: string]: string} = {
      'LARS-Native': 'Fast & Creative',
      'LARS-Cosmos': 'Deep Context',
      'LARS-Prime': 'Secure Logic',
      'Luminaic': 'Logic & Analysis',
      'Aivora': 'Emotional AI',
      'Rekora': '3D Design',
      'Synzora': 'Data Graph'
    };
    setActiveModel(persona);
    setActiveModelName(modelMapping[persona] || persona);
  };

  const getOllamaModelName = (modelId: string): string => {
    const modelMap: {[key: string]: string} = {
      'LARS-Native': 'lars-native',
      'LARS-Cosmos': 'lars-cosmos',
      'LARS-Prime': 'lars-prime',
      'Luminaic': 'lars-cosmos',
      'Aivora': 'lars-native',
      'Rekora': 'lars-rekora',
      'Synzora': 'lars-synzora',
      'K-EXAONE': 'k-exaone_v2.5'
    };
    return modelMap[modelId] || 'lars-native';
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

  // Initialize Datadog RUM on mount (optional monitoring)
  // React.useEffect(() => {
  //   initializeDatadogRUM();
  //   trackCustomEvent('app_initialized', {
  //     version: process.env.REACT_APP_VERSION || '1.0.0',
  //     environment: process.env.REACT_APP_ENV || 'production'
  //   });
  // }, []);

  // 인증 상태 확인
  React.useEffect(() => {
    const checkAuthStatus = async () => {
      const token = getToken();

      // 1. localStorage에 저장된 사용자 정보 먼저 확인
      const storedUser = getStoredUser();
      if (storedUser && token) {
        console.log('[AUTH] localStorage에서 사용자 정보 로드:', storedUser.username);
        setAuthUser(storedUser);
        setIsAuthenticated(true);
        setUser({
          name: storedUser.username,
          email: storedUser.email,
          avatarUrl: null
        });
        return;
      }

      // 2. 토큰이 있으면 서버에서 사용자 정보 확인
      try {
        if (token) {
          const user = await getCurrentUser(token);
          console.log('[AUTH] 서버에서 사용자 정보 로드:', user.username);
          setAuthUser(user);
          setStoredUser(user); // localStorage에 저장
          setIsAuthenticated(true);
          setUser({
            name: user.username,
            email: user.email,
            avatarUrl: null
          });
        } else {
          // 토큰이 없으면 로그인 화면 표시 (필수)
          setIsAuthenticated(false);
        }
      } catch (err) {
        console.error('[AUTH] 사용자 정보 로드 실패:', err);
        clearToken();
        setIsAuthenticated(false);
      }
    };
    checkAuthStatus();
  }, []);

  // 로그인하면 서버에 저장된 프로필(이름, 프로필 이미지)을 사이드바에 반영한다
  useEffect(() => {
    if (!authUser) return;
    const token = getToken();
    const fallback = { name: authUser.username, email: authUser.email, avatarUrl: '' };
    if (!token || token === 'dev-demo-token') {
      setUser((prev) => ({ ...prev, name: fallback.name, email: fallback.email }));
      return;
    }
    const base = window.location.hostname === 'localhost' ? 'http://localhost:8001/api' : '/api';
    fetch(`${base}/auth/profile`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const profile = data?.profile || {};
        setUser({ name: profile.displayName || fallback.name, email: fallback.email, avatarUrl: profile.avatarUrl || '' });
      })
      .catch(() => setUser(fallback));
  }, [authUser]);

  // 로그인하면 이 계정의 프로젝트를 서버에서 불러온다
  useEffect(() => {
    if (!authUser) return;
    const token = getToken();
    if (!token || token === 'dev-demo-token') {
      setProjects([]);
      return;
    }
    reloadProjects();
  }, [authUser]);

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

  const [executionMode, setExecutionMode] = useState<'query' | 'dev'>('query');
  const [useSubAgentMode, setUseSubAgentMode] = useState(false);
  const [agentPoolState, setAgentPoolState] = useState<AgentPoolState | null>(null);

  const handleSelectProjectPath = async () => {
    const selected = await open({ directory: true, multiple: false, title: '프로젝트 폴더 선택' });
    if (selected && typeof selected === 'string') setProjectPath(selected);
  };

  // 생성된 콘텐츠 자동 저장 (사용자가 위치 선택 가능)
  // 마크다운을 PPTX로 변환
  const markdownToPPTX = (markdown: string): Blob => {
    const pres = new PptxGenJS();
    pres.defineLayout({ name: 'LAYOUT1', width: 10, height: 7.5 });

    // 색상 팔레트
    const colors = [
      { rgb: '4267EA' },    // 보라파랑
      { rgb: 'F093FB' },    // 분홍
      { rgb: 'F5576C' },    // 빨강
      { rgb: '4FACFE' },    // 하늘
      { rgb: '00F2FE' },    // 청록
      { rgb: '43E97B' },    // 초록
      { rgb: '38F9D7' },    // 민트
      { rgb: 'FA709A' },    // 코랄
      { rgb: 'FEE140' },    // 노랑
    ];

    // 슬라이드 파싱
    const slides = markdown.split('---').map(s => s.trim()).filter(s => s);

    slides.forEach((slideText, idx) => {
      const lines = slideText.split('\n').map(l => l.trim()).filter(l => l);
      let title = '';
      let bullets: string[] = [];

      for (const line of lines) {
        if (line.startsWith('#')) {
          title = line.replace(/^#+\s*/, '');
        } else if (line.startsWith('-') || line.startsWith('•') || line.startsWith('*')) {
          bullets.push(line.replace(/^[-•*]\s+/, ''));
        } else if (title === '' && line) {
          title = line;
        } else if (line && title !== '') {
          bullets.push(line);
        }
      }

      const slide = pres.addSlide();
      const bgColor = colors[idx % colors.length];
      slide.background = bgColor;

      // 제목
      slide.addText(title, {
        x: 0.5,
        y: 0.8,
        w: 9,
        h: 1.2,
        fontSize: 48,
        bold: true,
        color: 'FFFFFF',
        align: 'left',
      });

      // 컨텐츠
      const bulletText = bullets.map((b, i) => ({
        text: b,
        options: { fontSize: 28, color: 'FFFFFF' },
      }));

      slide.addText(
        bulletText.length > 0
          ? bulletText
          : [{ text: '', options: { fontSize: 28, color: 'FFFFFF' } }],
        {
          x: 1,
          y: 2.3,
          w: 8,
          h: 4.5,
          fontSize: 28,
          color: 'FFFFFF',
          valign: 'top',
        }
      );
    });

    // Blob으로 변환
    return pres.write({ outputType: 'blob' }) as Blob;
  };

  // 마크다운을 슬라이드 배열로 파싱
  const parseMarkdownToSlides = (markdown: string): any[] => {
    const slides: any[] = [];
    const slideTexts = markdown.split('---').map(s => s.trim()).filter(s => s);

    slideTexts.forEach((slideText, idx) => {
      const lines = slideText.split('\n').map(l => l.trim()).filter(l => l);

      let title = '';
      let content = '';
      let bullets: string[] = [];
      let visual: string | undefined;

      for (const line of lines) {
        if (line.startsWith('# 슬라이드')) {
          // "# 슬라이드 1: 제목" 형식 파싱
          title = line.replace(/^#+\s*슬라이드\s*\d+:\s*/, '');
        } else if (line.startsWith('-')) {
          bullets.push(line.replace(/^-\s*/, ''));
        } else if (line.startsWith('[시각화:')) {
          visual = line.replace(/^\[시각화:\s*/, '').replace(/\]$/, '');
        } else if (!line.startsWith('*') && line) {
          if (!content) {
            content = line;
          }
        }
      }

      slides.push({
        order: idx + 1,
        title: title || `슬라이드 ${idx + 1}`,
        content: content,
        bullets: bullets.length > 0 ? bullets : [],
        visual: visual
      });
    });

    return slides;
  };

  // 마크다운 슬라이드를 HTML로 변환
  const markdownToHTMLSlides = (markdown: string): string => {
    const slides = markdown.split('---').map(s => s.trim()).filter(s => s);

    const slideHtmls = slides.map((slide, idx) => {
      const lines = slide.split('\n').map(l => l.trim()).filter(l => l);
      let title = '';
      let content = '';

      // 첫 줄이 제목 (# 또는 ## 형식)
      if (lines[0]?.startsWith('#')) {
        title = lines[0].replace(/^#+\s*/, '');
        content = lines.slice(1).join('');
      } else {
        content = lines.join('');
      }

      // 글릿 포인트 처리
      const bulletPoints = content.match(/^[-•]\s+.+$/gm) || [];
      const bulletHTML = bulletPoints.map(b => `<li>${b.replace(/^[-•]\s+/, '')}</li>`).join('');

      return `
        <div class="slide ${idx === 0 ? 'active' : ''}">
          ${title ? `<h1>${title}</h1>` : ''}
          ${bulletHTML ? `<ul>${bulletHTML}</ul>` : `<p>${content}</p>`}
        </div>
      `;
    }).join('');

    return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LARS 프레젠테이션</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #1a1a1a; }

    .slides-container { width: 100%; height: 100%; position: relative; }

    .slide {
      display: none;
      width: 100%;
      height: 100%;
      padding: 80px 100px;
      position: absolute;
      top: 0;
      left: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      flex-direction: column;
      justify-content: center;
      font-size: 28px;
      line-height: 1.6;
      overflow: auto;
    }

    .slide.active { display: flex; }

    .slide:nth-child(2n) { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
    .slide:nth-child(3n) { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
    .slide:nth-child(4n) { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }
    .slide:nth-child(5n) { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); }

    .slide h1 {
      font-size: 64px;
      margin-bottom: 60px;
      font-weight: bold;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
    }

    .slide ul {
      list-style: none;
      margin: 30px 0;
    }

    .slide li {
      margin: 25px 0;
      padding-left: 50px;
      position: relative;
      font-size: 32px;
    }

    .slide li:before {
      content: "▸";
      position: absolute;
      left: 0;
      font-size: 40px;
    }

    .slide p {
      font-size: 32px;
      line-height: 1.8;
    }

    .controls {
      position: fixed;
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 20px;
      z-index: 1000;
    }

    .btn {
      background: rgba(255,255,255,0.3);
      color: white;
      border: 2px solid white;
      padding: 12px 24px;
      font-size: 16px;
      cursor: pointer;
      border-radius: 8px;
      transition: all 0.3s;
      backdrop-filter: blur(10px);
    }

    .btn:hover {
      background: rgba(255,255,255,0.5);
      transform: scale(1.05);
    }

    .slide-counter {
      position: fixed;
      top: 30px;
      right: 30px;
      background: rgba(255,255,255,0.3);
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 18px;
      backdrop-filter: blur(10px);
      z-index: 1000;
    }
  </style>
</head>
<body>
  <div class="slides-container">
    ${slideHtmls}
  </div>

  <div class="slide-counter">
    <span id="current">1</span> / <span id="total">${slides.length}</span>
  </div>

  <div class="controls">
    <button class="btn" onclick="prevSlide()">← 이전</button>
    <button class="btn" onclick="nextSlide()">다음 →</button>
  </div>

  <script>
    let currentSlide = 0;
    const totalSlides = document.querySelectorAll('.slide').length;
    document.getElementById('total').textContent = totalSlides;

    function showSlide(n) {
      const slides = document.querySelectorAll('.slide');
      if (n >= slides.length) currentSlide = 0;
      if (n < 0) currentSlide = slides.length - 1;
      slides.forEach(s => s.classList.remove('active'));
      slides[currentSlide].classList.add('active');
      document.getElementById('current').textContent = currentSlide + 1;
    }

    function nextSlide() {
      currentSlide++;
      showSlide(currentSlide);
    }

    function prevSlide() {
      currentSlide--;
      showSlide(currentSlide);
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        nextSlide();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevSlide();
      }
    });

    showSlide(0);
  </script>
</body>
</html>`;
  };

  const saveGeneratedContent = async (content: string, type: string, userMessage: string) => {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      let fileName = '';
      let fileExtension = '';
      let finalContent = content;

      switch (type) {
        case 'document':
          fileName = `문서_${timestamp}`;
          fileExtension = '.md';
          break;
        case 'code':
          fileName = `코드_${timestamp}`;
          fileExtension = '.py'; // 기본값
          // 언어 감지
          if (userMessage.includes('javascript') || userMessage.includes('js')) fileExtension = '.js';
          else if (userMessage.includes('html')) fileExtension = '.html';
          else if (userMessage.includes('css')) fileExtension = '.css';
          else if (userMessage.includes('typescript') || userMessage.includes('ts')) fileExtension = '.ts';
          break;
        case 'presentation':
          // 프레젠테이션: HTML과 PPTX 둘 다 생성
          fileName = `프레젠테이션_${timestamp}`;

          // 사용자에게 포맷 선택 묻기
          const formatChoice = confirm(
            'PPTX 파일로 저장하시겠습니까?\n\n' +
            '[확인] PPTX (PowerPoint)\n' +
            '[취소] HTML (브라우저에서 보기)'
          );

          if (formatChoice) {
            // PPTX 생성 및 다운로드
            const pptxBlob = markdownToPPTX(content);
            const url = URL.createObjectURL(pptxBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${fileName}.pptx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            alert(`프레젠테이션이 다운로드되었습니다: ${fileName}.pptx`);
            return;  // 파일 저장 함수 종료
          } else {
            // HTML 생성
            fileExtension = '.html';
            finalContent = markdownToHTMLSlides(content);
          }
          break;
        case 'analysis':
          fileName = `분석_${timestamp}`;
          fileExtension = '.json';
          break;
        default:
          return;
      }

      const fullFileName = `${fileName}${fileExtension}`;

      // Tauri 파일 시스템 API로 저장
      if (isTauri) {
        try {
          // 사용자가 저장 위치 선택
          const selectedPath = await invoke<string | null>('save_file_dialog', {
            suggestedName: fullFileName
          });

          if (selectedPath) {
            // 선택된 위치에 파일 저장
            await invoke('save_file_to_location', {
              path: selectedPath,
              content: finalContent
            });
            console.log(`[SAVED] ${selectedPath}`);
            alert(`파일이 저장되었습니다:\n${selectedPath}`);
          } else {
            console.log('[INFO] 저장 위치 선택 취소됨');
          }
        } catch (e) {
          console.error('[ERROR] 파일 저장 실패:', e);
          // 폴백: 기본 위치에 저장
          try {
            const dirPath = `${process.env.HOME}/.lars/generated`;
            await invoke('create_file', {
              path: `${dirPath}/${fullFileName}`,
              content: finalContent
            });
            console.log(`[SAVED] ${fullFileName} (기본 위치)`);
          } catch (fallbackErr) {
            console.error('[ERROR] 기본 위치에도 저장 실패:', fallbackErr);
          }
        }
      }
    } catch (error) {
      console.error('[ERROR] 파일 저장 실패:', error);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;
    setInput(text);
    // 짧은 딜레이 후 handleCommand 실행
    setTimeout(() => {
      handleCommand();
    }, 100);
  };

  // 웹 검색 수행 헬퍼 함수
  const performWebSearch = async (query: string): Promise<{ text: string; sources: any[] }> => {
    try {
      console.log('[WEB-SEARCH] 검색 시작:', query);
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';

      const response = await fetch(`${apiUrl}/search/web?query=${encodeURIComponent(query)}&limit=5`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, limit: 5 })
      });

      if (!response.ok) {
        console.warn('[WEB-SEARCH] 검색 실패:', response.status);
        return { text: '', sources: [] };
      }

      const data = await response.json();

      if (data.results && data.results.length > 0) {
        // 검색 결과 필터링 - 관련성 낮은 결과 제거
        const keywordTokens = query.toLowerCase().split(' ').filter(t => t.length > 2);
        const filteredResults = data.results.filter((result: any) => {
          const title = (result.title || '').toLowerCase();
          const snippet = (result.snippet || '').toLowerCase();
          // 최소 2개 이상의 키워드가 제목이나 요약에 포함되어야 함
          const matchCount = keywordTokens.filter(k =>
            title.includes(k) || snippet.includes(k)
          ).length;
          return matchCount >= Math.max(1, Math.floor(keywordTokens.length / 2));
        });

        if (filteredResults.length > 0) {
          // 검색 결과를 프롬프트 형식으로 변환 (간결한 형식)
          const searchContext = filteredResults.map((result: any, idx: number) =>
            `${idx + 1}. ${result.title}\n   ${result.snippet}`
          ).join('\n\n');

          console.log('[WEB-SEARCH] ✅ 검색 완료:', filteredResults.length, '개 결과 (필터링 전:', data.results.length, ')');

          // 출처 정보는 SourceCitations 컴포넌트에서 표시
          return {
            text: `\n\n[웹 검색 결과]\n${searchContext}`,
            sources: filteredResults
          };
        } else {
          console.log('[WEB-SEARCH] 관련 결과 없음 (필터링 후)');
        }
      }

      console.log('[WEB-SEARCH] 검색 결과 없음');
      return { text: '', sources: [] };
    } catch (err) {
      console.error('[WEB-SEARCH] 오류:', err);
      return { text: '', sources: [] };
    }
  };

  const detectImageRequest = (text: string) => /(이미지|그림|사진|일러스트|삽화|포스터|로고|아이콘|썸네일|배경|장면|모습|캐릭터|그래픽|아트|초상).*(생성|만들|만드|제작|그려|그리|뽑아|출력|렌더|보여)|(생성|만들|만드|제작|그려|그리|뽑아|출력|렌더|보여).*(이미지|그림|사진|일러스트|삽화|포스터|로고|아이콘|썸네일|배경|장면|모습|캐릭터|그래픽|아트|초상)|그려\s*(줘|주세요|달라|주라)|그려줄|\b(generate|create|make|render)\b.*\b(image|picture|illustration|photo|logo|poster|scene)\b|\bdraw\b|\b(image|picture|photo) of\b/i.test(text);

  const requestImageGeneration = async (prompt: string): Promise<{ url?: string; error?: string }> => {
    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:8001/api' : '/api';
    const model = /스테이블|stable/i.test(prompt) ? 'stable-diffusion' : 'dalle';
    try {
      const response = await fetch(`${apiUrl}/image/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, model, quality: 'medium', size: '1024x1024' })
      });
      const data = await response.json();
      if (!response.ok) return { error: data.detail || `HTTP ${response.status}` };
      const url: string = data.image.image_url;
      return { url: url.startsWith('/') ? `${apiUrl.replace(/\/api$/, '')}${url}` : url };
    } catch (err) {
      return { error: (err as Error).message };
    }
  };

  // AI 어시스턴트 채팅 (Tool-Calling, SSE 스트리밍)
  const sendAssistantMessage = async (
    message: string,
    history: ChatMessage[],
    onDelta?: (text: string) => void,
    onThinking?: (text: string) => void,
    projectId?: string | null
  ) => {
    try {
      const apiUrl = window.location.hostname === 'localhost'
        ? 'http://localhost:8001/api'  // Tauri 데스크톱 앱
        : '/api';  // 웹 앱 (현재 도메인의 /api 사용)

      const authToken = getToken();
      const response = await fetch(`${apiUrl}/assistant/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
        body: JSON.stringify({ message, history, instructions: getInstructions(), memories: memoryTexts(), thinking: thinkingOn, project_id: projectId || undefined, model: modelType })
      });

      if (!response.ok || !response.body) {
        console.error('[ASSISTANT] 응답 오류:', response.status);
        return { reply: '❌ 어시스턴트 응답 실패', tool_calls: [], engine_used: 'unknown', proposals: [] as PluginProposal[], connects: [] as ConnectPrompt[] };
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let text = '';
      let done: { tool_calls: any[]; engine_used: string } | null = null;
      const proposals: PluginProposal[] = [];
      const connects: ConnectPrompt[] = [];
      let thought = '';
      let limitHit: { kind?: string; used?: number; limit?: number } | null = null;

      while (true) {
        const { value, done: streamDone } = await reader.read();
        if (streamDone) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';

        for (const event of events) {
          const dataLine = event.split('\n').find(line => line.startsWith('data: '));
          if (!dataLine) continue;
          const payload = JSON.parse(dataLine.slice(6));

          if (payload.type === 'delta') {
            text += payload.text;
            onDelta?.(text);
          } else if (payload.type === 'thinking') {
            thought += payload.text;
            onThinking?.(thought);
          } else if (payload.type === 'replace') {
            text = payload.text;
            onDelta?.(text);
          } else if (payload.type === 'done') {
            done = { tool_calls: payload.tool_calls || [], engine_used: payload.engine_used };
          } else if (payload.type === 'plugin_proposal') {
            proposals.push(payload.proposal);
          } else if (payload.type === 'connect_prompt') {
            connects.push(payload);
          } else if (payload.type === 'limit_exceeded') {
            limitHit = payload;
          } else if (payload.type === 'error') {
            throw new Error(payload.message);
          }
        }
      }

      if (limitHit) {
        // 사용량 한도를 넘었다: 사용자가 연결한 에이전트로 이어서 답한다 (브라우저가 직접 호출, 서버를 거치지 않음)
        let notice = '';
        const instructions = getInstructions();
        const convo = [
          ...(instructions ? [{ role: 'system' as const, content: instructions }] : []),
          ...history.filter((h) => h.content?.trim()).map((h) => ({ role: h.role as 'user' | 'assistant', content: h.content })),
          { role: 'user' as const, content: message },
        ];
        const answer = await streamAgent(
          convo,
          (label) => { notice = `> 사용량 한도를 넘어 연결된 에이전트(${label})로 답합니다.\n\n`; },
          (t) => onDelta?.(notice + t),
        );
        return { reply: notice + answer, tool_calls: [], engine_used: 'connected-agent', proposals, connects };
      }

      return { reply: text, tool_calls: done?.tool_calls ?? [], engine_used: done?.engine_used ?? 'unknown', proposals, connects };
    } catch (err) {
      console.error('[ASSISTANT] 오류:', err);
      return { reply: `❌ 오류: ${(err as any).message}`, tool_calls: [], engine_used: 'unknown', proposals: [] as PluginProposal[], connects: [] as ConnectPrompt[] };
    }
  };

  const handleCommand = async () => {
    console.log('🔵 [DEBUG] handleCommand 호출됨');
    console.log('🔵 [DEBUG] input:', input);
    console.log('🔵 [DEBUG] attachedFiles:', attachedFiles.length);

    if (!input.trim() && attachedFiles.length === 0 && chatAttachments.length === 0 && composerTool === 'none') {
      console.log('🔵 [DEBUG] 입력값 없음 - 함수 종료');
      return;
    }

    console.log('🔵 [DEBUG] 입력값 확인됨 - 처리 시작');
    setStatus('ANALYZING');
    setResponse('');
    setCurrentTokens({ input: 0, output: 0, total: 0 });
    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => undefined);
      }
    } catch { /* 무시 */ }
    let fullContent = '';
    let generatedImageUrl: string | undefined;
    let generatedSources: { title: string; url: string }[] | undefined;
    let generatedArtifact: ChatItem['artifact'];
    let generatedFeature: ChatItem['feature'];
    let generatedDev: DevResult | undefined;

    try {
      const runTool = composerTool;
      const runAttachments = chatAttachments;
      const userMessage = (runTool === 'image' ? '이미지 생성: ' : '') + input.trim();
      setComposerTool('none');
      setChatAttachments([]);
      // 질문을 읽은 즉시 입력창을 비운다 (답변이 끝날 때까지 기다리지 않는다)
      setInput('');
      const fileContext = attachedFiles.map(f => `@${f.path}`).join(' ');
      const fullPrompt = `${fileContext} ${userMessage}`.trim();

      // 모델별 처리 로직
      console.log(`🤖 [MODEL] 현재 모델: ${activeModel}`);

      // LARS-Native: 빠른 코딩 & 고속 구현
      const isNativeOptimized = activeModel === 'LARS-Native' &&
        (userMessage.includes('코드') || userMessage.includes('함수') || userMessage.includes('버그'));

      // LARS-Cosmos: 깊은 분석 & 아키텍처
      const isCosmosAnalysis = activeModel === 'LARS-Cosmos' &&
        (userMessage.includes('분석') || userMessage.includes('아키텍처') || userMessage.includes('설계'));

      // LARS-Prime: 보안 & 논리 검증
      const isPrimeSecure = activeModel === 'LARS-Prime' &&
        (userMessage.includes('보안') || userMessage.includes('검증') || userMessage.includes('감사'));

      // Aivora: 감정 AI 분석
      const isAivoraEmotion = activeModel === 'Aivora' &&
        (userMessage.includes('감정') || userMessage.includes('분석') || userMessage.includes('상담'));

      // Rekora: 3D 설계 & 이미지 생성
      const isRekoraDesign = activeModel === 'Rekora' &&
        (userMessage.includes('이미지') || userMessage.includes('3D') || userMessage.includes('디자인'));

      // Synzora: 데이터 그래프 & 네트워크
      const isSynzoraGraph = activeModel === 'Synzora' &&
        (userMessage.includes('그래프') || userMessage.includes('네트워크') || userMessage.includes('관계'));

      // 모델 특화 정보 추가
      let modelContext = '';
      if (isNativeOptimized) {
        modelContext = '\n[모델 모드: LARS-Native]\n⚡ 고속 실행 모드 활성화 - 코딩 최적화됨';
      } else if (isCosmosAnalysis) {
        modelContext = '\n[모델 모드: LARS-Cosmos]\n🌌 깊은 분석 모드 - 맥락 강화됨';
      } else if (isPrimeSecure) {
        modelContext = '\n[모델 모드: LARS-Prime]\n🔒 보안 검증 모드 - 무결점 추론';
      } else if (isAivoraEmotion) {
        modelContext = '\n[모델 모드: Aivora]\n❤️ 감정 AI 모드 - 정서 지능 활성화';
      } else if (isRekoraDesign) {
        modelContext = '\n[모델 모드: Rekora]\n🎨 3D 설계 모드 - 비주얼 생성 준비';
      } else if (isSynzoraGraph) {
        modelContext = '\n[모델 모드: Synzora]\n📊 그래프 분석 모드 - 네트워크 시각화';
      }

      // 🎁 프레젠테이션 요청 감지 (직접 처리)
      // 모드를 고르지 않아도 "발표 자료", "슬라이드" 요청이면 발표 자료 기능으로 처리한다
      const keywordPpt = runTool === 'none' && runAttachments.length === 0 && /프레젠테이션|프리젠테이션|발표|슬라이드|프레젠/.test(userMessage);



      // 🎯 간단한 방식: 직접 AI 에이전트 호출 (파일 생성 안 함)
      console.log(`[CHAT] 💬 사용자 메시지: "${userMessage}"`);
      console.log(`[CHAT] 생성 모드: ${generationMode}`);

      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';

        if (runTool !== 'image' && (runTool !== 'none' || runAttachments.length > 0 || keywordPpt)) {
          // 입력창 기능: 선택한 모드와 첨부 파일로 실제 기능을 실행한다
          const toolName = runTool !== 'none' ? runTool : keywordPpt ? 'ppt' : 'chat';
          const toolChatId = currentChat?.id ?? `tool-${Date.now()}`;
          const progressText = toolName === 'ppt'
            ? '발표 자료를 만들고 있습니다. 모델이 구성을 쓰는 동안 몇 분 걸릴 수 있습니다.'
            : toolName === 'research'
              ? '심층 리서치 중입니다. 여러 자료를 찾아 읽는 데 몇 분 걸릴 수 있습니다.'
              : '처리하고 있습니다...';
          if (!currentChat) {
            setCurrentChat({ id: toolChatId, title: userMessage.substring(0, 50) || '대화', date: new Date().toLocaleDateString('ko-KR'), input: userMessage, response: progressText, messages: [] });
          } else {
            setCurrentChat(prev => (prev && prev.id === toolChatId ? { ...prev, response: progressText } : prev));
          }
          const longTool = toolName === 'ppt' || toolName === 'research';
          if (longTool) setPendingTool({ chatId: toolChatId, startedAt: Date.now(), tool: toolName, detail: userMessage });
          let toolResult;
          try {
            toolResult = await runChatTool(
              toolName,
              userMessage,
              runAttachments.map((a) => a.id),
              (currentChat?.messages || []).slice(-10).map((m) => ({ role: m.role, content: m.content })),
            );
          } finally {
            if (longTool) setPendingTool(null);
          }
          fullContent = toolResult.reply;
          generatedSources = toolResult.sources;
          generatedArtifact = toolResult.artifact;
        } else if (chatMode === 'dev') {
          // 개발 환경: 작업 폴더를 샌드박스에서 읽고, 확인이 필요한 수정 제안만 만든다
          if (!devWorkspace.trim()) {
            fullContent = '❌ 개발 환경에서는 먼저 작업 폴더를 선택해 주세요.';
          } else {
            const devChatId = currentChat?.id ?? `dev-${Date.now()}`;
            if (!currentChat) {
              setCurrentChat({
                id: devChatId,
                title: userMessage.substring(0, 50) || '대화',
                date: new Date().toLocaleDateString('ko-KR'),
                input: userMessage,
                response: '',
                messages: []
              });
            }
            setGenerationType('chat');
            const devResult = await runDevAgent(devWorkspace.trim(), userMessage);
            generatedDev = devResult;
            fullContent = devResult.error ? `❌ ${devResult.error}` : (devResult.summary || '작업을 마쳤습니다.');
          }
        } else if (researchMode) {
          // 심층 리서치: 웹 출처를 찾아 읽고 출처 번호가 붙은 보고서를 만든다
          const researchChatId = currentChat?.id ?? `research-${Date.now()}`;
          if (!currentChat) {
            setCurrentChat({ id: researchChatId, title: userMessage.substring(0, 50) || '대화', date: new Date().toLocaleDateString('ko-KR'), input: userMessage, response: '', messages: [] });
          }
          setGenerationType('chat');
          const apiBase = window.location.hostname === 'localhost' ? 'http://localhost:8001/api' : '/api';
          const response = await fetch(`${apiBase}/research`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question: userMessage }),
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.detail || `HTTP ${response.status}`);
          const sourceLines = (data.sources || []).map((s: { title: string; url: string }, i: number) => `[${i + 1}] ${s.title} - ${s.url}`);
          fullContent = `${data.report}\n\n---\n**출처**\n${sourceLines.join('\n')}`;
        } else if (generationMode === 'workspace') {
          // Workspace 모드: 실제로 일어난 단계만 표시한다 (미리 만든 에이전트 메시지나 산출물은 쓰지 않는다)
          setResponse('');
          const stepNames = language === 'ko'
            ? ['요청 준비', '자료 수집', '답변 생성', '결과 정리']
            : ['Prepare', 'Gather sources', 'Generate', 'Finalize'];
          const showStep = (active: number) => setWorkspaceSteps(stepNames.map((name, i) => ({
            step: i + 1,
            name,
            status: i < active ? 'completed' : i === active ? 'processing' : 'pending',
            agents: [],
          })) as any);
          try {
            showStep(0);
            showStep(1);
            const searchResult = await performWebSearch(userMessage);
            setSearchSources(searchResult.sources);
            showStep(2);
            const sourceText = (searchResult.sources || []).slice(0, 5)
              .map((src: any, i: number) => `[${i + 1}] ${src.title || src.url || ''} ${src.snippet || src.content || ''}`.trim())
              .join('\n');
            const workspaceQuery = `[Workspace 요청]\n${userMessage}${sourceText ? `\n\n[참고 자료]\n${sourceText}` : ''}`;
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';
            const agentResponse = await fetch(`${apiUrl}/agent/prism/query`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ query: workspaceQuery, model: getOllamaModelName(activeModel), use_cache: true }),
            });
            if (!agentResponse.ok) throw new Error(await agentResponse.text());
            const result = await agentResponse.json();
            fullContent = result.response || '응답을 생성하지 못했습니다.';
            showStep(3);
            setResponse(fullContent);
            setWorkspaceSteps(stepNames.map((name, i) => ({ step: i + 1, name, status: 'completed', agents: [] })) as any);
          } catch (err) {
            fullContent = `❌ 오류: ${(err as any).message}`;
            setResponse(fullContent);
          }
        } else if (detectScreenOpen(userMessage)) {
          // 화면 열기 요청: 해당 화면으로 이동한다.
          const screen = detectScreenOpen(userMessage) as { tab: string; label: string };
          setActiveTab(screen.tab as any);
          fullContent = `${screen.label} 화면을 열었습니다.`;
        } else if (detectImageRequest(userMessage)) {
          const pendingId = currentChat?.id ?? `image-${Date.now()}`;
          const pendingText = '🎨 이미지를 생성하고 있습니다... 1분 안팎 걸릴 수 있습니다.';
          if (!currentChat) {
            setCurrentChat({
              id: pendingId,
              title: userMessage.substring(0, 50) || '대화',
              date: new Date().toLocaleDateString('ko-KR'),
              input: userMessage,
              response: pendingText,
              messages: []
            });
          } else {
            setCurrentChat(prev => (prev && prev.id === pendingId ? { ...prev, response: pendingText } : prev));
          }
          setPendingImage({ chatId: pendingId, startedAt: Date.now(), prompt: userMessage });
          const imageResult = await requestImageGeneration(userMessage);
          setPendingImage(null);
          generatedImageUrl = imageResult.url;
          fullContent = imageResult.url ? '이미지를 생성했습니다.' : `❌ 이미지 생성 실패: ${imageResult.error}`;
        } else if (detectFeatureTab(userMessage)) {
          // 하위 기능 요청: 기능을 탭 전문 엔진으로 실행하고, 결과만 채팅에 표시한다.
          const featureTab = detectFeatureTab(userMessage) as string;
          const featureChatId = currentChat?.id ?? `feature-${Date.now()}`;
          if (!currentChat) {
            setCurrentChat({
              id: featureChatId,
              title: userMessage.substring(0, 50) || '대화',
              date: new Date().toLocaleDateString('ko-KR'),
              input: userMessage,
              response: '',
              messages: []
            });
          }
          setGenerationType('chat');
          const routed = await runRoutedAi(
            featureTab,
            userMessage,
            (currentChat?.messages || []).slice(-10).map((m) => ({ role: m.role, content: m.content }))
          );
          fullContent = routed.reply;
          generatedFeature = { tab: featureTab, label: featureLabel(featureTab), engine: routed.engine, backend: routed.backend };
        } else {
          // K-EXAONE 2.5 선택 시: LG AI API로 직접 응답한다.
          if (activeModel === 'K-EXAONE') {
            const exaoneId = currentChat?.id ?? `exaone-${Date.now()}`;
            if (!currentChat) {
              setCurrentChat({
                id: exaoneId,
                title: userMessage.substring(0, 50) || '대화',
                date: new Date().toLocaleDateString('ko-KR'),
                input: userMessage,
                response: '',
                messages: []
              });
            }
            setGenerationType('chat');
            fullContent = await runExaoneStream(
              userMessage,
              (currentChat?.messages || []).slice(-10).map((m) => ({ role: m.role, content: m.content })),
              (partial) => {
                setCurrentChat(prev => (prev && prev.id === exaoneId ? { ...prev, response: partial } : prev));
              }
            );
          } else {
          // 일반 모드: AI 어시스턴트 Tool-Calling 사용 (응답 조각을 도착 즉시 표시)
          const streamChatId = currentChat?.id ?? `stream-${Date.now()}`;
          if (!currentChat) {
            setCurrentChat({
              id: streamChatId,
              title: userMessage.substring(0, 50) || '대화',
              date: new Date().toLocaleDateString('ko-KR'),
              input: userMessage,
              response: '',
              messages: []
            });
          }
          setGenerationType('chat');
          const assistantResult = await sendAssistantMessage(
            userMessage,
            currentChat?.messages || [],
            (partial) => {
              setCurrentChat(prev => (prev && prev.id === streamChatId ? { ...prev, response: partial } : prev));
            },
            (partialThought) => {
              setCurrentChat(prev => (prev && prev.id === streamChatId ? { ...prev, thinking: partialThought } : prev));
            },
            currentChat?.projectId ?? activeProjectId ?? null
          );
          fullContent = assistantResult.reply;
          if (assistantResult.connects?.length) {
            setConnectPrompts(prev => [...prev, ...assistantResult.connects.map((c: ConnectPrompt) => ({ key: `${Date.now()}-${Math.random()}`, chatId: String(streamChatId), prompt: c }))]);
          }
          if (assistantResult.proposals?.length) {
            setPluginProposals(prev => [...prev, ...assistantResult.proposals.map((p: PluginProposal) => ({ key: `${Date.now()}-${Math.random()}`, chatId: String(streamChatId), proposal: p }))]);
          }

          // Tool calls가 있으면 메시지에 저장
          if (assistantResult.tool_calls && assistantResult.tool_calls.length > 0) {
            console.log('[CHAT] 🔧 Tool calls:', assistantResult.tool_calls);
          }
          }
        }
      } catch (err) {
        console.error('[CHAT] 실패:', err);
        fullContent = `❌ 오류: ${(err as any).message}`;
      }

      // 응답 표시
      console.log(`[CHAT] 📝 응답 표시: ${fullContent.substring(0, 50)}...`);
      setResponse(fullContent);
      setGenerationType('chat');

      // 채팅 히스토리에 저장 (임시 채팅은 화면에만 두고 저장하지 않는다)
      if (temporaryChat) {
        const base: ChatItem = currentChat ?? {
          id: `temp-${Date.now()}`,
          title: userMessage.substring(0, 50) || '대화',
          date: new Date().toLocaleDateString('ko-KR'),
          input: userMessage,
          response: '',
          messages: []
        };
        setCurrentChat({
          ...base,
          response: fullContent,
          messages: [...base.messages, { role: 'user', content: userMessage }, { role: 'assistant', content: fullContent }],
          imageUrl: generatedImageUrl,
          feature: generatedFeature,
          sources: generatedSources,
          artifact: generatedArtifact,
          devResult: generatedDev
        });
      } else if (currentChat) {
        // 기존 대화에 메시지 추가 (같은 세션 계속)
        const updatedMessages = [
          ...currentChat.messages,
          { role: 'user', content: userMessage },
          { role: 'assistant', content: fullContent }
        ];
        const updatedChat: ChatItem = {
          ...currentChat,
          response: fullContent,
          messages: updatedMessages,
          imageUrl: generatedImageUrl,
          feature: generatedFeature,
          sources: generatedSources,
          artifact: generatedArtifact,
          devResult: generatedDev
        };

        // chatHistory에서 해당 채팅 업데이트
        const updatedHistory = chatHistory.map(chat =>
          chat.id === currentChat.id ? updatedChat : chat
        );

        setChatHistory(updatedHistory);
        localStorage.setItem('lars_chat_history', JSON.stringify(updatedHistory));
        setCurrentChat(updatedChat);
      } else {
        // 새로운 대화 시작
        const newChat: ChatItem = {
          id: Date.now().toString(),
          title: userMessage.substring(0, 50) || '대화',
          date: new Date().toLocaleDateString('ko-KR'),
          input: userMessage,
          response: fullContent,
          imageUrl: generatedImageUrl,
          feature: generatedFeature,
          sources: generatedSources,
          artifact: generatedArtifact,
          devResult: generatedDev,
          projectId: activeProjectId ?? undefined,
          messages: [
            { role: 'user', content: userMessage },
            { role: 'assistant', content: fullContent }
          ]
        };
        const newHistory = [newChat, ...chatHistory];
        setChatHistory(newHistory);
        localStorage.setItem('lars_chat_history', JSON.stringify(newHistory));

        // ✅ 새 대화를 현재 화면에 즉시 표시
        setCurrentChat(newChat);
      }

      // UI 초기화 (입력창은 전송 시작 시점에 이미 비웠다)
      setStatus('SUCCESS');

      // 완료 알림: 창이 가려져 있을 때만 알린다
      try {
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && (document.hidden || !document.hasFocus())) {
          new Notification('LARS Prism', { body: `답변이 완료되었습니다: ${userMessage.substring(0, 40)}` });
        }
      } catch { /* 알림을 쓸 수 없는 환경에서는 무시 */ }

      // 음성 대화 중이면 답변을 읽고 끝나면 다시 듣는다
      if (voiceConversationRef.current) {
        speakThenListen(fullContent);
      }
      // 음성 출력 모드에서는 응답을 음성으로 재생
      if (voiceMode === 'output') {
        setTimeout(() => { textToSpeech(fullContent); }, 500);
      }
    } catch (err) {
      console.error('[HANDLER] 예상치 못한 에러:', err);
      setResponse(`❌ 오류: ${(err as any).message}`);
      setStatus('IDLE');
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
    const unlisteners: (() => void)[] = [];

    const setupListeners = async () => {
      // Agent Executor 초기화
      try {
        // await initAgentExecutor(invoke);
        console.log('[AGENT] ✅ Agent Executor initialized');
      } catch (e) {
        console.warn('[AGENT] Agent Executor initialization failed:', e);
      }

      // Phase 4: Agent Pool Manager 초기화
      try {
        const poolConfig: AgentPoolConfig = {
          maxAgents: 50,
          autoScale: true,
          specializations: ['데이터분석', '문서작성', '코드리뷰', '테스트'],
          taskTimeout: 30000,
          retryPolicy: { maxRetries: 3, delayMs: 1000 },
          loadBalancing: 'least-loaded'
        };
        // const poolManager = new AgentPoolManager(poolConfig);
        // poolManager.setStateChangeCallback((state) => {
        //   setAgentPoolState(state);
        //   console.log('[AGENT_POOL]', state);
        // });
        console.log('[AGENT_POOL] ✅ Agent Pool Manager initialized');
      } catch (e) {
        console.warn('[AGENT_POOL] Agent Pool Manager initialization failed:', e);
      }

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
      unlisteners.forEach(f => f());
    };
  }, []);

  const attachFile = (file: AttachedFile) => {
    if (!attachedFiles.find(f => f.path === file.path)) { setAttachedFiles([...attachedFiles, file]); }
    setShowQuickMenu('none');
  };

  const handleClearHistory = () => {
    setConfirmAction(() => () => {
      setChatHistory([]);
      localStorage.removeItem('lars_chat_history');
      setShowConfirmDialog(false);
      setDeleteNotification({show: true, message: '대화 기록이 삭제되었습니다'});
      setTimeout(() => setDeleteNotification({show: false, message: ''}), 2000);
    });
    setShowConfirmDialog(true);
  };

  const reloadProjects = async () => {
    try {
      setProjects(await listProjectsApi());
    } catch (err) {
      console.error('[PROJECTS] 불러오기 실패:', err);
    }
  };

  const createProject = async (name: string, description: string): Promise<string | undefined> => {
    try {
      const created = await createProjectApi(name, description);
      setProjects((prev) => [created, ...prev]);
      return created.id;
    } catch (err) {
      console.error('[PROJECTS] 만들기 실패:', err);
      return undefined;
    }
  };

  const updateProject = async (projectId: string, patch: { name?: string; description?: string; instructions?: string }) => {
    try {
      const updated = await patchProjectApi(projectId, patch);
      setProjects((prev) => prev.map((p) => (p.id === projectId ? { ...p, ...updated } : p)));
    } catch (err) {
      console.error('[PROJECTS] 저장 실패:', err);
    }
  };

  const uploadProjectFile = async (projectId: string, file: File) => {
    const result = await uploadProjectFileApi(projectId, file);
    await reloadProjects();
    return { truncated: result.truncated };
  };

  const removeProjectFile = async (projectId: string, fileId: string) => {
    await deleteProjectFileApi(projectId, fileId);
    await reloadProjects();
  };

  const deleteProject = async (projectId: string) => {
    try {
      await deleteProjectApi(projectId);
    } catch (err) {
      console.error('[PROJECTS] 삭제 실패:', err);
      return;
    }
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    // 프로젝트를 지워도 대화는 남기고, 프로젝트 연결만 끊는다
    setChatHistory((prev) => {
      const next = prev.map((c) => (c.projectId === projectId ? { ...c, projectId: undefined } : c));
      localStorage.setItem('lars_chat_history', JSON.stringify(next));
      return next;
    });
    if (activeProjectId === projectId) setActiveProjectId(null);
  };

  // 프로젝트 화면의 입력창에서 질문하면, 그 프로젝트의 새 채팅으로 바로 보낸다
  const startProjectChat = (projectId: string, text: string) => {
    setActiveProjectId(projectId);
    setActiveTab('chat');
    handleNewChat();
    setInput(text);
    setAutoSendPending(true);
  };

  useEffect(() => {
    if (autoSendPending && activeTab === 'chat') {
      setAutoSendPending(false);
      handleCommand();
    }
  }, [autoSendPending, activeTab]);

  const newChatInProject = (projectId: string) => {
    setActiveProjectId(projectId);
    setActiveTab('chat');
    handleNewChat();
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
    setActiveProjectId(null);
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
    if (chat.response && typeof chat.response === 'string') {
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
          // 자동으로 메시지 전송
          setTimeout(async () => {
            try {
              await handleSendMessage(text);
            } catch (err) {
              console.error('[VOICE] Failed to send message:', err);
            }
          }, 500);
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
        if (config?.userName) setUser({ name: config.userName, email: config.userEmail, avatarUrl: config.avatarUrl || '' });
        if (config?.modelType) updateModelStates(config.modelType);

        // localStorage에서 대화 히스토리 로드
        const savedHistory = localStorage.getItem('lars_chat_history');
        if (savedHistory) {
          try {
            const parsed = JSON.parse(savedHistory);
            const sorted = [...parsed].sort((a, b) => {
              const dateA = new Date(a.date).getTime();
              const dateB = new Date(b.date).getTime();
              return dateB - dateA;
            });
            setChatHistory(sorted);
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

  // Handle Quick Start item selection
  const handleQuickStartSelect = useCallback((id: string) => {
    const tabMap: { [key: string]: string } = {
      'ocr-start': 'ocr',
      'scraping-start': 'scraping',
      'statistics-start': 'statistics',
      'workflow-start': 'workflows',
      'deployment-start': 'deployment',
      'ecosystem-start': 'ecosystem'
    };
    const tabId = tabMap[id];
    if (!tabId) {
      console.error('Invalid quick start ID:', id, 'Available maps:', Object.keys(tabMap));
      return;
    }
    console.log('QuickStart item selected:', id, '-> tabId:', tabId);
    setActiveTab(tabId as any);
  }, []);

  const renderContent = () => {
    try {
      console.log('=== renderContent called ===');
      console.log('activeTab:', activeTab);
      console.log('sidebarCollapsed:', sidebarCollapsed);
      // Phase 1, 2, 3 모든 데이터 엔진 대시보드
      if (activeTab === 'scraping') return <div className="scraping-dashboard" style={{ flex: 1, width: '100%', height: '100%' }}><ScrapingDashboard /></div>;
      if (activeTab === 'ocr') return <div className="ocr-dashboard" style={{ flex: 1, width: '100%', height: '100%' }}><OCRPanel /></div>;
      if (activeTab === 'change-detection') return <div className="change-detection-dashboard" style={{ flex: 1, width: '100%', height: '100%' }}><ChangeDetectionMonitor /></div>;
      if (activeTab === 'seo') return <div className="seo-dashboard" style={{ flex: 1, width: '100%', height: '100%' }}><SEOAnalyticsDashboard /></div>;
      if (activeTab === 'crm') return <div className="crm-dashboard" style={{ flex: 1, width: '100%', height: '100%' }}><CRMDashboard /></div>;
      if (activeTab === 'workflows') return <div className="workflow-dashboard" style={{ flex: 1, width: '100%', height: '100%', overflowY: 'auto' }}><WorkflowOptimizerPanel /><AdvancedWorkflowExecutor /></div>;
      if (activeTab === 'presentation') return <div className="presentation-dashboard" style={{ flex: 1, width: '100%', height: '100%', display: 'flex' }}><PresentationThemeDashboard /></div>;
      if (activeTab === 'integration') return <div className="integration-dashboard" style={{ flex: 1, width: '100%', height: '100%' }}><IntegrationDashboard /></div>;

    if (activeTab === 'themes') return (
      <ThemeLibrary
        selectedThemeType={selectedThemeType}
        setSelectedThemeType={setSelectedThemeType}
        selectedThemes={selectedThemes}
        setSelectedThemes={setSelectedThemes}
        onFreestyleCreate={(type) => {
          console.log(`Creating ${type} template with AI`);
        }}
        onShare={(themeId) => {
          console.log(`Sharing theme: ${themeId}`);
        }}
        onSchedule={(themeId) => {
          console.log(`Scheduling theme: ${themeId}`);
        }}
        language={language}
      />
    );
    if (activeTab === 'settings') return (
      <Settings
        onClose={() => setActiveTab('chat')}
        onOpenBrowser={() => setActiveTab('browser')}
        onSave={(config) => {
          setUser({
            name: config.userName,
            email: config.userEmail,
            avatarUrl: config.avatarUrl || ''
          });
          // 에이전트 설정 저장
          setModelType(config.modelType);
          localStorage.setItem('modelType', config.modelType);
        }}
      />
    );
    if (activeTab === 'workspace') return (
      <div className="workspace-view animate-in">
        <header className="view-header">
          <div style={{display: 'flex', alignItems: 'center', gap: '0.8rem'}}>
            <GitBranch size={24} color="var(--accent-blue)" />
            <h2>{language === 'ko' ? 'Workspace' : 'Workspace'}</h2>
          </div>
          <p className="view-desc">{language === 'ko' ? 'Workspace - 다중 에이전트 협력' : 'Workspace - Multi-agent collaboration'}</p>
        </header>
        <div className="workspace-content">
          <WorkspaceMode
            mode="workspace"
            onModeChange={() => setActiveTab('chat')}
            language={language}
          />
          <div style={{marginTop: '2rem', padding: '1rem', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '12px', border: '1px solid rgba(100, 108, 255, 0.2)'}}>
            <h3 style={{marginBottom: '1rem', color: '#60a5fa'}}>{language === 'ko' ? 'Workspace 사용 안내' : 'How to use Workspace'}</h3>
            <div style={{fontSize: '0.9rem', lineHeight: '1.8', color: '#cbd5e1', display: 'grid', gap: '1rem'}}>
              {language === 'ko' ? (
                <>
                  <div style={{display: 'flex', alignItems: 'flex-start', gap: '0.8rem'}}>
                    <div style={{minWidth: '24px', display: 'flex', alignItems: 'center', marginTop: '2px'}}>
                      <GlassmorphicIcon Icon={Sparkles} gradient="from-amber-400 to-orange-500" size={20} />
                    </div>
                    <span><strong>LARS Workspace</strong>는 협력 중심의 작업 환경입니다.</span>
                  </div>
                  <div style={{display: 'flex', alignItems: 'flex-start', gap: '0.8rem'}}>
                    <div style={{minWidth: '24px', display: 'flex', alignItems: 'center', marginTop: '2px'}}>
                      <GlassmorphicIcon Icon={ClipboardList} gradient="from-blue-400 to-cyan-500" size={20} />
                    </div>
                    <span><strong>4단계 워크플로우</strong>로 사용자의 질문을 분석하고 다중 에이전트가 협력하여 최적의 결과를 생성합니다.</span>
                  </div>
                  <div style={{display: 'flex', alignItems: 'flex-start', gap: '0.8rem'}}>
                    <div style={{minWidth: '24px', display: 'flex', alignItems: 'center', marginTop: '2px'}}>
                      <GlassmorphicIcon Icon={Users} gradient="from-emerald-400 to-teal-500" size={20} />
                    </div>
                    <span>각 단계에서 어떤 에이전트가 작동하는지 실시간으로 확인할 수 있습니다.</span>
                  </div>
                  <div style={{display: 'flex', alignItems: 'flex-start', gap: '0.8rem'}}>
                    <div style={{minWidth: '24px', display: 'flex', alignItems: 'center', marginTop: '2px'}}>
                      <GlassmorphicIcon Icon={Zap} gradient="from-yellow-400 to-amber-500" size={20} />
                    </div>
                    <span>에이전트 병렬 처리를 통해 빠르고 정확한 결과를 제공합니다.</span>
                  </div>
                  <div style={{marginTop: '1rem', padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', borderLeft: '3px solid #60a5fa'}}>
                    <strong>시작하기:</strong> 채팅 탭에서 질문을 입력하면 Workspace 모드로 자동 전환됩니다.
                  </div>
                </>
              ) : (
                <>
                  <div style={{display: 'flex', alignItems: 'flex-start', gap: '0.8rem'}}>
                    <div style={{minWidth: '24px', display: 'flex', alignItems: 'center', marginTop: '2px'}}>
                      <GlassmorphicIcon Icon={Sparkles} gradient="from-amber-400 to-orange-500" size={20} />
                    </div>
                    <span><strong>LARS Workspace</strong> is a collaboration-focused work environment.</span>
                  </div>
                  <div style={{display: 'flex', alignItems: 'flex-start', gap: '0.8rem'}}>
                    <div style={{minWidth: '24px', display: 'flex', alignItems: 'center', marginTop: '2px'}}>
                      <GlassmorphicIcon Icon={ClipboardList} gradient="from-blue-400 to-cyan-500" size={20} />
                    </div>
                    <span><strong>4-stage workflow</strong> analyzes your questions and multiple agents collaborate to generate optimal results.</span>
                  </div>
                  <div style={{display: 'flex', alignItems: 'flex-start', gap: '0.8rem'}}>
                    <div style={{minWidth: '24px', display: 'flex', alignItems: 'center', marginTop: '2px'}}>
                      <GlassmorphicIcon Icon={Users} gradient="from-emerald-400 to-teal-500" size={20} />
                    </div>
                    <span>You can see in real-time which agents are working at each stage.</span>
                  </div>
                  <div style={{display: 'flex', alignItems: 'flex-start', gap: '0.8rem'}}>
                    <div style={{minWidth: '24px', display: 'flex', alignItems: 'center', marginTop: '2px'}}>
                      <GlassmorphicIcon Icon={Zap} gradient="from-yellow-400 to-amber-500" size={20} />
                    </div>
                    <span>Parallel agent processing provides fast and accurate results.</span>
                  </div>
                  <div style={{marginTop: '1rem', padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', borderLeft: '3px solid #60a5fa'}}>
                    <strong>Get Started:</strong> Enter a question in the Chat tab to automatically switch to Workspace mode.
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
    if (activeTab === 'ecosystem') return <div className="ecosystem-standalone"><Ecosystem language={language} /></div>;
    if (activeTab === 'statistics') return <div className="statistics-standalone"><Statistics /></div>;
    if (activeTab === 'warehouse') return <div style={{ height: '100%', overflowY: 'auto' }}><WarehouseScreen /></div>;
    if (activeTab === 'plugins') return <div style={{ height: '100%', overflowY: 'auto', padding: '1.5rem' }}><PluginsPanel /></div>;    if (activeTab === 'scheduled') return <SchedulesScreen />;
    if (activeTab === 'browser' && browserControlOn) return <div style={{ display: 'flex', flex: 1, width: '100%', height: '100%', overflow: 'auto' }}><BrowserTasksScreen /></div>;
    if (activeTab === 'agents') return <div style={{ display: 'flex', flex: 1, width: '100%', height: '100%', overflow: 'auto' }}><AgentsScreen /></div>;

    if (activeTab === 'projects') return (
      <ProjectsScreen
        projects={projects}
        chats={chatHistory}
        onCreate={createProject}
        onDelete={deleteProject}
        onOpenChat={(chatId) => { const chat = chatHistory.find((c) => c.id === chatId); if (chat) handleSelectChat(chat); }}
        selectedId={projectViewId}
        onSelectProject={setProjectViewId}
        onStartChat={startProjectChat}
        onUpdateProject={updateProject}
        onUploadFile={uploadProjectFile}
        onDeleteFile={removeProjectFile}
      />
    );

    if (activeTab === 'history') return (
      <div style={{padding: '2rem', height: '100%', overflowY: 'auto'}}>
        <div style={{width: '100%'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem'}}>
            <h1 style={{fontSize: '2rem', margin: 0}}>{language === 'ko' ? '대화 기록' : 'Conversation History'}</h1>
            {chatHistory && chatHistory.length > 0 && (
              <button
                onClick={() => handleClearHistory()}
                style={{
                  background: 'rgba(255, 99, 99, 0.1)',
                  border: '1px solid rgba(255, 99, 99, 0.3)',
                  color: '#ff6363',
                  padding: '0.6rem 1.2rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 99, 99, 0.15)';
                  e.currentTarget.style.borderColor = 'rgba(255, 99, 99, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 99, 99, 0.1)';
                  e.currentTarget.style.borderColor = 'rgba(255, 99, 99, 0.3)';
                }}
                title={language === 'ko' ? '모든 대화 기록 삭제' : 'Delete all conversations'}
              >
                <X size={18} /> {language === 'ko' ? '전체 삭제' : 'Clear All'}
              </button>
            )}
          </div>
          {chatHistory && chatHistory.length > 0 ? (
            <div style={{display: 'grid', gap: '1rem'}}>
              {chatHistory.map(chat => (
                <div
                  key={chat.id}
                  style={{
                    padding: '1rem',
                    background: 'rgba(100, 108, 255, 0.08)',
                    border: '1px solid rgba(100, 108, 255, 0.2)',
                    borderRadius: '8px',
                    transition: 'all 0.2s',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '1rem'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(100, 108, 255, 0.15)';
                    e.currentTarget.style.borderColor = 'rgba(100, 108, 255, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(100, 108, 255, 0.08)';
                    e.currentTarget.style.borderColor = 'rgba(100, 108, 255, 0.2)';
                  }}
                >
                  <div
                    onClick={() => { handleSelectChat(chat); setActiveTab('chat'); }}
                    style={{flex: 1, cursor: 'pointer'}}
                  >
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem'}}>
                      <div style={{flex: 1}}>
                        <h3 style={{margin: '0 0 0.5rem 0', color: '#60a5fa'}}>{chat.title}</h3>
                        <p style={{margin: 0, fontSize: '0.9rem', color: '#cbd5e1'}}>{chat.input?.substring(0, 100)}{chat.input && chat.input.length > 100 ? '...' : ''}</p>
                      </div>
                      <span style={{fontSize: '0.8rem', color: '#9ba1b0', whiteSpace: 'nowrap', marginLeft: '1rem'}}>{chat.date}</span>
                    </div>
                    {chat.response && (
                      <p style={{margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: '#94a3b8'}}>{language === 'ko' ? '답변:' : 'Response:'} {chat.response.substring(0, 80)}{chat.response && chat.response.length > 80 ? '...' : ''}</p>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteChat(chat.id);
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#ff6363',
                      cursor: 'pointer',
                      padding: '0.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '6px',
                      transition: 'all 0.2s',
                      flexShrink: 0,
                      marginTop: '0.2rem'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 99, 99, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                    title={language === 'ko' ? '대화 삭제' : 'Delete conversation'}
                  >
                    <X size={20} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{textAlign: 'center', padding: '2rem', color: '#9ba1b0'}}>
              <History size={48} style={{marginBottom: '1rem', opacity: 0.5}} />
              <p>{language === 'ko' ? '대화 기록이 없습니다. 채팅을 시작해보세요!' : 'No conversation history yet. Start chatting!'}</p>
            </div>
          )}
        </div>
      </div>
    );

    // 📌 기능 5: 브랜딩 가이드 자동 생성
    if (activeTab === 'branding') return (
      <div style={{ display: 'flex', height: '100%', width: '100%', background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}>
        <div style={{ width: '280px', borderRight: '1px solid rgba(100,150,255,0.2)', overflow: 'auto', padding: '20px', background: 'rgba(0,0,0,0.3)' }}>
          <h3 style={{ fontSize: '13px', color: 'rgba(224,224,224,0.5)', textTransform: 'uppercase', fontWeight: '600', marginBottom: '20px' }}>{language === 'ko' ? '기능' : 'Features'}</h3>
          <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '2.2', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '8px', borderBottom: '1px solid rgba(100,150,255,0.1)' }}><Palette size={14} color="#fcd34d" /> {language === 'ko' ? '색상표 추출' : 'Color Extraction'}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '8px', borderBottom: '1px solid rgba(100,150,255,0.1)' }}><Eye size={14} color="#60a5fa" /> {language === 'ko' ? '보색/유사색' : 'Complementary Colors'}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '8px', borderBottom: '1px solid rgba(100,150,255,0.1)' }}><FileText size={14} color="#a78bfa" /> {language === 'ko' ? '폰트 추천' : 'Font Suggestions'}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '8px', borderBottom: '1px solid rgba(100,150,255,0.1)' }}><Mail size={14} color="#4ade80" /> {language === 'ko' ? '톤&매너' : 'Tone & Manner'}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '8px', borderBottom: '1px solid rgba(100,150,255,0.1)' }}><Layout size={14} color="#f97316" /> {language === 'ko' ? '로고 가이드' : 'Logo Guidelines'}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '8px', borderBottom: '1px solid rgba(100,150,255,0.1)' }}><Grid size={14} color="#ec4899" /> {language === 'ko' ? '스페이싱 규칙' : 'Spacing Rules'}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><FileText size={14} color="#06b6d4" /> {language === 'ko' ? 'PDF 가이드' : 'PDF Guide'}</div>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '24px', borderBottom: '1px solid rgba(100,150,255,0.2)', background: 'rgba(0,0,0,0.2)' }}>
            <FeatureHeader
              icon={<GlassmorphicIcon Icon={Sparkles} gradient="from-pink-400 to-rose-500" size={40} />}
              title={language === 'ko' ? '브랜딩 가이드 생성' : 'Brand Guide Generator'}
              subtitle={language === 'ko' ? '브랜드 이름과 로고로 AI가 완벽한 브랜드 가이드를 자동 생성합니다.' : 'AI generates comprehensive brand guidelines from your name and logo.'}
            />
          </div>

          <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
            <div style={{ maxWidth: '500px', background: 'linear-gradient(135deg, rgba(100,150,255,0.15) 0%, rgba(100,150,255,0.05) 100%)', border: '1px solid rgba(100,150,255,0.3)', borderRadius: '14px', padding: '24px' }}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: 'rgba(224,224,224,0.7)', marginBottom: '8px', fontWeight: '600' }}>{language === 'ko' ? '브랜드 이름' : 'Brand Name'}</label>
                <input type="text" id="brand-name-input" placeholder={language === 'ko' ? '예: 내 회사명' : 'e.g. My Company'} style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, rgba(100,150,255,0.15) 0%, rgba(100,150,255,0.05) 100%)', border: '1px solid rgba(100,150,255,0.3)', borderRadius: '8px', color: '#e0e0e0', fontSize: '13px' }} />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: 'rgba(224,224,224,0.7)', marginBottom: '8px', fontWeight: '600' }}>{language === 'ko' ? '로고 이미지' : 'Logo Image'}</label>
                <input type="file" id="logo-upload" accept="image/*" style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, rgba(100,150,255,0.15) 0%, rgba(100,150,255,0.05) 100%)', border: '1px solid rgba(100,150,255,0.3)', borderRadius: '8px', color: '#e0e0e0', fontSize: '13px' }} />
                <p style={{ fontSize: '11px', color: 'rgba(224,224,224,0.4)', marginTop: '6px' }}>{language === 'ko' ? 'PNG, JPG, SVG (최대 10MB)' : 'PNG, JPG, SVG (Max 10MB)'}</p>
              </div>

              <button onClick={async () => {
                const brandName = (document.getElementById('brand-name-input') as HTMLInputElement)?.value;
                const logoInput = document.getElementById('logo-upload') as HTMLInputElement;
                const logoFile = logoInput?.files?.[0];
                if (!brandName || !logoFile) { alert(language === 'ko' ? '모두 입력해주세요' : 'Please fill all fields'); return; }
                const formData = new FormData(); formData.append('brand_name', brandName); formData.append('logo_file', logoFile);
                try {
                  setResponse(language === 'ko' ? '브랜드 분석 중...' : 'Analyzing...');
                  const res = await fetch(`${apiUrl}/branding/analyze`, { method: 'POST', body: formData });
                  const result = await res.json();
                  setResponse(result.status === 'success' ? `✅ ${language === 'ko' ? '완료!' : 'Done!'}\n\n${JSON.stringify(result, null, 2)}` : `❌ ${result.message}`);
                } catch (error) { setResponse(`❌ ${error}`); }
              }} style={{ width: '100%', padding: '12px', background: '#646cff', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', transition: 'all 0.3s' }}>
                {language === 'ko' ? '브랜드 분석' : 'Analyze'}
              </button>

              {response && (
                <div style={{ marginTop: '20px', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(100,150,255,0.2)', maxHeight: '200px', overflowY: 'auto', fontSize: '11px', color: '#cbd5e1', whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
                  {response}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );

    // 📌 기능 4: AI 심리학 기반 색상/폰트 추천
    if (activeTab === 'color-font') return (
      <div style={{ display: 'flex', height: '100%', width: '100%', background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}>
        <div style={{ width: '280px', borderRight: '1px solid rgba(100,150,255,0.2)', overflow: 'auto', padding: '20px', background: 'rgba(0,0,0,0.3)' }}>
          <h3 style={{ fontSize: '13px', color: 'rgba(224,224,224,0.5)', textTransform: 'uppercase', fontWeight: '600', marginBottom: '20px' }}>{language === 'ko' ? '추천 기준' : 'Criteria'}</h3>
          <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '2.2', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid rgba(100,150,255,0.1)' }}><Brain size={14} color="#a78bfa" /> {language === 'ko' ? '심리학 기반' : 'Psychology-Based'}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid rgba(100,150,255,0.1)' }}><Palette size={14} color="#fcd34d" /> {language === 'ko' ? '색상 조화' : 'Color Harmony'}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid rgba(100,150,255,0.1)' }}><FileText size={14} color="#60a5fa" /> {language === 'ko' ? '폰트 매칭' : 'Font Matching'}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><TrendingUp size={14} color="#4ade80" /> {language === 'ko' ? '산업별 분석' : 'Industry Analysis'}</div>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '24px', borderBottom: '1px solid rgba(100,150,255,0.2)', background: 'rgba(0,0,0,0.2)' }}>
            <FeatureHeader
              icon={<GlassmorphicIcon Icon={Palette} gradient="from-orange-400 to-red-500" size={40} />}
              title={language === 'ko' ? '색상/폰트 AI 추천' : 'AI Color & Font Recommendation'}
              subtitle={language === 'ko' ? '브랜드 성격을 입력하면 AI가 심리학 기반으로 최적의 색상과 폰트를 추천합니다.' : 'Describe your brand and AI will recommend optimal colors and fonts.'}
            />
          </div>

          <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
            <div style={{ maxWidth: '500px', background: 'linear-gradient(135deg, rgba(100,150,255,0.15) 0%, rgba(100,150,255,0.05) 100%)', border: '1px solid rgba(100,150,255,0.3)', borderRadius: '14px', padding: '24px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: 'rgba(224,224,224,0.7)', marginBottom: '8px', fontWeight: '600' }}>{language === 'ko' ? '브랜드 이름' : 'Brand Name'}</label>
                <input type="text" id="brand-name-cf" placeholder={language === 'ko' ? '예: 내 회사' : 'e.g. My Company'} style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, rgba(100,150,255,0.15) 0%, rgba(100,150,255,0.05) 100%)', border: '1px solid rgba(100,150,255,0.3)', borderRadius: '8px', color: '#e0e0e0', fontSize: '13px' }} />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: 'rgba(224,224,224,0.7)', marginBottom: '8px', fontWeight: '600' }}>{language === 'ko' ? '브랜드 설명' : 'Brand Description'}</label>
                <textarea id="brand-desc-cf" placeholder={language === 'ko' ? 'luxury, tech, eco, creative 등...' : 'e.g. modern, tech, luxury...'} style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, rgba(100,150,255,0.15) 0%, rgba(100,150,255,0.05) 100%)', border: '1px solid rgba(100,150,255,0.3)', borderRadius: '8px', color: '#e0e0e0', fontSize: '13px', minHeight: '80px', fontFamily: 'inherit' }} />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: 'rgba(224,224,224,0.7)', marginBottom: '8px', fontWeight: '600' }}>{language === 'ko' ? '산업' : 'Industry'}</label>
                <select id="industry-cf" style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, rgba(100,150,255,0.15) 0%, rgba(100,150,255,0.05) 100%)', border: '1px solid rgba(100,150,255,0.3)', borderRadius: '8px', color: '#e0e0e0', fontSize: '13px', fontFamily: 'inherit' }}>
                  <option value="">{language === 'ko' ? '선택' : 'Select'}</option>
                  <option value="food">{language === 'ko' ? '음식' : 'Food'}</option>
                  <option value="healthcare">{language === 'ko' ? '의료' : 'Healthcare'}</option>
                  <option value="finance">{language === 'ko' ? '금융' : 'Finance'}</option>
                  <option value="technology">{language === 'ko' ? '기술' : 'Technology'}</option>
                  <option value="fashion">{language === 'ko' ? '패션' : 'Fashion'}</option>
                </select>
              </div>

              <button onClick={async () => {
                const brandName = (document.getElementById('brand-name-cf') as HTMLInputElement)?.value;
                const description = (document.getElementById('brand-desc-cf') as HTMLTextAreaElement)?.value;
                const industry = (document.getElementById('industry-cf') as HTMLSelectElement)?.value;
                if (!brandName || !description) { alert(language === 'ko' ? '모두 입력해주세요' : 'Please fill all fields'); return; }
                try {
                  setResponse(language === 'ko' ? '🤖 AI 추천 생성 중...' : '🤖 Generating...');
                  const formData = new FormData();
                  formData.append('brand_name', brandName);
                  formData.append('description', description);
                  if (industry) formData.append('industry', industry);
                  const res = await fetch(`${apiUrl}/color-font/recommend`, { method: 'POST', body: formData });
                  const result = await res.json();
                  if (result.status === 'success') {
                    const colors = result.colors;
                    const fonts = result.fonts;
                    setResponse(`✅ ${language === 'ko' ? '완료!' : 'Done!'}\n\n🎨 ${language === 'ko' ? '색상' : 'Colors'}:\n주요: ${colors.primary.hex}\n보조: ${colors.secondary.hex}\n\n✍️ ${language === 'ko' ? '폰트' : 'Fonts'}:\n제목: ${fonts.display.primary}\n본문: ${fonts.body.primary}`);
                  } else {
                    setResponse(`❌ ${result.message}`);
                  }
                } catch (error) { setResponse(`❌ ${error}`); }
              }} style={{ width: '100%', padding: '12px', background: '#646cff', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', transition: 'all 0.3s' }}>
                {language === 'ko' ? '추천받기' : 'Recommend'}
              </button>

              {response && (
                <div style={{ marginTop: '20px', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(100,150,255,0.2)', maxHeight: '200px', overflowY: 'auto', fontSize: '11px', color: '#cbd5e1', whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
                  {response}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );

    // 📌 기능 3: 크로스 플랫폼 동시 생성
    if (activeTab === 'cross-platform') return (
      <div style={{ display: 'flex', height: '100%', width: '100%', background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}>
        <div style={{ width: '280px', borderRight: '1px solid rgba(100,150,255,0.2)', overflow: 'auto', padding: '20px', background: 'rgba(0,0,0,0.3)' }}>
          <h3 style={{ fontSize: '13px', color: 'rgba(224,224,224,0.5)', textTransform: 'uppercase', fontWeight: '600', marginBottom: '20px' }}>{language === 'ko' ? '플랫폼' : 'Platforms'}</h3>
          <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '2.2', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid rgba(100,150,255,0.1)' }}><Globe size={14} color="#60a5fa" /> {language === 'ko' ? '웹' : 'Web'}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid rgba(100,150,255,0.1)' }}><Smartphone size={14} color="#4ade80" /> {language === 'ko' ? '모바일' : 'Mobile'}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid rgba(100,150,255,0.1)' }}><Monitor size={14} color="#fcd34d" /> {language === 'ko' ? '데스크톱' : 'Desktop'}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Grid size={14} color="#f97316" /> {language === 'ko' ? '태블릿' : 'Tablet'}</div>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '24px', borderBottom: '1px solid rgba(100,150,255,0.2)', background: 'rgba(0,0,0,0.2)' }}>
            <FeatureHeader
              icon={<GlassmorphicIcon Icon={Smartphone} gradient="from-blue-400 to-cyan-500" size={40} />}
              title={language === 'ko' ? '크로스 플랫폼 생성' : 'Cross-Platform Generation'}
              subtitle={language === 'ko' ? '1개 디자인으로 모든 기기용 버전을 자동 생성합니다.' : 'Auto-generate versions for all devices from one design.'}
            />
          </div>

          <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '24px' }}>
              {[
                { icon: 'Globe', label: 'Web', size: '1920x1080', color: 'from-blue-400 to-cyan-500' },
                { icon: 'Smartphone', label: 'Mobile', size: '375x812', color: 'from-green-400 to-cyan-500' },
                { icon: 'Layout', label: 'Desktop', size: '1440x900', color: 'from-yellow-400 to-orange-500' },
                { icon: 'Grid', label: 'Tablet', size: '768x1024', color: 'from-pink-400 to-rose-500' }
              ].map((p) => (
                <div key={p.label} style={{ background: 'linear-gradient(135deg, rgba(100,150,255,0.15) 0%, rgba(100,150,255,0.05) 100%)', border: '1px solid rgba(100,150,255,0.3)', borderRadius: '14px', padding: '16px', textAlign: 'center' }}>
                  <GlassmorphicIcon icon={p.icon} gradient={p.color} size={32} />
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff', marginTop: '8px' }}>{p.label}</div>
                  <div style={{ fontSize: '11px', color: 'rgba(224,224,224,0.5)', marginTop: '4px' }}>{p.size}</div>
                </div>
              ))}
            </div>

            <div style={{ maxWidth: '400px', background: 'linear-gradient(135deg, rgba(100,150,255,0.15) 0%, rgba(100,150,255,0.05) 100%)', border: '1px solid rgba(100,150,255,0.3)', borderRadius: '14px', padding: '24px' }}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: 'rgba(224,224,224,0.7)', marginBottom: '8px', fontWeight: '600' }}>{language === 'ko' ? '프로젝트 이름' : 'Project Name'}</label>
                <input type="text" id="project-name-cp" placeholder={language === 'ko' ? '예: 내 앱' : 'e.g. My App'} style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, rgba(100,150,255,0.15) 0%, rgba(100,150,255,0.05) 100%)', border: '1px solid rgba(100,150,255,0.3)', borderRadius: '8px', color: '#e0e0e0', fontSize: '13px' }} />
              </div>

              <button onClick={async () => {
                const projectName = (document.getElementById('project-name-cp') as HTMLInputElement)?.value;
                if (!projectName) { alert(language === 'ko' ? '프로젝트 이름을 입력해주세요' : 'Please enter project name'); return; }
                try {
                  setResponse(language === 'ko' ? '🚀 생성 중...' : '🚀 Generating...');
                  const formData = new FormData();
                  formData.append('project_name', projectName);
                  formData.append('design_type', 'responsive');
                  formData.append('colors', JSON.stringify({primary: '#646cff', secondary: '#333333', accent: '#FFD700'}));
                  const res = await fetch(`${apiUrl}/cross-platform/generate`, { method: 'POST', body: formData });
                  const result = await res.json();
                  if (result.status === 'success') {
                    setResponse(`✅ ${language === 'ko' ? '완료!' : 'Done!'}\n\n🌐 ${language === 'ko' ? '생성된 플랫폼' : 'Generated'}\n${result.platforms_generated.map((p: string) => `• ${p}`).join('\n')}`);
                  } else {
                    setResponse(`❌ ${result.message}`);
                  }
                } catch (error) { setResponse(`❌ ${error}`); }
              }} style={{ width: '100%', padding: '12px', background: '#646cff', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', transition: 'all 0.3s' }}>
                {language === 'ko' ? '생성' : 'Generate'}
              </button>

              {response && (
                <div style={{ marginTop: '20px', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(100,150,255,0.2)', maxHeight: '200px', overflowY: 'auto', fontSize: '11px', color: '#cbd5e1', whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
                  {response}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );

    // 📌 기능 6: 실시간 성능 최적화
    if (activeTab === 'performance') return <div style={{ display: 'flex', flex: 1, width: '100%', height: '100%', overflow: 'auto' }}><PerformanceDashboard /></div>;

    // 📌 기능 8: 디자인 버전 관리
    if (activeTab === 'version-control') return <div style={{ display: 'flex', flex: 1, width: '100%', height: '100%', overflow: 'auto' }}><VersionControlDashboard /></div>;

    // 📌 기능 7: 음성 디자인 명령
    if (activeTab === 'voice-design') return <div style={{ display: 'flex', flex: 1, width: '100%', height: '100%', overflow: 'auto' }}><VoiceDesignDashboard /></div>;

    // 📌 기능 9: 다국어 문화별 최적화
    if (activeTab === 'multilingual') return <div style={{ display: 'flex', flex: 1, width: '100%', height: '100%', overflow: 'auto' }}><MultilingualDashboard /></div>;

    // 📌 기능 1: 실시간 협업 디자인
    if (activeTab === 'collaboration') return <div style={{ display: 'flex', flex: 1, width: '100%', height: '100%', overflow: 'auto' }}><CollaborationDashboard /></div>;

    // 📌 기능 2: AI 기반 자동 레이아웃
    if (activeTab === 'auto-layout') return <div style={{ display: 'flex', flex: 1, width: '100%', height: '100%', overflow: 'auto' }}><AutoLayoutDashboard /></div>;

    // 📌 기능 10: AR/VR 미리보기
    if (activeTab === 'xr-preview') return <div style={{ display: 'flex', flex: 1, width: '100%', height: '100%', overflow: 'auto' }}><XRPreviewDashboard /></div>;
    if (activeTab === 'deployment') return <div style={{ display: 'flex', flex: 1, width: '100%', height: '100%', overflow: 'auto' }}><CloudDeployScreen /></div>;
    if (activeTab === 'quick-start') {
      return <div style={{ display: 'flex', flex: 1, width: '100%', height: '100%', overflow: 'auto' }}><QuickStartDashboard onSelectItem={handleQuickStartSelect} /></div>;
    }

      return (
        <div className={`chat-content-area animate-in ${chatMode === 'dev' ? 'forge-mode' : ''} ${canvas && chatMode !== 'dev' ? 'canvas-open' : ''}`}>
          {canvas && chatMode !== 'dev' && (
            <CanvasPanel title={canvas.title} content={canvas.content}
              onChange={(text) => setCanvas((c) => (c ? { ...c, content: text } : c))}
              onClose={() => setCanvas(null)} />
          )}
          {chatMode === 'dev' && (
            <ForgePanel
              workspace={devWorkspace}
              tasks={chatHistory.filter((c) => c.devResult).map((c) => ({ id: c.id, title: c.title, date: c.date }))}
              activeTaskId={currentChat?.id ?? null}
              result={currentChat?.devResult}
              onSelectTask={(id) => {
                const chat = chatHistory.find((c) => c.id === id);
                if (chat) handleSelectChat(chat);
              }}
            />
          )}
          <header className="viewport-header">
          {currentChat && (
            <button className="share-btn" onClick={exportCurrentChat} title={language === 'ko' ? '대화 내보내기 (.md)' : 'Export chat (.md)'}>
              <Download size={16} />
            </button>
          )}
          {currentChat && !temporaryChat && (
            <button className="share-btn" onClick={shareCurrentChat} title={language === 'ko' ? '대화 공유 (링크 복사)' : 'Share chat'}>
              <Share2 size={16} />
            </button>
          )}
        </header>

        <section className="chat-viewport">
          {currentChat ? (
            <div className="chat-messages">
              <div key={currentChat.id} className="message-group">
                <div className="message-bubble user">
                  {editingQuestion !== null ? (
                    <div className="question-editor">
                      <textarea
                        autoFocus
                        value={editingQuestion}
                        onChange={(e) => setEditingQuestion(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') setEditingQuestion(null);
                          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                            e.preventDefault();
                            resendEditedQuestion(editingQuestion);
                          }
                        }}
                      />
                      <div className="question-editor-actions">
                        <button type="button" onClick={() => setEditingQuestion(null)}>취소</button>
                        <button type="button" className="primary" disabled={!editingQuestion.trim()} onClick={() => resendEditedQuestion(editingQuestion)}>보내기</button>
                      </div>
                    </div>
                  ) : (
                    <div className="message-content">{currentChat.input}</div>
                  )}
                </div>
                {editingQuestion === null && !pendingImage && !pendingTool && (
                  <div className="user-message-actions">
                    <button type="button" className="user-action-btn" title="질문 수정" aria-label="질문 수정" onClick={() => setEditingQuestion(currentChat.input || '')}>
                      <Pencil size={14} />
                    </button>
                  </div>
                )}
                <div className="message-bubble ai">
                  <div className="bubble-header">LARS Prism AI</div>
                  {currentChat.feature && (
                    <div className="feature-result-bar">
                      <span className="feature-result-badge-chat">{currentChat.feature.label} · {currentChat.feature.engine} <em className="feature-result-note">AI 초안 · 실데이터 미연결</em></span>
                      <button className="feature-result-open" onClick={() => setActiveTab(currentChat.feature!.tab as any)}>
                        화면에서 열기
                      </button>
                    </div>
                  )}
                  {pendingTool && pendingTool.chatId === currentChat.id ? (
                    pendingTool.tool === 'ppt' ? (
                      <ToolGenerationProgress
                        title="발표 자료 제작 중"
                        icon={<PresentationSvgIcon size={16} color="#a78bfa" />}
                        startedAt={pendingTool.startedAt}
                        detail={pendingTool.detail}
                        expectedMs={120_000}
                        stages={['개요 작성 중', '슬라이드 구성 중', '파일 만드는 중', '최종 확인 중']}
                        note="발표 자료는 보통 1~2분 걸립니다. 완료되면 자동으로 표시되고 내려받을 수 있습니다."
                      />
                    ) : (
                      <ToolGenerationProgress
                        title="심층 리서치 중"
                        icon={<Search size={16} />}
                        startedAt={pendingTool.startedAt}
                        detail={pendingTool.detail}
                        expectedMs={180_000}
                        stages={['자료 검색 중', '출처 읽는 중', '보고서 작성 중', '최종 확인 중']}
                        note="여러 자료를 찾아 읽느라 2~3분 걸릴 수 있습니다. 완료되면 출처와 함께 표시됩니다."
                      />
                    )
                  ) : pendingImage && pendingImage.chatId === currentChat.id ? (
                    <ImageGenerationProgress startedAt={pendingImage.startedAt} prompt={pendingImage.prompt} />
                  ) : currentChat.imageUrl ? (
                    <div style={{ width: '100%' }}>
                      <img
                        src={currentChat.imageUrl}
                        alt={currentChat.input}
                        style={{ width: '100%', height: 'auto', borderRadius: '12px', display: 'block' }}
                      />
                      <a href={currentChat.imageUrl} target="_blank" rel="noreferrer" download style={{ display: 'inline-block', marginTop: '8px', fontSize: '13px', color: 'var(--accent-blue)' }}>
                        <Download size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} />이미지 다운로드
                      </a>
                    </div>
                  ) : generationMode === 'workspace' && workspaceSteps.length > 0 ? (
                    <div>
                      <WorkspaceResult
                        steps={workspaceSteps}
                        language={language}
                        finalResult={currentChat.response}
                        onCheckpointApprove={(stepNumber, checkpointId) => {
                          // 체크포인트 승인 처리
                          setWorkspaceSteps((prevSteps) => {
                            const updated = JSON.parse(JSON.stringify(prevSteps));
                            const step = updated[stepNumber - 1];
                            if (step && step.checkpoints) {
                              const checkpoint = step.checkpoints.find((c: any) => c.id === checkpointId);
                              if (checkpoint) {
                                checkpoint.status = 'approved';
                                checkpoint.resolvedAt = Date.now();
                              }
                            }
                            return updated;
                          });
                          console.log(`[WORKFLOW] ✅ Checkpoint ${checkpointId} approved`);
                        }}
                        onCheckpointReject={(stepNumber, checkpointId, reason) => {
                          // 체크포인트 거부 처리
                          setWorkspaceSteps((prevSteps) => {
                            const updated = JSON.parse(JSON.stringify(prevSteps));
                            const step = updated[stepNumber - 1];
                            if (step && step.checkpoints) {
                              const checkpoint = step.checkpoints.find((c: any) => c.id === checkpointId);
                              if (checkpoint) {
                                checkpoint.status = 'rejected';
                                checkpoint.feedback = reason;
                                checkpoint.resolvedAt = Date.now();
                              }
                            }
                            return updated;
                          });
                          console.log(`[WORKFLOW] ❌ Checkpoint ${checkpointId} rejected: ${reason}`);
                        }}
                        onPathSelect={(stepNumber, checkpointId, optionId) => {
                          // 경로 선택 처리
                          setWorkspaceSteps((prevSteps) => {
                            const updated = JSON.parse(JSON.stringify(prevSteps));
                            const step = updated[stepNumber - 1];
                            if (step && step.checkpoints) {
                              const checkpoint = step.checkpoints.find((c: any) => c.id === checkpointId);
                              if (checkpoint) {
                                checkpoint.selectedOptionId = optionId;
                                checkpoint.status = 'approved';
                                checkpoint.resolvedAt = Date.now();
                              }
                            }
                            return updated;
                          });
                          console.log(`[WORKFLOW] 🔀 Path selected: ${optionId}`);
                        }}
                        agentPoolState={agentPoolState}
                      />
                    </div>
                  ) : activeModel === 'Rekora' ? (
                    <div>
                      <RekoraImageGenerator prompt={currentChat.input} />
                      <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '8px', fontSize: '13px', color: '#c0c0c0' }}>
                        ✨ Rekora 엔진으로 {currentChat.input}에 대한 이미지를 생성했습니다.
                      </div>
                    </div>
                  ) : generationType && generationType !== 'chat' && generationMetadata && currentChat.response === response ? (
                    <GenerationResult
                      content={currentChat.response}
                      generationType={generationType}
                      format={generationMetadata.primary_format || 'txt'}
                      metadata={generationMetadata}
                      language={language}
                    />
                  ) : (
                    <div>
                      <CodeAgentRenderer content={currentChat.response} onApplyPatch={handleApplyPatch} onAppControl={handleAppControl} tokens={currentTokens} />
                      {searchSources && searchSources.length > 0 && (
                        <SourceCitations sources={searchSources} language={language} />
                      )}
                    </div>
                  )}
                  {currentChat.thinking && (
                    <details className="thinking-block">
                      <summary>생각 과정</summary>
                      <pre>{currentChat.thinking}</pre>
                    </details>
                  )}
                  {currentChat.devResult && (chatMode === 'dev'
                    ? <div className="forge-hint">변경 사항과 작업 과정은 오른쪽 패널에서 검토하세요.</div>
                    : <DevResultCard result={currentChat.devResult} />)}
                  {currentChat.sources && currentChat.sources.length > 0 && (
                    <div className="chat-sources">
                      {currentChat.sources.map((src, i) => (
                        <a key={`${src.url}-${i}`} href={src.url} target="_blank" rel="noreferrer">[{i + 1}] {src.title || src.url}</a>
                      ))}
                    </div>
                  )}
                  {currentChat.artifact && (
                    <button className="artifact-download" onClick={() => downloadBase64(currentChat.artifact!.name, currentChat.artifact!.mime, currentChat.artifact!.base64)}>
                      <ArtifactFileIcon kind={currentChat.artifact.name.toLowerCase().endsWith('.pptx') ? 'presentation' : 'document'} />
                      {currentChat.artifact.name} 내려받기
                    </button>
                  )}
                  {connectPrompts.filter(x => x.chatId === String(currentChat.id)).map(x => (
                    <ConnectPromptCard key={x.key} prompt={x.prompt} onOpen={() => setActiveTab('plugins')} onDismiss={() => setConnectPrompts(prev => prev.filter(y => y.key !== x.key))} />
                  ))}
                  {pluginProposals.filter(x => x.chatId === String(currentChat.id)).map(x => (
                    <PluginApprovalCard key={x.key} proposal={x.proposal} onDismiss={() => setPluginProposals(prev => prev.filter(y => y.key !== x.key))} />
                  ))}
                  {currentChat.response && !currentChat.imageUrl && !(pendingImage && pendingImage.chatId === currentChat.id) && !(pendingTool && pendingTool.chatId === currentChat.id) && (
                    <MessageActions text={currentChat.response} messageId={`${currentChat.id}`} language={language}
                      onOpenCanvas={chatMode === 'dev' ? undefined : () => setCanvas({ title: currentChat.title, content: currentChat.response })}
                      onRegenerate={chatMode === 'dev' ? undefined : () => reopenLastQuestion(true)} />
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="welcome-screen">
              {chatMode === 'dev' ? (
                <div className="forge-welcome">
                  <div className="forge-welcome-icon"><Code2 size={28} /></div>
                  <h2>무엇을 만들거나 고칠까요?</h2>
                  <p className="forge-welcome-path">{devWorkspace.trim() ? devWorkspace : '사이드바에서 작업 폴더를 먼저 선택하세요'}</p>
                  <div className="forge-welcome-examples">
                    {['README의 제목을 바꿔줘', '로그인 함수의 버그를 찾아 고쳐줘', '테스트가 없는 모듈에 테스트를 추가해줘', '사용하지 않는 import를 정리해줘'].map((example) => (
                      <button key={example} onClick={() => setInput(example)}>{example}</button>
                    ))}
                  </div>
                </div>
              ) : (
                <h2>{getGreeting().title}</h2>
              )}
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
                      // 기존 대화에 메시지 추가 또는 새 대화 생성
                      if (currentChat) {
                        // 기존 대화에 메시지 추가 (같은 세션 계속)
                        const updatedMessages = [
                          ...currentChat.messages,
                          { role: 'user', content: harmonizedData.prompt },
                          { role: 'assistant', content: fullContent }
                        ];
                        const updatedChat: ChatItem = {
                          ...currentChat,
                          response: fullContent,
                          messages: updatedMessages
                        };

                        const updatedHistory = chatHistory.map(chat =>
                          chat.id === currentChat.id ? updatedChat : chat
                        );

                        setChatHistory(updatedHistory);
                        localStorage.setItem('lars_chat_history', JSON.stringify(updatedHistory));
                        setCurrentChat(updatedChat);
                      } else {
                        // 새로운 대화 시작
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
                        setCurrentChat(newChat);
                      }
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
          <div style={{
            maxWidth: '900px',
            margin: '1rem auto 0',
            width: '100%',
            boxSizing: 'border-box'
          }}>
            {attachedFiles.length > 0 && (
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                padding: '12px 16px',
                background: 'rgba(0,0,0,0.2)',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '28px 28px 0 0'
              }}>
                {attachedFiles.map(file => (
                  <div key={file.path} style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 12px',
                    background: 'rgba(59, 130, 246, 0.15)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontSize: '13px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(59, 130, 246, 0.25)';
                    e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)';
                    e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '24px',
                      height: '24px',
                      background: 'rgba(59, 130, 246, 0.3)',
                      borderRadius: '4px',
                      position: 'relative',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      color: '#60a5fa'
                    }}>
                      <span style={{
                        position: 'absolute',
                        fontSize: '12px',
                        lineHeight: '1'
                      }}>
                        {file.name.endsWith('.pdf') ? 'PDF' :
                         file.name.endsWith('.txt') ? 'TXT' :
                         file.name.endsWith('.docx') || file.name.endsWith('.doc') ? 'DOC' :
                         file.name.endsWith('.xlsx') || file.name.endsWith('.xls') ? 'XLS' :
                         file.name.endsWith('.pptx') || file.name.endsWith('.ppt') ? 'PPT' :
                         file.name.endsWith('.png') || file.name.endsWith('.jpg') || file.name.endsWith('.jpeg') ? 'IMG' :
                         file.name.endsWith('.zip') || file.name.endsWith('.rar') ? 'ZIP' :
                         '📎'}
                      </span>
                    </div>
                    <span style={{
                      color: '#d1d5db',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: '150px'
                    }}>
                      {file.name}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setAttachedFiles(attachedFiles.filter(f => f.path !== file.path));
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#9ca3af',
                        cursor: 'pointer',
                        fontSize: '12px',
                        padding: '0 4px',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '#9ca3af')}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="input-container" style={{
              margin: attachedFiles.length > 0 ? '0' : '1rem auto 3.5rem',
              borderRadius: attachedFiles.length > 0 ? '0 0 28px 28px' : '28px'
            }}>
            <div className="input-left">
              <div className="add-menu-wrapper">
                <button className={`add-btn ${showAddMenu ? 'active' : ''}`} onClick={() => setShowAddMenu(!showAddMenu)} title="기능 추가">
                  <Plus size={24} />
                </button>
              {showAddMenu && (
                <div className="add-menu-dropdown">
                  <div className="add-menu-group">
                    <div className="add-menu-group-title">자료 가져오기</div>
                  <button className="menu-item" onClick={() => { document.getElementById('chat-attach-input')?.click(); setShowAddMenu(false); }}>
                    <FolderPlus size={18} className="menu-plain-icon" />
                    <span className="item-text">파일·사진 첨부</span>
                  </button>
                  <button className="menu-item" onClick={() => { setComposerTool(composerTool === 'scrape' ? 'none' : 'scrape'); setShowAddMenu(false); }}>
                    <Globe size={18} className="menu-plain-icon" />
                    <span className="item-text">웹 페이지 읽기</span>
                  </button>
                  <button className="menu-item" onClick={() => { setComposerTool(composerTool === 'web' ? 'none' : 'web'); setShowAddMenu(false); }}>
                    <Search size={18} className="menu-plain-icon" />
                    <span className="item-text">웹 검색</span>
                  </button>
                  <button className="menu-item" onClick={() => { setComposerTool(composerTool === 'research' ? 'none' : 'research'); setShowAddMenu(false); }}>
                    <Search size={18} className="menu-plain-icon" />
                    <span className="item-text">심층 리서치</span>
                  </button>
                  </div>
                  <div className="add-menu-group">
                    <div className="add-menu-group-title">만들기</div>
                  <button className="menu-item" onClick={() => { setComposerTool(composerTool === 'ppt' ? 'none' : 'ppt'); setShowAddMenu(false); }}>
                    <PresentationIcon size={18} className="menu-plain-icon" />
                    <span className="item-text">발표 자료 만들기</span>
                  </button>
                  <button className="menu-item" onClick={() => { setComposerTool(composerTool === 'doc' ? 'none' : 'doc'); setShowAddMenu(false); }}>
                    <FileText size={18} className="menu-plain-icon" />
                    <span className="item-text">문서 작성</span>
                  </button>
                  <button className="menu-item" onClick={() => { setComposerTool(composerTool === 'image' ? 'none' : 'image'); setShowAddMenu(false); }}>
                    <Palette size={18} className="menu-plain-icon" />
                    <span className="item-text">이미지 생성</span>
                  </button>
                  </div>
                  <div className="add-menu-group">
                    <div className="add-menu-group-title">분석·점검</div>
                  <button className="menu-item" onClick={() => { setActiveTab('warehouse'); setShowAddMenu(false); }}>
                    <Database size={18} className="menu-plain-icon" />
                    <span className="item-text">데이터 웨어하우스</span>
                  </button>
                  <button className="menu-item" onClick={() => { setActiveTab('plugins'); setShowAddMenu(false); }}>
                    <Puzzle size={18} className="menu-plain-icon" />
                    <span className="item-text">앱 및 확장</span>
                  </button>
                  <button className="menu-item" onClick={() => { setComposerTool(composerTool === 'data' ? 'none' : 'data'); setShowAddMenu(false); }}>
                    <BarChart3 size={18} className="menu-plain-icon" />
                    <span className="item-text">데이터 분석 (CSV)</span>
                  </button>
                  <button className="menu-item" onClick={() => { setComposerTool(composerTool === 'seo' ? 'none' : 'seo'); setShowAddMenu(false); }}>
                    <Stethoscope size={18} className="menu-plain-icon" />
                    <span className="item-text">SEO 진단</span>
                  </button>
                  </div>
                </div>
              )}
            </div>
            <button
              className={`file-attach-btn ${chatAttachments.length > 0 ? 'has-files' : ''}`}
              onClick={() => document.getElementById('chat-attach-input')?.click()}
              title={chatAttachments.length > 0 ? `${chatAttachments.length}개 파일 첨부됨` : "파일 첨부"}
            >
              <FolderPlus size={20} />
              {attachedFiles.length > 0 && <span style={{ marginLeft: '4px', fontSize: '12px', fontWeight: 'bold' }}>{attachedFiles.length}</span>}
            </button>
            {executionMode === 'dev' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                <button
                  className={`agent-mode-toggle ${useSubAgentMode ? 'active' : ''}`}
                  onClick={() => setUseSubAgentMode(!useSubAgentMode)}
                  title={useSubAgentMode ? '에이전트 모드 비활성화' : '에이전트 모드 활성화'}
                >
                  <Users size={14} />
                  <span>에이전트 모드 {useSubAgentMode ? 'ON' : 'OFF'}</span>
                </button>
              </div>
            )}
            </div>

        <input id="chat-attach-input" type="file" hidden multiple accept=".txt,.md,.csv,.xlsx,.xls,.json,.pdf,.docx,.png,.jpg,.jpeg,.tif,.tiff,.bmp,.webp,.py,.js,.ts,.html,.xml,.log" onChange={async (e) => { const files = Array.from(e.target.files || []); e.target.value = ""; setAttachBusy(true); for (const f of files) { try { const up = await uploadChatAttachment(f); setChatAttachments((prev) => [...prev, up]); } catch (err) { alert(`${f.name}: ${(err as Error).message}`); } } setAttachBusy(false); }} />
            {(() => {
              const inProject = projects.find((p) => p.id === (currentChat?.projectId ?? activeProjectId));
              return inProject ? (
                <div className="composer-chips">
                  <span className="composer-chip">📁 {inProject.name}<button onClick={() => setActiveProjectId(null)} aria-label="프로젝트 연결 끊기">×</button></span>
                </div>
              ) : null;
            })()}
            {(composerTool !== 'none' || chatAttachments.length > 0 || attachBusy) && (
              <div className="composer-chips">
                {composerTool !== 'none' && (
                  <span className="composer-chip">{TOOL_LABELS[composerTool]}<button onClick={() => setComposerTool('none')} aria-label="모드 끄기">×</button></span>
                )}
                {chatAttachments.map((att) => (
                  <span key={att.id} className="composer-chip">📎 {att.name}{att.truncated ? ' (일부)' : ''}<button onClick={() => setChatAttachments((prev) => prev.filter((x) => x.id !== att.id))} aria-label="첨부 빼기">×</button></span>
                ))}
                {attachBusy && <span className="composer-chip">파일 읽는 중...</span>}
              </div>
            )}
            <textarea
              placeholder={TEXTS[language as keyof typeof TEXTS]?.inputPlaceholder || '커리큘럼 입력하세요 (Shift+Enter로 줄바꿈)'}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCommand(); } }}
            />

            <div className="input-right">
          <div className="model-selector-wrapper composer-model-picker">
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
                    { id: 'Luminaic', name: 'Luminaic', model: 'Logic & Analysis', desc: 'LARS 신경망 기반 대규모 분석', tab: 'extended' },
                    { id: 'Aivora', name: 'Aivora', model: 'Emotional AI', desc: 'LARS 신경망 기반 감정 분석', tab: 'extended' },
                    { id: 'Rekora', name: 'Rekora', model: '3D Design', desc: 'LARS 신경망 기반 3D 설계', tab: 'extended' },
                    { id: 'Synzora', name: 'Synzora', model: 'Data Graph', desc: 'LARS 신경망 기반 그래프 분석', tab: 'extended' },
                    { id: 'K-EXAONE', name: 'K-EXAONE 2.5', model: 'LG AI Research', desc: '에이전트형 한국어 모델', tab: 'extended' }
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
            </div>
          </div>
          </div>
        </footer>

        {!currentChat && (
          <footer className="company-footer">
            <div className="company-details">
              <p className="company-details-text">
                상호명: 엘에이알에스(LARS Inc.) | 대표자: 남종수 | 사업자등록번호: 373-35-01874 | 통신판매신고번호: 2025-서울서초-3944
              </p>
              <p className="company-details-text">
                고객센터: {import.meta.env.VITE_CONTACT_EMAIL || 'lars@lars-technologies.com'} | 운영시간: 평일 10:00 – 18:00 | 본사: 서울시 마포구 월드컵북로350, 401호
              </p>
              <p className="company-copyright">© 2026 LARS Technologies. All rights reserved.</p>
            </div>
          </footer>
        )}
      </div>
    );
    } catch (error) {
      console.error('렌더링 오류:', error);
      return (
        <div style={{ display: 'flex', flex: 1, width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}>
          <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(0, 0, 0, 0.3)', borderRadius: '12px', border: '1px solid rgba(100, 150, 255, 0.3)', maxWidth: '400px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>❌</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ff6b6b', marginBottom: '1rem' }}>오류: Load failed</div>
            <div style={{ fontSize: '0.9rem', color: '#cbd5e1', marginBottom: '1.5rem', lineHeight: '1.6' }}>
              페이지를 로드하는 중에 문제가 발생했습니다.
              <br />
              {language === 'ko' ? '홈으로 돌아가거나 새로고침을 시도해주세요.' : 'Please try refreshing or going back home.'}
            </div>
            <button
              onClick={() => {
                setActiveTab('chat');
                window.location.reload();
              }}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'linear-gradient(135deg, #6496ff, #4975d4)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.9rem'
              }}
            >
              {language === 'ko' ? '새로고침' : 'Refresh'}
            </button>
          </div>
        </div>
      );
    }
  };

  // 인증되지 않으면 로그인/회원가입 페이지 표시 (필수)
  if (!isAuthenticated) {
    return (
      <Auth
        onAuthSuccess={() => {
          const token = getToken();
          if (token) {
            const user = getStoredUser();
            if (user) {
              setAuthUser(user);
              setUser({
                name: user.username,
                email: user.email,
                avatarUrl: null  // 기본 아바타 사용 (사용자명 첫 글자)
              });
              setIsAuthenticated(true);
              console.log('[AUTH] 로그인 완료:', user.username);
            }
          }
        }}
      />
    );
  }

  const handleOnboardingComplete = () => {
    localStorage.setItem('onboarding_completed', 'true');
    setShowOnboarding(false);
  };

  // 아이콘 막대 모드는 쓰지 않는다. 접히면 사이드바 전체가 사라진다.
  const railCollapsed = false;
  // 대화 검색: 제목뿐 아니라 질문과 답변 내용까지 찾는다
  const sidebarChats = (() => {
    const q = sidebarSearch.trim().toLowerCase();
    if (!q) return chatHistory;
    return chatHistory.filter((chat) => {
      const parts = [chat.title || '', chat.input || '', chat.response || '', ...(chat.messages || []).map((m) => m.content || '')];
      return parts.some((p) => p.toLowerCase().includes(q));
    });
  })();
  return (
    <>
      {showOnboarding && <OnboardingFlow onComplete={handleOnboardingComplete} onSkip={handleOnboardingComplete} />}
      <div className={`app-container ${sidebarCollapsed ? 'sidebar-hidden' : ''}`}>
        {sidebarCollapsed && (
          <button className="sidebar-open-btn" onClick={() => setSidebarCollapsed(false)} title={language === 'ko' ? '사이드바 열기 (⌘B)' : 'Open sidebar (⌘B)'}>
            <PanelLeft size={18} />
          </button>
        )}
        {isNarrow && !sidebarCollapsed && (
          <div className="sidebar-backdrop" onClick={() => setSidebarCollapsed(true)} />
        )}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <img src="/app-logo.png" className="logo-img" alt="Logo" />
            {!railCollapsed && (
              <div className="mode-switcher">
                <button className="mode-switcher-btn" onClick={() => setModeMenuOpen((v) => !v)} aria-haspopup="menu" aria-expanded={modeMenuOpen}>
                  <span className="logo-text">{chatMode === 'dev' ? 'Forge' : 'LARS Prism'}</span>
                  <ChevronDown size={16} className={`mode-switcher-chevron ${modeMenuOpen ? 'open' : ''}`} />
                </button>
                {modeMenuOpen && (
                  <>
                    <div className="mode-menu-backdrop" onClick={() => setModeMenuOpen(false)} />
                    <div className="mode-menu" role="menu">
                      <button className={`mode-menu-item ${chatMode === 'chat' ? 'active' : ''}`} role="menuitem"
                        onClick={() => { setChatMode('chat'); setModeMenuOpen(false); }}>
                        <div className="mode-menu-text">
                          <div className="mode-menu-title">LARS Prism</div>
                          <div className="mode-menu-sub">대화하고 분석하기</div>
                        </div>
                        {chatMode === 'chat' && <CheckIcon size={16} />}
                      </button>
                      <button className={`mode-menu-item ${chatMode === 'dev' ? 'active' : ''}`} role="menuitem"
                        onClick={() => { setChatMode('dev'); setModeMenuOpen(false); }}>
                        <div className="mode-menu-text">
                          <div className="mode-menu-title">Forge</div>
                          <div className="mode-menu-sub">코드베이스를 읽고, 고치고, 제안하기</div>
                        </div>
                        {chatMode === 'dev' && <CheckIcon size={16} />}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          <button className="sidebar-toggle-btn" onClick={() => setSidebarCollapsed(true)} title={language === 'ko' ? '사이드바 닫기 (⌘B)' : 'Close sidebar (⌘B)'}>
            <PanelLeft size={16} />
          </button>
        </div>
        <div className="sidebar-nav">
          <button className={`nav-item ${activeTab === 'chat' && !currentChat ? 'active' : ''}`} onClick={() => { setActiveTab('chat'); setActiveProjectId(null); handleNewChat(); }}>
            <MessageSquare size={20} /> {!railCollapsed && <span>{language === 'ko' ? '새 채팅' : 'New chat'}</span>}
          </button>
          <button className={`nav-item ${temporaryChat ? 'active' : ''}`} onClick={() => setTemporaryChat((v) => !v)} title={language === 'ko' ? '임시 채팅 (기록에 저장하지 않음)' : 'Temporary chat'}>
            <Ghost size={20} /> {!railCollapsed && <span>{language === 'ko' ? (temporaryChat ? '임시 채팅 끄기' : '임시 채팅') : (temporaryChat ? 'Turn off temporary' : 'Temporary chat')}</span>}
          </button>
          <button className={`nav-item ${activeTab === 'agents' ? 'active' : ''}`} onClick={() => setActiveTab('agents')} title="Pilot (자율 에이전트)">
            <Bot size={20} /> {!railCollapsed && <span>Pilot</span>}
          </button>
          <button className={`nav-item ${activeTab === 'scheduled' ? 'active' : ''}`} onClick={() => setActiveTab('scheduled')} title={language === 'ko' ? '예약 작업' : 'Scheduled tasks'}>
            <CalendarClock size={20} /> {!railCollapsed && <span>{language === 'ko' ? '예약 작업' : 'Scheduled'}</span>}
          </button>
          <button className={`nav-item ${voiceConversation ? 'active' : ''}`} onClick={toggleVoiceConversation} title={language === 'ko' ? '음성 대화' : 'Voice conversation'}>
            <Mic size={20} /> {!railCollapsed && <span>{language === 'ko' ? (voiceConversation ? '음성 대화 끄기' : '음성 대화') : (voiceConversation ? 'End voice' : 'Voice conversation')}</span>}
          </button>
          <button className={`nav-item ${activeTab === 'projects' ? 'active' : ''}`} onClick={() => setActiveTab('projects')} title={language === 'ko' ? '프로젝트' : 'Projects'}>
            <FolderOpen size={20} /> {!railCollapsed && <span>{language === 'ko' ? '프로젝트' : 'Projects'}</span>}
          </button>
          <button className={`nav-item ${activeTab === 'warehouse' ? 'active' : ''}`} onClick={() => setActiveTab('warehouse')} title="데이터 웨어하우스">
            <Database size={20} /> {!railCollapsed && <span>데이터 웨어하우스</span>}
          </button>
          <button className={`nav-item ${activeTab === 'plugins' ? 'active' : ''}`} onClick={() => setActiveTab('plugins')} title="앱 및 확장">
            <Puzzle size={20} /> {!railCollapsed && <span>앱 및 확장</span>}
          </button>          {!railCollapsed && chatMode === 'dev' && (
            <div className="sidebar-workspace">
              <input
                value={devWorkspace}
                onChange={(e) => updateDevWorkspace(e.target.value)}
                placeholder={language === 'ko' ? '작업 폴더 경로' : 'Workspace path'}
                title={devWorkspace}
              />
              <button onClick={pickDevWorkspace} title={language === 'ko' ? '폴더 선택' : 'Choose folder'}>
                <FolderOpen size={16} />
              </button>
            </div>
          )}
          {railCollapsed && (
            <button className={`nav-item ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')} title={language === 'ko' ? '대화 기록' : 'History'}>
              <History size={20} />
            </button>
          )}

        </div>
        {!railCollapsed && projects.length > 0 && (
          <div className="sidebar-history sidebar-projects">
            <div className="sidebar-history-header">
              <span>프로젝트</span>
              <button className="sidebar-history-more" onClick={() => { setProjectViewId(null); setActiveTab('projects'); }}>
                전체 보기
              </button>
            </div>
            <div className="sidebar-history-list">
              {projects.slice(0, 8).map((p) => (
                <button
                  key={p.id}
                  className={`sidebar-history-item ${activeProjectId === p.id ? 'active' : ''}`}
                  onClick={() => { setProjectViewId(p.id); setActiveTab('projects'); }}
                  title={p.name}
                >
                  📁 {p.name}
                </button>
              ))}
            </div>
          </div>
        )}
        {!railCollapsed && (
          <div className="sidebar-history">
            <div className="sidebar-history-header">
              <span>{language === 'ko' ? '최근 대화' : 'Recent'}</span>
              <button className="sidebar-history-more" onClick={() => setActiveTab('history')}>
                {language === 'ko' ? '전체 보기' : 'View all'}
              </button>
            </div>
            <input
              className="sidebar-history-search"
              value={sidebarSearch}
              onChange={(e) => setSidebarSearch(e.target.value)}
              placeholder={language === 'ko' ? '대화 내용 검색' : 'Search chats'}
            />
            <div className="sidebar-history-list">
              {sidebarChats.length === 0 && (
                <div className="sidebar-history-empty">
                  {chatHistory.length === 0
                    ? (language === 'ko' ? '아직 대화가 없습니다' : 'No conversations yet')
                    : (language === 'ko' ? '검색 결과가 없습니다' : 'No matches')}
                </div>
              )}
              {sidebarChats.slice(0, 50).map((chat) => (
                <div
                  key={chat.id}
                  className={`sidebar-history-row ${currentChat?.id === chat.id ? 'active' : ''}`}
                  onMouseLeave={() => setPendingDeleteId((prev) => (prev === chat.id ? null : prev))}
                >
                  <button
                    className="sidebar-history-item"
                    onClick={() => handleSelectChat(chat)}
                    title={chat.title}
                  >
                    {chat.title || (language === 'ko' ? '제목 없는 대화' : 'Untitled')}
                  </button>
                  {pendingDeleteId === chat.id ? (
                    <button
                      className="sidebar-history-confirm"
                      onClick={() => { setPendingDeleteId(null); handleDeleteChat(chat.id); }}
                      title={language === 'ko' ? '한 번 더 누르면 삭제됩니다' : 'Click again to delete'}
                    >
                      {language === 'ko' ? '삭제' : 'Delete'}
                    </button>
                  ) : (
                    <button
                      className="sidebar-history-delete"
                      onClick={() => setPendingDeleteId(chat.id)}
                      title={language === 'ko' ? '대화 삭제' : 'Delete chat'}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="sidebar-footer">
           <div className="sidebar-utility">
             <button className={`sidebar-utility-btn ${activeTab === 'deployment' ? 'active' : ''}`} onClick={() => setActiveTab('deployment')} title="클라우드 배포">
               <Cloud size={16} /> {!railCollapsed && <span>클라우드 배포</span>}
             </button>
             <button className={`sidebar-utility-btn ${activeTab === 'quick-start' ? 'active' : ''}`} onClick={() => setActiveTab('quick-start')} title="빠른 시작">
               <BookOpen size={16} /> {!railCollapsed && <span>빠른 시작</span>}
             </button>
           </div>
           <div className="profile-anchor">
             <div className="profile-summary" onClick={() => { setProfileMenuOpen((v) => !v); setLanguageMenuOpen(false); }}>
             <div className="avatar-small">
               {user?.avatarUrl ? (
                 <img src={user.avatarUrl} alt="Profile" className="avatar-image" />
               ) : (
                 user?.name ? user.name[0] : 'U'
               )}
             </div>
             {!railCollapsed && <div className="profile-info"><div className="profile-name">{user?.name}</div><div className="profile-email">{user?.email}</div></div>}
             </div>
             {profileMenuOpen && (
               <>
                 <div className="profile-menu-backdrop" onClick={() => { setProfileMenuOpen(false); setLanguageMenuOpen(false); }} />
                 <div className="profile-menu" role="menu">
                   <div className="profile-menu-email">{user?.email}</div>
                   <button className="profile-menu-item" onClick={() => { setProfileMenuOpen(false); setActiveTab('settings'); }}>
                     <SettingsIcon size={16} /> <span>{language === 'ko' ? '설정' : 'Settings'}</span>
                   </button>
                   <button className="profile-menu-item" onClick={() => { setProfileMenuOpen(false); setPersonalizeTab('instructions'); }}>
                     <Sparkles size={16} /> <span>{language === 'ko' ? '커스텀 지시' : 'Custom instructions'}</span>
                   </button>
                   <button className="profile-menu-item" onClick={() => { toggleThinking(); }}>
                     <Sparkles size={16} /> <span>{language === 'ko' ? (thinkingOn ? '사고 과정 끄기' : '사고 과정 보기') : (thinkingOn ? 'Hide reasoning' : 'Show reasoning')}</span>
                   </button>
                   <button className="profile-menu-item" onClick={() => { setProfileMenuOpen(false); setConnectorsOpen(true); }}>
                     <Share2 size={16} /> <span>{language === 'ko' ? '커넥터' : 'Connectors'}</span>
                   </button>
                   <button className="profile-menu-item" onClick={() => { setProfileMenuOpen(false); setPersonalizeTab('memory'); }}>
                     <Database size={16} /> <span>{language === 'ko' ? '메모리' : 'Memory'}</span>
                   </button>
                   <button className="profile-menu-item" onClick={() => setLanguageMenuOpen((v) => !v)}>
                     <GlobeIcon size={16} /> <span>{language === 'ko' ? '언어' : 'Language'}</span>
                     <ChevronRight size={14} className="profile-menu-chevron" />
                   </button>
                   {languageMenuOpen && (
                     <div className="profile-menu-sub">
                       {[['ko', '한국어'], ['en', 'English'], ['ja', '日本語'], ['zh', '中文']].map(([code, name]) => (
                         <button key={code} className={`profile-menu-item sub ${language === code ? 'selected' : ''}`} onClick={() => changeLanguage(code as 'ko' | 'en' | 'ja' | 'zh')}>
                           <span>{name}</span>
                         </button>
                       ))}
                     </div>
                   )}
                   <button className="profile-menu-item" onClick={() => { setProfileMenuOpen(false); setActiveTab('quick-start'); }}>
                     <HelpIcon size={16} /> <span>{language === 'ko' ? '도움 받기' : 'Help'}</span>
                   </button>
                   <button className="profile-menu-item" onClick={() => { setProfileMenuOpen(false); setShowAboutModal(true); }}>
                     <InfoIcon size={16} /> <span>{language === 'ko' ? '더 알아보기' : 'About'}</span>
                   </button>
                   <div className="profile-menu-divider" />
                   <button className="profile-menu-item danger" onClick={() => { setProfileMenuOpen(false); handleLogout(); }}>
                     <LogOut size={16} /> <span>{language === 'ko' ? '로그아웃' : 'Log out'}</span>
                   </button>
                 </div>
               </>
             )}
           </div>
        </div>
      </aside>
      <main className="main-content">
        {renderContent()}
        {ROUTED_TAB_ENGINE[activeTab] && <RoutedAssistantPanel key={activeTab} tab={activeTab} />}
      </main>

      {shareNotice && <div className="share-notice">{shareNotice}</div>}

      {connectorsOpen && <ConnectorsModal onClose={() => setConnectorsOpen(false)} />}

      {personalizeTab && (
        <PersonalizationModal tab={personalizeTab} onTab={setPersonalizeTab} onClose={() => setPersonalizeTab(null)} />
      )}

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

      {showConfirmDialog && (
        <div className="confirm-modal-backdrop" onClick={() => setShowConfirmDialog(false)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-header">
              <img src={`/app-logo.png?v=${Date.now()}`} alt="LARS Prism" className="confirm-icon" />
              <h3>LARS Prism</h3>
            </div>
            <p className="confirm-message">정말 모든 대화 기록을 삭제하시겠습니까?</p>
            <div className="confirm-buttons">
              <button
                className="confirm-cancel"
                onClick={() => setShowConfirmDialog(false)}
              >
                Cancel
              </button>
              <button
                className="confirm-ok"
                onClick={() => {
                  confirmAction?.();
                  setShowConfirmDialog(false);
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteNotification.show && (
        <div className="delete-notification-toast">
          <div className="delete-notification-content">
            ✅ {deleteNotification.message}
          </div>
        </div>
      )}
      </div>
    </>
  );
}

export default App;
