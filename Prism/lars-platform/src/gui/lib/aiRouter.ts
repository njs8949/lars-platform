export interface RoutedReply {
  reply: string;
  engine: string;
  backend: string;
  model: string;
}

export async function runRoutedAi(
  tab: string,
  message: string,
  history: { role: string; content: string }[] = []
): Promise<RoutedReply> {
  const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:8001/api' : '/api';
  const response = await fetch(`${apiUrl}/route/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tab, message, history })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || `HTTP ${response.status}`);
  }
  return data as RoutedReply;
}

export const ROUTED_TAB_ENGINE: Record<string, { engine: string; label: string }> = {
  scraping: { engine: 'lars-prime', label: 'LARS Prime' },
  ocr: { engine: 'lars-prime', label: 'LARS Prime' },
  'change-detection': { engine: 'lars-prime', label: 'LARS Prime' },
  seo: { engine: 'lars-cosmos', label: 'LARS Cosmos' },
  crm: { engine: 'lars-cosmos', label: 'LARS Cosmos' },
  workflows: { engine: 'lars-cosmos', label: 'LARS Cosmos' },
  presentation: { engine: 'lars-native', label: 'LARS Native' },
  integration: { engine: 'lars-native', label: 'LARS Native' },
  branding: { engine: 'rekora', label: 'Rekora' },
  'color-font': { engine: 'rekora', label: 'Rekora' },
  'auto-layout': { engine: 'rekora', label: 'Rekora' },
  collaboration: { engine: 'rekora', label: 'Rekora' },
  'xr-preview': { engine: 'rekora', label: 'Rekora' },
  'cross-platform': { engine: 'lars-native', label: 'LARS Native' },
  performance: { engine: 'lars-native', label: 'LARS Native' },
  'version-control': { engine: 'lars-native', label: 'LARS Native' },
  'voice-design': { engine: 'lars-native', label: 'LARS Native' },
  multilingual: { engine: 'lars-native', label: 'LARS Native' },
};

/** 화면 안의 칩이나 버튼이 해당 탭의 어시스턴트 패널을 열고 질문 초안을 채울 때 쓴다. */
export const ASSISTANT_PREFILL_EVENT = 'prism:assistant-prefill';

export function requestAssistant(tab: string, text: string): void {
  window.dispatchEvent(new CustomEvent(ASSISTANT_PREFILL_EVENT, { detail: { tab, text } }));
}

/** 답변 뒤에 보여 주는 후속 질문 칩. */
export const FOLLOW_UP_PROMPTS = [
  '핵심만 세 줄로 요약해 줘',
  '처음 보는 사람도 이해하도록 쉽게 설명해 줘',
  '다음에 할 일을 우선순위대로 정리해 줘',
  '놓쳤을 수 있는 위험이나 예외를 찾아 줘',
];

/** 탭마다 빈 화면에서 보여 주는 시작 질문 (기능과 맞는 질문만 둔다). */
export const TAB_STARTERS: Record<string, string[]> = {
  scraping: ['수집 주기를 어떻게 정하면 좋을까?', '차단되지 않으려면 무엇을 주의해야 해?', '수집 결과를 표로 정리하는 방법'],
  ocr: ['영수증에서 금액을 정확히 뽑는 방법', '인식 정확도가 낮을 때 점검할 것', '여러 장을 한 번에 처리하는 순서'],
  'change-detection': ['변경 알림을 너무 자주 받지 않으려면?', '약관 페이지 변경을 놓치지 않는 방법', '무시해도 되는 변경 유형 정리'],
  seo: ['키워드 순위를 올리는 우선순위', '경쟁사 키워드를 찾는 방법', '월간 SEO 점검 체크리스트'],
  crm: ['리드를 우선순위대로 정렬하는 기준', '휴면 고객에게 보낼 첫 메시지', '영업 파이프라인 단계 설계'],
  workflows: ['신규 리드 자동 분류 흐름 설계', '실패한 워크플로우를 복구하는 방법', '워크플로우 단계별 테스트 방법'],
  presentation: ['분기 실적 발표 슬라이드 구성', '청중에 맞는 슬라이드 분량', '한 장에 넣을 핵심 메시지 정하기'],
  integration: ['Slack 알림을 연결하는 순서', '연동 오류가 났을 때 확인할 것', '사용하지 않는 연결을 정리하는 기준'],
  branding: ['브랜드 이름에서 가이드 방향 잡기', '로고 사용 규칙 초안 작성', '브랜드 톤 앤 매너 정의'],
  'color-font': ['신뢰감을 주는 색상 조합', '본문과 제목에 어울리는 폰트 쌍', '접근성 대비 기준 점검'],
  'auto-layout': ['상품 상세 페이지 배치 추천', '모바일에서 깨지지 않는 그리드', '정보 우선순위에 따른 배치'],
  collaboration: ['리뷰 댓글을 효율적으로 주고받는 방법', '디자인 변경 이력 관리 방법', '팀원 권한을 나누는 기준'],
  'xr-preview': ['AR과 VR 중 어떤 미리보기가 맞을까?', '3D 모델을 가볍게 만드는 방법', '기기별 확인 체크리스트'],
  'cross-platform': ['한 디자인을 모바일과 웹에 맞추는 방법', '플랫폼별 버튼 크기 기준', '공통 컴포넌트 나누기'],
  performance: ['LCP를 줄이는 우선순위', '이미지 최적화 방법', '측정 결과를 팀에 설명하는 방법'],
  'version-control': ['커밋 메시지 초안 작성', '브랜치 정리 순서', '충돌을 안전하게 해결하는 방법'],
  'voice-design': ['음성 명령을 짧고 명확하게 만드는 법', '오인식을 줄이는 방법', '음성 명령 목록 설계'],
  multilingual: ['한국어 문구를 영어·일본어로 옮길 때 주의점', '문화권별 색상 의미 차이', '번역 검수 순서'],
};

/**
 * 채팅 요청을 하위 기능으로 연결한다.
 * 기능 이름과 실행 동사가 함께 있어야 기능으로 본다 (예: "SEO 키워드 순위 확인해줘").
 * "SEO가 뭐야?"처럼 실행을 요청하지 않는 질문은 일반 채팅으로 남긴다.
 */
const FEATURE_ACTION = /(분석|확인|측정|점검|정리|추천|생성|만들|작성|찾아|찾|수집|실행|등록|추적|감지|설계|가져|보여|알려|계산|조회|해줘|해 줘|해주세요|해 주세요)/;

export const FEATURE_INTENTS: { tab: string; label: string; pattern: RegExp }[] = [
  { tab: 'scraping', label: '웹 스크래핑', pattern: /(스크래핑|크롤링|웹\s?수집|페이지\s?수집)/i },
  { tab: 'ocr', label: 'OCR', pattern: /(\bOCR\b|문서\s?인식|텍스트\s?추출|영수증)/i },
  { tab: 'change-detection', label: '변경 감지', pattern: /(변경\s?감지|변화\s?감지|변경\s?알림|사이트\s?모니터링)/ },
  { tab: 'seo', label: 'SEO 분석', pattern: /(\bSEO\b|키워드\s?(순위|분석|발굴)|검색\s?순위)/i },
  { tab: 'crm', label: 'CRM', pattern: /(\bCRM\b|연락처|고객\s?관리|리드|영업\s?파이프라인)/i },
  { tab: 'workflows', label: '워크플로우', pattern: /(워크플로우|자동화\s?(흐름|workflow))/i },
  { tab: 'presentation', label: 'PPT 자동 생성', pattern: /(프레젠테이션|\bPPT\b|슬라이드|발표\s?자료)/i },
  { tab: 'integration', label: '통합 대시보드', pattern: /(서비스\s?연동|연동|\bSlack\b|\bGitHub\b|Google\s?Drive)/i },
  { tab: 'branding', label: '브랜딩 가이드', pattern: /(브랜드\s?가이드|브랜딩|로고\s?가이드)/ },
  { tab: 'color-font', label: '색상·폰트 추천', pattern: /(색상|컬러|폰트|팔레트)/ },
  { tab: 'auto-layout', label: '자동 레이아웃', pattern: /(자동\s?레이아웃|레이아웃\s?(추천|최적))/ },
  { tab: 'collaboration', label: '협업 디자인', pattern: /(협업\s?세션|공동\s?편집|디자인\s?공유)/ },
  { tab: 'xr-preview', label: 'AR/VR 미리보기', pattern: /(\bAR\b|\bVR\b|\bXR\b|증강현실|가상현실)/i },
  { tab: 'cross-platform', label: '크로스 플랫폼', pattern: /(크로스\s?플랫폼|멀티\s?플랫폼)/ },
  { tab: 'performance', label: '성능 최적화', pattern: /(성능\s?(분석|점검|최적)|\bLCP\b|로딩\s?속도)/i },
  { tab: 'version-control', label: '버전 관리', pattern: /(버전\s?관리|커밋|브랜치|\bgit\b)/i },
  { tab: 'voice-design', label: '음성 명령 디자인', pattern: /(음성\s?명령|음성\s?디자인)/ },
  { tab: 'multilingual', label: '다국어 최적화', pattern: /(다국어|번역|현지화|로컬라이즈)/ },
];

export function detectFeatureTab(message: string): string | null {
  const text = message.trim();
  if (!text || !FEATURE_ACTION.test(text)) return null;
  const hit = FEATURE_INTENTS.find((intent) => intent.pattern.test(text));
  return hit ? hit.tab : null;
}

export function featureLabel(tab: string): string {
  return FEATURE_INTENTS.find((intent) => intent.tab === tab)?.label ?? ROUTED_TAB_ENGINE[tab]?.label ?? tab;
}

/** 채팅에서 "○○ 열어줘"처럼 화면을 여는 요청. 사이드바 메뉴를 대신한다. */
const SCREEN_INTENTS: { tab: string; label: string; pattern: RegExp }[] = [
  { tab: 'workspace', label: 'Workspace', pattern: /(워크\s?스페이스|workspace)/i },
  { tab: 'statistics', label: '통계분석', pattern: /(통계\s?분석|통계분석|통계)/ },
  { tab: 'ecosystem', label: '에코시스템', pattern: /(에코\s?시스템|ecosystem)/i },
];

const OPEN_VERB = /(열어|열기|열고|띄워|보여|이동|가줘|가 줘|켜줘|켜 줘|들어가|화면)/;

export function detectScreenOpen(message: string): { tab: string; label: string } | null {
  const text = message.trim();
  if (!text || !OPEN_VERB.test(text)) return null;
  const screen = SCREEN_INTENTS.find((intent) => intent.pattern.test(text));
  if (screen) return { tab: screen.tab, label: screen.label };
  const feature = FEATURE_INTENTS.find((intent) => intent.pattern.test(text));
  return feature ? { tab: feature.tab, label: feature.label } : null;
}

/** K-EXAONE 2.5 (LG AI Research). 백엔드 .env의 EXAONE_* 설정을 쓴다. */
export async function runExaoneChat(
  message: string,
  history: { role: string; content: string }[] = []
): Promise<RoutedReply> {
  const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:8001/api' : '/api';
  const response = await fetch(`${apiUrl}/model/exaone/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || `HTTP ${response.status}`);
  }
  return data as RoutedReply;
}

/** K-EXAONE 2.5 스트리밍: 답변 조각이 도착할 때마다 onDelta에 지금까지의 전체 답변을 넘긴다. */
export async function runExaoneStream(
  message: string,
  history: { role: string; content: string }[],
  onDelta: (partial: string) => void
): Promise<string> {
  const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:8001/api' : '/api';
  const response = await fetch(`${apiUrl}/model/exaone/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history })
  });
  if (!response.ok || !response.body) {
    let detail = `HTTP ${response.status}`;
    try {
      const body = await response.json();
      detail = body.detail || detail;
    } catch {
      /* 본문이 JSON이 아니면 상태 코드만 쓴다 */
    }
    throw new Error(detail);
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let end = buffer.indexOf('\n\n');
    while (end >= 0) {
      const block = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      for (const line of block.split('\n')) {
        if (!line.startsWith('data:')) continue;
        const event = JSON.parse(line.slice(5).trim());
        if (event.type === 'delta') {
          full += event.text;
          onDelta(full);
        } else if (event.type === 'error') {
          throw new Error(event.detail);
        }
      }
      end = buffer.indexOf('\n\n');
    }
  }
  return full.trim();
}

/* ===== 개발 환경: 작업 폴더를 읽고 수정 제안을 만든 뒤, 사용자가 확인한 것만 적용한다 ===== */

export interface DevProposal {
  path: string;
  search: string;
  replace: string;
  diff: string;
}

export interface DevResult {
  summary: string;
  steps: string[];
  error: string | null;
  proposals: DevProposal[];
  workspace: string;
}

const apiBase = () => (window.location.hostname === 'localhost' ? 'http://localhost:8001/api' : '/api');

export async function runDevAgent(workspace: string, goal: string, maxSteps = 8): Promise<DevResult> {
  const response = await fetch(`${apiBase()}/dev/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workspace, goal, max_steps: maxSteps }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || `HTTP ${response.status}`);
  }
  return data as DevResult;
}

export async function applyDevProposals(
  workspace: string,
  proposals: DevProposal[]
): Promise<{ results: { path: string; ok: boolean; message: string }[]; backup: string }> {
  const response = await fetch(`${apiBase()}/dev/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      workspace,
      proposals: proposals.map((p) => ({ path: p.path, search: p.search, replace: p.replace })),
    }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || `HTTP ${response.status}`);
  }
  return data;
}
