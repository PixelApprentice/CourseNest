import type {
  Enrollment,
  LessonProgress,
  ContentBlockProgress,
  QuizAttempt,
  Bookmark,
  Note,
} from '@coursenest/domain';
import type {
  CourseId,
  EnrollmentId,
  LessonId,
  ContentBlockId,
  UserId,
  ActivityId,
} from '@coursenest/domain';

export interface IEnrollmentRepository {
  findById(id: EnrollmentId): Promise<Enrollment | null>;
  findByUser(userId: UserId): Promise<Enrollment[]>;
  findByUserAndCourse(userId: UserId, courseId: CourseId): Promise<Enrollment | null>;
  create(enrollment: Enrollment): Promise<Enrollment>;
  update(id: EnrollmentId, updates: Partial<Enrollment>): Promise<Enrollment>;
}

export interface IProgressRepository {
  getLessonProgress(enrollmentId: EnrollmentId, lessonId: LessonId): Promise<LessonProgress | null>;
  upsertLessonProgress(progress: LessonProgress): Promise<LessonProgress>;
  getBlockProgress(enrollmentId: EnrollmentId, blockId: ContentBlockId): Promise<ContentBlockProgress | null>;
  upsertBlockProgress(progress: ContentBlockProgress): Promise<ContentBlockProgress>;
  getCompletedLessons(enrollmentId: EnrollmentId): Promise<LessonId[]>;
  calculateOverallProgress(enrollmentId: EnrollmentId): Promise<number>;
}

export interface IQuizAttemptRepository {
  findByActivity(enrollmentId: EnrollmentId, activityId: ActivityId): Promise<QuizAttempt[]>;
  create(attempt: QuizAttempt): Promise<QuizAttempt>;
  getAttemptCount(enrollmentId: EnrollmentId, activityId: ActivityId): Promise<number>;
}

export interface IBookmarkRepository {
  findByEnrollment(enrollmentId: EnrollmentId): Promise<Bookmark[]>;
  create(bookmark: Bookmark): Promise<Bookmark>;
  delete(id: string): Promise<void>;
}

export interface INoteRepository {
  findByEnrollment(enrollmentId: EnrollmentId): Promise<Note[]>;
  findByLesson(enrollmentId: EnrollmentId, lessonId: LessonId): Promise<Note[]>;
  create(note: Note): Promise<Note>;
  update(id: string, content: string): Promise<Note>;
  delete(id: string): Promise<void>;
}
