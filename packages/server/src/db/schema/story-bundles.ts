// ──────────────────────────────────────────────
// Schema: Story Bundles
// ──────────────────────────────────────────────
import { fileTable, text, integer } from "../file-schema.js";

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

export const storyBundleVersions = fileTable("story_bundle_versions", {
  id: text("id").primaryKey(),
  bundleId: text("bundle_id")
    .notNull()
    .references(() => storyBundles.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  comment: text("comment").notNull().default(""),
  creator: text("creator").notNull().default(""),
  version: text("version").notNull().default(""),
  tags: text("tags"),
  source: text("source").notNull().default("manual"),
  reason: text("reason").notNull().default(""),
  createdAt: text("created_at").notNull(),
  revision: integer("revision").notNull().default(1),
});
