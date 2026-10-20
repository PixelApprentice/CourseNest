import type { CourseId, CourseVersionId, ResourceId, UserId } from '../types/branded.js';
import type { DownloadStatus } from '../enums/index.js';

export interface Course {
  readonly id: CourseId;
  title: string;
  description: string;
  language: string;
  instructorName: string;
  instructorId?: UserId;
  subject: string;
  tags: string[];
  thumbnailResourceId?: ResourceId;
  estimatedDurationMinutes?: number;
  learningObjectives: string[];
  sourceProvider?: string;
  sourceUrl?: string;
  currentVersionId?: CourseVersionId;
  localAvailability: DownloadStatus;
  createdAt: string;
  updatedAt: string;
}
