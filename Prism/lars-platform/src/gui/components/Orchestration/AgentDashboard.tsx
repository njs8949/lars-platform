import React, { useEffect, useState } from 'react';
import './Orchestration.css';

interface AgentState {
  agent_id: string;
  role: string;
  current_task_id: string | null;
  completed_tasks: number;
  failed_tasks: number;
  last_update: string;
  memory: Record<string, any>;
}

interface OrchestrationStatus {
  orchestration: {
    pending_tasks: number;
    in_progress_tasks: number;
    completed_tasks: number;
    failed_tasks: number;
    agent_states: Record<string, AgentState>;
    auto_recovery_enabled: boolean;
  };
  system_health: {
    total_metrics: number;
    total_alerts: number;
    critical_alerts: number;
  };
  queue: {
    size: number;
    tasks: any[];
  };
  pending_decisions: number;
}

const AgentDashboard: React.FC<{ language?: 'ko' | 'en' }> = ({ language = 'en' }) => {
  const [status, setStatus] = useState<OrchestrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    fetchStatus();
    connectWebSocket();

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/orchestration/status');
      const data = await response.json();
      setStatus(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch orchestration status:', error);
      setLoading(false);
    }
  };

  const connectWebSocket = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/orchestration/ws/status`;

    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'status_update') {
        setStatus({
          orchestration: data.orchestration,
          system_health: data.system_health,
          queue: { size: 0, tasks: [] },
          pending_decisions: 0,
        });
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    setWs(ws);
  };

  if (loading) {
    return <div className="agent-dashboard loading">Loading orchestration status...</div>;
  }

  if (!status) {
    return <div className="agent-dashboard error">Failed to load orchestration data</div>;
  }

  const t = language === 'ko' ? koTexts : enTexts;

  return (
    <div className="agent-dashboard">
      <h2 className="dashboard-title">{t.title}</h2>

      <div className="status-grid">
        <div className="status-card">
          <div className="status-label">{t.pending}</div>
          <div className="status-value">{status.orchestration.pending_tasks}</div>
        </div>
        <div className="status-card">
          <div className="status-label">{t.inProgress}</div>
          <div className="status-value">{status.orchestration.in_progress_tasks}</div>
        </div>
        <div className="status-card">
          <div className="status-label">{t.completed}</div>
          <div className="status-value">{status.orchestration.completed_tasks}</div>
        </div>
        <div className="status-card">
          <div className="status-label">{t.failed}</div>
          <div className="status-value">{status.orchestration.failed_tasks}</div>
        </div>
      </div>

      <div className="agents-section">
        <h3>{t.agentStatus}</h3>
        <div className="agents-grid">
          {Object.entries(status.orchestration.agent_states || {}).map(([agentId, agent]) => (
            <div key={agentId} className="agent-card">
              <div className="agent-role">{agent.role}</div>
              <div className="agent-id">{agentId}</div>
              <div className="agent-stats">
                <div className="stat">
                  <span className="stat-label">{t.completed}:</span>
                  <span className="stat-value">{agent.completed_tasks}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">{t.failed}:</span>
                  <span className="stat-value">{agent.failed_tasks}</span>
                </div>
              </div>
              {agent.current_task_id && (
                <div className="current-task">{t.currentTask}: {agent.current_task_id}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="health-section">
        <h3>{t.systemHealth}</h3>
        <div className="health-stats">
          <div className="health-stat">
            <span>{t.totalMetrics}:</span>
            <span>{status.system_health.total_metrics}</span>
          </div>
          <div className="health-stat">
            <span>{t.alerts}:</span>
            <span className={status.system_health.critical_alerts > 0 ? 'critical' : ''}>
              {status.system_health.total_alerts}
            </span>
          </div>
          <div className="health-stat">
            <span>{t.autoRecovery}:</span>
            <span>{status.orchestration.auto_recovery_enabled ? t.enabled : t.disabled}</span>
          </div>
        </div>
      </div>

      {status.pending_decisions > 0 && (
        <div className="decisions-section">
          <h3>{t.pendingDecisions}: {status.pending_decisions}</h3>
          <div className="decision-alert">{t.userActionRequired}</div>
        </div>
      )}
    </div>
  );
};

const koTexts = {
  title: '에이전트 오케스트레이션 대시보드',
  pending: '대기 중',
  inProgress: '진행 중',
  completed: '완료',
  failed: '실패',
  agentStatus: '에이전트 상태',
  currentTask: '현재 작업',
  systemHealth: '시스템 상태',
  totalMetrics: '총 메트릭',
  alerts: '알림',
  autoRecovery: '자동 복구',
  enabled: '활성화',
  disabled: '비활성화',
  pendingDecisions: '대기 중인 의사결정',
  userActionRequired: '사용자 확인 필요',
};

const enTexts = {
  title: 'Agent Orchestration Dashboard',
  pending: 'Pending',
  inProgress: 'In Progress',
  completed: 'Completed',
  failed: 'Failed',
  agentStatus: 'Agent Status',
  currentTask: 'Current Task',
  systemHealth: 'System Health',
  totalMetrics: 'Total Metrics',
  alerts: 'Alerts',
  autoRecovery: 'Auto Recovery',
  enabled: 'Enabled',
  disabled: 'Disabled',
  pendingDecisions: 'Pending Decisions',
  userActionRequired: 'User action required',
};

export default AgentDashboard;
