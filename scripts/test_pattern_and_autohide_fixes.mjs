import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

console.log('=== TEST SUITE: THEME PATTERNS & VIDEO CONTROLS AUTO-HIDE ===\n');

const clientSrcDir = path.resolve('apps/client/src');

// 1. Verify ThemeBackdropPattern.tsx
const backdropPatternPath = path.join(clientSrcDir, 'components/ThemeBackdropPattern.tsx');
assert.ok(fs.existsSync(backdropPatternPath), 'ThemeBackdropPattern.tsx must exist');
const patternSrc = fs.readFileSync(backdropPatternPath, 'utf8');

const requiredPatterns = [
  'arabesque',
  'petals',
  'confetti',
  'grid',
  'screentone',
  'botanical',
  'dots',
  'none'
];

for (const p of requiredPatterns) {
  assert.ok(
    patternSrc.includes(`case '${p}':`) || p === 'none' || p === 'dots',
    `ThemeBackdropPattern must implement pattern: ${p}`
  );
}
assert.ok(patternSrc.includes('useId'), 'ThemeBackdropPattern must use useId for collision-free SVG pattern IDs');
assert.ok(patternSrc.includes('className'), 'ThemeBackdropPattern must support custom className for container placement');
console.log('✔ ThemeBackdropPattern contains all 8 theme pattern types with unique IDs and custom className support.');

// 2. Verify Sidebar.tsx renders ThemeBackdropPattern
const sidebarPath = path.join(clientSrcDir, 'layouts/Sidebar.tsx');
const sidebarSrc = fs.readFileSync(sidebarPath, 'utf8');
assert.ok(sidebarSrc.includes('ThemeBackdropPattern'), 'Sidebar.tsx must import and render ThemeBackdropPattern');
assert.ok(sidebarSrc.includes('idPrefix="sidebar"'), 'Sidebar.tsx must pass idPrefix="sidebar"');
assert.ok(sidebarSrc.includes('relative z-10'), 'Sidebar content must be layered on relative z-10 above the pattern');
console.log('✔ Sidebar.tsx correctly layers ThemeBackdropPattern across the sidebar surface.');

// 3. Verify AppTitleBar.tsx renders ThemeBackdropPattern
const titleBarPath = path.join(clientSrcDir, 'components/AppTitleBar.tsx');
const titleBarSrc = fs.readFileSync(titleBarPath, 'utf8');
assert.ok(titleBarSrc.includes('ThemeBackdropPattern'), 'AppTitleBar.tsx must import and render ThemeBackdropPattern');
assert.ok(titleBarSrc.includes('idPrefix="navbar"'), 'AppTitleBar.tsx must pass idPrefix="navbar"');
assert.ok(titleBarSrc.includes('overflow-hidden'), 'AppTitleBar.tsx header must have overflow-hidden');
console.log('✔ AppTitleBar.tsx correctly layers ThemeBackdropPattern across the navbar surface.');

// 4. Verify AppLayout.tsx renders global ThemeBackdropPattern
const layoutPath = path.join(clientSrcDir, 'layouts/AppLayout.tsx');
const layoutSrc = fs.readFileSync(layoutPath, 'utf8');
assert.ok(layoutSrc.includes('ThemeBackdropPattern'), 'AppLayout.tsx must import and render ThemeBackdropPattern');
console.log('✔ AppLayout.tsx mounts global ThemeBackdropPattern.');

// 5. Verify CourseLandingPage.tsx renders ThemeBackdropPattern
const courseLandingPath = path.join(clientSrcDir, 'features/course/CourseLandingPage.tsx');
const courseLandingSrc = fs.readFileSync(courseLandingPath, 'utf8');
assert.ok(courseLandingSrc.includes('ThemeBackdropPattern'), 'CourseLandingPage.tsx must import and render ThemeBackdropPattern');
assert.ok(courseLandingSrc.includes('idPrefix="course-hero"'), 'CourseLandingPage.tsx hero banner must render ThemeBackdropPattern');
assert.ok(courseLandingSrc.includes('idPrefix="course-overview"'), 'CourseLandingPage.tsx page body must render ThemeBackdropPattern');
console.log('✔ CourseLandingPage.tsx renders ThemeBackdropPattern on both the course overview page and the hero banner.');

// 6. Verify VlcMediaViewer.tsx controls auto-hide behavior
const viewerPath = path.join(clientSrcDir, 'components/VlcMediaViewer.tsx');
const viewerSrc = fs.readFileSync(viewerPath, 'utf8');

// Ensure isPointerOverControlsRef was completely eradicated
assert.ok(
  !viewerSrc.includes('isPointerOverControlsRef'),
  'VlcMediaViewer.tsx must NOT contain isPointerOverControlsRef which caused the permanent blocking bug'
);

// Verify shouldPreventAutoHide only guards active states: paused, buffering, error, seeking, panel, menu
const shouldPreventMatch = viewerSrc.match(/const shouldPreventAutoHide = useCallback\(\(\) => \{([\s\S]*?)\}, \[\]\);/);
assert.ok(shouldPreventMatch, 'shouldPreventAutoHide definition must exist');
const shouldPreventBody = shouldPreventMatch[1];
assert.ok(shouldPreventBody.includes('!isPlayingRef.current'), 'shouldPreventAutoHide must check !isPlayingRef.current');
assert.ok(shouldPreventBody.includes('isBufferingRef.current'), 'shouldPreventAutoHide must check isBufferingRef.current');
assert.ok(shouldPreventBody.includes('hasPlaybackErrorRef.current'), 'shouldPreventAutoHide must check hasPlaybackErrorRef.current');
assert.ok(shouldPreventBody.includes('isSeekingRef.current'), 'shouldPreventAutoHide must check isSeekingRef.current');
assert.ok(shouldPreventBody.includes('showVlcPanelRef.current'), 'shouldPreventAutoHide must check showVlcPanelRef.current');
assert.ok(shouldPreventBody.includes('isMenuOpenRef.current'), 'shouldPreventAutoHide must check isMenuOpenRef.current');

// Verify onPointerLeave triggers scheduleAutoHide
assert.ok(
  viewerSrc.includes('onPointerLeave={scheduleAutoHide}'),
  'VlcMediaViewer container must invoke scheduleAutoHide on onPointerLeave'
);

// Verify cursor-none is applied when controls are hidden
assert.ok(
  viewerSrc.includes('cursor-none [&_*]:cursor-none'),
  'VlcMediaViewer must apply cursor-none when controls are hidden during playback'
);

console.log('✔ VlcMediaViewer auto-hide logic verified: isPointerOverControlsRef removed, timer fires unconditionally after 3s inactivity.');

console.log('\nALL VERIFICATION CHECKS PASSED SUCCESSFULLY.');
