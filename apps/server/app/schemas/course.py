"""Course schemas for CRUD and curriculum outline."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class LessonResponse(BaseModel):
    """Syllabus lesson node."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    section_id: str
    title: str
    position: int
    description: str | None = None
    estimated_duration_minutes: int | None = None
    completion_policy: str
    is_required: bool
    revision: int


class SectionResponse(BaseModel):
    """Syllabus section node."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    course_version_id: str
    title: str
    position: int
    description: str | None = None
    estimated_duration_minutes: int | None = None
    is_optional: bool
    lessons: list[LessonResponse] = Field(default_factory=list)


class CourseCurriculumResponse(BaseModel):
    """Full course curriculum outline with sections and lessons."""

    course_id: str
    version_id: str | None = None
    version_number: str | None = None
    sections: list[SectionResponse] = Field(default_factory=list)


class CourseBase(BaseModel):
    """Common course fields."""

    title: str = Field(min_length=1, max_length=500)
    description: str = Field(default="", max_length=10000)
    language: str = Field(default="en", max_length=10)
    instructor_name: str = Field(default="Unknown", max_length=200)
    subject: str = Field(default="", max_length=200)
    tags: str = Field(default="[]")
    estimated_duration_minutes: int | None = Field(default=None, ge=0)


class CreateCourseRequest(CourseBase):
    """Payload to create a new course."""

    is_published: bool = False


class UpdateCourseRequest(BaseModel):
    """Payload to update an existing course."""

    title: str | None = Field(default=None, min_length=1, max_length=500)
    description: str | None = Field(default=None, max_length=10000)
    language: str | None = Field(default=None, max_length=10)
    instructor_name: str | None = Field(default=None, max_length=200)
    subject: str | None = Field(default=None, max_length=200)
    tags: str | None = None
    estimated_duration_minutes: int | None = Field(default=None, ge=0)
    is_published: bool | None = None


class CourseResponse(BaseModel):
    """Public course catalog representation."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    description: str
    language: str
    instructor_name: str
    instructor_id: str | None = None
    subject: str
    tags: str
    estimated_duration_minutes: int | None
    current_version_id: str | None = None
    is_published: bool
    created_at: datetime | None = None
    updated_at: datetime | None = None


class CourseListResponse(BaseModel):
    """Paginated course listing response."""

    items: list[CourseResponse]
    total: int
    limit: int
    offset: int
