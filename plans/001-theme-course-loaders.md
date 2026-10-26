# 001 — Theme-Distinct Course Loading & Media Buffering Overlays

- **Status**: DONE
- **Commit**: 42828fb
- **Severity**: HIGH
- **Category**: Missed opportunities & Cohesion
- **Estimated scope**: 5 files (~130 lines)

## Problem

When learners launch a course, transition between chapters, or wait for high-bitrate video to buffer from the private local vault, the interface currently displays a jarring black void or an unstyled generic browser spinner. 

Specifically:
1. `apps/client/src/components/VlcMediaViewer.tsx:512-545`: When `src` is resolving or the HTML5 video engine fires `waiting` or `stalled`, the viewer renders pure black with no visual feedback.
2. `apps/client/src/features/player/LessonPlayerPage.tsx:527-531`: When loading local vault media (`vault-media://`), IndexedDB blob resolution is asynchronous. The lesson player passes an empty string `videoSrc = ''`, leaving learners staring at an inactive rectangle.
3. `apps/client/src/features/course/CourseLandingPage.tsx:466`: The course resume button falls back to a hardcoded white border spinner (`border-2 border-white/30 border-t-white animate-spin`), breaking theme cohesion.
4. `apps/client/src/components/ThemeLoader.tsx`: A bespoke 9-theme loader component already exists with specialized SVG animations (Rub-el-Hizb 8-point star for Halal, falling petals for Sakura, 3D jumping blocks for Toybox, cyber HUD reticle for Mecha, comic speedlines for Manga, and whimsical seedling for Ghibli), but is completely unreferenced by the video player and course loading transitions.

```tsx
/* apps/client/src/features/player/LessonPlayerPage.tsx:527-530 — current */
if (block.type === 'video') {
  const fallbackSampleUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
  const videoSrc = resolvedMediaUrls[block.id] || (block.src?.startsWith('vault-media://') ? '' : block.src) || fallbackSampleUrl;
```

```tsx
/* apps/client/src/features/course/CourseLandingPage.tsx:466 — current */
{isLaunching ? (
  <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
) : (
  <IconPlayerPlay size={14} />
)}
```

## Target

Integrate `ThemeLoader` into the media lifecycle so that each theme displays its distinct, zero-CPU GPU-accelerated signature animation during media preparation and playback buffering delays.

The 9 theme signatures must render as follows:
- **Obsidian Moss** (`orbit`): Dual concentric precision rings with staggered counter-rotation (`1.2s linear`) and amber telemetry pulse.
- **Halal Serenity** (`star8`): 8-point geometric Rub-el-Hizb star rotating through 45-degree harmonic expansion (`3.0s ease-in-out`).
- **Sakura Kawaii** (`blossom`): 5-petal sakura blossom floating vertically (-8px) with organic 12-degree tilt (`2.5s ease-in-out`).
- **Toybox Playful** (`blocks`): 3 staggered primary-color rounded blocks bouncing with squash-and-stretch cubic curves (`1.2s cubic-bezier(0.23, 1, 0.32, 1)` with 0.2s stagger).
- **Neo-Tokyo Mecha** (`radar`): Sci-Fi HUD targeting reticle with 360-degree radar sweep (`2.0s linear`).
- **Manga Screentone** (`speedline`): Action burst radiating inward/outward with sharp deceleration (`1.4s cubic-bezier(0.16, 1, 0.3, 1)`).
- **Studio Ghibli** (`leaf`): Hand-drawn dual leaf seedling swaying in an organic meadow breeze (`3.0s ease-in-out`).
- **OLED Midnight** (`neon_pulse`): Pure `#000000` power-saving backdrop with a razor-thin single `#10B981` emerald ring pulse (`1.5s ease-out`).
- **Clean Daylight / Paper** (`blueprint_compass`): Warm sepia drafting compass arc with subtle page-corner fold pulse (`1.8s ease-in-out`).

```tsx
/* target in apps/client/src/components/VlcMediaViewer.tsx */
{isBuffering && (
  <div className="absolute inset-0 z-30 bg-black/60 backdrop-blur-xs flex items-center justify-center transition-opacity duration-200 ease-out">
    <ThemeLoader size="lg" text="Buffering Lecture Video..." />
  </div>
)}
```

## Repo Conventions to Follow

- Custom easings live in `apps/client/src/styles/global.css`:
  - `--ease-out: cubic-bezier(0.23, 1, 0.32, 1);`
  - `--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);`
- Keyframe animations must use composite-only properties: `transform` and `opacity` only (zero layout shifts, zero repaints).
- Scale transitions must never start from `scale(0)` (per Emil Kowalski rules, use `scale(0.9)` to `scale(1)`).
- Exemplar: `apps/client/src/styles/global.css:506-630` for existing keyframe definitions.

## Steps

1. In `apps/client/src/lib/themeManager.ts`:
   - Update `ThemeDefinition.loaderType` type to include `'neon_pulse' | 'compass'`.
   - Set `loaderType: 'neon_pulse'` for theme `oled`.
   - Set `loaderType: 'compass'` for theme `paper`.
2. In `apps/client/src/styles/global.css`:
   - Add `@keyframes oled-pulse` with `transform: scale(0.92)` to `scale(1.04)` and `opacity: 0.7` to `1.0`.
   - Add `@keyframes paper-compass` with `transform: rotate(0deg)` to `rotate(360deg)` using `cubic-bezier(0.77, 0, 0.175, 1)`.
   - Ensure all loaders have `@media (prefers-reduced-motion: reduce)` fallbacks that preserve opacity pulse while removing positional translation and 360-degree spinning.
3. In `apps/client/src/components/ThemeLoader.tsx`:
   - Add cases for `neon_pulse` (OLED emerald ring) and `compass` (Editorial blueprint drafting circle).
   - Add `fullScreenOverlay?: boolean` prop for centered full-viewport modal delays.
4. In `apps/client/src/components/VlcMediaViewer.tsx`:
   - Add state: `const [isBuffering, setIsBuffering] = useState(false);`
   - Bind video element listeners:
     - `onWaiting={() => setIsBuffering(true)}`
     - `onPlaying={() => setIsBuffering(false)}`
     - `onCanPlay={() => setIsBuffering(false)}`
     - `onLoadStart={() => setIsBuffering(Boolean(src))}`
   - Render overlay when `isBuffering || !src`:
     ```tsx
     {(isBuffering || !src) && (
       <div className="absolute inset-0 z-30 bg-black/60 backdrop-blur-xs flex items-center justify-center pointer-events-none transition-opacity duration-200 ease-out">
         <ThemeLoader size="lg" text={!src ? "Accessing Vault Storage..." : "Buffering Stream..."} />
       </div>
     )}
     ```
5. In `apps/client/src/features/course/CourseLandingPage.tsx`:
   - Replace the generic white spinner on line 466 with `<ThemeLoader size="sm" />`.

## Boundaries

- Do NOT alter video decoding, audio gain, or media vault decryption logic.
- Do NOT add external animation libraries (e.g. Lottie or Framer Motion). Plain CSS keyframes and SVG only.
- Do NOT animate non-composite properties (`width`, `height`, `margin`, `padding`).

## Verification

- **Mechanical**:
  - `pnpm --filter @coursenest/client typecheck` must pass with 0 errors.
  - `pnpm -r test` must pass all 16 tests.
- **Feel check**:
  - Open `ThemeCustomizationStudio` in Settings and switch between all 9 themes.
  - Open a lecture video in `LessonPlayerPage`. In Chrome DevTools Network tab, set Throttling to "Fast 3G". Seek 2 minutes forward.
  - Confirm: Instead of an empty black void, the active theme's distinct animation smoothly appears with a 200ms ease-out fade, animates without dropping frames, and dissolves when playback resumes.
  - Test under Toybox theme: Verify bouncing cubes squish on impact (`scale(1.1, 0.9)`).
  - Test under Manga theme: Verify high-energy speedline burst displays high-contrast comic ink borders.
  - In DevTools Rendering tab, enable "Emulate CSS media feature prefers-reduced-motion". Confirm the animations gracefully switch to static opacity pulsing without spinning or jumping.
- **Done when**:
  - All 9 themes display their unique loader during course launching, vault media resolving, and video buffering, with zero layout shift and 60fps GPU execution.
