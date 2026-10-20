FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python package manager and dependencies
COPY pyproject.toml .
COPY app/ app/
COPY migrations/ migrations/
COPY alembic.ini .

RUN pip install --no-cache-dir hatchling
RUN pip install --no-cache-dir -e .

EXPOSE 8000

# Run migrations and start server
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
