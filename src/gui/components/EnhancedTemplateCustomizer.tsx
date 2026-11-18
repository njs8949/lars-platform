import React, { useState } from 'react';
import { Download, FileText, Layout } from 'lucide-react';
import { DesignTokens, getPalette, getTypography } from '../design/tokens';
import '../styles/EnhancedTemplateCustomizer.css';

interface CustomizerState {
  selectedPalette: string;
  selectedTypography: string;
  customColors: {
    primary?: string;
    secondary?: string;
    accent?: string;
    text?: string;
    background?: string;
  };
  customSpacing: 'compact' | 'comfortable' | 'spacious';
  customRadius: string;
}

interface EnhancedTemplateCustomizerProps {
  templateName: string;
  onCustomize?: (state: CustomizerState) => void;
  onGenerate?: (state: CustomizerState) => void;
}

export const EnhancedTemplateCustomizer: React.FC<EnhancedTemplateCustomizerProps> = ({
  templateName,
  onCustomize,
  onGenerate,
}) => {
  const [state, setState] = useState<CustomizerState>({
    selectedPalette: 'modern',
    selectedTypography: 'sansSerif',
    customColors: {},
    customSpacing: 'comfortable',
    customRadius: 'md',
  });

  const [activeTab, setActiveTab] = useState<'design' | 'colors' | 'typography' | 'preview'>('design');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const currentPalette = getPalette(state.selectedPalette);
  const currentTypography = getTypography(state.selectedTypography);

  // 파일 생성 함수
  const generateFile = async (fileType: 'website' | 'presentation' | 'document') => {
    setIsGenerating(true);
    try {
      const palette = {
        primary: state.customColors.primary || currentPalette.primary,
        secondary: state.customColors.secondary || currentPalette.secondary,
        accent: state.customColors.accent || currentPalette.accent,
        text: state.customColors.text || currentPalette.text,
        textLight: currentPalette.textLight,
        background: state.customColors.background || currentPalette.background,
        surface: currentPalette.surface,
      };

      const response = await fetch(`http://localhost:8001/api/export/${fileType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_type: fileType,
          theme_name: state.selectedPalette,
          palette,
          typography: currentTypography,
          company_name: 'Prism Design',
          title: templateName,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate file');

      // 파일 다운로드
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const contentDisposition = response.headers.get('content-disposition') || '';
      const filenameMatch = contentDisposition.match(/filename=([^;]+)/);
      const filename = filenameMatch ? filenameMatch[1] : `Prism_${fileType}.${
        fileType === 'website' ? 'html' :
        fileType === 'presentation' ? 'pptx' : 'docx'
      }`;

      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating file:', error);
      alert(`Failed to generate ${fileType}. Please try again.`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePaletteChange = (paletteName: string) => {
    const newState = { ...state, selectedPalette: paletteName };
    setState(newState);
    onCustomize?.(newState);
  };

  const handleColorChange = (colorKey: keyof CustomizerState['customColors'], value: string) => {
    const newState = {
      ...state,
      customColors: {
        ...state.customColors,
        [colorKey]: value,
      },
    };
    setState(newState);
    onCustomize?.(newState);
  };

  const handleTypographyChange = (typName: string) => {
    const newState = { ...state, selectedTypography: typName };
    setState(newState);
    onCustomize?.(newState);
  };

  const handleSpacingChange = (spacing: 'compact' | 'comfortable' | 'spacious') => {
    const newState = { ...state, customSpacing: spacing };
    setState(newState);
    onCustomize?.(newState);
  };

  return (
    <div className="enhanced-customizer">
      {/* Header */}
      <div className="customizer-header">
        <h2>Customize {templateName}</h2>
        <p>Fine-tune your template design with design tokens</p>
      </div>

      {/* Tab Navigation */}
      <div className="customizer-tabs">
        <button
          className={`tab-button ${activeTab === 'design' ? 'active' : ''}`}
          onClick={() => setActiveTab('design')}
        >
          🎨 Design
        </button>
        <button
          className={`tab-button ${activeTab === 'colors' ? 'active' : ''}`}
          onClick={() => setActiveTab('colors')}
        >
          🌈 Colors
        </button>
        <button
          className={`tab-button ${activeTab === 'typography' ? 'active' : ''}`}
          onClick={() => setActiveTab('typography')}
        >
          📝 Typography
        </button>
        <button
          className={`tab-button ${activeTab === 'preview' ? 'active' : ''}`}
          onClick={() => setActiveTab('preview')}
        >
          👁️ Preview
        </button>
      </div>

      {/* Content */}
      <div className="customizer-content">
        {/* DESIGN TAB */}
        {activeTab === 'design' && (
          <div className="tab-content">
            <div className="section">
              <h3>Color Palette</h3>
              <p className="section-desc">Choose a pre-designed palette or customize colors</p>
              <div className="palette-grid">
                {Object.entries(DesignTokens.palettes).map(([key, palette]) => (
                  <div
                    key={key}
                    className={`palette-item ${state.selectedPalette === key ? 'active' : ''}`}
                    onClick={() => handlePaletteChange(key)}
                  >
                    <div className="palette-colors">
                      <div className="color-dot" style={{ background: palette.primary }}></div>
                      <div className="color-dot" style={{ background: palette.secondary }}></div>
                      <div className="color-dot" style={{ background: palette.accent }}></div>
                    </div>
                    <div className="palette-name">{palette.name}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="section">
              <h3>Spacing</h3>
              <p className="section-desc">Adjust the spacing between elements</p>
              <div className="spacing-options">
                {(['compact', 'comfortable', 'spacious'] as const).map((spacing) => (
                  <button
                    key={spacing}
                    className={`spacing-button ${state.customSpacing === spacing ? 'active' : ''}`}
                    onClick={() => handleSpacingChange(spacing)}
                  >
                    {spacing.charAt(0).toUpperCase() + spacing.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="section">
              <h3>Border Radius</h3>
              <p className="section-desc">Control the roundness of elements</p>
              <div className="radius-options">
                {Object.entries(DesignTokens.radius).map(([key, value]) => (
                  <button
                    key={key}
                    className={`radius-button ${state.customRadius === key ? 'active' : ''}`}
                    onClick={() => setState({ ...state, customRadius: key })}
                    style={{ borderRadius: value }}
                  >
                    {key}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* COLORS TAB */}
        {activeTab === 'colors' && (
          <div className="tab-content">
            <div className="color-picker-grid">
              {[
                { key: 'primary' as const, label: 'Primary Color', default: currentPalette.primary },
                { key: 'secondary' as const, label: 'Secondary Color', default: currentPalette.secondary },
                { key: 'accent' as const, label: 'Accent Color', default: currentPalette.accent },
                { key: 'text' as const, label: 'Text Color', default: currentPalette.text },
                { key: 'background' as const, label: 'Background Color', default: currentPalette.background },
              ].map(({ key, label, default: defaultColor }) => (
                <div key={key} className="color-picker-item">
                  <label>{label}</label>
                  <div className="color-input-group">
                    <input
                      type="color"
                      value={state.customColors[key] || defaultColor}
                      onChange={(e) => handleColorChange(key, e.target.value)}
                      className="color-input"
                    />
                    <span className="color-value">{state.customColors[key] || defaultColor}</span>
                  </div>
                  <div
                    className="color-preview"
                    style={{ background: state.customColors[key] || defaultColor }}
                  ></div>
                </div>
              ))}
            </div>

            <div className="section">
              <h3>Preset Gradients</h3>
              <div className="gradient-grid">
                {Object.entries(DesignTokens.gradients).map(([name, gradient]) => (
                  <div key={name} className="gradient-item">
                    <div className="gradient-preview" style={{ background: gradient }}></div>
                    <span>{name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TYPOGRAPHY TAB */}
        {activeTab === 'typography' && (
          <div className="tab-content">
            <div className="section">
              <h3>Font Family</h3>
              <div className="typography-options">
                {Object.entries(DesignTokens.typography).map(([key, typo]) => (
                  <button
                    key={key}
                    className={`typography-button ${state.selectedTypography === key ? 'active' : ''}`}
                    onClick={() => handleTypographyChange(key)}
                    style={{ fontFamily: typo.family }}
                  >
                    <div className="typo-preview">Aa</div>
                    <div className="typo-name">{typo.name}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="section">
              <h3>Font Size Scale</h3>
              <div className="font-size-showcase">
                {Object.entries(DesignTokens.fontSize).map(([size, value]) => (
                  <div key={size} className="font-size-item">
                    <span className="font-size-label">{size}</span>
                    <div className="font-size-preview" style={{ fontSize: value }}>
                      Preview Text
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="section">
              <h3>Letter Spacing</h3>
              <div className="letter-spacing-options">
                <div className="spacing-item">
                  <span>Tight</span>
                  <div style={{ letterSpacing: '-0.5px' }}>Letter Spacing</div>
                </div>
                <div className="spacing-item">
                  <span>Normal</span>
                  <div style={{ letterSpacing: '0px' }}>Letter Spacing</div>
                </div>
                <div className="spacing-item">
                  <span>Wide</span>
                  <div style={{ letterSpacing: '1px' }}>Letter Spacing</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PREVIEW TAB */}
        {activeTab === 'preview' && (
          <div className="tab-content">
            <div className="preview-section">
              <h3>Live Preview</h3>
              <div className="live-preview">
                <div
                  className="preview-card"
                  style={{
                    background: state.customColors.background || currentPalette.background,
                    color: state.customColors.text || currentPalette.text,
                  }}
                >
                  <h2 style={{ color: state.customColors.accent || currentPalette.accent }}>
                    Your Design
                  </h2>
                  <p>This is how your template will look with current settings</p>
                  <button
                    style={{
                      background: state.customColors.accent || currentPalette.accent,
                      color: '#FFF',
                      border: 'none',
                      padding: '10px 24px',
                      borderRadius: DesignTokens.radius[state.customRadius as keyof typeof DesignTokens.radius],
                      cursor: 'pointer',
                    }}
                  >
                    Call to Action
                  </button>
                </div>
              </div>
            </div>

            <div className="preview-section">
              <h3>Color Harmony</h3>
              <div className="color-harmony">
                <div className="harmony-item">
                  <div
                    className="harmony-color"
                    style={{ background: state.customColors.primary || currentPalette.primary }}
                  ></div>
                  <span>Primary</span>
                </div>
                <div className="harmony-item">
                  <div
                    className="harmony-color"
                    style={{ background: state.customColors.secondary || currentPalette.secondary }}
                  ></div>
                  <span>Secondary</span>
                </div>
                <div className="harmony-item">
                  <div
                    className="harmony-color"
                    style={{ background: state.customColors.accent || currentPalette.accent }}
                  ></div>
                  <span>Accent</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Export Buttons */}
      <div className="export-section">
        <h3>📥 Export Your Design</h3>
        <div className="export-buttons">
          <button
            className="export-btn export-website"
            onClick={() => generateFile('website')}
            disabled={isGenerating}
            title="Export as HTML/CSS website"
          >
            <Layout size={18} />
            Website (HTML)
          </button>
          <button
            className="export-btn export-presentation"
            onClick={() => generateFile('presentation')}
            disabled={isGenerating}
            title="Export as PPTX presentation"
          >
            <FileText size={18} />
            Presentation (PPTX)
          </button>
          <button
            className="export-btn export-document"
            onClick={() => generateFile('document')}
            disabled={isGenerating}
            title="Export as DOCX document"
          >
            <Download size={18} />
            Document (DOCX)
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="customizer-actions">
        <button className="btn-secondary">Cancel</button>
        <button
          className="btn-primary"
          onClick={() => onGenerate?.(state)}
          disabled={isGenerating}
        >
          ✨ {isGenerating ? 'Generating...' : 'Generate with AI'}
        </button>
      </div>
    </div>
  );
};
