"""Enrollment and progress endpoints."""

from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.models.course import Course
from app.db.models.enrollment import Enrollment
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.enrollment import (
    EnrollmentListResponse,
    EnrollmentResponse,
    EnrollmentUpdateProgressRequest,
)

router = APIRouter()


@router.get("/my", response_model=EnrollmentListResponse)
async def get_my_enrollments(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Retrieve all courses enrolled by the authenticated student."""
    query = (
        select(Enrollment)
        .where(Enrollment.user_id == current_user.id)
        .order_by(Enrollment.enrolled_at.desc())
    )
    result = await db.execute(query)
    enrollments = result.scalars().all()

    return {"items": enrollments, "total": len(enrollments)}


@router.post("/{course_id}", response_model=EnrollmentResponse, status_code=status.HTTP_201_CREATED)
async def enroll_course(
    course_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Enrollment:
    """Enroll the current user in a course."""
    # Verify course exists
    c_res = await db.execute(select(Course).where(Course.id == course_id))
    course = c_res.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    # Check for existing enrollment
    e_res = await db.execute(
        select(Enrollment).where(
            Enrollment.user_id == current_user.id,
            Enrollment.course_id == course_id,
        )
    )
    existing = e_res.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User is already enrolled in this course",
        )

    enrollment = Enrollment(
        user_id=current_user.id,
        course_id=course_id,
    )
    db.add(enrollment)
    await db.flush()
    await db.refresh(enrollment)
    return enrollment


@router.patch("/{course_id}/progress", response_model=EnrollmentResponse)
async def update_enrollment_progress(
    course_id: str,
    body: EnrollmentUpdateProgressRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Enrollment:
    """Update progress tracking percentage for the enrolled course."""
    e_res = await db.execute(
        select(Enrollment).where(
            Enrollment.user_id == current_user.id,
            Enrollment.course_id == course_id,
        )
    )
    enrollment = e_res.scalar_one_or_none()
    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Enrollment not found for this course",
        )

    enrollment.overall_progress_percent = body.progress_percent
    enrollment.last_accessed_at = datetime.now(UTC)
    if body.is_completed is not None:
        enrollment.is_completed = body.is_completed
    elif body.progress_percent >= 100.0:
        enrollment.is_completed = True

    db.add(enrollment)
    await db.flush()
    await db.refresh(enrollment)
    return enrollment


@router.delete("/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
async def unenroll_course(
    course_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    """Unenroll from a course."""
    e_res = await db.execute(
        select(Enrollment).where(
            Enrollment.user_id == current_user.id,
            Enrollment.course_id == course_id,
        )
    )
    enrollment = e_res.scalar_one_or_none()
    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Enrollment not found for this course",
        )

    await db.delete(enrollment)
    await db.flush()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
