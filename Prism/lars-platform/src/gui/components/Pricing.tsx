import React, { useState, useEffect } from 'react';
import { Check, X } from 'lucide-react';
import './Pricing.css';

interface Plan {
  tier: string;
  name: string;
  price_monthly: number | string;
  price_yearly: number | string;
  tokens_per_month: string | number;
  features: string[];
}

interface PricingProps {
  onUpgrade?: (tier: string, cycle: 'monthly' | 'yearly') => void;
  isEmbedded?: boolean;
  language?: string;
}

// 환율 설정 (1 USD = 1,300 KRW)
const EXCHANGE_RATE = 1300;

// 가격을 원화로 변환하는 함수
const convertToKRW = (usdPrice: number): number => {
  return Math.round(usdPrice * EXCHANGE_RATE / 100) * 100;
};

// 언어별 기능 설명 및 제목
const FEATURE_TRANSLATIONS = {
  ko: {
    title: '플랜 선택',
    description: 'LARS Prism과 함께 AI 추론의 힘을 경험하세요',
    monthlyLabel: '월간 결제',
    yearlyLabel: '연간 결제 (16% 할인)',
    selectButton: '선택',
    currentButton: '현재 플랜',
    contactButton: '문의',
    free: [
      '기본 AI 추론',
      '제한적 3D 시각화',
      '커뮤니티 지원',
      '광고 표시'
    ],
    pro: [
      '우선 추론 (2배 빠름)',
      '무제한 3D 시각화',
      '팀 협업 (5명)',
      'API 접근 (제한)',
      '이메일 지원',
      '광고 없음'
    ],
    business: [
      '최고 우선순위 (1배 빠름)',
      '팀 협업 (50명)',
      '전체 API 접근',
      'SSO 인증',
      '전화 지원 (24/7)',
      '분석 대시보드',
      '모델 미세 조정'
    ],
    enterprise: [
      '무제한 토큰',
      '온프레미스 배포',
      '커스텀 모델 학습',
      '전담 지원팀',
      'SLA 보장',
      '데이터 처리 계약'
    ]
  },
  en: {
    title: 'Choose Your Plan',
    description: 'Experience the power of AI reasoning with LARS Prism',
    monthlyLabel: 'Monthly Billing',
    yearlyLabel: 'Annual Billing (16% Discount)',
    selectButton: 'Select',
    currentButton: 'Current Plan',
    contactButton: 'Contact',
    free: [
      'Basic AI Reasoning',
      'Limited 3D Visualization',
      'Community Support',
      'Ads Shown'
    ],
    pro: [
      'Priority Inference (2x faster)',
      'Unlimited 3D Visualization',
      'Team Collaboration (5 members)',
      'API Access (limited)',
      'Email Support',
      'No Ads'
    ],
    business: [
      'Highest Priority (1x faster)',
      'Team Collaboration (50 members)',
      'Full API Access',
      'SSO Authentication',
      'Phone Support (24/7)',
      'Analytics Dashboard',
      'Model Fine-tuning'
    ],
    enterprise: [
      'Unlimited Tokens',
      'On-Premise Deployment',
      'Custom Model Training',
      'Dedicated Support Team',
      'SLA Guarantee',
      'Data Processing Agreement'
    ]
  }
};

export const Pricing: React.FC<PricingProps> = ({ onUpgrade, isEmbedded = false, language = 'ko' }) => {
  const [plans, setPlans] = useState<Record<string, Plan>>({});
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [currentTier, setCurrentTier] = useState<string>('free');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlans();
    fetchCurrentSubscription();
  }, [language]);

  const fetchPlans = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/subscription/plans');
      const data = await response.json();

      // API 응답의 features를 언어별 번역으로 대체
      const lang = language || 'ko';
      const translations = FEATURE_TRANSLATIONS[lang as keyof typeof FEATURE_TRANSLATIONS] || FEATURE_TRANSLATIONS.ko;

      const plansWithTranslations = { ...data.plans };
      Object.keys(plansWithTranslations).forEach((tier) => {
        if (translations[tier as keyof typeof translations]) {
          plansWithTranslations[tier].features = translations[tier as keyof typeof translations];
        }
      });

      setPlans(plansWithTranslations);
    } catch (err) {
      console.error('Failed to fetch plans:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentSubscription = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const response = await fetch('http://localhost:8000/api/subscription/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setCurrentTier(data.subscription.tier);
    } catch (err) {
      console.error('Failed to fetch subscription:', err);
    }
  };

  const handleUpgrade = (tier: string) => {
    if (onUpgrade) {
      onUpgrade(tier, billingCycle);
    } else {
      // Navigate to payment page
      window.location.href = `/payment?tier=${tier}&cycle=${billingCycle}`;
    }
  };

  if (loading) {
    return <div className="pricing-loading">로딩 중...</div>;
  }

  const planOrder = ['free', 'pro', 'business', 'enterprise'];
  const lang = language || 'ko';
  const t = FEATURE_TRANSLATIONS[lang as keyof typeof FEATURE_TRANSLATIONS] || FEATURE_TRANSLATIONS.ko;

  return (
    <div className={`pricing-container ${isEmbedded ? 'pricing-embedded' : ''}`}>
      <div className="pricing-header">
        <h1>{t.title}</h1>
        <p>{t.description}</p>

        <div className="billing-toggle">
          <button
            className={`toggle-btn ${billingCycle === 'monthly' ? 'active' : ''}`}
            onClick={() => setBillingCycle('monthly')}
          >
            {t.monthlyLabel}
          </button>
          <button
            className={`toggle-btn ${billingCycle === 'yearly' ? 'active' : ''}`}
            onClick={() => setBillingCycle('yearly')}
          >
            {t.yearlyLabel}
          </button>
        </div>
      </div>

      <div className="pricing-grid">
        {planOrder.map((tierKey) => {
          const plan = plans[tierKey];
          if (!plan) return null;

          const basePrice =
            billingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly;

          // 언어에 따라 가격 변환
          let displayPrice: string | number;
          if (lang === 'ko' && typeof basePrice === 'number') {
            displayPrice = convertToKRW(basePrice);
          } else {
            displayPrice = basePrice;
          }

          const isCurrentTier = currentTier === tierKey;

          return (
            <div
              key={tierKey}
              className={`pricing-card ${isCurrentTier ? 'current' : ''} ${
                tierKey === 'business' ? 'featured' : ''
              }`}
            >
              {tierKey === 'business' && <div className="featured-badge">인기</div>}

              <h3 className="plan-name">{plan.name}</h3>

              <div className="plan-price">
                {typeof displayPrice === 'number' ? (
                  <>
                    <span className="price-amount">
                      {lang === 'ko' ? `₩${displayPrice.toLocaleString('ko-KR')}` : `$${displayPrice.toFixed(2)}`}
                    </span>
                    <span className="price-period">
                      /{billingCycle === 'monthly' ? (lang === 'ko' ? '월' : '/mo') : (lang === 'ko' ? '년' : '/yr')}
                    </span>
                  </>
                ) : (
                  <span className="price-custom">{displayPrice}</span>
                )}
              </div>

              <div className="plan-tokens">
                {typeof plan.tokens_per_month === 'number'
                  ? `${lang === 'ko' ? '월' : 'Monthly'} ${(plan.tokens_per_month / 1_000_000).toFixed(1)}M ${lang === 'ko' ? '토큰' : 'Tokens'}`
                  : plan.tokens_per_month}
              </div>

              <button
                className={`upgrade-btn ${isCurrentTier ? 'current' : ''}`}
                onClick={() => handleUpgrade(tierKey)}
                disabled={isCurrentTier}
              >
                {isCurrentTier ? t.currentButton : tierKey === 'enterprise' ? t.contactButton : t.selectButton}
              </button>

              <div className="features-list">
                {plan.features.map((feature, idx) => (
                  <div key={idx} className="feature-item">
                    <Check size={16} />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="pricing-faq">
        <h2>자주 묻는 질문</h2>

        <div className="faq-item">
          <h4>토큰을 다 사용하면 어떻게 되나요?</h4>
          <p>
            월간 한도를 초과하면 추가 토큰 팩을 구매할 수 있습니다. 또는 상위
            플랜으로 업그레이드할 수 있습니다.
          </p>
        </div>

        <div className="faq-item">
          <h4>언제든 플랜을 변경할 수 있나요?</h4>
          <p>
            예, 언제든지 업그레이드 또는 다운그레이드할 수 있습니다. 변경 사항은
            다음 청구 주기부터 적용됩니다.
          </p>
        </div>

        <div className="faq-item">
          <h4>환불 정책은 무엇인가요?</h4>
          <p>
            14일 이내 전액 환불이 가능합니다. 그 이후에는 사용하지 않은 부분에
            대해서만 환불해 드립니다.
          </p>
        </div>

        <div className="faq-item">
          <h4>팀 계정은 어떻게 만드나요?</h4>
          <p>
            Pro 이상의 플랜에서 팀 협업 기능을 사용할 수 있습니다. 계정 설정에서
            팀원을 초대할 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
};
