import React, { useState, useEffect } from 'react';
import { subscribePlatformBranding, PlatformBranding, getLocalBranding } from '../services/firestoreService';

interface TechifyLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showIcon?: boolean;
  overrideLogoUrl?: string;
  showText?: boolean;
}

export const TechifyLogo: React.FC<TechifyLogoProps> = ({ 
  className = '', 
  size = 'md',
  showIcon = true,
  overrideLogoUrl,
  showText = true
}) => {
  const [branding, setBranding] = useState<PlatformBranding>(() => {
    return getLocalBranding() || {
      logoType: 'default_vector',
      logoText: 'LEADSPAY',
      logoSubtext: 'PAYMENTS & SPLIT',
      accentColor: '#D9F22A'
    };
  });

  useEffect(() => {
    const unsub = subscribePlatformBranding((updated) => {
      if (updated) {
        setBranding(prev => ({ ...prev, ...updated }));
      }
    });

    const handleCustomEvent = (e: any) => {
      if (e.detail) {
        setBranding(prev => ({ ...prev, ...e.detail }));
      }
    };

    window.addEventListener('leadspay_branding_updated', handleCustomEvent);

    return () => {
      unsub();
      window.removeEventListener('leadspay_branding_updated', handleCustomEvent);
    };
  }, []);

  // Dimensões responsivas proporcionais
  const dimensions = {
    sm: { height: 32, emblemSize: 28, fontSize: 'text-base', subSize: 'text-[7.5px]', gap: 'gap-2' },
    md: { height: 42, emblemSize: 36, fontSize: 'text-xl', subSize: 'text-[8.5px]', gap: 'gap-2.5' },
    lg: { height: 56, emblemSize: 48, fontSize: 'text-2xl sm:text-3xl', subSize: 'text-[9.5px]', gap: 'gap-3' },
    xl: { height: 72, emblemSize: 64, fontSize: 'text-3xl sm:text-4xl', subSize: 'text-xs', gap: 'gap-3.5' },
  };

  const currentDim = dimensions[size];
  const activeLogoUrl = overrideLogoUrl || branding.logoUrl;
  const isCustomImage = Boolean(activeLogoUrl && (branding.logoType === 'custom_image' || overrideLogoUrl));

  const logoText = branding.logoText || 'LEADSPAY';
  const logoSubtext = branding.logoSubtext || 'PAYMENTS & SPLIT';
  const accentColor = branding.accentColor || '#D9F22A';
  const shouldShowText = showText && !(isCustomImage && branding.hideTextWithCustomLogo);

  return (
    <div 
      className={`inline-flex items-center select-none ${currentDim.gap} ${className}`} 
      id="leadspay-brand-logo"
    >
      {/* Ícone ou Imagem da Logo */}
      {showIcon && (
        <div 
          className={`relative flex-shrink-0 flex items-center justify-center ${
            isCustomImage ? 'max-h-full' : ''
          }`}
          style={
            isCustomImage
              ? { height: `${currentDim.height}px`, minWidth: `${currentDim.emblemSize}px` }
              : { width: `${currentDim.emblemSize}px`, height: `${currentDim.emblemSize}px` }
          }
        >
          {/* Subtle Backlight Glow */}
          <div 
            className="absolute inset-0 rounded-full blur-md opacity-70 pointer-events-none transition-all duration-300" 
            style={{ backgroundColor: accentColor }}
          />

          {/* 1. Imagem Personalizada (Carregada manualmente pelo Admin via URL ou Upload Base64) */}
          {isCustomImage && activeLogoUrl ? (
            <img 
              src={activeLogoUrl} 
              alt={logoText} 
              className="h-full w-auto max-w-[200px] object-contain relative z-10 drop-shadow-[0_2px_10px_rgba(217,242,42,0.4)] rounded-md transition-all"
              onError={(e) => {
                // Fallback gracioso se a imagem quebrar
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : branding.logoType === 'preset_3d_star' ? (
            /* 2. Preset: Emblema 3D com Estrela de 4 Pontas (Imagem 3 do usuário) */
            <svg 
              viewBox="0 0 100 100" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-full relative z-10 drop-shadow-[0_4px_14px_rgba(217,242,42,0.5)]"
            >
              <defs>
                <linearGradient id="starLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FAFF6B" />
                  <stop offset="35%" stopColor="#D9F22A" />
                  <stop offset="75%" stopColor="#9BC504" />
                  <stop offset="100%" stopColor="#557500" />
                </linearGradient>
                <filter id="neonGlowStar" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#D9F22A" floodOpacity="0.6"/>
                </filter>
              </defs>
              {/* Moldura 3D estilizada em S */}
              <path 
                d="M32 18 C52 14, 76 18, 78 36 C80 50, 68 56, 56 60 C74 62, 84 74, 78 88 C70 98, 42 96, 26 88 L34 76 C46 82, 62 82, 66 74 C70 66, 60 62, 46 58 C32 54, 22 46, 22 34 C22 20, 36 14, 52 14"
                fill="none"
                stroke="url(#starLogoGrad)"
                strokeWidth="11"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#neonGlowStar)"
              />
              {/* Estrela de 4 pontas no centro */}
              <path 
                d="M50 32 Q50 48, 66 48 Q50 48, 50 64 Q50 48, 34 48 Q50 48, 50 32 Z" 
                fill="#FAFF85" 
                stroke="#FFFFFF" 
                strokeWidth="1.5"
                className="drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]"
              />
            </svg>
          ) : (
            /* 3. Preset Padrão & Neon Circle: O Raio Circular Oficial LeadsPay (Imagens 1 e 2 do usuário) */
            <svg 
              viewBox="0 0 100 100" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-full relative z-10 drop-shadow-[0_2px_12px_rgba(217,242,42,0.6)]"
            >
              <defs>
                <linearGradient id="neonCircleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#F9FF75" />
                  <stop offset="40%" stopColor="#D9F22A" />
                  <stop offset="85%" stopColor="#A4D104" />
                  <stop offset="100%" stopColor="#6C9300" />
                </linearGradient>
                <linearGradient id="boltGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FFFFFF" />
                  <stop offset="40%" stopColor="#F5FF7A" />
                  <stop offset="100%" stopColor="#D9F22A" />
                </linearGradient>
              </defs>

              {/* Arco Circular Superior com chanfro */}
              <path 
                d="M 28 50 C 28 34, 40 22, 56 22 C 70 22, 80 30, 84 42" 
                fill="none" 
                stroke="url(#neonCircleGrad)" 
                strokeWidth="11" 
                strokeLinecap="round" 
              />

              {/* Arco Circular Inferior com chanfro */}
              <path 
                d="M 72 50 C 72 66, 60 78, 44 78 C 30 78, 20 70, 16 58" 
                fill="none" 
                stroke="url(#neonCircleGrad)" 
                strokeWidth="11" 
                strokeLinecap="round" 
              />

              {/* Raio Diagonal Neon Cruzando o Centro */}
              <path 
                d="M 12 88 L 36 64 L 52 64 L 46 52 L 62 52 L 56 40 L 70 40 L 92 12 L 66 38 L 52 38 L 58 48 L 42 48 L 48 60 L 32 60 Z" 
                fill="url(#boltGrad)" 
                stroke="#FFFFFF" 
                strokeWidth="0.8" 
                className="drop-shadow-[0_0_8px_rgba(255,255,255,0.9)]"
              />
            </svg>
          )}
        </div>
      )}

      {/* Tipografia Oficial LeadsPay */}
      {shouldShowText && (
        <div className="flex flex-col justify-center leading-none">
          <div className={`font-['Syne'] font-black tracking-tight uppercase ${currentDim.fontSize}`}>
            <span 
              className="drop-shadow-[0_0_14px_rgba(217,242,42,0.4)] transition-colors"
              style={{ color: accentColor }}
            >
              {logoText}
            </span>
          </div>
          <span 
            className={`font-extrabold tracking-[0.22em] uppercase mt-0.5 opacity-80 ${currentDim.subSize}`}
            style={{ color: accentColor }}
          >
            {logoSubtext}
          </span>
        </div>
      )}
    </div>
  );
};

export const LeadsPayLogo = TechifyLogo;
