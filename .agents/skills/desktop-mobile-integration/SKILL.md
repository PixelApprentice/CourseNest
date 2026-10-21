---
name: desktop-mobile-integration
description: >-
  Architectural patterns and procedures for Electron desktop and Capacitor Android environments.
  Covers secure IPC handlers, path allowlisting, native file system bridges, window lifecycle,
  external SD/USB-OTG mount discovery, and Android Storage Access Framework configurations.
---

# Desktop & Mobile Cross-Platform Integration Skill

This skill defines integration standards and platform bridges for Electron (`apps/desktop`) and Capacitor Android (`apps/android`).

## 1. Electron Desktop Hardening & IPC Contracts
- **Architecture**:
  - Two-process model: `main` process (privileged Node.js) and `renderer` process (sandboxed Chromium).
  - Preload script (`preload.ts`) is the only bridge between the two.
- **IPC Whitelisting & Path Sanitization**:
  - All file system operations (`fs:readFile`, `fs:writeFile`, `storage:save`) requested via IPC must be validated against allowed storage roots:
    - User App Data: `app.getPath('userData')`
    - User Documents / Downloads / Videos
    - Explicit paths selected via native `dialog.showOpenDialog`
  - Block attempts to read sensitive system files (`/etc/passwd`, Windows registry files, or internal credentials).
- **External Storage Discovery**:
  - Implement mount point enumeration (`/media`, `/run/media`, `/Volumes`, or Windows drive letters) to detect external SSDs or USB sticks.
  - Expose storage change events to renderer via safe IPC listeners.

## 2. Capacitor Android Storage & Hardware Integration
- **Storage Access Framework (SAF)**:
  - Configure `res/xml/file_paths.xml` with appropriate external paths:
    ```xml
    <external-path name="external_files" path="." />
    <external-media-path name="external_media" path="." />
    ```
  - Handle Android 11+ scoped storage permissions (`MANAGE_EXTERNAL_STORAGE` or SAF Document Tree picker) when reading course videos from SD cards.
- **Deep Linking & Offline Assets**:
  - Assets served locally from `capacitor://localhost` or native asset cache.
  - Secure WebView configuration avoiding mixed content or plain HTTP traffic.
