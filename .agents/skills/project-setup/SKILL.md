---
name: project-setup
description: >-
  Comprehensive guide and scaffolding workflow to initialize complete, production-ready
  project structures from scratch. Use this skill when the user asks to create a new project,
  scaffold a workspace, or set up frameworks such as Next.js, Vite (React, Vue, Svelte, etc.),
  Model Context Protocol (MCP) servers, VS Code extensions, Python scripts/packages, or Node.js APIs.
  Do NOT use for creating individual files, adding single components, or modifying existing codebases.
---

# Project Setup Skill

This skill provides step-by-step procedures for scaffolding, configuring, and verifying complete project structures from scratch. It handles project generation, dependency management, configuration files (`tsconfig`, `eslint`, `pyproject.toml`, etc.), IDE configurations (`.vscode`), and build/test verification.

---

## Pre-Initialization Safety Protocol

Before running any scaffolding commands, perform these checks:

1. **Check Directory Emptiness**:
   - Inspect the target directory (e.g. `ls -la`).
   - If the current directory contains existing files (other than `.git` or `.agents`), **do not overwrite**.
   - Ask the user if they want to scaffold into a new subfolder (e.g. `./my-app`) or initialize in the current folder.
2. **Clarify Project Preferences** (if not already specified):
   - **Framework / Type**: Next.js, Vite, MCP Server, VS Code Extension, Python Package/Script, or Node.js API.
   - **Language / Flavor**: TypeScript (recommended default) vs JavaScript; React vs Vue vs Svelte, etc.
   - **Package Manager**: `npm` (default), `pnpm`, `yarn`, or `bun` for JS/TS; `uv` or `venv`/`pip` for Python.
3. **Execute Non-Interactively**:
   - Many CLI scaffolding tools (e.g., `create-next-app`, `create-vite`, `yo code`) launch interactive prompts by default.
   - **Always provide all required flags** or answers via flags/arguments so the command executes non-interactively without hanging.

---

## Project Type Matrix & References

Select the appropriate workflow below based on the user's requested project type:

| Project Type | Target Stack | Reference Guide | Quick Command |
| :--- | :--- | :--- | :--- |
| **Next.js** | React, App Router, TypeScript, Tailwind | [Next.js Reference](./references/next-js.md) | `npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes` |
| **Vite SPA** | React / Vue / Svelte / Solid / Vanilla | [Vite Reference](./references/vite.md) | `npm create vite@latest . -- --template react-ts` |
| **MCP Server** | Model Context Protocol (TS or Python) | [MCP Server Reference](./references/mcp-server.md) | `@modelcontextprotocol/sdk` (TS) or `mcp`/`fastmcp` (Python) |
| **VS Code Extension**| VS Code Extension with TypeScript + esbuild | [VS Code Extension Reference](./references/vscode-extension.md) | `npx --package yo --package generator-code -- yo code . --skipOpen` |
| **Python Script** | Single script with virtualenv or PEP 723 | [Python Script Reference](./references/python-script.md) | Script template with inline metadata or `.venv` |
| **Python Package** | Full package (PEP 621 `pyproject.toml`) | [Python Package Reference](./references/python-package.md) | `uv init --lib` or standard `src/` layout template |
| **Node.js Backend** | Express / Hono / Fastify with TypeScript | [Node Backend Reference](./references/node-backend.md) | TypeScript backend with `tsx` & ESLint |

---

## Universal Post-Scaffolding Protocol

After scaffolding files, complete these essential setup steps:

1. **Install Dependencies**:
   - Ensure all packages are installed (`npm install`, `pnpm install`, `uv sync`, etc.).
2. **Configure VS Code Workspace**:
   - Create `.vscode/settings.json` with project-appropriate defaults (formatters, linter triggers).
   - Create `.vscode/launch.json` for F5 debugging if applicable.
   - Create `.vscode/extensions.json` with recommended extensions.
3. **Initialize Git**:
   - Check if `.git` exists. If not, run `git init`.
   - Ensure a complete `.gitignore` is in place (ignoring `node_modules/`, `.venv/`, `dist/`, `.env*`, etc.).
4. **Verification Step**:
   - Run typecheck or build verification:
     - TypeScript/Vite/Next.js: `npm run build` or `npx tsc --noEmit`
     - Python: `pytest` or `python -m py_compile <file>`
   - Confirm that the scaffold builds cleanly without errors.
5. **Present Next Steps to User**:
   - Clearly report:
     - Scaffolded project structure
     - Command to run development server (e.g. `npm run dev`)
     - Command to run tests or build (e.g. `npm test`, `npm run build`)
     - Key configuration files created
