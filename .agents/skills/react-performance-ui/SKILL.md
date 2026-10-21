---
name: react-performance-ui
description: >-
  Design system and performance engineering guidelines for the React 19 frontend application.
  Covers Nuzz.space-inspired Obsidian Moss design tokens, zero-mock local vault state, memory-efficient media
  streaming, document reader optimizations (PDF/EPUB), and bounded diagnostic logging ring buffers.
---

# React UI & Performance Engineering Skill

This skill defines the UI principles, styling tokens, and frontend performance practices for `apps/client`.

## 1. Nuzz.space-Inspired "Obsidian Moss" Design Language
- **Aesthetic Vibe**:
  - Distraction-free, developer-grade deep-work dark mode canvas inspired by nuzz.space.
  - Tactile card micro-elevation with hairline borders and soft organic glow effects.
- **Color Palette**:
  - Canvas (Pitch Obsidian): `#0A0A0B` (reduces eye strain during prolonged learning sessions).
  - Surfaces (Distraction-Free Charcoal): `#121316` (card surface), `#17191E` (subtle inner layers), `#1E2127` (card hover).
  - Primary Brand Accent (Organic Moss): `#57C564` (and hover `#69D475`) for active progress, checkmarks, primary buttons, and focus indicators.
  - Secondary Accent (Ember / Amber): `#F59E0B` for milestones, quiz badges, warnings, and learning streaks.
  - Borders & Dividers: `#202328` (default hairline), `#57C564`/35 (active/hover focus border).
  - Text Hierarchy: `#F3F4F6` (headings, high contrast), `#9CA3AF` (secondary labels), `#6B7280` (muted telemetry).
- **Typography**:
  - Primary Sans: `DM Sans` (geometric yet approachable humanistic sans for scannable UI, titles, and metrics).
  - Display / Secondary: `Plus Jakarta Sans`.
  - Diagnostics / Code: `JetBrains Mono`.
- **Glow & Tactility**:
  - Moss Glow: `box-shadow: 0 0 25px -4px rgba(87, 197, 100, 0.24)`
  - Ember Glow: `box-shadow: 0 0 25px -4px rgba(245, 158, 11, 0.2)`
  - Micro-interactions: Smooth transitions (`transition-all duration-200 cubic-bezier(0.16, 1, 0.3, 1)`).

## 2. Zero-Mock Local Vault & State Management
- **Persistence Rules**:
  - No placeholder mock objects in production views.
  - Ingest real course manifests from verified files or user imports.
  - Provide meaningful empty states with clear calls-to-action ("Import Course Archive", "Explore Course Catalog").
- **Reactive Storage Stores**:
  - Keep course state, active playback progress, and configuration in lightweight reactive stores.
  - Sync state directly with `localStorage` (or IndexedDB for large documents).

## 3. Frontend Performance & Memory Management
- **Blob & Object URL Cleanup**:
  - Always revoke created `URL.createObjectURL()` blobs via `URL.revokeObjectURL()` in component cleanup effects (`useEffect(() => () => URL.revokeObjectURL(url), [url])`).
  - Failure to revoke blob URLs leads to irreversible renderer memory leaks when reading large PDFs or video segments.
- **Video & Media Stream Efficiency**:
  - Detach video event listeners (`timeupdate`, `ended`, `error`) when switching lessons or unmounting the player.
  - Throttle progress saving to local storage (e.g., update every 5 seconds, not on every 16ms `timeupdate` tick).
- **Bounded Diagnostics Ring Buffer**:
  - Central logger (`logger.ts`) must enforce a strict maximum buffer size (e.g., 500 entries).
  - Older entries are dropped FIFO when capacity is reached, preventing unbounded array growth in long-running desktop sessions.
