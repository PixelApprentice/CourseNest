---
name: fastapi-backend-engineering
description: >-
  Standard practices, architecture rules, and testing/linting workflows for the FastAPI backend.
  Covers Python virtualenv management, asynchronous SQLAlchemy 2.0 ORM, Pydantic v2 schemas,
  JWT bearer authentication, Alembic database migrations, Ruff configuration, and Pytest suites.
---

# FastAPI Backend Engineering Skill

This skill provides patterns, conventions, and auditing procedures for the Python FastAPI server located in `apps/server`.

## 1. Environment & Dependency Standards
- **Virtual Environment**:
  - Always activate the project virtual environment before executing Python commands:
    ```bash
    source apps/server/.venv/bin/activate
    ```
- **Configuration & Settings**:
  - Use `pydantic-settings` with `BaseSettings` reading from environment variables and `.env` fallback.
  - Sensitive defaults (e.g. `SECRET_KEY`) must raise warnings or errors if unchanged in production environments.

## 2. Asynchronous SQLAlchemy 2.0 Patterns
- **Async Engine & Sessions**:
  - Use `create_async_engine()` with `sqlite+aiosqlite` or `postgresql+asyncpg`.
  - Session lifecycle managed via `async_sessionmaker(expire_on_commit=False)` and FastAPI dependency injection (`get_db`).
  - Always use `async with session.begin():` or ensure `await session.close()` on route completion to avoid connection pool exhaustion.
- **Modern Query Syntax**:
  - Use 2.0 style queries: `await db.execute(select(Model).where(...))` instead of legacy 1.x `query()`.

## 3. Pydantic v2 Data Modeling & Schemas
- Explicit schema definitions for Request and Response models with `model_config = ConfigDict(from_attributes=True)`.
- Input validation: Email fields must use `EmailStr`, strings must define sensible `min_length` and `max_length`.
- Response models must never expose hashed passwords or sensitive system fields.

## 4. Linting, Formatting & Quality Controls
- **Ruff Configuration (`pyproject.toml`)**:
  - Configure Ruff rules cleanly.
  - Note: FastAPI depends heavily on `Depends()` in default function arguments. In `pyproject.toml`, disable or configure rule `B008` (function-call-in-default-argument) for FastAPI routes and dependencies.
  - Ensure import sorting (`I001`) and exception chaining (`B904`) compliance.
- **Testing**:
  - Run tests with `pytest -v`.
  - Use `httpx.AsyncClient` or Starlette `TestClient` with in-memory SQLite fixtures (`sqlite+aiosqlite:///:memory:`) for fast, isolated test runs.
