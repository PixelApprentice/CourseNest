"""Application configuration loaded from environment variables."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings with environment variable support."""

    # Database
    database_url: str = "postgresql+asyncpg://coursenest:coursenest@localhost:5432/coursenest"

    # Security
    secret_key: str = "change-this-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440  # 24 hours

    # Application
    debug: bool = False
    cors_origins: list[str] = ["http://localhost:5173"]

    # AI Provider (optional)
    ai_provider: str | None = None
    ai_api_key: str | None = None
    ai_model: str | None = None

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "case_sensitive": False}


settings = Settings()
