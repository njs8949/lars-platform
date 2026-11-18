import React from 'react';
import '../styles/RealisticTemplatePreview.css';

interface RealisticTemplatePreviewProps {
  type: 'website' | 'presentation' | 'document';
  templateName: string;
}

// ==================== REALISTIC WEBSITE TEMPLATES ====================

const MinimalWebsite = () => (
  <div className="realistic-website minimal">
    <nav className="website-nav minimal-nav">
      <div className="nav-logo">M</div>
      <div className="nav-links">
        <span>Home</span>
        <span>About</span>
        <span>Work</span>
        <span>Contact</span>
      </div>
    </nav>
    <section className="hero-section minimal-hero">
      <div className="hero-image-placeholder">
        <div className="image-grid">
          <div className="grid-item"></div>
          <div className="grid-item"></div>
          <div className="grid-item"></div>
          <div className="grid-item"></div>
        </div>
      </div>
    </section>
    <section className="content-section">
      <div className="section-title">Selected Works</div>
      <div className="portfolio-grid">
        {[{title: 'Modern UI Kit', cat: 'Web Design', color: '#667EEA'},
          {title: 'Brand Identity', cat: 'Branding', color: '#764BA2'},
          {title: 'App Design', cat: 'Product', color: '#F093FB'},
          {title: 'Web Platform', cat: 'Development', color: '#4FACFE'},
          {title: 'Visual System', cat: 'Design', color: '#43E97B'},
          {title: 'Marketing Site', cat: 'Web', color: '#FA709A'}].map((work, i) => (
          <div key={i} className="portfolio-card">
            <div className="portfolio-image" style={{background: `linear-gradient(135deg, ${work.color} 0%, ${work.color}88 100%)`}}></div>
            <div className="portfolio-info">
              <div className="work-title">{work.title}</div>
              <div className="work-category">{work.cat}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
    <footer className="website-footer minimal-footer">
      <span>© 2026 Minimal Studio</span>
    </footer>
  </div>
);

// Creative Portfolio Website
const CreativeWebsite = () => (
  <div className="realistic-website creative">
    <nav className="website-nav creative-nav">
      <div className="nav-logo creative-logo">🎨</div>
      <div className="nav-links">
        <span>Portfolio</span>
        <span>Services</span>
        <span>Blog</span>
      </div>
    </nav>
    <section className="hero-section creative-hero">
      <div className="hero-text">
        <h1>Creative Studio</h1>
        <p>Crafting Digital Experiences</p>
      </div>
    </section>
    <section className="showcase-section">
      <div className="showcase-item" style={{background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)'}}></div>
      <div className="showcase-item" style={{background: 'linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%)'}}></div>
      <div className="showcase-item" style={{background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)'}}></div>
    </section>
    <footer className="website-footer creative-footer">
      <span>Let's create something amazing</span>
    </footer>
  </div>
);

// Startup Website
const StartupWebsite = () => (
  <div className="realistic-website startup">
    <nav className="website-nav startup-nav">
      <div className="nav-logo startup-logo">▲</div>
      <div className="nav-links">
        <span>Product</span>
        <span>Pricing</span>
        <span>Docs</span>
      </div>
    </nav>
    <section className="hero-section startup-hero">
      <h1>Scale Your Business</h1>
      <p>Lightning-fast API for modern apps</p>
      <button className="cta-button">Start Free</button>
    </section>
    <section className="features-section">
      <div className="feature">📊 Real-time Analytics</div>
      <div className="feature">🔒 Enterprise Security</div>
      <div className="feature">⚡ 99.99% Uptime</div>
    </section>
    <footer className="website-footer startup-footer">
      <span>Trusted by 5000+ companies</span>
    </footer>
  </div>
);

const ModernWebsite = () => (
  <div className="realistic-website modern">
    {/* Navigation */}
    <nav className="website-nav modern-nav">
      <div className="nav-logo modern-logo">MODERN</div>
      <div className="nav-links">
        <span>Services</span>
        <span>Portfolio</span>
        <span>About</span>
        <span>Contact</span>
      </div>
    </nav>

    {/* Hero Section with Background */}
    <section className="hero-section modern-hero enhanced">
      <div className="hero-bg-image"></div>
      <div className="hero-content">
        <h1 className="hero-title">Digital Solutions</h1>
        <p className="hero-subtitle">Transform your business with modern design</p>
        <div className="hero-buttons">
          <button className="hero-button primary">Get Started</button>
          <button className="hero-button secondary">Learn More</button>
        </div>
      </div>
      <div className="hero-accent"></div>
    </section>

    {/* Services */}
    <section className="services-section enhanced">
      <h2>Our Services</h2>
      <div className="services-grid">
        {['Design', 'Development', 'Strategy'].map((service, i) => (
          <div key={i} className="service-item enhanced">
            <div className="service-icon">
              <div className="icon-shape"></div>
            </div>
            <h3>{service}</h3>
            <p>Professional solutions for your business needs</p>
          </div>
        ))}
      </div>
    </section>

    {/* Portfolio Section */}
    <section className="portfolio-section enhanced">
      <h2>Recent Projects</h2>
      <div className="portfolio-grid-enhanced">
        {[{color: '#FF6B6B', label: 'E-Commerce'}, {color: '#4ECDC4', label: 'SaaS'},
          {color: '#45B7D1', label: 'Mobile App'}, {color: '#FFA07A', label: 'Branding'},
          {color: '#98D8C8', label: 'Dashboard'}, {color: '#6C5CE7', label: 'Website'}].map((item, i) => (
          <div key={i} className="portfolio-item-enhanced">
            <div className="portfolio-img" style={{background: `linear-gradient(135deg, ${item.color} 0%, ${item.color}dd 100%)`}}>
              <div className="portfolio-icon">🎨</div>
              <div className="portfolio-text">{item.label}</div>
            </div>
            <div className="portfolio-overlay">
              <span className="portfolio-label">{item.label} Project</span>
            </div>
          </div>
        ))}
      </div>
    </section>

    {/* CTA Section */}
    <section className="cta-section-enhanced">
      <h2>Ready to Start?</h2>
      <p>Join hundreds of successful projects</p>
      <button className="cta-button-enhanced">Contact Us Today</button>
    </section>

    {/* Footer */}
    <footer className="website-footer modern-footer">
      <div className="footer-content">
        <div className="footer-col">
          <h4>Company</h4>
        </div>
        <div className="footer-col">
          <h4>Services</h4>
        </div>
        <span>© 2026 Modern Solutions</span>
      </div>
    </footer>
  </div>
);

const CorporateWebsite = () => (
  <div className="realistic-website corporate">
    {/* Header */}
    <header className="corporate-header">
      <div className="header-top">
        <div className="company-name">CORPORATE GROUP</div>
      </div>
      <nav className="corporate-nav">
        <a href="#" className="corp-nav-item">Home</a>
        <a href="#" className="corp-nav-item">Solutions</a>
        <a href="#" className="corp-nav-item">Industries</a>
        <a href="#" className="corp-nav-item">About</a>
        <a href="#" className="corp-nav-item">Contact</a>
      </nav>
    </header>

    {/* Hero */}
    <section className="corporate-hero">
      <h1>Global Business Solutions</h1>
      <p>Trusted by Fortune 500 companies worldwide</p>
    </section>

    {/* Solutions */}
    <section className="solutions-section">
      <h2>Solutions</h2>
      <div className="solutions-grid">
        {['Consulting', 'Technology', 'Support'].map((sol, i) => (
          <div key={i} className="solution-card">
            <div className="solution-header">{sol}</div>
            <p>Industry-leading {sol.toLowerCase()} services</p>
          </div>
        ))}
      </div>
    </section>

    {/* Stats */}
    <section className="stats-section">
      <div className="stat">
        <div className="stat-num">500+</div>
        <div className="stat-label">Clients</div>
      </div>
      <div className="stat">
        <div className="stat-num">25+</div>
        <div className="stat-label">Years</div>
      </div>
      <div className="stat">
        <div className="stat-num">50</div>
        <div className="stat-label">Countries</div>
      </div>
    </section>

    {/* Footer */}
    <footer className="website-footer corp-footer">
      <span>&copy; 2026 Corporate Group Inc.</span>
    </footer>
  </div>
);

// E-Commerce Website
const EcommerceWebsite = () => (
  <div className="realistic-website ecommerce">
    <nav className="website-nav ecommerce-nav">
      <div className="nav-logo">🛍️</div>
      <div className="nav-links">
        <span>Shop</span>
        <span>Categories</span>
        <span>Deals</span>
        <span>Cart</span>
      </div>
    </nav>
    <section className="hero-section ecommerce-hero">
      <h1>Summer Collection 2026</h1>
      <button className="cta-button">Shop Now</button>
    </section>
    <section className="products-section">
      <div className="products-grid">
        {[1,2,3,4,5,6].map(i => (
          <div key={i} className="product-card">
            <div className="product-image" style={{background: `linear-gradient(135deg, hsl(${i*30}, 70%, 50%), hsl(${i*30}, 70%, 30%))`}}></div>
            <div className="product-info">
              <div className="product-name">Product {i}</div>
              <div className="product-price">$99.99</div>
            </div>
          </div>
        ))}
      </div>
    </section>
    <footer className="website-footer">© 2026 Shop</footer>
  </div>
);

// SaaS Platform Website
const SaasPlatformWebsite = () => (
  <div className="realistic-website saas">
    <nav className="website-nav saas-nav">
      <div className="nav-logo">⚡</div>
      <div className="nav-links">
        <span>Features</span>
        <span>Pricing</span>
        <span>Docs</span>
        <span>Sign In</span>
      </div>
    </nav>
    <section className="hero-section saas-hero">
      <h1>Build & Deploy Faster</h1>
      <p>The platform for modern teams</p>
      <button className="cta-button">Start Free Trial</button>
    </section>
    <section className="features-section saas-features">
      {[{icon: '⚙️', title: 'API First'}, {icon: '🔒', title: 'Secure'}, {icon: '📈', title: 'Scalable'}].map((f,i) => (
        <div key={i} className="feature-box">
          <div className="feature-icon">{f.icon}</div>
          <div className="feature-title">{f.title}</div>
        </div>
      ))}
    </section>
    <footer className="website-footer">© 2026 SaaS Platform</footer>
  </div>
);

// Agency Website
const AgencyWebsite = () => (
  <div className="realistic-website agency">
    <nav className="website-nav agency-nav">
      <div className="nav-logo">🎬</div>
      <div className="nav-links">
        <span>Work</span>
        <span>Team</span>
        <span>Services</span>
      </div>
    </nav>
    <section className="hero-section agency-hero">
      <h1>We Create Digital Experiences</h1>
    </section>
    <section className="projects-section">
      {[1,2,3].map(i => (
        <div key={i} className="project-item" style={{background: `linear-gradient(135deg, hsl(${i*60}, 80%, 50%), hsl(${i*60}, 80%, 30%))`}}>
          <div className="project-overlay">Project {i}</div>
        </div>
      ))}
    </section>
    <footer className="website-footer">© 2026 Creative Agency</footer>
  </div>
);

// Restaurant Website
const RestaurantWebsite = () => (
  <div className="realistic-website restaurant">
    <nav className="website-nav restaurant-nav">
      <div className="nav-logo">🍽️</div>
      <div className="nav-links">
        <span>Menu</span>
        <span>Reserve</span>
        <span>Contact</span>
      </div>
    </nav>
    <section className="hero-section restaurant-hero">
      <h1>Fine Dining Experience</h1>
      <button className="cta-button">Reserve Table</button>
    </section>
    <section className="menu-section">
      {['Appetizers', 'Main Course', 'Desserts'].map((cat, i) => (
        <div key={i} className="menu-category">
          <div className="category-title">{cat}</div>
          <div className="menu-item">★ Signature Dish</div>
        </div>
      ))}
    </section>
    <footer className="website-footer">© 2026 Restaurant</footer>
  </div>
);

// ==================== REALISTIC PRESENTATION TEMPLATES ====================

const getPaletteColors = (palette: string) => {
  const palettes: any = {
    corporate: { bg: '#1E3A8A', accent: '#3B82F6', text: '#ffffff' },
    creative: { bg: '#8B5CF6', accent: '#EC4899', text: '#ffffff' },
    modern: { bg: '#0066cc', accent: '#00a8ff', text: '#ffffff' },
    elegant: { bg: '#5B21B6', accent: '#A78BFA', text: '#ffffff' },
    startup: { bg: '#059669', accent: '#10B981', text: '#ffffff' }
  };
  return palettes[palette] || palettes.modern;
};

const ModernPresentation = ({ palette }: any) => {
  const colors = getPaletteColors(palette);

  return (
    <div className={`realistic-presentation ${palette}`}>
      <div className="presentation-slides-container">
        {/* Slide 1: Title Slide */}
        <div className="ppt-slide slide-1" style={{ background: `linear-gradient(135deg, ${colors.bg} 0%, ${colors.accent} 100%)` }}>
          <div className="slide-number">1</div>
          <div className="slide-content-center">
            <h1 className="ppt-title">Professional Presentation</h1>
            <p className="ppt-subtitle">Modern Design Template 2026</p>
            <div className="ppt-meta">
              <span>Your Company Name</span> • <span>2026</span>
            </div>
          </div>
        </div>

        {/* Slide 2: Content Slide */}
        <div className="ppt-slide slide-2">
          <div className="slide-number">2</div>
          <div className="slide-header-bar" style={{ background: colors.bg }}></div>
          <div className="slide-content-left">
            <h2 className="ppt-slide-title" style={{ color: colors.bg }}>Key Objectives</h2>
            <ul className="ppt-bullet-list">
              <li>Strategic alignment and planning</li>
              <li>Market analysis and opportunities</li>
              <li>Growth initiatives for 2026</li>
              <li>Resource allocation strategy</li>
            </ul>
          </div>
        </div>

        {/* Slide 3: Two Column Slide */}
        <div className="ppt-slide slide-3">
          <div className="slide-number">3</div>
          <div className="slide-header-bar" style={{ background: colors.bg }}></div>
          <h2 className="ppt-slide-title" style={{ color: colors.bg, padding: '24px 24px 0' }}>Performance Metrics</h2>
          <div className="slide-content-two-column">
            <div className="column">
              <div className="metric-box">
                <div className="metric-value" style={{ color: colors.accent }}>+45%</div>
                <div className="metric-label">Revenue Growth</div>
              </div>
              <div className="metric-box">
                <div className="metric-value" style={{ color: colors.accent }}>$2.3M</div>
                <div className="metric-label">Annual Revenue</div>
              </div>
            </div>
            <div className="column">
              <div className="metric-box">
                <div className="metric-value" style={{ color: colors.accent }}>89%</div>
                <div className="metric-label">Customer Satisfaction</div>
              </div>
              <div className="metric-box">
                <div className="metric-value" style={{ color: colors.accent }}>2.4k</div>
                <div className="metric-label">Active Users</div>
              </div>
            </div>
          </div>
        </div>

        {/* Slide 4: Chart Slide */}
        <div className="ppt-slide slide-4">
          <div className="slide-number">4</div>
          <div className="slide-header-bar" style={{ background: colors.bg }}></div>
          <div className="slide-content-chart">
            <h2 className="ppt-slide-title" style={{ color: colors.bg }}>Growth Trends</h2>
            <div className="chart-container">
              <div className="bar-chart">
                {[30, 50, 70, 85, 95].map((height, i) => (
                  <div key={i} className="bar-item">
                    <div className="bar" style={{ height: `${height}%`, background: `linear-gradient(180deg, ${colors.accent} 0%, ${colors.bg} 100%)` }}></div>
                    <div className="bar-label">Q{i+1}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Slide 5: Closing Slide */}
        <div className="ppt-slide slide-5" style={{ background: `linear-gradient(135deg, ${colors.bg} 0%, ${colors.accent} 100%)` }}>
          <div className="slide-number">5</div>
          <div className="slide-content-center">
            <h2 className="ppt-closing-title">Thank You</h2>
            <p className="ppt-closing-subtitle">Questions & Discussion</p>
            <div className="ppt-contact">
              <span>contact@company.com</span> • <span>www.company.com</span>
            </div>
          </div>
        </div>
      </div>

      {/* Slide Thumbnails */}
      <div className="slide-thumbnails-panel">
        <div className="thumbnail-item active" style={{ background: colors.bg }}>
          <div className="thumb-number">1</div>
        </div>
        <div className="thumbnail-item" style={{ borderLeft: `3px solid ${colors.accent}` }}>
          <div className="thumb-number">2</div>
        </div>
        <div className="thumbnail-item" style={{ borderLeft: `3px solid ${colors.accent}` }}>
          <div className="thumb-number">3</div>
        </div>
        <div className="thumbnail-item" style={{ borderLeft: `3px solid ${colors.accent}` }}>
          <div className="thumb-number">4</div>
        </div>
        <div className="thumbnail-item" style={{ borderLeft: `3px solid ${colors.accent}` }}>
          <div className="thumb-number">5</div>
        </div>
      </div>
    </div>
  );
};

// ==================== REALISTIC DOCUMENT TEMPLATES ====================

const ProfessionalDocument = () => (
  <div className="realistic-document">
    {/* Document Cover/Header */}
    <div className="document-cover-page">
      <div className="document-cover-content">
        <div className="document-logo-placeholder"></div>
        <h1 className="document-cover-title">Professional Report</h1>
        <p className="document-cover-subtitle">Strategic Business Analysis & Recommendations</p>
        <div className="document-cover-meta">
          <div>2026 Business Review</div>
          <div>Q1 - Q4 Performance Analysis</div>
        </div>
      </div>
    </div>

    {/* Page 1: Executive Summary */}
    <div className="document-page">
      <div className="page-header">
        <span className="page-title">Executive Summary</span>
        <span className="page-number">1</span>
      </div>
      <div className="page-content">
        <h2 className="section-title">Executive Summary</h2>
        <p className="text-line"></p>
        <p className="text-line"></p>
        <p className="text-line"></p>
        <p className="text-line short"></p>

        <h3 className="section-subtitle" style={{marginTop: '12px'}}>Key Achievements</h3>
        <div className="doc-list-item">• Revenue growth: +28% year-over-year</div>
        <div className="doc-list-item">• User acquisition: +49% expansion</div>
        <div className="doc-list-item">• Market share: Increased by 15%</div>
        <div className="doc-list-item">• Team expansion: 35 new hires</div>
      </div>
    </div>

    {/* Page 2: Key Metrics Table */}
    <div className="document-page">
      <div className="page-header">
        <span className="page-title">Key Metrics</span>
        <span className="page-number">2</span>
      </div>
      <div className="page-content">
        <h2 className="section-title">Performance Metrics</h2>
        <div className="doc-table-modern">
          <div className="table-row table-header-row">
            <div className="table-cell">Metric</div>
            <div className="table-cell">2025</div>
            <div className="table-cell">2026</div>
            <div className="table-cell">Growth</div>
          </div>
          <div className="table-row">
            <div className="table-cell">Revenue</div>
            <div className="table-cell">$8.2M</div>
            <div className="table-cell">$10.5M</div>
            <div className="table-cell">+28%</div>
          </div>
          <div className="table-row">
            <div className="table-cell">Users</div>
            <div className="table-cell">35K</div>
            <div className="table-cell">52K</div>
            <div className="table-cell">+49%</div>
          </div>
          <div className="table-row">
            <div className="table-cell">Engagement</div>
            <div className="table-cell">62%</div>
            <div className="table-cell">78%</div>
            <div className="table-cell">+16%</div>
          </div>
        </div>
      </div>
    </div>

    {/* Page 3: Strategic Initiatives */}
    <div className="document-page">
      <div className="page-header">
        <span className="page-title">Strategic Initiatives</span>
        <span className="page-number">3</span>
      </div>
      <div className="page-content">
        <h2 className="section-title">Strategic Initiatives & Recommendations</h2>
        <div className="doc-list-item" style={{marginTop: '8px'}}>1. Market expansion into APAC region</div>
        <div className="doc-list-item">2. Product development and AI/ML integration</div>
        <div className="doc-list-item">3. Team building and talent acquisition</div>
        <div className="doc-list-item">4. Infrastructure optimization and scaling</div>

        <h3 className="section-subtitle" style={{marginTop: '16px'}}>Expected Outcomes</h3>
        <p className="text-line" style={{marginTop: '4px'}}></p>
        <p className="text-line"></p>
        <p className="text-line short"></p>
      </div>
    </div>

    {/* Page 4: Conclusion */}
    <div className="document-page">
      <div className="page-header">
        <span className="page-title">Conclusion</span>
        <span className="page-number">4</span>
      </div>
      <div className="page-content">
        <h2 className="section-title">Conclusion & Next Steps</h2>
        <p className="text-line" style={{marginTop: '8px'}}></p>
        <p className="text-line"></p>
        <p className="text-line"></p>
        <p className="text-line short" style={{marginBottom: '16px'}}></p>

        <div className="signature-section">
          <div className="signature-line"></div>
          <div className="signature-name">Approved By Management</div>
          <div className="signature-date">September 7, 2026</div>
        </div>
      </div>
    </div>
  </div>
);

// ==================== MAIN COMPONENT ====================

export const RealisticTemplatePreview: React.FC<RealisticTemplatePreviewProps> = ({
  type,
  templateName
}) => {
  const renderPreview = () => {
    if (type === 'website') {
      if (templateName === 'minimal') return <MinimalWebsite />;
      if (templateName === 'modern') return <ModernWebsite />;
      if (templateName === 'corporate') return <CorporateWebsite />;
      if (templateName === 'portfolio' || templateName === 'elegant') return <CreativeWebsite />;
      if (templateName === 'startup' || templateName === 'vibrant') return <StartupWebsite />;
      if (templateName === 'ecommerce') return <EcommerceWebsite />;
      if (templateName === 'saas-pro') return <SaasPlatformWebsite />;
      if (templateName === 'agency-web') return <AgencyWebsite />;
      if (templateName === 'restaurant-web') return <RestaurantWebsite />;
      if (templateName === 'marketplace') return <EcommerceWebsite />;
      if (templateName === 'magazine-web') return <CreativeWebsite />;
      return <ModernWebsite />;
    } else if (type === 'presentation') {
      const paletteMap: any = {
        corporate: 'corporate',
        creative: 'creative',
        modern: 'modern',
        elegant: 'elegant',
        startup: 'startup'
      };
      return <ModernPresentation palette={paletteMap[templateName] || 'corporate'} />;
    } else if (type === 'document') {
      return <ProfessionalDocument />;
    }
    return null;
  };

  return <div className="realistic-template-preview-container">{renderPreview()}</div>;
};
