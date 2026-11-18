import React, { useState, useMemo, useEffect } from 'react';
import { GitBranch, Plus, Search, Clock, GitCompare, AlertCircle, Check2, RefreshCw, FolderOpen, ChevronDown, GitCommit, AlertTriangle } from 'lucide-react';
import { GlassmorphicIcon } from './components/GlassmorphicIcon';
import { FeatureHeader, EmptyState, PanelStats } from './components/feature/FeatureUI';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';

// Tauri invoke 함수 (웹에서는 더미, 데스크톱에서 작동)
const isTauri = typeof window !== 'undefined' && '__TAURI_IPC__' in window;
let invoke: any = async () => null;

if (isTauri) {
  try {
    import('@tauri-apps/api/tauri').then(tauri => {
      invoke = tauri.invoke;
    });
  } catch (e) {
    console.warn('Tauri not available');
  }
}

export const VersionControlDashboard = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [commitMessage, setCommitMessage] = useState('');
  const [gitRepoPath, setGitRepoPath] = useState<string>('');
  const [currentBranch, setCurrentBranch] = useState<string>('main');
  const [gitStatus, setGitStatus] = useState<any>(null);
  const [unstagedFiles, setUnstagedFiles] = useState<any[]>([]);
  const [stagedFiles, setStagedFiles] = useState<any[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [fileChanges, setFileChanges] = useState<Map<string, { additions: number; deletions: number }>>(new Map());

  const [versions, setVersions] = useState<any[]>([]);

  // Git 저장소 경로 설정
  const handleSetGitPath = async () => {
    if (isTauri) {
      try {
        const dialog = await import('@tauri-apps/api/dialog');
        const selected = await dialog.open({ directory: true, multiple: false, title: 'Git 저장소 선택' });
        if (selected && typeof selected === 'string') {
          setGitRepoPath(selected);
          await loadGitData(selected);
        }
      } catch (error) {
        console.error('Git 경로 선택 실패:', error);
      }
    }
  };

  // 파일 타입 결정
  const getFileType = (statusCode: string): string => {
    const code = statusCode[0];
    switch (code) {
      case 'M': return '수정';
      case 'A': return '추가';
      case 'D': return '삭제';
      case 'R': return '이름변경';
      case 'C': return '복사';
      case 'U': return '충돌';
      case '?': return '추적안함';
      default: return '알 수 없음';
    }
  };

  // Git 데이터 로드
  const loadGitData = async (path: string) => {
    try {
      setLoading(true);

      // 현재 브랜치 조회
      const branch = await invoke('execute_terminal_command', {
        command: `cd "${path}" && git branch --show-current`
      });
      setCurrentBranch(branch.trim() || 'main');

      // Git 상태 조회
      const status = await invoke('execute_terminal_command', {
        command: `cd "${path}" && git status --porcelain`
      });

      const lines = status.split('\n').filter((l: string) => l.trim());
      const unstagedList: any[] = [];
      const stagedList: any[] = [];
      const changes = new Map<string, { additions: number; deletions: number }>();

      // 각 파일에 대해 변경 통계 조회
      for (const line of lines) {
        const statusCode = line.substring(0, 2);
        const file = line.substring(3);
        const fileType = getFileType(statusCode);

        let additions = 0;
        let deletions = 0;

        try {
          if (statusCode[0] !== 'D') {
            const diff = await invoke('execute_terminal_command', {
              command: `cd "${path}" && git diff --numstat -- "${file}" 2>/dev/null || echo "0\t0"`
            });
            const parts = diff.trim().split('\t');
            additions = parseInt(parts[0]) || 0;
            deletions = parseInt(parts[1]) || 0;
          }
        } catch (e) {
          // 오류 시 기본값 사용
        }

        const fileInfo = {
          file,
          status: statusCode,
          type: fileType,
          additions,
          deletions,
          total: additions + deletions
        };

        if (statusCode[0] === ' ') {
          unstagedList.push(fileInfo);
        } else if (statusCode[0] !== ' ') {
          stagedList.push(fileInfo);
        }

        changes.set(file, { additions, deletions });
      }

      setUnstagedFiles(unstagedList);
      setStagedFiles(stagedList);
      setFileChanges(changes);
      setGitStatus({
        modified: unstagedList.length,
        staged: stagedList.length,
        total: unstagedList.length + stagedList.length
      });

      // Git 로그 조회
      await loadGitLog(path);
    } catch (error) {
      console.error('Git 데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // Git 로그 조회
  const loadGitLog = async (path: string) => {
    try {
      const log = await invoke('execute_terminal_command', {
        command: `cd "${path}" && git log --oneline -20 --pretty=format:"%h|%s|%an|%ar|%ad" --date=short`
      });

      if (!log || log.trim() === '') {
        setVersions([]);
        return;
      }

      const commits = await Promise.all(
        log.split('\n').filter((l: string) => l.trim()).map(async (line: string) => {
          const [hash, message, author, date, dateShort] = line.split('|');
          let changes = 0;

          try {
            // 커밋별 변경 통계 조회
            const stats = await invoke('execute_terminal_command', {
              command: `cd "${path}" && git show --stat ${hash} 2>/dev/null | tail -1 || echo ""`
            });

            // "X files changed, Y insertions, Z deletions" 형식에서 숫자 추출
            const match = stats.match(/(\d+)\s+file/);
            if (match) {
              changes = parseInt(match[1]) || 0;
            }
          } catch (e) {
            changes = 0;
          }

          return {
            id: hash,
            project: 'Git Repository',
            message: message || 'No message',
            author: author || 'Unknown',
            created: date || 'Unknown',
            changes: changes || 1,
            hash: hash
          };
        })
      );

      setVersions(commits);
    } catch (error) {
      console.error('Git 로그 조회 실패:', error);
      setVersions([]);
    }
  };

  // Git 스테이지 파일
  const handleStageFile = async (file: any) => {
    if (!gitRepoPath) return;
    const fileName = typeof file === 'string' ? file : file.file;
    try {
      await invoke('execute_terminal_command', {
        command: `cd "${gitRepoPath}" && git add "${fileName}"`
      });
      await loadGitData(gitRepoPath);
    } catch (error) {
      console.error('파일 스테이징 실패:', error);
    }
  };

  // Git 언스테이지 파일
  const handleUnstageFile = async (file: any) => {
    if (!gitRepoPath) return;
    const fileName = typeof file === 'string' ? file : file.file;
    try {
      await invoke('execute_terminal_command', {
        command: `cd "${gitRepoPath}" && git reset HEAD "${fileName}"`
      });
      await loadGitData(gitRepoPath);
    } catch (error) {
      console.error('파일 언스테이징 실패:', error);
    }
  };

  // Git 커밋
  const handleGitCommit = async () => {
    if (!gitRepoPath) {
      alert('Git 저장소를 선택해주세요');
      return;
    }
    if (!commitMessage.trim()) {
      alert('커밋 메시지를 입력해주세요');
      return;
    }

    try {
      setLoading(true);
      await invoke('execute_terminal_command', {
        command: `cd "${gitRepoPath}" && git commit -m "${commitMessage}"`
      });

      setCommitMessage('');
      setShowNewModal(false);
      await loadGitData(gitRepoPath);
      alert('✅ 커밋 완료!');
    } catch (error) {
      console.error('커밋 실패:', error);
      alert(`❌ 커밋 실패: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // 자동 새로고침
  useEffect(() => {
    if (!autoRefresh || !gitRepoPath) return;
    const interval = setInterval(() => {
      loadGitData(gitRepoPath);
    }, 5000); // 5초마다 새로고침

    return () => clearInterval(interval);
  }, [autoRefresh, gitRepoPath]);


  const projects = Array.from(new Set(versions.map(v => v.project)));

  const filteredVersions = useMemo(() => {
    return versions.filter(v => {
      const matchesSearch = v.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           v.project.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesProject = !selectedProject || v.project === selectedProject;
      return matchesSearch && matchesProject;
    });
  }, [versions, searchTerm, selectedProject]);

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%', background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}>
      {/* 좌측 사이드바 */}
      <div style={{ width: '280px', borderRight: '1px solid rgba(100,150,255,0.2)', overflow: 'auto', padding: '20px', background: 'rgba(0,0,0,0.3)' }}>
        <h3 style={{ fontSize: '13px', color: 'rgba(224,224,224,0.5)', textTransform: 'uppercase', fontWeight: '600', marginBottom: '20px' }}>필터</h3>

        {/* 검색 */}
        <div style={{ marginBottom: '16px', position: 'relative' }}>
          <input
            type="text"
            placeholder="버전 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', background: 'linear-gradient(135deg, rgba(100,150,255,0.15) 0%, rgba(100,150,255,0.05) 100%)', border: '1px solid rgba(100,150,255,0.3)', borderRadius: '8px', color: '#e0e0e0', fontSize: '13px' }}
          />
          <Search size={14} style={{ position: 'absolute', right: '12px', top: '12px', color: 'rgba(224,224,224,0.4)' }} />
        </div>

        {/* 프로젝트 필터 */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', color: 'rgba(224,224,224,0.5)', marginBottom: '8px', fontWeight: '600' }}>프로젝트</div>
          <button
            onClick={() => setSelectedProject(null)}
            style={{
              display: 'block',
              width: '100%',
              padding: '8px 12px',
              marginBottom: '6px',
              background: selectedProject === null ? 'rgba(100,150,255,0.3)' : 'rgba(100,150,255,0.1)',
              border: `1px solid ${selectedProject === null ? 'rgba(100,150,255,0.5)' : 'rgba(100,150,255,0.2)'}`,
              borderRadius: '6px',
              color: '#e0e0e0',
              fontSize: '12px',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            모든 프로젝트
          </button>
          {projects.map(project => (
            <button
              key={project}
              onClick={() => setSelectedProject(selectedProject === project ? null : project)}
              style={{
                display: 'block',
                width: '100%',
                padding: '8px 12px',
                marginBottom: '6px',
                background: selectedProject === project ? 'rgba(100,150,255,0.3)' : 'rgba(100,150,255,0.1)',
                border: `1px solid ${selectedProject === project ? 'rgba(100,150,255,0.5)' : 'rgba(100,150,255,0.2)'}`,
                borderRadius: '6px',
                color: '#e0e0e0',
                fontSize: '12px',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              📁 {project}
            </button>
          ))}
        </div>

        {/* 통계 */}
        <PanelStats items={[
          { label: '총 버전', value: versions.length, tone: 'green' },
          { label: '프로젝트', value: projects.length, tone: 'green' },
          { label: '최근', value: '방금 전', tone: 'amber' },
        ]} />
      </div>

      {/* 우측 콘텐츠 */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* 헤더 */}
        <div style={{ padding: '24px', borderBottom: '1px solid rgba(100,150,255,0.2)', background: 'linear-gradient(135deg, rgba(0,0,0,0.4) 0%, rgba(100,150,255,0.1) 100%)' }}>
          <FeatureHeader
            icon={<GlassmorphicIcon Icon={GitBranch} gradient="from-purple-400 to-pink-500" size={40} />}
            title="버전 관리"
            subtitle="변경 이력과 브랜치를 관리합니다"
            actions={
              <>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                onClick={() => gitRepoPath && loadGitData(gitRepoPath)}
                style={{ padding: '10px 12px', background: 'rgba(100,150,255,0.2)', color: '#cbd5e1', border: '1px solid rgba(100,150,255,0.3)', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <RefreshCw size={14} /> 새로고침
              </button>
              <button
                onClick={handleSetGitPath}
                style={{ padding: '10px 12px', background: 'rgba(100,150,255,0.2)', color: '#cbd5e1', border: '1px solid rgba(100,150,255,0.3)', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <FolderOpen size={14} /> 저장소 선택
              </button>
              <button
                onClick={() => setShowNewModal(true)}
                disabled={!gitRepoPath || !stagedFiles.length}
                style={{ padding: '10px 16px', background: stagedFiles.length ? '#646cff' : 'rgba(100,108,255,0.5)', color: '#fff', border: 'none', borderRadius: '8px', cursor: stagedFiles.length ? 'pointer' : 'not-allowed', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <GitCommit size={16} /> 커밋
              </button>
            </div>
              </>
            }
          />

          {/* Git 상태 정보 */}
          {gitRepoPath && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
              <div style={{ background: 'rgba(100,150,255,0.1)', border: '1px solid rgba(100,150,255,0.2)', borderRadius: '8px', padding: '12px' }}>
                <div style={{ fontSize: '11px', color: 'rgba(224,224,224,0.6)' }}>현재 브랜치</div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#4ade80' }}>{currentBranch}</div>
              </div>
              <div style={{ background: 'rgba(100,150,255,0.1)', border: '1px solid rgba(100,150,255,0.2)', borderRadius: '8px', padding: '12px' }}>
                <div style={{ fontSize: '11px', color: 'rgba(224,224,224,0.6)' }}>스테이징됨</div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#fcd34d' }}>{gitStatus?.staged || 0} 파일</div>
              </div>
              <div style={{ background: 'rgba(100,150,255,0.1)', border: '1px solid rgba(100,150,255,0.2)', borderRadius: '8px', padding: '12px' }}>
                <div style={{ fontSize: '11px', color: 'rgba(224,224,224,0.6)' }}>변경됨</div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#f87171' }}>{gitStatus?.modified || 0} 파일</div>
              </div>
              <div style={{ background: 'rgba(100,150,255,0.1)', border: '1px solid rgba(100,150,255,0.2)', borderRadius: '8px', padding: '12px' }}>
                <div style={{ fontSize: '11px', color: 'rgba(224,224,224,0.6)' }}>자동 새로고침</div>
                <button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '600', color: autoRefresh ? '#4ade80' : '#cbd5e1' }}
                >
                  {autoRefresh ? '✓ ON' : 'OFF'}
                </button>
              </div>
            </div>
          )}
        </div>
        {!gitRepoPath && (
          <div style={{ margin: '24px' }}>
            <EmptyState
              icon={<GlassmorphicIcon Icon={GitBranch} gradient="from-purple-400 to-pink-500" size={32} />}
              title="Git 저장소를 선택하세요"
              description="저장소를 연결하면 변경 이력, 브랜치, 커밋 상태를 이 화면에서 관리할 수 있습니다."
              steps={['Git 저장소 폴더 선택', '변경 파일 확인과 스테이징', '커밋과 브랜치를 이 화면에서 관리']}
              examples={['커밋 메시지 초안 작성', '브랜치 정리 순서', '충돌을 안전하게 해결하는 방법']}
              tab="version-control"
              action={{ label: '저장소 선택', onClick: handleSetGitPath }}
            />
          </div>
        )}

        {/* 버전 목록 */}
        <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredVersions.map((version, idx) => (
              <div key={version.id} style={{ background: 'linear-gradient(135deg, rgba(100,150,255,0.15) 0%, rgba(100,150,255,0.05) 100%)', border: '1px solid rgba(100,150,255,0.3)', borderRadius: '14px', padding: '16px', transition: 'all 0.2s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#fff', marginBottom: '4px' }}>{version.message}</h3>
                    <div style={{ fontSize: '12px', color: 'rgba(224,224,224,0.6)' }}>
                      📁 {version.project} • v{idx + 1}
                    </div>
                  </div>
                  <div style={{ background: 'rgba(100,150,255,0.2)', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', color: '#cbd5e1', fontWeight: '600' }}>
                    +{version.changes} changes
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'rgba(224,224,224,0.5)', paddingTop: '12px', borderTop: '1px solid rgba(100,150,255,0.1)' }}>
                  <div>
                    <Clock size={14} style={{ display: 'inline', marginRight: '4px' }} />
                    {version.created}
                  </div>
                  <div>{version.author}</div>
                  <button style={{ background: 'rgba(100,150,255,0.2)', border: 'none', borderRadius: '6px', padding: '6px 12px', color: '#cbd5e1', cursor: 'pointer', fontSize: '12px' }}>
                    <GitCompare size={14} style={{ display: 'inline', marginRight: '4px' }} />
                    비교
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 모달 */}
      {showNewModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', border: '1px solid rgba(100,150,255,0.3)', borderRadius: '16px', padding: '32px', width: '500px', maxHeight: '80vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#fff', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <GitCommit size={18} />
              커밋 생성
            </h2>

            {/* 스테이징된 파일 목록 */}
            {stagedFiles.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'rgba(224,224,224,0.7)', marginBottom: '8px', fontWeight: '600' }}>
                  ✓ 스테이징된 파일 ({stagedFiles.length})
                </label>
                <div style={{ background: 'rgba(100,150,255,0.05)', border: '1px solid rgba(100,150,255,0.2)', borderRadius: '8px', padding: '12px', maxHeight: '150px', overflowY: 'auto' }}>
                  {stagedFiles.map((fileInfo: any, idx: number) => (
                    <div key={idx} style={{ fontSize: '11px', color: '#4ade80', marginBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '6px', borderBottom: '1px solid rgba(100,150,255,0.1)' }}>
                      <div>
                        <div>{fileInfo.type === '추가' ? '✚' : fileInfo.type === '수정' ? '✎' : '○'} {fileInfo.file}</div>
                        {fileInfo.additions + fileInfo.deletions > 0 && (
                          <div style={{ fontSize: '10px', color: 'rgba(224,224,224,0.5)' }}>
                            +{fileInfo.additions} -{fileInfo.deletions}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleUnstageFile(fileInfo)}
                        style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '10px', whiteSpace: 'nowrap' }}
                      >
                        제거
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 변경된 파일 목록 */}
            {unstagedFiles.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'rgba(224,224,224,0.7)', marginBottom: '8px', fontWeight: '600' }}>
                  ⚠ 변경된 파일 ({unstagedFiles.length})
                </label>
                <div style={{ background: 'rgba(100,150,255,0.05)', border: '1px solid rgba(100,150,255,0.2)', borderRadius: '8px', padding: '12px', maxHeight: '150px', overflowY: 'auto' }}>
                  {unstagedFiles.map((fileInfo: any, idx: number) => (
                    <div key={idx} style={{ fontSize: '11px', color: '#f87171', marginBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '6px', borderBottom: '1px solid rgba(100,150,255,0.1)' }}>
                      <div>
                        <div>{fileInfo.type === '추가' ? '✚' : fileInfo.type === '수정' ? '✎' : '○'} {fileInfo.file}</div>
                        {fileInfo.additions + fileInfo.deletions > 0 && (
                          <div style={{ fontSize: '10px', color: 'rgba(224,224,224,0.5)' }}>
                            +{fileInfo.additions} -{fileInfo.deletions}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleStageFile(fileInfo)}
                        style={{ background: 'none', border: 'none', color: '#4ade80', cursor: 'pointer', fontSize: '10px', whiteSpace: 'nowrap' }}
                      >
                        추가
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 커밋 메시지 */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: 'rgba(224,224,224,0.7)', marginBottom: '8px', fontWeight: '600' }}>커밋 메시지</label>
              <textarea
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder="변경사항 설명..."
                style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, rgba(100,150,255,0.15) 0%, rgba(100,150,255,0.05) 100%)', border: '1px solid rgba(100,150,255,0.3)', borderRadius: '8px', color: '#e0e0e0', fontSize: '13px', minHeight: '80px', fontFamily: 'inherit' }}
              />
            </div>

            {/* 버튼 */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => {
                  setShowNewModal(false);
                  setCommitMessage('');
                }}
                style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid rgba(100,150,255,0.3)', borderRadius: '8px', color: '#cbd5e1', cursor: 'pointer', fontWeight: '600' }}
              >
                취소
              </button>
              <button
                onClick={handleGitCommit}
                disabled={loading || !commitMessage.trim()}
                style={{ flex: 1, padding: '12px', background: commitMessage.trim() ? '#646cff' : 'rgba(100,108,255,0.5)', border: 'none', borderRadius: '8px', color: '#fff', cursor: commitMessage.trim() ? 'pointer' : 'not-allowed', fontWeight: '600' }}
              >
                {loading ? '커밋 중...' : '커밋'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
