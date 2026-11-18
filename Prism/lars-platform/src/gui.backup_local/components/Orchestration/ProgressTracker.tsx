import React, { useEffect, useState } from 'react';

interface Task {
  id: string;
  status: string;
  goal: string;
  result?: string;
  error?: string;
  retry_count: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

interface WorkflowProgress {
  workflow_id: string;
  total_tasks: number;
  completed_tasks: number;
  failed_tasks: number;
  progress_percent: number;
}

const ProgressTracker: React.FC<{ language?: 'ko' | 'en' }> = ({ language = 'en' }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [workflowProgress, setWorkflowProgress] = useState<WorkflowProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await fetch('/api/orchestration/status');
      const data = await response.json();
      if (data.queue && data.queue.tasks) {
        setTasks(data.queue.tasks);
      }
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10b981';
      case 'in_progress': return '#3b82f6';
      case 'failed': return '#ef4444';
      case 'retrying': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✓';
      case 'in_progress': return '⟳';
      case 'failed': return '✕';
      case 'retrying': return '↻';
      default: return '◯';
    }
  };

  const t = language === 'ko' ? koTexts : enTexts;

  if (loading) {
    return <div className="progress-tracker">{t.loading}</div>;
  }

  return (
    <div className="progress-tracker">
      <h2 className="tracker-title">{t.title}</h2>

      <div className="task-list">
        {tasks.length === 0 ? (
          <p className="empty-message">{t.noTasks}</p>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className="task-item"
              style={{ borderLeftColor: getStatusColor(task.status) }}
              onClick={() => setSelectedTask(task)}
            >
              <div className="task-header">
                <span className="task-status" style={{ color: getStatusColor(task.status) }}>
                  {getStatusIcon(task.status)}
                </span>
                <div className="task-info">
                  <div className="task-goal">{task.goal}</div>
                  <div className="task-id">ID: {task.id.substring(0, 8)}...</div>
                </div>
              </div>

              <div className="task-meta">
                <span className="task-status-label">{task.status}</span>
                {task.retry_count > 0 && (
                  <span className="retry-badge">Retries: {task.retry_count}</span>
                )}
              </div>

              <div className="task-timeline">
                {task.created_at && (
                  <span className="timeline-item">
                    {t.created}: {new Date(task.created_at).toLocaleTimeString()}
                  </span>
                )}
                {task.started_at && (
                  <span className="timeline-item">
                    {t.started}: {new Date(task.started_at).toLocaleTimeString()}
                  </span>
                )}
                {task.completed_at && (
                  <span className="timeline-item">
                    {t.completed}: {new Date(task.completed_at).toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {selectedTask && (
        <div className="task-detail-modal">
          <div className="modal-backdrop" onClick={() => setSelectedTask(null)} />
          <div className="modal-content">
            <button className="modal-close" onClick={() => setSelectedTask(null)}>✕</button>

            <h3>{t.taskDetails}</h3>

            <div className="detail-section">
              <label>{t.taskId}:</label>
              <code>{selectedTask.id}</code>
            </div>

            <div className="detail-section">
              <label>{t.goal}:</label>
              <p>{selectedTask.goal}</p>
            </div>

            <div className="detail-section">
              <label>{t.status}:</label>
              <span className="status-badge" style={{ color: getStatusColor(selectedTask.status) }}>
                {selectedTask.status}
              </span>
            </div>

            {selectedTask.result && (
              <div className="detail-section">
                <label>{t.result}:</label>
                <pre className="result-text">{selectedTask.result}</pre>
              </div>
            )}

            {selectedTask.error && (
              <div className="detail-section error">
                <label>{t.error}:</label>
                <pre className="error-text">{selectedTask.error}</pre>
              </div>
            )}

            <div className="detail-section">
              <label>{t.retryCount}:</label>
              <span>{selectedTask.retry_count}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const koTexts = {
  title: '워크플로우 진행 추적기',
  loading: '로딩 중...',
  noTasks: '작업이 없습니다',
  taskDetails: '작업 상세 정보',
  taskId: '작업 ID',
  goal: '목표',
  status: '상태',
  result: '결과',
  error: '에러',
  retryCount: '재시도 횟수',
  created: '생성됨',
  started: '시작됨',
  completed: '완료됨',
};

const enTexts = {
  title: 'Workflow Progress Tracker',
  loading: 'Loading...',
  noTasks: 'No tasks',
  taskDetails: 'Task Details',
  taskId: 'Task ID',
  goal: 'Goal',
  status: 'Status',
  result: 'Result',
  error: 'Error',
  retryCount: 'Retry Count',
  created: 'Created',
  started: 'Started',
  completed: 'Completed',
};

export default ProgressTracker;
