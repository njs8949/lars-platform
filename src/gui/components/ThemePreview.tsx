import React, { useRef, useEffect } from 'react';

// ==================== CANVAS UTILITY FUNCTIONS ====================

interface CanvasContext {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
}

const drawRoundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
};

const drawText = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, color: string, weight: string = 'normal') => {
  ctx.font = `${weight} ${size}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
};

// ==================== WEBSITE TEMPLATES ====================

const renderMinimalWebsite = ({ ctx, width, height }: CanvasContext) => {
  // Background
  ctx.fillStyle = '#fafbfc';
  ctx.fillRect(0, 0, width, height);

  // Navigation
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, 40);
  ctx.strokeStyle = '#e0e7ff';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 40);
  ctx.lineTo(width, 40);
  ctx.stroke();

  drawText(ctx, 'M', 10, 25, 14, '#1f2937', 'bold');

  // Hero section
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 40, width, 60);
  drawText(ctx, 'Clean Design', width / 2 - 40, 65, 13, '#1f2937', 'bold');
  drawText(ctx, 'Simple and effective', width / 2 - 60, 78, 8, '#6b7280');

  // Cards
  const cardWidth = (width - 20) / 3 - 4;
  for (let i = 0; i < 3; i++) {
    const x = 10 + i * (cardWidth + 6);
    ctx.fillStyle = '#f3f4f6';
    drawRoundRect(ctx, x, 110, cardWidth, 40, 4);
    ctx.fill();
  }
};

const renderModernWebsite = ({ ctx, width, height }: CanvasContext) => {
  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#0f172a');
  gradient.addColorStop(1, '#1e293b');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Header
  ctx.fillStyle = 'rgba(100, 116, 255, 0.15)';
  ctx.fillRect(0, 0, width, 50);
  drawText(ctx, 'FEATURES', 10, 20, 9, '#94a3b8', 'bold');

  // Hero section
  ctx.fillStyle = 'rgba(100, 116, 255, 0.1)';
  ctx.fillRect(0, 50, width, 70);
  drawText(ctx, 'NEW', 10, 68, 8, '#38bdf8', 'bold');
  drawText(ctx, 'Next Generation', 10, 85, 14, '#f1f5f9', 'bold');
  drawText(ctx, 'Cutting edge technology', 10, 98, 8, '#cbd5e1');

  // Features
  const featureWidth = (width - 20) / 3 - 4;
  for (let i = 0; i < 3; i++) {
    const x = 10 + i * (featureWidth + 6);
    ctx.fillStyle = 'rgba(100, 116, 255, 0.2)';
    ctx.strokeStyle = 'rgba(100, 116, 255, 0.4)';
    ctx.lineWidth = 1;
    drawRoundRect(ctx, x, 130, featureWidth, 30, 3);
    ctx.fill();
    ctx.stroke();
  }
};

const renderElegantWebsite = ({ ctx, width, height }: CanvasContext) => {
  // Background
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#fffbeb');
  gradient.addColorStop(1, '#fef3c7');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Header
  drawText(ctx, '— ELEGANCE —', width / 2 - 45, 30, 9, '#92400e', 'bold');

  // Title
  drawText(ctx, 'Refined Beauty', width / 2 - 50, 60, 13, '#78350f', 'bold');
  drawText(ctx, 'Premium Experience', width / 2 - 60, 72, 8, '#b45309');

  // Gallery
  const imgWidth = (width - 20) / 3 - 4;
  for (let i = 0; i < 3; i++) {
    const x = 10 + i * (imgWidth + 6);
    const gradient = ctx.createLinearGradient(x, 90, x, 140);
    gradient.addColorStop(0, '#fcd34d');
    gradient.addColorStop(1, '#f59e0b');
    ctx.fillStyle = gradient;
    drawRoundRect(ctx, x, 90, imgWidth, 50, 4);
    ctx.fill();
  }
};

const renderVibrantWebsite = ({ ctx, width, height }: CanvasContext) => {
  const colors = ['#fecaca', '#a5f3fc', '#fef3c7'];
  const labels = ['Bold', 'Creative', 'Dynamic'];

  for (let i = 0; i < 3; i++) {
    const sectionWidth = width / 3;
    ctx.fillStyle = colors[i];
    ctx.fillRect(i * sectionWidth, 0, sectionWidth, height);

    // Text
    drawText(ctx, labels[i], i * sectionWidth + sectionWidth / 2 - 20, height / 2, 11, colors[i] === '#fecaca' ? '#7f1d1d' : colors[i] === '#a5f3fc' ? '#164e63' : '#78350f', 'bold');
  }
};

const renderStartupWebsite = ({ ctx, width, height }: CanvasContext) => {
  // Background
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#1f2937');
  gradient.addColorStop(1, '#111827');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Radial glow
  const radialGradient = ctx.createRadialGradient(width * 0.7, height * 0.3, 0, width * 0.7, height * 0.3, 150);
  radialGradient.addColorStop(0, 'rgba(100, 116, 255, 0.15)');
  radialGradient.addColorStop(1, 'transparent');
  ctx.fillStyle = radialGradient;
  ctx.fillRect(0, 0, width, height);

  // Title
  drawText(ctx, 'LAUNCH', width / 2 - 40, height / 2 - 10, 22, '#60a5fa', 'bold');

  // Metrics
  ctx.fillStyle = 'rgba(100, 116, 255, 0.15)';
  drawRoundRect(ctx, width / 2 - 50, height / 2 + 15, 40, 25, 3);
  ctx.fill();
  drawRoundRect(ctx, width / 2 + 10, height / 2 + 15, 40, 25, 3);
  ctx.fill();

  drawText(ctx, '300%', width / 2 - 45, height / 2 + 32, 11, '#a5f3fc', 'bold');
  drawText(ctx, '$2M+', width / 2 + 15, height / 2 + 32, 11, '#a5f3fc', 'bold');
};

const renderCorporateWebsite = ({ ctx, width, height }: CanvasContext) => {
  // Background
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#f8fafc');
  gradient.addColorStop(1, '#f0f4f8');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Nav
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, width, 30);
  drawText(ctx, 'CORP', 8, 20, 10, '#1e293b', 'bold');

  // Hero
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 30, width, 60);
  drawText(ctx, 'Enterprise Solutions', 10, 60, 13, '#0f172a', 'bold');

  // Cards
  const cardWidth = (width - 20) / 3 - 4;
  for (let i = 0; i < 3; i++) {
    const x = 10 + i * (cardWidth + 6);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    drawRoundRect(ctx, x, 100, cardWidth, 35, 4);
    ctx.fill();
    ctx.stroke();
  }
};

const renderPortfolioWebsite = ({ ctx, width, height }: CanvasContext) => {
  // Background
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  drawText(ctx, 'PORTFOLIO 2026', 10, 25, 9, '#999', 'bold');

  // Work items
  const itemWidth = (width - 20) / 2 - 3;
  for (let i = 0; i < 2; i++) {
    const x = 10 + i * (itemWidth + 6);
    const gradient = ctx.createLinearGradient(x, 50, x, 100);
    gradient.addColorStop(0, '#2d2d2d');
    gradient.addColorStop(1, '#1f1f1f');
    ctx.fillStyle = gradient;
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    drawRoundRect(ctx, x, 50, itemWidth, 50, 4);
    ctx.fill();
    ctx.stroke();
  }

  drawText(ctx, 'View All Works →', width - 80, height - 10, 8, '#666');
};

const renderEcommerceWebsite = ({ ctx, width, height }: CanvasContext) => {
  // Background
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#ffffff');
  gradient.addColorStop(1, '#f8fafc');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Header
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, 35);
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 35);
  ctx.lineTo(width, 35);
  ctx.stroke();

  drawText(ctx, 'SHOP', 10, 23, 11, '#1f2937', 'bold');

  // Products
  const productWidth = (width - 20) / 2 - 3;
  for (let i = 0; i < 2; i++) {
    const x = 10 + i * (productWidth + 6);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    drawRoundRect(ctx, x, 50, productWidth, 70, 6);
    ctx.fill();
    ctx.stroke();

    // Product image area
    ctx.fillStyle = '#e5e7eb';
    drawRoundRect(ctx, x + 4, 54, productWidth - 8, 40, 4);
    ctx.fill();

    // Product name
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(x + 4, 100, productWidth - 8, 6);
  }
};

// ==================== PRESENTATION TEMPLATES ====================

const renderCorporateSlide = ({ ctx, width, height }: CanvasContext) => {
  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#1e3a8a');
  gradient.addColorStop(1, '#1e40af');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Bottom accent bar
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(0, height - 3, width, 3);

  // Title
  drawText(ctx, 'Corporate Strategy', 10, 50, 13, '#ffffff', 'bold');
  drawText(ctx, 'Q4 Business Report 2026', 10, 65, 8, '#dbeafe');

  // Body lines
  for (let i = 0; i < 3; i++) {
    const lineWidth = i === 2 ? width - 50 : width - 30;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillRect(10, 85 + i * 12, lineWidth, 2);
  }

  // Footer
  drawText(ctx, '2026', width - 30, height - 10, 8, '#7dd3fc');
};

const renderCreativeSlide = ({ ctx, width, height }: CanvasContext) => {
  // Left side gradient
  const leftGradient = ctx.createLinearGradient(0, 0, width / 2, 0);
  leftGradient.addColorStop(0, '#f472b6');
  leftGradient.addColorStop(1, '#ec4899');
  ctx.fillStyle = leftGradient;
  ctx.fillRect(0, 0, width / 2, height);

  // Right side
  ctx.fillStyle = '#fce7f3';
  ctx.fillRect(width / 2, 0, width / 2, height);

  // Shapes
  ctx.fillStyle = 'rgba(236, 72, 153, 0.4)';
  ctx.beginPath();
  ctx.arc(width * 0.7, height / 2, 15, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.save();
  ctx.translate(width * 0.8, height / 2);
  ctx.rotate(Math.PI / 4);
  ctx.fillRect(-10, -10, 20, 20);
  ctx.restore();
};

const renderAcademicSlide = ({ ctx, width, height }: CanvasContext) => {
  // Background
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#f3f4f6');
  gradient.addColorStop(1, '#e5e7eb');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Banner
  const bannerGradient = ctx.createLinearGradient(0, 20, width, 20);
  bannerGradient.addColorStop(0, '#4f46e5');
  bannerGradient.addColorStop(1, '#7c3aed');
  ctx.fillStyle = bannerGradient;
  ctx.fillRect(0, 15, width, 20);
  drawText(ctx, 'RESEARCH DATA', width / 2 - 50, 28, 8, '#ffffff', 'bold');

  // Chart bars
  const barSpacing = width / 5;
  const heights = [60, 75, 50, 80];
  const maxHeight = 60;

  for (let i = 0; i < heights.length; i++) {
    const x = barSpacing * (i + 0.75);
    const h = (heights[i] / 100) * maxHeight;
    const gradient = ctx.createLinearGradient(x, 50 + (maxHeight - h), x, 50 + maxHeight);
    gradient.addColorStop(0, '#6366f1');
    gradient.addColorStop(1, '#4f46e5');
    ctx.fillStyle = gradient;
    ctx.fillRect(x - 8, 50 + (maxHeight - h), 16, h);
  }

  drawText(ctx, 'Figure 1.2 • Page 12', width / 2 - 40, height - 15, 7, '#6b7280');
};

const renderStartupSlide = ({ ctx, width, height }: CanvasContext) => {
  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#0f172a');
  gradient.addColorStop(1, '#1e293b');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Radial glow
  const radialGradient = ctx.createRadialGradient(width * 0.3, height * 0.5, 0, width * 0.3, height * 0.5, 120);
  radialGradient.addColorStop(0, 'rgba(100, 116, 255, 0.15)');
  radialGradient.addColorStop(1, 'transparent');
  ctx.fillStyle = radialGradient;
  ctx.fillRect(0, 0, width, height);

  // Title
  drawText(ctx, 'GROWTH', width / 2 - 35, height / 2 - 5, 20, '#60a5fa', 'bold');

  // Metrics
  drawText(ctx, '→ 300%', width / 2 - 45, height / 2 + 25, 9, '#a5f3fc', 'bold');
  drawText(ctx, '→ $2M', width / 2 + 10, height / 2 + 25, 9, '#a5f3fc', 'bold');
};

const renderMinimalSlide = ({ ctx, width, height }: CanvasContext) => {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  drawText(ctx, 'Title', width / 2 - 15, height / 2 - 30, 14, '#1f2937', 'bold');

  ctx.fillStyle = '#1f2937';
  ctx.fillRect(width / 2 - 30, height / 2 - 10, 60, 2);

  drawText(ctx, 'Content section', width / 2 - 40, height / 2 + 20, 9, '#6b7280');
};

const renderLuxurySlide = ({ ctx, width, height }: CanvasContext) => {
  // Background
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#1f2937');
  gradient.addColorStop(1, '#111827');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Image area
  const imgGradient = ctx.createLinearGradient(0, 10, 0, 70);
  imgGradient.addColorStop(0, '#a78bfa');
  imgGradient.addColorStop(1, '#c084fc');
  ctx.fillStyle = imgGradient;
  drawRoundRect(ctx, 5, 10, width - 10, 55, 6);
  ctx.fill();

  // Text
  drawText(ctx, 'Silver Gray', width / 2 - 30, height - 25, 12, '#ffffff', 'bold');
  drawText(ctx, 'Premium Design', width / 2 - 40, height - 10, 8, '#d1d5db');
};

const renderTechSlide = ({ ctx, width, height }: CanvasContext) => {
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, width, height);

  const blockSize = (width - 20) / 2 - 3;
  for (let i = 0; i < 4; i++) {
    const x = 10 + (i % 2) * (blockSize + 6);
    const y = 20 + Math.floor(i / 2) * (blockSize + 6);

    ctx.fillStyle = 'rgba(100, 116, 255, 0.2)';
    ctx.strokeStyle = 'rgba(100, 116, 255, 0.4)';
    ctx.lineWidth = 1;
    drawRoundRect(ctx, x, y, blockSize, blockSize, 4);
    ctx.fill();
    ctx.stroke();
  }
};

const renderEducationSlide = ({ ctx, width, height }: CanvasContext) => {
  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#ecfdf5');
  gradient.addColorStop(1, '#dbeafe');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Banner
  const bannerGradient = ctx.createLinearGradient(0, 15, width, 15);
  bannerGradient.addColorStop(0, '#10b981');
  bannerGradient.addColorStop(1, '#059669');
  ctx.fillStyle = bannerGradient;
  ctx.fillRect(0, 10, width, 20);
  drawText(ctx, 'LEARN', width / 2 - 20, 23, 9, '#ffffff', 'bold');

  // Content
  drawText(ctx, 'Chapter 1', 10, 55, 11, '#065f46', 'bold');

  // List items
  for (let i = 0; i < 3; i++) {
    const itemGradient = ctx.createLinearGradient(0, 75 + i * 18, width - 20, 75 + i * 18);
    itemGradient.addColorStop(0, '#10b981');
    itemGradient.addColorStop(1, '#6ee7b7');
    ctx.fillStyle = itemGradient;
    ctx.fillRect(10, 75 + i * 18, width - 20, 3);
  }
};

// ==================== DOCUMENT TEMPLATES ====================

const renderProfessionalDoc = ({ ctx, width, height }: CanvasContext) => {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, width, height);

  // Header
  drawText(ctx, 'OFFICIAL REPORT', 10, 20, 8, '#1f2937', 'bold');

  ctx.strokeStyle = '#1f2937';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(10, 28);
  ctx.lineTo(width - 10, 28);
  ctx.stroke();

  // Title
  drawText(ctx, 'Annual Review', 10, 50, 12, '#1f2937', 'bold');

  // Divider
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(10, 60);
  ctx.lineTo(width - 10, 60);
  ctx.stroke();

  // Content lines
  for (let i = 0; i < 3; i++) {
    const lineWidth = i === 2 ? width - 70 : width - 30;
    ctx.fillStyle = '#d1d5db';
    ctx.fillRect(10, 75 + i * 12, lineWidth, 2);
  }

  // Footer
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(10, height - 20);
  ctx.lineTo(width - 10, height - 20);
  ctx.stroke();

  drawText(ctx, 'Page 1 of 12 • © 2026', width / 2 - 50, height - 8, 7, '#999');
};

const renderModernDoc = ({ ctx, width, height }: CanvasContext) => {
  // Accent bar
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#646cff');
  gradient.addColorStop(1, '#a855f7');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 12, height);

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(12, 0, width - 12, height);

  // Content
  drawText(ctx, 'Project Proposal', 20, 35, 12, '#0f172a', 'bold');

  // Accent line
  const accentGradient = ctx.createLinearGradient(20, 45, width - 20, 45);
  accentGradient.addColorStop(0, '#646cff');
  accentGradient.addColorStop(1, '#a855f7');
  ctx.fillStyle = accentGradient;
  ctx.fillRect(20, 45, 60, 2);

  // Sections
  drawText(ctx, 'Overview', 20, 70, 9, '#1f2937', 'bold');
  ctx.fillStyle = '#d1d5db';
  ctx.fillRect(20, 78, width - 40, 2);

  const timelineGradient = ctx.createLinearGradient(20, 90, width - 20, 90);
  timelineGradient.addColorStop(0, '#60a5fa');
  timelineGradient.addColorStop(0.5, '#34d399');
  timelineGradient.addColorStop(1, '#fbbf24');
  ctx.fillStyle = timelineGradient;
  ctx.fillRect(20, 90, width - 40, 3);
};

const renderCreativeDoc = ({ ctx, width, height }: CanvasContext) => {
  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#fef3c7');
  gradient.addColorStop(1, '#fde68a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Left border
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(0, 0, 3, height);

  // Color palette
  const colors = ['#fbbf24', '#f59e0b', '#d97706'];
  const paletteSize = (width - 40) / 3 - 2;

  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = colors[i];
    drawRoundRect(ctx, 10 + i * (paletteSize + 4), 15, paletteSize, 20, 2);
    ctx.fill();
  }

  // Text
  drawText(ctx, 'Brand Guide', 10, 55, 11, '#78350f', 'bold');

  ctx.fillStyle = '#d97706';
  ctx.fillRect(10, 62, 40, 2);
};

const renderMinimalDoc = ({ ctx, width, height }: CanvasContext) => {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Title
  drawText(ctx, 'Document', width / 2 - 35, height / 2 - 30, 15, '#1f2937', 'bold');

  // Underline
  ctx.fillStyle = '#1f2937';
  ctx.fillRect(width / 2 - 35, height / 2 - 15, 70, 2);

  // Content lines
  for (let i = 0; i < 2; i++) {
    ctx.fillStyle = '#e5e7eb';
    ctx.fillRect(width / 2 - 40, height / 2 + i * 12, 80, 2);
  }
};

const renderAcademicDoc = ({ ctx, width, height }: CanvasContext) => {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Left border
  ctx.fillStyle = '#4f46e5';
  ctx.fillRect(0, 0, 4, height);

  // Header
  drawText(ctx, 'THESIS', 10, 20, 8, '#1f2937', 'bold');

  ctx.strokeStyle = '#4f46e5';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(10, 28);
  ctx.lineTo(width - 10, 28);
  ctx.stroke();

  // Content
  drawText(ctx, 'Research Title', 15, 50, 11, '#1f2937', 'bold');

  ctx.fillStyle = '#d1d5db';
  ctx.fillRect(15, 60, width - 30, 2);
  ctx.fillRect(15, 68, width - 50, 2);
};

const renderFinancialDoc = ({ ctx, width, height }: CanvasContext) => {
  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#f8fafc');
  gradient.addColorStop(1, '#f1f5f9');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Top border
  ctx.fillStyle = '#065f46';
  ctx.fillRect(0, 0, width, 3);

  // Header
  drawText(ctx, 'FINANCIAL', 10, 20, 8, '#1f2937', 'bold');

  ctx.strokeStyle = '#065f46';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(10, 28);
  ctx.lineTo(width - 10, 28);
  ctx.stroke();

  // Table rows
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = '#d1d5db';
    ctx.fillRect(10, 45 + i * 20, (width - 30) / 2, 2);
    ctx.fillRect(10 + (width - 30) / 2 + 5, 45 + i * 20, (width - 30) / 2 - 5, 2);
  }
};

const renderProposalDoc = ({ ctx, width, height }: CanvasContext) => {
  // Background
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#f3f4f6');
  gradient.addColorStop(1, '#e5e7eb');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Left border
  ctx.fillStyle = '#1f2937';
  ctx.fillRect(0, 0, 3, height);

  // Header
  ctx.fillStyle = '#1f2937';
  ctx.fillRect(0, 10, width, 25);
  drawText(ctx, 'PROPOSAL 2026', width / 2 - 50, 28, 8, '#ffffff', 'bold');

  // Content
  drawText(ctx, 'Executive Summary', 10, 55, 10, '#1f2937', 'bold');

  for (let i = 0; i < 2; i++) {
    ctx.fillStyle = '#d1d5db';
    ctx.fillRect(10, 70 + i * 12, width - 30, 2);
  }
};

const renderInvoiceDoc = ({ ctx, width, height }: CanvasContext) => {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, width, height);

  // Header
  drawText(ctx, 'INVOICE', 10, 20, 9, '#1f2937', 'bold');

  ctx.strokeStyle = '#1f2937';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(10, 28);
  ctx.lineTo(width - 10, 28);
  ctx.stroke();

  // Items
  for (let i = 0; i < 2; i++) {
    ctx.fillStyle = '#d1d5db';
    ctx.fillRect(10, 45 + i * 20, (width - 30) / 2, 2);
    ctx.fillRect(10 + (width - 30) / 2 + 5, 45 + i * 20, (width - 30) / 2 - 5, 2);
  }

  // Total
  ctx.fillStyle = '#f3f4f6';
  ctx.fillRect(10, height - 25, width - 20, 15);
};

// ==================== REACT COMPONENTS ====================

export const WebsiteThemePreview: React.FC<{ name: string }> = ({ name }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const renderFunctions: { [key: string]: (ctx: CanvasContext) => void } = {
    minimal: renderMinimalWebsite,
    modern: renderModernWebsite,
    elegant: renderElegantWebsite,
    vibrant: renderVibrantWebsite,
    startup: renderStartupWebsite,
    corporate: renderCorporateWebsite,
    portfolio: renderPortfolioWebsite,
    ecommerce: renderEcommerceWebsite,
    // Additional templates mapped to similar styles
    'saas-pro': renderModernWebsite,
    'magazine-web': renderMinimalWebsite,
    'restaurant-web': renderElegantWebsite,
    'agency-web': renderCorporateWebsite,
    'real-estate': renderPortfolioWebsite,
    'medical-web': renderMinimalWebsite,
    'education-web': renderCorporateWebsite,
    'portfolio-pro': renderPortfolioWebsite,
    'landing-page': renderModernWebsite,
    'community-web': renderVibrantWebsite,
    'nft-gallery': renderVibrantWebsite,
    marketplace: renderEcommerceWebsite,
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = 280 * dpr;
    canvas.height = 280 * dpr;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);

    const renderFn = renderFunctions[name];
    if (renderFn) {
      renderFn({ ctx, width: 280, height: 280 });
    }
  }, [name]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', borderRadius: '8px' }} />;
};

export const PresentationThemePreview: React.FC<{ name: string }> = ({ name }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const renderFunctions: { [key: string]: (ctx: CanvasContext) => void } = {
    corporate: renderCorporateSlide,
    creative: renderCreativeSlide,
    academic: renderAcademicSlide,
    startup: renderStartupSlide,
    'startup-pres': renderStartupSlide,
    minimal: renderMinimalSlide,
    'minimal-pres': renderMinimalSlide,
    luxury: renderLuxurySlide,
    tech: renderTechSlide,
    education: renderEducationSlide,
    // Additional presentation templates mapped to similar styles
    'marketing-pres': renderCreativeSlide,
    'finance-pres': renderCorporateSlide,
    'medical-pres': renderAcademicSlide,
    'portfolio-pres': renderCreativeSlide,
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = 280 * dpr;
    canvas.height = 280 * dpr;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);

    const renderFn = renderFunctions[name];
    if (renderFn) {
      renderFn({ ctx, width: 280, height: 280 });
    }
  }, [name]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', borderRadius: '8px' }} />;
};

export const DocumentThemePreview: React.FC<{ name: string }> = ({ name }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const renderFunctions: { [key: string]: (ctx: CanvasContext) => void } = {
    professional: renderProfessionalDoc,
    modern: renderModernDoc,
    'modern-doc': renderModernDoc,
    creative: renderCreativeDoc,
    'creative-doc': renderCreativeDoc,
    minimal: renderMinimalDoc,
    'minimal-doc': renderMinimalDoc,
    academic: renderAcademicDoc,
    'academic-doc': renderAcademicDoc,
    financial: renderFinancialDoc,
    proposal: renderProposalDoc,
    invoice: renderInvoiceDoc,
    // Additional document templates mapped to similar styles
    contract: renderProfessionalDoc,
    resume: renderModernDoc,
    manual: renderProfessionalDoc,
    report: renderFinancialDoc,
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = 280 * dpr;
    canvas.height = 280 * dpr;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);

    const renderFn = renderFunctions[name];
    if (renderFn) {
      renderFn({ ctx, width: 280, height: 280 });
    }
  }, [name]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', borderRadius: '8px' }} />;
};
