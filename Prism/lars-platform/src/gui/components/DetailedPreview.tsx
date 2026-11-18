import React from 'react';
import '../styles/DetailedPreview.css';

interface DetailedPreviewProps {
  type: 'website' | 'presentation' | 'document';
  templateName: string;
}

// Realistic Website Minimal
const WebsiteMinimalDetailed = () => (
  <div className="detailed-website minimal-theme">
    {/* Navigation */}
    <nav className="navbar">
      <div className="navbar-brand">M</div>
      <div className="navbar-menu">
        <a href="#" className="nav-link">Home</a>
        <a href="#" className="nav-link">About</a>
        <a href="#" className="nav-link">Services</a>
        <a href="#" className="nav-link">Contact</a>
      </div>
    </nav>

    {/* Hero Section */}
    <section className="hero-section">
      <div className="hero-content">
        <h1>Minimal & Clean Design</h1>
        <p>Modern web experiences built with simplicity</p>
        <button className="hero-cta">Explore Now</button>
      </div>
      <div className="hero-image">
        <svg viewBox="0 0 200 200" className="placeholder-image">
          <rect width="200" height="200" fill="#e8e8e8"/>
          <circle cx="100" cy="100" r="40" fill="#d0d0d0"/>
        </svg>
      </div>
    </section>

    {/* Features */}
    <section className="features-section">
      <h2>Key Features</h2>
      <div className="features-grid">
        {[1, 2, 3].map(i => (
          <div key={i} className="feature-card">
            <div className="feature-icon">
              <svg viewBox="0 0 24 24" className="icon">
                <rect x="3" y="3" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </div>
            <h3>Feature {i}</h3>
            <p>Description of feature with clean typography</p>
          </div>
        ))}
      </div>
    </section>

    {/* CTA Section */}
    <section className="cta-section">
      <h2>Ready to start?</h2>
      <button className="cta-button">Get Started</button>
    </section>

    {/* Footer */}
    <footer className="footer">
      <p>&copy; 2026 Minimal Design Co. All rights reserved.</p>
    </footer>
  </div>
);

// Realistic Website Modern
const WebsiteModernDetailed = () => (
  <div className="detailed-website modern-theme">
    {/* Navigation */}
    <nav className="navbar modern-navbar">
      <div className="navbar-brand modern-brand">MODERN</div>
      <div className="navbar-menu">
        <a href="#" className="nav-link">Home</a>
        <a href="#" className="nav-link">Services</a>
        <a href="#" className="nav-link">Work</a>
        <a href="#" className="nav-link">Contact</a>
      </div>
    </nav>

    {/* Hero Section */}
    <section className="hero-section modern-hero">
      <div className="hero-content">
        <h1>Modern Digital Solutions</h1>
        <p>Transform your business with contemporary design</p>
        <button className="hero-cta modern-cta">Start Project</button>
      </div>
    </section>

    {/* Services */}
    <section className="services-section">
      <h2>Our Services</h2>
      <div className="services-grid">
        {['Design', 'Development', 'Strategy'].map((service, i) => (
          <div key={i} className="service-card modern-card">
            <div className="service-number">{i + 1}</div>
            <h3>{service}</h3>
            <p>Professional solutions tailored to your needs</p>
          </div>
        ))}
      </div>
    </section>

    {/* Portfolio */}
    <section className="portfolio-section">
      <h2>Recent Work</h2>
      <div className="portfolio-grid">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="portfolio-item">
            <svg viewBox="0 0 200 150" className="portfolio-image">
              <rect width="200" height="150" fill="#0066cc" opacity="0.2"/>
              <rect x="40" y="35" width="120" height="80" fill="#0066cc" opacity="0.4"/>
            </svg>
          </div>
        ))}
      </div>
    </section>

    {/* Footer */}
    <footer className="footer modern-footer">
      <div className="footer-content">
        <div className="footer-col">
          <h4>Company</h4>
          <ul>
            <li>About</li>
            <li>Services</li>
            <li>Contact</li>
          </ul>
        </div>
      </div>
    </footer>
  </div>
);

// Realistic Website Corporate
const WebsiteCorporateDetailed = () => (
  <div className="detailed-website corporate-theme">
    {/* Header */}
    <header className="corporate-header">
      <div className="header-top">
        <div className="company-info">
          <span className="company-name">CORPORATE</span>
          <span className="company-tagline">Enterprise Solutions</span>
        </div>
      </div>
      <nav className="corporate-nav">
        <a href="#" className="corp-nav-link">Home</a>
        <a href="#" className="corp-nav-link">About Us</a>
        <a href="#" className="corp-nav-link">Solutions</a>
        <a href="#" className="corp-nav-link">Industries</a>
        <a href="#" className="corp-nav-link">Contact</a>
      </nav>
    </header>

    {/* Main Content */}
    <section className="corporate-hero">
      <div className="corp-hero-content">
        <h1>Global Business Solutions</h1>
        <p>Trusted by leading enterprises worldwide</p>
        <button className="corp-btn">Learn More</button>
      </div>
    </section>

    {/* Solutions */}
    <section className="solutions-section">
      <h2>Our Solutions</h2>
      <div className="solutions-grid">
        {['Consulting', 'Technology', 'Support'].map((sol, i) => (
          <div key={i} className="solution-box">
            <div className="sol-icon">
              <div className="icon-placeholder"></div>
            </div>
            <h3>{sol}</h3>
            <p>Comprehensive {sol.toLowerCase()} services for your organization</p>
          </div>
        ))}
      </div>
    </section>

    {/* Stats */}
    <section className="stats-section">
      <div className="stat-item">
        <span className="stat-number">500+</span>
        <span className="stat-label">Clients</span>
      </div>
      <div className="stat-item">
        <span className="stat-number">25+</span>
        <span className="stat-label">Years</span>
      </div>
      <div className="stat-item">
        <span className="stat-number">50+</span>
        <span className="stat-label">Countries</span>
      </div>
    </section>

    {/* Footer */}
    <footer className="corporate-footer">
      <p>&copy; 2026 Corporate Solutions Inc.</p>
    </footer>
  </div>
);

// Realistic Presentation
const PresentationDetailed = ({ palette }: any) => (
  <div className={`detailed-presentation ${palette}`}>
    <div className="slide-wrapper">
      {/* Title Slide */}
      <div className="presentation-slide title-slide">
        <div className="slide-accent-top"></div>
        <div className="slide-title-content">
          <h1>Presentation Title</h1>
          <p className="slide-subtitle">Professional Presentation Template</p>
          <p className="slide-author">Your Name • 2026</p>
        </div>
        <div className="slide-accent-bottom"></div>
      </div>

      {/* Content Preview - showing multiple slides */}
      <div className="slides-preview">
        <div className="mini-slide">
          <div className="mini-content">
            <h3>Overview</h3>
            <ul className="mini-list">
              <li>Point 1</li>
              <li>Point 2</li>
              <li>Point 3</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Realistic Document
const DocumentDetailed = () => (
  <div className="detailed-document">
    {/* Header */}
    <div className="doc-header">
      <h1 className="doc-title">Professional Document</h1>
      <div className="doc-meta">
        <span className="doc-date">2026</span>
        <span className="doc-category">Business Report</span>
      </div>
      <div className="doc-divider"></div>
    </div>

    {/* Content */}
    <div className="doc-body">
      {/* Section 1 */}
      <section className="doc-section">
        <h2>Executive Summary</h2>
        <p className="doc-text">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
      </section>

      {/* Section 2 */}
      <section className="doc-section">
        <h2>Key Points</h2>
        <ul className="doc-list">
          <li>Strategic objective one</li>
          <li>Critical implementation phase</li>
          <li>Expected outcomes and benefits</li>
          <li>Timeline and milestones</li>
        </ul>
      </section>

      {/* Section 3 */}
      <section className="doc-section">
        <h2>Analysis</h2>
        <div className="doc-table">
          <div className="table-row header-row">
            <span>Metric</span>
            <span>Value</span>
            <span>Growth</span>
          </div>
          <div className="table-row">
            <span>Revenue</span>
            <span>$10M</span>
            <span>+25%</span>
          </div>
          <div className="table-row">
            <span>Users</span>
            <span>50K</span>
            <span>+40%</span>
          </div>
        </div>
      </section>

      {/* Conclusion */}
      <section className="doc-section">
        <h2>Conclusion</h2>
        <p className="doc-text">Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
      </section>
    </div>

    {/* Footer */}
    <div className="doc-footer">
      <span className="page-number">Page 1</span>
    </div>
  </div>
);

export const DetailedPreview: React.FC<DetailedPreviewProps> = ({
  type,
  templateName
}) => {
  const renderPreview = () => {
    if (type === 'website') {
      if (templateName === 'minimal') return <WebsiteMinimalDetailed />;
      if (templateName === 'modern') return <WebsiteModernDetailed />;
      if (templateName === 'corporate') return <WebsiteCorporateDetailed />;
      return <WebsiteModernDetailed />;
    } else if (type === 'presentation') {
      const paletteMap: any = {
        corporate: 'corporate',
        creative: 'creative',
        modern: 'modern',
        elegant: 'elegant',
        startup: 'startup'
      };
      return <PresentationDetailed palette={paletteMap[templateName] || 'corporate'} />;
    } else if (type === 'document') {
      return <DocumentDetailed />;
    }
    return null;
  };

  return <div className="detailed-preview-container">{renderPreview()}</div>;
};
