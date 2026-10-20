# VS Code Extension Setup Reference

A guide for scaffolding production-ready Visual Studio Code extensions using Yeoman and `generator-code` with TypeScript and esbuild.

---

## 1. Scaffolding Command

Run generator-code with flags to avoid interactive prompts hanging the session:

### Standard Command (TypeScript with esbuild):
```bash
npx --package yo --package generator-code -- yo code . \
  --skipOpen \
  --extensionType=ts \
  --extensionDisplayName="My Extension" \
  --extensionDescription="A description for my extension" \
  --pkgManager=npm \
  --bundler=esbuild \
  --gitInit=false
```

---

## 2. Command Options Reference

| Argument | Description | Default / Recommended |
| :--- | :--- | :--- |
| `-t, --extensionType` | Extension type: `ts`, `js`, `command-ts`, `command-js`, `colortheme`, `language`, `snippets`, `keymap`, `extensionpack`, `localization`, `commandweb`, `notebook` | `ts` |
| `-n, --extensionDisplayName` | Display name shown in VS Code Marketplace | User-provided or directory name |
| `--extensionId` | Unique ID / identifier | Do not pass unless specifically requested |
| `--extensionDescription` | Brief summary of extension capability | String description |
| `--pkgManager` | Package manager: `npm`, `yarn`, or `pnpm` | `npm` |
| `--bundler` | Bundler: `esbuild` or `webpack` | `esbuild` (faster builds) |
| `--gitInit` | Initialize Git repository | `false` if git is already initialized |
| `--skipOpen` | Do not attempt to open a new VS Code window | Always pass this |

---

## 3. Project Structure & Core Files

A standard TypeScript extension contains:
```
├── .vscode/
│   ├── launch.json       # F5 Launch Extension Development Host
│   ├── tasks.json        # Build and watch tasks
│   └── extensions.json   # Recommended extensions
├── src/
│   ├── extension.ts      # Main activate() and deactivate() entrypoint
│   └── test/             # Test suite
├── package.json          # Activation events, contributes, dependencies
├── tsconfig.json         # TypeScript configuration
└── esbuild.js            # Build script for bundling
```

### Essential `src/extension.ts` Pattern:
```typescript
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  console.log('Extension is now active!');

  const disposable = vscode.commands.registerCommand('my-extension.helloWorld', () => {
    vscode.window.showInformationMessage('Hello from My Extension!');
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}
```

---

## 4. Debugging & Testing

1. **Compile Extension**:
   ```bash
   npm run compile
   ```
2. **Watch Mode**:
   ```bash
   npm run watch
   ```
3. **Run Extension Development Host**:
   - In VS Code, open the Run & Debug panel (`Ctrl+Shift+D` / `Cmd+Shift+D`).
   - Select **"Run Extension"** and press `F5`.
   - In the new Extension Host window, press `Ctrl+Shift+P` and type `Hello World` to execute the sample command.
