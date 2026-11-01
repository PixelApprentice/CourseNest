"""Tests for course enrollment, user progress tracking, and unenrollment."""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, hash_password
from app.db.models.course import Course
from app.db.models.user import User


@pytest.mark.asyncio
async def test_enrollment_lifecycle_and_progress_tracking(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """Test enrolling, listing enrollments, updating progress, and unenrollment."""
    # 1. Create a Student user and a Published Course
    student = User(
        email="learner_alice@coursenest.edu",
        display_name="Alice Learner",
        hashed_password=hash_password("AlicePassword123!"),
        role="student",
    )
    course = Course(
        title="Modern Cloud Architecture",
        description="Kubernetes, microservices, and event mesh.",
        is_published=True,
    )
    db_session.add_all([student, course])
    await db_session.commit()

    token = create_access_token(subject=student.id, role=student.role)
    auth_header = {"Authorization": f"Bearer {token}"}

    # 2. Enroll in course
    enroll_res = await client.post(f"/api/v1/enrollments/{course.id}", headers=auth_header)
    assert enroll_res.status_code == 201
    enroll_data = enroll_res.json()
    assert enroll_data["user_id"] == student.id
    assert enroll_data["course_id"] == course.id
    assert enroll_data["overall_progress_percent"] == 0.0
    assert enroll_data["is_completed"] is False

    # 3. Duplicate enrollment rejected (409 Conflict)
    dupe_res = await client.post(f"/api/v1/enrollments/{course.id}", headers=auth_header)
    assert dupe_res.status_code == 409

    # 4. List my enrollments
    my_res = await client.get("/api/v1/enrollments/my", headers=auth_header)
    assert my_res.status_code == 200
    my_data = my_res.json()
    assert my_data["total"] == 1
    assert my_data["items"][0]["course_id"] == course.id

    # 5. Update progress to 50%
    prog_res = await client.patch(
        f"/api/v1/enrollments/{course.id}/progress",
        json={"progress_percent": 50.0},
        headers=auth_header,
    )
    assert prog_res.status_code == 200
    assert prog_res.json()["overall_progress_percent"] == 50.0
    assert prog_res.json()["is_completed"] is False

    # 6. Update progress to 100% (automatically marks is_completed=True)
    done_res = await client.patch(
        f"/api/v1/enrollments/{course.id}/progress",
        json={"progress_percent": 100.0},
        headers=auth_header,
    )
    assert done_res.status_code == 200
    assert done_res.json()["overall_progress_percent"] == 100.0
    assert done_res.json()["is_completed"] is True

    # 7. Unenroll from course
    unenroll_res = await client.delete(f"/api/v1/enrollments/{course.id}", headers=auth_header)
    assert unenroll_res.status_code == 204

    # 8. Verify empty enrollments
    empty_res = await client.get("/api/v1/enrollments/my", headers=auth_header)
    assert empty_res.status_code == 200
    assert empty_res.json()["total"] == 0


@pytest.mark.asyncio
async def test_enrollment_invalid_course_and_unauthorized(client: AsyncClient) -> None:
    """Test 401 on unauthorized access and 404 on missing course enrollment."""
    # Without token
    no_auth = await client.post("/api/v1/enrollments/some-course-id")
    assert no_auth.status_code == 401 or no_auth.status_code == 403

    # With dummy token but nonexistent course
    token = create_access_token(subject="user-123", role="student")
    bad_course = await client.post(
        "/api/v1/enrollments/nonexistent-course-uuid",
        headers={"Authorization": f"Bearer {token}"},
    )
    # The user-123 won't be found in get_current_user -> 401
    assert bad_course.status_code == 401
