import React from 'react';

interface BrandLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showBadge?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = '',
  size = 'md',
  showBadge = true,
}) => {
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

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Bespoke Geometric Codex-Nest Mark */}
      <div className={`relative flex items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 via-emerald-600/10 to-transparent p-2 border border-emerald-500/30 shadow-sm shadow-emerald-950/20 ${iconSizes[size]}`}>
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full text-emerald-500 dark:text-emerald-400"
        >
          {/* Outer Codex Nest Foundation */}
          <path
            d="M4 14C4 20.6274 9.37258 26 16 26C22.6274 26 28 20.6274 28 14"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="opacity-80"
          />
          {/* Inner Left Wing / Page */}
          <path
            d="M8 10C8 17 12 21 16 22"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* Inner Right Wing / Page */}
          <path
            d="M24 10C24 17 20 21 16 22"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* Amber Core Beacon / Learning Flame */}
          <polygon
            points="16,6 19,11 16,14 13,11"
            className="fill-amber-500 text-amber-500 drop-shadow-[0_0_6px_rgba(245,158,11,0.6)]"
          />
        </svg>
      </div>

      <div className="flex flex-col">
        <span className={`font-display font-extrabold tracking-tight text-[var(--cn-text-primary)] ${titleSizes[size]}`}>
          Course<span className="text-emerald-600 dark:text-emerald-400 font-semibold">Nest</span>
        </span>
        {showBadge && (
          <span className="text-[10px] uppercase font-mono tracking-widest text-[var(--cn-text-muted)] font-medium -mt-1 flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Offline Studio
          </span>
        )}
      </div>
    </div>
  );
};
