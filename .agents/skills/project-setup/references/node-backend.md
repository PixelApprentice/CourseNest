# Node.js TypeScript Backend Setup Reference

A guide for scaffolding high-performance backend APIs using TypeScript with Node.js, Express/Hono, and `tsx` for rapid development.

---

## 1. When to Use

Use this setup when the user wants:
- A REST API or microservice backend in Node.js
- TypeScript-first server development
- Clean separation between source code and build output

---

## 2. Fast Scaffolding Workflow

### A. Initialize Project & Dependencies
```bash
npm init -y
npm pkg set type="module"
npm pkg set scripts.build="tsc"
npm pkg set scripts.start="node dist/index.js"
npm pkg set scripts.dev="tsx watch src/index.ts"

# Install production dependencies (Express or Hono):
npm install express dotenv
npm install -D typescript @types/node @types/express tsx
```

### B. Create `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"]
}
```

### C. Create `src/index.ts`
```typescript
import express, { Request, Response } from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
```

### D. Create `.gitignore`
```gitignore
node_modules/
dist/
.env
*.log
```

---

## 3. VS Code Workspace Configuration

### `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Server (tsx)",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npx",
      "runtimeArgs": ["tsx", "${workspaceFolder}/src/index.ts"],
      "console": "integratedTerminal"
    }
  ]
}
```

---

## 4. Verification

1. **Verify Build**:
   ```bash
   npm run build
   ```
2. **Start Dev Server**:
   ```bash
   npm run dev
   ```
