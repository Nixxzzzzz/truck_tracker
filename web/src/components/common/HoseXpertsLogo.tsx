import React from 'react';

interface Props {
  variant?: 'white' | 'blue' | 'compact';
  height?: number;
  showTagline?: boolean;
}

export const HoseXpertsLogo: React.FC<Props> = ({
  variant = 'blue',
  height = 36,
  showTagline = true
}) => {
  const isWhite = variant === 'white';
  const textColor = isWhite ? '#FFFFFF' : '#1764A8';
  const accentColor = isWhite ? '#7CC0F1' : '#0E477A';
  const taglineColor = isWhite ? 'rgba(255, 255, 255, 0.85)' : '#667085';

  if (variant === 'compact') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <svg width={height} height={height * 0.85} viewBox="0 0 48 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Stylized Flexible Hose Speed Lines */}
          <path d="M4 8H36L32 14H0L4 8Z" fill="#1764A8" />
          <path d="M8 16H42L38 22H4L8 16Z" fill="#1B78C7" />
          <path d="M12 24H46L42 30H8L12 24Z" fill="#2994E8" />
          <circle cx="28" cy="19" r="3.5" fill="#FFFFFF" />
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '1.05rem', fontWeight: 900, letterSpacing: '-0.03em', color: '#1764A8', lineHeight: 1 }}>
            HOSE<span style={{ color: '#0E477A', fontStyle: 'italic' }}>XPERTS</span>
          </span>
          <span style={{ fontSize: '0.58rem', fontWeight: 600, color: '#667085', letterSpacing: '0.02em' }}>
            FLEET OPERATIONS
          </span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: showTagline ? '2px' : '0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Hose Ribbons Emblem */}
        <svg width={height * 1.1} height={height * 0.85} viewBox="0 0 54 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 7H40L35 13H0L2 7Z" fill={isWhite ? '#FFFFFF' : '#1764A8'} opacity="0.95" />
          <path d="M6 15H46L41 21H3L6 15Z" fill={isWhite ? '#BCE0FD' : '#1D78C9'} />
          <path d="M10 23H52L47 29H7L10 23Z" fill={isWhite ? '#7CC0F1' : '#2A95E9'} />
          <circle cx="32" cy="18" r="3" fill={isWhite ? '#1764A8' : '#FFFFFF'} />
        </svg>

        {/* Brand Text */}
        <div style={{ display: 'flex', alignItems: 'baseline' }}>
          <span
            style={{
              fontSize: `${height * 0.58}px`,
              fontWeight: 900,
              letterSpacing: '-0.02em',
              color: textColor,
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
            }}
          >
            HOSE
          </span>
          <span
            style={{
              fontSize: `${height * 0.58}px`,
              fontWeight: 900,
              fontStyle: 'italic',
              letterSpacing: '-0.02em',
              color: accentColor,
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
              marginLeft: '1px'
            }}
          >
            XPERTS
          </span>
        </div>
      </div>

      {showTagline && (
        <div
          style={{
            fontSize: `${Math.max(9, height * 0.24)}px`,
            color: taglineColor,
            fontWeight: 600,
            letterSpacing: '0.01em',
            fontFamily: 'Inter, sans-serif',
            whiteSpace: 'nowrap'
          }}
        >
          One Stop Solution For Flexible Hoses
        </div>
      )}
    </div>
  );
};
