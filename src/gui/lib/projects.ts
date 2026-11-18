// 프로젝트 API: 계정별로 서버에 저장되는 프로젝트, 지침, 참고 자료
import { getToken } from './auth';

export interface ProjectFileInfo {
  id: string;
  name: string;
  chars: number;
  addedAt?: string;
}

export interface ServerProject {
  id: string;
  name: string;
  description: string;
  instructions: string;
  files: ProjectFileInfo[];
  createdAt: string;
}

const apiBase = () => (window.location.hostname === 'localhost' ? 'http://localhost:8001/api' : '/api');

const authHeaders = (): Record<string, string> => ({ Authorization: `Bearer ${getToken() ?? ''}` });

async function parse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || `서버 응답 ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function listProjectsApi(): Promise<ServerProject[]> {
  const data = await parse<{ projects: ServerProject[] }>(await fetch(`${apiBase()}/projects`, { headers: authHeaders() }));
  return data.projects;
}

export async function createProjectApi(name: string, description: string): Promise<ServerProject> {
  return parse<ServerProject>(await fetch(`${apiBase()}/projects`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description }),
  }));
}

export async function patchProjectApi(projectId: string, patch: Partial<Pick<ServerProject, 'name' | 'description' | 'instructions'>>): Promise<ServerProject> {
  return parse<ServerProject>(await fetch(`${apiBase()}/projects/${projectId}`, {
    method: 'PATCH',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  }));
}

export async function deleteProjectApi(projectId: string): Promise<void> {
  await parse(await fetch(`${apiBase()}/projects/${projectId}`, { method: 'DELETE', headers: authHeaders() }));
}

export async function uploadProjectFileApi(projectId: string, file: File): Promise<{ file: ProjectFileInfo; truncated: boolean }> {
  const form = new FormData();
  form.append('file', file);
  return parse(await fetch(`${apiBase()}/projects/${projectId}/files`, { method: 'POST', headers: authHeaders(), body: form }));
}

export async function deleteProjectFileApi(projectId: string, fileId: string): Promise<void> {
  await parse(await fetch(`${apiBase()}/projects/${projectId}/files/${fileId}`, { method: 'DELETE', headers: authHeaders() }));
}
