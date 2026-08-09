// ──────────────────────────────────────────────
// Storage: Story Bundles
// ──────────────────────────────────────────────
import { eq } from "../../db/file-query.js";
import type { CreateStoryBundleInput, UpdateStoryBundleInput } from "@marinara-engine/shared";
import type { DB } from "../../db/connection.js";
import { storyBundles } from "../../db/schema/index.js";
import { newId, now } from "../../utils/id-generator.js";

export function createStoryBundlesStorage(db: DB) {
  return {
    async list() {
      return db.select().from(storyBundles).orderBy(storyBundles.createdAt);
    },

    async getById(id: string) {
      const rows = await db.select().from(storyBundles).where(eq(storyBundles.id, id));
      return rows[0] ?? null;
    },

    async create(input: CreateStoryBundleInput) {
      const id = newId();
      const timestamp = now();
      await db.insert(storyBundles).values({
        id,
        name: input.name,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      return this.getById(id);
    },

    async update(id: string, data: UpdateStoryBundleInput) {
      await db
        .update(storyBundles)
        .set({
          ...(data.name !== undefined && { name: data.name }),
          updatedAt: now(),
        })
        .where(eq(storyBundles.id, id));
      return this.getById(id);
    },

    async remove(id: string) {
      await db.delete(storyBundles).where(eq(storyBundles.id, id));
    },
  };
}
