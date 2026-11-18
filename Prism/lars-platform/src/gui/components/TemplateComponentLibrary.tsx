import React from 'react';
import { DesignTokens, getPalette } from '../design/tokens';
import '../styles/TemplateComponentLibrary.css';

// ==================== COMPONENT LIBRARY ====================
// Reusable components that respect design tokens

interface ComponentProps {
  palette?: string;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

// ===== NAVIGATION COMPONENTS =====
export const NavBar: React.FC<
  ComponentProps & {
    logo?: string;
    links?: string[];
    ctaText?: string;
  }
> = ({ palette = 'modern', logo = 'LOGO', links = [], ctaText = 'Get Started', style }) => {
  const colors = getPalette(palette);
  return (
    <nav
      className="template-navbar"
      style={{
        background: colors.background,
        color: colors.text,
        ...style,
      }}
    >
      <div className="navbar-logo">{logo}</div>
      <div className="navbar-links">
        {links.map((link, i) => (
          <a key={i} href="#" className="nav-link">
            {link}
          </a>
        ))}
      </div>
      <button className="navbar-cta" style={{ background: colors.accent, color: '#FFF' }}>
        {ctaText}
      </button>
    </nav>
  );
};

// ===== HERO SECTION =====
export const HeroSection: React.FC<
  ComponentProps & {
    title?: string;
    subtitle?: string;
    ctaText?: string;
    imageUrl?: string;
    gradientBg?: string;
  }
> = ({
  palette = 'modern',
  title = 'Welcome',
  subtitle = 'Your subtitle here',
  ctaText = 'Get Started',
  gradientBg,
  style,
}) => {
  const colors = getPalette(palette);
  const gradient = gradientBg || DesignTokens.gradients.blueModern;

  return (
    <section
      className="template-hero"
      style={{
        background: gradient,
        color: colors.text,
        ...style,
      }}
    >
      <div className="hero-content">
        <h1 className="hero-title">{title}</h1>
        <p className="hero-subtitle">{subtitle}</p>
        <button className="hero-cta" style={{ background: colors.accent }}>
          {ctaText}
        </button>
      </div>
    </section>
  );
};

// ===== CARD COMPONENT =====
export const Card: React.FC<
  ComponentProps & {
    title?: string;
    description?: string;
    icon?: string;
    accentColor?: string;
  }
> = ({ palette = 'modern', title = 'Title', description = 'Description', icon = '📌', style }) => {
  const colors = getPalette(palette);
  return (
    <div
      className="template-card"
      style={{
        background: colors.surface,
        borderColor: colors.accent,
        ...style,
      }}
    >
      <div className="card-icon">{icon}</div>
      <h3 style={{ color: colors.text }}>{title}</h3>
      <p style={{ color: colors.textLight }}>{description}</p>
    </div>
  );
};

// ===== FEATURE GRID =====
export const FeatureGrid: React.FC<
  ComponentProps & {
    features?: Array<{ icon: string; title: string; description: string }>;
    columns?: number;
  }
> = ({
  palette = 'modern',
  features = [],
  columns = 3,
  style,
}) => {
  const colors = getPalette(palette);
  return (
    <div className="template-feature-grid" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)`, ...style }}>
      {features.map((feature, i) => (
        <Card
          key={i}
          palette={palette}
          icon={feature.icon}
          title={feature.title}
          description={feature.description}
        />
      ))}
    </div>
  );
};

// ===== METRIC BLOCK =====
export const MetricBlock: React.FC<
  ComponentProps & {
    number?: string;
    label?: string;
  }
> = ({ palette = 'modern', number = '100', label = 'Metric', style }) => {
  const colors = getPalette(palette);
  return (
    <div
      className="template-metric"
      style={{
        background: colors.surface,
        ...style,
      }}
    >
      <div className="metric-number" style={{ color: colors.accent }}>
        {number}
      </div>
      <div className="metric-label" style={{ color: colors.textLight }}>
        {label}
      </div>
    </div>
  );
};

// ===== TESTIMONIAL CARD =====
export const TestimonialCard: React.FC<
  ComponentProps & {
    quote?: string;
    author?: string;
    role?: string;
    avatar?: string;
  }
> = ({
  palette = 'modern',
  quote = 'Great product!',
  author = 'John Doe',
  role = 'CEO',
  avatar = '👤',
  style,
}) => {
  const colors = getPalette(palette);
  return (
    <div
      className="template-testimonial"
      style={{
        background: colors.surface,
        borderLeft: `4px solid ${colors.accent}`,
        ...style,
      }}
    >
      <p style={{ color: colors.text, fontStyle: 'italic' }}>"{quote}"</p>
      <div className="testimonial-author">
        <div className="author-avatar">{avatar}</div>
        <div>
          <div style={{ color: colors.text, fontWeight: 600 }}>{author}</div>
          <div style={{ color: colors.textLight, fontSize: '14px' }}>{role}</div>
        </div>
      </div>
    </div>
  );
};

// ===== PRICING CARD =====
export const PricingCard: React.FC<
  ComponentProps & {
    name?: string;
    price?: string;
    features?: string[];
    featured?: boolean;
    ctaText?: string;
  }
> = ({
  palette = 'modern',
  name = 'Plan',
  price = '$99',
  features = [],
  featured = false,
  ctaText = 'Get Started',
  style,
}) => {
  const colors = getPalette(palette);
  return (
    <div
      className={`template-pricing ${featured ? 'featured' : ''}`}
      style={{
        background: featured ? colors.accent : colors.surface,
        border: `2px solid ${featured ? colors.accent : colors.accent}20`,
        ...style,
      }}
    >
      <h3 style={{ color: featured ? '#FFF' : colors.text }}>{name}</h3>
      <div
        className="pricing-amount"
        style={{ color: featured ? '#FFF' : colors.accent, fontSize: '32px', fontWeight: 'bold' }}
      >
        {price}
      </div>
      <ul className="pricing-features">
        {features.map((feature, i) => (
          <li key={i} style={{ color: featured ? '#FFF' : colors.textLight }}>
            ✓ {feature}
          </li>
        ))}
      </ul>
      <button
        className="pricing-cta"
        style={{
          background: featured ? '#FFF' : colors.accent,
          color: featured ? colors.accent : '#FFF',
        }}
      >
        {ctaText}
      </button>
    </div>
  );
};

// ===== CTA SECTION =====
export const CTASection: React.FC<
  ComponentProps & {
    title?: string;
    description?: string;
    buttonText?: string;
    bgGradient?: string;
  }
> = ({
  palette = 'modern',
  title = 'Ready to get started?',
  description = 'Join thousands of satisfied customers.',
  buttonText = 'Start Now',
  bgGradient,
  style,
}) => {
  const colors = getPalette(palette);
  const gradient = bgGradient || DesignTokens.gradients.blueModern;

  return (
    <section
      className="template-cta"
      style={{
        background: gradient,
        ...style,
      }}
    >
      <h2 style={{ color: '#FFF' }}>{title}</h2>
      <p style={{ color: 'rgba(255,255,255,0.8)' }}>{description}</p>
      <button className="cta-button" style={{ background: colors.accent || '#FFF' }}>
        {buttonText}
      </button>
    </section>
  );
};

// ===== FOOTER =====
export const Footer: React.FC<
  ComponentProps & {
    companyName?: string;
    links?: Array<{ title: string; items: string[] }>;
    copyright?: string;
  }
> = ({
  palette = 'modern',
  companyName = 'Company',
  links = [],
  copyright = '© 2026 All rights reserved.',
  style,
}) => {
  const colors = getPalette(palette);
  return (
    <footer
      className="template-footer"
      style={{
        background: colors.surface,
        borderTop: `1px solid ${colors.accent}20`,
        ...style,
      }}
    >
      <div className="footer-content">
        <div className="footer-branding">
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: colors.text }}>
            {companyName}
          </div>
        </div>
        <div className="footer-links">
          {links.map((section, i) => (
            <div key={i} className="footer-section">
              <h4 style={{ color: colors.text }}>{section.title}</h4>
              <ul>
                {section.items.map((item, j) => (
                  <li key={j}>
                    <a href="#" style={{ color: colors.textLight }}>
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="footer-bottom" style={{ borderTop: `1px solid ${colors.accent}20`, paddingTop: '24px' }}>
        <p style={{ color: colors.textLight }}>{copyright}</p>
      </div>
    </footer>
  );
};

// ===== SECTION CONTAINER =====
export const SectionContainer: React.FC<
  ComponentProps & {
    title?: string;
    subtitle?: string;
  }
> = ({ palette = 'modern', title, subtitle, children, style }) => {
  const colors = getPalette(palette);
  return (
    <section className="template-section" style={style}>
      {title && (
        <div className="section-header">
          <h2 style={{ color: colors.text }}>{title}</h2>
          {subtitle && <p style={{ color: colors.textLight }}>{subtitle}</p>}
        </div>
      )}
      {children}
    </section>
  );
};

// ===== STATS SECTION =====
export const StatsSection: React.FC<
  ComponentProps & {
    stats?: Array<{ number: string; label: string }>;
  }
> = ({ palette = 'modern', stats = [], style }) => {
  return (
    <div className="template-stats-section" style={style}>
      {stats.map((stat, i) => (
        <MetricBlock
          key={i}
          palette={palette}
          number={stat.number}
          label={stat.label}
        />
      ))}
    </div>
  );
};
