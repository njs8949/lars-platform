import React from 'react';
import { LucideIcon } from "lucide-react";

interface GlassmorphicIconProps {
  Icon: LucideIcon;
  gradient: string;
  size?: number;
  className?: string;
}

export const GlassmorphicIcon: React.FC<GlassmorphicIconProps> = ({ 
  Icon, 
  gradient, 
  size = 40,
  className = "" 
}) => {
  // gradient prop is something like "from-blue-400 to-indigo-500"
  // We need to map these to actual CSS linear-gradients
  const getGradient = (g: string) => {
    if (g.includes('from-blue-400')) return 'linear-gradient(135deg, #60a5fa, #6366f1)';
    if (g.includes('from-amber-400')) return 'linear-gradient(135deg, #fbbf24, #f59e0b)';
    if (g.includes('from-purple-400')) return 'linear-gradient(135deg, #c084fc, #db2777)';
    if (g.includes('from-indigo-500')) return 'linear-gradient(135deg, #6366f1, #9333ea)';
    if (g.includes('from-violet-400')) return 'linear-gradient(135deg, #a78bfa, #7c3aed)';
    if (g.includes('from-green-400')) return 'linear-gradient(135deg, #4ade80, #22c55e)';
    if (g.includes('from-orange-400')) return 'linear-gradient(135deg, #fb923c, #ef4444)';
    if (g.includes('from-slate-400')) return 'linear-gradient(135deg, #94a3b8, #475569)';
    if (g.includes('from-yellow-400')) return 'linear-gradient(135deg, #facc15, #f59e0b)';
    if (g.includes('from-gray-400')) return 'linear-gradient(135deg, #9ca3af, #4b5563)';
    if (g.includes('from-emerald-400')) return 'linear-gradient(135deg, #34d399, #059669)';
    return 'linear-gradient(135deg, #646cff, #a855f7)';
  };

  return (
    <div className={`glass-icon-wrapper ${className}`} style={{ width: size, height: size }}>
      <div className="glass-icon-container" style={{ background: getGradient(gradient) }}>
        <div className="glass-icon-frosted" />
        <div className="glass-icon-highlight" />
        <div className="glass-icon-content">
          <Icon size={size * 0.6} color="white" />
        </div>
      </div>
      <div className="glass-icon-glow" style={{ background: getGradient(gradient) }} />
    </div>
  );
};
