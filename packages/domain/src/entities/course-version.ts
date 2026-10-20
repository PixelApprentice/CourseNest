import type { CourseId, CourseVersionId } from '../types/branded.js';
import type { PublicationState } from '../enums/index.js';

export interface CourseVersion {
  readonly id: CourseVersionId;
  readonly courseId: CourseId;
  versionNumber: string;
  manifestSchemaVersion: string;
  contentFingerprint: string;
  state: PublicationState;
  changeSummary?: string;
  createdAt: string;
  publishedAt?: string;
}
