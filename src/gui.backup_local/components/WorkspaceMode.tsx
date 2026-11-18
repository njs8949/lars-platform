import React, { useState } from 'react';
import { Zap, GitBranch, Users, ChevronDown, CheckCircle2, Clock, Search, Compass, Cpu, Merge } from 'lucide-react';
import { GlassmorphicIcon } from './GlassmorphicIcon';

interface WorkspaceModeProps {
  mode: 'orchestrated' | 'harmonized' | 'workspace';
  onModeChange: (mode: 'orchestrated' | 'harmonized' | 'workspace') => void;
  language: string;
}

const WorkspaceMode: React.FC<WorkspaceModeProps> = ({ mode, onModeChange, language }) => {
  const [showDetails, setShowDetails] = useState(true);

  const workspaceSteps = [
    {
      id: 1,
      ko: '분석',
      en: 'Analyze',
      icon: Search,
      gradient: 'from-blue-400',
      desc: language === 'ko' ? '입력 내용 분석 및 컨텍스트 파악' : 'Analyze input & context'
    },
    {
      id: 2,
      ko: '계획',
      en: 'Plan',
      icon: Compass,
      gradient: 'from-purple-400',
      desc: language === 'ko' ? '다중 에이전트 협력 계획 수립' : 'Plan multi-agent workflow'
    },
    {
      id: 3,
      ko: '실행',
      en: 'Execute',
      icon: Cpu,
      gradient: 'from-amber-400',
      desc: language === 'ko' ? '에이전트 병렬 작동 및 조율' : 'Execute agents in parallel'
    },
    {
      id: 4,
      ko: '통합',
      en: 'Integrate',
      icon: Merge,
      gradient: 'from-emerald-400',
      desc: language === 'ko' ? '결과 통합 및 최적화' : 'Integrate & optimize results'
    }
  ];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '0.8rem',
      padding: '0.8rem 1rem',
      background: 'rgba(255, 255, 255, 0.05)',
      borderRadius: '12px',
      marginBottom: '1rem',
    }}>
      <div style={{
        display: 'flex',
        gap: '0.8rem',
        alignItems: 'center',
      }}>
        <GitBranch size={20} color="#60a5fa" />
        <h3 style={{margin: 0, color: '#60a5fa', fontSize: '1rem', fontWeight: 700}}>
          {language === 'ko' ? 'LARS Workspace' : 'LARS Workspace'}
        </h3>
      </div>

      <div style={{
        background: 'rgba(59, 130, 246, 0.1)',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        borderRadius: '8px',
        padding: '0.8rem',
      }}>
        <button
          onClick={() => setShowDetails(!showDetails)}
          style={{
            background: 'none',
            border: 'none',
            color: '#60a5fa',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.85rem',
            fontWeight: 600,
            width: '100%',
            textAlign: 'left',
            padding: 0,
          }}
        >
          <ChevronDown size={16} style={{transform: showDetails ? 'rotate(180deg)' : '', transition: 'all 0.2s'}} />
          {language === 'ko' ? '워크플로우 단계' : 'Workflow Steps'}
        </button>

        {showDetails && (
          <div style={{
            marginTop: '0.8rem',
            display: 'grid',
            gap: '0.8rem'
          }}>
            {workspaceSteps.map((step, idx) => (
              <div key={step.id} style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.8rem',
                padding: '0.8rem',
                background: 'rgba(0, 0, 0, 0.2)',
                borderRadius: '8px',
                fontSize: '0.8rem'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '40px',
                  minHeight: '40px'
                }}>
                  <GlassmorphicIcon
                    Icon={step.icon}
                    gradient={step.gradient}
                    size={40}
                  />
                </div>
                <div style={{flex: 1, paddingTop: '0.2rem'}}>
                  <div style={{
                    fontWeight: 600,
                    color: '#e0e7ff',
                    marginBottom: '0.3rem',
                    fontSize: '0.9rem'
                  }}>
                    {step.id}. {language === 'ko' ? step.ko : step.en}
                  </div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: '#a5b4fc',
                    lineHeight: 1.4
                  }}>
                    {step.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkspaceMode;
