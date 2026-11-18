import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { Folder, FileText } from 'lucide-react';

interface FilesProps {
  onSelectFile?: (name: string, path: string) => void;
}

function Files({ onSelectFile }: FilesProps) {
  const [selecting, setSelecting] = useState(false);

  useEffect(() => {
    // 컴포넌트가 마운트되면 즉시 네이티브 파일 선택 다이얼로그 열기
    handleOpenFileDialog();
  }, []);

  const handleOpenFileDialog = async () => {
    setSelecting(true);
    try {
      const selectedPath = await invoke<string | null>('open_file_dialog');

      if (selectedPath) {
        // 파일 경로에서 파일명 추출
        const fileName = selectedPath.split(/[\\/]/).pop() || selectedPath;
        if (onSelectFile) {
          onSelectFile(fileName, selectedPath);
        }
      }
    } catch (error) {
      console.error('파일 선택 오류:', error);
    } finally {
      setSelecting(false);
    }
  };

  return (
    <div className="files-container animate-in">
      <header className="view-header">
        <div className="header-top">
          <h2>파일 선택</h2>
        </div>
        <p className="view-desc">로컬 시스템에서 파일을 선택하세요</p>
      </header>

      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-dim)',
        padding: '4rem'
      }}>
        {selecting ? (
          <>
            <div className="spinner-small" style={{width: 40, height: 40, marginBottom: '1rem'}}></div>
            <p>파일 선택 중...</p>
          </>
        ) : (
          <>
            <Folder size={48} style={{marginBottom: '1rem', opacity: 0.5}} />
            <p>파일 선택 다이얼로그를 열었습니다.</p>
            <p style={{fontSize: '0.9rem', marginTop: '0.5rem'}}>윈도우를 통해 파일을 선택하세요.</p>
          </>
        )}
      </div>
    </div>
  );
}

export default Files;
