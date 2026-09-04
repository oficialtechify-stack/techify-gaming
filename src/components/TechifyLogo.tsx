import React from 'react';

interface TechifyLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showIcon?: boolean;
}

export const TechifyLogo: React.FC<TechifyLogoProps> = ({ 
  className = '', 
  size = 'md',
  showIcon = true
}) => {
  // Scale for responsiveness
  const dimensions = {
    sm: { height: 36, emblemSize: 32, fontSize: 'text-lg', subSize: 'text-[8px]', gap: 'gap-2.5' },
    md: { height: 46, emblemSize: 40, fontSize: 'text-2xl', subSize: 'text-[9px]', gap: 'gap-3' },
    lg: { height: 60, emblemSize: 52, fontSize: 'text-3xl', subSize: 'text-[10px]', gap: 'gap-3.5' },
    xl: { height: 78, emblemSize: 68, fontSize: 'text-4xl', subSize: 'text-xs', gap: 'gap-4' },
  };

  const currentDim = dimensions[size];

  return (
    <div 
      className={`inline-flex items-center select-none ${currentDim.gap} ${className}`} 
      id="leadspay-brand-logo"
    >
      {/* 3D Precision Vector Emblem */}
      {showIcon && (
        <div 
          className="relative flex-shrink-0 flex items-center justify-center"
          style={{ width: `${currentDim.emblemSize}px`, height: `${currentDim.emblemSize}px` }}
        >
          {/* Subtle Backlight */}
          <div className="absolute inset-0 bg-[#D4F01A]/30 rounded-full blur-md" />

          {/* Precision 3D Vector Emblem */}
          <svg 
            viewBox="0 0 100 100" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full relative z-10 drop-shadow-[0_2px_8px_rgba(212,240,26,0.5)]"
          >
            <defs>
              <linearGradient id="emblemGradMain" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F5FF7A" />
                <stop offset="30%" stopColor="#D8F420" />
                <stop offset="70%" stopColor="#A8CE08" />
                <stop offset="100%" stopColor="#6C8C00" />
              </linearGradient>
              <linearGradient id="emblemLightningGrad" x1="10%" y1="90%" x2="90%" y2="10%">
                <stop offset="0%" stopColor="#D8F420" />
                <stop offset="45%" stopColor="#FFFFFF" />
                <stop offset="65%" stopColor="#E5FF52" />
                <stop offset="100%" stopColor="#A5CE00" />
              </linearGradient>
              <linearGradient id="emblemRim" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
                <stop offset="50%" stopColor="#D8F420" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#4A6000" stopOpacity="0.8" />
              </linearGradient>
            </defs>

            {/* Dark bevel background for 3D depth */}
            <path 
              d="M 22 48 C 18 32, 28 16, 48 12 C 64 8, 76 18, 80 32 L 68 40 C 66 32, 56 24, 44 26 C 34 28, 30 36, 32 46 Z" 
              fill="#2E3C00" 
            />
            <path 
              d="M 78 52 C 82 68, 72 84, 52 88 C 36 92, 24 82, 20 68 L 32 60 C 34 68, 44 76, 56 74 C 66 72, 70 64, 68 54 Z" 
              fill="#2E3C00" 
            />

            {/* Top Wing */}
            <path 
              d="M 20 46 C 16 30, 26 14, 46 10 C 62 6, 76 16, 80 30 L 70 38 C 66 28, 56 20, 44 22 C 32 24, 28 34, 30 44 Z" 
              fill="url(#emblemGradMain)" 
              stroke="url(#emblemRim)" 
              strokeWidth="0.75" 
            />

            {/* Bottom Wing */}
            <path 
              d="M 80 54 C 84 70, 74 86, 54 90 C 38 94, 24 84, 20 70 L 30 62 C 34 72, 44 80, 56 78 C 68 76, 72 66, 70 56 Z" 
              fill="url(#emblemGradMain)" 
              stroke="url(#emblemRim)" 
              strokeWidth="0.75" 
            />

            {/* Central Lightning Diagonal */}
            <path 
              d="M 6 88 L 24 70 L 38 70 L 50 54 L 42 54 L 54 36 L 68 36 L 94 6 L 78 32 L 64 32 L 52 48 L 60 48 L 48 66 L 34 66 Z" 
              fill="url(#emblemLightningGrad)" 
              stroke="#FFFFFF" 
              strokeWidth="0.6" 
            />
          </svg>
        </div>
      )}

      {/* Brand Wordmark: LeadsPay */}
      <div className="flex flex-col justify-center leading-none">
        <div className={`font-['Syne'] font-black tracking-tight uppercase ${currentDim.fontSize}`}>
          <span className="text-[#D4F01A] drop-shadow-[0_0_12px_rgba(212,240,26,0.35)]">LEADS</span>
          <span className="text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">PAY</span>
        </div>
        <span className={`font-bold tracking-[0.25em] text-[#D4F01A]/70 uppercase mt-0.5 ${currentDim.subSize}`}>
          PAYMENTS & SPLIT
        </span>
      </div>
    </div>
  );
};

export const LeadsPayLogo = TechifyLogo;
