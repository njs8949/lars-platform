# Datadog RUM (Real User Monitoring) 설정 가이드

## 📊 RUM이란?

Real User Monitoring(RUM)은 실제 사용자의 웹 애플리케이션 상호작용을 모니터링하여:
- 페이지 로드 시간
- 사용자 상호작용 추적
- JavaScript 에러 감지
- 성능 병목 지점 식별
- 세션 리플레이

---

## 🚀 설정 단계

### **1단계: Datadog에서 RUM 애플리케이션 생성**

1. **Datadog Dashboard** 접속
2. **Product → Real User Monitoring → Applications**
3. **+ New Application** 클릭
4. **Configuration:**
   - Application Name: `lars-prism-frontend`
   - Application Type: `Single Page Application (SPA)`
5. **Create**를 클릭하면 다음 정보를 얻습니다:
   - **Application ID** ← 필요함
   - **Client Token** ← 필요함

### **2단계: 환경변수 설정**

`.env.datadog` 파일 업데이트:

```bash
# === RUM Configuration ===
DD_RUM_ENABLED=true
DD_RUM_APPLICATION_ID=your_actual_app_id_here
DD_RUM_CLIENT_TOKEN=your_actual_client_token_here
DD_RUM_SAMPLE_RATE=1.0
DD_RUM_SESSION_SAMPLE_RATE=100
DD_RUM_TRACK_USER_INTERACTIONS=true
```

**또는 `.env` (React App):**
```bash
REACT_APP_DD_RUM_ENABLED=true
REACT_APP_DD_RUM_APPLICATION_ID=your_app_id_here
REACT_APP_DD_RUM_CLIENT_TOKEN=your_client_token_here
REACT_APP_DD_RUM_SESSION_SAMPLE_RATE=100
REACT_APP_DD_RUM_TRACK_USER_INTERACTIONS=true
REACT_APP_ENV=production
REACT_APP_VERSION=1.0.0
```

### **3단계: 필요한 패키지 설치**

```bash
npm install @datadog/browser-rum @datadog/browser-logs
```

### **4단계: 코드 통합 (이미 완료됨)**

- ✅ `src/gui/rum-init.ts` - RUM 초기화 함수
- ✅ `src/gui/App.tsx` - RUM 자동 초기화
- ✅ Event tracking 함수 포함

---

## 🔧 주요 기능

### **자동 수집되는 데이터**

```typescript
✅ Page loads and navigation
✅ User interactions (clicks, input)
✅ Resource timing (images, APIs, fonts)
✅ JavaScript errors
✅ Long tasks (>50ms)
✅ Browser errors
✅ Network errors
```

### **커스텀 이벤트 추적**

```typescript
import { trackCustomEvent, trackError } from './rum-init';

// 커스텀 이벤트 기록
trackCustomEvent('user_signup', {
  plan: 'premium',
  source: 'landing_page'
});

// 에러 추적
try {
  // 위험한 작업
} catch (error) {
  trackError(error, {
    context: 'data_processing',
    severity: 'high'
  });
}
```

### **사용자 정보 설정**

App.tsx에서 자동으로 수행됨:
```typescript
datadogRum.setUser({
  id: userId,
  name: userName,
  email: userEmail,
});
```

---

## 📈 모니터링 지표

### **주요 메트릭**

| 지표 | 설명 | 목표값 |
|------|------|--------|
| **LCP** | Largest Contentful Paint | < 2.5초 |
| **FID** | First Input Delay | < 100ms |
| **CLS** | Cumulative Layout Shift | < 0.1 |
| **Page Load Time** | 전체 로드 시간 | < 3초 |
| **Error Rate** | JavaScript 에러 비율 | < 1% |
| **API Response Time** | API 응답 시간 | < 500ms |

### **Datadog Dashboard에서 확인:**

1. **RUM Dashboard** → **Application Performance**
2. **User Sessions** → 개별 세션 상세 정보
3. **Analytics** → 커스텀 쿼리 및 분석
4. **Session Replay** → 사용자 상호작용 재생

---

## 🎥 세션 리플레이 (Session Replay)

### **설정 (현재 20% 샘플링)**

```typescript
sessionReplaySampleRate: 20,  // 20% of sessions recorded
defaultPrivacyLevel: 'mask-user-input'  // 민감한 정보 마스킹
```

### **개인정보 보호**

- ✅ 입력 필드 마스킹 (패스워드, 신용카드 등)
- ✅ 개인식별정보(PII) 제외
- ✅ GDPR 준수

---

## 🚨 에러 모니터링

### **자동 수집**

```
✅ JavaScript errors
✅ Network errors
✅ API errors (4xx, 5xx)
✅ Resource loading errors
✅ Promise rejection
```

### **에러 추적 예시**

```typescript
// API 에러 추적
try {
  const response = await fetch('/api/data');
  if (!response.ok) {
    trackError(
      new Error(`API Error: ${response.status}`),
      { url: response.url, endpoint: '/api/data' }
    );
  }
} catch (error) {
  trackError(error, { context: 'api_call' });
}
```

---

## 📊 분석 및 알림

### **권장 알림 규칙**

```
1. Error Rate > 5% (지난 5분)
2. Page Load Time > 5초 (지난 15분)
3. API Error Rate > 10% (지난 10분)
4. Session Replay availability < 95%
```

### **쿼리 예시 (Datadog)**

```
@type:view @http.status_code:[400 TO 599]
| stats count() by @error.kind
```

---

## 🔐 보안 및 규정 준수

### **개인정보 보호**

- ✅ GDPR 준수 (사용자 동의 필요)
- ✅ CCPA 준수
- ✅ 데이터 마스킹
- ✅ 감사 로깅

### **권장 설정**

```typescript
// 사용자 동의 확인 후 RUM 활성화
if (userConsent.analytics) {
  initializeDatadogRUM();
}

// 또는 쿠키 배너 사용
const consent = getCookieConsent('analytics');
if (consent) {
  initializeDatadogRUM();
}
```

---

## 🧪 테스트

### **로컬 테스트**

```bash
# 개발 환경에서 RUM 활성화
REACT_APP_DD_RUM_ENABLED=true npm start

# 브라우저 개발자 도구 → Network 탭
# datadoghq.com 요청 확인
```

### **이벤트 확인**

1. **Datadog Dashboard** → **RUM** → **Applications**
2. **Filter by:** `env:development` 또는 `env:production`
3. **Sessions** 탭에서 테스트 세션 확인
4. **Event** 탭에서 발생한 이벤트 확인

---

## 📋 체크리스트

배포 전 확인사항:

- [ ] Datadog에서 RUM 애플리케이션 생성 완료
- [ ] Application ID 및 Client Token 획득
- [ ] `.env.datadog` 파일에 토큰 설정
- [ ] `npm install @datadog/browser-rum` 실행
- [ ] `rum-init.ts` 파일 확인
- [ ] `App.tsx`에 RUM 초기화 확인
- [ ] 로컬 환경에서 테스트
- [ ] 네트워크 탭에서 Datadog 요청 확인
- [ ] Datadog Dashboard에서 데이터 수신 확인
- [ ] 사용자 동의 처리 구현 (필요시)
- [ ] 프로덕션 배포

---

## 🆘 문제 해결

### **Datadog에 데이터가 표시되지 않음**

1. **브라우저 콘솔 확인:**
   ```
   [Datadog RUM] Initialized successfully
   ```
   - 없으면 `rum-init.ts` 로드 확인

2. **네트워크 요청 확인:**
   - DevTools → Network 탭
   - `datadoghq.com` 필터링
   - HTTP 요청 상태 확인 (200 OK)

3. **토큰 확인:**
   ```bash
   echo $REACT_APP_DD_RUM_APPLICATION_ID
   echo $REACT_APP_DD_RUM_CLIENT_TOKEN
   ```

### **세션 리플레이 미작동**

```typescript
// 콘솔에서 확인
datadogRum.startSessionReplayRecording();
```

---

## 📚 추가 리소스

- [Datadog RUM Docs](https://docs.datadoghq.com/real_user_monitoring/)
- [Browser RUM SDK](https://github.com/DataDog/browser-sdk)
- [Session Replay Setup](https://docs.datadoghq.com/real_user_monitoring/session_replay/)
- [Performance Monitoring](https://docs.datadoghq.com/real_user_monitoring/mobile_vitals/)

---

**마지막 업데이트:** 2026-09-09
**상태:** ✅ RUM 통합 완료 및 테스트 준비됨
