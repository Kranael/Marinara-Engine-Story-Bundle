// ──────────────────────────────────────────────
// Routes: Story Bundles
// ──────────────────────────────────────────────
import type { FastifyInstance } from "fastify";
import {
  createStoryBundleSchema,
  storyBundleIdParamsSchema,
  updateStoryBundleSchema,
} from "@marinara-engine/shared";
import type { ExportEnvelope, StoryBundle } from "@marinara-engine/shared";
import { createStoryBundlesStorage } from "../services/storage/story-bundles.storage.js";
import { createCharactersStorage } from "../services/storage/characters.storage.js";
import { createLorebooksStorage } from "../services/storage/lorebooks.storage.js";
import { logger } from "../lib/logger.js";

/** Parse a JSON text column into a string array. */
function parseJsonArray(value: unknown): string[] {
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((entry): entry is string => typeof entry === "string")
      : [];
  } catch { return []; }
}

/** Parse the JSON columns into typed arrays for the API response. */
function serializeBundle(row: Record<string, unknown>): StoryBundle {
  return {
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string) ?? null,
    characterIds: parseJsonArray(row.characterIds),
    personaIds: parseJsonArray(row.personaIds),
    lorebookIds: parseJsonArray(row.lorebookIds),
    createdAt: row.createdAt as string,
    updatedAt: row.updatedAt as string,
  };
}

export async function storyBundlesRoutes(app: FastifyInstance) {
  const storage = createStoryBundlesStorage(app.db);
  const charactersStorage = createCharactersStorage(app.db);
  const lorebooksStorage = createLorebooksStorage(app.db);

  // ── List all story bundles ──
  app.get("/", async (_req, reply) => {
    const bundles = await storage.list();
    return reply.send(bundles.map(serializeBundle));
  });

  // ── Get a single story bundle ──
  app.get("/:id", async (req, reply) => {
    const { id } = storyBundleIdParamsSchema.parse(req.params);
    const bundle = await storage.getById(id);
    if (!bundle) return reply.status(404).send({ error: "Story bundle not found" });
    return reply.send(serializeBundle(bundle));
  });

  // ── Create a story bundle ──
  app.post("/", async (req, reply) => {
    const input = createStoryBundleSchema.parse(req.body);
    const bundle = await storage.create(input);
    if (!bundle) {
      logger.error("Story bundle storage.create returned no bundle");
      return reply.status(500).send({ error: "Failed to create story bundle" });
    }
    return reply.status(201).send(serializeBundle(bundle));
  });

  // ── Update a story bundle ──
  app.patch("/:id", async (req, reply) => {
    const { id } = storyBundleIdParamsSchema.parse(req.params);
    const existing = await storage.getById(id);
    if (!existing) return reply.status(404).send({ error: "Story bundle not found" });
    const input = updateStoryBundleSchema.parse(req.body);
    const bundle = await storage.update(id, input);
    if (!bundle) {
      logger.error("Story bundle storage.update returned no bundle for %s", id);
      return reply.status(500).send({ error: "Failed to update story bundle" });
    }
    return reply.send(serializeBundle(bundle));
  });

  // ── Delete a story bundle ──
  app.delete("/:id", async (req, reply) => {
    const { id } = storyBundleIdParamsSchema.parse(req.params);
    const existing = await storage.getById(id);
    if (!existing) return reply.status(404).send({ error: "Story bundle not found" });
    await storage.remove(id);
    return reply.send({ ok: true });
  });

  // ── Export a story bundle as .marinara.json ──
  // Embeds full character, persona, and lorebook data so the exported JSON is
  // self-contained. On import, missing entities are detected and offered for
  // creation — same pattern as character → embedded lorebook.
  app.get("/:id/export", async (req, reply) => {
    const { id } = storyBundleIdParamsSchema.parse(req.params);
    const bundle = await storage.getById(id);
    if (!bundle) return reply.status(404).send({ error: "Story bundle not found" });
    const serialized = serializeBundle(bundle);

    // Fetch full data for all referenced entities
    const embeddedCharacters: Record<string, unknown>[] = [];
    for (const charId of serialized.characterIds) {
      const char = await charactersStorage.getById(charId);
      if (char) {
        const charData = JSON.parse((char as Record<string, unknown>).data as string);
        embeddedCharacters.push({
          id: charId,
          name: (char as Record<string, unknown>).name,
          data: charData,
        });
      }
    }

    const embeddedPersonas: Record<string, unknown>[] = [];
    for (const personaId of serialized.personaIds) {
      const persona = await charactersStorage.getPersona(personaId);
      if (persona) {
        embeddedPersonas.push({ id: personaId, ...(persona as Record<string, unknown>) });
      }
    }

    const embeddedLorebooks: Record<string, unknown>[] = [];
    for (const lorebookId of serialized.lorebookIds) {
      const lb = await lorebooksStorage.getById(lorebookId);
      if (lb) {
        const entries = await lorebooksStorage.listEntries(lorebookId);
        const folders = await lorebooksStorage.listFolders(lorebookId);
        embeddedLorebooks.push({
          id: lorebookId,
          lorebook: lb,
          entries,
          folders,
        });
      }
    }

    const envelope: ExportEnvelope = {
      type: "marinara_story_bundle",
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {
        name: serialized.name,
        description: serialized.description,
        characterIds: serialized.characterIds,
        personaIds: serialized.personaIds,
        lorebookIds: serialized.lorebookIds,
        embeddedCharacters,
        embeddedPersonas,
        embeddedLorebooks,
      },
    };
    return reply
      .header("Content-Type", "application/json")
      .header("Content-Disposition", `attachment; filename="${serialized.name.replace(/[^a-zA-Z0-9_\- ]/g, "_")}.marinara.json"`)
      .send(envelope);
  });
}
