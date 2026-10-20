import { z } from 'zod';

const completionPolicySchema = z.enum([
  'all_blocks_completed',
  'required_blocks_completed',
  'video_watched',
  'manual_completion',
  'time_spent',
]);

export const createLessonSchema = z.object({
  title: z.string().min(1).max(500).trim(),
  description: z.string().max(5000).optional(),
  learningObjectives: z.array(z.string().max(500)).max(20).default([]),
  position: z.number().int().nonnegative(),
  estimatedDurationMinutes: z.number().int().positive().optional(),
  completionPolicy: completionPolicySchema.default('manual_completion'),
  isRequired: z.boolean().default(true),
  prerequisiteLessonIds: z.array(z.string()).default([]),
});

export const updateLessonSchema = createLessonSchema.partial();

export type CreateLessonInput = z.infer<typeof createLessonSchema>;
export type UpdateLessonInput = z.infer<typeof updateLessonSchema>;
