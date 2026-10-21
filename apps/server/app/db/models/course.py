"""Course, CourseVersion, Section, and Lesson models."""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Course(Base):
    """A course in the central catalog."""

    __tablename__ = "courses"

    id: Mapped[str] = mapped_column(
        String(64), primary_key=True, default_factory=lambda: str(uuid.uuid4()), init=False
    )
    title: Mapped[str] = mapped_column(String(500), index=True)
    description: Mapped[str] = mapped_column(Text, default="")
    language: Mapped[str] = mapped_column(String(10), default="en")
    instructor_name: Mapped[str] = mapped_column(String(200), default="Unknown")
    instructor_id: Mapped[str | None] = mapped_column(
        String(64), ForeignKey("users.id", ondelete="SET NULL"), default=None
    )
    subject: Mapped[str] = mapped_column(String(200), default="")
    tags: Mapped[str] = mapped_column(Text, default="[]")  # JSON array stored as text
    estimated_duration_minutes: Mapped[int | None] = mapped_column(Integer, default=None)
    current_version_id: Mapped[str | None] = mapped_column(String(64), default=None)
    is_published: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), init=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), init=False
    )


class CourseVersion(Base):
    """An immutable published version of a course."""

    __tablename__ = "course_versions"

    id: Mapped[str] = mapped_column(
        String(64), primary_key=True, default_factory=lambda: str(uuid.uuid4()), init=False
    )
    course_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("courses.id", ondelete="CASCADE"), index=True
    )
    version_number: Mapped[str] = mapped_column(String(50))
    manifest_schema_version: Mapped[str] = mapped_column(String(20), default="1.0.0")
    content_fingerprint: Mapped[str] = mapped_column(String(128), default="")
    state: Mapped[str] = mapped_column(String(20), default="draft")
    change_summary: Mapped[str | None] = mapped_column(Text, default=None)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), init=False
    )
    published_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), default=None, init=False
    )


class Section(Base):
    """A section within a course version."""

    __tablename__ = "sections"

    id: Mapped[str] = mapped_column(
        String(64), primary_key=True, default_factory=lambda: str(uuid.uuid4()), init=False
    )
    course_version_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("course_versions.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(500))
    position: Mapped[int] = mapped_column(Integer, default=0)
    description: Mapped[str | None] = mapped_column(Text, default=None)
    estimated_duration_minutes: Mapped[int | None] = mapped_column(Integer, default=None)
    is_optional: Mapped[bool] = mapped_column(Boolean, default=False)


class Lesson(Base):
    """A lesson within a section."""

    __tablename__ = "lessons"

    id: Mapped[str] = mapped_column(
        String(64), primary_key=True, default_factory=lambda: str(uuid.uuid4()), init=False
    )
    section_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("sections.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(500))
    position: Mapped[int] = mapped_column(Integer, default=0)
    description: Mapped[str | None] = mapped_column(Text, default=None)
    estimated_duration_minutes: Mapped[int | None] = mapped_column(Integer, default=None)
    completion_policy: Mapped[str] = mapped_column(String(50), default="manual_completion")
    is_required: Mapped[bool] = mapped_column(Boolean, default=True)
    revision: Mapped[int] = mapped_column(Integer, default=1)
