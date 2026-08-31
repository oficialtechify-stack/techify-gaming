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
      id="techify-3d-emblem-container"
    >
      {/* Background Soft Volumetric Glow */}
      <div 
        className="absolute inset-0 bg-[#D9F22A]/20 rounded-full blur-[90px] scale-95 pointer-events-none transition-all duration-500"
        style={{
          opacity: isHovered ? 0.35 : 0.2,
          transform: `scale(${isHovered ? 1.08 : 0.95})`
        }}
      />

      {/* 3D Container with Parallax Tilt */}
      <div 
        className="relative w-full h-full max-w-[580px] max-h-[580px] aspect-square flex items-center justify-center transition-transform duration-200 ease-out"
        style={{
          transform: `rotateX(${rotate.x}deg) rotateY(${rotate.y}deg) scale(${isHovered ? 1.03 : 1})`,
          transformStyle: 'preserve-3d'
        }}
      >
        {/* Exact Vector & 3D Lighting reproduction of the user's emblem */}
        <svg 
          viewBox="0 0 600 600" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-[0_25px_50px_rgba(217,242,42,0.35)]"
          id="techify-3d-emblem-svg"
        >
          <defs>
            {/* Metallic Gradients */}
            <linearGradient id="metalTopWing" x1="120" y1="80" x2="350" y2="350" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#EBFF4D" />
              <stop offset="35%" stopColor="#D9F22A" />
              <stop offset="70%" stopColor="#A8CE08" />
              <stop offset="100%" stopColor="#719300" />
            </linearGradient>

            <linearGradient id="metalBottomWing" x1="250" y1="280" x2="520" y2="520" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#D9F22A" />
              <stop offset="45%" stopColor="#BCE314" />
              <stop offset="85%" stopColor="#87B200" />
              <stop offset="100%" stopColor="#536E00" />
            </linearGradient>

            <linearGradient id="metalLightning" x1="50" y1="520" x2="540" y2="40" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#D4F01A" />
              <stop offset="25%" stopColor="#F4FF7A" />
              <stop offset="50%" stopColor="#D9F22A" />
              <stop offset="75%" stopColor="#9BC504" />
              <stop offset="100%" stopColor="#F9FFA8" />
            </linearGradient>

            <linearGradient id="specularRim" x1="100" y1="50" x2="500" y2="550" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
              <stop offset="15%" stopColor="#E2FF4A" stopOpacity="0.5" />
              <stop offset="50%" stopColor="#A2CD00" stopOpacity="0" />
              <stop offset="85%" stopColor="#FFFFFF" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#6C8C00" stopOpacity="0.3" />
            </linearGradient>

            <linearGradient id="bevelShadow" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#4A6000" />
              <stop offset="50%" stopColor="#2F3E00" />
              <stop offset="100%" stopColor="#1A2200" />
            </linearGradient>

            {/* Gloss Filter */}
            <filter id="emblemGleam" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="blur" />
              <feSpecularLighting in="blur" surfaceScale="5" specularConstant="1.2" specularExponent="20" lightingColor="#F6FFA6" result="specular">
                <fePointLight x="200" y="100" z="300" />
              </feSpecularLighting>
              <feComposite in="specular" in2="SourceAlpha" operator="in" result="specularGleam" />
              <feComposite in="SourceGraphic" in2="specularGleam" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" />
            </filter>
          </defs>

          {/* 3D Extrusion & Bevels Underlying Shell (Darker green shadow layers) */}
          <g transform="translate(8, 12)" opacity="0.8">
            {/* Top Wing Extrusion */}
            <path 
              d="M 120 280 C 100 190, 160 90, 270 70 C 370 52, 450 110, 480 190 L 400 240 C 380 190, 320 140, 250 150 C 190 160, 160 210, 160 260 Z" 
              fill="url(#bevelShadow)" 
            />
            {/* Bottom Wing Extrusion */}
            <path 
              d="M 480 320 C 500 410, 440 510, 330 530 C 230 548, 150 490, 120 410 L 200 360 C 220 410, 280 460, 350 450 C 410 440, 440 390, 440 340 Z" 
              fill="url(#bevelShadow)" 
            />
          </g>

          {/* MAIN 3D EMBLEM BODY */}
          <g filter="url(#emblemGleam)">
            {/* Top-Left Rounded Crest Wing */}
            <path 
              d="M 115 285 
                 C 95 185, 160 82, 285 64 
                 C 385 50, 475 105, 495 190 
                 L 435 235 
                 C 415 175, 360 128, 280 138 
                 C 205 148, 165 205, 175 270 
                 Z" 
              fill="url(#metalTopWing)" 
              stroke="#F6FF7A" 
              strokeWidth="2.5" 
            />

            {/* Bottom-Right Rounded Crest Wing */}
            <path 
              d="M 485 315 
                 C 505 415, 440 518, 315 536 
                 C 215 550, 125 495, 105 410 
                 L 165 365 
                 C 185 425, 240 472, 320 462 
                 C 395 452, 435 395, 425 330 
                 Z" 
              fill="url(#metalBottomWing)" 
              stroke="#F6FF7A" 
              strokeWidth="2.5" 
            />

            {/* Central Angular Diagonal Lightning Beam & Sharp Arrows (N/S Lightning Core) */}
            {/* Extended Bottom-Left Arrow Spike to Top-Right Arrow Spike */}
            <path 
              d="M 32 540 
                 L 140 420 
                 L 225 420 
                 L 300 320 
                 L 255 320 
                 L 330 200 
                 L 415 200 
                 L 568 25 
                 L 470 185 
                 L 380 185 
                 L 305 285 
                 L 350 285 
                 L 275 405 
                 L 190 405 
                 Z" 
              fill="url(#metalLightning)" 
              stroke="#FFFFFF" 
              strokeWidth="3" 
            />

            {/* 3D Ridges along the Lightning Bolt Facets */}
            <path 
              d="M 32 540 L 568 25" 
              stroke="#FFFFFF" 
              strokeWidth="2" 
              strokeOpacity="0.75" 
            />

            {/* Internal Center Cavity Bevel Highlights */}
            <path 
              d="M 225 420 L 300 320 L 255 320 L 330 200" 
              stroke="#FFFFFF" 
              strokeWidth="2.5" 
              fill="none" 
            />

            {/* Outer Circular Specular Arc Rim Highlights */}
            <path 
              d="M 115 285 C 95 185, 160 82, 285 64 C 340 56, 395 72, 440 102" 
              stroke="url(#specularRim)" 
              strokeWidth="5" 
              strokeLinecap="round" 
              fill="none" 
            />
            <path 
              d="M 485 315 C 505 415, 440 518, 315 536 C 260 544, 205 528, 160 498" 
              stroke="url(#specularRim)" 
              strokeWidth="5" 
              strokeLinecap="round" 
              fill="none" 
            />
          </g>

          {/* Glint Stars on the Spikes */}
          <circle cx="568" cy="25" r="4" fill="#FFFFFF" filter="drop-shadow(0 0 8px #FFFFFF)" />
          <circle cx="32" cy="540" r="4" fill="#FFFFFF" filter="drop-shadow(0 0 8px #FFFFFF)" />
        </svg>
      </div>
    </div>
  );
};
