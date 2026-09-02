/**
 * Collaborative Editor - Luminaic 실시간 협업 편집
 * WebSocket 기반 멀티유저 동시 편집
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, Users, Save, Share2, History, Lock, Unlock } from 'lucide-react';
import './CollaborativeEditor.css';

interface Cursor {
  userId: string;
  userName: string;
  position: number;
  color: string;
  timestamp: string;
}

interface Comment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  position: number;
  resolved: boolean;
  createdAt: string;
  replies: Comment[];
}

interface Version {
  version: number;
  userId: string;
  userName: string;
  timestamp: string;
  changesSummary: string;
}

interface CollaborativeEditorProps {
  workspaceId: string;
  documentId: string;
  userId: string;
  userName: string;
  initialContent: string;
  readOnly?: boolean;
  onSave?: (content: string) => void;
}

export const CollaborativeEditor: React.FC<CollaborativeEditorProps> = ({
  workspaceId,
  documentId,
  userId,
  userName,
  initialContent,
  readOnly = false,
  onSave
}) => {
  const [content, setContent] = useState(initialContent);
  const [cursors, setCursors] = useState<Map<string, Cursor>>(new Map());
  const [comments, setComments] = useState<Comment[]>([]);
  const [activeUsers, setActiveUsers] = useState<Set<string>>(new Set([userId]));
  const [versions, setVersions] = useState<Version[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  const editorRef = useRef<HTMLTextAreaElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const selectionRef = useRef<number>(0);

  // WebSocket 연결
  useEffect(() => {
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${
      window.location.host
    }/api/workspace/ws/${workspaceId}/${userId}`;

    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onopen = () => {
      console.log('[COLLAB] WebSocket 연결됨');
      // 사용자 정보 전송
      wsRef.current?.send(JSON.stringify({
        type: 'user_joined',
        userId,
        userName
      }));
    };

    wsRef.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      handleRemoteMessage(message);
    };

    wsRef.current.onerror = (error) => {
      console.error('[COLLAB] WebSocket 오류:', error);
    };

    wsRef.current.onclose = () => {
      console.log('[COLLAB] WebSocket 연결 해제');
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [workspaceId, userId, userName]);

  // 로컬 텍스트 변경 처리
  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.currentTarget.value;
    setContent(newContent);
    setUnsavedChanges(true);

    // 다른 사용자에게 변경 사항 전송
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'content_change',
        content: newContent,
        position: e.currentTarget.selectionStart,
        userId,
        userName,
        timestamp: new Date().toISOString()
      }));
    }

    selectionRef.current = e.currentTarget.selectionStart;
  }, [userId, userName]);

  // 원격 메시지 처리
  const handleRemoteMessage = useCallback((message: any) => {
    switch (message.type) {
      case 'content_change':
        if (message.userId !== userId) {
          setContent(message.content);
          updateCursor(message.userId, message.userName, message.position, message.timestamp);
        }
        break;

      case 'user_joined':
        setActiveUsers((prev) => new Set([...prev, message.userId]));
        console.log(`[COLLAB] ${message.userName} 입장`);
        break;

      case 'user_left':
        setActiveUsers((prev) => {
          const newSet = new Set(prev);
          newSet.delete(message.userId);
          return newSet;
        });
        setCursors((prev) => {
          const newMap = new Map(prev);
          newMap.delete(message.userId);
          return newMap;
        });
        break;

      case 'comment_added':
        setComments((prev) => [...prev, message.comment]);
        break;

      case 'version_created':
        setVersions((prev) => [...prev, message.version]);
        break;

      case 'lock_acquired':
        if (message.userId === userId) {
          setIsLocked(true);
        }
        break;

      case 'lock_released':
        setIsLocked(false);
        break;
    }
  }, [userId]);

  // 커서 업데이트
  const updateCursor = (userId: string, userName: string, position: number, timestamp: string) => {
    setCursors((prev) => {
      const newMap = new Map(prev);
      const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'];
      const colorIndex = Array.from(newMap.keys()).length % colors.length;

      newMap.set(userId, {
        userId,
        userName,
        position,
        color: colors[colorIndex],
        timestamp
      });

      return newMap;
    });
  };

  // 주석 추가
  const addComment = (text: string) => {
    const newComment: Comment = {
      id: Date.now().toString(),
      userId,
      userName,
      text,
      position: selectionRef.current,
      resolved: false,
      createdAt: new Date().toISOString(),
      replies: []
    };

    setComments((prev) => [...prev, newComment]);

    // 다른 사용자에게 전송
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'comment_added',
        comment: newComment
      }));
    }
  };

  // 저장
  const handleSave = async () => {
    try {
      if (onSave) {
        await onSave(content);
      }

      // 버전 저장
      const newVersion: Version = {
        version: versions.length + 1,
        userId,
        userName,
        timestamp: new Date().toISOString(),
        changesSummary: `변경사항 저장`
      };

      setVersions((prev) => [...prev, newVersion]);
      setUnsavedChanges(false);

      // 다른 사용자에게 알림
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'version_created',
          version: newVersion
        }));
      }

      console.log('[COLLAB] 저장 완료');
    } catch (error) {
      console.error('[COLLAB] 저장 실패:', error);
    }
  };

  // 잠금 토글
  const toggleLock = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: isLocked ? 'lock_release' : 'lock_acquire',
        userId,
        documentId
      }));
    }
    setIsLocked(!isLocked);
  };

  return (
    <div className="collaborative-editor">
      {/* 상단 바 */}
      <div className="editor-toolbar">
        <div className="toolbar-left">
          <button
            className="toolbar-btn"
            onClick={handleSave}
            title="저장"
          >
            <Save size={18} />
            저장 {unsavedChanges && '*'}
          </button>

          <button
            className="toolbar-btn"
            onClick={() => setShowComments(!showComments)}
            title="주석"
          >
            <MessageCircle size={18} />
            주석 ({comments.length})
          </button>

          <button
            className="toolbar-btn"
            onClick={() => setShowHistory(!showHistory)}
            title="버전 히스토리"
          >
            <History size={18} />
            히스토리
          </button>

          <button
            className="toolbar-btn"
            onClick={toggleLock}
            title={isLocked ? '잠금 해제' : '잠금'}
          >
            {isLocked ? <Lock size={18} /> : <Unlock size={18} />}
            {isLocked ? '잠금됨' : '편집 중'}
          </button>
        </div>

        <div className="toolbar-right">
          <div className="active-users">
            <Users size={18} />
            <span>{activeUsers.size}명 편집 중</span>
            {Array.from(activeUsers).slice(0, 3).map((uid) => (
              <div
                key={uid}
                className="user-avatar"
                title={uid}
              >
                {uid.charAt(0).toUpperCase()}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 메인 에디터 영역 */}
      <div className="editor-container">
        {/* 텍스트 에디터 */}
        <textarea
          ref={editorRef}
          className="editor-textarea"
          value={content}
          onChange={handleContentChange}
          readOnly={readOnly}
          placeholder="여기에 입력하세요..."
        />

        {/* 커서 표시 */}
        <div className="cursors-layer">
          {Array.from(cursors.entries()).map(([uid, cursor]) => (
            <div
              key={uid}
              className="cursor-marker"
              style={{
                left: `${(cursor.position / content.length) * 100}%`,
                borderColor: cursor.color
              }}
              title={cursor.userName}
            >
              <div className="cursor-label" style={{ backgroundColor: cursor.color }}>
                {cursor.userName}
              </div>
            </div>
          ))}
        </div>

        {/* 사이드바 - 주석 */}
        {showComments && (
          <div className="sidebar comments-panel">
            <h3>주석</h3>
            <div className="comments-list">
              {comments.map((comment) => (
                <div key={comment.id} className="comment-item">
                  <div className="comment-header">
                    <strong>{comment.userName}</strong>
                    <small>{new Date(comment.createdAt).toLocaleTimeString()}</small>
                  </div>
                  <p className="comment-text">{comment.text}</p>
                  {comment.replies.length > 0 && (
                    <div className="comment-replies">
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className="reply-item">
                          <strong>{reply.userName}:</strong> {reply.text}
                        </div>
                      ))}
                    </div>
                  )}
                  <button className="reply-btn">답글</button>
                </div>
              ))}
            </div>
            <div className="comment-input-area">
              <input
                type="text"
                placeholder="주석 추가..."
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value) {
                    addComment(e.currentTarget.value);
                    e.currentTarget.value = '';
                  }
                }}
              />
            </div>
          </div>
        )}

        {/* 사이드바 - 버전 히스토리 */}
        {showHistory && (
          <div className="sidebar history-panel">
            <h3>버전 히스토리</h3>
            <div className="versions-list">
              {versions.map((version) => (
                <div
                  key={version.version}
                  className={`version-item ${
                    selectedVersion === version.version ? 'selected' : ''
                  }`}
                  onClick={() => setSelectedVersion(version.version)}
                >
                  <div className="version-header">
                    <strong>v{version.version}</strong>
                    <small>{version.userName}</small>
                  </div>
                  <small className="version-time">
                    {new Date(version.timestamp).toLocaleTimeString()}
                  </small>
                  <p className="version-summary">{version.changesSummary}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 하단 상태 바 */}
      <div className="editor-footer">
        <div className="char-count">
          문자: {content.length} | 단어: {content.split(/\s+/).filter((w) => w.length > 0).length}
        </div>
        <div className="last-saved">
          {!unsavedChanges && <span>✓ 저장됨</span>}
          {unsavedChanges && <span>● 저장되지 않음</span>}
        </div>
      </div>
    </div>
  );
};

export default CollaborativeEditor;
