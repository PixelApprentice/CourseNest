# Native Build Setup for CourseNest

## pnpm v10 Native Build Configuration

### Problem

In pnpm v10, build scripts are blocked by default. `better-sqlite3` and `electron` require native C++ compilation via node-gyp.

### Solution Implemented

1. **Created `.npmrc`** at repo root with:
   - `node-linker=hoisted` to allow native modules to find dependencies
   - `public-hoist-pattern` for sqlite/electron/node-gyp
   - Better-sqlite3 binary preferences

2. **Updated `apps/desktop/package.json`** with postinstall hook for `pnpm approve-builds`

### For Contributors

#### First time setup:

```bash
# Install dependencies
pnpm install

# Approve build scripts for native packages
pnpm approve-builds

# Or approve specific packages
pnpm approve-builds --approve-all
```

#### Windows contributors need:

- Visual Studio Build Tools 2022+
- Windows SDK

#### macOS contributors need:

- Xcode Command Line Tools: `xcode-select --install`

#### Linux contributors need:

```bash
sudo apt-get install build-essential python3
```

### Prebuilt Binaries

Better-sqlite3 v11+ provides prebuilt binaries. If builds fail:

1. Ensure `NODE_LINKER=hoisted` is set
2. Check `.npmrc` configuration
3. Run `pnpm rebuild` after `pnpm approve-builds`

### Verification

```bash
pnpm --filter @coursenest/desktop list better-sqlite3 electron
```

Should show installed without build errors.
