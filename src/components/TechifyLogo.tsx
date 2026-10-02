import React, { useEffect, useState } from 'react';

interface TechifyLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showIcon?: boolean;
  overrideLogoUrl?: string;
  showText?: boolean;
  surface?: 'auto' | 'light' | 'dark';
  symbolOnly?: boolean;
}

const WORDMARK_DARK = '/branding/leadspay-wordmark-dark.webp';
const WORDMARK_LIGHT = '/branding/leadspay-wordmark-light.webp';
const SYMBOL = '/branding/leadspay-symbol.webp';

const dimensions = {
  sm: { wordmarkWidth: 116, symbolSize: 30 },
  md: { wordmarkWidth: 150, symbolSize: 38 },
  lg: { wordmarkWidth: 190, symbolSize: 50 },
  xl: { wordmarkWidth: 236, symbolSize: 64 },
};

function readTheme(): 'light' | 'dark' {
  if (typeof document !== 'undefined') {
    const documentTheme =
      document.documentElement.getAttribute('data-leadspay-theme') ||
      document.body.getAttribute('data-leadspay-theme');
    if (documentTheme === 'light' || documentTheme === 'dark') return documentTheme;
  }

  if (typeof window !== 'undefined') {
    try {
      const stored =
        window.localStorage.getItem('leadspay-platform-theme') ||
        window.localStorage.getItem('leadspay-landing-theme');
      if (stored === 'light' || stored === 'dark') return stored;
    } catch {
      // Fallback below.
    }
  }

  return 'dark';
}

export const TechifyLogo: React.FC<TechifyLogoProps> = ({
  className = '',
  size = 'md',
  overrideLogoUrl,
  showText = true,
  surface = 'auto',
  symbolOnly = false,
}) => {
  const [activeTheme, setActiveTheme] = useState<'light' | 'dark'>(() => readTheme());

  useEffect(() => {
    if (surface !== 'auto') return;

    const syncTheme = (event?: Event) => {
      const eventTheme = (event as CustomEvent<'light' | 'dark'> | undefined)?.detail;
      setActiveTheme(eventTheme === 'light' || eventTheme === 'dark' ? eventTheme : readTheme());
    };

    window.addEventListener('leadspay-theme-change', syncTheme);
    window.addEventListener('storage', syncTheme);
    return () => {
      window.removeEventListener('leadspay-theme-change', syncTheme);
      window.removeEventListener('storage', syncTheme);
    };
  }, [surface]);

  const resolvedSurface = surface === 'auto' ? activeTheme : surface;
  const compact = symbolOnly || !showText;
  const dim = dimensions[size];
  const src =
    overrideLogoUrl ||
    (compact
      ? SYMBOL
      : resolvedSurface === 'light'
        ? WORDMARK_LIGHT
        : WORDMARK_DARK);

  return (
    <img
      src={src}
      alt="LeadsPay"
      draggable={false}
      className={'block select-none object-contain flex-shrink-0 ' + className}
      style={
        compact
          ? { width: dim.symbolSize, height: dim.symbolSize }
          : { width: dim.wordmarkWidth, height: 'auto' }
      }
      onError={(event) => {
        const image = event.currentTarget;
        if (image.src.endsWith('/branding/leadspay-symbol.webp')) return;
        image.src = SYMBOL;
      }}
    />
  );
};

export const LeadsPayLogo = TechifyLogo;
