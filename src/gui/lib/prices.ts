/** 요금제 가격 기준. 결제 수단에 따라 통화를 고른다: 국제 결제(Stripe)는 USD, 국내 결제(KCP)는 KRW. */
export type PlanTier = 'pro' | 'business';
export type BillingCycle = 'monthly' | 'yearly';
export type PayProvider = 'stripe' | 'kcp';

export const PLAN_PRICES: Record<PlanTier, Record<BillingCycle, { usd: number; krw: number }>> = {
  pro: {
    monthly: { usd: 19.99, krw: 19_900 },
    yearly: { usd: 199.99, krw: 199_900 },
  },
  business: {
    monthly: { usd: 99.99, krw: 99_900 },
    yearly: { usd: 999.99, krw: 999_900 },
  },
};

/**
 * 결제 수단을 정한다. 사용자가 고른 값(저장된 값)이 있으면 그것을 쓰고,
 * 없으면 앱 언어로 기본값을 정한다: 한국어는 국내 결제(KCP, 원화), 그 외는 Stripe(달러).
 * 요금제 카드와 결제 화면이 같은 함수를 써서 같은 통화를 보여 준다.
 */
export function resolveProvider(language: string | undefined, stored: string | null | undefined): PayProvider {
  if (stored === 'kcp' || stored === 'stripe') return stored;
  return (language || 'ko').toLowerCase().startsWith('ko') ? 'kcp' : 'stripe';
}

export function currencyFor(provider: PayProvider): 'USD' | 'KRW' {
  return provider === 'kcp' ? 'KRW' : 'USD';
}

/** 선택한 결제 수단의 통화로 금액을 표시한다. */
export function formatPrice(amount: number, currency: 'USD' | 'KRW'): string {
  if (currency === 'KRW') return `₩${Math.round(amount).toLocaleString('ko-KR')}`;
  return `$${amount.toFixed(2)}`;
}

export function planAmount(tier: PlanTier, cycle: BillingCycle, provider: PayProvider): { amount: number; currency: 'USD' | 'KRW' } {
  const currency = currencyFor(provider);
  const row = PLAN_PRICES[tier]?.[cycle];
  return { amount: row ? (currency === 'KRW' ? row.krw : row.usd) : 0, currency };
}
