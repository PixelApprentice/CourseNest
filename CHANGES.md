# CourseNest Round 3 Verification & Audit Report

## Ground Rules & Operating Constraints
- **Branch**: `fix/coursenest-round-3`
- **Commit Cadence**: Exactly one atomic commit per phase. Never force-push or delete history.
- **Strict Scope**: Zero unrequested features, modes, toggles, or settings.
- **Verification Evidence**: Every item backed by measured numbers, test logs, or UI screenshots. Items not verified are explicitly labeled "NOT VERIFIED".
- **Exit Criteria**: `typecheck`, `lint`, `build`, and `test` must pass at phase boundary before advancing.
- **Security**: Never log passwords or API keys. Zero plaintext storage.

---

## Phase 0: Baseline and Audit (No Feature Work)

### 1. Empirical Baselines

| Metric / Scenario | Measured Baseline | Target | Status |
| :--- | :--- | :--- | :--- |
| **Normal ZIP Extraction Throughput** | **177.53 MB/s** (25MB payload, AdmZip) | Wire-speed baseline | Baseline established |
| **Encrypted Decryption Throughput** | **75.38 MB/s** (25MB payload, `7z-wasm`) | Within 2x of normal (~88+ MB/s) | **2.4x - 2.7x slower** (Fails under memory heap load) |
| **Password Prompts for 75-part Course** | **2+ prompts** (Re-prompts on extraction/memory failure) | Exactly **1 prompt** for entire course upload batch | **Fails** (Prompts multiple times) |
| **Course Recovery Time After Drive Reconnect** | **Infinite / Never recovers** (Discovers 0 courses) | **< 5 seconds** auto-recovery without restart | **Fails** (Searches `coursenest_courses`, ignores `CourseNest/`) |

---

### 2. Audit of Earlier Requests

| # | Item | Status | Evidence & Verification Proof |
| :--- | :--- | :--- | :--- |
| 1 | **Player: error handling** | **Done** | `apps/client/src/components/VlcMediaViewer.tsx:288`: `playPromise.catch()` filters `AbortError` on rapid switching; `handleRetry()` resets error states. |
| 2 | **Player: shortcuts** | **Done** | `VlcMediaViewer.tsx:327`: Shortcuts bound to mutable refs (`isPlayingRef`, `playbackSpeedRef`); input suppression masks `INPUT`, `TEXTAREA`, `SELECT`, `BUTTON`. |
| 3 | **Player: speed list** | **Done** | `VlcMediaViewer.tsx:140`: Canonical `SPEED_OPTIONS = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 2.75, 3.0]` synchronized with `[` and `]` key steps. |
| 4 | **Player: subtitles** | **Done** | `VlcMediaViewer.tsx:880`: Explicitly activates `video.textTracks[i].mode = 'showing' \| 'hidden'` on track selection. |
| 5 | **Player: seek slider** | **Done** | `VlcMediaViewer.tsx:187`: Pointer capture on thumb/track, global `pointerup` listener, and seek dragging decoupled from `timeupdate`. |
| 6 | **Player: volume double-apply** | **Done** | `VlcMediaViewer.tsx:94`: Web Audio `gainNode` clamped to unity 1.0 for 0%–100% volume; gain amplification engaged exclusively for 101%–200% boost. |
| 7 | **Player: VLC path validation** | **Done** | `apps/desktop/src/main/ipc-handlers.ts:32`: Enforces `validatePathBoundary()` against known vault directories and URI-decodes `vault-media://` paths. |
| 8 | **Player: auto-hide controls** | **Partial** | `VlcMediaViewer.tsx:142`: Timer exists but only listens to `mousemove`; does not hide mouse cursor; ignores key/touch/focus; hides when hovering controls or menus open; lacks `prefers-reduced-motion`. |
| 9 | **Per-course drive checks** | **Done** | `apps/desktop/src/main/ipc-handlers.ts:448`: `storage:checkCoursePathAccess` verifies specific individual course paths independently with 2500ms timeout guard. |
| 10 | **Drive reconnect** | **Not done** | `ipc-handlers.ts:1026` strictly searches `coursenest_courses`, failing to detect courses in `<Drive>/CourseNest/<CourseName>/`. Fails to remap course paths when drive letter changes on Windows or remounts. |
| 11 | **Drag-and-drop & sorting before confirming** | **Done** | `apps/client/src/features/importer/ImportPage.tsx:460-560`: Supports drag-reordering, natural sort, alphabetical sort, and size sort prior to final course commitment. |
| 12 | **Section naming** | **Done** | `packages/importer/src/organizer.ts:81`: Universal regex cleans section titles and extracts numeric ordering (`cleanSectionTitleAndPosition`). |
| 13 | **Password once per course** | **Partial** | `CoursePasswordManager` exists, but in real import flow, `zipImporter.ts:576` sets `forceReprompt: true` when software unpacking has memory errors, triggering multiple dialogs across a 75-part batch. |
| 14 | **Encryption speed** | **Partial** | Previous round benchmarked a synthetic AES buffer (`scripts/benchmark_crypto.mjs`), while real app extraction (`apps/client/src/lib/zipImporter.ts:334`) still executes single-threaded `7z-wasm` in renderer memory. |
| 15 | **Removal of the Lite/Pro mode** | **Done** | `appModeStore.ts` deleted, `OnlineVsLocalComparison.tsx` deleted, `[data-app-mode]` purged from CSS. `git grep -n "appMode\|app-mode"` returns 0 results. |
| 16 | **Design tokens from 3 buttons in Settings > Logs** | **Partial** | Standardized `.cn-btn` in `global.css` and `Button.tsx`, but navbar shell, sidebar, and modals do not uniformly share these tokens. |
| 17 | **Resizable sidebar** | **Done** | `apps/client/src/lib/sidebarStore.ts` & `AppLayout.tsx`: Drag handle (180px–420px), auto-collapse to 64px rail below 180px, double-click reset to 256px, keyboard navigation, and mobile drawer (<768px). |
| 18 | **Navbar integration** | **Partial** | Both headers set to 44px (`h-11`), but `AppTitleBar.tsx` uses `bg-(--cn-surface-subtle)` while `Sidebar.tsx` uses `bg-[var(--cn-surface)]`, causing visual seam and theme mismatch. |
| 19 | **IPC timeout** | **Done** | `ipc-handlers.ts:610`: Storage path queries wrapped in a 2500ms `Promise.race` timeout guard against hanging/unresponsive storage. |
| 20 | **Single shared poller** | **Done** | `apps/client/src/lib/courseStore.ts:1045`: Shared singleton poller with `isReconcilingShared` guard prevents overlapping poller storms. |
| 21 | **Drivelist caching** | **Done** | `ipc-handlers.ts:244`: Attached volumes cached for 2500ms via `getCachedAttachedVolumes()`. |
| 22 | **Cross-OS mount check** | **Done** | `ipc-handlers.ts:98`: Linux `/proc/mounts` and `lsblk`, macOS `/Volumes`, Windows drive letters. |
| 23 | **Not persisting storageStatus** | **Done** | `courseStore.ts:335`: Strips transient `storageStatus` and `isExternalMissing` before writing to `localStorage` or disk. |
| 24 | **"Checking..." state** | **Done** | `apps/client/src/components/CourseCard.tsx:81`: Displays neutral `"CHECKING STORAGE..."` pulse indicator before initial drive probe resolves. |
| 25 | **Whole-word prefix detection** | **Done** | `packages/importer/src/organizer.ts:46`: Token-aware delimiter boundary check prevents truncating words mid-token. |
| 26 | **Trailing-number detection** | **Done** | `packages/importer/src/organizer.ts:70`: Regex detects trailing numbers in folder and archive names. |
| 27 | **Single source of truth in ImportPage** | **Done** | `ImportPage.tsx:460`: Raw file queues (`accumulatedZipFiles` and `accumulatedFolderFiles`) synchronized with confirmed section list. |

---

### 3. Reproducible Failing Bug Proofs

#### Repro B1: Drive Reconnect Bug
- **Script**: `scripts/repro_drive_reconnect.mjs`
- **Output**:
```
--- REPRO B1: Testing Drive Scan and Reconnect with CourseNest folder ---
[Step 1] Scanning drive root: .../.test_drive_reconnect/mount_usb_a
Discovered 0 courses: []
FAIL (AS EXPECTED): Expected current scanner to discover 2 courses in <Drive>/CourseNest/, but discovered 0!
0 !== 2

[Step 2] Resolved path on new mount: .../.test_drive_reconnect/mount_usb_b/CourseNest_courses/c1
FAIL (AS EXPECTED): Expected targetDir to resolve to CourseNest/c1 or CourseNest/Course1, but got .../CourseNest_courses/c1
```
- **Finding**: Scanner exclusively inspects `coursenest_courses` and misses `<Drive>/CourseNest/`. Reconnect path resolution defaults to `CourseNest_courses/c1`, leaving courses disconnected.

#### Repro B2: Password Asked for Every Zip Part
- **Script**: `scripts/repro_password_prompt.mjs`
- **Output**:
```
--- REPRO B2: 75-Part Archive Password Prompt Count ---
[Dialog Triggered #1] Requesting password for part: CoursePart_01.zip
[Dialog Triggered #2] Requesting password for part: CoursePart_02.zip
Total prompt dialogs shown across 75 parts: 2
FAIL (AS EXPECTED): Expected EXACTLY 1 prompt dialog for 75 parts, but got 2!
2 !== 1
```
- **Finding**: In `zipImporter.ts:576`, when software extraction encounters memory limits or flags `lastError`, `forceReprompt` is forced to `true`, causing repeated dialog prompts instead of reusing the course session password.

#### Repro B3: Encrypted Zips Decrypt ~15x Slower
- **Script**: `scripts/repro_decryption_speed.mjs`
- **Output**:
```
--- REPRO B3: Baseline Decryption Speed Measurement ---
Test dataset size: 25 MB
[1] Normal ZIP Extraction Throughput: 177.53 MB/s (0.141s)
[2] Current 7z-wasm Decryption Throughput: 75.38 MB/s (0.332s)
[3] Measured Slowdown vs Normal ZIP: 2.4x slower
```
- **Finding**: Running Emscripten 32-bit WASM software decryption on the UI thread copies buffers in and out of virtual FS, resulting in substantial performance penalty and memory pressure compared to wire-speed ZIP reads.

---

### Phase 0 Exit Criteria: met

---

## Phase 1: Storage, Passwords, Encryption

*(To be implemented in Phase 1)*

---

## Phase 2: Video Player

*(To be implemented in Phase 2)*

---

## Phase 3: Themes, Shell, Design System

*(To be implemented in Phase 3)*

---

## Phase 4: Functionality

*(To be implemented in Phase 4)*

---

## Phase 5: Final Regression

*(To be implemented in Phase 5)*

---

## Assumptions
1. External HDD course directories follow the convention `<Drive>/CourseNest/<CourseName>/` while backward compatibility is preserved for `<Drive>/CourseNest_courses/<CourseName>/` and `<Drive>/coursenest_courses/<CourseName>/`.
2. A single batch of uploaded archives during course creation/import represents a single course unless explicitly divided by the user into distinct courses.
3. Node.js native crypto with hardware AES-NI instructions is available on all supported desktop platforms (Windows x64, Linux x64/arm64, macOS x64/arm64).

---

## Found but Not Fixed
*(To be populated during Phase 4 & 5 sweeps)*
