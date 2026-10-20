# CourseNest Server

Optional central backend for university-managed accounts, course distribution, and administration.

## Quick Start

```bash
# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -e ".[dev]"

# Copy environment configuration
cp .env.example .env

# Start PostgreSQL (e.g., via Docker)
# docker run -d --name coursenest-db -e POSTGRES_USER=coursenest -e POSTGRES_PASSWORD=coursenest -e POSTGRES_DB=coursenest -p 5432:5432 postgres:16

# Run database migrations
# alembic upgrade head

# Start development server
uvicorn app.main:app --reload --port 8000
```

## API Documentation

When running in debug mode, API docs are available at:
- Swagger UI: http://localhost:8000/api/docs
- ReDoc: http://localhost:8000/api/redoc
