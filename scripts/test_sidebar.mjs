import assert from 'node:assert/strict';

const SIDEBAR_MIN_WIDTH = 180;
const SIDEBAR_MAX_WIDTH = 420;
const SIDEBAR_DEFAULT_WIDTH = 256;
const SIDEBAR_RAIL_WIDTH = 64;

// Pure reducer simulation of sidebar resize logic
function resizeSidebar(currentWidth, deltaX, isCollapsed) {
  const initial = isCollapsed ? SIDEBAR_MIN_WIDTH : currentWidth;
  const next = initial + deltaX;
  if (next < SIDEBAR_MIN_WIDTH) {
    return { width: SIDEBAR_RAIL_WIDTH, isCollapsed: true };
  }
  const clamped = Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, next));
  return { width: clamped, isCollapsed: false };
}

function handleKeyResize(currentWidth, key, isCollapsed) {
  if (key === 'ArrowLeft') {
    if (isCollapsed) return { width: SIDEBAR_RAIL_WIDTH, isCollapsed: true };
    if (currentWidth - 16 < SIDEBAR_MIN_WIDTH) {
      return { width: SIDEBAR_RAIL_WIDTH, isCollapsed: true };
    }
    return { width: currentWidth - 16, isCollapsed: false };
  }
  if (key === 'ArrowRight') {
    if (isCollapsed) return { width: SIDEBAR_MIN_WIDTH, isCollapsed: false };
    return { width: Math.min(SIDEBAR_MAX_WIDTH, currentWidth + 16), isCollapsed: false };
  }
  if (key === 'Home') return { width: SIDEBAR_MIN_WIDTH, isCollapsed: false };
  if (key === 'End') return { width: SIDEBAR_MAX_WIDTH, isCollapsed: false };
  if (key === 'Reset') return { width: SIDEBAR_DEFAULT_WIDTH, isCollapsed: false };
  return { width: currentWidth, isCollapsed };
}

console.log('Testing Sidebar Resizing & Keyboard Accessibility Logic...');

// 1. Drag within bounds
const r1 = resizeSidebar(256, 50, false);
assert.equal(r1.width, 306);
assert.equal(r1.isCollapsed, false);

// 2. Drag above max
const r2 = resizeSidebar(400, 50, false);
assert.equal(r2.width, 420, 'Clamped to 420px max');
assert.equal(r2.isCollapsed, false);

// 3. Drag below min collapses to rail
const r3 = resizeSidebar(200, -50, false);
assert.equal(r3.width, 64, 'Collapsed to 64px rail');
assert.equal(r3.isCollapsed, true);

// 4. Double click reset
const r4 = handleKeyResize(350, 'Reset', false);
assert.equal(r4.width, 256, 'Reset to 256px default');
assert.equal(r4.isCollapsed, false);

// 5. Arrow left keyboard resize
const r5 = handleKeyResize(256, 'ArrowLeft', false);
assert.equal(r5.width, 240);

// 6. Arrow right when collapsed expands to min
const r6 = handleKeyResize(64, 'ArrowRight', true);
assert.equal(r6.width, 180, 'Expanded from rail to min width');
assert.equal(r6.isCollapsed, false);

console.log('✔ All Sidebar Resizing and Keyboard Accessibility tests passed!');
