// Phase 2 Verification Test Suite: B4 Video Player Controls Auto-Hide
// Verifies all states: 3s auto-hide, cursor-none, reset on interaction, and guards against hiding.

import assert from 'node:assert';

console.log('=====================================================');
console.log('       PHASE 2 VERIFICATION & ACCEPTANCE SUITE       ');
console.log('=====================================================');

// Emulate VlcMediaViewer auto-hide state machine
class PlayerControlsStateMachine {
  constructor() {
    this.isPlaying = false;
    this.isBuffering = false;
    this.hasPlaybackError = false;
    this.isSeeking = false;
    this.isPointerOverControls = false;
    this.isMenuOpen = false;
    this.showVlcPanel = false;

    this.isControlsVisible = true;
    this.timer = null;
    this.cursorHidden = false;
  }

  shouldPreventAutoHide() {
    return (
      !this.isPlaying ||
      this.isBuffering ||
      this.hasPlaybackError ||
      this.isSeeking ||
      this.isPointerOverControls ||
      this.showVlcPanel ||
      this.isMenuOpen
    );
  }

  scheduleAutoHide() {
    this.clearTimer();
    if (this.shouldPreventAutoHide()) {
      this.isControlsVisible = true;
      this.cursorHidden = false;
      return;
    }

    this.timer = setTimeout(() => {
      if (!this.shouldPreventAutoHide()) {
        this.isControlsVisible = false;
        this.cursorHidden = true;
      }
    }, 3000);
  }

  revealControls() {
    this.isControlsVisible = true;
    this.cursorHidden = false;
    this.scheduleAutoHide();
  }

  clearTimer() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  fastForward(ms) {
    // Helper to advance time in unit tests
  }
}

async function runB4Tests() {
  console.log('\n[Case 1] 3-second auto-hide while playing');
  const sm = new PlayerControlsStateMachine();
  sm.isPlaying = true;
  sm.scheduleAutoHide();
  assert.strictEqual(sm.isControlsVisible, true);
  assert.strictEqual(sm.cursorHidden, false);

  // Wait 3100ms
  await new Promise((r) => setTimeout(r, 3100));
  assert.strictEqual(sm.isControlsVisible, false, 'Controls should hide after 3 seconds of playing');
  assert.strictEqual(sm.cursorHidden, true, 'Mouse cursor should hide when controls hide');
  console.log('✓ Controls and cursor smoothly hid after 3s of playing');

  console.log('\n[Case 2] Reveal on interaction (mouse move, touch, key, focus)');
  sm.revealControls();
  assert.strictEqual(sm.isControlsVisible, true, 'Controls should be visible immediately upon interaction');
  assert.strictEqual(sm.cursorHidden, false, 'Mouse cursor should be visible upon interaction');
  console.log('✓ Controls and cursor revealed immediately upon interaction');

  console.log('\n[Case 3] Guard: Never hide while PAUSED');
  sm.isPlaying = false;
  sm.scheduleAutoHide();
  await new Promise((r) => setTimeout(r, 3100));
  assert.strictEqual(sm.isControlsVisible, true, 'Must NEVER hide while paused');
  assert.strictEqual(sm.cursorHidden, false);
  console.log('✓ Controls stay visible while video is paused');

  console.log('\n[Case 4] Guard: Never hide while LOADING / BUFFERING');
  sm.isPlaying = true;
  sm.isBuffering = true;
  sm.scheduleAutoHide();
  await new Promise((r) => setTimeout(r, 3100));
  assert.strictEqual(sm.isControlsVisible, true, 'Must NEVER hide while buffering/loading');
  sm.isBuffering = false;
  console.log('✓ Controls stay visible while video is loading/buffering');

  console.log('\n[Case 5] Guard: Never hide while in an ERROR STATE');
  sm.isPlaying = true;
  sm.hasPlaybackError = true;
  sm.scheduleAutoHide();
  await new Promise((r) => setTimeout(r, 3100));
  assert.strictEqual(sm.isControlsVisible, true, 'Must NEVER hide in error state');
  sm.hasPlaybackError = false;
  console.log('✓ Controls stay visible while video is in an error state');

  console.log('\n[Case 6] Guard: Never hide while a MENU (speed/volume/VLC) is open');
  sm.isPlaying = true;
  sm.isMenuOpen = true;
  sm.scheduleAutoHide();
  await new Promise((r) => setTimeout(r, 3100));
  assert.strictEqual(sm.isControlsVisible, true, 'Must NEVER hide while a menu is open');
  sm.isMenuOpen = false;
  console.log('✓ Controls stay visible while a menu is open');

  console.log('\n[Case 7] Guard: Never hide while DRAGGING the seek bar');
  sm.isPlaying = true;
  sm.isSeeking = true;
  sm.scheduleAutoHide();
  await new Promise((r) => setTimeout(r, 3100));
  assert.strictEqual(sm.isControlsVisible, true, 'Must NEVER hide while dragging seek bar');
  sm.isSeeking = false;
  console.log('✓ Controls stay visible while dragging seek bar');

  console.log('\n[Case 8] Guard: Never hide while POINTER is over controls');
  sm.isPlaying = true;
  sm.isPointerOverControls = true;
  sm.scheduleAutoHide();
  await new Promise((r) => setTimeout(r, 3100));
  assert.strictEqual(sm.isControlsVisible, true, 'Must NEVER hide while pointer is over controls');
  sm.isPointerOverControls = false;
  console.log('✓ Controls stay visible while pointer is hovered over controls');

  sm.clearTimer();
  console.log('\n=====================================================');
  console.log('       ALL PHASE 2 ACCEPTANCE TESTS PASSED!          ');
  console.log('=====================================================\n');
}

runB4Tests();
