"""Course CRUD and curriculum endpoints."""

from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_role
from app.db.models.course import Course, CourseVersion, Lesson, Section
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.course import (
    CourseCurriculumResponse,
    CourseListResponse,
    CourseResponse,
    CreateCourseRequest,
    LessonResponse,
    SectionResponse,
    UpdateCourseRequest,
)

router = APIRouter()


@router.get("", response_model=CourseListResponse)
async def list_courses(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    search: str | None = Query(default=None),
    subject: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """List published courses with pagination and optional search & subject filtering."""
    query = select(Course).where(Course.is_published.is_(True))

    if search:
        query = query.where(
            or_(
                Course.title.ilike(f"%{search}%"),
                Course.description.ilike(f"%{search}%"),
                Course.instructor_name.ilike(f"%{search}%"),
            )
        )

    if subject:
        query = query.where(Course.subject.ilike(f"%{subject}%"))

    # Count total matching rows
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    # Paginate and sort by recent updates
    query = query.order_by(Course.updated_at.desc()).limit(limit).offset(offset)
    result = await db.execute(query)
    courses = result.scalars().all()

    return {"items": courses, "total": total, "limit": limit, "offset": offset}


@router.get("/{course_id}", response_model=CourseResponse)
async def get_course(course_id: str, db: AsyncSession = Depends(get_db)) -> Course:
    """Get a single course by its unique ID."""
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    return course


@router.get("/{course_id}/curriculum", response_model=CourseCurriculumResponse)
async def get_course_curriculum(
    course_id: str, db: AsyncSession = Depends(get_db)
) -> CourseCurriculumResponse:
    """Fetch the hierarchical syllabus (sections and lessons) for a course."""
    course_res = await db.execute(select(Course).where(Course.id == course_id))
    course = course_res.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    # Locate current version or latest published version
    version_query = select(CourseVersion).where(CourseVersion.course_id == course_id)
    if course.current_version_id:
        version_query = version_query.where(CourseVersion.id == course.current_version_id)
    else:
        version_query = version_query.order_by(CourseVersion.created_at.desc())

    version_res = await db.execute(version_query)
    version = version_res.scalars().first()

    if not version:
        return CourseCurriculumResponse(
            course_id=course_id, version_id=None, version_number=None, sections=[]
        )

    # Fetch sections ordered by sequence position
    sections_res = await db.execute(
        select(Section)
        .where(Section.course_version_id == version.id)
        .order_by(Section.position.asc())
    )
    sections = sections_res.scalars().all()

    section_responses: list[SectionResponse] = []
    for sec in sections:
        lessons_res = await db.execute(
            select(Lesson).where(Lesson.section_id == sec.id).order_by(Lesson.position.asc())
        )
        lessons = lessons_res.scalars().all()
        sec_response = SectionResponse(
            id=sec.id,
            course_version_id=sec.course_version_id,
            title=sec.title,
            position=sec.position,
            description=sec.description,
            estimated_duration_minutes=sec.estimated_duration_minutes,
            is_optional=sec.is_optional,
            lessons=[LessonResponse.model_validate(les) for les in lessons],
        )
        section_responses.append(sec_response)

    return CourseCurriculumResponse(
        course_id=course_id,
        version_id=version.id,
        version_number=version.version_number,
        sections=section_responses,
    )


@router.post("", response_model=CourseResponse, status_code=status.HTTP_201_CREATED)
async def create_course(
    body: CreateCourseRequest,
    current_user: User = Depends(require_role("instructor", "admin")),
    db: AsyncSession = Depends(get_db),
) -> Course:
    """Create a new course catalog entry. Requires instructor or admin privileges."""
    course = Course(
        title=body.title,
        description=body.description,
        language=body.language,
        instructor_name=body.instructor_name or current_user.display_name,
        instructor_id=current_user.id,
        subject=body.subject,
        tags=body.tags,
        estimated_duration_minutes=body.estimated_duration_minutes,
        is_published=body.is_published,
    )
    db.add(course)
    await db.flush()
    await db.refresh(course)
    return course


@router.patch("/{course_id}", response_model=CourseResponse)
async def update_course(
    course_id: str,
    body: UpdateCourseRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Course:
    """Update course attributes. Requires ownership of course or admin role."""
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    if current_user.role != "admin" and course.instructor_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to modify this course",
        )

    # Apply partial updates
    for field, val in body.model_dump(exclude_unset=True).items():
        setattr(course, field, val)

    course.updated_at = datetime.now(UTC)
    db.add(course)
    await db.flush()
    await db.refresh(course)
    return course


@router.delete("/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_course(
    course_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    """Delete a course. Requires ownership or admin role."""
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    if current_user.role != "admin" and course.instructor_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete this course",
        )

    await db.delete(course)
    await db.flush()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
