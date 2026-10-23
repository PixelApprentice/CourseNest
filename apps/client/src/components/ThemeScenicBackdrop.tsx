import React from 'react';
import { useTheme } from '../lib/themeManager';

export const ThemeScenicBackdrop: React.FC = () => {
  const { currentTheme } = useTheme();
  const artwork = currentTheme.scenicArtwork || 'monolith_circuits';

  const renderScenicIllustration = () => {
    switch (artwork) {
      case 'mosque_skyline':
        // 🕌 Halal Edition: Grand Ottoman & Andalusian Mosque Outline, Minarets, Arched Colonnades & Arabesque
        return (
          <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
            {/* Islamic 8-Point Rub el Hizb Geometric Tiling Texture */}
            <svg className="absolute inset-0 w-full h-full opacity-[0.035] text-[#047857]" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="halal-tile-bg" width="80" height="80" patternUnits="userSpaceOnUse">
                  <polygon points="40,8 47,26 65,20 57,37 72,40 57,43 65,60 47,54 40,72 33,54 15,60 23,43 8,40 23,37 15,20 33,26" fill="none" stroke="currentColor" strokeWidth="1.2" />
                  <rect x="22" y="22" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="0.8" strokeDasharray="2 2" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#halal-tile-bg)" />
            </svg>

            {/* Grand Mosque Skyline Vector Illustration at Bottom-Right & Center */}
            <svg
              className="absolute right-0 bottom-0 w-full max-w-4xl h-80 sm:h-96 opacity-[0.12] text-[#047857] transition-opacity duration-300 ease-out"
              viewBox="0 0 1000 400"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="xMaxYMax meet"
            >
              {/* Crescent Moon in Desert Sky */}
              <path
                d="M850,70 A25,25 0 1 0 865,115 A30,30 0 1 1 850,70 Z"
                fill="#D97706"
                className="opacity-70"
              />

              {/* Distant Stars */}
              <circle cx="780" cy="50" r="1.5" fill="#D97706" />
              <circle cx="920" cy="85" r="2" fill="#D97706" />
              <circle cx="670" cy="110" r="1.5" fill="#D97706" />
              <circle cx="590" cy="65" r="2" fill="#D97706" />

              {/* Slender Left Minaret */}
              <path d="M420,400 L420,120 L425,110 L425,70 L430,60 L430,40 L431,25 L433,40 L433,60 L438,70 L438,110 L443,120 L443,400 Z" stroke="currentColor" strokeWidth="2.5" fill="currentColor" fillOpacity="0.05" />
              <rect x="415" y="140" width="33" height="8" rx="2" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.1" />
              <rect x="418" y="220" width="27" height="8" rx="2" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.1" />
              {/* Minaret Crescent */}
              <circle cx="431" cy="20" r="4" stroke="#D97706" strokeWidth="1.5" fill="none" />

              {/* Majestic Central Dome with Spire & Crescent */}
              <path d="M470,400 L470,260 C470,160 550,140 600,100 C650,140 730,160 730,260 L730,400 Z" stroke="currentColor" strokeWidth="3" fill="currentColor" fillOpacity="0.06" />
              {/* Dome Finial & Spire */}
              <line x1="600" y1="100" x2="600" y2="40" stroke="#D97706" strokeWidth="3" strokeLinecap="round" />
              <circle cx="600" cy="35" r="6" stroke="#D97706" strokeWidth="2" fill="none" />
              <path d="M597,29 A8,8 0 1 0 605,43 A10,10 0 1 1 597,29 Z" fill="#D97706" />

              {/* Horseshoe Arch Windows on Central Dome */}
              <path d="M530,300 C530,270 550,250 560,250 C570,250 590,270 590,300 L590,340 L530,340 Z" stroke="currentColor" strokeWidth="2" fill="none" />
              <path d="M610,300 C610,270 630,250 640,250 C650,250 670,270 670,300 L670,340 L610,340 Z" stroke="currentColor" strokeWidth="2" fill="none" />

              {/* Secondary Dome Left */}
              <path d="M340,400 L340,290 C340,220 390,210 420,180 C440,200 470,220 470,290 L470,400 Z" stroke="currentColor" strokeWidth="2.5" fill="currentColor" fillOpacity="0.04" />
              <line x1="420" y1="180" x2="420" y2="150" stroke="#D97706" strokeWidth="2" />

              {/* Slender Right Minaret */}
              <path d="M760,400 L760,130 L765,120 L765,80 L770,70 L770,48 L771,32 L773,48 L773,70 L778,80 L778,120 L783,130 L783,400 Z" stroke="currentColor" strokeWidth="2.5" fill="currentColor" fillOpacity="0.05" />
              <rect x="756" y="150" width="31" height="7" rx="2" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.1" />
              <circle cx="771" cy="27" r="3.5" stroke="#D97706" strokeWidth="1.5" fill="none" />

              {/* Arabesque Arch Colonnade at Foundation */}
              <g stroke="currentColor" strokeWidth="2" fill="none">
                <path d="M250,400 L250,340 C250,320 270,310 280,310 C290,310 310,320 310,340 L310,400" />
                <path d="M310,400 L310,340 C310,320 330,310 340,310 C350,310 370,320 370,340 L370,400" />
                <path d="M800,400 L800,340 C800,320 820,310 830,310 C840,310 860,320 860,340 L860,400" />
                <path d="M860,400 L860,340 C860,320 880,310 890,310 C900,310 920,320 920,340 L920,400" />
              </g>
            </svg>
          </div>
        );

      case 'manga_screentone_burst':
        // 💥 Manga Screentone: Action Speedlines, Comic Frame Outlines & Halftone Dot Overlay
        return (
          <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
            {/* Halftone Screentone Matrix */}
            <svg className="absolute inset-0 w-full h-full opacity-[0.05] text-[var(--cn-text-primary)]" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="manga-tone-pat" width="20" height="20" patternUnits="userSpaceOnUse">
                  <circle cx="5" cy="5" r="1.8" fill="currentColor" />
                  <circle cx="15" cy="15" r="1.8" fill="currentColor" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#manga-tone-pat)" />
            </svg>

            {/* Dynamic Comic Speedlines Radiating from Center-Right */}
            <svg className="absolute inset-0 w-full h-full opacity-[0.07] text-[var(--cn-primary)]" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
              <line x1="100%" y1="20%" x2="0%" y2="0%" stroke="currentColor" strokeWidth="3" strokeDasharray="120 40" />
              <line x1="100%" y1="20%" x2="0%" y2="35%" stroke="currentColor" strokeWidth="2" strokeDasharray="160 60" />
              <line x1="100%" y1="20%" x2="0%" y2="70%" stroke="currentColor" strokeWidth="3.5" strokeDasharray="200 80" />
              <line x1="100%" y1="20%" x2="25%" y2="100%" stroke="currentColor" strokeWidth="2.5" strokeDasharray="140 50" />
              <line x1="100%" y1="20%" x2="60%" y2="100%" stroke="currentColor" strokeWidth="4" strokeDasharray="180 70" />
            </svg>

            {/* Comic Action SFX ("ドォン" / "ゴゴゴ") Watermark Outline at Bottom-Right */}
            <div className="absolute right-8 bottom-6 opacity-[0.06] font-display font-black text-8xl md:text-9xl tracking-tighter text-[var(--cn-text-primary)] rotate-[-6deg] select-none">
              ゴゴゴ
            </div>
          </div>
        );

      case 'sakura_garden':
        // 🌸 Sakura Bloom: Japanese Garden Arch Bridge, Mt. Fuji Contour & Weeping Petals
        return (
          <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
            {/* Drifting Petals Backdrop */}
            <svg className="absolute inset-0 w-full h-full opacity-[0.06] text-[#EC4899] fill-current" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="sakura-garden-pat" width="120" height="120" patternUnits="userSpaceOnUse">
                  <path d="M25,25 C25,12 18,5 25,2 C32,5 25,12 25,25 Z" transform="rotate(28 25 25)" />
                  <path d="M85,75 C85,62 78,55 85,52 C92,55 85,62 85,75 Z" transform="rotate(-40 85 75)" />
                  <circle cx="50" cy="95" r="2" opacity="0.6" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#sakura-garden-pat)" />
            </svg>

            {/* Mt. Fuji & Japanese Garden Bridge Silhouette at Bottom */}
            <svg
              className="absolute right-0 bottom-0 w-full max-w-3xl h-72 opacity-[0.10] text-[#EC4899] transition-opacity duration-300 ease-out"
              viewBox="0 0 800 300"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="xMaxYMax meet"
            >
              {/* Mt. Fuji Distant Silhouette */}
              <path d="M150,300 L320,110 C340,90 380,90 400,110 L580,300 Z" stroke="currentColor" strokeWidth="2.5" fill="currentColor" fillOpacity="0.04" />
              <path d="M330,120 L350,140 L370,125 L390,145 L385,115 C375,100 345,100 330,120 Z" fill="#FFFFFF" fillOpacity="0.3" stroke="currentColor" strokeWidth="1.5" />

              {/* Japanese Taiko Arched Garden Bridge */}
              <path d="M500,300 C500,240 680,240 680,300" stroke="currentColor" strokeWidth="4" fill="none" />
              <path d="M520,300 C520,255 660,255 660,300" stroke="currentColor" strokeWidth="2" strokeDasharray="6 6" fill="none" />
              <line x1="560" y1="262" x2="560" y2="300" stroke="currentColor" strokeWidth="2" />
              <line x1="620" y1="262" x2="620" y2="300" stroke="currentColor" strokeWidth="2" />

              {/* Weeping Cherry Blossom Branch Top-Right */}
              <path d="M800,0 C720,30 650,70 600,140" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              <circle cx="620" cy="115" r="5" fill="#EC4899" />
              <circle cx="650" cy="85" r="6" fill="#EC4899" />
              <circle cx="700" cy="50" r="7" fill="#EC4899" />
            </svg>
          </div>
        );

      case 'toybox_valley':
        // 🧸 Toybox Bubbly: 3D Toy Castle Blocks, Bouncy Hills & Hot Air Balloon
        return (
          <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
            {/* Playful Confetti Pattern */}
            <svg className="absolute inset-0 w-full h-full opacity-[0.06] text-[#0284C7] fill-current" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="toy-confetti-pat" width="100" height="100" patternUnits="userSpaceOnUse">
                  <rect x="20" y="20" width="10" height="10" rx="3" transform="rotate(20 25 25)" />
                  <circle cx="75" cy="30" r="5" fill="#F59E0B" />
                  <polygon points="85,80 92,92 78,92" fill="#F43F5E" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#toy-confetti-pat)" />
            </svg>

            {/* Toy Castle & Rolling Hills at Bottom */}
            <svg
              className="absolute right-0 bottom-0 w-full max-w-2xl h-64 opacity-[0.10] text-[#0284C7]"
              viewBox="0 0 600 240"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="xMaxYMax meet"
            >
              {/* Rolling Bubbly Hills */}
              <path d="M0,240 C100,180 250,180 350,240" stroke="currentColor" strokeWidth="3" fill="currentColor" fillOpacity="0.04" />
              <path d="M280,240 C380,160 520,160 600,240" stroke="currentColor" strokeWidth="3" fill="currentColor" fillOpacity="0.06" />

              {/* Toy Castle Building Blocks */}
              <rect x="420" y="140" width="40" height="50" rx="6" stroke="#0284C7" strokeWidth="2.5" fill="#0284C7" fillOpacity="0.1" />
              <rect x="470" y="110" width="45" height="80" rx="6" stroke="#F59E0B" strokeWidth="2.5" fill="#F59E0B" fillOpacity="0.1" />
              <polygon points="492,80 460,110 525,110" stroke="#F43F5E" strokeWidth="2.5" fill="#F43F5E" fillOpacity="0.15" />

              {/* Drifting Hot Air Balloon */}
              <circle cx="200" cy="70" r="24" stroke="#F59E0B" strokeWidth="2.5" fill="#F59E0B" fillOpacity="0.1" />
              <rect x="194" y="100" width="12" height="8" rx="2" stroke="#0284C7" strokeWidth="2" />
              <line x1="188" y1="90" x2="195" y2="100" stroke="#0284C7" strokeWidth="1.5" />
              <line x1="212" y1="90" x2="205" y2="100" stroke="#0284C7" strokeWidth="1.5" />
            </svg>
          </div>
        );

      case 'mecha_skyline':
        // ⚡ Neo-Tokyo Mecha: Cyberpunk City Spire Grid & HUD Reticle Overlays
        return (
          <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
            {/* Wireframe Perspective Grid */}
            <svg className="absolute inset-0 w-full h-full opacity-[0.05] text-[#00F0FF] stroke-current" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="mecha-grid-pat" width="50" height="50" patternUnits="userSpaceOnUse">
                  <rect x="0" y="0" width="50" height="50" strokeWidth="0.8" fill="none" />
                  <path d="M0,0 L8,0 L0,8 Z" fill="currentColor" stroke="none" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#mecha-grid-pat)" />
            </svg>

            {/* Futuristic Mecha Skyline & Target Brackets at Bottom */}
            <svg
              className="absolute right-0 bottom-0 w-full max-w-4xl h-80 opacity-[0.11] text-[#00F0FF]"
              viewBox="0 0 900 300"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="xMaxYMax meet"
            >
              {/* Angular Cyber Skyscraper Spires */}
              <polygon points="500,300 500,120 520,80 540,80 560,120 560,300" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.04" />
              <polygon points="580,300 580,60 595,30 615,30 630,60 630,300" stroke="currentColor" strokeWidth="2.5" fill="currentColor" fillOpacity="0.06" />
              <line x1="605" y1="30" x2="605" y2="5" stroke="#FF007F" strokeWidth="2" />
              <polygon points="650,300 650,150 670,120 690,120 710,150 710,300" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.03" />

              {/* HUD Targeting Reticle at Upper-Right */}
              <circle cx="780" cy="100" r="45" stroke="currentColor" strokeWidth="1.5" strokeDasharray="8 6" />
              <circle cx="780" cy="100" r="30" stroke="#FF007F" strokeWidth="1.5" />
              <line x1="720" y1="100" x2="840" y2="100" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="780" y1="40" x2="780" y2="160" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
              <text x="740" y="165" fill="currentColor" fontSize="10" fontFamily="monospace" letterSpacing="2">SYS.RADAR//OK</text>
            </svg>
          </div>
        );

      case 'ghibli_meadow':
        // 🍃 Studio Ghibli Nature: Majestic Ancient Camphor Tree, Cottage Roof & Dandelion Florets
        return (
          <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
            {/* Whimsical Botanical Leaf Texture */}
            <svg className="absolute inset-0 w-full h-full opacity-[0.05] text-[#3B7A57] stroke-current fill-none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="ghibli-leaf-pat" width="110" height="110" patternUnits="userSpaceOnUse">
                  <path d="M20,60 C20,35 45,25 65,25 C65,45 45,60 20,60 Z M65,25 L35,48" strokeWidth="1.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#ghibli-leaf-pat)" />
            </svg>

            {/* Giant Camphor Tree & Cottage Silhouette at Bottom */}
            <svg
              className="absolute right-0 bottom-0 w-full max-w-3xl h-80 opacity-[0.10] text-[#3B7A57]"
              viewBox="0 0 800 320"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="xMaxYMax meet"
            >
              {/* Rolling Meadow Ridge */}
              <path d="M0,320 C180,240 400,240 600,290 C680,310 750,315 800,320" stroke="currentColor" strokeWidth="3" fill="currentColor" fillOpacity="0.04" />

              {/* Ancient Giant Camphor Tree Canopy */}
              <path d="M520,320 C520,220 540,200 560,170 C530,170 500,150 490,120 C480,90 510,50 550,50 C580,20 630,20 660,50 C700,40 740,70 735,110 C760,140 730,190 690,190 C700,230 710,270 710,320" stroke="currentColor" strokeWidth="3" fill="currentColor" fillOpacity="0.06" />

              {/* Cozy Cottage Roof with Chimney */}
              <polygon points="340,280 410,220 480,280" stroke="#C2593F" strokeWidth="2.5" fill="#C2593F" fillOpacity="0.1" />
              <rect x="440" y="210" width="14" height="25" stroke="#C2593F" strokeWidth="2" fill="none" />

              {/* Drifting Dandelion Florets */}
              <circle cx="300" cy="140" r="3" fill="#3B7A57" />
              <line x1="300" y1="140" x2="305" y2="150" stroke="#3B7A57" strokeWidth="1" />
              <circle cx="240" cy="180" r="2.5" fill="#3B7A57" />
            </svg>
          </div>
        );

      case 'lunar_stars':
        // 🖤 OLED Midnight: Deep Space Orbit & Starfield
        return (
          <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
            <svg className="absolute inset-0 w-full h-full opacity-[0.08] text-white" xmlns="http://www.w3.org/2000/svg">
              <circle cx="15%" cy="20%" r="1" fill="currentColor" />
              <circle cx="45%" cy="12%" r="1.5" fill="currentColor" />
              <circle cx="75%" cy="30%" r="1" fill="currentColor" />
              <circle cx="85%" cy="15%" r="2" fill="currentColor" />
              <circle cx="65%" cy="75%" r="1.5" fill="currentColor" />
              <circle cx="25%" cy="80%" r="1" fill="currentColor" />
              {/* Crescent Lunar Halo Top-Right */}
              <circle cx="88%" cy="18%" r="40" stroke="currentColor" strokeWidth="1" strokeDasharray="4 8" fill="none" />
            </svg>
          </div>
        );

      case 'editorial_blueprint':
        // ☀️ Clean Editorial: Swiss Architectural Grid & Registration Marks
        return (
          <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
            <svg className="absolute inset-0 w-full h-full opacity-[0.04] text-[var(--cn-text-muted)] stroke-current" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="editorial-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" strokeWidth="0.8" />
                  <circle cx="0" cy="0" r="1.5" fill="currentColor" stroke="none" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#editorial-grid)" />
            </svg>
            {/* Top-Right Bauhaus Registration Mark */}
            <div className="absolute right-8 top-8 opacity-[0.06] text-xs font-mono tracking-widest text-[var(--cn-text-primary)]">
              FIG.01 // GRID-SPEC
            </div>
          </div>
        );

      case 'monolith_circuits':
      default:
        // 🌿 Obsidian Moss: Precision Monolithic Architectural Conduits & Dot Grid
        return (
          <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
            <svg className="absolute inset-0 w-full h-full opacity-[0.04] text-[#57C564]" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="obsidian-dots" width="28" height="28" patternUnits="userSpaceOnUse">
                  <circle cx="14" cy="14" r="1.2" fill="currentColor" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#obsidian-dots)" />
            </svg>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none transition-opacity duration-300 ease-out">
      {/* 1. Underlying Scenic Art Layer */}
      {renderScenicIllustration()}

      {/* 2. Progressive Gradient Scrim Mask (guarantees text contrast & zero collision) */}
      <div 
        className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-[var(--cn-bg)]/60 to-[var(--cn-bg)]"
        style={{ mixBlendMode: 'normal' }}
      />
    </div>
  );
};
