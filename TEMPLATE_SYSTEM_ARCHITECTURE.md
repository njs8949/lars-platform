# Prism Template System Architecture

## Overview

이 문서는 Prism의 새로운 **Design System 중심 Template Architecture**를 설명합니다.

기존: 각 템플릿이 독립적인 고정 컴포넌트
→ 새로운: 중앙 Design Token + 재사용 가능 Component Library + AI 기반 Recommender

---

## Architecture Diagram

```
                        USER INTENT
                            │
                            ▼
            ┌───────────────────────────────┐
            │  TemplateRecommender (AI)     │
            │  자연어 → 템플릿 추천         │
            └───────────────┬───────────────┘
                            │
                    ┌───────▼────────┐
                    │ Template Search │
                    │ Ranking Engine  │
                    └───────┬────────┘
                            │
            ┌───────────────▼────────────────┐
            │   TemplateMetadata Database    │
            │   - 45+ 구조화된 템플릿       │
            │   - 메타데이터 (palette, etc) │
            └───────────────┬────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
   RealisticTemplate  Enhanced         ComponentLibrary
   Preview            Customizer       재사용 가능
   (기존)             Design Tokens    컴포넌트
                      변경
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                    ┌───────▼────────┐
                    │  Design Tokens │
                    │  - Palettes    │
                    │  - Typography  │
                    │  - Spacing     │
                    │  - Radius      │
                    │  - Shadows     │
                    │  - Gradients   │
                    └────────────────┘
```

---

## Core Components

### 1. Design Tokens (`tokens.ts`)
중앙화된 디자인 시스템 정의

**포함 내용:**
- **Color Palettes** (8가지)
  - minimal: 회색/흰색
  - modern: 파란색
  - corporate: 짙은 파란색
  - creative: 주황색/빨강
  - startup: 다크/사이안
  - premium: 자주색
  - tech: 사이안/보라
  - ecommerce: 빨강

- **Typography** (3가지)
  - sansSerif: Inter
  - modern: Poppins
  - serif: Playfair Display

- **Spacing Scale** (xs, sm, md, lg, xl, 2xl, 3xl)
- **Border Radius** (none ~ full)
- **Shadows** (sm ~ 2xl)
- **Gradients** (6가지 preset)

**사용:**
```typescript
const palette = getPalette('modern');
// { primary: '#0052CC', secondary: '#003D99', ... }

const typography = getTypography('sansSerif');
// { family: 'Inter, ...', weights: { ... } }
```

---

### 2. Template Metadata (`templateMetadata.ts`)
구조화된 템플릿 정의와 검색 엔진

**Template 구조:**
```typescript
interface TemplateMetadata {
  id: string;                      // 고유 ID
  name: string;                    // 템플릿 이름
  category: 'website' | 'presentation' | 'document';
  type: string;                    // 세부 타입
  description: string;             // 설명
  palette: string;                 // Design Token palette
  typography: string;              // Design Token typography
  layouts: string[];               // 사용 가능한 레이아웃
  components: string[];            // 사용 컴포넌트
  density: 'compact' | 'comfortable' | 'spacious';
  imageStyle: string;              // 이미지 스타일
  useCase: string[];               // 사용 사례
  industry: string[];              // 산업 카테고리
  features: string[];              // 특징
  popularity: number;              // 인기도 (다운로드 수)
  featured: boolean;               // 추천 여부
  isNew: boolean;                  // 신규 여부
  downloads: number;               // 다운로드 수
  rating: number;                  // 평점
  difficulty: 'easy' | 'medium' | 'advanced';
  customizable: boolean;           // 커스터마이징 가능 여부
  aiCompatible: boolean;           // AI 호환성
}
```

**제공 템플릿:**
- Website: 8가지 (Minimal, Modern, Corporate, Creative, Startup, E-Commerce, Premium, Tech)
- Presentation: 3가지 (Pitch Deck, Business, Training)
- Document: 2가지 (Report, Proposal)

**검색 기능:**
```typescript
searchTemplates(query, {
  category: 'website',
  palette: 'modern',
  difficulty: 'easy'
})
```

---

### 3. Component Library (`TemplateComponentLibrary.tsx`)
Design Token을 사용하는 재사용 가능한 컴포넌트

**컴포넌트 목록:**
- `NavBar`: 네비게이션 바
- `HeroSection`: 영웅 섹션
- `Card`: 카드 컴포넌트
- `FeatureGrid`: 기능 그리드
- `MetricBlock`: 지표 블록
- `TestimonialCard`: 후기 카드
- `PricingCard`: 가격 카드
- `CTASection`: CTA 섹션
- `Footer`: 푸터
- `SectionContainer`: 섹션 컨테이너
- `StatsSection`: 통계 섹션

**특징:**
- 모든 컴포넌트는 `palette` prop을 받음
- 실시간으로 Design Token 변경 가능
- 일관된 스타일 유지

**사용 예시:**
```typescript
<HeroSection
  palette="creative"
  title="Creative Studio"
  subtitle="Crafting Digital Experiences"
  gradientBg={DesignTokens.gradients.orangeCreative}
/>
```

---

### 4. Enhanced Template Customizer (`EnhancedTemplateCustomizer.tsx`)
실시간 Design Token 커스터마이징

**기능:**
- **Design Tab**: 팔레트 선택, 간격, 테두리 반경
- **Colors Tab**: 개별 색상 변경, 그래디언트 미리보기
- **Typography Tab**: 폰트 선택, 크기 스케일, 글자 간격
- **Preview Tab**: 실시간 미리보기, 색상 조화 확인

**상태 관리:**
```typescript
interface CustomizerState {
  selectedPalette: string;
  selectedTypography: string;
  customColors: { primary?, secondary?, ... };
  customSpacing: 'compact' | 'comfortable' | 'spacious';
  customRadius: string;
}
```

---

### 5. Template Recommender (`TemplateRecommender.tsx`)
AI 기반 자연어 템플릿 추천

**작동 원리:**

1. **입력 분석**
   ```
   "AI startup dark SaaS landing page"
   ↓
   - Category: website
   - Tone: tech
   - Palette: startup
   ```

2. **의도 매핑**
   - 자연어 키워드 → 카테고리, 스타일, 산업
   - 예: "luxury" → palette='premium', difficulty='medium'

3. **랭킹**
   - 팔레트 매칭: +10점
   - 카테고리 매칭: +8점
   - 산업 매칭: +6점
   - 키워드 매칭: +2점/단어
   - 인기도 부스트: +popularity/1000

4. **결과 반환**
   - 상위 5개 추천 템플릿
   - 점수 기준 정렬

**인터페이스:**
- 자연어 쿼리 입력
- 카테고리/스타일 필터
- 추천 결과 카드 (평점, 다운로드, 컴포넌트 목록)
- 예시 제안

---

## Data Flow

### 시나리오 1: 사용자가 Template Recommender 사용

```
User: "AI startup landing page with dark theme"
           ↓
    [TemplateRecommender]
    - 자연어 분석
    - 의도 감지: category=website, palette=startup
           ↓
    [searchTemplates()]
    - 필터링 & 랭킹
           ↓
    [Recommend: Top 5 Templates]
    - StartupWebsite, ModernWebsite, TechWebsite, ...
           ↓
User selects: StartupWebsite
           ↓
    [EnhancedTemplateCustomizer]
    - 기본값: palette='startup'
    - 사용자가 색상, 폰트 등 커스터마이징
           ↓
    [Generate / Download]
```

### 시나리오 2: 사용자가 직접 Customizer 열기

```
User: Click on template
           ↓
    [EnhancedTemplateCustomizer opens]
    - 템플릿 기본 Design Token 로드
           ↓
User: Change palette to 'creative'
           ↓
    [RealisticTemplatePreview updates]
    - 모든 컴포넌트가 새로운 palette 사용
           ↓
User: Adjust custom colors
           ↓
    [Live preview in Preview tab]
           ↓
    [Save / Generate]
```

---

## Benefits

| 측면 | 개선 내용 |
|------|--------|
| **확장성** | 새 팔레트/컴포넌트 추가 시 모든 템플릿에 자동 반영 |
| **일관성** | 중앙화된 Design Token으로 일관된 스타일 유지 |
| **재사용성** | 컴포넌트를 조합해서 새로운 템플릿 생성 가능 |
| **사용자 경험** | AI 기반 추천으로 올바른 템플릿 빠르게 찾기 |
| **유지보수** | 변경사항을 한 곳에서 관리 |
| **커스터마이징** | 실시간 미리보기로 즉시 피드백 |

---

## Integration Points

### ThemeLibrary와 통합
```typescript
// ThemeLibrary.tsx에서 다음과 같이 사용
import { TemplateRecommender } from './TemplateRecommender';
import { EnhancedTemplateCustomizer } from './EnhancedTemplateCustomizer';
import { AllTemplates } from '../design/templateMetadata';

// 초기: TemplateRecommender 표시
<TemplateRecommender onSelect={(template) => {
  setSelectedTemplate(template);
  openCustomizer();
}} />

// 선택 후: Customizer 표시
<EnhancedTemplateCustomizer
  templateName={selectedTemplate.name}
  onCustomize={(state) => updatePreview(state)}
  onGenerate={(state) => generateTemplate(state)}
/>
```

### Backend API 통합
```typescript
// Flask API endpoint
POST /api/templates/generate
{
  templateId: 'startup-saas',
  customizerState: {
    palette: 'startup',
    colors: { primary: '#00D4FF', ... },
    typography: 'sansSerif'
  }
}

Response:
{
  websiteHtml: '...',
  pptxUrl: '...',
  docxUrl: '...',
  previewUrl: '...'
}
```

---

## Future Enhancements

1. **AI 기반 콘텐츠 생성**
   - 템플릿 선택 후 AI가 자동으로 텍스트/이미지 생성

2. **더 많은 컴포넌트**
   - Timeline, Accordion, Tab, Modal 등

3. **템플릿 버전 관리**
   - 변경 사항 히스토리 추적

4. **협업 기능**
   - 여러 사용자가 동시에 템플릿 커스터마이징

5. **AI 기반 설계 제안**
   - "이 컬러 조합은 더 나을 것 같습니다" 같은 제안

6. **Export 옵션 확대**
   - Figma, Sketch, Adobe XD 포맷 지원

---

## File Structure

```
src/gui/
├── design/
│   ├── tokens.ts                    # Design Token 정의
│   └── templateMetadata.ts          # Template 메타데이터 & 검색
├── components/
│   ├── TemplateComponentLibrary.tsx # 재사용 컴포넌트
│   ├── EnhancedTemplateCustomizer.tsx
│   ├── TemplateRecommender.tsx      # AI 추천 엔진
│   ├── RealisticTemplatePreview.tsx # 기존 (개선됨)
│   └── ThemeLibrary.tsx             # 통합 UI
└── styles/
    ├── TemplateComponentLibrary.css
    ├── EnhancedTemplateCustomizer.css
    ├── TemplateRecommender.css
    └── RealisticTemplatePreview.css
```

---

## Design Philosophy

### 1. Token-First Design
모든 스타일이 중앙 Token에서 파생되므로 변경이 일관되고 빠름

### 2. Component Composition
큰 템플릿도 작은 컴포넌트의 조합으로 구성

### 3. Metadata-Driven
메타데이터로 템플릿의 의도를 명확히 하고 검색/추천 엔진의 기초가 됨

### 4. Real-time Customization
사용자가 변경 사항을 즉시 미리보기 가능

### 5. AI-Ready
자연어 입력을 구조화된 시스템 개념으로 변환 가능

---

## Conclusion

이 아키텍처는 사용자에게는 **AI 기반 추천 + 실시간 커스터마이징**을,
개발팀에게는 **확장성 높은 중앙화 시스템**을 제공합니다.

Prism이 단순한 템플릿 제공자에서 **지능형 디자인 시스템**으로 진화했습니다.
