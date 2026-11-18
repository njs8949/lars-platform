// ==================== DESIGN TOKENS ====================
// Central design system for all templates

export const DesignTokens = {
  // ===== COLOR PALETTES =====
  palettes: {
    minimal: {
      name: 'Minimal',
      description: 'Clean, minimalist aesthetic',
      primary: '#F5F5F5',
      secondary: '#E8E8E8',
      accent: '#333333',
      text: '#1A1A1A',
      textLight: '#666666',
      background: '#FFFFFF',
      surface: '#FAFAFA',
    },
    modern: {
      name: 'Modern',
      description: 'Contemporary blue-based design',
      primary: '#0052CC',
      secondary: '#003D99',
      accent: '#0052CC',
      text: '#0A0E27',
      textLight: '#6B7280',
      background: '#FFFFFF',
      surface: '#F3F4F6',
    },
    corporate: {
      name: 'Corporate',
      description: 'Professional enterprise style',
      primary: '#003366',
      secondary: '#1A5C8F',
      accent: '#0052CC',
      text: '#1A1A1A',
      textLight: '#666666',
      background: '#FFFFFF',
      surface: '#F0F2F5',
    },
    creative: {
      name: 'Creative',
      description: 'Vibrant, artistic aesthetic',
      primary: '#FFA500',
      secondary: '#FF6B6B',
      accent: '#FF8E53',
      text: '#1A1A1A',
      textLight: '#666666',
      background: '#FFFFFF',
      surface: '#FFF5E6',
    },
    startup: {
      name: 'Startup',
      description: 'Dark SaaS, tech-forward style',
      primary: '#00D4FF',
      secondary: '#0A0A0A',
      accent: '#00D4FF',
      text: '#FFFFFF',
      textLight: '#A0A0A0',
      background: '#0A0A0A',
      surface: '#1A1A1A',
    },
    premium: {
      name: 'Premium',
      description: 'Luxury, elegant aesthetic',
      primary: '#6C5CE7',
      secondary: '#A29BFE',
      accent: '#6C5CE7',
      text: '#1A1A1A',
      textLight: '#555555',
      background: '#FFFFFF',
      surface: '#F7F4FF',
    },
    tech: {
      name: 'Tech',
      description: 'Advanced, futuristic style',
      primary: '#00F0FF',
      secondary: '#7C3AED',
      accent: '#00F0FF',
      text: '#FFFFFF',
      textLight: '#B0B0B0',
      background: '#0D0221',
      surface: '#16213E',
    },
    ecommerce: {
      name: 'E-Commerce',
      description: 'Conversion-focused retail style',
      primary: '#FF4757',
      secondary: '#FF6348',
      accent: '#FF4757',
      text: '#2F3542',
      textLight: '#57606F',
      background: '#FFFFFF',
      surface: '#F1F2F6',
    },
  },

  // ===== TYPOGRAPHY =====
  typography: {
    sansSerif: {
      name: 'Sans Serif',
      family: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      weights: {
        light: 300,
        regular: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
      },
    },
    modern: {
      name: 'Modern',
      family: '"Poppins", sans-serif',
      weights: {
        light: 300,
        regular: 400,
        medium: 600,
        semibold: 700,
        bold: 800,
      },
    },
    serif: {
      name: 'Serif',
      family: '"Playfair Display", serif',
      weights: {
        light: 300,
        regular: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
      },
    },
  },

  // ===== FONT SIZES =====
  fontSize: {
    xs: '12px',
    sm: '14px',
    base: '16px',
    lg: '18px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '30px',
    '4xl': '36px',
    '5xl': '48px',
    '6xl': '60px',
  },

  // ===== SPACING =====
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px',
    '3xl': '64px',
  },

  // ===== BORDER RADIUS =====
  radius: {
    none: '0px',
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    '2xl': '24px',
    full: '9999px',
  },

  // ===== SHADOWS =====
  shadow: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  },

  // ===== GRADIENTS =====
  gradients: {
    blueModern: 'linear-gradient(135deg, #0052CC 0%, #003D99 100%)',
    orangeCreative: 'linear-gradient(135deg, #FFA500 0%, #FF6B6B 100%)',
    purplePremium: 'linear-gradient(135deg, #6C5CE7 0%, #A29BFE 100%)',
    cyanTech: 'linear-gradient(135deg, #00F0FF 0%, #7C3AED 100%)',
    redEcommerce: 'linear-gradient(135deg, #FF4757 0%, #FF6348 100%)',
    turquoiseStartup: 'linear-gradient(135deg, #00D4FF 0%, #0A0A0A 100%)',
  },
};

// ===== GET PALETTE BY NAME =====
export const getPalette = (paletteName: string) => {
  return (
    DesignTokens.palettes[paletteName as keyof typeof DesignTokens.palettes] ||
    DesignTokens.palettes.modern
  );
};

// ===== GET TYPOGRAPHY BY NAME =====
export const getTypography = (typeName: string) => {
  return (
    DesignTokens.typography[typeName as keyof typeof DesignTokens.typography] ||
    DesignTokens.typography.sansSerif
  );
};
