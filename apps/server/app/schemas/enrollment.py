"""Enrollment and progress schemas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class EnrollmentUpdateProgressRequest(BaseModel):
    """Payload to update course progress percentage."""

    progress_percent: float = Field(ge=0.0, le=100.0)
    is_completed: bool | None = None


class EnrollmentResponse(BaseModel):
    """Enrollment record response."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    course_id: str
    enrolled_at: datetime | None = None
    last_accessed_at: datetime | None = None
    overall_progress_percent: float
    is_completed: bool


class EnrollmentListResponse(BaseModel):
    """List of active enrollments."""

    items: list[EnrollmentResponse]
    total: int
