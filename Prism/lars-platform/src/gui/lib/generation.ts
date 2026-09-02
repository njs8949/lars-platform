/**
 * Intelligent Generation Client Library
 * 프론티어 AI 방식 자동 생성 API 클라이언트
 */

export interface GenerationMetadata {
  type: string;
  primary_format: string;
  alternative_formats: string[];
  confidence: number;
  language: string;
  metadata: Record<string, any>;
  timestamp: string;
}

export interface ClassificationResult {
  generation_type: string;
  primary_format: string;
  alternative_formats: string[];
  confidence: number;
  reasoning: string;
  metadata: Record<string, any>;
}

export interface GenerationStreamChunk {
  type: 'metadata' | 'content' | 'complete' | 'error';
  data?: GenerationMetadata;
  chunk?: string;
  error?: string;
}

/**
 * 생성 타입 자동 감지
 */
export async function autoDetectGenerationType(
  message: string,
  context?: Record<string, any>[],
  language: string = 'ko'
): Promise<ClassificationResult> {
  const response = await fetch('/api/generation/auto-detect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      context,
      language,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to detect generation type');
  }

  return response.json();
}

/**
 * 콘텐츠 스트리밍 생성
 */
export async function* generateContentStream(
  message: string,
  context?: Record<string, any>[],
  language: string = 'ko'
): AsyncGenerator<string> {
  const response = await fetch('/api/generation/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      context,
      language,
      stream: true,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to generate content');
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // 줄 단위로 처리
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim()) {
          yield line;
        }
      }
    }

    // 남은 버퍼 처리
    if (buffer.trim()) {
      yield buffer;
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * 배치 생성 (비스트리밍)
 */
export async function generateContent(
  message: string,
  context?: Record<string, any>[],
  language: string = 'ko'
): Promise<{ content: string; metadata: GenerationMetadata }> {
  const response = await fetch('/api/generation/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      context,
      language,
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to generate content');
  }

  return response.json();
}

/**
 * 미리보기 정보 조회
 */
export async function getPreview(
  content: string,
  generationType: string,
  outputFormat: string
): Promise<Record<string, any>> {
  const response = await fetch('/api/generation/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content,
      generation_type: generationType,
      output_format: outputFormat,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to get preview');
  }

  const data = await response.json();
  return data.preview;
}

/**
 * 포맷 변환
 */
export async function convertFormat(
  content: string,
  fromFormat: string,
  toFormat: string
): Promise<string> {
  const response = await fetch('/api/generation/convert', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content,
      from_format: fromFormat,
      to_format: toFormat,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to convert format');
  }

  const data = await response.json();
  return data.content;
}

/**
 * 지원 포맷 조회
 */
export async function getSupportedFormats(): Promise<Record<string, any>> {
  const response = await fetch('/api/generation/formats');

  if (!response.ok) {
    throw new Error('Failed to get supported formats');
  }

  return response.json();
}

/**
 * 배치 생성 (여러 메시지)
 */
export async function batchGenerate(
  messages: string[],
  language: string = 'ko'
): Promise<Array<{ message: string; content: string; metadata: GenerationMetadata }>> {
  const response = await fetch('/api/generation/batch-generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages,
      language,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to batch generate');
  }

  const data = await response.json();
  return data.results;
}

/**
 * WebSocket 양방향 생성
 */
export class GenerationWebSocket {
  private ws: WebSocket | null = null;
  private url: string;

  constructor(url: string = 'ws://localhost:8000/api/generation/ws/generate') {
    this.url = url;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('Generation WebSocket connected');
          resolve();
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('Generation WebSocket disconnected');
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  send(message: string, context?: Record<string, any>[]): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    this.ws.send(
      JSON.stringify({
        message,
        context,
        language: 'ko',
      })
    );
  }

  onMessage(callback: (chunk: GenerationStreamChunk) => void): void {
    if (!this.ws) throw new Error('WebSocket not connected');

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        callback(data);
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    };
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

/**
 * 스트리밍 생성 Hook 유틸리티
 */
export function parseStreamChunks(chunks: string[]): {
  metadata?: GenerationMetadata;
  content: string;
} {
  let metadata: GenerationMetadata | undefined;
  let content = '';

  for (const chunk of chunks) {
    if (chunk.startsWith('[META]') && chunk.includes('[/META]')) {
      const metaJson = chunk.slice(6, chunk.indexOf('[/META]'));
      metadata = JSON.parse(metaJson);
    } else {
      content += chunk;
    }
  }

  return { metadata, content };
}
