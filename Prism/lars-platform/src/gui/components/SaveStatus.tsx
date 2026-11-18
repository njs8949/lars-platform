import React from 'react';

export type SaveState = { kind: 'success' | 'error'; text: string } | null;

// 저장 결과를 한 줄짜리 알림으로 보여 준다. 줄바꿈 없이 아이콘과 문구를 나란히 둔다.
export const SaveStatus: React.FC<{ status: SaveState; compact?: boolean }> = ({ status, compact = false }) => {
  if (!status) return null;
  const success = status.kind === 'success';
  const color = success ? '#34d399' : '#f87171';
  const background = success ? 'rgba(52, 211, 153, 0.12)' : 'rgba(248, 113, 113, 0.12)';
  const border = success ? 'rgba(52, 211, 153, 0.35)' : 'rgba(248, 113, 113, 0.35)';
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: compact ? '6px 12px' : '8px 14px',
        borderRadius: 999,
        background,
        border: `1px solid ${border}`,
        color,
        fontSize: compact ? 13 : 14,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        animation: 'saveStatusIn 0.25s ease-out',
      }}
    >
      <svg width={compact ? 16 : 18} height={compact ? 16 : 18} viewBox="0 0 24 24" fill="none" stroke={color}
        strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
        {success ? (
          <>
            <circle cx="12" cy="12" r="9.5" />
            <path d="M7.8 12.4l2.7 2.7 5.7-6" />
          </>
        ) : (
          <>
            <circle cx="12" cy="12" r="9.5" />
            <path d="M12 7.5v5.5" />
            <path d="M12 16.4h.01" />
          </>
        )}
      </svg>
      <span>{status.text}</span>
      <style>{`@keyframes saveStatusIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }`}</style>
    </div>
  );
};

export default SaveStatus;
