"""Tests for course catalog, permissions, curriculum syllabus, and management."""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, hash_password
from app.db.models.course import Course, CourseVersion, Lesson, Section
from app.db.models.user import User


@pytest.mark.asyncio
async def test_course_listing_pagination_and_subject_filter(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """Test listing courses with pagination, search, and subject filters."""
    # Baseline count before inserting
    initial_res = await client.get("/api/v1/courses")
    initial_total = initial_res.json()["total"]

    courses = [
        Course(
            title="Data Structures & Algorithms",
            description="Trees, graphs, dynamic programming.",
            subject="Computer Science",
            is_published=True,
        ),
        Course(
            title="Operating Systems Deep Dive",
            description="Virtual memory, processes, scheduling.",
            subject="Computer Science",
            is_published=True,
        ),
        Course(
            title="Renaissance Art History",
            description="Italian Renaissance masters and techniques.",
            subject="Humanities",
            is_published=True,
        ),
        Course(
            title="Unpublished Physics Syllabus",
            description="Quantum mechanics draft.",
            subject="Physics",
            is_published=False,
        ),
    ]
    db_session.add_all(courses)
    await db_session.commit()

    # 1. List with limit=2
    res = await client.get("/api/v1/courses?limit=2&offset=0")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == initial_total + 3  # Only published courses added
    assert len(data["items"]) == 2
    assert data["limit"] == 2
    assert data["offset"] == 0

    # 2. Filter by subject="Humanities"
    res_subject = await client.get("/api/v1/courses?subject=Humanities")
    assert res_subject.status_code == 200
    sub_data = res_subject.json()
    assert sub_data["total"] == 1
    assert sub_data["items"][0]["title"] == "Renaissance Art History"

    # 3. Search query
    res_search = await client.get("/api/v1/courses?search=virtual memory")
    assert res_search.status_code == 200
    search_data = res_search.json()
    assert search_data["total"] == 1
    assert search_data["items"][0]["title"] == "Operating Systems Deep Dive"


@pytest.mark.asyncio
async def test_get_course_by_id_and_404(client: AsyncClient, db_session: AsyncSession) -> None:
    """Test fetching course by ID and 404 response on missing IDs."""
    course = Course(
        title="Distributed Systems",
        description="Raft, Paxos, and distributed consensus.",
        is_published=True,
    )
    db_session.add(course)
    await db_session.commit()

    # Success
    res = await client.get(f"/api/v1/courses/{course.id}")
    assert res.status_code == 200
    assert res.json()["title"] == "Distributed Systems"

    # Not found
    res_404 = await client.get("/api/v1/courses/non-existent-course-id-999")
    assert res_404.status_code == 404


@pytest.mark.asyncio
async def test_course_curriculum_sections_and_lessons(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """Test retrieving course syllabus hierarchy."""
    course = Course(title="Compiler Design", is_published=True)
    db_session.add(course)
    await db_session.flush()

    version = CourseVersion(
        course_id=course.id,
        version_number="1.0.0",
        state="published",
    )
    db_session.add(version)
    await db_session.flush()

    sec1 = Section(
        course_version_id=version.id,
        title="Module 1: Lexical Analysis",
        position=1,
    )
    db_session.add(sec1)
    await db_session.flush()

    les1 = Lesson(section_id=sec1.id, title="Lesson 1.1: Tokenizers", position=1)
    les2 = Lesson(section_id=sec1.id, title="Lesson 1.2: Regular Expressions", position=2)
    db_session.add_all([les1, les2])
    await db_session.commit()

    res = await client.get(f"/api/v1/courses/{course.id}/curriculum")
    assert res.status_code == 200
    data = res.json()
    assert data["course_id"] == course.id
    assert data["version_number"] == "1.0.0"
    assert len(data["sections"]) == 1
    assert data["sections"][0]["title"] == "Module 1: Lexical Analysis"
    assert len(data["sections"][0]["lessons"]) == 2
    assert data["sections"][0]["lessons"][0]["title"] == "Lesson 1.1: Tokenizers"


@pytest.mark.asyncio
async def test_course_creation_roles_and_lifecycle(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """Test course creation, role security enforcement, update, and deletion."""
    # 1. Create Instructor & Student users
    instructor = User(
        email="prof_smith@coursenest.edu",
        display_name="Prof. Smith",
        hashed_password=hash_password("ProfPassword123!"),
        role="instructor",
    )
    student = User(
        email="student_bob@coursenest.edu",
        display_name="Bob Student",
        hashed_password=hash_password("BobPassword123!"),
        role="student",
    )
    db_session.add_all([instructor, student])
    await db_session.commit()

    inst_token = create_access_token(subject=instructor.id, role=instructor.role)
    stud_token = create_access_token(subject=student.id, role=student.role)

    # 2. Student cannot create course (403 Forbidden)
    stud_create = await client.post(
        "/api/v1/courses",
        json={"title": "Unauthorized Course"},
        headers={"Authorization": f"Bearer {stud_token}"},
    )
    assert stud_create.status_code == 403

    # 3. Instructor creates course (201 Created)
    inst_create = await client.post(
        "/api/v1/courses",
        json={
            "title": "Database Internals",
            "description": "B-Trees and Write-Ahead Logging.",
            "language": "en",
            "subject": "Databases",
            "is_published": True,
        },
        headers={"Authorization": f"Bearer {inst_token}"},
    )
    assert inst_create.status_code == 201
    course_id = inst_create.json()["id"]
    assert inst_create.json()["instructor_id"] == instructor.id

    # 4. Student cannot update course (403 Forbidden)
    stud_update = await client.patch(
        f"/api/v1/courses/{course_id}",
        json={"title": "Hacked Title"},
        headers={"Authorization": f"Bearer {stud_token}"},
    )
    assert stud_update.status_code == 403

    # 5. Instructor updates course (200 OK)
    inst_update = await client.patch(
        f"/api/v1/courses/{course_id}",
        json={"title": "Database Internals: 2nd Edition"},
        headers={"Authorization": f"Bearer {inst_token}"},
    )
    assert inst_update.status_code == 200
    assert inst_update.json()["title"] == "Database Internals: 2nd Edition"

    # 6. Instructor deletes course (204 No Content)
    inst_delete = await client.delete(
        f"/api/v1/courses/{course_id}",
        headers={"Authorization": f"Bearer {inst_token}"},
    )
    assert inst_delete.status_code == 204

    # 7. Verification: course no longer exists (404)
    verify_res = await client.get(f"/api/v1/courses/{course_id}")
    assert verify_res.status_code == 404
