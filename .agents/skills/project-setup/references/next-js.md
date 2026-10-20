# Next.js Project Setup Reference

A guide for scaffolding production-ready Next.js applications using the App Router, TypeScript, Tailwind CSS, and ESLint.

---

## 1. Non-Interactive Scaffolding Command

Run `create-next-app` non-interactively using explicit flags to prevent interactive prompt hangs:

### In Current Directory:
```bash
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --use-npm \
  --yes
```

### In a Subfolder:
```bash
npx create-next-app@latest my-app \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --use-npm \
  --yes
```

---

## 2. Available Command Flags

| Flag | Purpose | Default / Recommendation |
| :--- | :--- | :--- |
| `--ts`, `--typescript` | Initialize as a TypeScript project | **Recommended default** |
| `--js`, `--javascript` | Initialize as a JavaScript project | Only if requested |
| `--tailwind` | Include Tailwind CSS configuration | **Recommended default** |
| `--eslint` | Include ESLint configuration | **Recommended default** |
| `--app` | Use the Next.js App Router (`app/` directory) | **Recommended default** |
| `--src-dir` | Place application code inside `src/` directory | **Recommended default** |
| `--turbopack` | Enable Turbopack for local development | Optional |
| `--import-alias <prefix/*>`| Specify custom import alias | Default `@/*` |
| `--empty` | Scaffold an empty project without sample landing page | Use if minimal starter is wanted |
| `--use-npm` | Use npm as package manager | Default |
| `--use-pnpm` | Use pnpm as package manager | If user prefers pnpm |
| `--use-yarn` | Use Yarn as package manager | If user prefers yarn |
| `--use-bun` | Use Bun as package manager | If user prefers bun |
| `--no-git` | Skip git repository initialization | If git is already initialized |

---

## 3. Recommended VS Code Workspace Configuration

Create or update `.vscode/extensions.json`:
```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode"
  ]
}
```

Create `.vscode/launch.json` for Next.js debugging:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js: debug server-side",
      "type": "node-terminal",
      "request": "launch",
      "command": "npm run dev"
    },
    {
      "name": "Next.js: debug client-side",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:3000"
    }
  ]
}
```

---

## 4. Verification and Launch

1. **Verify Build**:
   ```bash
   npm run build
   ```
2. **Run Linter**:
   ```bash
   npm run lint
   ```
3. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` to verify the application.
