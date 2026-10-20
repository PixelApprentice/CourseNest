import type { LessonId, SectionId } from '../types/branded.js';
import type { LessonCompletionPolicy } from '../enums/index.js';

export interface Lesson {
  readonly id: LessonId;
  readonly sectionId: SectionId;
  title: string;
  description?: string;
  learningObjectives: string[];
  position: number;
  estimatedDurationMinutes?: number;
  completionPolicy: LessonCompletionPolicy;
  isRequired: boolean;
  prerequisiteLessonIds: LessonId[];
  revision: number;
}
