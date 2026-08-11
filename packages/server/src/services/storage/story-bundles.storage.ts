// ──────────────────────────────────────────────
// Storage: Story Bundles
// ──────────────────────────────────────────────
import { eq, desc } from "../../db/file-query.js";
import type { CreateStoryBundleInput, UpdateStoryBundleInput, StoryBundleVersion } from "@marinara-engine/shared";
import type { DB } from "../../db/connection.js";
import { storyBundles, storyBundleVersions } from "../../db/schema/index.js";
import { newId, now } from "../../utils/id-generator.js";

function parseTags(value: unknown): string[] {
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((entry): entry is string => typeof entry === "string")
      : [];
  } catch { return []; }
}

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
        description: input.description ?? null,
        imagePath: input.imagePath ?? null,
        comment: input.comment ?? "",
        creator: input.creator ?? "",
        version: input.version ?? "",
        tags: JSON.stringify(input.tags ?? []),
        characterIds: JSON.stringify(input.characterIds ?? []),
        personaIds: JSON.stringify(input.personaIds ?? []),
        lorebookIds: JSON.stringify(input.lorebookIds ?? []),
        presetIds: JSON.stringify(input.presetIds ?? []),
        intros: JSON.stringify(input.intros ?? []),
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
          ...(data.description !== undefined && { description: data.description }),
          ...(data.imagePath !== undefined && { imagePath: data.imagePath }),
          ...(data.comment !== undefined && { comment: data.comment }),
          ...(data.creator !== undefined && { creator: data.creator }),
          ...(data.version !== undefined && { version: data.version }),
          ...(data.tags !== undefined && { tags: JSON.stringify(data.tags) }),
          ...(data.characterIds !== undefined && { characterIds: JSON.stringify(data.characterIds) }),
          ...(data.personaIds !== undefined && { personaIds: JSON.stringify(data.personaIds) }),
          ...(data.lorebookIds !== undefined && { lorebookIds: JSON.stringify(data.lorebookIds) }),
          ...(data.presetIds !== undefined && { presetIds: JSON.stringify(data.presetIds) }),
          ...(data.intros !== undefined && { intros: JSON.stringify(data.intros) }),
          updatedAt: now(),
        })
        .where(eq(storyBundles.id, id));
      return this.getById(id);
    },

    async remove(id: string) {
      await db.delete(storyBundles).where(eq(storyBundles.id, id));
    },

    // ── Version history ──

    async listVersions(bundleId: string): Promise<StoryBundleVersion[]> {
      const rows = await db
        .select()
        .from(storyBundleVersions)
        .where(eq(storyBundleVersions.bundleId, bundleId))
        .orderBy(desc(storyBundleVersions.revision));
      return rows.map((row: Record<string, unknown>) => ({
        id: row.id as string,
        bundleId: row.bundleId as string,
        name: row.name as string,
        description: (row.description as string) ?? null,
        comment: (row.comment as string) ?? "",
        creator: (row.creator as string) ?? "",
        version: (row.version as string) ?? "",
        tags: parseTags(row.tags),
        source: (row.source as string) ?? "manual",
        reason: (row.reason as string) ?? "",
        createdAt: row.createdAt as string,
        revision: (row.revision as number) ?? 1,
      }));
    },

    async createVersion(
      bundleId: string,
      data: {
        name: string;
        description: string | null;
        comment: string;
        creator: string;
        version: string;
        tags: string[];
        source?: string;
        reason?: string;
      },
    ): Promise<StoryBundleVersion> {
      const versions = await this.listVersions(bundleId);
      const nextRevision = versions.length > 0 ? Math.max(...versions.map((v) => v.revision)) + 1 : 1;
      const id = newId();
      const timestamp = now();
      await db.insert(storyBundleVersions).values({
        id,
        bundleId,
        name: data.name,
        description: data.description,
        comment: data.comment,
        creator: data.creator,
        version: data.version,
        tags: JSON.stringify(data.tags),
        source: data.source ?? "manual",
        reason: data.reason ?? "",
        createdAt: timestamp,
        revision: nextRevision,
      });
      return {
        id,
        bundleId,
        name: data.name,
        description: data.description,
        comment: data.comment,
        creator: data.creator,
        version: data.version,
        tags: data.tags,
        source: data.source ?? "manual",
        reason: data.reason ?? "",
        createdAt: timestamp,
        revision: nextRevision,
      };
    },

    async deleteVersion(versionId: string): Promise<void> {
      await db.delete(storyBundleVersions).where(eq(storyBundleVersions.id, versionId));
    },

    async deleteAllVersions(bundleId: string): Promise<void> {
      await db.delete(storyBundleVersions).where(eq(storyBundleVersions.bundleId, bundleId));
    },
  };
}
