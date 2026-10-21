"""Enrollment and progress tracking models."""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Enrollment(Base):
    """A student's enrollment in a course."""

    __tablename__ = "enrollments"

    id: Mapped[str] = mapped_column(
        String(64), primary_key=True, default_factory=lambda: str(uuid.uuid4()), init=False
    )
    user_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    course_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("courses.id", ondelete="CASCADE"), index=True
    )
    enrolled_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), init=False
    )
    last_accessed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), default=None, init=False
    )
    overall_progress_percent: Mapped[float] = mapped_column(Float, default=0.0)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)
