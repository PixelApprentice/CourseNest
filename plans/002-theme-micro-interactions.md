# 002 — Theme-Distinct Micro-Interactions: Tactile Buttons, Cards & Scrubbers

- **Status**: DONE
- **Commit**: 42828fb
- **Severity**: MEDIUM
- **Category**: Polish & Feel
- **Estimated scope**: 4 files (~160 lines)

## Problem

Currently, buttons, cards, and playback controls share uniform Tailwind hover/active styles (`hover:opacity-90`, `active:scale-95`). This causes high-craft aesthetic themes (e.g., Manga Screentone, Neo-Tokyo Mecha, Toybox Playful) to feel visually flat and physically disconnected from their distinct thematic world.

Specifically:
1. `apps/client/src/components/VlcMediaViewer.tsx:750-840`: The video timeline scrubber is a generic unstyled range input or standard rounded bar across all 9 themes. It lacks theme-specific tactile feel, scrubber head physics, and hover telemetry.
2. `apps/client/src/features/player/LessonPlayerPage.tsx:710-820`: Next/Previous lesson buttons and playback action bars lack physical press feedback tailored to the current aesthetic (e.g. Manga ink pop vs OLED electric crispness).
3. `apps/client/src/styles/global.css`: Button styles rely on generic Tailwind utility classes rather than theme-reactive micro-interaction classes.

## Target

Establish theme-distinct micro-interactions that trigger on hover, press (`:active`), focus, and scrubber scrub. Every interaction must adhere to Emil Kowalski's tactile principles:
- Press feedback must be instantaneous (`duration: 100ms–150ms`), never starting below `scale(0.95)` to avoid visual popping.
- Release/spring must settle smoothly using the repo's `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`.
- Use composite-only properties: `transform` (`scale`, `translate`), `opacity`, and GPU-accelerated `box-shadow` / `filter`.

### 9 Theme Micro-Interaction Profiles:

| Theme | Selector | Active Press Effect | Hover Signature | Scrubber Head Physics |
|---|---|---|---|---|
| **Obsidian** | `[data-theme="obsidian"]` | `scale(0.98)` (100ms `--ease-out`) | Amber telemetry border glow (`rgba(245, 158, 11, 0.3)`) | Magnetic snap with amber coordinate tooltip |
| **Halal** | `[data-theme="halal"]` | `scale(0.97)` (140ms harmonic) | Soft geometric sage elevation (`translateY(-1px)`) | Emerald teardrop cursor with smooth glide |
| **Sakura** | `[data-theme="sakura"]` | `scale(0.96) rotate(-1deg)` (120ms spring) | Petal pink glow with subtle float (`translateY(-2px)`) | Cherry blossom petal scrubber indicator |
| **Toybox** | `[data-theme="toybox"]` | `translateY(2px)` shadow collapse | 3D drop shadow expansion (`box-shadow: 0 4px 0 #D97706`) | Bouncy rubber-band scrubber handle |
| **Mecha** | `[data-theme="cyberpunk"]` | `scale(0.98)` sharp mechanical | Cyan laser edge flare (`box-shadow: 0 0 8px #06B6D4`) | Crosshair targeting reticle with audio click |
| **Manga** | `[data-theme="manga"]` | `translate(2px, 2px)` shadow snap | Solid black comic shadow (`3px 3px 0 #000`) | Bold ink dot with screentone hover badge |
| **Ghibli** | `[data-theme="ghibli"]` | `scale(0.97)` gentle dampening | Meadow breeze lift (`translateY(-2px)`) | Sprout seedling timeline handle |
| **OLED** | `[data-theme="oled"]` | `scale(0.99)` instantaneous (80ms) | Razor emerald neon rim (`0 0 10px #10B981`) | Pure 2px minimalist laser line |
| **Paper** | `[data-theme="paper"]` | `translateY(1px)` ink stamp | Sepia drafting paper elevation with crisp edge | Drafting divider compass tick needle |

## Repo Conventions to Follow

- Custom cubic-beziers defined in `apps/client/src/styles/global.css`:
  - `--ease-out: cubic-bezier(0.23, 1, 0.32, 1);`
  - `--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);`
- Always wrap motion in `@media (prefers-reduced-motion: no-preference)`. When reduced motion is preferred, fallback to instantaneous opacity shift only.
- Zero layout thrashing: no animating `width`, `height`, `margin`, or `padding`.

## Steps

1. In `apps/client/src/styles/global.css`:
   - Add `.cn-btn-tactile` base and theme-scoped rules for all 9 themes.
   - Add `.cn-card-interactive` with theme-tailored hover elevations and borders.
   - Add `.cn-scrubber-thumb` styling responsive to `[data-theme]`.
2. In `apps/client/src/components/VlcMediaViewer.tsx`:
   - Apply `.cn-scrubber-thumb` and `.cn-btn-tactile` to the player controls bar, playback toggles, speed buttons, and full-screen switch.
   - Add subtle audio/visual click confirmation when scrubbing or toggling playback.
3. In `apps/client/src/features/player/LessonPlayerPage.tsx`:
   - Apply `.cn-btn-tactile` to lesson navigation buttons (`Previous Lesson`, `Next Lesson`, `Mark as Completed`).
   - Add `.cn-card-interactive` to the slide deck & PDF split viewer cards.

## Boundaries

- Do not modify backend API contracts or database schema.
- Do not introduce external animation libraries (e.g., Framer Motion or GSAP); use pure CSS GPU keyframes and transitions for maximum offline performance and zero runtime overhead.

## Verification

### Automated
```bash
pnpm --filter @coursenest/client typecheck
pnpm -r test
```

### Feel Check
1. Switch themes using the theme picker in the top navigation bar.
2. Hover and click the primary playback buttons:
   - On **Toybox**, observe physical 3D button depression (`translateY(2px)` with shadow collapse).
   - On **Manga**, observe sharp solid-ink shadow snap (`3px 3px 0 #000` to `0 0 0`).
   - On **Mecha**, observe cyan laser flare and instantaneous mechanical click.
   - On **OLED**, observe razor-thin emerald rim pulse.
3. Verify timeline scrubber on `VlcMediaViewer` reflects the active theme's scrubber thumb shape and hover aura.
