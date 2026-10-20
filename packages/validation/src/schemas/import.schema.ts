import { z } from 'zod';

export const importConfigSchema = z.object({
  sourcePaths: z.array(z.string().min(1)).min(1),
  maxFileSizeBytes: z.number().int().positive().default(2_147_483_648), // 2GB
  maxFileCount: z.number().int().positive().default(10_000),
  maxArchiveSizeBytes: z.number().int().positive().default(10_737_418_240), // 10GB
  allowedMimeTypes: z.array(z.string()).optional(),
  skipDuplicates: z.boolean().default(true),
  aiAssisted: z.boolean().default(false),
});

export type ImportConfig = z.infer<typeof importConfigSchema>;
