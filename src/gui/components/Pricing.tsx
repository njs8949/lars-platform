import { planAmount, formatPrice as formatKrwUsd, resolveProvider, PlanTier, BillingCycle, PayProvider } from '../lib/prices';
import React, { useState, useEffect } from 'react';
import { Check, X } from 'lucide-react';
import './Pricing.css';

interface Plan {
  tier: string;
  name: string;
  price_monthly: number | string;
  tokens_per_month: string | number;
  features: string[];
}

interface PricingProps {
  onUpgrade?: (tier: string, cycle: 'monthly') => void;
  isEmbedded?: boolean;
  language?: string;
  paymentMethod?: 'stripe' | 'kcp' | 'auto';
}

// 언어별 환율 설정
const EXCHANGE_RATES: Record<string, number> = {
  ko: 1300,    // 1 USD = 1,300 KRW
  ja: 150,     // 1 USD = 150 JPY
  zh: 7,       // 1 USD = 7 CNY
  en: 1        // USD stays as is
};

// 언어별 통화 심볼
const CURRENCY_SYMBOLS: Record<string, string> = {
  ko: '₩',
  ja: '¥',
  zh: '¥',
  en: '$'
};

// 결제 방법에 따른 통화 결정
const getPaymentMethod = (paymentMethod?: string): string => {
  if (paymentMethod === 'kcp') return 'ko';
  if (paymentMethod === 'auto') {
    const stored = localStorage.getItem('payment_method');
    return stored === 'kcp' ? 'ko' : 'en';
  }
  return 'en';
};

// 가격을 해당 언어의 통화로 변환하는 함수
const convertPrice = (usdPrice: number, language: string = 'ko', paymentMethod?: string): number => {
  // 결제 방법이 명시적으로 지정되면 그것을 우선시
  if (paymentMethod && paymentMethod !== 'auto') {
    const methodLang = getPaymentMethod(paymentMethod);
    const rate = EXCHANGE_RATES[methodLang] || EXCHANGE_RATES.ko;
    if (methodLang === 'en') return usdPrice;
    return Math.round(usdPrice * rate / 100) * 100;
  }

  const rate = EXCHANGE_RATES[language] || EXCHANGE_RATES.ko;
  if (language === 'en') return usdPrice;
  return Math.round(usdPrice * rate / 100) * 100;
};


// 요금제 카드 가격: 결제 수단이 국내(KCP)면 원화, 아니면 달러. 결제 화면과 같은 가격표를 쓴다.
const planProvider = (language: string, paymentMethod?: string): PayProvider => {
  if (paymentMethod === 'kcp' || paymentMethod === 'stripe') return paymentMethod;
  let stored: string | null = null;
  try { stored = localStorage.getItem('payment_method'); } catch { stored = null; }
  return resolveProvider(language, stored);
};
const planPriceText = (tier: string, cycle: string, language: string, paymentMethod?: string): string => {
  const { amount, currency } = planAmount(tier as PlanTier, cycle as BillingCycle, planProvider(language, paymentMethod));
  return formatKrwUsd(amount, currency);
};
// 가격을 문자열로 포맷하는 함수
const formatPrice = (usdPrice: number, language: string = 'ko', paymentMethod?: string): string => {
  const convertedPrice = convertPrice(usdPrice, language, paymentMethod);

  // 결제 방법이 KCP면 항상 원화 사용
  let displayLang = language;
  if (paymentMethod === 'kcp') {
    displayLang = 'ko';
  } else if (paymentMethod === 'auto') {
    const stored = localStorage.getItem('payment_method');
    displayLang = stored === 'kcp' ? 'ko' : language;
  }

  const symbol = CURRENCY_SYMBOLS[displayLang] || '$';

  if (displayLang === 'en') {
    return `${symbol}${convertedPrice.toFixed(2)}`;
  } else if (displayLang === 'ko') {
    return `${symbol}${convertedPrice.toLocaleString('ko-KR')}`;
  } else {
    return `${symbol}${convertedPrice.toLocaleString()}`;
  }
};

// 언어별 기능 설명 및 제목
const FEATURE_TRANSLATIONS = {
  ko: {
    title: '플랜 선택',
    description: 'LARS Prism과 함께 AI 추론의 힘을 경험하세요',
    monthlyLabel: '월간 결제',
    selectButton: '선택',
    currentButton: '현재 플랜',
    contactButton: '문의',
    cancellationPolicy: '구독은 언제든지 취소할 수 있습니다. 취소 후 현재 결제 기간이 끝날 때까지 서비스를 계속 이용할 수 있으며, 미사용 부분에 대한 환불은 불가능합니다. 자세한 사항은 이용약관을 참고해주세요.',
    free: [
      '기본 AI 추론',
      '제한적 3D 시각화',
      '커뮤니티 지원',
      '광고 표시'
    ],
    pro: [
      '우선 추론 (2배 빠름)',
      '무제한 3D 시각화',
      'Workspace (5명)',
      'API 접근 (제한)',
      '이메일 지원',
      '광고 없음'
    ],
    business: [
      '최고 우선순위 (1배 빠름)',
      'Workspace (50명)',
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
    cancellationPolicy: 'You can cancel your subscription at any time. After cancellation, you can continue using the service until the end of your current billing period. No refunds are provided for unused portions. For details, please refer to our Terms of Service.',
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

export const Pricing: React.FC<PricingProps> = ({ onUpgrade, isEmbedded = false, language = 'ko', paymentMethod = 'auto' }) => {
  const [plans, setPlans] = useState<Record<string, Plan>>({});
  const [currentTier, setCurrentTier] = useState<string>('free');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>(
    paymentMethod === 'auto' ? 'auto' : paymentMethod
  );
  const billingCycle = 'monthly'; // 월간 결제만 지원
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initPlans = async () => {
      setLoading(true);
      try {
        await fetchPlans();
        await fetchCurrentSubscription();
      } finally {
        setLoading(false);
      }
    };
    initPlans();
  }, [language]);

  // 기본 요금제 데이터
  const DEFAULT_PLANS: Record<string, Plan> = {
    free: {
      tier: 'free',
      name: 'Free',
      price_monthly: 0,
      tokens_per_month: '10K',
      features: []
    },
    pro: {
      tier: 'pro',
      name: 'Pro',
      price_monthly: 29,
      price_yearly: 290,
      tokens_per_month: '1M',
      features: []
    },
    business: {
      tier: 'business',
      name: 'Business',
      price_monthly: 99,
      price_yearly: 990,
      tokens_per_month: '10M',
      features: []
    },
    enterprise: {
      tier: 'enterprise',
      name: 'Enterprise',
      price_monthly: 'Custom',
      price_yearly: 'Custom',
      tokens_per_month: 'Unlimited',
      features: []
    }
  };

  const fetchPlans = async () => {
    try {
      const apiBase = (typeof import.meta !== 'undefined' && import.meta.env.VITE_API_URL)
        ? `${import.meta.env.VITE_API_URL}/subscription/plans`
        : `/api/subscription/plans`;
      console.log('[PRICING] Fetching plans from:', apiBase);
      const response = await fetch(apiBase);
      console.log('[PRICING] Response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('[PRICING] Plans data:', data);

      if (!data.plans || Object.keys(data.plans).length === 0) {
        console.warn('[PRICING] No plans in response, using default plans:', data);
        applyTranslationsAndSetPlans(DEFAULT_PLANS);
      } else {
        applyTranslationsAndSetPlans(data.plans);
      }
    } catch (err) {
      console.error('[PRICING] Failed to fetch plans, using default:', err);
      // API 호출 실패 시 기본 요금제 사용
      applyTranslationsAndSetPlans(DEFAULT_PLANS);
    }
  };

  const applyTranslationsAndSetPlans = (plans: Record<string, Plan>) => {
    // API 응답의 features를 언어별 번역으로 대체
    const lang = language || 'ko';
    const translations = FEATURE_TRANSLATIONS[lang as keyof typeof FEATURE_TRANSLATIONS] || FEATURE_TRANSLATIONS.ko;

    const plansWithTranslations = { ...plans };
    Object.keys(plansWithTranslations).forEach((tier) => {
      if (translations[tier as keyof typeof translations]) {
        plansWithTranslations[tier].features = translations[tier as keyof typeof translations];
      }
    });

    console.log('[PRICING] Plans with translations:', plansWithTranslations);
    setPlans(plansWithTranslations);
  };

  const fetchCurrentSubscription = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const apiBase = (typeof import.meta !== 'undefined' && import.meta.env.VITE_API_URL)
        ? `${import.meta.env.VITE_API_URL}/subscription/me`
        : `/api/subscription/me`;
      const response = await fetch(apiBase, {
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

  console.log('[PRICING RENDER] Loading:', loading, 'Plans:', Object.keys(plans).length);

  if (loading) {
    return <div className="pricing-loading">로딩 중...</div>;
  }

  if (Object.keys(plans).length === 0) {
    return <div className="pricing-loading">요금제를 불러올 수 없습니다</div>;
  }

  const planOrder = ['free', 'pro', 'business', 'enterprise'];
  const lang = language || 'ko';
  const t = FEATURE_TRANSLATIONS[lang as keyof typeof FEATURE_TRANSLATIONS] || FEATURE_TRANSLATIONS.ko;

  return (
    <div className={`pricing-container ${isEmbedded ? 'pricing-embedded' : ''}`}>
      <div className="pricing-header">
        <h1>{t.title}</h1>
        <p>{t.description}</p>

      </div>

      <div className="pricing-grid">
        {planOrder.map((tierKey) => {
          const plan = plans[tierKey];
          if (!plan) return null;

          const basePrice = plan.price_monthly;

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
                {typeof basePrice === 'number' ? (
                  <>
                    <span className="price-amount">
                      {planPriceText(tierKey, billingCycle, lang, selectedPaymentMethod)}
                    </span>
                    <span className="price-period">
                      /{planProvider(lang, selectedPaymentMethod) === 'kcp' ? '월' : lang === 'ko' ? '월' : '/mo'}
                    </span>
                  </>
                ) : (
                  <span className="price-custom">{basePrice}</span>
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

      <div className="pricing-cancellation-policy">
        <p>{t.cancellationPolicy}</p>
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
            구독 후 <strong>14일 이내 전액 환불</strong>이 가능합니다. 그 이후에는 사용하지 않은 부분에
            대해서만 환불해 드립니다. 환불은 고객 지원 센터로 환불 신청 후 <strong>5-7 영업일 내</strong> 원결제 수단으로 반환됩니다.
          </p>
        </div>

        <div className="faq-item">
          <h4>환불은 어떻게 신청하나요?</h4>
          <p>
            고객 지원 센터(lars@lars-technologies.com)로 다음 정보와 함께 환불 신청 이메일을 보내주세요:<br/>
            • 가입 이메일 주소<br/>
            • 결제 날짜<br/>
            • 환불 사유<br/>
            요청 검토 후 24시간 내에 답변 드리겠습니다.
          </p>
        </div>

        <div className="faq-item">
          <h4>결제 실패 시 어떻게 되나요?</h4>
          <p>
            카드 거절, 계좌 오류 등으로 결제가 실패하면 자동으로 <strong>3회(3일, 5일, 7일 후) 재시도</strong>됩니다.
            최종 실패 시 구독이 일시 중지되며, 유효한 결제 수단으로 업데이트하면 서비스가 복구됩니다.
          </p>
        </div>

        <div className="faq-item">
          <h4>팀 계정은 어떻게 만드나요?</h4>
          <p>
            Pro 이상의 플랜에서 Workspace 기능을 사용할 수 있습니다. 계정 설정에서
            팀원을 초대할 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
};
