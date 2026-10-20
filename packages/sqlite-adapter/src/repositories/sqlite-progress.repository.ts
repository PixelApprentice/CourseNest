import type {
  Enrollment,
  LessonProgress,
  ContentBlockProgress,
  QuizAttempt,
  Bookmark,
  Note,
  CourseId,
  EnrollmentId,
  LessonId,
  ContentBlockId,
  UserId,
  ActivityId,
} from '@coursenest/domain';
import type {
  IEnrollmentRepository,
  IProgressRepository,
  IQuizAttemptRepository,
  IBookmarkRepository,
  INoteRepository,
} from '@coursenest/database-contracts';
import type { ISqliteConnection } from '../database.js';

export class SqliteEnrollmentRepository implements IEnrollmentRepository {
  constructor(private readonly db: ISqliteConnection) {}

  private mapRow(row: any): Enrollment {
    return {
      id: row.id as EnrollmentId,
      userId: row.user_id as UserId,
      courseId: row.course_id as CourseId,
      enrolledAt: row.enrolled_at,
      lastAccessedAt: row.last_accessed_at ?? undefined,
      lastLessonId: (row.last_lesson_id as LessonId) ?? undefined,
      overallProgressPercent: row.overall_progress_percent,
      syncStatus: row.sync_status,
    };
  }

  async findById(id: EnrollmentId): Promise<Enrollment | null> {
    const row = this.db.prepare('SELECT * FROM enrollments WHERE id = ?').get(id);
    return row ? this.mapRow(row) : null;
  }

  async findByUser(userId: UserId): Promise<Enrollment[]> {
    const rows = this.db.prepare('SELECT * FROM enrollments WHERE user_id = ? ORDER BY last_accessed_at DESC').all(userId);
    return rows.map((r) => this.mapRow(r));
  }

  async findByUserAndCourse(userId: UserId, courseId: CourseId): Promise<Enrollment | null> {
    const row = this.db.prepare('SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?').get(userId, courseId);
    return row ? this.mapRow(row) : null;
  }

  async create(enrollment: Enrollment): Promise<Enrollment> {
    this.db.prepare(`
      INSERT INTO enrollments (
        id, user_id, course_id, enrolled_at, last_accessed_at,
        last_lesson_id, overall_progress_percent, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      enrollment.id,
      enrollment.userId,
      enrollment.courseId,
      enrollment.enrolledAt,
      enrollment.lastAccessedAt ?? null,
      enrollment.lastLessonId ?? null,
      enrollment.overallProgressPercent,
      enrollment.syncStatus,
    );
    return enrollment;
  }

  async update(id: EnrollmentId, updates: Partial<Enrollment>): Promise<Enrollment> {
    const existing = await this.findById(id);
    if (!existing) throw new Error(`Enrollment not found: ${id}`);
    const merged = { ...existing, ...updates };

    this.db.prepare(`
      UPDATE enrollments SET
        last_accessed_at = ?, last_lesson_id = ?,
        overall_progress_percent = ?, sync_status = ?
      WHERE id = ?
    `).run(
      merged.lastAccessedAt ?? null,
      merged.lastLessonId ?? null,
      merged.overallProgressPercent,
      merged.syncStatus,
      id,
    );
    return merged;
  }
}

export class SqliteProgressRepository implements IProgressRepository {
  constructor(private readonly db: ISqliteConnection) {}

  async getLessonProgress(enrollmentId: EnrollmentId, lessonId: LessonId): Promise<LessonProgress | null> {
    const row = this.db.prepare('SELECT * FROM lesson_progress WHERE enrollment_id = ? AND lesson_id = ?').get(enrollmentId, lessonId);
    if (!row) return null;
    return {
      lessonId: row.lesson_id as LessonId,
      enrollmentId: row.enrollment_id as EnrollmentId,
      isCompleted: Boolean(row.is_completed),
      completedAt: row.completed_at ?? undefined,
      timeSpentSeconds: row.time_spent_seconds,
      lastAccessedAt: row.last_accessed_at,
    };
  }

  async upsertLessonProgress(progress: LessonProgress): Promise<LessonProgress> {
    this.db.prepare(`
      INSERT INTO lesson_progress (
        lesson_id, enrollment_id, is_completed, completed_at,
        time_spent_seconds, last_accessed_at
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(lesson_id, enrollment_id) DO UPDATE SET
        is_completed = excluded.is_completed,
        completed_at = excluded.completed_at,
        time_spent_seconds = excluded.time_spent_seconds,
        last_accessed_at = excluded.last_accessed_at
    `).run(
      progress.lessonId,
      progress.enrollmentId,
      progress.isCompleted ? 1 : 0,
      progress.completedAt ?? null,
      progress.timeSpentSeconds,
      progress.lastAccessedAt,
    );
    return progress;
  }

  async getBlockProgress(enrollmentId: EnrollmentId, blockId: ContentBlockId): Promise<ContentBlockProgress | null> {
    const row = this.db.prepare('SELECT * FROM content_block_progress WHERE enrollment_id = ? AND content_block_id = ?').get(enrollmentId, blockId);
    if (!row) return null;
    return {
      contentBlockId: row.content_block_id as ContentBlockId,
      enrollmentId: row.enrollment_id as EnrollmentId,
      isCompleted: Boolean(row.is_completed),
      videoPositionSeconds: row.video_position_seconds ?? undefined,
      completedAt: row.completed_at ?? undefined,
    };
  }

  async upsertBlockProgress(progress: ContentBlockProgress): Promise<ContentBlockProgress> {
    this.db.prepare(`
      INSERT INTO content_block_progress (
        content_block_id, enrollment_id, is_completed, video_position_seconds, completed_at
      ) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(content_block_id, enrollment_id) DO UPDATE SET
        is_completed = excluded.is_completed,
        video_position_seconds = excluded.video_position_seconds,
        completed_at = excluded.completed_at
    `).run(
      progress.contentBlockId,
      progress.enrollmentId,
      progress.isCompleted ? 1 : 0,
      progress.videoPositionSeconds ?? null,
      progress.completedAt ?? null,
    );
    return progress;
  }

  async getCompletedLessons(enrollmentId: EnrollmentId): Promise<LessonId[]> {
    const rows = this.db.prepare('SELECT lesson_id FROM lesson_progress WHERE enrollment_id = ? AND is_completed = 1').all(enrollmentId);
    return rows.map((r: any) => r.lesson_id as LessonId);
  }

  async calculateOverallProgress(enrollmentId: EnrollmentId): Promise<number> {
    const enrollment = this.db.prepare('SELECT course_id FROM enrollments WHERE id = ?').get(enrollmentId) as { course_id: string } | undefined;
    if (!enrollment) return 0;

    // Total lessons in published version of course
    const totalRow = this.db.prepare(`
      SELECT COUNT(l.id) as total FROM lessons l
      JOIN sections s ON l.section_id = s.id
      JOIN course_versions cv ON s.course_version_id = cv.id
      JOIN courses c ON cv.course_id = c.id
      WHERE c.id = ?
    `).get(enrollment.course_id) as { total: number };

    if (!totalRow || totalRow.total === 0) return 0;

    const completedRow = this.db.prepare(`
      SELECT COUNT(*) as completed FROM lesson_progress
      WHERE enrollment_id = ? AND is_completed = 1
    `).get(enrollmentId) as { completed: number };

    const percent = Math.min(Math.round((completedRow.completed / totalRow.total) * 100), 100);

    this.db.prepare('UPDATE enrollments SET overall_progress_percent = ? WHERE id = ?').run(percent, enrollmentId);
    return percent;
  }
}

export class SqliteQuizAttemptRepository implements IQuizAttemptRepository {
  constructor(private readonly db: ISqliteConnection) {}

  async findByActivity(enrollmentId: EnrollmentId, activityId: ActivityId): Promise<QuizAttempt[]> {
    const rows = this.db.prepare('SELECT * FROM quiz_attempts WHERE enrollment_id = ? AND activity_id = ? ORDER BY attempt_number ASC').all(enrollmentId, activityId);
    return rows.map((row: any) => ({
      id: row.id,
      activityId: row.activity_id as ActivityId,
      enrollmentId: row.enrollment_id as EnrollmentId,
      attemptNumber: row.attempt_number,
      answers: JSON.parse(row.answers || '{}'),
      score: row.score ?? undefined,
      maxScore: row.max_score ?? undefined,
      isPassed: Boolean(row.is_passed),
      startedAt: row.started_at,
      submittedAt: row.submitted_at ?? undefined,
    }));
  }

  async create(attempt: QuizAttempt): Promise<QuizAttempt> {
    this.db.prepare(`
      INSERT INTO quiz_attempts (
        id, activity_id, enrollment_id, attempt_number, answers,
        score, max_score, is_passed, started_at, submitted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      attempt.id,
      attempt.activityId,
      attempt.enrollmentId,
      attempt.attemptNumber,
      JSON.stringify(attempt.answers ?? {}),
      attempt.score ?? null,
      attempt.maxScore ?? null,
      attempt.isPassed ? 1 : 0,
      attempt.startedAt,
      attempt.submittedAt ?? null,
    );
    return attempt;
  }

  async getAttemptCount(enrollmentId: EnrollmentId, activityId: ActivityId): Promise<number> {
    const row = this.db.prepare('SELECT COUNT(*) as cnt FROM quiz_attempts WHERE enrollment_id = ? AND activity_id = ?').get(enrollmentId, activityId) as { cnt: number };
    return row.cnt;
  }
}

export class SqliteBookmarkRepository implements IBookmarkRepository {
  constructor(private readonly db: ISqliteConnection) {}

  async findByEnrollment(enrollmentId: EnrollmentId): Promise<Bookmark[]> {
    const rows = this.db.prepare('SELECT * FROM bookmarks WHERE enrollment_id = ? ORDER BY created_at DESC').all(enrollmentId);
    return rows.map((row: any) => ({
      id: row.id,
      enrollmentId: row.enrollment_id as EnrollmentId,
      lessonId: row.lesson_id as LessonId,
      contentBlockId: (row.content_block_id as ContentBlockId) ?? undefined,
      note: row.note ?? undefined,
      createdAt: row.created_at,
    }));
  }

  async create(bookmark: Bookmark): Promise<Bookmark> {
    this.db.prepare(`
      INSERT INTO bookmarks (id, enrollment_id, lesson_id, content_block_id, note, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      bookmark.id,
      bookmark.enrollmentId,
      bookmark.lessonId,
      bookmark.contentBlockId ?? null,
      bookmark.note ?? null,
      bookmark.createdAt,
    );
    return bookmark;
  }

  async delete(id: string): Promise<void> {
    this.db.prepare('DELETE FROM bookmarks WHERE id = ?').run(id);
  }
}

export class SqliteNoteRepository implements INoteRepository {
  constructor(private readonly db: ISqliteConnection) {}

  async findByEnrollment(enrollmentId: EnrollmentId): Promise<Note[]> {
    const rows = this.db.prepare('SELECT * FROM notes WHERE enrollment_id = ? ORDER BY updated_at DESC').all(enrollmentId);
    return rows.map((row: any) => ({
      id: row.id,
      enrollmentId: row.enrollment_id as EnrollmentId,
      lessonId: row.lesson_id as LessonId,
      contentBlockId: (row.content_block_id as ContentBlockId) ?? undefined,
      content: row.content,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async findByLesson(enrollmentId: EnrollmentId, lessonId: LessonId): Promise<Note[]> {
    const rows = this.db.prepare('SELECT * FROM notes WHERE enrollment_id = ? AND lesson_id = ? ORDER BY updated_at DESC').all(enrollmentId, lessonId);
    return rows.map((row: any) => ({
      id: row.id,
      enrollmentId: row.enrollment_id as EnrollmentId,
      lessonId: row.lesson_id as LessonId,
      contentBlockId: (row.content_block_id as ContentBlockId) ?? undefined,
      content: row.content,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async create(note: Note): Promise<Note> {
    this.db.prepare(`
      INSERT INTO notes (id, enrollment_id, lesson_id, content_block_id, content, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      note.id,
      note.enrollmentId,
      note.lessonId,
      note.contentBlockId ?? null,
      note.content,
      note.createdAt,
      note.updatedAt,
    );
    return note;
  }

  async update(id: string, content: string): Promise<Note> {
    const row = this.db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
    if (!row) throw new Error(`Note not found: ${id}`);
    const now = new Date().toISOString();
    this.db.prepare('UPDATE notes SET content = ?, updated_at = ? WHERE id = ?').run(content, now, id);
    return {
      id: row.id,
      enrollmentId: row.enrollment_id as EnrollmentId,
      lessonId: row.lesson_id as LessonId,
      contentBlockId: (row.content_block_id as ContentBlockId) ?? undefined,
      content,
      createdAt: row.created_at,
      updatedAt: now,
    };
  }

  async delete(id: string): Promise<void> {
    this.db.prepare('DELETE FROM notes WHERE id = ?').run(id);
  }
}
