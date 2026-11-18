// ==================== TEMPLATE METADATA ====================
// Structured template definitions with design intent

export interface TemplateMetadata {
  id: string;
  name: string;
  category: 'website' | 'presentation' | 'document';
  type: string;
  description: string;
  palette: string;
  typography: string;
  layouts: string[];
  components: string[];
  density: 'compact' | 'comfortable' | 'spacious';
  imageStyle: string;
  useCase: string[];
  industry: string[];
  features: string[];
  popularity: number;
  featured: boolean;
  isNew: boolean;
  downloads: number;
  rating: number;
  difficulty: 'easy' | 'medium' | 'advanced';
  customizable: boolean;
  aiCompatible: boolean;
}

// ===== WEBSITE TEMPLATES =====
export const WebsiteTemplates: TemplateMetadata[] = [
  {
    id: 'minimal-portfolio',
    name: 'Minimal Portfolio',
    category: 'website',
    type: 'website',
    description: 'Clean, minimalist portfolio for creatives',
    palette: 'minimal',
    typography: 'sansSerif',
    layouts: ['hero', 'portfolio-grid', 'about-minimal', 'contact'],
    components: ['nav', 'hero', 'portfolio-card', 'footer'],
    density: 'spacious',
    imageStyle: 'minimal-shapes',
    useCase: ['portfolio', 'freelancer', 'designer'],
    industry: ['creative', 'art', 'design'],
    features: ['responsive', 'dark-mode-ready', 'fast-loading'],
    popularity: 2840,
    featured: true,
    isNew: false,
    downloads: 2840,
    rating: 4.8,
    difficulty: 'easy',
    customizable: true,
    aiCompatible: true,
  },
  {
    id: 'modern-business',
    name: 'Modern Business',
    category: 'website',
    type: 'website',
    description: 'Contemporary SaaS landing page',
    palette: 'modern',
    typography: 'sansSerif',
    layouts: ['hero-gradient', 'features-grid', 'pricing', 'testimonials', 'footer'],
    components: ['nav', 'hero', 'feature-card', 'pricing-table', 'testimonial', 'cta-button'],
    density: 'comfortable',
    imageStyle: 'abstract-gradients',
    useCase: ['saas', 'startup', 'b2b'],
    industry: ['tech', 'software', 'consulting'],
    features: ['high-conversion', 'analytics-ready', 'form-integration'],
    popularity: 2650,
    featured: true,
    isNew: false,
    downloads: 2650,
    rating: 4.7,
    difficulty: 'easy',
    customizable: true,
    aiCompatible: true,
  },
  {
    id: 'corporate-enterprise',
    name: 'Corporate Enterprise',
    category: 'website',
    type: 'website',
    description: 'Professional enterprise website',
    palette: 'corporate',
    typography: 'sansSerif',
    layouts: ['header-nav', 'hero-image', 'solutions-grid', 'stats', 'cta', 'footer'],
    components: ['nav', 'hero', 'solution-card', 'stat-block', 'team-member', 'footer'],
    density: 'comfortable',
    imageStyle: 'professional-photos',
    useCase: ['corporate', 'b2b', 'consulting'],
    industry: ['finance', 'consulting', 'enterprise'],
    features: ['trust-building', 'lead-capture', 'multi-language'],
    popularity: 1980,
    featured: true,
    isNew: false,
    downloads: 1980,
    rating: 4.6,
    difficulty: 'medium',
    customizable: true,
    aiCompatible: true,
  },
  {
    id: 'creative-studio',
    name: 'Creative Studio',
    category: 'website',
    type: 'website',
    description: 'Vibrant, artistic studio showcase',
    palette: 'creative',
    typography: 'modern',
    layouts: ['hero-bold', 'showcase-grid', 'process', 'testimonials', 'footer'],
    components: ['nav', 'hero', 'showcase-item', 'process-step', 'testimonial', 'footer'],
    density: 'comfortable',
    imageStyle: 'vibrant-colors',
    useCase: ['creative-agency', 'art', 'design-studio'],
    industry: ['creative', 'art', 'entertainment'],
    features: ['image-heavy', 'animations', 'portfolio-showcase'],
    popularity: 1850,
    featured: true,
    isNew: false,
    downloads: 1850,
    rating: 4.9,
    difficulty: 'medium',
    customizable: true,
    aiCompatible: true,
  },
  {
    id: 'startup-saas',
    name: 'Startup SaaS',
    category: 'website',
    type: 'website',
    description: 'Dark SaaS startup landing page',
    palette: 'startup',
    typography: 'sansSerif',
    layouts: ['hero-dark', 'features-list', 'architecture', 'pricing', 'faq', 'footer'],
    components: ['nav', 'hero', 'feature-item', 'architecture-diagram', 'pricing-card', 'footer'],
    density: 'comfortable',
    imageStyle: 'tech-abstract',
    useCase: ['saas', 'api', 'developer-tools'],
    industry: ['tech', 'software', 'ai'],
    features: ['developer-friendly', 'api-documentation', 'dark-mode'],
    popularity: 2100,
    featured: true,
    isNew: true,
    downloads: 2100,
    rating: 4.8,
    difficulty: 'easy',
    customizable: true,
    aiCompatible: true,
  },
  {
    id: 'ecommerce-modern',
    name: 'E-Commerce Modern',
    category: 'website',
    type: 'website',
    description: 'High-conversion online store',
    palette: 'ecommerce',
    typography: 'sansSerif',
    layouts: ['hero-product', 'product-grid', 'featured', 'testimonials', 'newsletter', 'footer'],
    components: ['nav', 'hero', 'product-card', 'shopping-cart', 'testimonial', 'footer'],
    density: 'comfortable',
    imageStyle: 'product-showcase',
    useCase: ['ecommerce', 'retail', 'marketplace'],
    industry: ['retail', 'fashion', 'ecommerce'],
    features: ['shopping-cart', 'payment-integration', 'inventory-tracking'],
    popularity: 2200,
    featured: true,
    isNew: false,
    downloads: 2200,
    rating: 4.7,
    difficulty: 'medium',
    customizable: true,
    aiCompatible: true,
  },
  {
    id: 'premium-luxury',
    name: 'Premium Luxury',
    category: 'website',
    type: 'website',
    description: 'High-end luxury brand website',
    palette: 'premium',
    typography: 'serif',
    layouts: ['hero-large', 'collection-showcase', 'about-brand', 'testimonials', 'footer'],
    components: ['nav', 'hero', 'product-showcase', 'brand-story', 'testimonial', 'footer'],
    density: 'spacious',
    imageStyle: 'luxury-photography',
    useCase: ['luxury', 'high-end', 'brand'],
    industry: ['luxury', 'fashion', 'jewelry'],
    features: ['premium-feel', 'image-gallery', 'newsletter'],
    popularity: 1600,
    featured: false,
    isNew: false,
    downloads: 1600,
    rating: 4.9,
    difficulty: 'medium',
    customizable: true,
    aiCompatible: true,
  },
  {
    id: 'tech-futuristic',
    name: 'Tech Futuristic',
    category: 'website',
    type: 'website',
    description: 'Advanced, cutting-edge tech design',
    palette: 'tech',
    typography: 'modern',
    layouts: ['hero-neon', 'features-grid', 'roadmap', 'team', 'footer'],
    components: ['nav', 'hero', 'feature-card', 'roadmap-item', 'team-member', 'footer'],
    density: 'compact',
    imageStyle: 'neon-abstract',
    useCase: ['tech', 'ai', 'startup'],
    industry: ['tech', 'ai', 'innovation'],
    features: ['animations', 'dark-mode', 'advanced-graphics'],
    popularity: 1450,
    featured: false,
    isNew: true,
    downloads: 1450,
    rating: 4.6,
    difficulty: 'advanced',
    customizable: true,
    aiCompatible: true,
  },
];

// ===== PRESENTATION TEMPLATES =====
export const PresentationTemplates: TemplateMetadata[] = [
  {
    id: 'pitch-deck-minimal',
    name: 'Pitch Deck Minimal',
    category: 'presentation',
    type: 'presentation',
    description: 'Clean pitch deck for startups',
    palette: 'minimal',
    typography: 'sansSerif',
    layouts: [
      'title-slide',
      'problem-solution',
      'market',
      'product',
      'business-model',
      'team',
      'financials',
      'closing',
    ],
    components: ['title', 'heading', 'bullet-list', 'image-section', 'chart', 'stat-block'],
    density: 'spacious',
    imageStyle: 'minimal-icons',
    useCase: ['pitch', 'fundraising', 'startup'],
    industry: ['tech', 'startup', 'venture'],
    features: ['speaker-notes', 'print-friendly', 'animations'],
    popularity: 2500,
    featured: true,
    isNew: false,
    downloads: 2500,
    rating: 4.8,
    difficulty: 'easy',
    customizable: true,
    aiCompatible: true,
  },
  {
    id: 'business-modern',
    name: 'Business Modern',
    category: 'presentation',
    type: 'presentation',
    description: 'Modern business presentation',
    palette: 'modern',
    typography: 'sansSerif',
    layouts: [
      'title-slide',
      'overview',
      'key-points',
      'data-visualization',
      'comparison',
      'action-items',
      'closing',
    ],
    components: ['title', 'content', 'chart', 'table', 'image', 'cta'],
    density: 'comfortable',
    imageStyle: 'corporate-photos',
    useCase: ['business', 'corporate', 'quarterly-review'],
    industry: ['corporate', 'business', 'finance'],
    features: ['data-focused', 'speaker-notes', 'flexible-layouts'],
    popularity: 2300,
    featured: true,
    isNew: false,
    downloads: 2300,
    rating: 4.7,
    difficulty: 'easy',
    customizable: true,
    aiCompatible: true,
  },
  {
    id: 'training-corporate',
    name: 'Training Corporate',
    category: 'presentation',
    type: 'presentation',
    description: 'Corporate training presentation',
    palette: 'corporate',
    typography: 'sansSerif',
    layouts: [
      'title-slide',
      'learning-objectives',
      'content-section',
      'knowledge-check',
      'activity',
      'summary',
      'closing',
    ],
    components: ['title', 'heading', 'content', 'quiz', 'activity-box', 'summary'],
    density: 'comfortable',
    imageStyle: 'instructional-graphics',
    useCase: ['training', 'education', 'corporate'],
    industry: ['corporate', 'education', 'hr'],
    features: ['interactive-elements', 'quiz-slides', 'handout-view'],
    popularity: 1700,
    featured: false,
    isNew: false,
    downloads: 1700,
    rating: 4.5,
    difficulty: 'medium',
    customizable: true,
    aiCompatible: true,
  },
];

// ===== DOCUMENT TEMPLATES =====
export const DocumentTemplates: TemplateMetadata[] = [
  {
    id: 'report-professional',
    name: 'Professional Report',
    category: 'document',
    type: 'document',
    description: 'Executive business report',
    palette: 'minimal',
    typography: 'sansSerif',
    layouts: [
      'cover-page',
      'table-of-contents',
      'executive-summary',
      'body-sections',
      'data-tables',
      'conclusion',
    ],
    components: ['heading', 'paragraph', 'table', 'image', 'chart', 'page-number'],
    density: 'comfortable',
    imageStyle: 'minimal-graphics',
    useCase: ['report', 'analysis', 'business'],
    industry: ['corporate', 'consulting', 'finance'],
    features: ['print-ready', 'multi-page', 'footnotes'],
    popularity: 2100,
    featured: true,
    isNew: false,
    downloads: 2100,
    rating: 4.8,
    difficulty: 'easy',
    customizable: true,
    aiCompatible: true,
  },
  {
    id: 'proposal-business',
    name: 'Business Proposal',
    category: 'document',
    type: 'document',
    description: 'Professional business proposal',
    palette: 'modern',
    typography: 'sansSerif',
    layouts: [
      'cover-page',
      'executive-summary',
      'challenge',
      'solution',
      'timeline',
      'investment',
      'closing',
    ],
    components: ['title', 'section-heading', 'body-text', 'timeline', 'pricing-table', 'footer'],
    density: 'comfortable',
    imageStyle: 'professional-images',
    useCase: ['proposal', 'sales', 'b2b'],
    industry: ['consulting', 'sales', 'service'],
    features: ['win-focused', 'professional-layout', 'pricing-tables'],
    popularity: 1950,
    featured: true,
    isNew: false,
    downloads: 1950,
    rating: 4.7,
    difficulty: 'medium',
    customizable: true,
    aiCompatible: true,
  },
];

// ===== COMBINED ALL TEMPLATES =====
export const AllTemplates = [
  ...WebsiteTemplates,
  ...PresentationTemplates,
  ...DocumentTemplates,
];

// ===== TEMPLATE SEARCH =====
export const searchTemplates = (
  query: string,
  filters?: {
    category?: 'website' | 'presentation' | 'document';
    palette?: string;
    difficulty?: 'easy' | 'medium' | 'advanced';
    industry?: string;
  }
) => {
  let results = AllTemplates;

  // Filter by category
  if (filters?.category) {
    results = results.filter((t) => t.category === filters.category);
  }

  // Filter by palette
  if (filters?.palette) {
    results = results.filter((t) => t.palette === filters.palette);
  }

  // Filter by difficulty
  if (filters?.difficulty) {
    results = results.filter((t) => t.difficulty === filters.difficulty);
  }

  // Filter by industry
  if (filters?.industry) {
    results = results.filter((t) => t.industry.includes(filters.industry));
  }

  // Text search
  if (query) {
    const q = query.toLowerCase();
    results = results.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.useCase.some((u) => u.toLowerCase().includes(q))
    );
  }

  return results.sort((a, b) => b.popularity - a.popularity);
};
