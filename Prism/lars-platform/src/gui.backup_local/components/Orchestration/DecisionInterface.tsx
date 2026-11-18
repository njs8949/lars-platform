import React, { useEffect, useState } from 'react';

interface Decision {
  decision_id: string;
  title: string;
  description: string;
  options: string[];
  decision_type: string;
  created_at: string;
  timeout_at: string;
  status: string;
}

const DecisionInterface: React.FC<{ language?: 'ko' | 'en' }> = ({ language = 'en' }) => {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingDecisions();
    const interval = setInterval(fetchPendingDecisions, 2000);
    return () => clearInterval(interval);
  }, []);

  const fetchPendingDecisions = async () => {
    try {
      const response = await fetch('/api/orchestration/decisions/pending');
      const data = await response.json();
      setDecisions(data.decisions || []);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch decisions:', error);
    }
  };

  const handleDecision = async (decisionId: string, choice: string) => {
    setSubmitting(decisionId);
    try {
      const response = await fetch(`/api/orchestration/decisions/${decisionId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ choice }),
      });

      if (response.ok) {
        setDecisions(decisions.filter(d => d.decision_id !== decisionId));
      }
    } catch (error) {
      console.error('Failed to submit decision:', error);
    } finally {
      setSubmitting(null);
    }
  };

  const getTimeRemaining = (timeoutAt: string) => {
    const diff = new Date(timeoutAt).getTime() - new Date().getTime();
    if (diff <= 0) return '만료됨';
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return `${seconds}초`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}분`;
  };

  const t = language === 'ko' ? koTexts : enTexts;

  if (loading) {
    return <div className="decision-interface">{t.loading}</div>;
  }

  if (decisions.length === 0) {
    return (
      <div className="decision-interface">
        <div className="empty-state">
          <h3>{t.noDecisions}</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="decision-interface">
      <h2 className="interface-title">{t.title}</h2>
      <p className="interface-subtitle">{t.actionRequired}</p>

      <div className="decisions-list">
        {decisions.map((decision) => (
          <div key={decision.decision_id} className="decision-card">
            <div className="decision-header">
              <h3 className="decision-title">{decision.title}</h3>
              <div className="decision-meta">
                <span className="decision-type">{decision.decision_type}</span>
                <span className="time-remaining" title={decision.timeout_at}>
                  ⏱ {getTimeRemaining(decision.timeout_at)}
                </span>
              </div>
            </div>

            <p className="decision-description">{decision.description}</p>

            <div className="decision-options">
              {decision.options.map((option) => (
                <button
                  key={option}
                  className="option-button"
                  onClick={() => handleDecision(decision.decision_id, option)}
                  disabled={submitting === decision.decision_id}
                >
                  {submitting === decision.decision_id ? (
                    <span className="spinner" />
                  ) : null}
                  {option}
                </button>
              ))}
            </div>

            <div className="decision-info">
              <small>ID: {decision.decision_id}</small>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const koTexts = {
  title: '의사결정 인터페이스',
  actionRequired: '사용자의 의사결정이 필요합니다',
  noDecisions: '대기 중인 의사결정이 없습니다',
  loading: '로딩 중...',
  submit: '제출',
  cancel: '취소',
};

const enTexts = {
  title: 'Decision Interface',
  actionRequired: 'User decision required',
  noDecisions: 'No pending decisions',
  loading: 'Loading...',
  submit: 'Submit',
  cancel: 'Cancel',
};

export default DecisionInterface;
