/**
 * AI Generation API Client
 * Document, presentation, and code analysis
 */

import { getToken } from './auth';

const API_BASE = 'http://localhost:8000/api/ai';

export interface DocumentResponse {
  title: string;
  content: string;
  format: string;
  language: string;
  type: string;
  tokens_used: number;
}

export interface PresentationResponse {
  title: string;
  slides: Array<{
    slide_num: number;
    title: string;
    content: string;
    speaker_notes: string;
  }>;
  num_slides: number;
  language: string;
  tokens_used: number;
}

export interface CodeAnalysisResponse {
  analysis_type: string;
  content: string;
  language: string;
  tokens_used: number;
}

/**
 * Generate document content
 */
export async function generateDocument(
  title: string,
  contentType: 'report' | 'memo' | 'proposal' | 'summary' | 'email',
  prompt: string,
  language: 'ko' | 'en' = 'ko'
): Promise<{ status: string; document: DocumentResponse }> {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');

  const response = await fetch(`${API_BASE}/generate/document`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      title,
      content_type: contentType,
      prompt,
      language,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Document generation failed');
  }

  return response.json();
}

/**
 * Generate presentation structure
 */
export async function generatePresentation(
  title: string,
  topic: string,
  numSlides: number = 10,
  language: 'ko' | 'en' = 'ko'
): Promise<{ status: string; presentation: PresentationResponse }> {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');

  const response = await fetch(`${API_BASE}/generate/presentation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      title,
      topic,
      num_slides: numSlides,
      language,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Presentation generation failed');
  }

  return response.json();
}

/**
 * Analyze code
 */
export async function analyzeCode(
  code: string,
  analysisType: 'bugs' | 'improvements' | 'security' | 'performance' | 'general' = 'general',
  language: 'ko' | 'en' = 'ko'
): Promise<{ status: string; analysis: CodeAnalysisResponse }> {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');

  const response = await fetch(`${API_BASE}/analyze/code`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      code,
      analysis_type: analysisType,
      language,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Code analysis failed');
  }

  return response.json();
}

/**
 * Export document as markdown
 */
export async function exportMarkdown(content: {
  title: string;
  content: string;
}): Promise<string> {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');

  const response = await fetch(`${API_BASE}/export/markdown`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(content),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Export failed');
  }

  const data = await response.json();
  return data.content;
}

/**
 * Download markdown as file
 */
export function downloadMarkdown(filename: string, content: string) {
  const element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
  element.setAttribute('download', filename);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

/**
 * Download JSON as file
 */
export function downloadJSON(filename: string, data: any) {
  const element = document.createElement('a');
  element.setAttribute(
    'href',
    'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2))
  );
  element.setAttribute('download', filename);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}
