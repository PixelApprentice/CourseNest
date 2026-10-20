import { z } from 'zod';

export const courseIdSchema = z.string().min(1).max(64);
export const versionIdSchema = z.string().min(1).max(64);

export const createCourseSchema = z.object({
  title: z.string().min(1).max(500).trim(),
  description: z.string().max(10000).default(''),
  language: z.string().min(2).max(10).default('en'),
  instructorName: z.string().max(200).default('Unknown'),
  subject: z.string().max(200).default(''),
  tags: z.array(z.string().max(50)).max(20).default([]),
  learningObjectives: z.array(z.string().max(500)).max(50).default([]),
  estimatedDurationMinutes: z.number().int().positive().optional(),
  sourceProvider: z.string().max(200).optional(),
  sourceUrl: z.string().url().optional(),
});

export const updateCourseSchema = createCourseSchema.partial();

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
