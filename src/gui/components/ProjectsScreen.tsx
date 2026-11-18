import React, { useRef, useState } from 'react';
import { FolderOpen, Plus, ArrowLeft, Trash2, MessageSquare, Upload, FileText, Send, Check, AlertCircle, Loader2 } from 'lucide-react';
import { EmptyState } from './feature/FeatureUI';
import { GlassmorphicIcon } from './GlassmorphicIcon';

export interface ProjectFile {
  id: string;
  name: string;
  chars: number;
  addedAt?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  instructions?: string;
  files?: ProjectFile[];
}

export interface ProjectChat {
  id: string;
  title: string;
  date: string;
  projectId?: string;
}

interface Props {
  projects: Project[];
  chats: ProjectChat[];
  selectedId: string | null;
  onSelectProject: (projectId: string | null) => void;
  onCreate: (name: string, description: string) => Promise<string | undefined>;
  onDelete: (projectId: string) => void;
  onOpenChat: (chatId: string) => void;
  onStartChat: (projectId: string, text: string) => void;
  onUpdateProject: (projectId: string, patch: Partial<Project>) => void;
  onUploadFile: (projectId: string, file: File) => Promise<{ truncated: boolean }>;
  onDeleteFile: (projectId: string, fileId: string) => Promise<void>;
}

const ACCEPT = '.txt,.md,.csv,.json,.pdf,.docx,.xlsx,.xls,.py,.ts,.tsx,.js,.html,.css,.yaml,.yml,.log';
const STARTERS = ['분기 실적 보고서 준비', '신제품 출시 캠페인', '논문 자료 정리'];

// 파일 종류별 짧은 표시 이름
const kindLabel = (name: string) => {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') return 'PDF';
  if (ext === 'docx') return 'Word';
  if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') return '표';
  return '텍스트';
};

type UploadItem = { id: string; name: string; status: 'uploading' | 'done' | 'error'; message?: string };

/** 프로젝트 목록, 프로젝트 상세(자료 올리기, 지침, 바로 질문하기, 대화 목록). */
export const ProjectsScreen: React.FC<Props> = ({
  projects, chats, selectedId, onSelectProject, onCreate, onDelete, onOpenChat, onStartChat, onUpdateProject, onUploadFile, onDeleteFile,
}) => {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [instructionDraft, setInstructionDraft] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [question, setQuestion] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const selected = projects.find((p) => p.id === selectedId) ?? null;
  const projectChats = selected ? chats.filter((c) => c.projectId === selected.id) : [];

  const submit = async () => {
    if (!name.trim()) return;
    const id = await onCreate(name.trim(), description.trim());
    setName('');
    setDescription('');
    setCreating(false);
    if (id) onSelectProject(id);
  };

  // 여러 파일을 차례로 올린다. 올리는 중과 완료 상태를 파일마다 보여 준다.
  const uploadFiles = async (files: File[]) => {
    if (!selected || files.length === 0) return;
    const projectId = selected.id;
    for (const file of files) {
      const key = `${file.name}-${Date.now()}-${Math.random()}`;
      setUploads((prev) => [...prev, { id: key, name: file.name, status: 'uploading' }]);
      try {
        const result = await onUploadFile(projectId, file);
        setUploads((prev) => prev.map((u) => (u.id === key ? { ...u, status: 'done', message: result.truncated ? '일부만 저장됨' : '준비 완료' } : u)));
      } catch (err) {
        setUploads((prev) => prev.map((u) => (u.id === key ? { ...u, status: 'error', message: err instanceof Error ? err.message : '올리지 못했습니다' } : u)));
      }
    }
    // 끝난 항목은 잠시 뒤 목록에서 지운다
    setTimeout(() => setUploads((prev) => prev.filter((u) => u.status === 'uploading')), 4000);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    uploadFiles(Array.from(e.dataTransfer.files));
  };

  const sendQuestion = () => {
    if (!selected || !question.trim()) return;
    onStartChat(selected.id, question.trim());
    setQuestion('');
  };

  const header = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <GlassmorphicIcon Icon={FolderOpen} gradient="from-amber-400 to-orange-500" size={40} />
        <div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#f1f5f9' }}>프로젝트</div>
          <div style={{ fontSize: '13px', color: 'rgba(224,224,224,0.6)' }}>관련된 대화를 한곳에 모아 관리합니다</div>
        </div>
      </div>
      <button className="feature-btn primary" onClick={() => setCreating(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Plus size={16} /> 새 프로젝트
      </button>
    </div>
  );

  const createModal = creating && (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400 }} onClick={() => setCreating(false)}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 420, maxWidth: '90vw', background: '#1c1c1e', border: '1px solid var(--border-color)', borderRadius: 16, padding: 24, display: 'grid', gap: 12 }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#fff' }}>새 프로젝트</div>
        <input className="input-field" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="프로젝트 이름"
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="설명 (선택)" rows={3}
          style={{ background: 'transparent', border: '1px solid var(--border-color)', borderRadius: 10, color: '#fff', padding: 10, fontFamily: 'inherit', resize: 'none' }} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="feature-btn" onClick={() => setCreating(false)}>취소</button>
          <button className="feature-btn primary" onClick={submit} disabled={!name.trim()}>만들기</button>
        </div>
      </div>
    </div>
  );

  if (selected) {
    const files = selected.files ?? [];
    const hasSetup = files.length > 0 || (selected.instructions ?? '').trim() !== '';
    return (
      <div style={{ padding: 24, overflowY: 'auto', height: '100%', boxSizing: 'border-box' }}>
        {createModal}
        <button className="feature-btn" onClick={() => { onSelectProject(null); setConfirmDelete(false); }} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
          <ArrowLeft size={14} /> 프로젝트 목록
        </button>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>{selected.name}</div>
            {selected.description && <div style={{ fontSize: 13, color: 'rgba(224,224,224,0.65)', marginTop: 6, lineHeight: 1.6 }}>{selected.description}</div>}
          </div>
          <button className="feature-btn" onClick={() => {
            if (!confirmDelete) { setConfirmDelete(true); return; }
            onDelete(selected.id); onSelectProject(null); setConfirmDelete(false);
          }} style={{ color: '#ff6b9d', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Trash2 size={14} /> {confirmDelete ? '한 번 더 누르면 삭제' : '프로젝트 삭제'}
          </button>
        </div>

        {/* 바로 질문하기: ChatGPT·Claude 프로젝트처럼 이 화면에서 바로 대화를 시작한다 */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, padding: 12, borderRadius: 16, border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.03)', marginBottom: 18 }}>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); sendQuestion(); } }}
            rows={2}
            placeholder={`${selected.name}에 대해 질문하기 (Enter로 전송)`}
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontFamily: 'inherit', fontSize: 14, resize: 'none' }}
          />
          <button className="feature-btn primary" onClick={sendQuestion} disabled={!question.trim()} title="전송" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Send size={14} /> 보내기
          </button>
        </div>

        {/* 자료 올리기: 끌어다 놓거나 눌러서 올린다 */}
        <div style={{ fontSize: 13, fontWeight: 700, color: '#e5e7eb', marginBottom: 8 }}>자료</div>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileInput.current?.click()}
          role="button"
          tabIndex={0}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 22, borderRadius: 14, cursor: 'pointer',
            border: `1.5px dashed ${dragging ? '#a78bfa' : 'var(--border-color)'}`, background: dragging ? 'rgba(167,139,250,0.08)' : 'transparent', marginBottom: 12,
          }}
        >
          <Upload size={20} style={{ color: '#a78bfa' }} />
          <div style={{ fontSize: 14, color: '#e5e7eb' }}>파일을 여기에 끌어다 놓거나 클릭해서 선택하세요</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>PDF, Word, 엑셀, 텍스트 파일 · 파일당 15MB · 여러 개 한 번에 가능</div>
          <input
            ref={fileInput}
            type="file"
            multiple
            accept={ACCEPT}
            style={{ display: 'none' }}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              const picked = Array.from(e.target.files ?? []);
              e.target.value = '';
              uploadFiles(picked);
            }}
          />
        </div>

        {uploads.length > 0 && (
          <div style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
            {uploads.map((u) => (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#e5e7eb' }}>
                {u.status === 'uploading' && <Loader2 size={14} style={{ color: '#a78bfa', animation: 'spin 1s linear infinite' }} />}
                {u.status === 'done' && <Check size={14} style={{ color: '#34d399' }} />}
                {u.status === 'error' && <AlertCircle size={14} style={{ color: '#f87171' }} />}
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</span>
                <span style={{ fontSize: 12, color: u.status === 'error' ? '#f87171' : 'var(--text-dim)' }}>
                  {u.status === 'uploading' ? '읽는 중...' : u.message}
                </span>
              </div>
            ))}
          </div>
        )}

        {files.length > 0 && (
          <div style={{ display: 'grid', gap: 6, marginBottom: 18 }}>
            {files.map((f) => (
              <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 12, border: '1px solid var(--border-color)' }}>
                <FileText size={16} style={{ color: '#a78bfa', flexShrink: 0 }} />
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13, color: '#e5e7eb' }}>{f.name}</span>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: 'rgba(255,255,255,0.06)', color: 'var(--text-dim)' }}>{kindLabel(f.name)}</span>
                <span style={{ fontSize: 11, color: 'var(--text-dim)', minWidth: 60, textAlign: 'right' }}>{f.chars.toLocaleString()}자</span>
                <button
                  onClick={async () => {
                    try {
                      await onDeleteFile(selected.id, f.id);
                    } catch (err) {
                      setNotice(err instanceof Error ? err.message : '삭제하지 못했습니다.');
                    }
                  }}
                  title="삭제"
                  style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer' }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
        {notice && <div style={{ fontSize: 12, color: '#f87171', marginBottom: 12 }}>{notice}</div>}

        {/* 지침: 이 프로젝트의 모든 대화에 적용 */}
        <div style={{ display: 'grid', gap: 10, padding: 14, borderRadius: 14, border: '1px solid var(--border-color)', marginBottom: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#e5e7eb' }}>프로젝트 지침</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>이 프로젝트의 모든 대화에 함께 적용됩니다.</div>
          <textarea value={instructionDraft ?? selected.instructions ?? ''} onChange={(e) => setInstructionDraft(e.target.value)} rows={3} maxLength={4000}
            placeholder="예: 보고서 형식으로, 숫자는 표로 정리해 주세요"
            style={{ background: 'transparent', border: '1px solid var(--border-color)', borderRadius: 10, color: '#fff', padding: 10, fontFamily: 'inherit', resize: 'vertical' }} />
          {instructionDraft !== null && instructionDraft !== (selected.instructions ?? '') && (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="feature-btn primary" onClick={() => { onUpdateProject(selected.id, { instructions: instructionDraft }); setInstructionDraft(null); }}>지침 저장</button>
            </div>
          )}
        </div>

        {!hasSetup && (
          <div style={{ fontSize: 13, color: 'rgba(224,224,224,0.6)', padding: '4px 2px 18px' }}>
            자료를 올리거나 지침을 정하면 답변이 이 프로젝트에 맞춰집니다.
          </div>
        )}

        <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(224,224,224,0.5)', marginBottom: 8 }}>대화 {projectChats.length}개</div>
        {projectChats.length === 0 && (
          <div style={{ fontSize: 13, color: 'rgba(224,224,224,0.5)', padding: '8px 0' }}>아직 이 프로젝트의 대화가 없습니다. 위 입력창에서 바로 질문해 보세요.</div>
        )}
        <div style={{ display: 'grid', gap: 8 }}>
          {projectChats.map((chat) => (
            <button key={chat.id} onClick={() => onOpenChat(chat.id)} style={{ textAlign: 'left', padding: '12px 14px', borderRadius: 12, border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)', color: '#e5e7eb', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <MessageSquare size={16} /> <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{chat.title}</span>
              <span style={{ fontSize: 12, color: 'rgba(224,224,224,0.4)' }}>{chat.date}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%', boxSizing: 'border-box' }}>
      {createModal}
      {header}
      {projects.length === 0 ? (
        <div>
          <EmptyState
            icon={<GlassmorphicIcon Icon={FolderOpen} gradient="from-amber-400 to-orange-500" size={32} />}
            title="프로젝트가 없습니다"
            description="관련된 대화를 프로젝트로 묶으면 자료와 대화를 한곳에서 이어서 작업할 수 있습니다."
            steps={['프로젝트 이름과 설명 입력', '자료를 끌어다 놓기', '프로젝트 안에서 바로 질문하기']}
            action={{ label: '새 프로젝트', onClick: () => setCreating(true) }}
          />
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            {STARTERS.map((s) => (
              <button key={s} className="feature-btn" onClick={() => { setName(s); setCreating(true); }}>{s}</button>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
          {projects.map((p) => (
            <button key={p.id} onClick={() => onSelectProject(p.id)} style={{ textAlign: 'left', padding: 18, borderRadius: 16, border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)', color: '#e5e7eb', cursor: 'pointer' }}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{p.name}</div>
              <div style={{ fontSize: 13, color: 'rgba(224,224,224,0.6)', lineHeight: 1.5, minHeight: 20 }}>{p.description || '설명 없음'}</div>
              <div style={{ fontSize: 12, color: 'rgba(224,224,224,0.45)', marginTop: 10 }}>
                자료 {(p.files ?? []).length}개 · 대화 {chats.filter((c) => c.projectId === p.id).length}개
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
