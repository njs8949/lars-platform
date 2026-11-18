import React, { useState } from 'react';
import {
  ArrowRight, Zap, BookOpen, Play, Image, Grid2X2, Cloud, BarChart3,
  GitBranch, Package, Lightbulb
} from 'lucide-react';

interface QuickStartItem {
  id: string;
  title: string;
  iconName: string;
  description: string;
  steps: string[];
  sampleCode?: string;
  estimatedTime: string;
}

interface QuickStartDashboardProps {
  onSelectItem: (id: string) => void;
}

const IconComponentMap: { [key: string]: React.ComponentType<{ size: number; color: string }> } = {
  Image,
  Grid2X2,
  BarChart3,
  GitBranch,
  Cloud,
  Package
};

const getQuickStartIcon = (iconName: string) => {
  const Icon = IconComponentMap[iconName];
  return Icon ? <Icon size={28} color="#64c8ff" /> : <BookOpen size={28} color="#64c8ff" />;
};

const QUICK_START_ITEMS: QuickStartItem[] = [
  {
    id: 'ocr-start',
    title: 'OCR로 이미지 텍스트 추출하기',
    iconName: 'Image',
    description: '이미지에서 자동으로 텍스트를 추출합니다',
    estimatedTime: '5분',
    steps: [
      '1. OCR 대시보드 열기',
      '2. 이미지 업로드 또는 카메라 캡처',
      '3. "추출" 버튼 클릭',
      '4. 결과 복사 또는 저장'
    ]
  },
  {
    id: 'scraping-start',
    title: 'Web Scraping으로 데이터 수집하기',
    iconName: 'Grid2X2',
    description: '웹사이트에서 데이터를 자동으로 수집합니다',
    estimatedTime: '10분',
    steps: [
      '1. Web Scraping 대시보드 열기',
      '2. URL 입력',
      '3. 추출할 데이터 선택',
      '4. "수집" 버튼 클릭',
      '5. CSV 또는 JSON으로 다운로드'
    ]
  },
  {
    id: 'statistics-start',
    title: '통계 분석으로 데이터 분석하기',
    iconName: 'BarChart3',
    description: 'AI가 데이터를 분석하고 인사이트를 제공합니다',
    estimatedTime: '10분',
    steps: [
      '1. 통계 분석 대시보드 열기',
      '2. CSV 또는 JSON 파일 업로드',
      '3. 분석 유형 선택 (기술 통계, 상관관계 등)',
      '4. "분석" 버튼 클릭',
      '5. 차트와 인사이트 보기'
    ],
    tips: ['CSV 파일: 첫 줄은 헤더여야 합니다', '최대 파일 크기: 10MB']
  },
  {
    id: 'workflow-start',
    title: '워크플로우로 작업 자동화하기',
    iconName: 'GitBranch',
    description: '반복적인 작업을 자동으로 처리합니다',
    estimatedTime: '15분',
    steps: [
      '1. 워크플로우 대시보드 열기',
      '2. "새 워크플로우 생성" 클릭',
      '3. 트리거 설정 (매일 09:00 등)',
      '4. 작업 추가 (데이터 수집, 분석 등)',
      '5. 저장 및 활성화'
    ]
  },
  {
    id: 'deployment-start',
    title: '클라우드에 프로젝트 배포하기',
    iconName: 'Cloud',
    description: 'AWS, Azure, GCP 등에 한 클릭으로 배포',
    estimatedTime: '10분',
    steps: [
      '1. 클라우드 배포 메뉴 열기',
      '2. 클라우드 제공자 선택 (AWS, Azure 등)',
      '3. 배포 이름 입력',
      '4. API 키 입력',
      '5. "배포" 버튼 클릭'
    ],
    tips: ['API 키는 보안 위해 로컬에만 저장됩니다', '배포 과정은 5-10분 소요됩니다']
  },
  {
    id: 'ecosystem-start',
    title: 'AI 에이전트 설치하고 사용하기',
    iconName: 'Package',
    description: '기능을 확장하는 AI 에이전트들을 관리합니다',
    estimatedTime: '5분',
    steps: [
      '1. 사이드바에서 "에코시스템" 클릭',
      '2. 원하는 에이전트 찾기',
      '3. "설치" 버튼 클릭',
      '4. "활성화" 버튼으로 사용 시작'
    ],
    tips: ['여러 에이전트를 동시에 활성화할 수 있습니다', '언제든지 비활성화할 수 있습니다']
  }
];

export default function QuickStartDashboard({ onSelectItem }: QuickStartDashboardProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      height: '100%',
      overflow: 'auto',
      padding: '32px 48px'
    }}>
      {/* 헤더 */}
      <div style={{ marginBottom: '32px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <Zap size={28} color="#ffd700" />
          <h1 style={{ fontSize: '32px', color: '#ffd700', fontWeight: '700', margin: 0 }}>
            빠른 시작 가이드
          </h1>
        </div>
        <p style={{ fontSize: '14px', color: 'rgba(224, 224, 224, 0.7)', margin: 0 }}>
          각 기능을 5-15분 내에 시작할 수 있습니다. 아래에서 원하는 주제를 선택하세요.
        </p>
      </div>

      {/* Quick Start 카드 그리드 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
        gap: '20px',
        marginBottom: '32px',
        flex: 1
      }}>
        {QUICK_START_ITEMS.map(item => (
          <div
            key={item.id}
            style={{
              background: 'rgba(100, 200, 255, 0.05)',
              border: '1px solid rgba(100, 200, 255, 0.2)',
              borderRadius: '12px',
              padding: '20px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              transform: expandedId === item.id ? 'scale(1.02)' : 'scale(1)',
              boxShadow: expandedId === item.id ? '0 10px 30px rgba(100, 200, 255, 0.1)' : 'none'
            }}
            onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
          >
            {/* 카드 헤더 */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
              <div>{getQuickStartIcon(item.iconName)}</div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#64c8ff', margin: 0, marginBottom: '4px' }}>
                  {item.title}
                </h3>
                <div style={{ fontSize: '11px', color: 'rgba(224, 224, 224, 0.6)' }}>
                  ⏱️ {item.estimatedTime}
                </div>
              </div>
            </div>

            {/* 설명 */}
            <p style={{ fontSize: '13px', color: 'rgba(224, 224, 224, 0.8)', margin: 0, marginBottom: '12px' }}>
              {item.description}
            </p>

            {/* 확장된 내용 */}
            {expandedId === item.id && (
              <div style={{
                background: 'rgba(0, 0, 0, 0.3)',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '12px',
                borderLeft: '3px solid #64c8ff'
              }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#ffd700', marginBottom: '8px' }}>
                  📋 단계별 진행:
                </div>
                {item.steps.map((step, idx) => (
                  <div key={idx} style={{ fontSize: '12px', color: '#e0e0e0', marginBottom: '4px' }}>
                    {step}
                  </div>
                ))}
              </div>
            )}

            {/* 버튼 */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                console.log('QuickStart button clicked for item:', item.id);
                onSelectItem(item.id);
                console.log('onSelectItem called for:', item.id);
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'linear-gradient(135deg, #64c8ff, #ffd700)',
                border: 'none',
                borderRadius: '6px',
                color: '#000',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.3s ease'
              }}
            >
              <Play size={14} />
              시작하기
            </button>
          </div>
        ))}
      </div>

      {/* 팁 섹션 */}
      <div style={{
        background: 'rgba(255, 215, 0, 0.05)',
        border: '1px solid rgba(255, 215, 0, 0.2)',
        borderRadius: '12px',
        padding: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{ fontSize: '20px' }}>💡</div>
          <div>
            <h4 style={{ fontSize: '13px', fontWeight: '700', color: '#ffd700', margin: 0, marginBottom: '8px' }}>
              사용 팁
            </h4>
            <ul style={{ fontSize: '12px', color: 'rgba(224, 224, 224, 0.8)', margin: 0, paddingLeft: '20px' }}>
              <li style={{ marginBottom: '4px' }}>각 가이드는 시간 순서대로 나열되어 있습니다</li>
              <li style={{ marginBottom: '4px' }}>우측 하단의 "?" 아이콘으로 언제든 도움말을 볼 수 있습니다</li>
              <li style={{ marginBottom: '4px' }}>복잡한 작업은 AI 에이전트가 자동으로 도와줍니다</li>
              <li>모르는 부분이 있으면 다시 이 페이지로 돌아올 수 있습니다</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
