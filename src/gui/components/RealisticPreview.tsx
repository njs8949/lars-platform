import React from 'react';
import '../styles/RealisticPreview.css';

interface RealisticPreviewProps {
  type: 'website' | 'presentation' | 'document';
  templateName: string;
}

// Website Previews
const WebsiteMinimal = () => (
  <div className="preview-website">
    <div className="website-header">
      <div className="logo">M</div>
      <div className="nav-items">
        <span>Home</span>
        <span>About</span>
        <span>Contact</span>
      </div>
    </div>
    <div className="website-hero">
      <h1>Minimal Design</h1>
      <p>Clean and modern approach</p>
    </div>
    <div className="website-content">
      <div className="content-box">Feature 1</div>
      <div className="content-box">Feature 2</div>
      <div className="content-box">Feature 3</div>
    </div>
  </div>
);

const WebsiteModern = () => (
  <div className="preview-website modern">
    <div className="website-header gradient-blue">
      <div className="logo">MODERN</div>
      <div className="nav-items">
        <span>Home</span>
        <span>Services</span>
        <span>Blog</span>
      </div>
    </div>
    <div className="website-hero gradient-blue">
      <h1>Modern Web Design</h1>
      <p>Contemporary and dynamic</p>
      <button className="cta-btn">Get Started</button>
    </div>
    <div className="website-content">
      <div className="content-box gradient-accent">Service A</div>
      <div className="content-box gradient-accent">Service B</div>
    </div>
  </div>
);

const WebsiteElegant = () => (
  <div className="preview-website elegant">
    <div className="website-header gradient-dark">
      <div className="logo elegant-logo">✦</div>
      <div className="nav-items">
        <span>Home</span>
        <span>Portfolio</span>
        <span>Contact</span>
      </div>
    </div>
    <div className="website-hero gradient-dark elegant-hero">
      <h1>Elegant Design</h1>
      <p>Sophisticated and timeless</p>
    </div>
    <div className="website-content elegant-content">
      <div className="content-box elegant-box">Premium 1</div>
      <div className="content-box elegant-box">Premium 2</div>
      <div className="content-box elegant-box">Premium 3</div>
    </div>
  </div>
);

const WebsiteCorporate = () => (
  <div className="preview-website corporate">
    <div className="website-header gradient-corporate">
      <div className="logo">CORP</div>
      <div className="nav-items">
        <span>Home</span>
        <span>About</span>
        <span>Services</span>
      </div>
    </div>
    <div className="website-hero gradient-corporate">
      <h1>Corporate Solutions</h1>
      <p>Professional and reliable</p>
    </div>
    <div className="website-content corporate-content">
      <div className="content-box corporate-box">Solution 1</div>
      <div className="content-box corporate-box">Solution 2</div>
      <div className="content-box corporate-box">Solution 3</div>
    </div>
  </div>
);

// Presentation Previews
const PresentationSlide = ({ title, subtitle, palette }: any) => (
  <div className={`preview-presentation ${palette}`}>
    <div className="slide-container">
      <div className="slide-header">
        <div className="accent-line"></div>
      </div>
      <div className="slide-content">
        <h2 className="slide-title">{title}</h2>
        <p className="slide-subtitle">{subtitle}</p>
      </div>
      <div className="slide-footer">
        <span className="slide-number">1</span>
      </div>
    </div>
  </div>
);

// Document Previews
const DocumentPreview = ({ title, palette }: any) => (
  <div className={`preview-document ${palette}`}>
    <div className="document-header">
      <h1 className="doc-title">{title}</h1>
      <div className="doc-line"></div>
    </div>
    <div className="document-body">
      <p className="doc-paragraph">Lorem ipsum dolor sit amet</p>
      <p className="doc-paragraph">Consectetur adipiscing elit</p>
      <div className="doc-section">
        <h3>Section Title</h3>
        <ul className="doc-list">
          <li>Point 1</li>
          <li>Point 2</li>
          <li>Point 3</li>
        </ul>
      </div>
    </div>
  </div>
);

export const RealisticPreview: React.FC<RealisticPreviewProps> = ({
  type,
  templateName
}) => {
  const renderPreview = () => {
    if (type === 'website') {
      switch (templateName) {
        case 'minimal':
          return <WebsiteMinimal />;
        case 'modern':
          return <WebsiteModern />;
        case 'elegant':
          return <WebsiteElegant />;
        case 'corporate':
          return <WebsiteCorporate />;
        default:
          return <WebsiteModern />;
      }
    } else if (type === 'presentation') {
      const paletteMap: any = {
        corporate: 'corporate',
        creative: 'creative',
        modern: 'modern',
        elegant: 'elegant',
        startup: 'startup'
      };
      return (
        <PresentationSlide
          title="Slide Title"
          subtitle="Presentation Subtitle"
          palette={paletteMap[templateName] || 'corporate'}
        />
      );
    } else if (type === 'document') {
      const paletteMap: any = {
        professional: 'professional',
        proposal: 'professional',
        'business-plan': 'professional',
        'project-plan': 'modern'
      };
      return (
        <DocumentPreview
          title="Document Title"
          palette={paletteMap[templateName] || 'professional'}
        />
      );
    }
    return null;
  };

  return <div className="realistic-preview-container">{renderPreview()}</div>;
};
