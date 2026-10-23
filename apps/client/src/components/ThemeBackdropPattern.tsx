import { useTheme } from '../lib/themeManager';

export function ThemeBackdropPattern() {
  const { currentTheme } = useTheme();
  const patternType = currentTheme.patternType;

  if (patternType === 'none') {
    return null;
  }

  const renderPattern = () => {
    switch (patternType) {
      case 'arabesque':
        // Islamic 8-point geometric star tiling (Rub el Hizb)
        return (
          <svg className="w-full h-full opacity-[0.14] text-[var(--cn-primary)] fill-none stroke-current" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="pattern-arabesque" width="80" height="80" patternUnits="userSpaceOnUse">
                {/* 8-point star polygon */}
                <polygon points="40,8 47,26 65,20 57,37 72,40 57,43 65,60 47,54 40,72 33,54 15,60 23,43 8,40 23,37 15,20 33,26" strokeWidth="1.5" />
                {/* Interlacing squares */}
                <rect x="22" y="22" width="36" height="36" strokeWidth="1" strokeDasharray="3 3" />
                <rect x="22" y="22" width="36" height="36" strokeWidth="1" transform="rotate(45 40 40)" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#pattern-arabesque)" />
          </svg>
        );

      case 'petals':
        // Sakura Blossom Petals & Floral Accent
        return (
          <svg className="w-full h-full opacity-[0.13] text-[var(--cn-primary)] fill-current" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="pattern-petals" width="100" height="100" patternUnits="userSpaceOnUse">
                {/* Petal 1 */}
                <path d="M20,20 C20,10 14,4 20,2 C26,4 20,10 20,20 Z" transform="rotate(25 20 20)" />
                {/* Petal 2 */}
                <path d="M70,60 C70,50 64,44 70,42 C76,44 70,50 70,60 Z" transform="rotate(-35 70 60)" />
                {/* 4-point Diamond Floral Star */}
                <polygon points="85,20 87,26 93,28 87,30 85,36 83,30 77,28 83,26" opacity="0.7" />
                <circle cx="35" cy="80" r="2.5" opacity="0.6" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#pattern-petals)" />
          </svg>
        );

      case 'confetti':
        // Toybox playful confetti & building cubes
        return (
          <svg className="w-full h-full opacity-[0.13] text-[var(--cn-primary)] fill-current" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="pattern-confetti" width="90" height="90" patternUnits="userSpaceOnUse">
                <rect x="15" y="15" width="8" height="8" rx="2" transform="rotate(15 19 19)" />
                <circle cx="65" cy="25" r="4" className="text-[var(--cn-accent)] fill-current" />
                <polygon points="75,70 82,82 68,82" className="text-[var(--cn-success)] fill-current" />
                <rect x="25" y="65" width="7" height="7" rx="1.5" transform="rotate(-20 28 68)" className="text-[var(--cn-accent)] fill-current" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#pattern-confetti)" />
          </svg>
        );

      case 'grid':
        // Cyberpunk Mecha Isometric Wireframe & HUD Corner Brackets
        return (
          <svg className="w-full h-full opacity-[0.12] text-[var(--cn-primary)] stroke-current fill-none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="pattern-cyber-grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <rect x="0" y="0" width="60" height="60" strokeWidth="0.8" />
                <path d="M0,0 L10,0 L0,10 Z" className="fill-current" stroke="none" />
                <circle cx="30" cy="30" r="1.5" className="fill-current" stroke="none" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#pattern-cyber-grid)" />
          </svg>
        );

      case 'screentone':
        // Manga Halftone Screentone Dot-Matrix Pattern
        return (
          <svg className="w-full h-full opacity-[0.10] text-[var(--cn-text-primary)] fill-current" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="pattern-manga-tone" width="16" height="16" patternUnits="userSpaceOnUse">
                <circle cx="4" cy="4" r="1.5" />
                <circle cx="12" cy="12" r="1.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#pattern-manga-tone)" />
          </svg>
        );

      case 'botanical':
        // Ghibli Whimsical Foliage & Leaf Contours
        return (
          <svg className="w-full h-full opacity-[0.13] text-[var(--cn-primary)] fill-none stroke-current" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="pattern-botanical" width="120" height="120" patternUnits="userSpaceOnUse">
                <path d="M20,60 C20,40 40,30 60,30 C60,50 40,60 20,60 Z M60,30 L35,50" strokeWidth="1.5" />
                <path d="M80,100 C80,85 95,75 110,75 C110,90 95,100 80,100 Z M110,75 L92,90" strokeWidth="1.2" />
                <circle cx="90" cy="25" r="2" className="fill-current" stroke="none" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#pattern-botanical)" />
          </svg>
        );

      case 'dots':
      default:
        // Obsidian 24px Micro Dot Grid
        return (
          <div
            className="w-full h-full opacity-[0.12]"
            style={{
              backgroundImage: 'radial-gradient(var(--cn-primary) 1.5px, transparent 1.5px)',
              backgroundSize: '24px 24px',
            }}
          />
        );
    }
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none transition-opacity duration-300">
      {renderPattern()}
    </div>
  );
}
