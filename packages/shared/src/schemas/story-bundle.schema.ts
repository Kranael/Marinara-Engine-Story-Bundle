// ──────────────────────────────────────────────
// Story Bundle Schemas (Zod)
// ──────────────────────────────────────────────
import { z } from "zod";

const nonEmptyIdSchema = z.string().min(1);
const storyBundleNameSchema = z.string().trim().min(1, "Title is required").max(200);

export const storyBundleIdParamsSchema = z.object({
  id: nonEmptyIdSchema,
});

export const createStoryBundleSchema = z.object({
  name: storyBundleNameSchema,
});

export const updateStoryBundleSchema = z.object({
  name: storyBundleNameSchema.optional(),
});

export type CreateStoryBundleInput = z.infer<typeof createStoryBundleSchema>;
export type UpdateStoryBundleInput = z.infer<typeof updateStoryBundleSchema>;
