import type { ActivityId, ContentBlockId, LessonId, ResourceId } from '../types/branded.js';
import type { ContentBlockType } from '../enums/index.js';

export interface ContentBlock {
  readonly id: ContentBlockId;
  readonly lessonId: LessonId;
  type: ContentBlockType;
  position: number;
  resourceId?: ResourceId;
  activityId?: ActivityId;
  displayMetadata: Record<string, unknown>;
  isRequired: boolean;
  schemaVersion: string;
}
