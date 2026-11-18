import React from 'react';
import { Code2, Clock } from 'lucide-react';
import { DevResultCard } from './DevResultCard';
import type { DevResult } from '../lib/aiRouter';

export interface ForgeTask {
  id: string;
  title: string;
  date: string;
}

/** Forge 모드의 오른쪽 작업 패널: 최근 작업 목록과 선택한 작업의 변경 사항·작업 과정. */
export const ForgePanel: React.FC<{
  workspace: string;
  tasks: ForgeTask[];
  activeTaskId: string | null;
  result?: DevResult;
  onSelectTask: (id: string) => void;
}> = ({ workspace, tasks, activeTaskId, result, onSelectTask }) => (
  <aside className="forge-panel">
    <div className="forge-panel-head">
      <Code2 size={16} />
      <div className="forge-panel-title">
        <div>Forge</div>
        <div className="forge-panel-path" title={workspace}>{workspace || '작업 폴더를 선택하세요'}</div>
      </div>
    </div>

    <div className="forge-panel-section-title"><Clock size={12} /> 최근 작업</div>
    <div className="forge-panel-tasks">
      {tasks.length === 0 && <div className="forge-panel-empty">아직 작업이 없습니다.</div>}
      {tasks.map((task) => (
        <button key={task.id} className={`forge-task ${activeTaskId === task.id ? 'active' : ''}`} onClick={() => onSelectTask(task.id)}>
          <span className="forge-task-title">{task.title}</span>
          <span className="forge-task-date">{task.date}</span>
        </button>
      ))}
    </div>

    <div className="forge-panel-section-title">변경 사항 · 작업 과정</div>
    <div className="forge-panel-body">
      {result ? (
        <DevResultCard result={result} />
      ) : (
        <div className="forge-panel-empty">작업을 요청하면 수정 제안과 작업 과정이 여기에 표시됩니다.</div>
      )}
    </div>
  </aside>
);

export default ForgePanel;
