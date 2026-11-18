import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface HelpTooltipProps {
  title: string;
  description: string;
  examples?: string[];
  tips?: string[];
}

export default function HelpTooltip({ title, description, examples, tips }: HelpTooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '2px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <HelpCircle size={16} color="#64c8ff" style={{ opacity: 0.7 }} />
      </button>

      {showTooltip && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginTop: '8px',
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.98) 0%, rgba(15, 23, 42, 0.98) 100%)',
          border: '1px solid rgba(100, 200, 255, 0.3)',
          borderRadius: '8px',
          padding: '12px',
          minWidth: '250px',
          maxWidth: '300px',
          zIndex: 10000,
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(10px)'
        }}>
          {/* 제목 */}
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#64c8ff', marginBottom: '6px' }}>
            {title}
          </div>

          {/* 설명 */}
          <div style={{ fontSize: '11px', color: '#e0e0e0', marginBottom: '8px', lineHeight: '1.4' }}>
            {description}
          </div>

          {/* 예제 */}
          {examples && examples.length > 0 && (
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '10px', fontWeight: '600', color: '#ffd700', marginBottom: '4px' }}>
                💡 예제:
              </div>
              {examples.map((example, idx) => (
                <div key={idx} style={{ fontSize: '10px', color: 'rgba(224, 224, 224, 0.7)', marginBottom: '2px' }}>
                  • {example}
                </div>
              ))}
            </div>
          )}

          {/* 팁 */}
          {tips && tips.length > 0 && (
            <div>
              <div style={{ fontSize: '10px', fontWeight: '600', color: '#ffd700', marginBottom: '4px' }}>
                ✨ 팁:
              </div>
              {tips.map((tip, idx) => (
                <div key={idx} style={{ fontSize: '10px', color: 'rgba(224, 224, 224, 0.7)', marginBottom: '2px' }}>
                  • {tip}
                </div>
              ))}
            </div>
          )}

          {/* 화살표 */}
          <div style={{
            position: 'absolute',
            top: '-4px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '8px',
            height: '8px',
            background: 'rgba(30, 41, 59, 0.98)',
            border: '1px solid rgba(100, 200, 255, 0.3)',
            borderBottom: 'none',
            borderRight: 'none',
            transform: 'translateX(-50%) rotate(45deg)'
          }} />
        </div>
      )}
    </div>
  );
}
