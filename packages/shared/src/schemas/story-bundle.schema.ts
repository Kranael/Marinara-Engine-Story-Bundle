// ──────────────────────────────────────────────
// Story Bundle Schemas (Zod)
// ──────────────────────────────────────────────
import { z } from "zod";

const nonEmptyIdSchema = z.string().min(1);
const storyBundleNameSchema = z.string().trim().min(1, "Title is required").max(200);

export const storyBundleIntroSchema = z.object({
  id: nonEmptyIdSchema,
  name: z.string().trim().min(1, "Intro name is required").max(200),
  text: z.string().min(1, "Intro text is required"),
});

export const storyBundleIdParamsSchema = z.object({
  id: nonEmptyIdSchema,
});

export const createStoryBundleSchema = z.object({
  name: storyBundleNameSchema,
  description: z.string().nullable().optional(),
  characterIds: z.array(z.string()).optional(),
  personaIds: z.array(z.string()).optional(),
  lorebookIds: z.array(z.string()).optional(),
  presetIds: z.array(z.string()).optional(),
  intros: z.array(storyBundleIntroSchema).optional(),
});

export const updateStoryBundleSchema = z.object({
  name: storyBundleNameSchema.optional(),
  description: z.string().nullable().optional(),
  characterIds: z.array(z.string()).optional(),
  lorebookIds: z.array(z.string()).optional(),
  personaIds: z.array(z.string()).optional(),
  presetIds: z.array(z.string()).optional(),
  intros: z.array(storyBundleIntroSchema).optional(),
});

export type CreateStoryBundleInput = z.infer<typeof createStoryBundleSchema>;
export type UpdateStoryBundleInput = z.infer<typeof updateStoryBundleSchema>;
