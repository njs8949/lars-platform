import React, { useState } from 'react';
import {
  ChevronRight, CheckCircle, X, Rocket, LayoutGrid, Zap, Cloud,
  BarChart3, GitBranch, Sparkles, Book, Target, Globe, Workflow,
  Image, Grid2X2, TrendingUp, Search, FileText, Settings,
  Package, Check, MessageCircle
} from 'lucide-react';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  iconName: string;
  details: string[];
}

interface OnboardingFlowProps {
  onComplete: () => void;
  onSkip: () => void;
}

const IconMap: { [key: string]: React.ComponentType<{ size: number; color: string }> } = {
  Rocket,
  LayoutGrid,
  Zap,
  Cloud,
  BarChart3,
  GitBranch
};

const getIcon = (iconName: string) => {
  const Icon = IconMap[iconName];
  return Icon ? <Icon size={32} color="#64c8ff" /> : <Rocket size={32} color="#64c8ff" />;
};

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Prism에 오신 것을 환영합니다!',
    description: '개발, 연구, AI 기술을 쉽게 이용할 수 있는 플랫폼',
    iconName: 'Rocket',
    details: [
      '✅ 다양한 대시보드로 작업 수행',
      '✅ AI 에이전트를 설치하여 기능 확장',
      '✅ 프로젝트를 클라우드에 배포',
      '✅ 실시간 통계 분석'
    ]
  },
  {
    id: 'dashboards',
    title: '대시보드 살펴보기',
    description: 'Prism의 핵심 기능들을 알아봅시다',
    iconName: 'LayoutGrid',
    details: [
      'OCR - 이미지에서 텍스트 추출',
      'Web Scraping - 웹 데이터 수집',
      'Change Detection - 변화 감시',
      'SEO Analysis - 검색 최적화 분석',
      'CRM - 고객 관계 관리',
      'Workflow - 업무 자동화'
    ]
  },
  {
    id: 'ecosystem',
    title: '에이전트 에코시스템',
    description: '기능을 확장하는 가장 간단한 방법',
    iconName: 'Zap',
    details: [
      '사이드바에서 "에코시스템" 클릭',
      '원하는 에이전트 찾기',
      '"설치" 버튼 클릭',
      '활성화하여 즉시 사용'
    ]
  },
  {
    id: 'deployment',
    title: '클라우드 배포',
    description: 'AWS, Azure, GCP 등에 한 클릭으로 배포',
    iconName: 'Cloud',
    details: [
      '"클라우드 배포" 메뉴 열기',
      '원하는 클라우드 선택',
      '배포 정보 입력 (API 키 등)',
      '"배포" 버튼으로 완료'
    ]
  },
  {
    id: 'statistics',
    title: '통계 분석 활용',
    description: 'AI가 데이터를 분석해줍니다',
    iconName: 'BarChart3',
    details: [
      'CSV 파일 업로드',
      'JSON 데이터 입력',
      'API 연동',
      '',
      '자동 차트 생성',
      '인사이트 도출',
      '예측 분석'
    ]
  },
  {
    id: 'workflow',
    title: '워크플로우 자동화',
    description: '반복적인 작업을 자동으로 처리',
    iconName: 'GitBranch',
    details: [
      '트리거 설정 (시간, 이벤트)',
      '작업 추가 (여러 단계)',
      '조건 설정 (if-then)',
      '알림 구성 (완료 시)',
      '',
      '예시: 매일 09:00에 데이터 수집 → 분석 → 보고서 생성'
    ]
  }
];

export default function OnboardingFlow({ onComplete, onSkip }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const step = ONBOARDING_STEPS[currentStep];
  const progress = ((currentStep + 1) / ONBOARDING_STEPS.length) * 100;

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)',
        border: '1px solid rgba(100, 200, 255, 0.2)',
        borderRadius: '16px',
        padding: '40px',
        maxWidth: '600px',
        width: '90%',
        maxHeight: '80vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)'
      }}>
        {/* 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>{getIcon(step.iconName)}</div>
          <button
            onClick={onSkip}
            style={{
              background: 'none',
              border: 'none',
              color: '#e0e0e0',
              cursor: 'pointer',
              fontSize: '24px'
            }}
          >
            <X size={24} />
          </button>
        </div>

        {/* 제목 */}
        <h2 style={{ fontSize: '28px', marginBottom: '12px', color: '#ffd700', fontWeight: '700' }}>
          {step.title}
        </h2>

        {/* 설명 */}
        <p style={{ fontSize: '14px', color: 'rgba(224, 224, 224, 0.7)', marginBottom: '24px' }}>
          {step.description}
        </p>

        {/* 상세 내용 */}
        <div style={{
          background: 'rgba(100, 200, 255, 0.05)',
          border: '1px solid rgba(100, 200, 255, 0.1)',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px'
        }}>
          {step.details.map((detail, idx) => {
            // 빈 줄 처리
            if (detail === '') {
              return <div key={idx} style={{ height: '8px' }} />;
            }

            // 숫자가 있는 줄인지 확인
            const numberMatch = detail.match(/^(\d+)\./);
            const isNumberedItem = !!numberMatch;

            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#e0e0e0',
                  fontSize: '13px',
                  marginBottom: '8px',
                  lineHeight: '1.6'
                }}
              >
                {isNumberedItem ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: 'rgba(100, 200, 255, 0.3)',
                      color: '#64c8ff',
                      fontSize: '12px',
                      fontWeight: '600',
                      flexShrink: 0
                    }}
                  >
                    {numberMatch![1]}
                  </div>
                ) : (
                  <Check size={16} style={{ color: '#22c55e', flexShrink: 0 }} />
                )}
                <span>{detail.replace(/^\d+\.\s*/, '')}</span>
              </div>
            );
          })}
        </div>

        {/* 진행률 표시 */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '12px',
            color: '#64c8ff',
            marginBottom: '8px'
          }}>
            <span>단계 {currentStep + 1} / {ONBOARDING_STEPS.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div style={{
            background: 'rgba(100, 200, 255, 0.1)',
            height: '4px',
            borderRadius: '2px',
            overflow: 'hidden'
          }}>
            <div style={{
              background: 'linear-gradient(90deg, #64c8ff, #ffd700)',
              height: '100%',
              width: `${progress}%`,
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>

        {/* 버튼 */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleBack}
            disabled={currentStep === 0}
            style={{
              flex: 1,
              padding: '12px 16px',
              background: currentStep === 0 ? 'rgba(100, 200, 255, 0.1)' : 'rgba(100, 200, 255, 0.2)',
              border: '1px solid rgba(100, 200, 255, 0.3)',
              borderRadius: '8px',
              color: currentStep === 0 ? 'rgba(224, 224, 224, 0.5)' : '#e0e0e0',
              cursor: currentStep === 0 ? 'not-allowed' : 'pointer',
              fontSize: '13px',
              fontWeight: '600',
              transition: 'all 0.3s ease'
            }}
          >
            이전
          </button>
          <button
            onClick={handleNext}
            style={{
              flex: 1,
              padding: '12px 16px',
              background: 'linear-gradient(135deg, #64c8ff, #ffd700)',
              border: 'none',
              borderRadius: '8px',
              color: '#000',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.3s ease'
            }}
          >
            {currentStep === ONBOARDING_STEPS.length - 1 ? (
              <>완료 <CheckCircle size={16} /></>
            ) : (
              <>다음 <ChevronRight size={16} /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
