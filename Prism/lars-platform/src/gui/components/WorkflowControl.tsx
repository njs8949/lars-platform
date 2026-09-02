/**
 * 워크플로우 제어 UI
 * Phase 3: 워크플로우 중단점 및 사용자 개입
 */

import React from 'react';
import { CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { GlassmorphicIcon } from './GlassmorphicIcon';
import { WorkflowCheckpoint, WorkflowPathOption } from '../types/agent';

interface WorkflowControlProps {
  checkpoint: WorkflowCheckpoint;
  language: string;
  onApprove: (checkpointId: string) => void;
  onReject: (checkpointId: string, reason?: string) => void;
  onSelectPath: (checkpointId: string, optionId: string) => void;
  onAdjustParams: (checkpointId: string, params: Record<string, any>) => void;
}

export const WorkflowControl: React.FC<WorkflowControlProps> = ({
  checkpoint,
  language,
  onApprove,
  onReject,
  onSelectPath,
  onAdjustParams
}) => {
  const [selectedPath, setSelectedPath] = React.useState<string | null>(
    checkpoint.selectedOptionId || null
  );
  const [showDetails, setShowDetails] = React.useState(false);

  const getCheckpointIcon = (type: string) => {
    switch (type) {
      case 'approval':
        return '✋';
      case 'decision':
        return '🔀';
      case 'review':
        return '👁️';
      case 'adjustment':
        return '⚙️';
      default:
        return '📋';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return '#10b981';
      case 'rejected':
        return '#ef4444';
      case 'adjusted':
        return '#f59e0b';
      default:
        return '#60a5fa';
    }
  };

  const handleSelectPath = (optionId: string) => {
    setSelectedPath(optionId);
    onSelectPath(checkpoint.id, optionId);
  };

  return (
    <div
      style={{
        background: 'rgba(0, 0, 0, 0.4)',
        border: `2px solid ${
          checkpoint.status === 'pending' ? '#f59e0b' : getStatusColor(checkpoint.status)
        }`,
        borderRadius: '8px',
        padding: '1rem',
        marginBottom: '1rem'
      }}
    >
      {/* 헤더 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.8rem',
          marginBottom: '0.8rem'
        }}
      >
        <span style={{ fontSize: '1.5rem' }}>
          {getCheckpointIcon(checkpoint.type)}
        </span>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: '0.9rem',
              fontWeight: 600,
              color: '#e2e2e6'
            }}
          >
            {checkpoint.title}
          </div>
          <div
            style={{
              fontSize: '0.8rem',
              color: '#9ba1b0',
              marginTop: '0.2rem'
            }}
          >
            {checkpoint.description}
          </div>
        </div>
        <div
          style={{
            padding: '0.4rem 0.8rem',
            background:
              checkpoint.status === 'pending'
                ? 'rgba(245, 158, 11, 0.2)'
                : `rgba(${
                    checkpoint.status === 'approved'
                      ? '16, 185, 129'
                      : checkpoint.status === 'rejected'
                      ? '239, 68, 68'
                      : '245, 158, 11'
                  }, 0.2)`,
            border: `1px solid ${getStatusColor(checkpoint.status)}`,
            borderRadius: '4px',
            color: getStatusColor(checkpoint.status),
            fontSize: '0.7rem',
            fontWeight: 600,
            textTransform: 'uppercase'
          }}
        >
          {checkpoint.status}
        </div>
      </div>

      {/* 메시지 */}
      <div
        style={{
          background: 'rgba(100, 116, 139, 0.1)',
          border: '1px solid rgba(148, 163, 184, 0.2)',
          borderRadius: '6px',
          padding: '0.8rem',
          marginBottom: '1rem',
          fontSize: '0.85rem',
          color: '#cbd5e1',
          lineHeight: 1.6
        }}
      >
        {checkpoint.message}
      </div>

      {/* Approval 타입 */}
      {checkpoint.type === 'approval' && (
        <div
          style={{
            display: 'flex',
            gap: '0.8rem',
            marginTop: '1rem'
          }}
        >
          <button
            onClick={() => onApprove(checkpoint.id)}
            disabled={checkpoint.status !== 'pending'}
            style={{
              flex: 1,
              padding: '0.8rem',
              background: 'rgba(16, 185, 129, 0.2)',
              border: '1px solid rgba(16, 185, 129, 0.5)',
              color: '#10b981',
              borderRadius: '6px',
              fontWeight: 600,
              cursor: checkpoint.status === 'pending' ? 'pointer' : 'not-allowed',
              opacity: checkpoint.status === 'pending' ? 1 : 0.5,
              transition: 'all 0.2s'
            }}
          >
            ✅ {language === 'ko' ? '승인' : 'Approve'}
          </button>
          <button
            onClick={() => onReject(checkpoint.id)}
            disabled={checkpoint.status !== 'pending'}
            style={{
              flex: 1,
              padding: '0.8rem',
              background: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid rgba(239, 68, 68, 0.5)',
              color: '#ef4444',
              borderRadius: '6px',
              fontWeight: 600,
              cursor: checkpoint.status === 'pending' ? 'pointer' : 'not-allowed',
              opacity: checkpoint.status === 'pending' ? 1 : 0.5,
              transition: 'all 0.2s'
            }}
          >
            ❌ {language === 'ko' ? '거부' : 'Reject'}
          </button>
        </div>
      )}

      {/* Decision 타입 */}
      {checkpoint.type === 'decision' && checkpoint.options && (
        <div style={{ marginTop: '1rem' }}>
          <div
            style={{
              fontSize: '0.85rem',
              fontWeight: 600,
              color: '#60a5fa',
              marginBottom: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            🔀 {language === 'ko' ? '실행 경로 선택' : 'Select Execution Path'}
          </div>
          <div
            style={{
              display: 'grid',
              gap: '0.8rem'
            }}
          >
            {checkpoint.options.map((option) => (
              <div
                key={option.id}
                onClick={() => handleSelectPath(option.id)}
                style={{
                  padding: '1rem',
                  background:
                    selectedPath === option.id
                      ? 'rgba(59, 130, 246, 0.2)'
                      : 'rgba(0, 0, 0, 0.2)',
                  border:
                    selectedPath === option.id
                      ? '2px solid #3b82f6'
                      : '1px solid rgba(148, 163, 184, 0.2)',
                  borderRadius: '6px',
                  cursor: checkpoint.status === 'pending' ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s',
                  opacity: checkpoint.status === 'pending' ? 1 : 0.6
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '0.6rem'
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontWeight: 600,
                        color: '#e2e2e6',
                        fontSize: '0.9rem',
                        marginBottom: '0.3rem'
                      }}
                    >
                      {option.label}
                    </div>
                    <div
                      style={{
                        fontSize: '0.8rem',
                        color: '#9ba1b0'
                      }}
                    >
                      {option.description}
                    </div>
                  </div>
                  {selectedPath === option.id && (
                    <div
                      style={{
                        padding: '0.3rem 0.6rem',
                        background: 'rgba(59, 130, 246, 0.3)',
                        borderRadius: '3px',
                        color: '#60a5fa',
                        fontSize: '0.7rem',
                        fontWeight: 600
                      }}
                    >
                      SELECTED
                    </div>
                  )}
                </div>

                {/* 경로 메트릭 */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '0.6rem',
                    marginTop: '0.8rem',
                    paddingTop: '0.8rem',
                    borderTop: '1px solid rgba(148, 163, 184, 0.1)'
                  }}
                >
                  <div
                    style={{
                      textAlign: 'center',
                      fontSize: '0.75rem'
                    }}
                  >
                    <div style={{ color: '#f59e0b', fontWeight: 600 }}>
                      {option.estimatedTime}분
                    </div>
                    <div style={{ color: '#9ba1b0', marginTop: '0.2rem' }}>
                      {language === 'ko' ? '소요시간' : 'Time'}
                    </div>
                  </div>
                  <div
                    style={{
                      textAlign: 'center',
                      fontSize: '0.75rem'
                    }}
                  >
                    <div style={{ color: '#ec4899', fontWeight: 600 }}>
                      {option.estimatedCost}/10
                    </div>
                    <div style={{ color: '#9ba1b0', marginTop: '0.2rem' }}>
                      {language === 'ko' ? '비용' : 'Cost'}
                    </div>
                  </div>
                  <div
                    style={{
                      textAlign: 'center',
                      fontSize: '0.75rem'
                    }}
                  >
                    <div style={{ color: '#10b981', fontWeight: 600 }}>
                      {option.quality}%
                    </div>
                    <div style={{ color: '#9ba1b0', marginTop: '0.2rem' }}>
                      {language === 'ko' ? '품질' : 'Quality'}
                    </div>
                  </div>
                  <div
                    style={{
                      textAlign: 'center',
                      fontSize: '0.75rem'
                    }}
                  >
                    <div style={{ color: '#ef4444', fontWeight: 600 }}>
                      {option.risk}%
                    </div>
                    <div style={{ color: '#9ba1b0', marginTop: '0.2rem' }}>
                      {language === 'ko' ? '위험도' : 'Risk'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Review 타입 */}
      {checkpoint.type === 'review' && (
        <div
          style={{
            display: 'flex',
            gap: '0.8rem',
            marginTop: '1rem'
          }}
        >
          <button
            onClick={() => onApprove(checkpoint.id)}
            disabled={checkpoint.status !== 'pending'}
            style={{
              flex: 1,
              padding: '0.8rem',
              background: 'rgba(16, 185, 129, 0.2)',
              border: '1px solid rgba(16, 185, 129, 0.5)',
              color: '#10b981',
              borderRadius: '6px',
              fontWeight: 600,
              cursor: checkpoint.status === 'pending' ? 'pointer' : 'not-allowed',
              opacity: checkpoint.status === 'pending' ? 1 : 0.5
            }}
          >
            ✅ {language === 'ko' ? '확인' : 'Confirm'}
          </button>
          <button
            onClick={() => setShowDetails(!showDetails)}
            style={{
              flex: 1,
              padding: '0.8rem',
              background: 'rgba(96, 165, 250, 0.2)',
              border: '1px solid rgba(96, 165, 250, 0.5)',
              color: '#60a5fa',
              borderRadius: '6px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            📊 {language === 'ko' ? '상세보기' : 'Details'}
          </button>
        </div>
      )}

      {/* 상세 정보 */}
      {showDetails && (
        <div
          style={{
            marginTop: '1rem',
            padding: '0.8rem',
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '6px',
            fontSize: '0.8rem',
            color: '#cbd5e1',
            fontFamily: 'monospace'
          }}
        >
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {JSON.stringify(checkpoint, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};
