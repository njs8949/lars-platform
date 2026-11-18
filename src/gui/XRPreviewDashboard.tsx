import React, { useState, useMemo } from 'react';
import { Glasses, Plus, Search, Play, Eye, Zap, Download } from 'lucide-react';
import { GlassmorphicIcon } from './components/GlassmorphicIcon';
import { FeatureHeader, KpiGrid, EmptyState, PanelStats } from './components/feature/FeatureUI';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';

// Tauri invoke 함수
const isTauri = typeof window !== 'undefined' && '__TAURI_IPC__' in window;
let invoke: any = async () => null;

if (isTauri) {
  try {
    import('@tauri-apps/api/tauri').then(tauri => {
      invoke = tauri.invoke;
    });
  } catch (e) {
    console.warn('Tauri not available');
  }
}

export const XRPreviewDashboard = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [xrType, setXrType] = useState('ar');
  const [projectPath, setProjectPath] = useState<string>('');

  const [previews, setPreviews] = useState<any[]>([]);

  // 프로젝트 폴더 선택
  const handleSelectProjectPath = async () => {
    if (isTauri) {
      try {
        const dialog = await import('@tauri-apps/api/dialog');
        const selected = await dialog.open({ directory: true, multiple: false, title: 'VR/AR 프로젝트 폴더 선택' });
        if (selected && typeof selected === 'string') {
          setProjectPath(selected);
          await loadXRFiles(selected);
        }
      } catch (error) {
        console.error('폴더 선택 실패:', error);
      }
    }
  };

  // VR/AR 파일 검색 및 로드
  const loadXRFiles = async (path: string) => {
    try {
      setLoading(true);

      // 재귀적으로 파일 검색
      const command = `find "${path}" \\( -iname "*.glb" -o -iname "*.gltf" -o -iname "*.usdz" -o -iname "*.fbx" \\) -type f 2>/dev/null | head -20`;

      const files = await invoke('execute_terminal_command', { command });

      if (!files || files.trim() === '') {
        alert('VR/AR 파일을 찾을 수 없습니다 (*.glb, *.gltf, *.usdz, *.fbx)');
        setLoading(false);
        return;
      }

      const fileList = files.split('\n').filter((f: string) => f.trim());
      const projectName = path.split('/').pop() || 'Project';

      // 파일별 정보 조회
      const xrPreviews = await Promise.all(
        fileList.map(async (filePath: string, idx: number) => {
          try {
            const fileName = filePath.split('/').pop() || 'Unknown';
            const ext = fileName.split('.').pop()?.toLowerCase() || '';

            // 파일 크기 조회
            const sizeCmd = `ls -lh "${filePath}" | awk '{print $5}'`;
            const size = await invoke('execute_terminal_command', { command: sizeCmd });

            // 파일 수정일 조회
            const dateCmd = `stat -f "%Sm" -t "%Y-%m-%d" "${filePath}" 2>/dev/null || echo "Unknown"`;
            const modified = await invoke('execute_terminal_command', { command: dateCmd });

            const typeMap: { [key: string]: string } = {
              'glb': 'GLB (Binary)',
              'gltf': 'GLTF (JSON)',
              'usdz': 'USDZ (Apple)',
              'fbx': 'FBX (Autodesk)'
            };

            const isAR = ['usdz', 'glb', 'gltf'].includes(ext);

            return {
              id: filePath,
              project: projectName,
              type: isAR ? 'ar' : 'vr',
              devices: isAR ? ['iPhone 12+', 'iPad Pro', 'Android 11+'] : ['Meta Quest 3', 'PlayStation VR', 'HTC Vive'],
              format: typeMap[ext] || ext.toUpperCase(),
              status: 'ready',
              created: modified.trim(),
              viewers: 0,
              fileName: fileName,
              filePath: filePath,
              fileSize: size.trim(),
              fileType: ext
            };
          } catch (e) {
            console.warn(`파일 정보 조회 실패: ${filePath}`, e);
            return null;
          }
        })
      );

      const validPreviews = xrPreviews.filter(p => p !== null);
      setPreviews(validPreviews);
      alert(`✅ ${validPreviews.length}개의 VR/AR 파일을 로드했습니다!`);
    } catch (error) {
      console.error('VR/AR 파일 로드 실패:', error);
      alert(`❌ 파일 로드 실패: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateXR = async () => {
    if (!projectName.trim()) {
      alert('프로젝트명을 입력해주세요');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/advanced-design/xr/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          project_name: projectName,
          preview_type: xrType
        })
      });

      if (response.ok) {
        const data = await response.json();
        setPreviews([{
          id: Date.now(),
          project: projectName,
          type: xrType,
          devices: xrType === 'ar' ? ['iPhone 12+', 'iPad Pro', 'Android 11+'] : ['Meta Quest 3', 'PlayStation VR', 'HTC Vive'],
          format: xrType === 'ar' ? 'USDZ/GLB' : 'WebXR',
          status: 'ready',
          created: new Date().toISOString().split('T')[0],
          viewers: 0
        }, ...previews]);
        setProjectName('');
        setShowNewModal(false);
        alert(`✅ ${xrType.toUpperCase()} 미리보기가 생성되었습니다!`);
      }
    } catch (error) {
      console.error('XR 생성 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPreviews = useMemo(() => {
    return previews.filter(p => {
      const matchesSearch = p.project.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = selectedType === null || p.type === selectedType;
      return matchesSearch && matchesType;
    });
  }, [previews, searchTerm, selectedType]);

  const stats = {
    total: previews.length,
    ar: previews.filter(p => p.type === 'ar').length,
    vr: previews.filter(p => p.type === 'vr').length,
    totalViewers: previews.reduce((sum, p) => sum + p.viewers, 0)
  };

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%', background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}>
      {/* 좌측 사이드바 */}
      <div style={{ width: '280px', borderRight: '1px solid rgba(100,150,255,0.2)', overflow: 'auto', padding: '20px', background: 'rgba(0,0,0,0.3)' }}>
        <h3 style={{ fontSize: '13px', color: 'rgba(224,224,224,0.5)', textTransform: 'uppercase', fontWeight: '600', marginBottom: '20px' }}>필터</h3>

        {/* 검색 */}
        <div style={{ marginBottom: '16px', position: 'relative' }}>
          <input
            type="text"
            placeholder="미리보기 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', background: 'linear-gradient(135deg, rgba(100,150,255,0.15) 0%, rgba(100,150,255,0.05) 100%)', border: '1px solid rgba(100,150,255,0.3)', borderRadius: '8px', color: '#e0e0e0', fontSize: '13px' }}
          />
          <Search size={14} style={{ position: 'absolute', right: '12px', top: '12px', color: 'rgba(224,224,224,0.4)' }} />
        </div>

        {/* XR 타입 필터 */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', color: 'rgba(224,224,224,0.5)', marginBottom: '8px', fontWeight: '600' }}>XR 타입</div>
          <button
            onClick={() => setSelectedType(selectedType === 'ar' ? null : 'ar')}
            style={{
              display: 'block',
              width: '100%',
              padding: '10px 12px',
              marginBottom: '6px',
              background: selectedType === 'ar' ? 'rgba(100,150,255,0.3)' : 'rgba(100,150,255,0.1)',
              border: `1px solid ${selectedType === 'ar' ? 'rgba(100,150,255,0.5)' : 'rgba(100,150,255,0.2)'}`,
              borderRadius: '6px',
              color: '#e0e0e0',
              fontSize: '12px',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            📱 AR (증강현실)
          </button>
          <button
            onClick={() => setSelectedType(selectedType === 'vr' ? null : 'vr')}
            style={{
              display: 'block',
              width: '100%',
              padding: '10px 12px',
              background: selectedType === 'vr' ? 'rgba(100,150,255,0.3)' : 'rgba(100,150,255,0.1)',
              border: `1px solid ${selectedType === 'vr' ? 'rgba(100,150,255,0.5)' : 'rgba(100,150,255,0.2)'}`,
              borderRadius: '6px',
              color: '#e0e0e0',
              fontSize: '12px',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            🥽 VR (가상현실)
          </button>
        </div>

        {/* XR 정보 */}
        <div style={{ background: 'linear-gradient(135deg, rgba(100,150,255,0.15) 0%, rgba(100,150,255,0.05) 100%)', border: '1px solid rgba(100,150,255,0.3)', borderRadius: '8px', padding: '12px', marginBottom: '20px' }}>
          <h4 style={{ fontSize: '11px', color: 'rgba(224,224,224,0.7)', fontWeight: '600', marginBottom: '8px' }}>💡 XR 모드</h4>
          <ul style={{ fontSize: '11px', color: '#cbd5e1', lineHeight: '1.6', marginLeft: '12px', listStyleType: 'disc' }}>
            <li>AR: 폰/태블릿에서 실시간 미리보기</li>
            <li>VR: VR 헤드셋에서 3D 환경</li>
            <li>WebXR 표준 지원</li>
          </ul>
        </div>

        {/* 통계 */}
        <PanelStats items={[
          { label: '총 미리보기', value: stats.total, tone: 'green' },
          { label: 'AR', value: stats.ar, tone: 'green' },
          { label: 'VR', value: stats.vr, tone: 'green' },
          { label: '총 조회', value: stats.totalViewers, tone: 'amber' },
        ]} />
      </div>

      {/* 우측 콘텐츠 */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* 헤더 */}
        <div style={{ padding: '24px', borderBottom: '1px solid rgba(100,150,255,0.2)', background: 'linear-gradient(135deg, rgba(0,0,0,0.4) 0%, rgba(100,150,255,0.1) 100%)' }}>
          <FeatureHeader
            icon={<GlassmorphicIcon Icon={Glasses} gradient="from-indigo-400 to-purple-500" size={40} />}
            title="AR/VR 미리보기"
            subtitle="웹에서 AR·VR로 디자인을 미리 봅니다"
            badge="AI"
            actions={
              <>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleSelectProjectPath}
                disabled={loading}
                style={{ padding: '10px 16px', background: 'rgba(100,150,255,0.2)', color: '#cbd5e1', border: '1px solid rgba(100,150,255,0.3)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', opacity: loading ? 0.6 : 1 }}
              >
                📁 프로젝트 로드
              </button>
              <button
                onClick={() => setShowNewModal(true)}
                style={{ padding: '10px 16px', background: '#646cff', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={16} /> 미리보기 생성
              </button>
            </div>
              </>
            }
          />
          <KpiGrid
            items={[
              { label: '총 미리보기', value: stats.total, tone: 'blue' },
              { label: 'AR', value: stats.ar, tone: 'green' },
              { label: 'VR', value: stats.vr, tone: 'violet' },
              { label: '총 조회', value: stats.totalViewers, tone: 'amber' },
            ]}
          />
          {/* 프로젝트 경로 표시 */}
          {projectPath && (
            <div style={{ background: 'rgba(100,150,255,0.1)', border: '1px solid rgba(100,150,255,0.2)', borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '12px', color: '#cbd5e1' }}>
              📂 로드된 프로젝트: <span style={{ color: '#4ade80', fontWeight: '600' }}>{projectPath.split('/').pop()}</span>
            </div>
          )}
        </div>

        {stats.total === 0 && (
          <div style={{ margin: '24px' }}>
            <EmptyState
              icon={<GlassmorphicIcon Icon={Glasses} gradient="from-indigo-400 to-purple-500" size={32} />}
              title="미리보기가 없습니다"
              description="디자인 프로젝트를 불러와 AR 또는 VR 미리보기를 만들면 기기에서 바로 확인할 수 있습니다."
              steps={['프로젝트 폴더 불러오기', 'AR 또는 VR 모드 선택', '미리보기 링크를 기기에서 열기']}
              tab="xr-preview"
              examples={['명함 디자인 AR 미리보기', '전시 공간 VR 둘러보기', '제품 3D 모델 확인']}
              action={{ label: '미리보기 생성', onClick: () => setShowNewModal(true) }}
            />
          </div>
        )}

        {/* 미리보기 목록 */}
        <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {filteredPreviews.map(preview => (
              <div key={preview.id} style={{ background: 'linear-gradient(135deg, rgba(100,150,255,0.15) 0%, rgba(100,150,255,0.05) 100%)', border: '1px solid rgba(100,150,255,0.3)', borderRadius: '14px', padding: '16px', transition: 'all 0.2s' }}>
                {/* XR 타입 배지 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#fff' }}>{preview.project}</h3>
                  <div style={{
                    background: preview.type === 'ar' ? 'rgba(74, 222, 128, 0.2)' : 'rgba(168, 85, 247, 0.2)',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    color: preview.type === 'ar' ? '#4ade80' : '#d8b4fe',
                    fontWeight: '600'
                  }}>
                    {preview.type === 'ar' ? '📱 AR' : '🥽 VR'}
                  </div>
                </div>

                {/* 형식 및 기기 */}
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '11px', color: 'rgba(224,224,224,0.5)', marginBottom: '6px', fontWeight: '600' }}>형식</div>
                  <div style={{ background: 'rgba(100,150,255,0.2)', padding: '6px 10px', borderRadius: '4px', fontSize: '11px', color: '#cbd5e1', marginBottom: '10px' }}>
                    {preview.format}
                  </div>

                  {/* 파일 정보 */}
                  {preview.filePath && (
                    <>
                      <div style={{ fontSize: '11px', color: 'rgba(224,224,224,0.5)', marginBottom: '6px', fontWeight: '600' }}>파일 정보</div>
                      <div style={{ background: 'rgba(100,150,255,0.05)', padding: '8px', borderRadius: '4px', fontSize: '10px', color: '#cbd5e1', marginBottom: '10px', wordBreak: 'break-all' }}>
                        <div>📄 {preview.fileName}</div>
                        <div>💾 {preview.fileSize}</div>
                      </div>
                    </>
                  )}

                  <div style={{ fontSize: '11px', color: 'rgba(224,224,224,0.5)', marginBottom: '6px', fontWeight: '600' }}>지원 기기</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {preview.devices.map((device, idx) => (
                      <span key={idx} style={{ background: 'rgba(100,150,255,0.2)', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', color: '#cbd5e1' }}>
                        {device}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 상태 및 조회 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', fontSize: '12px', paddingBottom: '12px', borderBottom: '1px solid rgba(100,150,255,0.1)', color: 'rgba(224,224,224,0.6)' }}>
                  <div>
                    {preview.status === 'ready' ? '✓ 준비됨' : '⏳ 처리중'}
                  </div>
                  <div>
                    👁️ {preview.viewers}명
                  </div>
                </div>

                {/* 액션 버튼 */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    disabled={preview.status !== 'ready'}
                    style={{
                      flex: 1,
                      padding: '10px',
                      background: preview.status === 'ready' ? 'rgba(100,150,255,0.2)' : 'rgba(100,150,255,0.1)',
                      border: '1px solid rgba(100,150,255,0.3)',
                      borderRadius: '6px',
                      color: '#cbd5e1',
                      cursor: preview.status === 'ready' ? 'pointer' : 'not-allowed',
                      fontSize: '12px',
                      fontWeight: '600',
                      opacity: preview.status === 'ready' ? 1 : 0.5
                    }}
                  >
                    <Eye size={14} style={{ display: 'inline', marginRight: '6px' }} />
                    열기
                  </button>
                  <button
                    disabled={preview.status !== 'ready'}
                    style={{
                      flex: 1,
                      padding: '10px',
                      background: 'rgba(100,150,255,0.2)',
                      border: '1px solid rgba(100,150,255,0.3)',
                      borderRadius: '6px',
                      color: '#cbd5e1',
                      cursor: preview.status === 'ready' ? 'pointer' : 'not-allowed',
                      fontSize: '12px',
                      fontWeight: '600',
                      opacity: preview.status === 'ready' ? 1 : 0.5
                    }}
                  >
                    <Download size={14} style={{ display: 'inline', marginRight: '6px' }} />
                    다운로드
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
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#fff', marginBottom: '20px' }}>AR/VR 미리보기 생성</h2>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: 'rgba(224,224,224,0.7)', marginBottom: '8px', fontWeight: '600' }}>프로젝트명</label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="프로젝트명"
                style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, rgba(100,150,255,0.15) 0%, rgba(100,150,255,0.05) 100%)', border: '1px solid rgba(100,150,255,0.3)', borderRadius: '8px', color: '#e0e0e0', fontSize: '13px', marginBottom: '12px' }}
              />
              <label style={{ display: 'block', fontSize: '12px', color: 'rgba(224,224,224,0.7)', marginBottom: '8px', fontWeight: '600' }}>XR 타입</label>
              <select
                value={xrType}
                onChange={(e) => setXrType(e.target.value)}
                style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, rgba(100,150,255,0.15) 0%, rgba(100,150,255,0.05) 100%)', border: '1px solid rgba(100,150,255,0.3)', borderRadius: '8px', color: '#e0e0e0', fontSize: '13px' }}
              >
                <option value="ar">📱 AR (증강현실)</option>
                <option value="vr">🥽 VR (가상현실)</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowNewModal(false)}
                style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid rgba(100,150,255,0.3)', borderRadius: '8px', color: '#cbd5e1', cursor: 'pointer', fontWeight: '600' }}
              >
                취소
              </button>
              <button
                onClick={handleGenerateXR}
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
