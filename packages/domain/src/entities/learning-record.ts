import type {
  ActivityId,
  ContentBlockId,
  CourseId,
  EnrollmentId,
  LessonId,
  UserId,
} from '../types/branded.js';
import type { SyncStatus } from '../enums/index.js';

export interface Enrollment {
  readonly id: EnrollmentId;
  readonly userId: UserId;
  readonly courseId: CourseId;
  enrolledAt: string;
  lastAccessedAt?: string;
  lastLessonId?: LessonId;
  overallProgressPercent: number;
  syncStatus: SyncStatus;
}

export interface LessonProgress {
  readonly lessonId: LessonId;
  readonly enrollmentId: EnrollmentId;
  isCompleted: boolean;
  completedAt?: string;
  timeSpentSeconds: number;
  lastAccessedAt: string;
}

export interface ContentBlockProgress {
  readonly contentBlockId: ContentBlockId;
  readonly enrollmentId: EnrollmentId;
  isCompleted: boolean;
  videoPositionSeconds?: number;
  completedAt?: string;
}

export interface QuizAttempt {
  id: string;
  activityId: ActivityId;
  enrollmentId: EnrollmentId;
  attemptNumber: number;
  answers: Record<string, string | string[]>;
  score?: number;
  maxScore?: number;
  isPassed: boolean;
  startedAt: string;
  submittedAt?: string;
}

export interface Bookmark {
  id: string;
  enrollmentId: EnrollmentId;
  lessonId: LessonId;
  contentBlockId?: ContentBlockId;
  note?: string;
  createdAt: string;
}

export interface Note {
  id: string;
  enrollmentId: EnrollmentId;
  lessonId: LessonId;
  contentBlockId?: ContentBlockId;
  content: string;
  createdAt: string;
  updatedAt: string;
}
