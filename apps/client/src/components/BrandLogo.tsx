import React from 'react';
import { useTheme } from '../lib/themeManager';

interface BrandLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showBadge?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = '',
  size = 'md',
  showBadge = false,
}) => {
  const { currentTheme } = useTheme();
  const emblem = currentTheme?.logoEmblem || 'obsidian_core';

  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
  };

  const titleSizes = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  const renderEmblem = () => {
    switch (emblem) {
      case 'halal_minaret':
        // 🕌 Halal Edition: 8-Point Rub el Hizb Medallion framing Mosque Minaret & Crescent Dome
        return (
          <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-[#047857]">
            {/* 8-Point Rub el Hizb Outer Frame */}
            <rect x="6" y="6" width="24" height="24" rx="2" stroke="#D97706" strokeWidth="1.8" />
            <rect x="6" y="6" width="24" height="24" rx="2" stroke="#D97706" strokeWidth="1.8" transform="rotate(45 18 18)" />
            {/* Mosque Minaret & Central Dome */}
            <path d="M12,27 L12,21 C12,16 18,13 18,10 C18,13 24,16 24,21 L24,27 Z" fill="#047857" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.5" />
            {/* Crescent Star Top */}
            <circle cx="18" cy="9" r="1.5" fill="#D97706" />
            {/* Horseshoe Arch Gateway */}
            <path d="M15,27 L15,22 C15,20.5 16.5,19.5 18,19.5 C19.5,19.5 21,20.5 21,22 L21,27" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        );

      case 'sakura_bloom':
        // 🌸 Sakura Bloom: 5-Petal Cherry Blossom Crest
        return (
          <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-[#EC4899]">
            {/* 5 Petals */}
            {[0, 72, 144, 216, 288].map((angle, i) => (
              <path
                key={i}
                d="M18,18 C15,11 15,5 18,3 C21,5 21,11 18,18 Z"
                fill="currentColor"
                fillOpacity="0.25"
                stroke="currentColor"
                strokeWidth="1.5"
                transform={`rotate(${angle} 18 18)`}
              />
            ))}
            {/* Blossom Gold Core */}
            <circle cx="18" cy="18" r="3" fill="#F472B6" stroke="#FFFFFF" strokeWidth="1" />
          </svg>
        );

      case 'toybox_brick':
        // 🧸 Toybox Bubbly: 3D Interlocking Playful Toy Building Block
        return (
          <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            {/* Block Top Studs */}
            <rect x="9" y="6" width="6" height="4" rx="2" fill="#0284C7" />
            <rect x="21" y="6" width="6" height="4" rx="2" fill="#F59E0B" />
            {/* Block Main Body */}
            <rect x="6" y="9" width="24" height="20" rx="5" fill="#0284C7" stroke="#0284C7" strokeWidth="1.5" />
            {/* Happy Curved Wink Eyes */}
            <path d="M11,18 Q13,16 15,18" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
            <path d="M21,18 Q23,16 25,18" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
            {/* Smile Mouth */}
            <path d="M14,22 Q18,26 22,22" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" fill="none" />
          </svg>
        );

      case 'mecha_hud':
        // ⚡ Neo-Tokyo Mecha: Angular Cyber Mecha Visor & Reticle Wings
        return (
          <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-[#00F0FF]">
            {/* Angular Mecha Shield Outline */}
            <polygon points="18,3 32,10 27,27 18,33 9,27 4,10" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.1" />
            {/* Glowing Crosshair Reticle */}
            <circle cx="18" cy="18" r="6" stroke="#FF007F" strokeWidth="1.5" />
            <line x1="18" y1="9" x2="18" y2="14" stroke="currentColor" strokeWidth="2" />
            <line x1="18" y1="22" x2="18" y2="27" stroke="currentColor" strokeWidth="2" />
            <line x1="9" y1="18" x2="14" y2="18" stroke="currentColor" strokeWidth="2" />
            <line x1="22" y1="18" x2="27" y2="18" stroke="currentColor" strokeWidth="2" />
          </svg>
        );

      case 'manga_stamp':
        // 💥 Manga Screentone: Bold Action Impact Starburst Badge
        return (
          <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-[#DC2626]">
            {/* Sharp Action Burst Polygon */}
            <polygon
              points="18,2 22,11 32,8 26,17 35,22 25,25 28,34 19,28 14,35 12,26 2,27 9,18 2,12 12,12"
              fill="#18181B"
              stroke="#DC2626"
              strokeWidth="2"
            />
            {/* Central Kanji / Bold Exclamation Core */}
            <text x="18" y="23" textAnchor="middle" fill="#FFFFFF" fontSize="14" fontWeight="900" fontFamily="sans-serif">
              巣
            </text>
          </svg>
        );

      case 'ghibli_acorn':
        // 🍃 Studio Ghibli Nature: Woodland Acorn & Sprouting Leaf
        return (
          <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            {/* Acorn Cupule / Cap */}
            <path d="M10,14 C10,10 26,10 26,14 L24,17 L12,17 Z" fill="#C2593F" stroke="#C2593F" strokeWidth="1.5" />
            <line x1="18" y1="10" x2="18" y2="5" stroke="#C2593F" strokeWidth="2" strokeLinecap="round" />
            {/* Acorn Nut Body */}
            <path d="M12,17 C12,25 18,30 18,30 C18,30 24,25 24,17 Z" fill="#C2593F" fillOpacity="0.2" stroke="#C2593F" strokeWidth="1.5" />
            {/* Sprouting Forest Oak Leaf */}
            <path d="M18,5 C25,2 30,8 27,15 C22,14 19,10 18,5 Z" fill="#3B7A57" stroke="#3B7A57" strokeWidth="1.2" />
          </svg>
        );

      case 'oled_ring':
        // 🖤 OLED Midnight: Precision Celestial Orbit Ring
        return (
          <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-white">
            <circle cx="18" cy="18" r="14" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" />
            <circle cx="18" cy="18" r="8" stroke="currentColor" strokeWidth="2" />
            <circle cx="28" cy="12" r="2.5" fill="#10B981" />
          </svg>
        );

      case 'editorial_quill':
        // ☀️ Clean Editorial: Bauhaus Geometric Overlapping Monogram
        return (
          <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-[#3BA849]">
            <rect x="6" y="6" width="16" height="24" stroke="currentColor" strokeWidth="2" fill="none" />
            <circle cx="22" cy="18" r="8" stroke="#D97706" strokeWidth="2" fill="#D97706" fillOpacity="0.15" />
            <line x1="6" y1="30" x2="30" y2="6" stroke="#2563EB" strokeWidth="2" />
          </svg>
        );

      case 'obsidian_core':
      default:
        // 🌿 Obsidian Moss: Codex Vault & Glowing Emerald Beacon
        return (
          <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-[#57C564]">
            <path d="M4 14C4 20.6274 9.37258 26 16 26C22.6274 26 28 20.6274 28 14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="opacity-80" />
            <path d="M8 10C8 17 12 21 16 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M24 10C24 17 20 21 16 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <polygon points="16,6 19,11 16,14 13,11" className="fill-amber-500 text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.7)]" />
          </svg>
        );
    }
  };

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Dynamic Theme Vector Emblem */}
      <div 
        className={`relative flex items-center justify-center rounded-xl p-1.5 border transition-[border-color,background-color,box-shadow,transform] duration-150 ease-out ${iconSizes[size]}`}
        style={{
          borderColor: currentTheme.palette.border,
          backgroundColor: currentTheme.palette.surface,
          boxShadow: `0 2px 10px ${currentTheme.palette.primary}18`,
          borderRadius: currentTheme.borderRadiusMode === 'bubbly' ? '16px' : currentTheme.borderRadiusMode === 'sharp' ? '6px' : '12px'
        }}
      >
        {renderEmblem()}
      </div>

      <div className="flex flex-col">
        <span 
          className={`font-extrabold tracking-tight text-[var(--cn-text-primary)] transition-colors duration-200 ${titleSizes[size]}`}
          style={{ fontFamily: currentTheme.fonts.display }}
        >
          CourseNest
        </span>
        {showBadge && (
          <span 
            className="text-[10px] uppercase font-mono tracking-wider text-[var(--cn-text-muted)] font-semibold -mt-0.5"
            style={{ fontFamily: currentTheme.fonts.mono }}
          >
            {currentTheme.name}
          </span>
        )}
      </div>
    </div>
  );
};
