/**
 * 에이전트 풀 시각화 UI
 * Phase 4: Multi-Agent Orchestration
 * 병렬 에이전트 조율 상태 표시
 */

import React, { useEffect, useState } from 'react';
import { AgentPoolState, SpecializedAgent, ParallelTaskBatch } from '../../types/agent';

interface AgentPoolVisualizationProps {
  poolState: AgentPoolState;
  language: string;
}

export const AgentPoolVisualization: React.FC<AgentPoolVisualizationProps> = ({
  poolState,
  language
}) => {
  const [visibleBatches, setVisibleBatches] = useState<Set<string>>(new Set());

  const toggleBatchDetail = (batchId: string) => {
    const newVisible = new Set(visibleBatches);
    if (newVisible.has(batchId)) {
      newVisible.delete(batchId);
    } else {
      newVisible.add(batchId);
    }
    setVisibleBatches(newVisible);
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'idle':
        return '#6b7280';  // gray
      case 'working':
        return '#3b82f6';  // blue
      case 'completed':
        return '#10b981';  // green
      case 'failed':
        return '#ef4444';  // red
      default:
        return '#9ca3af';  // default gray
    }
  };

  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'idle':
        return '⏸️';
      case 'working':
        return '⚙️';
      case 'completed':
        return '✅';
      case 'failed':
        return '❌';
      default:
        return '📦';
    }
  };

  const getBatchStatusColor = (status: string): string => {
    switch (status) {
      case 'queued':
        return '#f59e0b';  // amber
      case 'executing':
        return '#3b82f6';  // blue
      case 'completed':
        return '#10b981';  // green
      case 'failed':
        return '#ef4444';  // red
      default:
        return '#9ca3af';  // gray
    }
  };

  return (
    <div
      style={{
        background: 'rgba(0, 0, 0, 0.3)',
        border: '1px solid rgba(148, 163, 184, 0.2)',
        borderRadius: '8px',
        padding: '1.5rem',
        marginBottom: '1.5rem'
      }}
    >
      {/* 제목 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          marginBottom: '1.2rem'
        }}
      >
        <span style={{ fontSize: '1.3rem' }}>🤖</span>
        <h3
          style={{
            fontSize: '1.1rem',
            fontWeight: 700,
            color: '#e2e2e6',
            margin: 0
          }}
        >
          {language === 'ko' ? 'Multi-Agent Orchestration' : 'Multi-Agent Orchestration'}
        </h3>
      </div>

      {/* 풀 통계 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '0.8rem',
          marginBottom: '1.5rem'
        }}
      >
        <StatCard
          label={language === 'ko' ? '전체 에이전트' : 'Total Agents'}
          value={poolState.totalAgents}
          color="#60a5fa"
        />
        <StatCard
          label={language === 'ko' ? '활성 에이전트' : 'Active Agents'}
          value={poolState.activeAgents}
          color="#3b82f6"
        />
        <StatCard
          label={language === 'ko' ? '유휴 에이전트' : 'Idle Agents'}
          value={poolState.idleAgents}
          color="#6b7280"
        />
        <StatCard
          label={language === 'ko' ? '전체 진행도' : 'Overall Progress'}
          value={`${poolState.overallProgress}%`}
          color="#10b981"
        />
        <StatCard
          label={language === 'ko' ? '처리량' : 'Throughput'}
          value={`${poolState.throughput} t/s`}
          color="#f59e0b"
        />
        <StatCard
          label={language === 'ko' ? '남은 시간' : 'Time Left'}
          value={
            poolState.estimatedTimeRemaining
              ? `${Math.round(poolState.estimatedTimeRemaining / 1000)}s`
              : '-'
          }
          color="#ec4899"
        />
      </div>

      {/* 에이전트 풀 */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div
          style={{
            fontSize: '0.9rem',
            fontWeight: 600,
            color: '#cbd5e1',
            marginBottom: '0.8rem',
            paddingBottom: '0.6rem',
            borderBottom: '1px solid rgba(148, 163, 184, 0.1)'
          }}
        >
          {language === 'ko' ? '에이전트 풀 상태' : 'Agent Pool Status'}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
            gap: '0.8rem'
          }}
        >
          {poolState.agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      </div>

      {/* 병렬 작업 배치 */}
      <div>
        <div
          style={{
            fontSize: '0.9rem',
            fontWeight: 600,
            color: '#cbd5e1',
            marginBottom: '0.8rem',
            paddingBottom: '0.6rem',
            borderBottom: '1px solid rgba(148, 163, 184, 0.1)'
          }}
        >
          {language === 'ko'
            ? `병렬 작업 배치 (${poolState.batches.length})`
            : `Parallel Task Batches (${poolState.batches.length})`}
        </div>

        <div style={{ display: 'grid', gap: '0.8rem' }}>
          {poolState.batches.map((batch) => (
            <BatchCard
              key={batch.id}
              batch={batch}
              isExpanded={visibleBatches.has(batch.id)}
              onToggle={() => toggleBatchDetail(batch.id)}
              language={language}
              getBatchStatusColor={getBatchStatusColor}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * 통계 카드 컴포넌트
 */
const StatCard: React.FC<{ label: string; value: any; color: string }> = ({
  label,
  value,
  color
}) => (
  <div
    style={{
      background: 'rgba(0, 0, 0, 0.2)',
      border: `1px solid rgba(${hexToRgb(color).join(', ')}, 0.3)`,
      borderRadius: '6px',
      padding: '0.8rem',
      textAlign: 'center'
    }}
  >
    <div
      style={{
        fontSize: '1.3rem',
        fontWeight: 700,
        color,
        marginBottom: '0.3rem'
      }}
    >
      {value}
    </div>
    <div
      style={{
        fontSize: '0.75rem',
        color: '#9ba1b0'
      }}
    >
      {label}
    </div>
  </div>
);

/**
 * 에이전트 카드 컴포넌트
 */
const AgentCard: React.FC<{ agent: SpecializedAgent }> = ({ agent }) => {
  const statusColor = getStatusColor(agent.status);

  return (
    <div
      style={{
        background: 'rgba(0, 0, 0, 0.2)',
        border: `1px solid rgba(${hexToRgb(statusColor).join(', ')}, 0.3)`,
        borderRadius: '6px',
        padding: '0.8rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.4rem'
      }}
    >
      <div style={{ fontSize: '1.2rem' }}>{getStatusIcon(agent.status)}</div>
      <div
        style={{
          fontSize: '0.75rem',
          fontWeight: 600,
          color: '#e2e2e6',
          textAlign: 'center',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          width: '100%'
        }}
        title={agent.name}
      >
        {agent.name}
      </div>
      <div
        style={{
          fontSize: '0.7rem',
          color: '#9ba1b0'
        }}
      >
        {agent.specialty}
      </div>
      <div
        style={{
          fontSize: '0.7rem',
          color: statusColor,
          fontWeight: 600,
          marginTop: '0.2rem'
        }}
      >
        {agent.status.toUpperCase()}
      </div>
      <div
        style={{
          fontSize: '0.65rem',
          color: '#6b7280',
          marginTop: '0.3rem'
        }}
      >
        {agent.completedTasks}/{agent.assignedTasks.length}
      </div>
    </div>
  );
};

/**
 * 배치 카드 컴포넌트
 */
const BatchCard: React.FC<{
  batch: ParallelTaskBatch;
  isExpanded: boolean;
  onToggle: () => void;
  language: string;
  getBatchStatusColor: (status: string) => string;
}> = ({ batch, isExpanded, onToggle, language, getBatchStatusColor }) => {
  const statusColor = getBatchStatusColor(batch.status);

  return (
    <div
      style={{
        background: 'rgba(0, 0, 0, 0.2)',
        border: `1px solid rgba(${hexToRgb(statusColor).join(', ')}, 0.3)`,
        borderRadius: '6px',
        overflow: 'hidden'
      }}
    >
      {/* 배치 헤더 */}
      <div
        onClick={onToggle}
        style={{
          padding: '0.8rem',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          transition: 'all 0.2s'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.8rem',
            flex: 1
          }}
        >
          <span style={{ fontSize: '1rem' }}>📦</span>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e2e2e6' }}>
              {language === 'ko' ? `배치 #${batch.batchNumber}` : `Batch #${batch.batchNumber}`}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#9ba1b0' }}>
              {batch.totalTasks} {language === 'ko' ? '작업' : 'tasks'} • {batch.agents.length}{' '}
              {language === 'ko' ? '에이전트' : 'agents'}
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}
        >
          {/* 진행 바 */}
          <div
            style={{
              width: '100px',
              height: '6px',
              background: 'rgba(0, 0, 0, 0.4)',
              borderRadius: '3px',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${
                  batch.totalTasks > 0
                    ? ((batch.successCount + batch.failureCount) / batch.totalTasks) * 100
                    : 0
                }%`,
                background: statusColor,
                transition: 'width 0.3s'
              }}
            />
          </div>

          {/* 상태 배지 */}
          <div
            style={{
              padding: '0.3rem 0.6rem',
              background: `rgba(${hexToRgb(statusColor).join(', ')}, 0.2)`,
              border: `1px solid ${statusColor}`,
              borderRadius: '3px',
              color: statusColor,
              fontSize: '0.65rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              minWidth: '60px',
              textAlign: 'center'
            }}
          >
            {batch.status}
          </div>

          {/* 펼치기 버튼 */}
          <div
            style={{
              color: '#9ba1b0',
              fontSize: '1rem',
              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s'
            }}
          >
            ▼
          </div>
        </div>
      </div>

      {/* 확장된 상세 정보 */}
      {isExpanded && (
        <div
          style={{
            padding: '0.8rem',
            background: 'rgba(0, 0, 0, 0.1)',
            borderTop: `1px solid rgba(${hexToRgb(statusColor).join(', ')}, 0.2)`,
            fontSize: '0.8rem',
            color: '#cbd5e1'
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.8rem', marginBottom: '0.8rem' }}>
            <div>
              <div style={{ color: '#9ba1b0', fontSize: '0.7rem' }}>
                {language === 'ko' ? '성공' : 'Success'}
              </div>
              <div style={{ color: '#10b981', fontWeight: 600 }}>{batch.successCount}</div>
            </div>
            <div>
              <div style={{ color: '#9ba1b0', fontSize: '0.7rem' }}>
                {language === 'ko' ? '실패' : 'Failed'}
              </div>
              <div style={{ color: '#ef4444', fontWeight: 600 }}>{batch.failureCount}</div>
            </div>
            <div>
              <div style={{ color: '#9ba1b0', fontSize: '0.7rem' }}>
                {language === 'ko' ? '소요시간' : 'Execution Time'}
              </div>
              <div style={{ color: '#60a5fa', fontWeight: 600 }}>
                {batch.totalExecutionTime ? `${Math.round(batch.totalExecutionTime)}ms` : '-'}
              </div>
            </div>
            <div>
              <div style={{ color: '#9ba1b0', fontSize: '0.7rem' }}>
                {language === 'ko' ? '성공률' : 'Success Rate'}
              </div>
              <div style={{ color: '#10b981', fontWeight: 600 }}>
                {batch.totalTasks > 0
                  ? `${Math.round((batch.successCount / batch.totalTasks) * 100)}%`
                  : '-'}
              </div>
            </div>
          </div>

          {/* 에이전트 목록 */}
          <div style={{ marginTop: '0.8rem' }}>
            <div style={{ color: '#9ba1b0', fontSize: '0.7rem', marginBottom: '0.4rem' }}>
              {language === 'ko' ? '할당된 에이전트' : 'Assigned Agents'}
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {batch.agents.map((agent) => (
                <div
                  key={agent.id}
                  style={{
                    padding: '0.3rem 0.6rem',
                    background: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: '3px',
                    fontSize: '0.7rem',
                    color: '#cbd5e1'
                  }}
                >
                  {agent.name}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * 헥스 색상을 RGB로 변환
 */
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [96, 165, 250];
}

function getStatusIcon(status: string): string {
  switch (status) {
    case 'idle':
      return '⏸️';
    case 'working':
      return '⚙️';
    case 'completed':
      return '✅';
    case 'failed':
      return '❌';
    default:
      return '📦';
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'idle':
      return '#6b7280';
    case 'working':
      return '#3b82f6';
    case 'completed':
      return '#10b981';
    case 'failed':
      return '#ef4444';
    default:
      return '#9ca3af';
  }
}
