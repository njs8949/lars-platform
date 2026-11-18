# Template System Integration Guide

## Overview

기존 ThemeLibrary와 새로운 Design System을 통합하는 방법

---

## Step 1: ThemeLibrary에 TemplateRecommender 추가

### 현재 상태
```typescript
// ThemeLibrary.tsx (현재)
export const ThemeLibrary: React.FC<ThemeLibraryProps> = ({
  setSelectedThemeType,
  onApply,
}) => {
  const [showCustomizer, setShowCustomizer] = useState(false);
  // ... 기존 코드
};
```

### 개선 코드
```typescript
import { TemplateRecommender } from './TemplateRecommender';
import { TemplateMetadata } from '../design/templateMetadata';

interface ThemeLibraryProps {
  setSelectedThemeType: (type: 'website' | 'presentation' | 'document' | null) => void;
  onApply?: (template: TemplateMetadata) => void;
}

export const ThemeLibrary: React.FC<ThemeLibraryProps> = ({
  setSelectedThemeType,
  onApply,
}) => {
  const [activeView, setActiveView] = useState<'browse' | 'recommend'>('recommend');
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateMetadata | null>(null);

  return (
    <div className="theme-library">
      {/* Tab: Browse vs Recommend */}
      <div className="library-tabs">
        <button
          className={activeView === 'recommend' ? 'active' : ''}
          onClick={() => setActiveView('recommend')}
        >
          🤖 AI Recommender
        </button>
        <button
          className={activeView === 'browse' ? 'active' : ''}
          onClick={() => setActiveView('browse')}
        >
          📂 Browse All
        </button>
      </div>

      {/* AI Recommender View */}
      {activeView === 'recommend' && (
        <TemplateRecommender
          onSelect={(template) => {
            setSelectedTemplate(template);
            setActiveView('browse');
            // 해당 템플릿으로 스크롤
          }}
        />
      )}

      {/* Browse View - 기존 코드 유지 */}
      {activeView === 'browse' && (
        <div className="browse-section">
          {/* 기존 템플릿 그리드 */}
          <div className="template-grid">
            {/* ... 기존 코드 ... */}
          </div>
        </div>
      )}
    </div>
  );
};
```

---

## Step 2: Customizer 업그레이드

### 기존 Customizer 호출 개선
```typescript
// 기존
{showCustomizer && (
  <Customizer
    template={selectedTemplate}
    onClose={() => setShowCustomizer(false)}
  />
)}

// 개선
{showCustomizer && (
  <EnhancedTemplateCustomizer
    templateName={selectedTemplate.name}
    onCustomize={(state) => {
      // 실시간 미리보기 업데이트
      updatePreview(state);
    }}
    onGenerate={(state) => {
      // 백엔드로 전송
      generateTemplate(selectedTemplate.id, state);
    }}
  />
)}
```

---

## Step 3: RealisticTemplatePreview 개선

### 현재
```typescript
// 고정된 컴포넌트들
const MinimalWebsite = () => { ... }
const ModernWebsite = () => { ... }
```

### 개선: Design Token 기반으로
```typescript
import { getPalette, getTypography } from '../design/tokens';
import {
  NavBar, HeroSection, FeatureGrid, Card,
  CTASection, Footer
} from './TemplateComponentLibrary';

const MinimalWebsite = ({ palette = 'minimal' }: any) => {
  const colors = getPalette(palette);
  
  return (
    <div style={{ background: colors.background }}>
      <NavBar
        palette={palette}
        logo="M"
        links={['Home', 'About', 'Work', 'Contact']}
      />
      <HeroSection
        palette={palette}
        title="Minimal Portfolio"
        subtitle="Clean design for creatives"
      />
      <FeatureGrid
        palette={palette}
        features={[
          { icon: '🎨', title: 'Design', description: 'Beautiful layouts' },
          { icon: '⚡', title: 'Fast', description: 'Optimized performance' },
          { icon: '📱', title: 'Responsive', description: 'Mobile friendly' },
        ]}
      />
      <CTASection palette={palette} />
      <Footer palette={palette} companyName="Minimal Studio" />
    </div>
  );
};
```

---

## Step 4: 백엔드 API 통합

### Python Flask 엔드포인트 예시
```python
# app.py (Flask)

from flask import request, jsonify
from src.core.template_generator import TemplateGenerator
from src.core.design_system import DesignTokens

@app.route('/api/templates/generate', methods=['POST'])
def generate_template():
    """
    Generate template with customization
    """
    data = request.json
    
    template_id = data.get('templateId')
    customizer_state = data.get('customizerState', {})
    
    # 커스터마이저 상태에서 Design Token 추출
    palette = customizer_state.get('selectedPalette', 'modern')
    typography = customizer_state.get('selectedTypography', 'sansSerif')
    custom_colors = customizer_state.get('customColors', {})
    
    # 템플릿 생성
    generator = TemplateGenerator(template_id)
    
    # React 컴포넌트를 HTML로 변환
    html = generator.render_website(
        palette=palette,
        custom_colors=custom_colors,
        typography=typography
    )
    
    # PPTX 생성
    pptx = generator.render_presentation(
        palette=palette,
        custom_colors=custom_colors
    )
    
    # DOCX 생성
    docx = generator.render_document(
        palette=palette,
        custom_colors=custom_colors
    )
    
    return jsonify({
        'success': True,
        'websiteHtml': html,
        'pptxUrl': f'/templates/{template_id}/presentation.pptx',
        'docxUrl': f'/templates/{template_id}/document.docx',
        'previewUrl': f'/templates/{template_id}/preview.png'
    })

@app.route('/api/templates/search', methods=['POST'])
def search_templates():
    """
    AI-based template search
    """
    data = request.json
    query = data.get('query', '')
    category = data.get('category')
    
    # searchTemplates 함수 사용
    results = searchTemplates(query, {
        'category': category,
        'difficulty': 'easy'
    })
    
    return jsonify({
        'results': [
            {
                'id': t.id,
                'name': t.name,
                'description': t.description,
                'palette': t.palette,
                'rating': t.rating,
                'downloads': t.downloads
            }
            for t in results
        ]
    })
```

---

## Step 5: 데이터 흐름 통합

### 전체 흐름
```
User Interface (React)
│
├─ TemplateRecommender
│  │ Input: "AI startup landing"
│  └─ Output: Top 5 templates
│
├─ ThemeLibrary (Browse View)
│  │ Grid of 45 templates
│  └─ Click → Open Customizer
│
├─ EnhancedTemplateCustomizer
│  │ Design Tokens 편집
│  └─ Customizer State 생성
│
└─ RealisticTemplatePreview
   │ Palette prop 받아서 렌더링
   └─ 실시간 미리보기
   
   ↓ "Generate" 클릭
   
Backend (Flask)
│
├─ /api/templates/generate
│  │ Template ID + Customizer State
│  └─ HTML, PPTX, DOCX 생성
│
├─ python-pptx로 PPTX 생성
├─ python-docx로 DOCX 생성
└─ React → HTML로 변환

   ↓
   
Download / Share
```

---

## Step 6: 상태 관리 개선

### Redux 구조 (선택사항)
```typescript
// store/templateSlice.ts
import { createSlice } from '@reduxjs/toolkit';

interface TemplateState {
  selectedTemplate: TemplateMetadata | null;
  customizerState: CustomizerState;
  generatedFiles: {
    html?: string;
    pptx?: string;
    docx?: string;
  };
  loading: boolean;
  error: string | null;
}

const templateSlice = createSlice({
  name: 'template',
  initialState: {
    selectedTemplate: null,
    customizerState: {},
    generatedFiles: {},
    loading: false,
    error: null,
  },
  reducers: {
    selectTemplate: (state, action) => {
      state.selectedTemplate = action.payload;
    },
    updateCustomizerState: (state, action) => {
      state.customizerState = {
        ...state.customizerState,
        ...action.payload,
      };
    },
    setGeneratedFiles: (state, action) => {
      state.generatedFiles = action.payload;
    },
  },
});

export default templateSlice.reducer;
```

### 컴포넌트에서 사용
```typescript
const dispatch = useDispatch();
const { selectedTemplate, customizerState } = useSelector(
  (state: any) => state.template
);

const handleCustomize = (state: CustomizerState) => {
  dispatch(updateCustomizerState(state));
  // 미리보기 업데이트
};
```

---

## Step 7: 테스트

### Component 테스트
```typescript
// TemplateComponentLibrary.test.tsx
import { render } from '@testing-library/react';
import { NavBar } from './TemplateComponentLibrary';

test('NavBar renders with correct palette', () => {
  const { container } = render(
    <NavBar palette="startup" logo="TEST" />
  );
  
  // 색상 확인
  const nav = container.querySelector('.template-navbar');
  expect(nav).toHaveStyle('color: #FFFFFF'); // startup palette의 text color
});
```

### Search 테스트
```typescript
// templateMetadata.test.ts
import { searchTemplates } from './templateMetadata';

test('searchTemplates finds startup templates', () => {
  const results = searchTemplates('AI startup', {
    category: 'website',
    palette: 'startup',
  });
  
  expect(results.length).toBeGreaterThan(0);
  expect(results[0].palette).toBe('startup');
});
```

---

## Step 8: 마이그레이션 체크리스트

- [ ] `tokens.ts` 생성 및 import 확인
- [ ] `templateMetadata.ts` 생성 및 45개 템플릿 등록 확인
- [ ] `TemplateComponentLibrary.tsx` 생성 및 CSS 적용 확인
- [ ] `EnhancedTemplateCustomizer.tsx` 생성 및 Design Token 업데이트 확인
- [ ] `TemplateRecommender.tsx` 생성 및 검색 엔진 테스트
- [ ] RealisticTemplatePreview 컴포넌트에 palette prop 추가
- [ ] ThemeLibrary에 TemplateRecommender 통합
- [ ] 백엔드 API 엔드포인트 구현
- [ ] 전체 워크플로우 테스트
- [ ] 데스크톱 앱에서 재시작 후 동작 확인

---

## Performance Considerations

### 1. Component Library 최적화
```typescript
// Memoization으로 불필요한 리렌더링 방지
export const NavBar = React.memo(({ palette, ...props }: ComponentProps) => {
  // ...
});
```

### 2. 검색 성능
```typescript
// 검색 결과 캐싱
const resultCache = new Map();

const searchTemplates = (query: string, filters?: any) => {
  const key = JSON.stringify({ query, filters });
  
  if (resultCache.has(key)) {
    return resultCache.get(key);
  }
  
  const results = performSearch(query, filters);
  resultCache.set(key, results);
  return results;
};
```

### 3. 대용량 템플릿 렌더링
```typescript
// Virtual scrolling으로 성능 개선
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={templates.length}
  itemSize={200}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>
      <TemplateCard template={templates[index]} />
    </div>
  )}
</FixedSizeList>
```

---

## Documentation for Users

### 사용자를 위한 가이드

#### AI Recommender 사용
1. "AI Recommender" 탭 클릭
2. 원하는 템플릿 설명 입력: "AI startup dark landing page"
3. AI가 상위 5개 추천 템플릿 표시
4. "Use This Template" 클릭

#### 템플릿 커스터마이징
1. 템플릿 선택
2. "Customize" 클릭
3. Design 탭에서 팔레트 선택
4. Colors 탭에서 개별 색상 조정
5. Preview 탭에서 실시간 확인
6. "Generate with AI" 클릭

#### 다중 포맷 생성
- Website: HTML + CSS
- Presentation: PPTX
- Document: DOCX

---

## Troubleshooting

### 문제: 색상이 적용되지 않음
**해결:**
```typescript
// getPalette 함수가 undefined palette 반환하는지 확인
console.log(DesignTokens.palettes[paletteName]); // 존재 확인
```

### 문제: 검색 결과가 없음
**해결:**
```typescript
// AllTemplates에 템플릿이 등록되었는지 확인
console.log(AllTemplates.length); // 45 이상인지 확인
```

### 문제: Customizer 로딩이 느림
**해결:**
- React.memo로 컴포넌트 메모이제이션
- 불필요한 리렌더링 제거
- 이미지 lazy loading

---

## Next Steps

1. **모든 파일 생성 확인**
   - 5개 TS/TSX 파일 + 4개 CSS 파일 + 2개 MD 파일

2. **npm/yarn 설치**
   ```bash
   # 새로운 의존성은 필요 없음 (기존 스택 사용)
   ```

3. **데스크톱 앱 재시작**
   ```bash
   npm start  # 또는 yarn start
   ```

4. **브라우저에서 테스트**
   - Design Theme menu → AI Recommender 탭 확인
   - 자연어 쿼리로 템플릿 검색
   - Customize 버튼으로 Design Token 변경
   - 실시간 미리보기 확인

5. **백엔드 API 구현**
   - `/api/templates/generate` 엔드포인트
   - `/api/templates/search` 엔드포인트

6. **품질 보증**
   - 모든 컴포넌트 테스트
   - 크로스 브라우저 호환성 확인
   - 성능 최적화
