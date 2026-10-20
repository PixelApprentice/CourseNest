# Contributing to CourseNest

First off, thank you for taking the time to contribute! 🎉

CourseNest is an open-source, local-first educational platform designed to turn unorganized course archives into rich, offline-capable study experiences for university students and educators.

---

## Code of Conduct

We are committed to providing a welcoming, inclusive, and harassment-free environment for everyone. Please be respectful, constructive, and collaborative in all discussions and pull requests.

---

## Development Prerequisites

Before you start, ensure you have the following installed on your machine:

- **Node.js**: `>= 20.0.0` (Node.js 22 LTS recommended)
- **pnpm**: `>= 9.0.0` (`pnpm 10.34+` configured via `corepack`)
- **Python**: `>= 3.11` (Python 3.12 recommended, with `venv`)
- **Docker & Docker Compose**: (Optional, for running PostgreSQL and the full backend stack in 1 command)

---

## Quickstart Development Setup

### 1. Clone the repository
```bash
git clone https://github.com/coursenest/coursenest.git
cd coursenest
```

### 2. Configure Environment Variables
```bash
cp .env.example .env
```

### 3. Install Monorepo Dependencies
```bash
pnpm install
```

### 4. Build Shared TypeScript Packages
```bash
pnpm build:packages
```

### 5. Start Development Environments
You can run any part of the application independently:

- **Web Client**:
  ```bash
  pnpm dev
  # Accessible at http://localhost:5173
  ```

- **Electron Desktop**:
  ```bash
  pnpm dev:desktop
  ```

- **FastAPI Sync Server**:
  ```bash
  cd apps/server
  python -m venv .venv
  source .venv/bin/activate  # On Windows: .venv\Scripts\activate
  pip install -e .
  alembic upgrade head
  uvicorn app.main:app --reload --port 8000
  # OpenAPI documentation available at http://localhost:8000/docs
  ```

- **One-Command Docker Setup**:
  ```bash
  docker compose up -d
  # Web UI at http://localhost, API at http://localhost:8000/docs
  ```

---

## Architecture & Codebase Map

CourseNest is structured as an integrated monorepo managed with `pnpm workspaces`:

```
├── apps/
│   ├── client/               # React 18 + Vite Web Application & Course Player
│   ├── desktop/              # Electron Desktop Application (Linux & Windows)
│   ├── android/              # Capacitor Android Native Shell (Phones & Tablets)
│   └── server/               # FastAPI backend with asyncpg, SQLAlchemy 2 & Alembic
│
├── packages/
│   ├── domain/               # Pure domain entities, branded IDs & TypeScript types
│   ├── database-contracts/   # Repository interface contracts (DIP architecture)
│   ├── sqlite-adapter/       # Local SQLite storage driver with WAL & foreign keys
│   ├── storage-adapters/     # File storage abstraction (Local Disk, Memory, S3)
│   ├── importer/             # Material parser, zip extractor & curriculum organizer
│   ├── course-manifest/      # Portable JSON course specification & serializer
│   ├── validation/           # Zod runtime schemas & input validation
│   ├── ui/                   # Shared UI component library & design system
│   └── config/               # Shared constants, environment & theme configurations
│
├── fixtures/courses/         # Portable seed courses (CS101 Systems, ML201)
├── docker-compose.yml        # Full containerized stack (Postgres + Server + Client)
└── .github/                  # CI workflows, issue & pull request templates
```

---

## 🎯 Good First Issues (Start Here!)

If you are looking for an approachable way to get involved, here are curated areas that make excellent first contributions:

1. **Add Markdown Syntax Highlighting Support in the Player**
   - **Label**: `good-first-issue`, `client`, `ui`
   - **Goal**: Integrate `rehype-highlight` or `shiki` into markdown content blocks rendered in `apps/client/src/features/player/`.

2. **Keyboard Navigation Shortcuts for Lesson Navigation**
   - **Label**: `good-first-issue`, `accessibility`, `player`
   - **Goal**: Add keyboard shortcuts (`Alt + Right` for next lesson, `Alt + Left` for previous lesson, `Space` for play/pause).

3. **Export Course Notes as PDF / Markdown**
   - **Label**: `good-first-issue`, `notes`, `export`
   - **Goal**: Add a download button on the notes panel allowing students to export their lesson notes into a formatted Markdown or text file.

4. **Extended File Type Heuristics for the Importer**
   - **Label**: `good-first-issue`, `importer`
   - **Goal**: Add MIME type and extension detection for Jupyter Notebooks (`.ipynb`) and EPUB eBooks in `packages/importer/src/detector.ts`.

5. **Dark Mode / Light Mode Theme Toggle Polish**
   - **Label**: `good-first-issue`, `ui`, `theme`
   - **Goal**: Refine CSS variables in `apps/client/src/styles/global.css` and verify high contrast ratios across the UI.

Look for issues tagged with [`good-first-issue`](https://github.com/coursenest/coursenest/labels/good-first-issue) in our GitHub issue tracker.

---

## Testing & Quality Checks

Always verify that tests and typechecks pass before submitting your PR:

```bash
# Run all monorepo unit tests
pnpm test

# Run TypeScript compilation check
pnpm typecheck

# Check code formatting with Prettier
pnpm format:check

# Format codebase
pnpm format

# Run Python server tests
cd apps/server && pytest tests/
```

---

## Commit Guidelines

We use conventional commit messages to keep our git history clean and readable:

- `feat: add offline bookmark sync queue`
- `fix: resolve foreign key constraint in sqlite progress repository`
- `docs: update docker compose quickstart instructions`
- `test: add unit tests for zip extraction pipeline`
- `refactor: extract course manifest validator`

---

## Pull Request Process

1. Fork the repo and create your branch from `main`: `git checkout -b feat/your-feature-name`.
2. Ensure your changes adhere to code style guidelines and pass tests.
3. Keep pull requests focused on a single responsibility.
4. Fill out the provided pull request template with description and screenshots if applicable.
5. Our maintainers will review your PR and provide constructive feedback!
