# CourseNest Animation & Motion Improvement Plans

This directory contains prioritized, self-contained animation engineering plans formulated under Emil Kowalski's motion and tactile UI principles.

## Roadmap & Execution Order

| # | Plan Slug | Severity | Category | Status | Target Files |
|---|---|---|---|---|---|
| **001** | [Theme-Distinct Course Loaders & Media Buffering Overlays](001-theme-course-loaders.md) | HIGH | Missed opportunities & Cohesion | **DONE** | `ThemeLoader.tsx`, `VlcMediaViewer.tsx`, `LessonPlayerPage.tsx`, `CourseLandingPage.tsx`, `global.css` |
| **002** | [Theme-Distinct Micro-Interactions: Tactile Buttons, Cards & Scrubbers](002-theme-micro-interactions.md) | MEDIUM | Polish & Feel | **DONE** | `global.css`, `VlcMediaViewer.tsx`, `LessonPlayerPage.tsx` |

## Core Principles Enforced

1. **Composite-Only Properties**: Motion strictly animates `transform` (`translate`, `scale`, `rotate`), `opacity`, and GPU-composited `filter`/`box-shadow`. Zero layout reflow (`width`, `height`, `margin`, `padding`).
2. **Tactile Physics**: Fast, snappy press feedback (`100ms–150ms`), no ungrounded bouncing or rubber-banding where unwarranted. Minimum press scale of `scale(0.95)` (no `scale(0)` pops).
3. **Harmonic Curves**: Standardized cubic-beziers defined as CSS tokens:
   - Snappy Deceleration: `--ease-out: cubic-bezier(0.23, 1, 0.32, 1);`
   - Expressive Natural: `--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);`
   - Gentle Spring: `--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);`
4. **Accessibility First**: Every keyframe and transition includes comprehensive `@media (prefers-reduced-motion: reduce)` fallbacks that preserve state visibility through subtle opacity fades without positional shifts.
5. **Zero Frame Budget Tax**: Pure CSS animations and SVG vector paths with zero runtime JavaScript libraries (0ms JS bundle bloat, zero main-thread CPU cost).
