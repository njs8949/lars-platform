import React, { useState, useMemo } from 'react';
import { Zap, Play, Pause, Plus, GitBranch, Clock, CheckCircle2, AlertCircle, Activity, Search, Filter, RotateCw, Trash2, FileText } from 'lucide-react';
import { GlassmorphicIcon } from './components/GlassmorphicIcon';
import { FeatureHeader, KpiGrid, EmptyState } from './components/feature/FeatureUI';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';

export const AdvancedWorkflowExecutor = () => {
  const [selectedView, setSelectedView] = useState<'workflows' | 'queue' | 'logs'>('workflows');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState<number | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState('');

  const [workflows, setWorkflows] = useState([
    { id: 1, name: 'Daily Email Digest', status: 'running', priority: 'high', nextRun: '1h 24m', runs: 342, successRate: 98.5, schedule: '매일 09:00', lastRun: '2시간 전' },
    { id: 2, name: 'Data Sync', status: 'idle', priority: 'medium', nextRun: '2h 15m', runs: 128, successRate: 100, schedule: '매시간', lastRun: '1시간 전' },
    { id: 3, name: 'Report Generation', status: 'running', priority: 'high', nextRun: '45m', runs: 89, successRate: 95.5, schedule: '매주 월요일', lastRun: '30분 전' },
    { id: 4, name: 'Cache Cleanup', status: 'idle', priority: 'low', nextRun: '6h 30m', runs: 523, successRate: 99.8, schedule: '매 4시간', lastRun: '4시간 전' },
    { id: 5, name: 'Backup Job', status: 'error', priority: 'critical', nextRun: '재시작', runs: 245, successRate: 92.3, schedule: '매일 02:00', lastRun: '오류' }
  ]);

  const queueItems = [
    { id: 1, workflowId: 1, status: 'running', progress: 65, startTime: '14:32', estimatedTime: '2m 30s' },
    { id: 2, workflowId: 3, status: 'queued', progress: 0, startTime: '14:45', estimatedTime: '5m' },
    { id: 3, workflowId: 2, status: 'completed', progress: 100, startTime: '14:15', estimatedTime: '2m 15s' },
  ];

  const logs = [
    { id: 1, workflow: 'Daily Email Digest', time: '2024-09-09 14:45', level: 'INFO', message: '워크플로우 시작됨' },
    { id: 2, workflow: 'Daily Email Digest', time: '2024-09-09 14:47', level: 'INFO', message: '5,234개 이메일 전송' },
    { id: 3, workflow: 'Data Sync', time: '2024-09-09 14:32', level: 'INFO', message: '데이터 동기화 완료' },
    { id: 4, workflow: 'Backup Job', time: '2024-09-09 14:20', level: 'ERROR', message: '디스크 공간 부족' },
    { id: 5, workflow: 'Report Generation', time: '2024-09-09 14:35', level: 'WARNING', message: '처리 시간 초과 경고' },
  ];

  const filteredWorkflows = useMemo(() => {
    return workflows.filter(w => {
      const matchesSearch = w.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = !selectedStatus || w.status === selectedStatus;
      return matchesSearch && matchesStatus;
    });
  }, [workflows, searchTerm, selectedStatus]);

  const stats = {
    totalWorkflows: workflows.length,
    running: workflows.filter(w => w.status === 'running').length,
    avgSuccessRate: Math.round(workflows.reduce((sum, w) => sum + w.successRate, 0) / workflows.length),
    totalRuns: workflows.reduce((sum, w) => sum + w.runs, 0)
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return '#4ade80';
      case 'idle': return '#64c8ff';
      case 'error': return '#ff6b9d';
      default: return '#fcd34d';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'running': return '실행중';
      case 'idle': return '대기중';
      case 'error': return '오류';
      default: return '완료';
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'ERROR': return '#ff6b9d';
      case 'WARNING': return '#fcd34d';
      default: return '#64c8ff';
    }
  };

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%', background: 'linear-gradient(135deg, #2d2215 0%, #1a1209 100%)' }}>

      {/* 좌측 사이드바 */}
      <div style={{ width: '280px', borderRight: '1px solid rgba(255,152,0,0.2)', overflow: 'auto', display: 'flex', flexDirection: 'column', padding: '20px' }}>
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '12px', color: 'rgba(224,224,224,0.5)', textTransform: 'uppercase', fontWeight: '600', marginBottom: '12px' }}>필터</div>

          {/* 검색 */}
          <div style={{ marginBottom: '16px', position: 'relative' }}>
            <input
              type="text"
              placeholder="워크플로우 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,152,0,0.1)', border: '1px solid rgba(255,152,0,0.2)', borderRadius: '8px', color: '#e0e0e0', fontSize: '13px' }}
            />
            <Search size={14} style={{ position: 'absolute', right: '12px', top: '12px', color: 'rgba(224,224,224,0.4)' }} />
          </div>

          {/* 상태 필터 */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', color: 'rgba(224,224,224,0.5)', marginBottom: '8px', fontWeight: '600' }}>상태</div>
            {['running', 'idle', 'error'].map(status => (
              <button
                key={status}
                onClick={() => setSelectedStatus(selectedStatus === status ? null : status)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 12px',
                  marginBottom: '6px',
                  background: selectedStatus === status ? `${getStatusColor(status)}20` : 'rgba(255,152,0,0.08)',
                  border: selectedStatus === status ? `1px solid ${getStatusColor(status)}` : '1px solid rgba(255,152,0,0.15)',
                  borderRadius: '6px',
                  color: '#e0e0e0',
                  cursor: 'pointer',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: getStatusColor(status) }} />
                {getStatusLabel(status)}
              </button>
            ))}
          </div>

          {/* 워크플로우 목록 */}
          <div>
            <div style={{ fontSize: '11px', color: 'rgba(224,224,224,0.5)', marginBottom: '8px', fontWeight: '600' }}>워크플로우</div>
            {workflows.map(w => (
              <button
                key={w.id}
                onClick={() => setSelectedWorkflow(selectedWorkflow === w.id ? null : w.id)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 12px',
                  marginBottom: '4px',
                  background: selectedWorkflow === w.id ? 'rgba(255,152,0,0.2)' : 'rgba(255,152,0,0.08)',
                  border: selectedWorkflow === w.id ? '1px solid #ff9800' : '1px solid rgba(255,152,0,0.15)',
                  borderRadius: '6px',
                  color: '#e0e0e0',
                  cursor: 'pointer',
                  fontSize: '12px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: getStatusColor(w.status), flexShrink: 0 }} />
                  <span>{w.name}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1 }} />

        {/* 액션 버튼 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            onClick={() => setShowNewModal(true)}
            style={{ width: '100%', padding: '10px', background: 'linear-gradient(135deg, #ff9800, #f57c00)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '13px' }}>
            <Plus size={16} />
            워크플로우 추가
          </button>
        </div>

        {/* 워크플로우 추가 모달 */}
        {showNewModal && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
          }}>
            <div style={{
              background: 'rgba(30, 41, 59, 0.95)', border: '1px solid rgba(255,152,0,0.2)',
              borderRadius: '12px', padding: '32px', maxWidth: '400px', width: '90%'
            }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#f1f5f9', marginBottom: '8px' }}>워크플로우 추가</h2>
              <p style={{ fontSize: '13px', color: 'rgba(224,224,224,0.6)', marginBottom: '24px' }}>워크플로우 이름을 입력하세요</p>
              <input type="text" placeholder="워크플로우 이름" value={newWorkflowName}
                onChange={(e) => setNewWorkflowName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && setShowNewModal(false)}
                style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,152,0,0.1)',
                  border: '1px solid rgba(255,152,0,0.2)', borderRadius: '8px', color: '#e0e0e0',
                  fontSize: '14px', marginBottom: '24px', boxSizing: 'border-box' }} autoFocus />
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => { setShowNewModal(false); setNewWorkflowName(''); }}
                  style={{ flex: 1, padding: '12px 16px', background: 'rgba(255,152,0,0.1)',
                    border: '1px solid rgba(255,152,0,0.2)', borderRadius: '8px', color: '#ff9800',
                    cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>취소</button>
                <button onClick={() => { setShowNewModal(false); setNewWorkflowName(''); }}
                  style={{ flex: 1, padding: '12px 16px', background: 'linear-gradient(135deg, #ff9800, #f57c00)',
                    border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer',
                    fontSize: '13px', fontWeight: '600' }}>생성</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 메인 콘텐츠 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* 상단 헤더 */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,152,0,0.2)' }}>
          <FeatureHeader
            icon={<GlassmorphicIcon Icon={Zap} gradient="from-yellow-400 to-orange-500" size={40} />}
            title="워크플로우 자동화"
            subtitle="작업 자동 실행"
            actions={
              <>
            {/* 뷰 전환 */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setSelectedView('workflows')}
                style={{ padding: '8px 16px', background: selectedView === 'workflows' ? 'rgba(255,152,0,0.2)' : 'rgba(255,152,0,0.08)', border: selectedView === 'workflows' ? '1px solid #ff9800' : '1px solid rgba(255,152,0,0.15)', borderRadius: '6px', color: '#e0e0e0', cursor: 'pointer', fontSize: '12px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <GitBranch size={14} />
                워크플로우
              </button>
              <button
                onClick={() => setSelectedView('queue')}
                style={{ padding: '8px 16px', background: selectedView === 'queue' ? 'rgba(255,152,0,0.2)' : 'rgba(255,152,0,0.08)', border: selectedView === 'queue' ? '1px solid #ff9800' : '1px solid rgba(255,152,0,0.15)', borderRadius: '6px', color: '#e0e0e0', cursor: 'pointer', fontSize: '12px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Clock size={14} />
                큐
              </button>
              <button
                onClick={() => setSelectedView('logs')}
                style={{ padding: '8px 16px', background: selectedView === 'logs' ? 'rgba(255,152,0,0.2)' : 'rgba(255,152,0,0.08)', border: selectedView === 'logs' ? '1px solid #ff9800' : '1px solid rgba(255,152,0,0.15)', borderRadius: '6px', color: '#e0e0e0', cursor: 'pointer', fontSize: '12px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <FileText size={14} />
                로그
              </button>
            </div>
              </>
            }
          />
          <KpiGrid
            items={[
              { label: '총 워크플로우', value: stats.totalWorkflows, tone: 'amber' },
              { label: '실행중', value: stats.running, tone: 'green' },
              { label: '평균 성공률', value: `${stats.avgSuccessRate}%`, tone: 'amber' },
              { label: '총 실행', value: stats.totalRuns, tone: 'blue' },
            ]}
          />
        </div>

        {/* 콘텐츠 */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>

          {stats.totalWorkflows === 0 && (
            <div style={{ marginBottom: '24px' }}>
              <EmptyState
                icon={<GlassmorphicIcon Icon={Zap} gradient="from-yellow-400 to-orange-500" size={32} />}
                title="아직 워크플로우가 없습니다"
                description="반복되는 작업을 워크플로우로 만들면 조건에 따라 자동으로 실행되고 결과를 기록합니다."
                steps={['트리거와 실행 조건 정의', '실행할 단계 추가', '실행 기록과 성공률을 이 화면에서 확인']}
                tab="workflows"
                examples={['신규 리드 자동 분류', '주간 리포트 자동 발송', '문서 업로드 시 요약 생성']}
                action={{ label: '워크플로우 만들기', onClick: () => setShowNewModal(true) }}
              />
            </div>
          )}

          {selectedView === 'workflows' && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,152,0,0.2)', background: 'rgba(255,152,0,0.08)' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#ff9800' }}>워크플로우</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#ff9800' }}>상태</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#ff9800' }}>우선순위</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#ff9800' }}>다음 실행</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#ff9800' }}>실행 횟수</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#ff9800' }}>성공률</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#ff9800' }}>액션</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWorkflows.map(w => (
                    <tr key={w.id} style={{ borderBottom: '1px solid rgba(255,152,0,0.1)' }}>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: '600', marginBottom: '2px', color: '#e0e0e0' }}>{w.name}</div>
                        <div style={{ fontSize: '11px', color: 'rgba(224,224,224,0.5)' }}>{w.schedule}</div>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <span style={{ padding: '4px 10px', background: `${getStatusColor(w.status)}20`, color: getStatusColor(w.status), borderRadius: '6px', fontWeight: '600', fontSize: '11px' }}>
                          {getStatusLabel(w.status)}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <span style={{ padding: '4px 10px', background: w.priority === 'critical' ? 'rgba(255,107,157,0.15)' : w.priority === 'high' ? 'rgba(252,212,45,0.15)' : 'rgba(100,200,255,0.15)', color: w.priority === 'critical' ? '#ff6b9d' : w.priority === 'high' ? '#fcd34d' : '#64c8ff', borderRadius: '6px', fontWeight: '600', fontSize: '11px' }}>
                          {w.priority === 'critical' ? '긴급' : w.priority === 'high' ? '높음' : w.priority === 'medium' ? '중간' : '낮음'}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', color: '#ff9800', fontWeight: '600' }}>{w.nextRun}</td>
                      <td style={{ padding: '12px', textAlign: 'center', color: '#64c8ff' }}>{w.runs}회</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                          <div style={{ width: '40px', height: '4px', background: 'rgba(255,152,0,0.2)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${w.successRate}%`, height: '100%', background: w.successRate > 95 ? '#4ade80' : w.successRate > 80 ? '#fcd34d' : '#ff6b9d' }} />
                          </div>
                          <span style={{ fontSize: '11px', minWidth: '35px' }}>{w.successRate}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', display: 'flex', gap: '4px', justifyContent: 'center' }}>
                        <button style={{ padding: '6px 10px', background: 'rgba(255,152,0,0.15)', border: '1px solid rgba(255,152,0,0.3)', borderRadius: '4px', color: '#ff9800', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                          {w.status === 'running' ? <Pause size={12} /> : <Play size={12} />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {selectedView === 'queue' && (
            <div>
              <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '16px', color: '#e0e0e0' }}>실행 큐 ({queueItems.length})</div>
              {queueItems.map((item, idx) => (
                <div key={item.id} style={{ background: 'rgba(255,152,0,0.08)', border: '1px solid rgba(255,152,0,0.2)', borderRadius: '10px', padding: '16px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ fontWeight: '600', color: '#e0e0e0' }}>
                      {workflows.find(w => w.id === item.workflowId)?.name}
                    </div>
                    <span style={{ padding: '4px 10px', background: item.status === 'running' ? 'rgba(74,222,128,0.2)' : item.status === 'completed' ? 'rgba(100,200,255,0.2)' : 'rgba(252,212,45,0.2)', color: item.status === 'running' ? '#4ade80' : item.status === 'completed' ? '#64c8ff' : '#fcd34d', borderRadius: '4px', fontWeight: '600', fontSize: '11px' }}>
                      {item.status === 'running' ? '실행중' : item.status === 'completed' ? '완료' : '대기중'}
                    </span>
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '11px' }}>
                      <span style={{ color: 'rgba(224,224,224,0.6)' }}>진행률</span>
                      <span style={{ color: '#ff9800', fontWeight: '600' }}>{item.progress}%</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'rgba(255,152,0,0.2)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${item.progress}%`, height: '100%', background: item.progress === 100 ? '#4ade80' : '#ff9800', borderRadius: '3px', transition: 'width 0.3s' }} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', fontSize: '12px' }}>
                    <div>
                      <div style={{ color: 'rgba(224,224,224,0.5)', fontSize: '10px', marginBottom: '2px', fontWeight: '600' }}>시작 시간</div>
                      <div style={{ color: '#64c8ff' }}>{item.startTime}</div>
                    </div>
                    <div>
                      <div style={{ color: 'rgba(224,224,224,0.5)', fontSize: '10px', marginBottom: '2px', fontWeight: '600' }}>예상 시간</div>
                      <div style={{ color: '#ff9800' }}>{item.estimatedTime}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <button style={{ padding: '4px 8px', background: 'rgba(255,107,157,0.1)', border: '1px solid rgba(255,107,157,0.2)', borderRadius: '4px', color: '#ff6b9d', cursor: 'pointer', fontSize: '11px', fontWeight: '600' }}>
                        <Trash2 size={12} style={{ display: 'inline', marginRight: '4px' }} />
                        취소
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedView === 'logs' && (
            <div style={{ maxWidth: '900px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '16px', color: '#e0e0e0' }}>실행 로그</div>
              {logs.map((log, idx) => (
                <div key={log.id} style={{ background: 'rgba(255,152,0,0.08)', border: `1px solid ${getLevelColor(log.level)}40`, borderRadius: '8px', padding: '12px', marginBottom: '8px', borderLeft: `3px solid ${getLevelColor(log.level)}`, display: 'flex', gap: '12px', alignItems: 'start' }}>
                  <div style={{ color: getLevelColor(log.level), fontWeight: '600', fontSize: '11px', minWidth: '50px', textAlign: 'center', padding: '2px 6px', background: `${getLevelColor(log.level)}20`, borderRadius: '4px' }}>
                    {log.level}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <div style={{ fontWeight: '600', color: '#e0e0e0' }}>{log.workflow}</div>
                      <div style={{ fontSize: '11px', color: 'rgba(224,224,224,0.5)' }}>{log.time}</div>
                    </div>
                    <div style={{ fontSize: '12px', color: 'rgba(224,224,224,0.7)' }}>{log.message}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdvancedWorkflowExecutor;
