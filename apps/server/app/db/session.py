"""Database session and engine configuration supporting PostgreSQL and SQLite."""

from collections.abc import AsyncGenerator
from typing import Any

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.config import settings


def create_engine_for_url(url: str, debug: bool = False) -> AsyncEngine:
    """Build async SQLAlchemy engine with connection pool tailored to the DB dialect."""
    if url.startswith("sqlite"):
        engine_kwargs: dict[str, Any] = {
            "echo": debug,
            "connect_args": {"check_same_thread": False},
        }
    else:
        engine_kwargs = {
            "echo": debug,
            "pool_pre_ping": True,
            "pool_size": 5,
            "max_overflow": 10,
        }
    return create_async_engine(url, **engine_kwargs)


engine = create_engine_for_url(settings.database_url, debug=settings.debug)

async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency providing an isolated async database session per request."""
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
