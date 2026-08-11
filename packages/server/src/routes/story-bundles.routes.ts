// ──────────────────────────────────────────────
// Routes: Story Bundles
// ──────────────────────────────────────────────
import type { FastifyInstance } from "fastify";
import {
  createStoryBundleSchema,
  storyBundleIdParamsSchema,
  updateStoryBundleSchema,
} from "@marinara-engine/shared";
import type { ExportEnvelope, StoryBundle, StoryBundleIntro } from "@marinara-engine/shared";
import { createStoryBundlesStorage } from "../services/storage/story-bundles.storage.js";
import { createCharactersStorage } from "../services/storage/characters.storage.js";
import { createCharacterGalleryStorage } from "../services/storage/character-gallery.storage.js";
import { createLorebooksStorage } from "../services/storage/lorebooks.storage.js";
import { createPromptsStorage } from "../services/storage/prompts.storage.js";
import { logger } from "../lib/logger.js";
import {
  readAvatarDataUrl,
  readGalleryForCharacter,
  readSpritesForId,
} from "../services/export/export-image-helpers.js";

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

/** Parse a JSON text column into a typed intro array. */
function parseIntroArray(value: unknown): StoryBundleIntro[] {
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter(
          (entry): entry is StoryBundleIntro =>
            typeof entry === "object" &&
            entry !== null &&
            typeof entry.id === "string" &&
            typeof entry.name === "string" &&
            typeof entry.text === "string",
        )
      : [];
  } catch {
    return [];
  }
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
    presetIds: parseJsonArray(row.presetIds),
    intros: parseIntroArray(row.intros),
    createdAt: row.createdAt as string,
    updatedAt: row.updatedAt as string,
  };
}

export async function storyBundlesRoutes(app: FastifyInstance) {
  const storage = createStoryBundlesStorage(app.db);
  const charactersStorage = createCharactersStorage(app.db);
  const characterGalleryStorage = createCharacterGalleryStorage(app.db);
  const lorebooksStorage = createLorebooksStorage(app.db);
  const promptsStorage = createPromptsStorage(app.db);

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

    // Fetch full data for all referenced entities, including binary assets
    // (avatars, sprites, gallery) as base64 so the export is truly
    // self-contained for PC-to-PC transfer.
    const embeddedCharacters: Record<string, unknown>[] = [];
    for (const charId of serialized.characterIds) {
      const char = await charactersStorage.getById(charId);
      if (char) {
        const charRow = char as Record<string, unknown>;
        const charData = JSON.parse(charRow.data as string);
        const [avatar, sprites, gallery] = await Promise.all([
          readAvatarDataUrl(charRow.avatarPath as string | null | undefined),
          readSpritesForId(charId),
          readGalleryForCharacter(charId, characterGalleryStorage),
        ]);
        embeddedCharacters.push({
          id: charId,
          name: charRow.name,
          data: charData,
          ...(avatar ? { avatar } : {}),
          ...(sprites.length > 0 ? { sprites } : {}),
          ...(gallery.length > 0 ? { gallery } : {}),
        });
      }
    }

    const embeddedPersonas: Record<string, unknown>[] = [];
    for (const personaId of serialized.personaIds) {
      const persona = await charactersStorage.getPersona(personaId);
      if (persona) {
        const personaRow = persona as Record<string, unknown>;
        const [avatar, sprites] = await Promise.all([
          readAvatarDataUrl(personaRow.avatarPath as string | null | undefined),
          readSpritesForId(personaId),
        ]);
        embeddedPersonas.push({
          ...personaRow,
          ...(avatar ? { avatar } : {}),
          ...(sprites.length > 0 ? { sprites } : {}),
        });
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

    const embeddedPresets: Record<string, unknown>[] = [];
    for (const presetId of serialized.presetIds) {
      const preset = await promptsStorage.getById(presetId);
      if (preset) {
        const sections = await promptsStorage.listSections(presetId);
        const groups = await promptsStorage.listGroups(presetId);
        const choiceBlocks = await promptsStorage.listChoiceBlocksForPreset(presetId);
        embeddedPresets.push({
          id: presetId,
          preset,
          sections,
          groups,
          choiceBlocks,
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
        presetIds: serialized.presetIds,
        intros: serialized.intros,
        embeddedCharacters,
        embeddedPersonas,
        embeddedLorebooks,
        embeddedPresets,
      },
    };
    return reply
      .header("Content-Type", "application/json")
      .header("Content-Disposition", `attachment; filename="${serialized.name.replace(/[^a-zA-Z0-9_\- ]/g, "_")}.marinara.json"`)
      .send(envelope);
  });
}
