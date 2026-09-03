// ──────────────────────────────────────────────
// Story Bundle Schemas (Zod)
// ──────────────────────────────────────────────
import { z } from "zod";

const nonEmptyIdSchema = z.string().min(1);
const storyBundleNameSchema = z.string().trim().min(1, "Title is required").max(200);

export const storyBundleScenarioSchema = z.object({
  id: nonEmptyIdSchema,
  title: z.string().trim().min(1, "Scenario title is required").max(200),
  openingMessage: z.string().min(1, "Scenario opening message is required"),
  imagePath: z.string().nullable().optional(),
  avatarCrop: z.unknown().nullable().optional(),
});

export const storyBundleIdParamsSchema = z.object({
  id: nonEmptyIdSchema,
});

export const storyBundleGameConfigSchema = z.object({
  genre: z.string(),
  setting: z.string(),
  tone: z.string(),
  difficulty: z.string(),
  playerGoals: z.string(),
  gmMode: z.enum(["standalone", "character"]),
  rating: z.enum(["sfw", "nsfw"]),
  combatStyle: z.enum(["classic", "tactical"]).optional(),
  gameWorldMapMode: z.enum(["standard", "hierarchical"]).optional(),
  language: z.string().optional(),
  enableCustomWidgets: z.boolean().optional(),
  enableSpriteGeneration: z.boolean().optional(),
  enableGameSoundEffects: z.boolean().optional(),
  enableGameMusic: z.boolean().optional(),
  promptPresetId: z.string().nullable().optional(),
  gameGmPromptTemplateId: z.string().nullable().optional(),
  gameSystemPrompt: z.string().nullable().optional(),
  gameSpecialInstructions: z.string().nullable().optional(),
});

export const storyBundleAssetSelectionSchema = z.object({
  excludedFolders: z.array(z.string()),
});

export const createStoryBundleSchema = z.object({
  name: storyBundleNameSchema,
  description: z.string().nullable().optional(),
  imagePath: z.string().nullable().default(null),
  avatarCrop: z.unknown().nullable().optional(),
  comment: z.string().default(""),
  creator: z.string().default(""),
  version: z.string().default(""),
  tags: z.array(z.string()).default([]),
  characterIds: z.array(z.string()).optional(),
  personaIds: z.array(z.string()).optional(),
  lorebookIds: z.array(z.string()).optional(),
  presetIds: z.array(z.string()).optional(),
  agentIds: z.array(z.string()).optional(),
  scenarios: z.array(storyBundleScenarioSchema).optional(),
  partyCharacterIds: z.array(z.string()).optional(),
  gameConfig: storyBundleGameConfigSchema.nullable().optional(),
  gameAssetSelection: storyBundleAssetSelectionSchema.nullable().optional(),
});

export const updateStoryBundleSchema = z.object({
  name: storyBundleNameSchema.optional(),
  description: z.string().nullable().optional(),
  imagePath: z.string().nullable().optional(),
  avatarCrop: z.unknown().nullable().optional(),
  comment: z.string().optional(),
  creator: z.string().optional(),
  version: z.string().optional(),
  tags: z.array(z.string()).optional(),
  characterIds: z.array(z.string()).optional(),
  lorebookIds: z.array(z.string()).optional(),
  personaIds: z.array(z.string()).optional(),
  presetIds: z.array(z.string()).optional(),
  agentIds: z.array(z.string()).optional(),
  scenarios: z.array(storyBundleScenarioSchema).optional(),
  partyCharacterIds: z.array(z.string()).optional(),
  gameConfig: storyBundleGameConfigSchema.nullable().optional(),
  gameAssetSelection: storyBundleAssetSelectionSchema.nullable().optional(),
});

export type CreateStoryBundleInput = z.input<typeof createStoryBundleSchema>;
export type UpdateStoryBundleInput = z.infer<typeof updateStoryBundleSchema>;
