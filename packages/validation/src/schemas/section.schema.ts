import { z } from 'zod';

export const createSectionSchema = z.object({
  title: z.string().min(1).max(500).trim(),
  description: z.string().max(5000).optional(),
  position: z.number().int().nonnegative(),
  estimatedDurationMinutes: z.number().int().positive().optional(),
  isOptional: z.boolean().default(false),
  prerequisiteSectionIds: z.array(z.string()).default([]),
});

export const updateSectionSchema = createSectionSchema.partial();
export const reorderSectionsSchema = z.object({
  sectionIds: z.array(z.string().min(1)).min(1),
});

export type CreateSectionInput = z.infer<typeof createSectionSchema>;
export type UpdateSectionInput = z.infer<typeof updateSectionSchema>;
