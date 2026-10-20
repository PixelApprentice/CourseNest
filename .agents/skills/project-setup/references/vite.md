# Vite Project Setup Reference

A guide for scaffolding fast Single Page Applications (SPAs) with Vite supporting React, Vue, Svelte, Solid, Preact, Lit, or Vanilla TypeScript.

---

## 1. Non-Interactive Scaffolding Command

Run `create-vite` non-interactively using explicit template flags:

### In Current Directory:
```bash
npm create vite@latest . -- --template react-ts
```

### In a Subfolder:
```bash
npm create vite@latest my-app -- --template react-ts
```

---

## 2. Available Template Flags

Pass one of the following to `--template`:

| Framework | TypeScript (Recommended) | JavaScript |
| :--- | :--- | :--- |
| **React** | `react-ts` / `react-swc-ts` | `react` / `react-swc` |
| **Vue** | `vue-ts` | `vue` |
| **Svelte** | `svelte-ts` | `svelte` |
| **Solid** | `solid-ts` | `solid` |
| **Vanilla** | `vanilla-ts` | `vanilla` |
| **Preact** | `preact-ts` | `preact` |
| **Lit** | `lit-ts` | `lit` |
| **Qwik** | `qwik-ts` | `qwik` |

---

## 3. Post-Scaffolding Steps

Vite scaffolding generates files but does **not** automatically run package installation.

1. **Install Dependencies**:
   ```bash
   npm install
   # or: pnpm install / yarn / bun install
   ```

2. **Add Tailwind CSS (Optional / If Requested)**:
   ```bash
   npm install -D tailwindcss @tailwindcss/vite
   ```
   In `vite.config.ts`:
   ```ts
   import { defineConfig } from 'vite';
   import tailwindcss from '@tailwindcss/vite';

   export default defineConfig({
     plugins: [
       // existing plugins...
       tailwindcss(),
     ],
   });
   ```
   In your root CSS file (`src/style.css` or `src/index.css`):
   ```css
   @import "tailwindcss";
   ```

---

## 4. Recommended VS Code Workspace Configuration

Create `.vscode/extensions.json`:
```json
{
  "recommendations": [
    "biomejs.biome",
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss"
  ]
}
```

Create `.vscode/launch.json` for browser debugging:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Launch Chrome against localhost",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:5173",
      "webRoot": "${workspaceFolder}"
    }
  ]
}
```

---

## 5. Verification and Run

1. **Verify TypeScript & Production Build**:
   ```bash
   npm run build
   ```
2. **Start Dev Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173`.
