import React from 'react';

type LogoProps = {
  size?: number; // approximate height of the mark in px
  className?: string;
  text?: string;
  compact?: boolean; // when true, hide text label
};

export const Logo: React.FC<LogoProps> = ({ size = 28, className = '', text = 'Workday Suite', compact = false }) => {
  const markSize = Math.round(size);
  const svgWidth = Math.round(markSize * 1.1);

  return (
    <div className={className} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <svg
        width={svgWidth}
        height={markSize}
        viewBox={`0 0 ${svgWidth} ${markSize}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="g1" x1="0" x2="1">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#16a34a" />
          </linearGradient>
        </defs>
        {/* three rounded strokes to mimic the Workday mark */}
        <rect x="1" y="2" rx="4" ry="4" width="6" height={markSize - 4} fill="url(#g1)" transform={`translate(0,0) rotate(-12 ${4} ${markSize/2})`} />
        <rect x="10" y="2" rx="4" ry="4" width="6" height={markSize - 4} fill="url(#g1)" transform={`translate(0,0) rotate(-12 ${13} ${markSize/2})`} />
        <rect x="19" y="2" rx="4" ry="4" width="6" height={markSize - 4} fill="url(#g1)" transform={`translate(0,0) rotate(-12 ${22} ${markSize/2})`} />
      </svg>

      {!compact && (
        <span className="select-none" style={{ color: '#E6EEF5', fontWeight: 700, fontSize: Math.round(size * 0.66) }}>
          {text}
        </span>
      )}
    </div>
  );
};

export default Logo;
