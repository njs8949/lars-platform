import React from 'react';
import {
  Sparkles, Globe, FileText, Users, Eye, TrendingUp, Zap, Grid
} from 'lucide-react';
import { GlassmorphicIcon } from './GlassmorphicIcon';
import '../styles/ToolResultCard.css';

interface ToolResultCardProps {
  tool: string;
  parameters: any;
  result: any;
}

export const ToolResultCard: React.FC<ToolResultCardProps> = ({ tool, parameters, result }) => {
  const getToolInfo = () => {
    const categoryMap: Record<string, {icon: any; name: string; color: string}> = {
      'create_presentation': { icon: Sparkles, name: '프레젠테이션', color: 'from-blue-400 to-purple-500' },
      'create_theme': { icon: Sparkles, name: '테마', color: 'from-pink-400 to-red-500' },
      'create_scraping_job': { icon: Globe, name: '웹 스크래핑', color: 'from-cyan-400 to-blue-500' },
      'create_ocr_job': { icon: FileText, name: 'OCR', color: 'from-green-400 to-emerald-500' },
      'create_crm_contact': { icon: Users, name: 'CRM', color: 'from-yellow-400 to-orange-500' },
      'create_change_detection_watch': { icon: Eye, name: '변경 감지', color: 'from-red-400 to-pink-500' },
      'create_seo_keyword': { icon: TrendingUp, name: 'SEO', color: 'from-purple-400 to-indigo-500' },
      'create_workflow': { icon: Zap, name: '워크플로우', color: 'from-orange-400 to-yellow-500' },
      'create_integration': { icon: Grid, name: '통합', color: 'from-indigo-400 to-blue-500' },
      'list_presentations': { icon: Sparkles, name: '프레젠테이션', color: 'from-blue-400 to-purple-500' },
      'list_scraping_jobs': { icon: Globe, name: '웹 스크래핑', color: 'from-cyan-400 to-blue-500' },
      'list_ocr_jobs': { icon: FileText, name: 'OCR', color: 'from-green-400 to-emerald-500' },
      'list_crm_contacts': { icon: Users, name: 'CRM', color: 'from-yellow-400 to-orange-500' },
      'list_change_detection_watches': { icon: Eye, name: '변경 감지', color: 'from-red-400 to-pink-500' },
      'list_seo_keywords': { icon: TrendingUp, name: 'SEO', color: 'from-purple-400 to-indigo-500' },
      'list_workflows': { icon: Zap, name: '워크플로우', color: 'from-orange-400 to-yellow-500' },
      'list_integrations': { icon: Grid, name: '통합', color: 'from-indigo-400 to-blue-500' },
    };
    return categoryMap[tool] || { icon: Grid, name: '작업', color: 'from-blue-400 to-cyan-500' };
  };

  const info = getToolInfo();
  const Icon = info.icon;

  const renderContent = () => {
    if (!result.success) {
      return (
        <div className="tool-result-error">
          ❌ {result.error || '작업 실패'}
        </div>
      );
    }

    // Create tools: 항목 생성
    if (tool.startsWith('create_')) {
      const itemName = result.name || result.url || result.keyword || '항목';
      return (
        <div className="tool-result-success">
          <div className="tool-result-icon-wrapper">
            <GlassmorphicIcon Icon={Icon} gradient={info.color} size={32} />
          </div>
          <div className="tool-result-content">
            <div className="tool-result-title">✅ {info.name} 생성됨</div>
            <div className="tool-result-detail">{itemName}</div>
            <div className="tool-result-time">방금 생성됨</div>
          </div>
        </div>
      );
    }

    // List tools: 항목 목록
    if (tool.startsWith('list_')) {
      const items = result.items || [];
      if (items.length === 0) {
        return (
          <div className="tool-result-empty">
            <div className="tool-result-icon-wrapper">
              <GlassmorphicIcon Icon={Icon} gradient={info.color} size={32} />
            </div>
            <div className="tool-result-content">
              <div className="tool-result-title">📭 등록된 항목 없음</div>
              <div className="tool-result-detail">{info.name}이 아직 없습니다</div>
            </div>
          </div>
        );
      }

      return (
        <div className="tool-result-list">
          <div className="tool-result-icon-wrapper">
            <GlassmorphicIcon Icon={Icon} gradient={info.color} size={32} />
          </div>
          <div className="tool-result-content">
            <div className="tool-result-title">📊 최근 {info.name} {items.length}개</div>
            <div className="tool-result-items">
              {items.slice(0, 5).map((item: any, idx: number) => (
                <div key={idx} className="tool-result-item">
                  • {item.name || item.url || item.keyword || item.email || '항목'}
                </div>
              ))}
              {items.length > 5 && (
                <div className="tool-result-more">
                  +{items.length - 5}개 더
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return <div className="tool-result-default">작업 완료</div>;
  };

  return (
    <div className="tool-result-card">
      {renderContent()}
    </div>
  );
};
