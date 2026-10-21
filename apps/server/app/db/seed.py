"""Database seeding script to load course fixtures into PostgreSQL."""

import asyncio
import json
from pathlib import Path

from sqlalchemy import select

from app.db.models.course import Course, CourseVersion, Lesson, Section
from app.db.models.user import User
from app.db.session import async_session_factory, engine

FIXTURES_DIR = Path(__file__).resolve().parents[4] / "fixtures" / "courses"


async def seed_database() -> None:
    """Load JSON course manifests from fixtures/courses/ into the database."""
    print(f"Loading fixtures from {FIXTURES_DIR}...")
    if not FIXTURES_DIR.exists():
        print(f"Warning: Fixtures directory {FIXTURES_DIR} does not exist.")
        return

    async with async_session_factory() as session:
        # 1. Create or get demo instructor
        result = await session.execute(
            select(User).where(User.email == "instructor@coursenest.edu")
        )
        instructor = result.scalar_one_or_none()
        if not instructor:
            instructor = User(
                email="instructor@coursenest.edu",
                display_name="Demo Instructor",
                hashed_password="hashed_placeholder",
                role="instructor",
            )
            session.add(instructor)
            await session.flush()
            print(f"Created demo instructor: {instructor.email}")

        # 2. Iterate over fixture files
        for fixture_file in FIXTURES_DIR.glob("*.json"):
            with open(fixture_file, encoding="utf-8") as f:
                data = json.load(f)

            c_info = data["course"]
            c_id = c_info["id"]

            # Check if course exists
            c_result = await session.execute(select(Course).where(Course.id == c_id))
            course = c_result.scalar_one_or_none()

            if not course:
                course = Course(
                    title=c_info["title"],
                    description=c_info["description"],
                    language=c_info.get("language", "en"),
                    instructor_name=c_info["instructorName"],
                    instructor_id=instructor.id,
                    subject=c_info.get("subject", ""),
                    tags=json.dumps(c_info.get("tags", [])),
                    estimated_duration_minutes=c_info.get("estimatedDurationMinutes"),
                    is_published=True,
                )
                session.add(course)
                await session.flush()
                print(f"Imported Course: {course.title}")

                # Version
                version = CourseVersion(
                    course_id=course.id,
                    version_number=c_info.get("version", "1.0.0"),
                    content_fingerprint=c_info.get("contentFingerprint", ""),
                    state="published",
                )
                session.add(version)
                await session.flush()

                # Sections & Lessons
                for s_data in data.get("sections", []):
                    section = Section(
                        course_version_id=version.id,
                        title=s_data["title"],
                        position=s_data.get("position", 0),
                        description=s_data.get("description", ""),
                        estimated_duration_minutes=s_data.get("estimatedDurationMinutes"),
                    )
                    session.add(section)
                    await session.flush()

                    for l_data in s_data.get("lessons", []):
                        lesson = Lesson(
                            section_id=section.id,
                            title=l_data["title"],
                            position=l_data.get("position", 0),
                            description=l_data.get("description", ""),
                            estimated_duration_minutes=l_data.get("estimatedDurationMinutes"),
                            completion_policy=l_data.get("completionPolicy", "manual_completion"),
                            is_required=l_data.get("isRequired", True),
                        )
                        session.add(lesson)

        await session.commit()
        print("Database seeding completed successfully.")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed_database())
