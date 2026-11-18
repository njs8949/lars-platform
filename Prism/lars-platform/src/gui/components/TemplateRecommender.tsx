import React, { useState } from 'react';
import { Globe, BarChart3, FileText, Briefcase, Palette, Lightbulb, Crown, Rocket } from 'lucide-react';
import { GlassmorphicIcon } from './GlassmorphicIcon';
import { AllTemplates, searchTemplates, TemplateMetadata } from '../design/templateMetadata';
import '../styles/TemplateRecommender.css';

interface RecommendationRequest {
  query: string;
  category?: 'website' | 'presentation' | 'document';
  tone?: 'professional' | 'creative' | 'minimal' | 'luxury' | 'tech';
  industry?: string;
}

interface RecommenderProps {
  onSelect?: (template: TemplateMetadata) => void;
  language?: 'ko' | 'en' | 'ja' | 'zh';
}

export const TemplateRecommender: React.FC<RecommenderProps> = ({ onSelect, language = 'ko' }) => {
  const [query, setQuery] = useState('');
  const [recommendations, setRecommendations] = useState<TemplateMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'website' | 'presentation' | 'document' | 'all'>('all');
  const [selectedTone, setSelectedTone] = useState<string>('all');

  // ===== AI-LIKE RECOMMENDATION LOGIC =====
  const generateRecommendations = () => {
    if (!query.trim()) return;

    setLoading(true);

    // Simulate AI processing delay
    setTimeout(() => {
      // Map natural language queries to system concepts
      const queryLower = query.toLowerCase();

      // Tone detection
      let tone = selectedTone;
      if (tone === 'all') {
        if (queryLower.includes('luxury') || queryLower.includes('premium') || queryLower.includes('high-end')) {
          tone = 'premium';
        } else if (queryLower.includes('creative') || queryLower.includes('artistic') || queryLower.includes('vibrant')) {
          tone = 'creative';
        } else if (queryLower.includes('minimal') || queryLower.includes('clean') || queryLower.includes('simple')) {
          tone = 'minimal';
        } else if (queryLower.includes('tech') || queryLower.includes('startup') || queryLower.includes('saas') || queryLower.includes('ai')) {
          tone = 'tech';
        } else {
          tone = 'professional';
        }
      }

      // Category detection
      let category: 'website' | 'presentation' | 'document' | undefined = undefined;
      if (selectedCategory !== 'all') {
        category = selectedCategory as 'website' | 'presentation' | 'document';
      } else {
        if (queryLower.includes('website') || queryLower.includes('landing') || queryLower.includes('portfolio')) {
          category = 'website';
        } else if (queryLower.includes('presentation') || queryLower.includes('pitch') || queryLower.includes('deck')) {
          category = 'presentation';
        } else if (queryLower.includes('report') || queryLower.includes('proposal') || queryLower.includes('document')) {
          category = 'document';
        }
      }

      // Industry detection
      let industry = '';
      const industries = ['tech', 'finance', 'healthcare', 'creative', 'retail', 'consulting', 'education'];
      for (const ind of industries) {
        if (queryLower.includes(ind)) {
          industry = ind;
          break;
        }
      }

      // Get palette mapping from tone
      const paletteMap: Record<string, string> = {
        professional: 'modern',
        creative: 'creative',
        minimal: 'minimal',
        luxury: 'premium',
        tech: 'tech',
      };

      const palette = paletteMap[tone] || 'modern';

      // Search templates
      const results = searchTemplates(query, {
        category,
        palette,
        difficulty: 'easy',
      });

      // Re-rank by relevance to query
      const rankedResults = results
        .map((template) => {
          let score = 0;

          // Perfect matches
          if (template.palette === palette) score += 10;
          if (category && template.category === category) score += 8;
          if (industry && template.industry.includes(industry)) score += 6;
          if (template.featured) score += 4;

          // Keyword matching
          const keywords = [
            ...template.useCase,
            ...template.industry,
            template.name.toLowerCase(),
            template.description.toLowerCase(),
          ];
          const queryWords = queryLower.split(/\s+/);
          const matchCount = queryWords.filter((word) => keywords.some((kw) => kw.includes(word))).length;
          score += matchCount * 2;

          // Popularity boost
          score += template.popularity / 1000;

          return { template, score };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map((item) => item.template);

      setRecommendations(rankedResults);
      setLoading(false);
    }, 1200); // Simulate AI thinking time
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      generateRecommendations();
    }
  };

  return (
    <div className="template-recommender">
      {/* Header */}
      <div className="recommender-header">
        <h2>{language === 'ko' ? 'AI 템플릿 추천' : 'AI Template Recommender'}</h2>
        <p>{language === 'ko' ? '필요한 템플릿을 설명해주세요. AI가 완벽한 템플릿을 추천해드립니다' : 'Describe what you need, and AI will suggest the perfect template'}</p>
      </div>

      {/* Input Section */}
      <div className="recommender-input-section">
        <div className="search-box">
          <input
            type="text"
            placeholder={language === 'ko' ? "예: 'AI 스타트업 랜딩 페이지' 또는 '미니멀 포트폴리오'" : "e.g., 'AI startup landing page with dark theme' or 'minimalist portfolio for designers'"}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            className="recommender-input"
          />
          <button
            onClick={generateRecommendations}
            disabled={loading || !query.trim()}
            className={`recommender-button ${loading ? 'loading' : ''}`}
          >
            {loading ? (language === 'ko' ? '🔄 생각 중...' : '🔄 Thinking...') : (language === 'ko' ? '✨ 추천' : '✨ Recommend')}
          </button>
        </div>

        {/* Filters */}
        <div className="recommender-filters">
          <div className="filter-group">
            <label>{language === 'ko' ? '종류' : 'Type'}</label>
            <div className="filter-buttons">
              {[
                { value: 'all', label: language === 'ko' ? '전체' : 'All', icon: null, gradient: '' },
                { value: 'website', label: language === 'ko' ? '웹사이트' : 'Website', icon: Globe, gradient: 'from-blue-400 to-cyan-500' },
                { value: 'presentation', label: language === 'ko' ? '발표자료' : 'Presentation', icon: BarChart3, gradient: 'from-emerald-400 to-teal-500' },
                { value: 'document', label: language === 'ko' ? '문서' : 'Document', icon: FileText, gradient: 'from-orange-400 to-red-500' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  className={`filter-button ${selectedCategory === opt.value ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(opt.value as any)}
                >
                  {opt.icon ? (
                    <GlassmorphicIcon Icon={opt.icon} gradient={opt.gradient} size={18} />
                  ) : null}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <label>{language === 'ko' ? '스타일' : 'Style'}</label>
            <div className="filter-buttons">
              {[
                { value: 'all', label: language === 'ko' ? '전체' : 'All', icon: null, gradient: '' },
                { value: 'professional', label: language === 'ko' ? '전문적' : 'Professional', icon: Briefcase, gradient: 'from-blue-400 to-indigo-500' },
                { value: 'creative', label: language === 'ko' ? '창의적' : 'Creative', icon: Palette, gradient: 'from-pink-400 to-red-500' },
                { value: 'minimal', label: language === 'ko' ? '미니멀' : 'Minimal', icon: Lightbulb, gradient: 'from-yellow-400 to-orange-500' },
                { value: 'luxury', label: language === 'ko' ? '럭셔리' : 'Luxury', icon: Crown, gradient: 'from-purple-400 to-pink-500' },
                { value: 'tech', label: language === 'ko' ? '기술적' : 'Tech', icon: Rocket, gradient: 'from-cyan-400 to-blue-500' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  className={`filter-button ${selectedTone === opt.value ? 'active' : ''}`}
                  onClick={() => setSelectedTone(opt.value)}
                >
                  {opt.icon ? (
                    <GlassmorphicIcon Icon={opt.icon} gradient={opt.gradient} size={18} />
                  ) : null}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div className="recommender-results">
        {recommendations.length > 0 && (
          <>
            <div className="results-header">
              <h3>✅ {language === 'ko' ? '추천 템플릿' : 'Recommended Templates'}</h3>
              <p>{language === 'ko' ? `당신의 필요에 맞는 완벽한 템플릿 ${recommendations.length}개를 찾았습니다` : `Found ${recommendations.length} perfect match(es) for your needs`}</p>
            </div>

            <div className="results-grid">
              {recommendations.map((template, index) => (
                <div key={template.id} className="recommendation-card">
                  <div className="card-badge">#{index + 1}</div>

                  <div className="card-header">
                    <h4>{template.name}</h4>
                    <div className="card-meta">
                      <span className="meta-category">{template.category}</span>
                      <span className="meta-difficulty">{template.difficulty}</span>
                    </div>
                  </div>

                  <p className="card-description">{template.description}</p>

                  <div className="card-features">
                    <div className="feature-list">
                      {template.useCase.slice(0, 2).map((use, i) => (
                        <span key={i} className="feature-tag">
                          {use}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="card-stats">
                    <div className="stat">
                      <span className="stat-label">Rating</span>
                      <span className="stat-value">⭐ {template.rating}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Downloads</span>
                      <span className="stat-value">{(template.downloads / 1000).toFixed(1)}K</span>
                    </div>
                  </div>

                  <div className="card-palette">
                    <span className="palette-label">Palette</span>
                    <span className="palette-value">{template.palette}</span>
                  </div>

                  <div className="card-components">
                    <span className="components-label">Components</span>
                    <div className="components-list">
                      {template.components.slice(0, 3).map((comp, i) => (
                        <span key={i} className="component">
                          {comp}
                        </span>
                      ))}
                      {template.components.length > 3 && (
                        <span className="component">+{template.components.length - 3}</span>
                      )}
                    </div>
                  </div>

                  <button
                    className="btn-select"
                    onClick={() => {
                      onSelect?.(template);
                    }}
                  >
                    {language === 'ko' ? '이 템플릿 사용 →' : 'Use This Template →'}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {!loading && query && recommendations.length === 0 && (
          <div className="empty-state">
            <p>😕 {language === 'ko' ? '템플릿을 찾을 수 없습니다' : 'No templates found'}</p>
            <span>{language === 'ko' ? '필터를 조정하거나 다른 키워드를 시도해보세요' : 'Try adjusting your filters or use different keywords'}</span>
          </div>
        )}

        {!loading && !query && (
          <div className="empty-state">
            <p>{language === 'ko' ? '템플릿 필요사항을 설명해주세요' : 'Start by describing your template needs'}</p>
            <span>{language === 'ko' ? '예: "기술 스타트업 SaaS 랜딩 페이지" 또는 "전문적인 비즈니스 제안서"' : 'e.g., "Tech startup SaaS landing page" or "Professional business proposal"'}</span>
          </div>
        )}
      </div>

      {/* Suggestions */}
      <div className="recommender-suggestions">
        <h3>💡 {language === 'ko' ? '다음 예시를 시도해보세요' : 'Try These Examples'}</h3>
        <div className="suggestion-grid">
          {(language === 'ko' ? [
            'AI 스타트업 다크 SaaS 랜딩 페이지',
            '창의 에이전시 포트폴리오 웹사이트',
            '투자자용 피치 덱',
            '전문 비즈니스 리포트',
            'E-커머스 스토어 홈페이지',
            '기업 교육 프레젠테이션',
          ] : [
            'AI startup dark SaaS landing page',
            'Creative agency portfolio website',
            'Pitch deck for investors',
            'Professional business report',
            'E-commerce store homepage',
            'Corporate training presentation',
          ]).map((suggestion, i) => (
            <button
              key={i}
              className="suggestion-button"
              onClick={() => {
                setQuery(suggestion);
                setTimeout(() => {
                  const input = document.querySelector('.recommender-input') as HTMLInputElement;
                  input?.focus();
                }, 100);
              }}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
