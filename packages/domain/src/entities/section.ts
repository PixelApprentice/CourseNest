import type { CourseVersionId, SectionId } from '../types/branded.js';

export interface Section {
  readonly id: SectionId;
  readonly courseVersionId: CourseVersionId;
  title: string;
  description?: string;
  position: number;
  estimatedDurationMinutes?: number;
  isOptional: boolean;
  prerequisiteSectionIds: SectionId[];
}
