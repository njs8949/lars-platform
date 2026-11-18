import React from 'react';
import { LucideIcon, Gauge, Zap, Clock, Check, Globe, Users, Eye, TrendingUp, Mail, Grid, History, Layout, Wand2, Smartphone, Layers, Sparkles, FileText, Radio, RefreshCw, Rocket, Activity, Palette, Copy, Mic, Volume2, GitBranch, ClipboardList, BarChart3, Glasses, Headset, Box } from "lucide-react";
import PresentationSvgIcon from './icons/PresentationSvgIcon';
import '../styles/GlassmorphicIcon.css';

interface GlassmorphicIconProps {
  icon?: string | LucideIcon;
  Icon?: LucideIcon;
  gradient: string;
  size?: number;
  className?: string;
}

const iconMap: { [key: string]: LucideIcon } = {
  'Gauge': Gauge, 'Zap': Zap, 'Clock': Clock, 'Check': Check, 'Globe': Globe,
  'Users': Users, 'Eye': Eye, 'TrendingUp': TrendingUp, 'Mail': Mail, 'Grid': Grid,
  'History': History, 'Layout': Layout, 'Wand2': Wand2, 'Smartphone': Smartphone,
  'Layers': Layers, 'Sparkles': Sparkles, 'FileText': FileText, 'Radio': Radio,
  'RefreshCw': RefreshCw, 'Rocket': Rocket, 'Activity': Activity, 'Palette': Palette,
  'Copy': Copy, 'Mic': Mic, 'Volume2': Volume2, 'GitBranch': GitBranch,
  'ClipboardList': ClipboardList, 'BarChart3': BarChart3, 'Presentation': PresentationSvgIcon,
  'Glasses': Glasses, 'Headset': Headset, 'Box': Box
};

export const GlassmorphicIcon: React.FC<GlassmorphicIconProps> = ({
  icon,
  Icon,
  gradient,
  size = 40,
  className = ""
}) => {
  const resolvedIcon = typeof icon === 'string' ? iconMap[icon] : (icon || Icon);

  // VR/AR 아이콘 폴백
  if (!resolvedIcon) {
    return (
      <div className={`glass-icon-wrapper ${className}`} style={{ width: size, height: size }}>
        <div className="glass-icon-container" style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #ec4899 100%)' }}>
          <div className="glass-icon-frosted" />
          <div className="glass-icon-highlight" />
          <div className="glass-icon-content">
            {React.createElement(Headset, { size: size * 0.6, color: 'white', strokeWidth: 2 })}
          </div>
        </div>
        <div className="glass-icon-glow" style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #ec4899 100%)' }} />
      </div>
    );
  }
  // gradient prop is something like "from-blue-400 to-indigo-500"
  // We need to map these to actual CSS linear-gradients
  // Tailwind 색 이름을 실제 색으로 바꾸는 표 (400=밝은 쪽, 500=진한 쪽)
  const TW: Record<string, { 400: string; 500: string }> = {
    red: { 400: '#f87171', 500: '#ef4444' },
    orange: { 400: '#fb923c', 500: '#f97316' },
    amber: { 400: '#fbbf24', 500: '#f59e0b' },
    lime: { 400: '#a3e635', 500: '#84cc16' },
    green: { 400: '#4ade80', 500: '#22c55e' },
    emerald: { 400: '#34d399', 500: '#10b981' },
    teal: { 400: '#2dd4bf', 500: '#14b8a6' },
    cyan: { 400: '#22d3ee', 500: '#06b6d4' },
    sky: { 400: '#38bdf8', 500: '#0ea5e9' },
    blue: { 400: '#60a5fa', 500: '#3b82f6' },
    indigo: { 400: '#818cf8', 500: '#6366f1' },
    violet: { 400: '#a78bfa', 500: '#8b5cf6' },
    purple: { 400: '#c084fc', 500: '#a855f7' },
    pink: { 400: '#f472b6', 500: '#ec4899' },
    rose: { 400: '#fb7185', 500: '#f43f5e' },
  };

  const getGradient = (g: string) => {
    // 표에 있는 색 이름(from-색-400, to-색-500)이면 그대로 그라데이션을 만든다
    const from = g.match(/from-([a-z]+)-(\d+)/);
    const to = g.match(/to-([a-z]+)-(\d+)/);
    if (from && to && TW[from[1]] && TW[to[1]]) {
      return `linear-gradient(135deg, ${TW[from[1]][400]} 0%, ${TW[to[1]][500]} 100%)`;
    }
    // Blue gradients
    if (g.includes('from-blue-400') && g.includes('to-cyan-500')) return 'linear-gradient(135deg, #60a5fa 0%, #06b6d4 100%)';
    if (g.includes('from-blue-400') && g.includes('to-indigo-500')) return 'linear-gradient(135deg, #60a5fa 0%, #6366f1 100%)';
    if (g.includes('from-blue-400') && g.includes('to-purple-500')) return 'linear-gradient(135deg, #60a5fa 0%, #a855f7 100%)';

    // Emerald gradients
    if (g.includes('from-emerald-400') && g.includes('to-teal-500')) return 'linear-gradient(135deg, #34d399 0%, #14b8a6 100%)';

    // Orange gradients
    if (g.includes('from-orange-400') && g.includes('to-red-500')) return 'linear-gradient(135deg, #fb923c 0%, #ef4444 100%)';

    // Yellow gradients
    if (g.includes('from-yellow-400') && g.includes('to-orange-500')) return 'linear-gradient(135deg, #facc15 0%, #f97316 100%)';

    // Green gradients
    if (g.includes('from-green-400') && g.includes('to-cyan-500')) return 'linear-gradient(135deg, #4ade80 0%, #06b6d4 100%)';

    // Gray gradients
    if (g.includes('from-gray-400') && g.includes('to-slate-600')) return 'linear-gradient(135deg, #9ca3af 0%, #475569 100%)';

    // Pink gradients
    if (g.includes('from-pink-400') && g.includes('to-red-500')) return 'linear-gradient(135deg, #f472b6 0%, #ef4444 100%)';

    // Purple gradients
    if (g.includes('from-purple-400') && g.includes('to-pink-500')) return 'linear-gradient(135deg, #c084fc 0%, #ec4899 100%)';

    // Indigo gradients (VR/AR)
    if (g.includes('from-indigo-400') && g.includes('to-purple-500')) return 'linear-gradient(135deg, #818cf8 0%, #a855f7 100%)';

    // Fallback
    return 'linear-gradient(135deg, #60a5fa 0%, #a855f7 100%)';
  };

  return (
    <div className={`glass-icon-wrapper ${className}`} style={{ width: size, height: size }}>
      <div className="glass-icon-container" style={{ background: getGradient(gradient) }}>
        <div className="glass-icon-frosted" />
        <div className="glass-icon-highlight" />
        <div className="glass-icon-content">
          {React.createElement(resolvedIcon, { size: size * 0.6, color: 'white', strokeWidth: 2 })}
        </div>
      </div>
      <div className="glass-icon-glow" style={{ background: getGradient(gradient) }} />
    </div>
  );
};
