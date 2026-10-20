# Native SQLite & Build Setup for CourseNest

## Overview & Architecture

CourseNest is designed with a **two-tier SQLite persistence strategy** to ensure frictionless developer onboarding and native production execution:

1. **Development & CLI (Zero C++ Build Friction)**:
   - Built on Node.js 22+ native `node:sqlite` via `@coursenest/sqlite-adapter`.
   - Node 22 ships with built-in SQLite (WAL mode, transactions, prepared statements) compiled directly into the Node binary.
   - Developers and contributors can clone the repository, run tests, and develop web/CLI components **without requiring `node-gyp`, Python, or a C++ compiler**.

2. **Electron Desktop Application**:
   - Built with Electron 33+ and bundled via `electron-vite`.
   - Native modules (`better-sqlite3`) target the Electron runtime ABI (rather than arbitrary host Node.js versions).

---

## pnpm v10 Build Scripts Configuration

In pnpm v10+, native build scripts (`install`, `postinstall`) are blocked by default for security.

### Configuration in CourseNest
- In `package.json`:
  ```json
  "pnpm": {
    "onlyBuiltDependencies": [
      "electron",
      "esbuild"
    ]
  }
  ```
  This allows trusted binaries (`electron` and `esbuild`) to install non-interactively without blocking CI or local scripts.

- In `.npmrc`:
  ```ini
  node-linker=isolated
  public-hoist-pattern[]=*sqlite*
  public-hoist-pattern[]=*electron*
  public-hoist-pattern[]=*esbuild*
  ```
  Ensures standard workspace isolation for packages while hoisting shared tooling.

---

## Troubleshooting Native Builds

### If developing the Electron Desktop app on Linux:
```bash
sudo apt-get install -y build-essential python3
```

### If developing the Electron Desktop app on Windows:
- Install **Visual Studio Build Tools 2022** with the "Desktop development with C++" workload.

### If running on newer Node versions (e.g. Node 24/26):
- Host development uses `@coursenest/sqlite-adapter` with native `node:sqlite`.
- If building native `better-sqlite3` specifically for Electron:
  ```bash
  pnpm --filter @coursenest/desktop rebuild
  ```
