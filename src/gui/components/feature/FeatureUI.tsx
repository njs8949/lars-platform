import React from 'react';
import './FeatureUI.css';
import { requestAssistant } from '../../lib/aiRouter';

export const FeatureHeader: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  badge?: string;
}> = ({ icon, title, subtitle, actions, badge }) => (
  <div className="feature-header">
    <div className="feature-header-title">
      <div className="feature-header-icon">{icon}</div>
      <div>
        <div className="feature-header-name">
          {title}
          {badge && <span className="feature-header-badge">✦ {badge}</span>}
        </div>
        {subtitle && <div className="feature-header-sub">{subtitle}</div>}
      </div>
    </div>
    {actions && <div className="feature-header-actions">{actions}</div>}
  </div>
);

export type KpiTone = 'blue' | 'green' | 'amber' | 'red' | 'violet';

export const KpiGrid: React.FC<{ items: { label: string; value: React.ReactNode; tone?: KpiTone }[] }> = ({ items }) => (
  <div className="feature-kpis">
    {items.map((item) => (
      <div key={item.label} className={`feature-kpi tone-${item.tone ?? 'blue'}`}>
        <div className="feature-kpi-label">{item.label}</div>
        <div className="feature-kpi-value">{item.value}</div>
      </div>
    ))}
  </div>
);

export const EmptyState: React.FC<{
  icon: React.ReactNode;
  title: string;
  description?: string;
  steps?: string[];
  examples?: string[];
  /** 예시를 누르면 이 탭의 AI 어시스턴트에 질문 초안으로 넘긴다. */
  tab?: string;
  action?: { label: string; onClick: () => void };
  secondary?: { label: string; onClick: () => void };
}> = ({ icon, title, description, steps, examples, tab, action, secondary }) => (
  <div className="feature-empty">
    <div className="feature-empty-icon">{icon}</div>
    <div className="feature-empty-title">{title}</div>
    {description && <div className="feature-empty-desc">{description}</div>}
    {steps && steps.length > 0 && (
      <ol className="feature-empty-steps">
        {steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    )}
    {examples && examples.length > 0 && (
      <div className="feature-empty-examples">
        <div className="feature-empty-examples-label">
          {tab ? 'AI 어시스턴트에게 이렇게 물어보세요' : '이렇게 시작해 보세요'}
        </div>
        <div className="feature-empty-examples-list">
          {examples.map((example) =>
            tab ? (
              <button
                key={example}
                type="button"
                className="feature-empty-example clickable"
                onClick={() => requestAssistant(tab, `${example} 방법을 단계별로 알려줘`)}
              >
                {example}
              </button>
            ) : (
              <span key={example} className="feature-empty-example">{example}</span>
            )
          )}
        </div>
      </div>
    )}
    {(action || secondary) && (
      <div className="feature-empty-actions">
        {action && <button className="feature-btn primary" onClick={action.onClick}>{action.label}</button>}
        {secondary && <button className="feature-btn" onClick={secondary.onClick}>{secondary.label}</button>}
      </div>
    )}
  </div>
);

export const PanelStats: React.FC<{ title?: string; items: { label: string; value: React.ReactNode; tone?: KpiTone }[] }> = ({ title = '통계', items }) => (
  <div className="feature-panel-stats">
    <div className="feature-panel-stats-title">{title}</div>
    {items.map((item) => (
      <div key={item.label} className="feature-panel-stat-row">
        <span className="feature-panel-stat-label">{item.label}</span>
        <span className={`feature-panel-stat-value tone-${item.tone ?? 'blue'}`}>{item.value}</span>
      </div>
    ))}
  </div>
);

/** 정확도(0~100)를 근거 수준 배지로 보여 준다. 낮은 값은 사람이 확인하도록 표시한다. */
export const ConfidenceBadge: React.FC<{ value: number }> = ({ value }) => {
  const level = value >= 90 ? 'high' : value >= 70 ? 'review' : 'check';
  const label = level === 'high' ? '높음' : level === 'review' ? '검토 권장' : '직접 확인';
  return (
    <span className={`feature-confidence ${level}`} title={`정확도 ${value}%`}>
      {label} · {value}%
    </span>
  );
};

export default FeatureHeader;
