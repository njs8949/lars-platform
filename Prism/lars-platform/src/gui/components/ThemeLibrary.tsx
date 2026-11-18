import React, { useState, useMemo } from 'react';
import { Search, Zap, Share2, Clock, Star, Filter, Plus, TrendingUp, Users, Globe, BarChart3, FileText, Download, Settings, Package, Brain, Grid, Edit, Eye } from 'lucide-react';
import { RealisticTemplatePreview } from './RealisticTemplatePreview';
import { FullscreenPreview } from './FullscreenPreview';
import { GlassmorphicIcon } from './GlassmorphicIcon';
import { TemplateCustomizer } from './TemplateCustomizer';
import { AIGenerator } from './AIGenerator';
import { BatchDownload } from './BatchDownload';
import { TemplateRecommender } from './TemplateRecommender';
import { EnhancedTemplateCustomizer } from './EnhancedTemplateCustomizer';
import { AllTemplates, TemplateMetadata } from '../design/templateMetadata';
import '../styles/ThemeLibrary.css';

// ==================== 테마 데이터 구조 ====================

interface ThemeData {
  id: string;
  name: string;
  category: string;
  tags: string[];
  type: 'website' | 'presentation' | 'document';
  popularity: number; // 0-100
  featured: boolean;
  isNew: boolean;
  sharedBy?: string;
  downloads?: number;
  rating?: number;
}

// ==================== 확장된 테마 데이터 ====================

const THEME_DATABASE: ThemeData[] = [
  // ===== WEBSITE TEMPLATES =====
  // Featured/Popular
  { id: 'minimal', name: 'Minimal', category: 'Minimal & Clean', type: 'website', tags: ['minimal', 'clean', 'modern'], popularity: 95, featured: true, isNew: false, downloads: 2840, rating: 4.9 },
  { id: 'modern', name: 'Modern', category: 'Tech & Startup', type: 'website', tags: ['modern', 'tech', 'startup'], popularity: 90, featured: true, isNew: false, downloads: 2650, rating: 4.8 },
  { id: 'elegant', name: 'Elegant', category: 'Luxury & Premium', type: 'website', tags: ['elegant', 'luxury', 'premium'], popularity: 85, featured: true, isNew: false, downloads: 1980, rating: 4.7 },

  // More Website Templates
  { id: 'vibrant', name: 'Vibrant', category: 'Creative & Bold', type: 'website', tags: ['vibrant', 'creative', 'bold'], popularity: 78, featured: false, isNew: true, downloads: 890, rating: 4.6 },
  { id: 'startup', name: 'Startup', category: 'Tech & Startup', type: 'website', tags: ['startup', 'tech', 'innovation'], popularity: 82, featured: false, isNew: false, downloads: 1650, rating: 4.7 },
  { id: 'corporate', name: 'Corporate', category: 'Business & Enterprise', type: 'website', tags: ['corporate', 'business', 'professional'], popularity: 88, featured: false, isNew: false, downloads: 2100, rating: 4.8 },
  { id: 'portfolio', name: 'Portfolio', category: 'Creative & Portfolio', type: 'website', tags: ['portfolio', 'creative', 'showcase'], popularity: 81, featured: false, isNew: false, downloads: 1420, rating: 4.6 },
  { id: 'ecommerce', name: 'E-Commerce', category: 'Shop & Retail', type: 'website', tags: ['ecommerce', 'shop', 'retail'], popularity: 86, featured: false, isNew: true, downloads: 1980, rating: 4.7 },

  // Additional Website Templates (12 more for better variety)
  { id: 'marketplace', name: 'Marketplace', category: 'Shop & Retail', type: 'website', tags: ['marketplace', 'shop', 'multi-vendor'], popularity: 72, featured: false, isNew: true, downloads: 450, rating: 4.5 },
  { id: 'saas-pro', name: 'SaaS Pro', category: 'Tech & Startup', type: 'website', tags: ['saas', 'tech', 'software'], popularity: 79, featured: false, isNew: true, downloads: 680, rating: 4.6 },
  { id: 'magazine-web', name: 'Magazine', category: 'Blog & Publishing', type: 'website', tags: ['magazine', 'blog', 'publishing'], popularity: 68, featured: false, isNew: false, downloads: 540, rating: 4.4 },
  { id: 'restaurant-web', name: 'Restaurant', category: 'Food & Hospitality', type: 'website', tags: ['restaurant', 'food', 'hospitality'], popularity: 75, featured: false, isNew: false, downloads: 620, rating: 4.5 },
  { id: 'agency-web', name: 'Agency', category: 'Business & Enterprise', type: 'website', tags: ['agency', 'business', 'services'], popularity: 81, featured: false, isNew: false, downloads: 980, rating: 4.6 },
  { id: 'real-estate', name: 'Real Estate', category: 'Real Estate & Property', type: 'website', tags: ['realestate', 'property', 'listings'], popularity: 73, featured: false, isNew: false, downloads: 510, rating: 4.5 },
  { id: 'medical-web', name: 'Medical', category: 'Healthcare & Medical', type: 'website', tags: ['medical', 'healthcare', 'clinic'], popularity: 70, featured: false, isNew: false, downloads: 380, rating: 4.4 },
  { id: 'education-web', name: 'Education', category: 'Education & Learning', type: 'website', tags: ['education', 'learning', 'courses'], popularity: 74, featured: false, isNew: false, downloads: 620, rating: 4.5 },
  { id: 'portfolio-pro', name: 'Portfolio Pro', category: 'Creative & Portfolio', type: 'website', tags: ['portfolio', 'creative', 'professional'], popularity: 77, featured: false, isNew: true, downloads: 450, rating: 4.5 },
  { id: 'landing-page', name: 'Landing Page', category: 'Marketing & Conversion', type: 'website', tags: ['landing', 'marketing', 'conversion'], popularity: 83, featured: false, isNew: false, downloads: 1540, rating: 4.7 },
  { id: 'community-web', name: 'Community', category: 'Social & Community', type: 'website', tags: ['community', 'social', 'forum'], popularity: 65, featured: false, isNew: true, downloads: 280, rating: 4.3 },
  { id: 'nft-gallery', name: 'NFT Gallery', category: 'Creative & Web3', type: 'website', tags: ['nft', 'gallery', 'web3'], popularity: 58, featured: false, isNew: true, downloads: 180, rating: 4.2 },

  // ===== PRESENTATION TEMPLATES =====
  { id: 'corporate', name: 'Corporate', category: 'Business & Finance', type: 'presentation', tags: ['corporate', 'business', 'professional'], popularity: 92, featured: true, isNew: false, downloads: 2120, rating: 4.9 },
  { id: 'creative', name: 'Creative', category: 'Creative & Design', type: 'presentation', tags: ['creative', 'design', 'modern'], popularity: 88, featured: true, isNew: false, downloads: 1890, rating: 4.8 },
  { id: 'academic', name: 'Academic', category: 'Education & Research', type: 'presentation', tags: ['academic', 'research', 'education'], popularity: 82, featured: true, isNew: false, downloads: 1450, rating: 4.7 },

  // More Presentation Templates
  { id: 'startup-pres', name: 'Startup', category: 'Startup & Innovation', type: 'presentation', tags: ['startup', 'innovation', 'pitch'], popularity: 85, featured: false, isNew: false, downloads: 1680, rating: 4.7 },
  { id: 'minimal-pres', name: 'Minimal', category: 'Minimal & Clean', type: 'presentation', tags: ['minimal', 'clean', 'simple'], popularity: 79, featured: false, isNew: false, downloads: 1020, rating: 4.6 },
  { id: 'luxury', name: 'Luxury', category: 'Premium & Luxury', type: 'presentation', tags: ['luxury', 'premium', 'elegant'], popularity: 76, featured: false, isNew: false, downloads: 850, rating: 4.5 },
  { id: 'tech', name: 'Tech', category: 'Tech & Innovation', type: 'presentation', tags: ['tech', 'innovation', 'software'], popularity: 80, featured: false, isNew: false, downloads: 1240, rating: 4.6 },
  { id: 'education', name: 'Education', category: 'Education & Learning', type: 'presentation', tags: ['education', 'learning', 'teaching'], popularity: 74, featured: false, isNew: false, downloads: 920, rating: 4.5 },

  // Additional Presentation Templates (mapped to similar styles)
  { id: 'marketing-pres', name: 'Marketing', category: 'Marketing & Sales', type: 'presentation', tags: ['marketing', 'sales', 'promotion'], popularity: 78, featured: false, isNew: true, downloads: 680, rating: 4.5 },
  { id: 'finance-pres', name: 'Finance', category: 'Business & Finance', type: 'presentation', tags: ['finance', 'business', 'analysis'], popularity: 81, featured: false, isNew: false, downloads: 980, rating: 4.6 },
  { id: 'medical-pres', name: 'Medical', category: 'Healthcare & Medical', type: 'presentation', tags: ['medical', 'healthcare', 'research'], popularity: 68, featured: false, isNew: false, downloads: 540, rating: 4.4 },
  { id: 'portfolio-pres', name: 'Portfolio', category: 'Creative & Portfolio', type: 'presentation', tags: ['portfolio', 'creative', 'showcase'], popularity: 75, featured: false, isNew: true, downloads: 420, rating: 4.5 },

  // ===== DOCUMENT TEMPLATES =====
  { id: 'professional', name: 'Professional', category: 'Business & Professional', type: 'document', tags: ['professional', 'business', 'formal'], popularity: 91, featured: true, isNew: false, downloads: 2450, rating: 4.9 },
  { id: 'modern-doc', name: 'Modern', category: 'Modern & Contemporary', type: 'document', tags: ['modern', 'contemporary', 'design'], popularity: 87, featured: true, isNew: false, downloads: 1920, rating: 4.8 },
  { id: 'creative-doc', name: 'Creative', category: 'Creative & Design', type: 'document', tags: ['creative', 'design', 'artistic'], popularity: 83, featured: true, isNew: false, downloads: 1580, rating: 4.7 },

  // More Document Templates
  { id: 'minimal-doc', name: 'Minimal', category: 'Minimal & Clean', type: 'document', tags: ['minimal', 'clean', 'simple'], popularity: 80, featured: false, isNew: false, downloads: 1140, rating: 4.6 },
  { id: 'academic-doc', name: 'Academic', category: 'Education & Research', type: 'document', tags: ['academic', 'research', 'thesis'], popularity: 78, featured: false, isNew: false, downloads: 980, rating: 4.5 },
  { id: 'financial', name: 'Financial', category: 'Business & Finance', type: 'document', tags: ['financial', 'business', 'report'], popularity: 82, featured: false, isNew: false, downloads: 1320, rating: 4.6 },
  { id: 'proposal', name: 'Proposal', category: 'Business & Proposals', type: 'document', tags: ['proposal', 'business', 'pitch'], popularity: 81, featured: false, isNew: false, downloads: 1210, rating: 4.6 },
  { id: 'invoice', name: 'Invoice', category: 'Business & Administrative', type: 'document', tags: ['invoice', 'billing', 'business'], popularity: 76, featured: false, isNew: false, downloads: 890, rating: 4.5 },

  // Additional Document Templates (mapped to similar styles)
  { id: 'contract', name: 'Contract', category: 'Legal & Contracts', type: 'document', tags: ['contract', 'legal', 'agreement'], popularity: 72, featured: false, isNew: false, downloads: 620, rating: 4.4 },
  { id: 'resume', name: 'Resume', category: 'HR & Recruitment', type: 'document', tags: ['resume', 'cv', 'career'], popularity: 77, featured: false, isNew: false, downloads: 1480, rating: 4.6 },
  { id: 'manual', name: 'Manual', category: 'Documentation & Guides', type: 'document', tags: ['manual', 'guide', 'documentation'], popularity: 68, featured: false, isNew: false, downloads: 510, rating: 4.4 },
  { id: 'report', name: 'Report', category: 'Business & Analysis', type: 'document', tags: ['report', 'analysis', 'business'], popularity: 79, featured: false, isNew: false, downloads: 1150, rating: 4.6 },
];

// ==================== CATEGORY 맵핑 ====================

const CATEGORY_FILTERS = {
  website: ['All', 'Minimal & Clean', 'Tech & Startup', 'Business & Enterprise', 'Luxury & Premium', 'Creative & Bold', 'Creative & Portfolio', 'Shop & Retail', 'Blog & Publishing', 'Food & Hospitality', 'Real Estate & Property', 'Healthcare & Medical', 'Education & Learning', 'Marketing & Conversion', 'Social & Community', 'Creative & Web3'],
  presentation: ['All', 'Business & Finance', 'Creative & Design', 'Education & Research', 'Startup & Innovation', 'Minimal & Clean', 'Premium & Luxury', 'Tech & Innovation', 'Marketing & Sales', 'Healthcare & Medical', 'Creative & Portfolio'],
  document: ['All', 'Business & Professional', 'Modern & Contemporary', 'Creative & Design', 'Minimal & Clean', 'Education & Research', 'Business & Finance', 'Business & Proposals', 'Business & Administrative', 'Legal & Contracts', 'HR & Recruitment', 'Documentation & Guides', 'Business & Analysis'],
};

// ==================== REACT COMPONENT ====================

interface ThemeLibraryProps {
  selectedThemeType: 'website' | 'presentation' | 'document';
  setSelectedThemeType: (type: 'website' | 'presentation' | 'document') => void;
  selectedThemes: { website: string; presentation: string; document: string };
  setSelectedThemes: (themes: any) => void;
  onFreestyleCreate?: (type: string) => void;
  onShare?: (themeId: string) => void;
  onSchedule?: (themeId: string) => void;
  language?: string;
}

export const ThemeLibrary: React.FC<ThemeLibraryProps> = ({
  selectedThemeType,
  setSelectedThemeType,
  selectedThemes,
  setSelectedThemes,
  onFreestyleCreate,
  onShare,
  onSchedule,
  language = 'ko'
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState<'popular' | 'new' | 'rating'>('popular');
  const [sharedThemes, setSharedThemes] = useState<Set<string>>(new Set());
  const [scheduledThemes, setScheduledThemes] = useState<Set<string>>(new Set());
  const [downloadingThemes, setDownloadingThemes] = useState<Set<string>>(new Set());

  // Modal states
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [showBatchDownload, setShowBatchDownload] = useState(false);
  const [selectedTemplateForModal, setSelectedTemplateForModal] = useState<string>('');

  // ===== NEW: AI Recommender & Enhanced Customizer States =====
  const [activeView, setActiveView] = useState<'recommend' | 'browse' | 'customize'>('recommend');
  const [selectedTemplateObj, setSelectedTemplateObj] = useState<TemplateMetadata | null>(null);
  const [customizerState, setCustomizerState] = useState<any>(null);
  const [showEnhancedCustomizer, setShowEnhancedCustomizer] = useState(false);

  // ===== Fullscreen Preview State =====
  const [showFullscreenPreview, setShowFullscreenPreview] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<{ id: string; type: 'website' | 'presentation' | 'document'; name: string } | null>(null);

  // 프리뷰 열기 함수
  const openFullscreenPreview = (themeId: string, themeType: 'website' | 'presentation' | 'document', themeName: string) => {
    setPreviewTemplate({ id: themeId, type: themeType, name: themeName });
    setShowFullscreenPreview(true);
  };

  // 다운로드 함수
  const downloadTemplate = (themeId: string) => {
    setDownloadingThemes(new Set([...downloadingThemes, themeId]));

    const apiUrl = `http://localhost:8001/api/template/download/${selectedThemeType}/${themeId}`;

    fetch(apiUrl)
      .then(response => {
        if (!response.ok) throw new Error('Download failed');
        return response.blob();
      })
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const ext = selectedThemeType === 'presentation' ? 'pptx' : 'docx';
        a.download = `${themeId}_${selectedThemeType}.${ext}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      })
      .catch(error => {
        console.error('Download error:', error);
        alert(language === 'ko' ? '다운로드 실패' : 'Download failed');
      })
      .finally(() => {
        setDownloadingThemes(prev => {
          const newSet = new Set(prev);
          newSet.delete(themeId);
          return newSet;
        });
      });
  };

  // ===== ORIGINAL: Basic customizer =====
  const handleCustomize = (themeId: string) => {
    setSelectedTemplateForModal(themeId);
    setShowCustomizer(true);
  };

  // ===== NEW: Enhanced customizer with Design Tokens =====
  const handleEnhancedCustomize = (template: TemplateMetadata) => {
    setSelectedTemplateObj(template);
    setSelectedTemplateForModal(template.id);
    setActiveView('customize');
    setShowEnhancedCustomizer(true);
  };

  const handleCustomizerUpdate = (state: any) => {
    setCustomizerState(state);
    // Real-time preview update
  };

  const handleCustomizerGenerate = (state: any) => {
    const apiUrl = `http://localhost:8001/api/templates/generate`;

    fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        templateId: selectedTemplateForModal,
        customizerState: state,
        templateType: selectedThemeType,
      }),
    })
      .then(response => response.json())
      .then(data => {
        // Handle generated files
        window.open(data.previewUrl, '_blank');
      })
      .catch(error => console.error('Generation error:', error));
  };

  const handleCustomizationGenerate = (customization: any) => {
    const apiUrl = `http://localhost:8001/api/template/customize`;

    fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        template_type: selectedThemeType,
        template_name: selectedTemplateForModal,
        customization
      })
    })
      .then(response => {
        if (!response.ok) throw new Error('Customization failed');
        return response.blob();
      })
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const ext = selectedThemeType === 'presentation' ? 'pptx' : 'docx';
        a.download = `custom_${selectedTemplateForModal}_${selectedThemeType}.${ext}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      })
      .catch(error => {
        console.error('Customization error:', error);
        alert(language === 'ko' ? '커스터마이징 실패' : 'Customization failed');
      });
  };

  // AI 생성 함수
  const handleAIGenerate = (params: any) => {
    const apiUrl = `http://localhost:8001/api/template/generate-with-ai`;

    fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        template_type: selectedThemeType,
        template_name: selectedTemplateForModal,
        ...params
      })
    })
      .then(response => {
        if (!response.ok) throw new Error('AI generation failed');
        return response.blob();
      })
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const ext = selectedThemeType === 'presentation' ? 'pptx' : 'docx';
        a.download = `ai_${selectedTemplateForModal}_${selectedThemeType}.${ext}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      })
      .catch(error => {
        console.error('AI generation error:', error);
        alert(language === 'ko' ? 'AI 생성 실패' : 'AI generation failed');
      });
  };

  // ===== IMPROVED: Use new template metadata system =====
  const filteredThemes = useMemo(() => {
    // Convert AllTemplates to browser view format
    let themes = AllTemplates
      .filter(t => t.category === selectedThemeType)
      .map(t => ({
        id: t.id,
        name: t.name,
        category: t.type,
        tags: [...t.useCase, ...t.industry],
        type: t.category as 'website' | 'presentation' | 'document',
        popularity: (t.popularity / 2840) * 100, // Normalize to 0-100
        featured: t.featured,
        isNew: t.isNew,
        downloads: t.downloads,
        rating: t.rating,
        metadata: t, // Store original metadata
      }));

    // 카테고리 필터
    if (selectedCategory !== 'All') {
      themes = themes.filter(t => t.type === selectedCategory);
    }

    // 검색 필터
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      themes = themes.filter(t =>
        t.name.toLowerCase().includes(query) ||
        t.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // 정렬
    const sorted = [...themes];
    if (sortBy === 'popular') {
      sorted.sort((a, b) => b.popularity - a.popularity);
    } else if (sortBy === 'new') {
      sorted.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
    } else if (sortBy === 'rating') {
      sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    return sorted;
  }, [searchQuery, selectedCategory, selectedThemeType, sortBy]);

  // Featured 테마
  const featuredThemes = filteredThemes.filter(t => t.featured).slice(0, 3);

  // 선택된 테마 ID
  const selectedThemeId = selectedThemes[selectedThemeType];

  // Preview 컴포넌트 선택
  const getPreviewComponent = (themeName: string) => {
    return <RealisticTemplatePreview type={selectedThemeType} templateName={themeName} />;
  };

  return (
    <div className="theme-library">
      {/* 헤더 */}
      <div className="library-header">
        <div className="header-top">
          <h3>{language === 'ko' ? '프리미엄 테마 라이브러리' : 'Premium Theme Library'}</h3>
          <div className="header-tabs">
            <button
              className={`header-tab ${selectedThemeType === 'website' ? 'active' : ''}`}
              onClick={() => setSelectedThemeType('website')}
            >
              <GlassmorphicIcon Icon={Globe} gradient="from-blue-400 to-cyan-500" size={18} />
              {language === 'ko' ? '웹사이트' : 'Website'}
            </button>
            <button
              className={`header-tab ${selectedThemeType === 'presentation' ? 'active' : ''}`}
              onClick={() => setSelectedThemeType('presentation')}
            >
              <GlassmorphicIcon Icon={BarChart3} gradient="from-emerald-400 to-teal-500" size={18} />
              {language === 'ko' ? '프레젠테이션' : 'Presentation'}
            </button>
            <button
              className={`header-tab ${selectedThemeType === 'document' ? 'active' : ''}`}
              onClick={() => setSelectedThemeType('document')}
            >
              <GlassmorphicIcon Icon={FileText} gradient="from-orange-400 to-red-500" size={18} />
              {language === 'ko' ? '문서' : 'Document'}
            </button>
          </div>
        </div>

        {/* ===== NEW: View Mode Tabs ===== */}
        <div className="view-mode-tabs">
          <button
            className={`view-tab ${activeView === 'recommend' ? 'active' : ''}`}
            onClick={() => setActiveView('recommend')}
          >
            <GlassmorphicIcon Icon={Brain} gradient="from-blue-400 to-purple-500" size={20} />
            {language === 'ko' ? 'AI 추천' : 'AI Recommender'}
          </button>
          <button
            className={`view-tab ${activeView === 'browse' ? 'active' : ''}`}
            onClick={() => setActiveView('browse')}
          >
            <GlassmorphicIcon Icon={Grid} gradient="from-emerald-400 to-cyan-500" size={20} />
            {language === 'ko' ? '모두 보기' : 'Browse All'}
          </button>
          {showEnhancedCustomizer && (
            <button
              className={`view-tab ${activeView === 'customize' ? 'active' : ''}`}
              onClick={() => setActiveView('customize')}
            >
              <GlassmorphicIcon Icon={Edit} gradient="from-yellow-400 to-orange-500" size={20} />
              {language === 'ko' ? '커스터마이징' : 'Customize'}
            </button>
          )}
        </div>

        {/* 검색 & 필터 (Browse 탭에서만 표시) */}
        {activeView === 'browse' && (
          <div className="library-controls">
            <div className="search-box">
              <GlassmorphicIcon Icon={Search} gradient="from-blue-400 to-purple-500" size={18} />
              <input
                type="text"
                placeholder={language === 'ko' ? '템플릿 검색...' : 'Search templates...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="filter-controls">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="category-select"
              >
                {(CATEGORY_FILTERS[selectedThemeType] || []).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="sort-select"
              >
                <option value="popular">{language === 'ko' ? '인기도' : 'Popular'}</option>
                <option value="new">{language === 'ko' ? '최신' : 'New'}</option>
                <option value="rating">{language === 'ko' ? '평점' : 'Rating'}</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* ===== NEW: AI Recommender View ===== */}
      {activeView === 'recommend' && (
        <div className="recommender-view">
          <TemplateRecommender
            onSelect={(template) => {
              setSelectedTemplateObj(template);
              handleEnhancedCustomize(template);
              setActiveView('customize');
            }}
            language={language}
          />
        </div>
      )}

      {/* ===== NEW: Enhanced Customizer View ===== */}
      {activeView === 'customize' && showEnhancedCustomizer && selectedTemplateObj && (
        <div className="customizer-view">
          <button
            className="back-button"
            onClick={() => {
              setActiveView('browse');
              setShowEnhancedCustomizer(false);
            }}
          >
            ← {language === 'ko' ? '뒤로' : 'Back'}
          </button>
          <EnhancedTemplateCustomizer
            templateName={selectedTemplateObj.name}
            onCustomize={handleCustomizerUpdate}
            onGenerate={handleCustomizerGenerate}
          />
        </div>
      )}

      {/* ===== BROWSE VIEW: Featured & Grid Sections ===== */}
      {activeView === 'browse' && (
        <>
      {/* Featured 섹션 */}
      {featuredThemes.length > 0 && (
        <div className="featured-section">
          <div className="featured-header">
            <GlassmorphicIcon Icon={TrendingUp} gradient="from-green-400 to-cyan-500" size={20} />
            <h4>{language === 'ko' ? '⭐ 추천 템플릿' : '⭐ Featured Templates'}</h4>
          </div>
          <div className="featured-grid">
            {featuredThemes.map(theme => (
              <div key={theme.id} className={`featured-card ${selectedThemeId === theme.id ? 'selected' : ''}`}>
                <div className="featured-preview">
                  {getPreviewComponent(theme.id)}
                </div>
                <div className="featured-info">
                  <div className="featured-title">
                    <h5>{theme.name}</h5>
                    <div className="featured-badges">
                      {theme.isNew && <span className="badge-new">NEW</span>}
                      <span className="badge-rating">⭐ {theme.rating?.toFixed(1)}</span>
                    </div>
                  </div>
                  <p className="featured-category">{theme.category}</p>
                  <div className="featured-stats">
                    <span>📥 {theme.downloads} downloads</span>
                    <span>👥 {Math.floor(theme.downloads! / 100)} using</span>
                  </div>
                  <div className="featured-actions">
                    <button
                      className="featured-action-btn preview-btn"
                      title={language === 'ko' ? '미리보기' : 'Preview'}
                      onClick={(e) => {
                        e.stopPropagation();
                        openFullscreenPreview(theme.id, selectedThemeType, theme.name);
                      }}
                    >
                      <GlassmorphicIcon Icon={Eye} gradient="from-purple-400 to-pink-500" size={16} />
                      {language === 'ko' ? '미리보기' : 'Preview'}
                    </button>
                    <button
                      className="featured-action-btn download-btn"
                      title={language === 'ko' ? '다운로드' : 'Download'}
                      disabled={downloadingThemes.has(theme.id)}
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadTemplate(theme.id);
                      }}
                    >
                      <GlassmorphicIcon Icon={Download} gradient="from-blue-400 to-indigo-500" size={16} />
                      {language === 'ko' ? '다운로드' : 'Download'}
                    </button>
                    <button
                      className="featured-select-btn"
                      onClick={() => setSelectedThemes({...selectedThemes, [selectedThemeType]: theme.id})}
                    >
                      {language === 'ko' ? '선택' : 'Select'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 메인 그리드 */}
      <div className="themes-main">
        <div className="themes-info">
          {language === 'ko'
            ? `${filteredThemes.length}개의 템플릿을 찾았습니다`
            : `Found ${filteredThemes.length} templates`
          }
        </div>
        <div className="theme-grid">
          {filteredThemes.map(theme => (
            <button
              key={theme.id}
              className={`theme-card-modern ${selectedThemeId === theme.id ? 'selected' : ''}`}
              onClick={() => setSelectedThemes({...selectedThemes, [selectedThemeType]: theme.id})}
            >
              <div className="card-preview">
                {getPreviewComponent(theme.id)}
              </div>

              <div className="card-overlay">
                <div className="card-actions">
                  <button
                    className="action-btn preview-btn"
                    title={language === 'ko' ? '미리보기' : 'Preview'}
                    onClick={(e) => {
                      e.stopPropagation();
                      openFullscreenPreview(theme.id, selectedThemeType, theme.name);
                    }}
                  >
                    <Eye size={18} />
                  </button>
                  <button
                    className="action-btn download-btn"
                    title={language === 'ko' ? '다운로드' : 'Download'}
                    disabled={downloadingThemes.has(theme.id)}
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadTemplate(theme.id);
                    }}
                  >
                    <GlassmorphicIcon Icon={Download} gradient="from-blue-400 to-indigo-500" size={18} />
                  </button>
                  <button
                    className="action-btn"
                    title={language === 'ko' ? '커스터마이징' : 'Customize'}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCustomize(theme.id);
                    }}
                  >
                    <GlassmorphicIcon Icon={Settings} gradient="from-gray-400 to-slate-600" size={18} />
                  </button>
                  <button
                    className="action-btn ai-btn"
                    title={language === 'ko' ? 'AI로 생성' : 'Generate with AI'}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTemplateForModal(theme.id);
                      setShowAIGenerator(true);
                    }}
                  >
                    <GlassmorphicIcon Icon={Zap} gradient="from-yellow-400 to-orange-500" size={18} />
                  </button>
                  <button
                    className="action-btn"
                    title={language === 'ko' ? '공유' : 'Share'}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSharedThemes(new Set([...sharedThemes, theme.id]));
                      onShare?.(theme.id);
                    }}
                  >
                    <GlassmorphicIcon Icon={Share2} gradient="from-pink-400 to-red-500" size={18} />
                  </button>
                  <button
                    className="action-btn"
                    title={language === 'ko' ? '스케줄' : 'Schedule'}
                    onClick={(e) => {
                      e.stopPropagation();
                      setScheduledThemes(new Set([...scheduledThemes, theme.id]));
                      onSchedule?.(theme.id);
                    }}
                  >
                    <GlassmorphicIcon Icon={Clock} gradient="from-purple-400 to-pink-500" size={18} />
                  </button>
                </div>
              </div>

              <div className="card-footer">
                <h5>{theme.name}</h5>
                <div className="card-meta">
                  <span className="rating">⭐ {theme.rating?.toFixed(1)}</span>
                  <span className="downloads">📥 {theme.downloads}</span>
                </div>
                <div className="card-tags">
                  {theme.tags.slice(0, 2).map(tag => (
                    <span key={tag} className="tag">{tag}</span>
                  ))}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
        </>
      )}

      {/* Modals */}
      {showCustomizer && (
        <TemplateCustomizer
          isOpen={showCustomizer}
          templateType={selectedThemeType}
          templateName={selectedTemplateForModal}
          onClose={() => setShowCustomizer(false)}
          onGenerate={handleCustomizationGenerate}
          language={language}
        />
      )}

      {showAIGenerator && (
        <AIGenerator
          isOpen={showAIGenerator}
          templateType={selectedThemeType}
          templateName={selectedTemplateForModal}
          onClose={() => setShowAIGenerator(false)}
          onGenerate={handleAIGenerate}
          language={language}
        />
      )}

      {showBatchDownload && (
        <BatchDownload
          templates={filteredThemes}
          onClose={() => setShowBatchDownload(false)}
          language={language}
        />
      )}

      {/* Fullscreen Preview Modal */}
      {showFullscreenPreview && previewTemplate && (
        <FullscreenPreview
          templateId={previewTemplate.id}
          templateType={previewTemplate.type}
          templateName={previewTemplate.name}
          onClose={() => {
            setShowFullscreenPreview(false);
            setPreviewTemplate(null);
          }}
        />
      )}
    </div>
  );
};
