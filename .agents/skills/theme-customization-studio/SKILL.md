---
name: theme-customization-studio
description: >-
  Reusable Multi-Audience Theme & Aesthetic Studio engine for React, Tailwind CSS, and Next.js/Vite applications.
  Provides 9 bespoke design systems (Halal Edition, Sakura Kawaii, Toybox Kids, Neo-Tokyo Mecha, Manga Screentone,
  Studio Ghibli Nature, Obsidian Moss, OLED Midnight, and Clean Editorial) with SIL OFL open-source typography,
  zero-CPU pure CSS GPU keyframe loaders, inline SVG atmospheric backdrops, and theme-adaptive vector brand logos.
---

# Multi-Audience Theme & Aesthetic Studio Skill

This skill provides a complete, drop-in design system and theme management engine for React applications. It allows any project to instantly support diverse, beautifully tailored aesthetic themes without relying on generic AI styling, heavy external libraries, or battery-draining JavaScript animations.

---

## 1. Supported Themes & Audience Profiles

| Theme ID | Name | Target Audience | Fonts (SIL OFL) | Colors | Visual Motifs |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `halal` | **Halal Edition** | Islamic / Serene study | *Plus Jakarta Sans* | Emerald `#047857`, Gold `#D97706`, Slate `#0F172A` | Mosque minaret & dome skyline, 8-point Rub el Hizb geometry |
| `sakura` | **Sakura Bloom** | Girls, Kawaii, Pastel | *Nunito* (rounded) | Rose `#F472B6`, Blush `#FDF2F8`, Lavender `#C084FC` | Japanese garden, arched bridge, Mt. Fuji, cherry blossom petals |
| `toybox` | **Toybox Bubbly** | Children & Playful Kids | *Fredoka* (bubbly) | Sky Blue `#0284C7`, Sun `#FBBF24`, Coral `#F43F5E` | Claymorphism valley, castle toy blocks, bouncy clouds |
| `cyberpunk` | **Neo-Tokyo Mecha** | Boys, Sci-Fi Anime | *Chakra Petch* (angular) | Cyan `#00F0FF`, Neon Yellow `#FFE600`, Pink `#FF0055` | Futuristic cyber skyline, HUD radar sweep, wireframe grid |
| `manga` | **Manga Screentone** | Comic & Manga Fans | *Chakra Petch* / *DM Sans* | Ink `#050505`, Paper `#FAFAFA`, Crimson `#DC2626` | Comic action speedlines, halftone screentone dots, SFX ("ゴゴゴ") |
| `ghibli` | **Studio Ghibli Nature** | Cozy Whimsical Cottage | *Plus Jakarta Sans* | Moss `#2E6F40`, Terracotta `#C26D45`, Parchment `#FAF7EE` | Ancient camphor tree, cottage rooftop, dandelion florets |
| `obsidian` | **Obsidian Moss** | Deep Work / Engineering | *DM Sans* / *JetBrains Mono* | Pitch `#0A0A0B`, Moss `#57C564`, Slate `#CBD5E1` | Monolithic circuit conduits, architectural blueprint grid |
| `oled` | **OLED Midnight** | 0% Black Battery Saver | *Inter* / *JetBrains Mono* | True Black `#000000`, True Silver `#FFFFFF` | Deep space starfield, minimalist lunar orbit ring |
| `paper` | **Clean Editorial** | Daylight Reading Mode | *DM Sans* / *Inter* | Crisp White `#F8FAFC`, Ink `#0F172A`, Cobalt `#2563EB` | Bauhaus architectural elevation grid, print registration marks |

---

## 2. Architecture & Design Rules

1. **Pure CSS GPU Transforms (Zero-CPU Idle Guarantee)**:
   - All loaders and atmospheric animations use pure CSS `@keyframes` with `transform: translate3d(...) rotate(...)` and `opacity`.
   - Never use JavaScript `setInterval`, `requestAnimationFrame`, or Canvas timers for ambient decoration. Low-power laptops remain completely idle at 0% CPU.
2. **Contrast Scrim Protection**:
   - Scenic background artwork is layered behind a progressive gradient scrim (`mask-image` or translucent overlay) so background art never clashes with foreground text, cards, buttons, or code snippets.
3. **Open-Source Fonts (SIL OFL)**:
   - All fonts (*Chakra Petch*, *DM Sans*, *Fredoka*, *Inter*, *JetBrains Mono*, *Nunito*, *Plus Jakarta Sans*) are freely redistributable and offline-compatible.
4. **Zero-HTTP Inline Vector Art**:
   - All illustrations and logos are generated via inline SVG markup using `currentColor` or CSS variables, requiring 0 external image assets and scaling to 4K displays.
5. **Strict No-Lucide / Anti-AI-Slop Standard**:
   - Standardize strictly on `@tabler/icons-react`. Avoid generic purple gradient floating blur balls, meaningless sparkle emojis, and redundant dummy status badges.

---

## 3. Turnkey Integration into Any React Project

Copy the files from the `resources/` directory into your project:

```bash
# Target project structure:
src/
  lib/
    themeManager.ts         # Core hook & state management
  components/theme/
    BrandLogo.tsx           # Theme-adaptive vector logomark
    ThemeLoader.tsx         # 0-CPU theme-matched loading animations
    ThemeScenicBackdrop.tsx # Atmospheric scenic vector artwork
    ThemeSelectorGrid.tsx   # Swatch grid with category filtering
    ThemeSelectorModal.tsx  # Floating modal dialog
  styles/
    theme-tokens.css        # CSS variables & keyframe definitions
```

### Quick Usage Example
```tsx
import { useTheme } from './lib/themeManager';
import { ThemeScenicBackdrop } from './components/theme/ThemeScenicBackdrop';
import { BrandLogo } from './components/theme/BrandLogo';
import { ThemeSelectorModal } from './components/theme/ThemeSelectorModal';

export function App() {
  const { currentTheme } = useTheme();
  const [showThemeModal, setShowThemeModal] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--cn-bg)] text-[var(--cn-text-primary)]">
      {/* 1. Atmospheric Scenic Backdrop */}
      <ThemeScenicBackdrop />

      {/* 2. Brand Header with Theme-Adaptive Logo */}
      <header className="h-16 px-6 border-b border-[var(--cn-border)] flex items-center justify-between">
        <BrandLogo size="md" />
        <button onClick={() => setShowThemeModal(true)}>Change Theme</button>
      </header>

      {/* 3. Theme Selector Modal */}
      <ThemeSelectorModal isOpen={showThemeModal} onClose={() => setShowThemeModal(false)} />
    </div>
  );
}
```
