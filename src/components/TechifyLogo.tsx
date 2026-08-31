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
  // Height scale for responsiveness
  const dimensions = {
    sm: { height: 38, emblemSize: 32 },
    md: { height: 48, emblemSize: 42 },
    lg: { height: 64, emblemSize: 56 },
    xl: { height: 84, emblemSize: 74 },
  };

  const currentDim = dimensions[size];

  return (
    <div 
      className={`inline-flex items-center gap-2.5 sm:gap-3.5 select-none ${className}`} 
      id="techify-gaming-brand-logo"
    >
      {/* 3D Metallic Emblem matching the user image */}
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

            {/* Central Lightning Diagonal (bottom-left to top-right spike) */}
            <path 
              d="M 6 88 L 24 70 L 38 70 L 50 54 L 42 54 L 54 36 L 68 36 L 94 6 L 78 32 L 64 32 L 52 48 L 60 48 L 48 66 L 34 66 Z" 
              fill="url(#emblemLightningGrad)" 
              stroke="#FFFFFF" 
              strokeWidth="0.6" 
            />
          </svg>
        </div>
      )}

      {/* Stacked Wordmark: "TECHIFY" on top, "GAMING" on bottom */}
      <svg 
        viewBox="0 0 250 82" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        style={{ height: `${currentDim.height}px`, width: 'auto' }}
        className="object-contain"
      >
        <defs>
          <linearGradient id="techifyWordmarkColor" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#D4F01A" />
            <stop offset="100%" stopColor="#D4F01A" />
          </linearGradient>
        </defs>

        {/* LINE 1: TECHIFY */}
        <g fill="#D4F01A">
          {/* T */}
          <path d="M 4 2 L 38 2 L 38 12.5 L 26 12.5 L 26 38 L 16 38 L 16 12.5 L 4 12.5 Z" />

          {/* E */}
          <path d="M 44 2 L 74 2 L 74 12 L 54 12 L 54 16 L 71 16 L 71 24.5 L 54 24.5 L 54 28 L 75 28 L 75 38 L 44 38 Z" />

          {/* C */}
          <path d="M 112 13 L 102 13 C 99 11 96 10.5 93 10.5 C 86.5 10.5 82 14.5 82 20 C 82 25.5 86.5 29.5 93 29.5 C 96 29.5 99 29 102 27 L 112 27 C 108 35 101 39 93 39 C 80 39 70.5 31 70.5 20 C 70.5 9 80 1 93 1 C 101 1 108 5 112 13 Z" />

          {/* H */}
          <path d="M 118 2 L 128.5 2 L 128.5 15.5 L 146.5 15.5 L 146.5 2 L 157 2 L 157 38 L 146.5 38 L 146.5 24.5 L 128.5 24.5 L 128.5 38 L 118 38 Z" />

          {/* I */}
          <path d="M 164 2 L 174.5 2 L 174.5 38 L 164 38 Z" />

          {/* F */}
          <path d="M 181 2 L 211 2 L 211 12 L 191.5 12 L 191.5 16.5 L 208 16.5 L 208 25 L 191.5 25 L 191.5 38 L 181 38 Z" />

          {/* Y */}
          <path d="M 213 2 L 225 2 L 233 17.5 L 241 2 L 253 2 L 239 22.5 L 239 38 L 227 38 L 227 22.5 Z" />
        </g>

        {/* LINE 2: GAMING */}
        <g fill="#D4F01A" transform="translate(14, 43)">
          {/* G */}
          <path d="M 40 18.5 L 28 18.5 L 28 23.5 L 34 23.5 C 33 26 30 27.5 26 27.5 C 20 27.5 15.5 23 15.5 17.5 C 15.5 12 20 7.5 26 7.5 C 29.5 7.5 32 9 34 11.5 L 42 7.5 C 38 2.5 32 0 26 0 C 13.5 0 4.5 9 4.5 17.5 C 4.5 26 13.5 35 26 35 C 35 35 42 29 42 18.5 Z" />

          {/* A */}
          <path d="M 64 0 L 75 0 L 86 35 L 74.5 35 L 72 26 L 57 26 L 54.5 35 L 43 35 Z M 64.5 8 L 59.5 20 L 69.5 20 Z" />

          {/* M */}
          <path d="M 91 0 L 102 0 L 110.5 17 L 119 0 L 130 0 L 130 35 L 120 35 L 120 13 L 113.5 25 L 107.5 25 L 101 13 L 101 35 L 91 35 Z" />

          {/* I */}
          <path d="M 137 0 L 148 0 L 148 35 L 137 35 Z" />

          {/* N */}
          <path d="M 155 0 L 166 0 L 179 21 L 179 0 L 189 0 L 189 35 L 178 35 L 165 14 L 165 35 L 155 35 Z" />

          {/* G */}
          <path d="M 228 18.5 L 216 18.5 L 216 23.5 L 222 23.5 C 221 26 218 27.5 214 27.5 C 208 27.5 203.5 23 203.5 17.5 C 203.5 12 208 7.5 214 7.5 C 217.5 7.5 220 9 222 11.5 L 230 7.5 C 226 2.5 220 0 214 0 C 201.5 0 192.5 9 192.5 17.5 C 192.5 26 201.5 35 214 35 C 223 35 230 29 230 18.5 Z" />
        </g>
      </svg>
    </div>
  );
};
