"""User model for authentication and authorization."""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class User(Base):
    """Registered user account."""

    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String(64), primary_key=True, default_factory=lambda: str(uuid.uuid4()), init=False
    )
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(200))
    hashed_password: Mapped[str] = mapped_column(String(512))
    role: Mapped[str] = mapped_column(String(20), default="student")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), init=False
    )
    last_login_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), default=None, init=False
    )
