import { useTheme } from '../lib/themeManager';
import clsx from 'clsx';

export interface ThemeLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
  fullScreenOverlay?: boolean;
}

export function ThemeLoader({ size = 'md', text, className, fullScreenOverlay = false }: ThemeLoaderProps) {
  const { currentTheme } = useTheme();
  const loaderType = currentTheme.loaderType;

  const sizeDimensions = {
    sm: { box: 'w-6 h-6', px: 24 },
    md: { box: 'w-10 h-10', px: 40 },
    lg: { box: 'w-16 h-16', px: 64 },
  }[size];

  const renderLoaderAnimation = () => {
    switch (loaderType) {
      case 'star8':
        // Halal 8-point geometric star (Rub el Hizb) rotation and pulse
        return (
          <div className={clsx('relative flex items-center justify-center animate-star8', sizeDimensions.box)}>
            <svg viewBox="0 0 48 48" className="w-full h-full text-[var(--cn-primary)] fill-none stroke-current" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              {/* Outer 8-point star */}
              <polygon points="24,2 29.5,14 42,9 36.5,21.5 48,24 36.5,26.5 42,39 29.5,34 24,46 18.5,34 6,39 11.5,26.5 0,24 11.5,21.5 6,9 18.5,14" className="fill-[var(--cn-primary-tint)]" />
              {/* Central geometric ring */}
              <circle cx="24" cy="24" r="6" className="fill-[var(--cn-surface)] stroke-[var(--cn-accent)]" strokeWidth="2" />
            </svg>
          </div>
        );

      case 'blossom':
        // Sakura blossom swaying and pulsing
        return (
          <div className={clsx('relative flex items-center justify-center animate-sakura', sizeDimensions.box)}>
            <svg viewBox="0 0 48 48" className="w-full h-full text-[var(--cn-primary)] fill-current drop-shadow-sm">
              <path d="M24,24 C24,14 18,6 24,4 C30,6 24,14 24,24 Z" opacity="0.9" />
              <path d="M24,24 C33,18 41,12 43,18 C41,24 33,24 24,24 Z" opacity="0.95" />
              <path d="M24,24 C28,33 34,41 28,43 C24,41 24,33 24,24 Z" opacity="0.9" />
              <path d="M24,24 C15,28 7,34 5,28 C7,24 15,24 24,24 Z" opacity="0.95" />
              <path d="M24,24 C18,15 12,7 18,5 C24,7 24,15 24,24 Z" opacity="0.9" />
              <circle cx="24" cy="24" r="3.5" className="fill-[var(--cn-accent)]" />
            </svg>
          </div>
        );

      case 'blocks':
        // Toybox 3D colorful bouncing cubes
        return (
          <div className={clsx('flex items-end justify-center gap-1.5 h-10', sizeDimensions.box)}>
            <div className="w-2.5 h-2.5 rounded-sm bg-[var(--cn-primary)] animate-toybox-1 shadow-xs" />
            <div className="w-2.5 h-2.5 rounded-sm bg-[var(--cn-accent)] animate-toybox-2 shadow-xs" />
            <div className="w-2.5 h-2.5 rounded-sm bg-[var(--cn-success)] animate-toybox-3 shadow-xs" />
          </div>
        );

      case 'radar':
        // Cyberpunk Mecha HUD targeting reticle & radar sweep
        return (
          <div className={clsx('relative flex items-center justify-center animate-cyber-radar', sizeDimensions.box)}>
            <svg viewBox="0 0 48 48" className="w-full h-full text-[var(--cn-primary)] fill-none stroke-current" strokeWidth="2">
              <circle cx="24" cy="24" r="20" strokeDasharray="6 4" opacity="0.6" />
              <circle cx="24" cy="24" r="12" opacity="0.8" />
              <line x1="24" y1="2" x2="24" y2="10" />
              <line x1="24" y1="38" x2="24" y2="46" />
              <line x1="2" y1="24" x2="10" y2="24" />
              <line x1="38" y1="24" x2="46" y2="24" />
              <polygon points="24,20 28,24 24,28 20,24" className="fill-[var(--cn-accent)]" stroke="none" />
            </svg>
          </div>
        );

      case 'speedline':
        // Manga comic action speedlines burst
        return (
          <div className={clsx('relative flex items-center justify-center animate-manga-speed', sizeDimensions.box)}>
            <svg viewBox="0 0 48 48" className="w-full h-full text-[var(--cn-primary)] fill-current">
              <polygon points="24,24 20,0 24,0" />
              <polygon points="24,24 40,8 44,12" />
              <polygon points="24,24 48,22 48,26" />
              <polygon points="24,24 40,40 36,44" />
              <polygon points="24,24 24,48 20,48" />
              <polygon points="24,24 8,40 4,36" />
              <polygon points="24,24 0,26 0,22" />
              <polygon points="24,24 8,8 12,4" />
              <circle cx="24" cy="24" r="6" className="fill-[var(--cn-surface)] stroke-[var(--cn-border)]" strokeWidth="2" />
            </svg>
          </div>
        );

      case 'leaf':
        // Ghibli whimsical seedling & swaying leaf
        return (
          <div className={clsx('relative flex items-center justify-center animate-ghibli', sizeDimensions.box)}>
            <svg viewBox="0 0 48 48" className="w-full h-full text-[var(--cn-primary)] fill-current">
              <path d="M24,44 C24,32 14,24 14,12 C24,12 34,18 34,30 C34,38 24,44 24,44 Z" opacity="0.9" />
              <path d="M24,44 C26,30 36,24 38,16 C30,16 22,22 24,44 Z" className="fill-[var(--cn-accent)]" opacity="0.8" />
            </svg>
          </div>
        );

      case 'neon_pulse':
        // OLED Midnight pure black razor-thin emerald neon pulse
        return (
          <div className={clsx('relative flex items-center justify-center animate-oled-pulse', sizeDimensions.box)}>
            <svg viewBox="0 0 48 48" className="w-full h-full fill-none stroke-[#10B981]" strokeWidth="2.5">
              <circle cx="24" cy="24" r="20" strokeDasharray="8 6" opacity="0.4" />
              <circle cx="24" cy="24" r="14" strokeWidth="3" opacity="0.9" />
              <circle cx="24" cy="24" r="4" className="fill-[#10B981]" stroke="none" />
            </svg>
          </div>
        );

      case 'compass':
        // Clean Editorial Paper Drafting Compass Circle
        return (
          <div className={clsx('relative flex items-center justify-center animate-paper-compass', sizeDimensions.box)}>
            <svg viewBox="0 0 48 48" className="w-full h-full text-[var(--cn-primary)] fill-none stroke-current" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="24" cy="24" r="19" strokeDasharray="4 3" opacity="0.5" />
              <line x1="24" y1="5" x2="24" y2="43" opacity="0.3" strokeDasharray="2 2" />
              <line x1="5" y1="24" x2="43" y2="24" opacity="0.3" strokeDasharray="2 2" />
              <path d="M 24 5 A 19 19 0 0 1 43 24" strokeWidth="3" className="stroke-[var(--cn-accent)]" />
              <circle cx="24" cy="24" r="3.5" className="fill-[var(--cn-primary)]" stroke="none" />
            </svg>
          </div>
        );

      case 'orbit':
      default:
        // Obsidian dual-ring precision spinner
        return (
          <div className={clsx('relative flex items-center justify-center animate-orbit', sizeDimensions.box)}>
            <svg viewBox="0 0 48 48" className="w-full h-full text-[var(--cn-primary)] fill-none stroke-current" strokeWidth="3">
              <circle cx="24" cy="24" r="18" strokeDasharray="30 20" strokeLinecap="round" />
              <circle cx="24" cy="24" r="10" strokeDasharray="16 12" strokeLinecap="round" opacity="0.6" className="text-[var(--cn-accent)]" />
            </svg>
          </div>
        );
    }
  };

  if (fullScreenOverlay) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-6 animate-fade-in">
        <div className="bg-[var(--cn-surface)] border border-[var(--cn-border)] rounded-2xl p-8 flex flex-col items-center justify-center gap-4 shadow-2xl max-w-sm w-full text-center">
          {renderLoaderAnimation()}
          {text && (
            <p className="text-sm font-mono font-medium text-[var(--cn-text)] tracking-wider">
              {text}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={clsx('flex flex-col items-center justify-center gap-3', className)}>
      {renderLoaderAnimation()}
      {text && (
        <span className="text-xs font-mono font-medium text-[var(--cn-text-muted)] tracking-wider uppercase animate-pulse">
          {text}
        </span>
      )}
    </div>
  );
}
