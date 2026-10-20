# CourseNest Android Application

Capacitor-based Android mobile application for tablets and phones, powered by the shared React client (`@coursenest/client`).

## Setup and Development

1. **Build shared client**:
   ```bash
   pnpm --filter @coursenest/client build
   ```

2. **Sync with Android**:
   ```bash
   pnpm --filter @coursenest/android cap:sync
   ```

3. **Open in Android Studio**:
   ```bash
   pnpm --filter @coursenest/android cap:open
   ```

## Architecture

- Uses `@capacitor/filesystem` for app-private local storage
- Uses `@capacitor/network` for offline detection and offline-first mode
- Interacts with local SQLite or secure Preferences for metadata storage
- Shares all TypeScript domain models, schemas, and UI components with the desktop app
