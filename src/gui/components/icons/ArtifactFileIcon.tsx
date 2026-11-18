import React from 'react';

// 내려받기 버튼의 파일 아이콘. .pptx는 프리젠테이션 모양, 그 밖의 파일은 문서 모양을 쓴다.
export const ArtifactFileIcon: React.FC<{ kind?: 'presentation' | 'document'; size?: number; color?: string }> = ({
  kind = 'document',
  size = 16,
  color = 'currentColor',
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8}
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"
    style={{ verticalAlign: 'middle', marginRight: 6, flexShrink: 0 }}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5" />
    {kind === 'presentation' ? (
      <>
        <rect x="8.5" y="11" width="1.8" height="3" rx="0.4" fill={color} stroke="none" />
        <rect x="11.1" y="9.5" width="1.8" height="4.5" rx="0.4" fill={color} stroke="none" />
        <rect x="13.7" y="8" width="1.8" height="6" rx="0.4" fill={color} stroke="none" />
      </>
    ) : (
      <>
        <path d="M9 13h6" />
        <path d="M9 16h6" />
      </>
    )}
  </svg>
);

export default ArtifactFileIcon;
