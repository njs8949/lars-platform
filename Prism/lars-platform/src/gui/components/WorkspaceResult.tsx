import React, { useState } from 'react';
import { ChevronDown, CheckCircle2, AlertCircle } from 'lucide-react';
import { GlassmorphicIcon } from './GlassmorphicIcon';
import { WorkflowControl } from './WorkflowControl';
import { AgentPoolVisualization } from './AgentPoolVisualization';
import { AgentPoolState } from '../../types/agent';

interface WorkspaceStep {
  step: number;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  agents: {
    name: string;
    status: 'pending' | 'processing' | 'completed' | 'error';
    result?: string;
  }[];
  duration?: number;
  agentMessages?: Array<{
    agent: string;
    message: string;
    timestamp: number;
  }>;
  actionLogs?: Array<{
    agent: string;
    action: string;
    description: string;
    status: 'initiated' | 'processing' | 'completed' | 'failed';
    input?: any;
    output?: any;
    timestamp: number;
    duration?: number;
  }>;
  artifacts?: Array<{
    id: string;
    name: string;
    type: 'file' | 'directory' | 'analysis' | 'report';
    path: string;
    createdBy: string;
    createdAt: number;
    preview?: string;
  }>;
  checkpoints?: Array<{
    id: string;
    stepNumber: number;
    type: 'approval' | 'decision' | 'review' | 'adjustment';
    title: string;
    description: string;
    message: string;
    status: 'pending' | 'approved' | 'rejected' | 'adjusted';
    options?: Array<{
      id: string;
      label: string;
      description: string;
      estimatedTime: number;
      estimatedCost: number;
      quality: number;
      risk: number;
      agents?: string[];
      config?: Record<string, any>;
    }>;
    selectedOptionId?: string;
    userApprovalRequired: boolean;
    timestamp: number;
    resolvedAt?: number;
    feedback?: string;
  }>;
}

interface WorkspaceResultProps {
  steps: WorkspaceStep[];
  language: string;
  finalResult: string;
  onCheckpointApprove?: (stepNumber: number, checkpointId: string) => void;
  onCheckpointReject?: (stepNumber: number, checkpointId: string, reason?: string) => void;
  onPathSelect?: (stepNumber: number, checkpointId: string, optionId: string) => void;
  agentPoolState?: AgentPoolState | null;
}

const WorkspaceResult: React.FC<WorkspaceResultProps> = ({
  steps,
  language,
  finalResult,
  onCheckpointApprove,
  onCheckpointReject,
  onPathSelect,
  agentPoolState
}) => {
  const [expandedSteps, setExpandedSteps] = useState<number[]>([]);

  const toggleStep = (stepNum: number) => {
    setExpandedSteps(prev =>
      prev.includes(stepNum)
        ? prev.filter(s => s !== stepNum)
        : [...prev, stepNum]
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <GlassmorphicIcon Icon={CheckCircle2} gradient="from-emerald-400 to-teal-500" size={20} />;
      case 'processing':
        return <div style={{
          width: 20,
          height: 20,
          border: '2px solid #60a5fa',
          borderRadius: '50%',
          borderTopColor: 'transparent',
          animation: 'spin 0.8s linear infinite'
        }} />;
      case 'error':
        return <GlassmorphicIcon Icon={AlertCircle} gradient="from-red-400 to-red-500" size={20} />;
      default:
        return <div style={{
          width: 20,
          height: 20,
          border: '2px solid #6b7280',
          borderRadius: '50%'
        }} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#10b981';
      case 'processing':
        return '#60a5fa';
      case 'error':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  return (
    <div style={{
      background: 'rgba(15, 23, 42, 0.5)',
      border: '1px solid rgba(100, 108, 255, 0.2)',
      borderRadius: '12px',
      padding: '1rem',
      marginTop: '1rem'
    }}>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Phase 4: Multi-Agent Orchestration */}
      {agentPoolState && (
        <AgentPoolVisualization
          poolState={agentPoolState}
          language={language}
        />
      )}

      <div style={{
        display: 'grid',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        {steps.map((step) => (
          <div key={step.step} style={{
            border: `1px solid ${getStatusColor(step.status)}33`,
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            <button
              onClick={() => toggleStep(step.step)}
              style={{
                width: '100%',
                padding: '1rem',
                background: `${getStatusColor(step.status)}11`,
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.8rem',
                textAlign: 'left',
                color: '#e2e2e6',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = `${getStatusColor(step.status)}22`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = `${getStatusColor(step.status)}11`;
              }}
            >
              {getStatusIcon(step.status)}
              <div style={{flex: 1}}>
                <div style={{fontWeight: 600, fontSize: '0.95rem'}}>
                  {language === 'ko' ? `단계 ${step.step}: ${step.name}` : `Step ${step.step}: ${step.name}`}
                </div>
                {step.duration && (
                  <div style={{fontSize: '0.8rem', color: '#9ba1b0', marginTop: '0.2rem'}}>
                    {step.duration}ms
                  </div>
                )}
              </div>
              <ChevronDown
                size={18}
                style={{
                  transform: expandedSteps.includes(step.step) ? 'rotate(180deg)' : '',
                  transition: 'all 0.2s'
                }}
              />
            </button>

            {expandedSteps.includes(step.step) && (
              <div style={{
                padding: '1rem',
                borderTop: `1px solid ${getStatusColor(step.status)}33`,
                display: 'grid',
                gap: '1rem'
              }}>
                {/* Workflow Checkpoints (Phase 3) */}
                {step.checkpoints && step.checkpoints.length > 0 && (
                  <div>
                    <div style={{
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: '#f59e0b',
                      marginBottom: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}>
                      ⏸️ {language === 'ko' ? '워크플로우 제어' : 'Workflow Control'}
                    </div>
                    {step.checkpoints.map((checkpoint, idx) => (
                      <div key={idx} style={{ marginBottom: '1rem' }}>
                        <WorkflowControl
                          checkpoint={checkpoint}
                          language={language}
                          onApprove={(id) => onCheckpointApprove?.(step.step, id)}
                          onReject={(id, reason) => onCheckpointReject?.(step.step, id, reason)}
                          onSelectPath={(id, optionId) => onPathSelect?.(step.step, id, optionId)}
                          onAdjustParams={() => {}}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Agent Messages (Live Communication) */}
                {step.agentMessages && step.agentMessages.length > 0 && (
                  <div style={{
                    background: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: '8px',
                    padding: '0.8rem',
                    border: '1px solid rgba(59, 130, 246, 0.2)'
                  }}>
                    <div style={{
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: '#60a5fa',
                      marginBottom: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}>
                      💬 {language === 'ko' ? '에이전트 대화' : 'Agent Communication'}
                    </div>
                    <div style={{
                      display: 'grid',
                      gap: '0.6rem',
                      maxHeight: '300px',
                      overflowY: 'auto'
                    }}>
                      {step.agentMessages.map((msg, idx) => (
                        <div key={idx} style={{
                          display: 'flex',
                          gap: '0.8rem',
                          alignItems: 'flex-start'
                        }}>
                          <div style={{
                            minWidth: '80px',
                            padding: '0.4rem 0.8rem',
                            background: 'rgba(59, 130, 246, 0.2)',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: '#60a5fa',
                            whiteSpace: 'nowrap'
                          }}>
                            {msg.agent}
                          </div>
                          <div style={{
                            flex: 1,
                            padding: '0.6rem',
                            background: 'rgba(100, 116, 139, 0.1)',
                            borderRadius: '6px',
                            borderLeft: '2px solid #60a5fa',
                            fontSize: '0.8rem',
                            color: '#cbd5e1',
                            lineHeight: 1.5
                          }}>
                            {msg.message}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Agent Action Logs (작업 로그) */}
                {step.actionLogs && step.actionLogs.length > 0 && (
                  <div style={{
                    background: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: '8px',
                    padding: '0.8rem',
                    border: '1px solid rgba(34, 197, 94, 0.2)'
                  }}>
                    <div style={{
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: '#22c55e',
                      marginBottom: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}>
                      ⚙️ {language === 'ko' ? '에이전트 작업' : 'Agent Tasks'}
                    </div>
                    <div style={{
                      display: 'grid',
                      gap: '0.6rem',
                      maxHeight: '350px',
                      overflowY: 'auto'
                    }}>
                      {step.actionLogs.map((log, idx) => (
                        <div key={idx} style={{
                          padding: '0.6rem',
                          background: 'rgba(0, 0, 0, 0.2)',
                          borderRadius: '4px',
                          borderLeft: `3px solid ${
                            log.status === 'completed' ? '#22c55e' :
                            log.status === 'failed' ? '#ef4444' :
                            log.status === 'processing' ? '#f59e0b' :
                            '#6b7280'
                          }`,
                          fontSize: '0.75rem'
                        }}>
                          <div style={{
                            display: 'flex',
                            gap: '0.4rem',
                            alignItems: 'center',
                            marginBottom: '0.3rem'
                          }}>
                            <span style={{
                              padding: '0.2rem 0.4rem',
                              background: 'rgba(59, 130, 246, 0.3)',
                              borderRadius: '2px',
                              color: '#60a5fa',
                              fontWeight: 600
                            }}>
                              {log.agent}
                            </span>
                            <span style={{color: '#cbd5e1'}}>
                              {log.description}
                            </span>
                            {log.duration && (
                              <span style={{
                                marginLeft: 'auto',
                                color: '#9ba1b0',
                                fontSize: '0.7rem'
                              }}>
                                {log.duration}ms
                              </span>
                            )}
                          </div>
                          {log.output && (
                            <div style={{
                              color: '#cbd5e1',
                              paddingLeft: '0.4rem',
                              borderLeft: '1px solid rgba(148, 163, 184, 0.2)',
                              marginLeft: '0.4rem',
                              fontSize: '0.7rem',
                              lineHeight: 1.4,
                              maxHeight: '60px',
                              overflow: 'auto'
                            }}>
                              {typeof log.output === 'string'
                                ? log.output.substring(0, 100)
                                : JSON.stringify(log.output).substring(0, 100)}
                              {typeof log.output === 'string' && log.output.length > 100
                                ? '...'
                                : typeof log.output === 'object' && JSON.stringify(log.output).length > 100
                                ? '...'
                                : ''}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Generated Artifacts (생성된 산출물) */}
                {step.artifacts && step.artifacts.length > 0 && (
                  <div style={{
                    background: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: '8px',
                    padding: '0.8rem',
                    border: '1px solid rgba(168, 85, 247, 0.2)'
                  }}>
                    <div style={{
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: '#a855f7',
                      marginBottom: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}>
                      📦 {language === 'ko' ? '생성된 산출물' : 'Artifacts'}
                    </div>
                    <div style={{
                      display: 'grid',
                      gap: '0.6rem'
                    }}>
                      {step.artifacts.map((artifact, idx) => (
                        <div key={idx} style={{
                          padding: '0.6rem',
                          background: 'rgba(0, 0, 0, 0.2)',
                          borderRadius: '4px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '0.8rem'
                        }}>
                          <div>
                            <div style={{color: '#cbd5e1', fontWeight: 500}}>
                              {artifact.name}
                            </div>
                            <div style={{color: '#9ba1b0', fontSize: '0.7rem'}}>
                              {artifact.type} • {artifact.path}
                            </div>
                          </div>
                          <div style={{
                            padding: '0.2rem 0.6rem',
                            background: 'rgba(168, 85, 247, 0.2)',
                            borderRadius: '3px',
                            color: '#a855f7',
                            fontSize: '0.7rem'
                          }}>
                            {artifact.createdBy}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Agent Results */}
                <div style={{display: 'grid', gap: '0.8rem'}}>
                  {step.agents.map((agent, idx) => (
                    <div key={idx} style={{
                      padding: '0.8rem',
                      background: 'rgba(0, 0, 0, 0.2)',
                      borderRadius: '6px',
                      borderLeft: `3px solid ${getStatusColor(agent.status)}`
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                        marginBottom: '0.4rem'
                      }}>
                        {getStatusIcon(agent.status)}
                        <span style={{fontWeight: 600, fontSize: '0.9rem'}}>
                          {agent.name}
                        </span>
                      </div>
                      {agent.result && (
                        <div style={{
                          fontSize: '0.8rem',
                          color: '#cbd5e1',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word'
                        }}>
                          {agent.result}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {finalResult && (
        <div style={{
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: '8px',
          padding: '1rem',
          color: '#e2e2e6'
        }}>
          <div style={{fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.8rem', color: '#60a5fa'}}>
            {language === 'ko' ? '최종 결과' : 'Final Result'}
          </div>
          <div style={{fontSize: '0.9rem', lineHeight: 1.6}}>
            {finalResult}
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkspaceResult;
