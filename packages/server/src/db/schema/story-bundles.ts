// ──────────────────────────────────────────────
// Schema: Story Bundles
// ──────────────────────────────────────────────
import { fileTable, text } from "../file-schema.js";

export const storyBundles = fileTable("story_bundles", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
