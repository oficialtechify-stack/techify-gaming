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
    const local = getLocalBranding();
    if (local && local.logoType) return local;
    return {
      logoType: 'preset_3d_star',
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
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            /* Official LeadsPay 4-Petal Clover / Pinwheel (Matching user screenshot) */
            <svg 
              viewBox="0 0 100 100" 
              className="w-full h-full relative z-10 drop-shadow-[0_0_12px_rgba(163,230,53,0.6)]" 
              fill="none"
            >
              {/* Top left petal */}
              <path d="M50 48 C50 25 35 15 22 24 C10 33 18 52 42 50 Z" fill="#84cc16" />
              {/* Top right petal */}
              <path d="M52 48 C75 48 85 33 76 20 C67 8 48 16 50 40 Z" fill="#a3e635" />
              {/* Bottom right petal */}
              <path d="M50 52 C50 75 65 85 78 76 C90 67 82 48 58 50 Z" fill="#84cc16" />
              {/* Bottom left petal */}
              <path d="M48 52 C25 52 15 67 24 80 C33 92 52 84 50 60 Z" fill="#65a30d" />
              {/* Center core */}
              <circle cx="50" cy="50" r="7" fill="#bef264" />
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
