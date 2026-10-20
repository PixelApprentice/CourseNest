"""Course CRUD endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.db.models.course import Course

router = APIRouter()


class CourseResponse(BaseModel):
    """Public course representation."""

    id: str
    title: str
    description: str
    language: str
    instructor_name: str
    subject: str
    estimated_duration_minutes: int | None
    is_published: bool


class CourseListResponse(BaseModel):
    """Paginated course list."""

    items: list[CourseResponse]
    total: int
    limit: int
    offset: int


class CreateCourseRequest(BaseModel):
    """Create course payload."""

    title: str
    description: str = ""
    language: str = "en"
    instructor_name: str = "Unknown"
    subject: str = ""
    estimated_duration_minutes: int | None = None


@router.get("", response_model=CourseListResponse)
async def list_courses(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    search: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """List published courses with pagination and optional search."""
    query = select(Course).where(Course.is_published == True)

    if search:
        query = query.where(Course.title.ilike(f"%{search}%"))

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    # Paginate
    query = query.order_by(Course.updated_at.desc()).limit(limit).offset(offset)
    result = await db.execute(query)
    courses = result.scalars().all()

    return {"items": courses, "total": total, "limit": limit, "offset": offset}


@router.get("/{course_id}", response_model=CourseResponse)
async def get_course(course_id: str, db: AsyncSession = Depends(get_db)) -> Course:
    """Get a single course by ID."""
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    return course


@router.post("", response_model=CourseResponse, status_code=status.HTTP_201_CREATED)
async def create_course(
    body: CreateCourseRequest,
    db: AsyncSession = Depends(get_db),
) -> Course:
    """Create a new course."""
    course = Course(
        title=body.title,
        description=body.description,
        language=body.language,
        instructor_name=body.instructor_name,
        subject=body.subject,
        estimated_duration_minutes=body.estimated_duration_minutes,
    )
    db.add(course)
    await db.flush()
    return course
