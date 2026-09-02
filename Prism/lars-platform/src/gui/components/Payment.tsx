import React, { useState, useEffect } from 'react';
import { CreditCard, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import './Payment.css';

declare global {
  function KCP_Pay_Execute_Web(frm: any): void;
  var m_Completepayment: ((FormOrJson: any, closeEvent: any) => void) | undefined;
}

interface PaymentProps {
  tier?: string;
  billingCycle?: 'monthly' | 'yearly';
  onSuccess?: () => void;
  onCancel?: () => void;
  isEmbedded?: boolean;
}

export const Payment: React.FC<PaymentProps> = ({
  tier = 'pro',
  billingCycle = 'monthly',
  onSuccess,
  onCancel,
  isEmbedded = false,
}) => {
  const [provider, setProvider] = useState<'stripe' | 'kcp'>('stripe');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const prices: Record<string, Record<string, number>> = {
    pro: { monthly: 19.99, yearly: 199.99 },
    business: { monthly: 99.99, yearly: 999.99 },
  };

  const price = prices[tier]?.[billingCycle] || 0;

  useEffect(() => {
    // Load KCP JavaScript library when component mounts
    if (provider === 'kcp') {
      const script = document.createElement('script');
      script.src = 'https://testspay.kcp.co.kr/plugin/kcp_spay_hub.js';
      script.async = true;
      document.head.appendChild(script);
      console.log('[KCP] KCP library script loaded');
    }
  }, [provider]);

  const handleKCPPayment = async () => {
    try {
      console.log('[KCP] Starting KCP payment process...');

      // KCP pricing
      const kcpPrices: Record<string, Record<string, number>> = {
        pro: { monthly: 19_900, yearly: 199_900 },
        business: { monthly: 99_900, yearly: 999_900 },
      };
      const kcpAmount = kcpPrices[tier]?.[billingCycle] || 0;

      // Generate order ID
      const email = localStorage.getItem('user_email') || 'test@lars-technologies.com';
      const timestamp = Math.floor(Date.now() / 1000);
      const orderId = `LARS_${email.replace(/@/g, '_')}${timestamp}`;

      console.log('[KCP] Order ID:', orderId);
      console.log('[KCP] Amount:', kcpAmount, 'KRW');

      // Define KCP callback BEFORE loading library
      window.m_Completepayment = function(FormOrJson: any, closeEvent: any) {
        console.log('[KCP] Payment completed, response:', FormOrJson);

        if (typeof FormOrJson === 'string') {
          try {
            FormOrJson = JSON.parse(FormOrJson);
          } catch (e) {
            console.error('[KCP] Failed to parse response:', e);
          }
        }

        // Check payment success (res_cd == '0000' means success)
        if (FormOrJson && FormOrJson.res_cd === '0000') {
          console.log('[KCP] Payment successful!');
          setSuccess(true);
          if (onSuccess) {
            setTimeout(onSuccess, 2000);
          }
        } else {
          const errMsg = FormOrJson?.res_msg || 'Unknown error';
          console.error('[KCP] Payment failed:', errMsg);
          setError(`결제 실패: ${errMsg}`);
        }
        setLoading(false);
      };

      // Create KCP form
      const form = document.createElement('form');
      form.name = 'order_info';
      form.method = 'post';
      form.id = 'kcp_form';

      // KCP form fields - pay_method 필수 포함
      const fields = {
        'site_cd': 'ALPG5',                        // 사이트 코드
        'site_name': 'LARS',                       // 사이트명
        'pay_method': '100000000000',               // 결제방법 (신용카드=100000000000, 계좌이체=010000000000)
        'tran_cd': '00100001',                     // 거래코드
        'currency': '410',                         // 통화코드 (410=KRW)
        'ordr_idxx': orderId,                      // 주문번호 (필수)
        'good_name': `LARS ${tier} 구독`,          // 상품명
        'good_mny': String(Math.floor(kcpAmount)), // 상품금액
        'buyr_name': 'Customer',                   // 구매자명
        'buyr_tel1': '82',                         // 국가코드
        'buyr_tel2': '01000000000',                // 휴대폰번호
        'buyr_mail': 'user@example.com',           // 구매자 이메일
        'quotaopt': '12',                          // 할부옵션 (12=일시불)
        'res_cd': '',                              // 결과코드
        'res_msg': '',                             // 결과메시지
        'enc_info': '',                            // 암호화정보
        'enc_data': '',                            // 암호화데이터
      };

      for (const [key, value] of Object.entries(fields)) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = value;
        form.appendChild(input);
      }

      form.style.display = 'none';
      document.body.appendChild(form);

      console.log('[KCP] Form created with fields:', fields);

      // Load KCP library and execute
      if (typeof window.KCP_Pay_Execute_Web === 'function') {
        console.log('[KCP] KCP library loaded, executing payment...');
        window.KCP_Pay_Execute_Web(form);
      } else {
        console.error('[KCP] KCP library not loaded yet, waiting...');
        setTimeout(() => {
          if (typeof window.KCP_Pay_Execute_Web === 'function') {
            console.log('[KCP] KCP library now available, executing...');
            window.KCP_Pay_Execute_Web(form);
          } else {
            throw new Error('KCP_Pay_Execute_Web not available after timeout');
          }
        }, 1000);
      }

    } catch (err: any) {
      console.error('[KCP] Error:', err);
      setError(err.message || 'KCP payment initialization failed');
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    setLoading(true);
    setError('');

    // KCP 결제는 별도 처리
    if (provider === 'kcp') {
      await handleKCPPayment();
      return;
    }

    try {
      console.log('[PAYMENT] Starting payment process...');
      console.log('[PAYMENT] Provider:', provider);
      console.log('[PAYMENT] Tier:', tier);
      console.log('[PAYMENT] Billing Cycle:', billingCycle);
      console.log('[PAYMENT] Environment:', {
        isDev: import.meta.env.DEV,
        isProduction: import.meta.env.PROD,
        apiUrl: import.meta.env.VITE_API_URL,
      });

      const token = localStorage.getItem('auth_token');
      console.log('[PAYMENT] Auth token exists:', !!token);

      // 개발 환경에서 테스트 모드
      if (import.meta.env.DEV && !token) {
        console.warn('[PAYMENT] Development mode - no auth token required');
      }

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const endpoint = `${apiUrl}/api/subscription/pay`;

      console.log('[PAYMENT] Sending request to:', endpoint);
      console.log('[PAYMENT] Request payload:', {
        tier,
        billing_cycle: billingCycle,
        provider,
      });

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({
          tier,
          billing_cycle: billingCycle,
          provider,
        }),
      });

      console.log('[PAYMENT] Response status:', response.status);

      let data;
      try {
        data = await response.json();
      } catch (e) {
        console.error('[PAYMENT] Failed to parse response:', e);
        throw new Error('Invalid server response');
      }

      console.log('[PAYMENT] Response data:', data);

      if (!response.ok) {
        const errorMessage = data?.detail || data?.message || 'Payment request failed';
        throw new Error(errorMessage);
      }

      // Stripe 결제 처리
      if (provider === 'stripe') {
        console.log('[PAYMENT] Processing Stripe payment...');
        console.log('[PAYMENT] Checkout data:', data.payment);

        if (data.payment?.checkout_url) {
          console.log('[PAYMENT] Redirecting to Stripe Checkout:', data.payment.checkout_url);
          window.location.href = data.payment.checkout_url;
        } else if (data.payment?.session_id) {
          console.log('[PAYMENT] Stripe session created, should redirect');
          setError('결제 준비 중... (Stripe Checkout 로드 실패)');
        } else {
          console.log('[PAYMENT] Stripe payment response:', data);
          setSuccess(true);
        }
      }

      if (onSuccess && !data.payment?.checkout_url) {
        setTimeout(onSuccess, 2000);
      }
    } catch (err: any) {
      console.error('[PAYMENT] Error occurred:', err);
      console.error('[PAYMENT] Error details:', {
        message: err?.message,
        status: err?.status,
        response: err?.response,
        stack: err?.stack,
      });

      let errorMessage = 'Payment processing failed';

      if (err instanceof TypeError && err.message.includes('fetch')) {
        errorMessage = '서버에 연결할 수 없습니다. 백엔드가 실행 중인지 확인해주세요.\n' +
                      '(Server connection failed. Please check if the backend is running.)';
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className={`payment-container ${isEmbedded ? 'payment-embedded' : ''}`}>
        <div className="payment-card">
          <div className="success-icon">
            <CheckCircle size={64} />
          </div>
          <h2>결제 완료!</h2>
          <p>결제가 정상적으로 완료되었습니다.</p>
          <p className="success-message">
            구독이 활성화되었으며, 모든 기능을 사용할 수 있습니다.
          </p>
          <button className="payment-btn" onClick={onSuccess}>
            계속하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`payment-container ${isEmbedded ? 'payment-embedded' : ''}`}>
      <div className="payment-card">
        <h2>결제 정보</h2>

        <div className="payment-summary">
          <div className="summary-row">
            <span>플랜</span>
            <span className="summary-value">
              {tier === 'pro' ? 'Pro' : 'Business'}
            </span>
          </div>
          <div className="summary-row">
            <span>결제 주기</span>
            <span className="summary-value">
              {billingCycle === 'monthly' ? '월간' : '연간'}
            </span>
          </div>
          <div className="summary-row">
            <span>가격</span>
            <span className="summary-value">${price.toFixed(2)}</span>
          </div>
        </div>

        <div className="payment-methods">
          <h3>결제 방법</h3>

          <div className="method-options">
            <label className="method-option">
              <input
                type="radio"
                name="provider"
                value="stripe"
                checked={provider === 'stripe'}
                onChange={(e) => setProvider(e.target.value as 'stripe' | 'kcp')}
              />
              <span>
                <strong>국제 결제</strong> (Stripe)
                <br />
                <small>신용카드, Apple Pay, Google Pay</small>
              </span>
            </label>

            <label className="method-option">
              <input
                type="radio"
                name="provider"
                value="kcp"
                checked={provider === 'kcp'}
                onChange={(e) => setProvider(e.target.value as 'stripe' | 'kcp')}
              />
              <span>
                <strong>국내 결제</strong> (NHN KCP)
                <br />
                <small>신용카드, 계좌이체, 모바일결제</small>
              </span>
            </label>
          </div>
        </div>

        {error && (
          <div className="payment-error">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        <div className="payment-notice">
          <p>
            결제하면 <strong>이용약관</strong>과 <strong>개인정보처리방침</strong>에
            동의하는 것입니다.
          </p>
          <p>
            14일 이내 전액 환불이 가능합니다.
          </p>
        </div>

        <div className="payment-actions">
          <button
            className="payment-btn primary"
            onClick={handlePayment}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader size={20} className="spin" />
                결제 진행 중...
              </>
            ) : (
              <>
                <CreditCard size={20} />
                ${price.toFixed(2)} 결제하기
              </>
            )}
          </button>
          <button className="payment-btn secondary" onClick={onCancel}>
            취소
          </button>
        </div>
      </div>
    </div>
  );
};
