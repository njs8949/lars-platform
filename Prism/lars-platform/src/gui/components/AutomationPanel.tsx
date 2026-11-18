import React, { useState } from 'react';
import { Play, Pause, Trash2, Plus, Clock, Zap } from 'lucide-react';
import '../styles/AutomationPanel.css';

interface Task {
  id: string;
  name: string;
  action: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress?: number;
}

interface Workflow {
  id: string;
  name: string;
  tasks: Task[];
  trigger: 'manual' | 'schedule' | 'webhook';
  schedule?: string;
  enabled: boolean;
  executionCount: number;
  lastRun?: string;
}

interface BatchJob {
  id: string;
  name: string;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
}

export const AutomationPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'workflows' | 'tasks' | 'batch'>('workflows');
  const [workflows, setWorkflows] = useState<Workflow[]>([
    {
      id: 'wf_1',
      name: '일일 데이터 분석',
      tasks: [
        { id: 't_1', name: '데이터 로드', action: 'load_data', status: 'completed' },
        { id: 't_2', name: '통계 분석', action: 'statistics', status: 'completed' },
        { id: 't_3', name: '보고서 생성', action: 'generate_report', status: 'completed' },
      ],
      trigger: 'schedule',
      schedule: '0 9 * * *',
      enabled: true,
      executionCount: 15,
      lastRun: '2026-09-05 09:00:00',
    },
  ]);

  const [batchJobs, setBatchJobs] = useState<BatchJob[]>([]);

  const handleRunWorkflow = async (workflowId: string) => {
    console.log(`실행: ${workflowId}`);
    // API 호출
  };

  const handleToggleWorkflow = (workflowId: string) => {
    setWorkflows(workflows.map(w =>
      w.id === workflowId ? { ...w, enabled: !w.enabled } : w
    ));
  };

  return (
    <div className="automation-panel">
      {/* 탭 네비게이션 */}
      <div className="automation-tabs">
        <button
          className={`tab-btn ${activeTab === 'workflows' ? 'active' : ''}`}
          onClick={() => setActiveTab('workflows')}
        >
          <Clock size={18} />
          워크플로우
        </button>
        <button
          className={`tab-btn ${activeTab === 'tasks' ? 'active' : ''}`}
          onClick={() => setActiveTab('tasks')}
        >
          <Zap size={18} />
          작업
        </button>
        <button
          className={`tab-btn ${activeTab === 'batch' ? 'active' : ''}`}
          onClick={() => setActiveTab('batch')}
        >
          <Plus size={18} />
          배치 처리
        </button>
      </div>

      {/* 워크플로우 탭 */}
      {activeTab === 'workflows' && (
        <div className="automation-content">
          <div className="automation-header">
            <h3>🔄 워크플로우</h3>
            <button className="btn-primary">
              <Plus size={18} />
              새 워크플로우
            </button>
          </div>

          <div className="workflows-list">
            {workflows.map(workflow => (
              <div key={workflow.id} className="workflow-card">
                <div className="workflow-header">
                  <h4>{workflow.name}</h4>
                  <span className={`status-badge ${workflow.enabled ? 'active' : 'inactive'}`}>
                    {workflow.enabled ? '활성' : '비활성'}
                  </span>
                </div>

                <div className="workflow-info">
                  <div className="info-row">
                    <span className="label">트리거:</span>
                    <span className="value">
                      {workflow.trigger === 'schedule' ? `일정 (${workflow.schedule})` : workflow.trigger}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="label">실행 횟수:</span>
                    <span className="value">{workflow.executionCount}회</span>
                  </div>
                  <div className="info-row">
                    <span className="label">마지막 실행:</span>
                    <span className="value">{workflow.lastRun || '아직 없음'}</span>
                  </div>
                </div>

                <div className="workflow-tasks">
                  <strong>작업:</strong>
                  <div className="tasks-chain">
                    {workflow.tasks.map((task, idx) => (
                      <React.Fragment key={task.id}>
                        <div className={`task-step ${task.status}`}>
                          <span>{task.name}</span>
                          <span className="step-status">{task.status === 'completed' ? '✓' : '○'}</span>
                        </div>
                        {idx < workflow.tasks.length - 1 && <div className="chain-arrow">→</div>}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                <div className="workflow-actions">
                  <button
                    className="btn-success"
                    onClick={() => handleRunWorkflow(workflow.id)}
                  >
                    <Play size={16} />
                    실행
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => handleToggleWorkflow(workflow.id)}
                  >
                    {workflow.enabled ? <Pause size={16} /> : <Play size={16} />}
                    {workflow.enabled ? '중지' : '활성화'}
                  </button>
                  <button className="btn-danger">
                    <Trash2 size={16} />
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 작업 탭 */}
      {activeTab === 'tasks' && (
        <div className="automation-content">
          <div className="automation-header">
            <h3>⚡ 작업</h3>
            <button className="btn-primary">
              <Plus size={18} />
              새 작업
            </button>
          </div>

          <div className="tasks-grid">
            <div className="task-card">
              <div className="task-icon">⚙️</div>
              <h4>데이터 분석</h4>
              <p>통계 분석 및 예측</p>
              <button className="btn-small">실행</button>
            </div>
            <div className="task-card">
              <div className="task-icon">📊</div>
              <h4>보고서 생성</h4>
              <p>PDF 보고서 자동 생성</p>
              <button className="btn-small">실행</button>
            </div>
            <div className="task-card">
              <div className="task-icon">📧</div>
              <h4>이메일 발송</h4>
              <p>결과 메일 발송</p>
              <button className="btn-small">실행</button>
            </div>
          </div>
        </div>
      )}

      {/* 배치 처리 탭 */}
      {activeTab === 'batch' && (
        <div className="automation-content">
          <div className="automation-header">
            <h3>📦 배치 처리</h3>
            <button className="btn-primary">
              <Plus size={18} />
              새 배치 작업
            </button>
          </div>

          {batchJobs.length === 0 ? (
            <div className="empty-state">
              <p>배치 작업이 없습니다</p>
              <button className="btn-primary">
                <Plus size={18} />
                배치 작업 생성
              </button>
            </div>
          ) : (
            <div className="batch-jobs-list">
              {batchJobs.map(job => (
                <div key={job.id} className="batch-card">
                  <h4>{job.name}</h4>
                  <div className="batch-progress">
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${(job.completedTasks / job.totalTasks) * 100}%` }}
                      />
                    </div>
                    <span>
                      {job.completedTasks}/{job.totalTasks}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
