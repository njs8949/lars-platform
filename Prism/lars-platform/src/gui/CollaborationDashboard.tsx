import React, { useState, useMemo } from 'react';
import { Users, Plus, Search, MessageSquare, User, Clock, Copy } from 'lucide-react';
import { GlassmorphicIcon } from './components/GlassmorphicIcon';
import { FeatureHeader, KpiGrid, EmptyState, PanelStats } from './components/feature/FeatureUI';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';

export const CollaborationDashboard = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [collaborators, setCollaborators] = useState('');

  const [sessions, setSessions] = useState<any[]>([
    { id: 'sess1', project: 'Portfolio', activeUsers: 3, members: ['You', 'John', 'Sarah'], link: 'prism.local/collab/abc123', created: '2024-01-15 10:00' },
    { id: 'sess2', project: 'Dashboard', activeUsers: 2, members: ['You', 'Alex'], link: 'prism.local/collab/def456', created: '2024-01-14 15:30' },
    { id: 'sess3', project: 'Blog', activeUsers: 1, members: ['You'], link: 'prism.local/collab/ghi789', created: '2024-01-13 09:15' }
  ]);

  const handleCreateSession = async () => {
    if (!projectName.trim()) {
      alert('프로젝트명을 입력해주세요');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/advanced-design/collaboration/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          project_name: projectName,
          collaborators: collaborators || 'member1,member2'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSessions([{
          id: data.session_id,
          project: projectName,
          activeUsers: 1,
          members: ['You'],
          link: data.share_link,
          created: new Date().toLocaleString('ko-KR')
        }, ...sessions]);
        setProjectName('');
        setCollaborators('');
        setShowNewModal(false);
      }
    } catch (error) {
      console.error('협업 세션 생성 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSessions = useMemo(() => {
    return sessions.filter(s =>
      s.project.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [sessions, searchTerm]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('링크가 복사되었습니다!');
  };

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%', background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}>
      {/* 좌측 사이드바 */}
      <div style={{ width: '280px', borderRight: '1px solid rgba(100,150,255,0.2)', overflow: 'auto', padding: '20px', background: 'rgba(0,0,0,0.3)' }}>
        <h3 style={{ fontSize: '13px', color: 'rgba(224,224,224,0.5)', textTransform: 'uppercase', fontWeight: '600', marginBottom: '20px' }}>필터</h3>

        {/* 검색 */}
        <div style={{ marginBottom: '20px', position: 'relative' }}>
          <input
            type="text"
            placeholder="세션 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', background: 'linear-gradient(135deg, rgba(100,150,255,0.15) 0%, rgba(100,150,255,0.05) 100%)', border: '1px solid rgba(100,150,255,0.3)', borderRadius: '8px', color: '#e0e0e0', fontSize: '13px' }}
          />
          <Search size={14} style={{ position: 'absolute', right: '12px', top: '12px', color: 'rgba(224,224,224,0.4)' }} />
        </div>

        {/* 협업 가이드 */}
        <div style={{ background: 'linear-gradient(135deg, rgba(100,150,255,0.15) 0%, rgba(100,150,255,0.05) 100%)', border: '1px solid rgba(100,150,255,0.3)', borderRadius: '8px', padding: '12px', marginBottom: '20px' }}>
          <h4 style={{ fontSize: '11px', color: 'rgba(224,224,224,0.7)', fontWeight: '600', marginBottom: '8px' }}>💡 협업 방법</h4>
          <ul style={{ fontSize: '11px', color: '#cbd5e1', lineHeight: '1.6', marginLeft: '12px', listStyleType: 'disc' }}>
            <li>링크 공유로 팀원 초대</li>
            <li>실시간 변경 동기화</li>
            <li>즉시 피드백 및 댓글</li>
            <li>변경 기록 자동 추적</li>
          </ul>
        </div>

        {/* 통계 */}
        <PanelStats items={[
          { label: '활성 세션', value: sessions.length, tone: 'green' },
          { label: '활성 사용자', value: sessions.reduce((sum, s) => sum + s.activeUsers, 0), tone: 'green' },
          { label: '총 참여자', value: new Set(sessions.flatMap(s => s.members)).size, tone: 'green' },
        ]} />
      </div>

      {/* 우측 콘텐츠 */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* 헤더 */}
        <div style={{ padding: '24px', borderBottom: '1px solid rgba(100,150,255,0.2)', background: 'linear-gradient(135deg, rgba(0,0,0,0.4) 0%, rgba(100,150,255,0.1) 100%)' }}>
          <FeatureHeader
            icon={<GlassmorphicIcon Icon={Users} gradient="from-green-400 to-emerald-500" size={40} />}
            title="협업 디자인"
            subtitle="팀과 함께 디자인을 편집합니다"
            actions={
              <>
            <button
              onClick={() => setShowNewModal(true)}
              style={{ padding: '10px 16px', background: '#646cff', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={16} /> 세션 생성
            </button>
              </>
            }
          />
          <KpiGrid
            items={[
              { label: '활성 세션', value: sessions.length, tone: 'green' },
              { label: '활성 사용자', value: sessions.reduce((sum, s) => sum + s.activeUsers, 0), tone: 'blue' },
              { label: '총 참여자', value: new Set(sessions.flatMap(s => s.members)).size, tone: 'violet' },
            ]}
          />
        </div>

        {sessions.length === 0 && (
          <div style={{ margin: '24px' }}>
            <EmptyState
              icon={<GlassmorphicIcon Icon={Users} gradient="from-green-400 to-emerald-500" size={32} />}
              title="진행 중인 협업 세션이 없습니다"
              description="세션을 만들고 팀원을 초대하면 실시간으로 함께 편집하고 댓글로 피드백을 주고받을 수 있습니다."
              steps={['세션 생성과 제목 입력', '링크로 팀원 초대', '변경 기록과 댓글을 이 화면에서 확인']}
              tab="collaboration"
              examples={['포트폴리오 공동 편집', '디자인 리뷰 댓글 받기', '팀원 링크 초대']}
              action={{ label: '세션 생성', onClick: () => setShowNewModal(true) }}
            />
          </div>
        )}

        {/* 협업 세션 목록 */}
        <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
            {filteredSessions.map(session => (
              <div key={session.id} style={{ background: 'linear-gradient(135deg, rgba(100,150,255,0.15) 0%, rgba(100,150,255,0.05) 100%)', border: '1px solid rgba(100,150,255,0.3)', borderRadius: '14px', padding: '16px', transition: 'all 0.2s' }}>
                <div style={{ marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#fff', marginBottom: '4px' }}>{session.project}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'rgba(224,224,224,0.6)' }}>
                    <Users size={14} />
                    {session.activeUsers} 명 활동중
                  </div>
                </div>

                {/* 참여자 아바타 */}
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '11px', color: 'rgba(224,224,224,0.5)', marginBottom: '6px', fontWeight: '600' }}>참여자</div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {session.members.map((member, idx) => (
                      <div key={idx} style={{ background: 'rgba(100,150,255,0.3)', padding: '6px 10px', borderRadius: '6px', fontSize: '11px', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <User size={12} />
                        {member}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 링크 복사 */}
                <div style={{ background: 'linear-gradient(135deg, rgba(100,150,255,0.15) 0%, rgba(100,150,255,0.05) 100%)', padding: '10px', borderRadius: '6px', marginBottom: '12px' }}>
                  <div style={{ fontSize: '10px', color: 'rgba(224,224,224,0.5)', marginBottom: '4px' }}>공유 링크</div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#cbd5e1', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {session.link}
                    </span>
                    <button
                      onClick={() => copyToClipboard(session.link)}
                      style={{ background: 'rgba(100,150,255,0.3)', border: 'none', borderRadius: '4px', padding: '4px 8px', color: '#cbd5e1', cursor: 'pointer', transition: 'all 0.2s' }}
                    >
                      <Copy size={12} />
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', paddingTop: '12px', borderTop: '1px solid rgba(100,150,255,0.1)', color: 'rgba(224,224,224,0.5)' }}>
                  <div>
                    <Clock size={12} style={{ display: 'inline', marginRight: '4px' }} />
                    {session.created}
                  </div>
                  <button style={{ background: 'rgba(100,150,255,0.2)', border: 'none', borderRadius: '4px', padding: '4px 8px', color: '#cbd5e1', cursor: 'pointer', fontSize: '11px' }}>
                    <MessageSquare size={12} style={{ display: 'inline', marginRight: '4px' }} />
                    댓글
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 모달 */}
      {showNewModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', border: '1px solid rgba(100,150,255,0.3)', borderRadius: '16px', padding: '32px', width: '400px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#fff', marginBottom: '20px' }}>협업 세션 생성</h2>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: 'rgba(224,224,224,0.7)', marginBottom: '8px', fontWeight: '600' }}>프로젝트명</label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="프로젝트명"
                style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, rgba(100,150,255,0.15) 0%, rgba(100,150,255,0.05) 100%)', border: '1px solid rgba(100,150,255,0.3)', borderRadius: '8px', color: '#e0e0e0', fontSize: '13px', marginBottom: '12px' }}
              />
              <label style={{ display: 'block', fontSize: '12px', color: 'rgba(224,224,224,0.7)', marginBottom: '8px', fontWeight: '600' }}>참여자 (쉼표로 구분)</label>
              <textarea
                value={collaborators}
                onChange={(e) => setCollaborators(e.target.value)}
                placeholder="john@example.com, sarah@example.com"
                style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, rgba(100,150,255,0.15) 0%, rgba(100,150,255,0.05) 100%)', border: '1px solid rgba(100,150,255,0.3)', borderRadius: '8px', color: '#e0e0e0', fontSize: '13px', minHeight: '60px', fontFamily: 'inherit' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowNewModal(false)}
                style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid rgba(100,150,255,0.3)', borderRadius: '8px', color: '#cbd5e1', cursor: 'pointer', fontWeight: '600' }}
              >
                취소
              </button>
              <button
                onClick={handleCreateSession}
                disabled={loading}
                style={{ flex: 1, padding: '12px', background: '#646cff', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontWeight: '600' }}
              >
                {loading ? '생성중...' : '생성'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
