"""Initial database schema for CourseNest central server.

Revision ID: 001_initial_schema
Revises:
Create Date: 2026-10-20 22:15:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = '001_initial_schema'
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Users table
    op.create_table(
        'users',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('email', sa.String(length=320), nullable=False),
        sa.Column('display_name', sa.String(length=200), nullable=False),
        sa.Column('hashed_password', sa.String(length=512), nullable=False),
        sa.Column('role', sa.String(length=20), server_default='student', nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('last_login_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('ix_users_email', 'users', ['email'], unique=True)

    # 2. Courses table
    op.create_table(
        'courses',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('title', sa.String(length=500), nullable=False),
        sa.Column('description', sa.Text(), server_default='', nullable=False),
        sa.Column('language', sa.String(length=10), server_default='en', nullable=False),
        sa.Column('instructor_name', sa.String(length=200), server_default='Unknown', nullable=False),
        sa.Column('instructor_id', sa.String(length=64), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('subject', sa.String(length=200), server_default='', nullable=False),
        sa.Column('tags', sa.Text(), server_default='[]', nullable=False),
        sa.Column('estimated_duration_minutes', sa.Integer(), nullable=True),
        sa.Column('current_version_id', sa.String(length=64), nullable=True),
        sa.Column('is_published', sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_courses_title', 'courses', ['title'])

    # 3. Course Versions table
    op.create_table(
        'course_versions',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('course_id', sa.String(length=64), sa.ForeignKey('courses.id', ondelete='CASCADE'), nullable=False),
        sa.Column('version_number', sa.String(length=50), nullable=False),
        sa.Column('manifest_schema_version', sa.String(length=20), server_default='1.0.0', nullable=False),
        sa.Column('content_fingerprint', sa.String(length=128), server_default='', nullable=False),
        sa.Column('state', sa.String(length=20), server_default='draft', nullable=False),
        sa.Column('change_summary', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('published_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('ix_course_versions_course_id', 'course_versions', ['course_id'])

    # 4. Sections table
    op.create_table(
        'sections',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('course_version_id', sa.String(length=64), sa.ForeignKey('course_versions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(length=500), nullable=False),
        sa.Column('position', sa.Integer(), server_default='0', nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('estimated_duration_minutes', sa.Integer(), nullable=True),
        sa.Column('is_optional', sa.Boolean(), server_default=sa.false(), nullable=False),
    )
    op.create_index('ix_sections_course_version_id', 'sections', ['course_version_id'])

    # 5. Lessons table
    op.create_table(
        'lessons',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('section_id', sa.String(length=64), sa.ForeignKey('sections.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(length=500), nullable=False),
        sa.Column('position', sa.Integer(), server_default='0', nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('estimated_duration_minutes', sa.Integer(), nullable=True),
        sa.Column('completion_policy', sa.String(length=50), server_default='manual_completion', nullable=False),
        sa.Column('is_required', sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column('revision', sa.Integer(), server_default='1', nullable=False),
    )
    op.create_index('ix_lessons_section_id', 'lessons', ['section_id'])

    # 6. Enrollments table
    op.create_table(
        'enrollments',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('user_id', sa.String(length=64), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('course_id', sa.String(length=64), sa.ForeignKey('courses.id', ondelete='CASCADE'), nullable=False),
        sa.Column('enrolled_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('last_accessed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('overall_progress_percent', sa.Float(), server_default='0.0', nullable=False),
        sa.Column('is_completed', sa.Boolean(), server_default=sa.false(), nullable=False),
    )
    op.create_index('ix_enrollments_user_id', 'enrollments', ['user_id'])
    op.create_index('ix_enrollments_course_id', 'enrollments', ['course_id'])


def downgrade() -> None:
    op.drop_table('enrollments')
    op.drop_table('lessons')
    op.drop_table('sections')
    op.drop_table('course_versions')
    op.drop_table('courses')
    op.drop_table('users')
