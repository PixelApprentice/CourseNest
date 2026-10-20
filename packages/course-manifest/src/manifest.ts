import { z } from 'zod';

export const courseManifestSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  course: z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().default(''),
    language: z.string().default('en'),
    instructor: z.string().default('Unknown'),
    version: z.string(),
    contentFingerprint: z.string(),
  }),
  sections: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      position: z.number(),
      lessons: z.array(
        z.object({
          id: z.string(),
          title: z.string(),
          position: z.number(),
          resources: z.array(
            z.object({
              id: z.string(),
              filename: z.string(),
              mimeType: z.string(),
              checksumSha256: z.string(),
              storagePath: z.string(),
            }),
          ),
        }),
      ),
    }),
  ),
});

export type CourseManifest = z.infer<typeof courseManifestSchema>;

export function parseManifest(json: unknown): CourseManifest {
  return courseManifestSchema.parse(json);
}

export function validateManifest(json: unknown): { success: boolean; errors?: string[] } {
  const result = courseManifestSchema.safeParse(json);
  if (result.success) {
    return { success: true };
  }
  return {
    success: false,
    errors: result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
  };
}
