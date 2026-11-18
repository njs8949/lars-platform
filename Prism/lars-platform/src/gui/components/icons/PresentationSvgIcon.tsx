import React from 'react';

// 발표 자료 전용 아이콘: 스크린 위에 올라가는 막대 그래프와 받침대
export const PresentationSvgIcon: React.FC<{
  size?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
  style?: React.CSSProperties;
}> = ({ size = 24, color = 'currentColor', strokeWidth = 1.8, className, style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={style}
    aria-hidden="true"
    focusable="false"
  >
    <rect x="2.5" y="3" width="19" height="13.5" rx="2.5" />
    <rect x="7" y="10.5" width="2.6" height="3.5" rx="0.6" fill={color} stroke="none" />
    <rect x="10.7" y="8" width="2.6" height="6" rx="0.6" fill={color} stroke="none" />
    <rect x="14.4" y="5.5" width="2.6" height="8.5" rx="0.6" fill={color} stroke="none" />
    <path d="M12 16.5V20" />
    <path d="M8 20.5h8" />
  </svg>
);

export default PresentationSvgIcon;
