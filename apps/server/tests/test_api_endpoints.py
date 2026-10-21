"""Tests for authentication and course endpoints."""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.course import Course, CourseVersion


@pytest.mark.asyncio
async def test_auth_registration_and_login(client: AsyncClient) -> None:
    """Test user registration, login, and profile retrieval."""
    # 1. Register a new student
    reg_response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "teststudent@coursenest.edu",
            "password": "SecurePassword123!",
            "display_name": "Test Student",
            "role": "student",
        },
    )
    assert reg_response.status_code == 201
    user_data = reg_response.json()
    assert user_data["email"] == "teststudent@coursenest.edu"
    assert user_data["display_name"] == "Test Student"

    # 2. Login to acquire JWT token
    login_response = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "teststudent@coursenest.edu",
            "password": "SecurePassword123!",
        },
    )
    assert login_response.status_code == 200
    token_data = login_response.json()
    assert "access_token" in token_data
    assert token_data["token_type"] == "bearer"
    token = token_data["access_token"]

    # 3. Access /me endpoint with bearer token
    me_response = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_response.status_code == 200
    me_data = me_response.json()
    assert me_data["email"] == "teststudent@coursenest.edu"


@pytest.mark.asyncio
async def test_courses_listing_and_filtering(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """Test course catalog listing and keyword search."""
    # Create sample published and unpublished courses
    c1 = Course(
        title="Introduction to Systems Engineering",
        description="Comprehensive foundations of computing systems.",
        language="en",
        instructor_id="inst-1",
        is_published=True,
    )
    c2 = Course(
        title="Advanced Machine Learning Algorithms",
        description="Neural networks, gradient boosting, and transformer models.",
        language="en",
        instructor_id="inst-1",
        is_published=True,
    )
    c3 = Course(
        title="Draft Unpublished Syllabus",
        description="Not ready for public consumption.",
        language="en",
        instructor_id="inst-1",
        is_published=False,
    )
    db_session.add_all([c1, c2, c3])
    await db_session.flush()

    v1 = CourseVersion(
        course_id=c1.id,
        version_number="1.0.0",
        state="published",
        content_fingerprint="sha256-test-1",
    )
    v2 = CourseVersion(
        course_id=c2.id,
        version_number="1.0.0",
        state="published",
        content_fingerprint="sha256-test-2",
    )
    db_session.add_all([v1, v2])
    await db_session.commit()

    # Query all published courses
    res = await client.get("/api/v1/courses")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 2
    titles = [item["title"] for item in data["items"]]
    assert "Introduction to Systems Engineering" in titles
    assert "Advanced Machine Learning Algorithms" in titles
    assert "Draft Unpublished Syllabus" not in titles

    # Query with search keyword filter
    search_res = await client.get("/api/v1/courses?search=Machine")
    assert search_res.status_code == 200
    search_data = search_res.json()
    assert search_data["total"] == 1
    assert search_data["items"][0]["title"] == "Advanced Machine Learning Algorithms"
