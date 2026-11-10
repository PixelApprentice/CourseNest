import React from 'react';
import { useTheme } from '../lib/themeManager';

interface BrandLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showBadge?: boolean;
  showSubtitle?: boolean;
  showText?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = '',
  size = 'md',
  showBadge = false,
  showSubtitle = false,
  showText = true,
}) => {
  const { currentTheme } = useTheme();

  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-11 h-11',
  };

  const titleSizes = {
    sm: 'text-sm font-bold',
    md: 'text-lg font-extrabold',
    lg: 'text-2xl font-extrabold',
  };

  // Authoritative CourseNest brand vector matching Linux system icon & desktop bundle
  const renderEmblem = () => {
    return (
      <svg 
        viewBox="0 0 512 512" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg" 
        className="w-full h-full drop-shadow-sm select-none"
      >
        <rect width="512" height="512" rx="128" fill="#0A0A0B" />
        <g transform="translate(64, 64) scale(12)">
          <path fill="#57C564" d="M16 2L4 8l12 6 12-6-12-6z" />
          <path fill="#38A145" d="M4 12l12 6 12-6v4l-12 6-12-6v-4z" />
          <path fill="#F59E0B" d="M16 24l-8-4v3l8 4 8-4v-3l-8 4z" />
        </g>
      </svg>
    );
  };

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      <div className={`relative flex items-center justify-center shrink-0 ${iconSizes[size]}`}>
        {renderEmblem()}
      </div>

      {showText && (
        <div className="flex flex-col">
          <span 
            className={`tracking-tight text-[var(--cn-text-primary)] transition-colors duration-200 ${titleSizes[size]}`}
            style={{ fontFamily: currentTheme.fonts.display }}
          >
            CourseNest
          </span>
          {showSubtitle && (
            <span className="text-[10px] text-[var(--cn-text-muted)] tracking-tight">
              Fast, Private, Offline-First Learning Platform & AI Study Studio
            </span>
          )}
          {showBadge && (
            <span 
              className="text-[9px] uppercase font-mono tracking-wider text-[var(--cn-text-muted)] font-semibold -mt-0.5"
              style={{ fontFamily: currentTheme.fonts.mono }}
            >
              {currentTheme.name}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
