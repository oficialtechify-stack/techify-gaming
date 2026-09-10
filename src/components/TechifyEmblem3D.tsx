import React, { useState, useRef } from 'react';

interface TechifyEmblem3DProps {
  className?: string;
  size?: number | string;
}

export const TechifyEmblem3D: React.FC<TechifyEmblem3DProps> = ({ 
  className = '', 
}) => {
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    
    // Smooth 3D tilt
    setRotate({
      x: -y / 15,
      y: x / 15
    });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotate({ x: 0, y: 0 });
  };

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      className={`relative flex items-center justify-center cursor-pointer select-none transition-transform duration-300 ${className}`}
      style={{ perspective: 1000 }}
      id="leadspay-3d-emblem-container"
    >
      {/* Background Soft Volumetric Glow */}
      <div 
        className="absolute inset-0 bg-[#D9F22A]/25 rounded-full blur-[80px] sm:blur-[110px] scale-95 pointer-events-none transition-all duration-500"
        style={{
          opacity: isHovered ? 0.45 : 0.28,
          transform: `scale(${isHovered ? 1.12 : 0.95})`
        }}
      />

      {/* 3D Container with Parallax Tilt */}
      <div 
        className="relative w-full h-full max-w-[580px] max-h-[580px] aspect-square flex items-center justify-center transition-transform duration-200 ease-out"
        style={{
          transform: `rotateX(${rotate.x}deg) rotateY(${rotate.y}deg) scale(${isHovered ? 1.04 : 1})`,
          transformStyle: 'preserve-3d'
        }}
      >
        {/* Real 3D Rendered Glass/Crystal Neon Emblem (From User Image 1) */}
        <div className="relative w-full h-full flex items-center justify-center p-2">
          <img 
            src="/logo_3d.jpg" 
            alt="LeadsPay 3D Glass Star Emblem" 
            className="w-full h-full object-contain filter drop-shadow-[0_25px_50px_rgba(217,242,42,0.45)] select-none pointer-events-none rounded-3xl"
            onError={(e) => {
              // Fallback to local asset if public path fails
              (e.target as HTMLImageElement).src = '/leadspay_3d_logo.jpg';
            }}
          />
        </div>
      </div>
    </div>
  );
};

export const LeadsPayEmblem3D = TechifyEmblem3D;
