// ──────────────────────────────────────────────
// Schema: Story Bundles
// ──────────────────────────────────────────────
import { fileTable, text } from "../file-schema.js";

export const storyBundles = fileTable("story_bundles", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  imagePath: text("image_path"),
  avatarCrop: text("avatar_crop"),
  comment: text("comment").notNull().default(""),
  creator: text("creator").notNull().default(""),
  version: text("version").notNull().default(""),
  tags: text("tags"),
  characterIds: text("character_ids"),
  personaIds: text("persona_ids"),
  lorebookIds: text("lorebook_ids"),
  presetIds: text("preset_ids"),
  agentIds: text("agent_ids"),
  intros: text("intros"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
