/**
 * SQLite DDL migrations for CourseNest local offline database.
 * Uses foreign keys, cascading deletes where appropriate, and composite indexes.
 */

export const SQLITE_PRAGMAS = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA synchronous = NORMAL;
`;

export const SQLITE_SCHEMA = `
-- 1. Courses Table
CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  language TEXT NOT NULL DEFAULT 'en',
  instructor_name TEXT NOT NULL DEFAULT 'Unknown',
  instructor_id TEXT,
  subject TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '[]', -- JSON array
  thumbnail_resource_id TEXT,
  estimated_duration_minutes INTEGER,
  learning_objectives TEXT NOT NULL DEFAULT '[]', -- JSON array
  source_provider TEXT,
  source_url TEXT,
  current_version_id TEXT,
  local_availability TEXT NOT NULL DEFAULT 'downloaded',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_courses_title ON courses(title);
CREATE INDEX IF NOT EXISTS ix_courses_subject ON courses(subject);

-- 2. Course Versions Table
CREATE TABLE IF NOT EXISTS course_versions (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  version_number TEXT NOT NULL,
  manifest_schema_version TEXT NOT NULL DEFAULT '1.0.0',
  content_fingerprint TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT 'draft',
  change_summary TEXT,
  created_at TEXT NOT NULL,
  published_at TEXT
);
CREATE INDEX IF NOT EXISTS ix_course_versions_course_id ON course_versions(course_id);

-- 3. Sections Table
CREATE TABLE IF NOT EXISTS sections (
  id TEXT PRIMARY KEY,
  course_version_id TEXT NOT NULL REFERENCES course_versions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  estimated_duration_minutes INTEGER,
  is_optional INTEGER NOT NULL DEFAULT 0,
  prerequisite_section_ids TEXT NOT NULL DEFAULT '[]' -- JSON array
);
CREATE INDEX IF NOT EXISTS ix_sections_course_version ON sections(course_version_id, position);

-- 4. Lessons Table
CREATE TABLE IF NOT EXISTS lessons (
  id TEXT PRIMARY KEY,
  section_id TEXT NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  learning_objectives TEXT NOT NULL DEFAULT '[]', -- JSON array
  position INTEGER NOT NULL DEFAULT 0,
  estimated_duration_minutes INTEGER,
  completion_policy TEXT NOT NULL DEFAULT 'manual_completion',
  is_required INTEGER NOT NULL DEFAULT 1,
  prerequisite_lesson_ids TEXT NOT NULL DEFAULT '[]', -- JSON array
  revision INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS ix_lessons_section ON lessons(section_id, position);

-- 5. Content Blocks Table
CREATE TABLE IF NOT EXISTS content_blocks (
  id TEXT PRIMARY KEY,
  lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  resource_id TEXT,
  activity_id TEXT,
  display_metadata TEXT NOT NULL DEFAULT '{}', -- JSON object
  is_required INTEGER NOT NULL DEFAULT 1,
  schema_version TEXT NOT NULL DEFAULT '1.0.0'
);
CREATE INDEX IF NOT EXISTS ix_content_blocks_lesson ON content_blocks(lesson_id, position);

-- 6. Resources Table
CREATE TABLE IF NOT EXISTS resources (
  id TEXT PRIMARY KEY,
  original_filename TEXT NOT NULL,
  display_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL,
  checksum_sha256 TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  source_description TEXT,
  resource_type TEXT NOT NULL,
  resource_version TEXT,
  is_indexed INTEGER NOT NULL DEFAULT 0,
  imported_at TEXT NOT NULL,
  license_info TEXT,
  duplicate_of_resource_id TEXT
);
CREATE INDEX IF NOT EXISTS ix_resources_checksum ON resources(checksum_sha256);

-- 7. Enrollments Table
CREATE TABLE IF NOT EXISTS enrollments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  enrolled_at TEXT NOT NULL,
  last_accessed_at TEXT,
  last_lesson_id TEXT,
  overall_progress_percent REAL NOT NULL DEFAULT 0.0,
  sync_status TEXT NOT NULL DEFAULT 'local',
  UNIQUE(user_id, course_id)
);
CREATE INDEX IF NOT EXISTS ix_enrollments_user ON enrollments(user_id);

-- 8. Lesson Progress Table
CREATE TABLE IF NOT EXISTS lesson_progress (
  lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  enrollment_id TEXT NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  is_completed INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  time_spent_seconds INTEGER NOT NULL DEFAULT 0,
  last_accessed_at TEXT NOT NULL,
  PRIMARY KEY (lesson_id, enrollment_id)
);

-- 9. Content Block Progress Table
CREATE TABLE IF NOT EXISTS content_block_progress (
  content_block_id TEXT NOT NULL REFERENCES content_blocks(id) ON DELETE CASCADE,
  enrollment_id TEXT NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  is_completed INTEGER NOT NULL DEFAULT 0,
  video_position_seconds REAL,
  completed_at TEXT,
  PRIMARY KEY (content_block_id, enrollment_id)
);

-- 10. Quiz Attempts Table
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id TEXT PRIMARY KEY,
  activity_id TEXT NOT NULL,
  enrollment_id TEXT NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  answers TEXT NOT NULL DEFAULT '{}', -- JSON object
  score REAL,
  max_score REAL,
  is_passed INTEGER NOT NULL DEFAULT 0,
  started_at TEXT NOT NULL,
  submitted_at TEXT
);
CREATE INDEX IF NOT EXISTS ix_quiz_attempts ON quiz_attempts(enrollment_id, activity_id);

-- 11. Bookmarks Table
CREATE TABLE IF NOT EXISTS bookmarks (
  id TEXT PRIMARY KEY,
  enrollment_id TEXT NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  content_block_id TEXT,
  note TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_bookmarks_enrollment ON bookmarks(enrollment_id);

-- 12. Notes Table
CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  enrollment_id TEXT NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  content_block_id TEXT,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_notes_enrollment ON notes(enrollment_id, lesson_id);

-- 13. Import Jobs Table
CREATE TABLE IF NOT EXISTS import_jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  status TEXT NOT NULL,
  source_path TEXT NOT NULL,
  source_type TEXT NOT NULL,
  total_files INTEGER NOT NULL DEFAULT 0,
  processed_files INTEGER NOT NULL DEFAULT 0,
  imported_files INTEGER NOT NULL DEFAULT 0,
  skipped_files INTEGER NOT NULL DEFAULT 0,
  failed_files INTEGER NOT NULL DEFAULT 0,
  duplicate_files INTEGER NOT NULL DEFAULT 0,
  resulting_course_id TEXT,
  report_json TEXT,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  error TEXT
);
CREATE INDEX IF NOT EXISTS ix_import_jobs_status ON import_jobs(status);
`;
