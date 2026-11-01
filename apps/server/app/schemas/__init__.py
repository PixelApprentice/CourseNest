"""Pydantic schemas package."""

from app.schemas.course import (
    CourseCurriculumResponse,
    CourseListResponse,
    CourseResponse,
    CreateCourseRequest,
    LessonResponse,
    SectionResponse,
    UpdateCourseRequest,
)
from app.schemas.enrollment import (
    EnrollmentListResponse,
    EnrollmentResponse,
    EnrollmentUpdateProgressRequest,
)
from app.schemas.user import (
    LoginRequest,
    PasswordChangeRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
    UserUpdateRequest,
)

__all__ = [
    "CourseCurriculumResponse",
    "CourseListResponse",
    "CourseResponse",
    "CreateCourseRequest",
    "EnrollmentListResponse",
    "EnrollmentResponse",
    "EnrollmentUpdateProgressRequest",
    "LessonResponse",
    "LoginRequest",
    "PasswordChangeRequest",
    "RegisterRequest",
    "SectionResponse",
    "TokenResponse",
    "UpdateCourseRequest",
    "UserResponse",
    "UserUpdateRequest",
]
