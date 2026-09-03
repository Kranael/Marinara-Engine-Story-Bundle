// ──────────────────────────────────────────────
// Routes: Story Bundles
// ──────────────────────────────────────────────
import type { FastifyInstance } from "fastify";
import { createWriteStream, existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import { pipeline } from "node:stream/promises";
import { createStoryBundleSchema, storyBundleIdParamsSchema, updateStoryBundleSchema } from "@marinara-engine/shared";
import type { StoryBundle, StoryBundleScenario } from "@marinara-engine/shared";
import { createStoryBundlesStorage } from "../services/storage/story-bundles.storage.js";
import { logger } from "../lib/logger.js";
import { DATA_DIR } from "../utils/data-dir.js";
import { assertInsideDir, extensionFromImageMime, isAllowedImageBuffer } from "../utils/security.js";
import { buildBundleArchive } from "../services/export/story-bundle-archive.js";
import { unpackAndBootstrapBundle } from "../services/import/story-bundle-archive-import.js";

const STORY_BUNDLE_IMAGES_DIR = join(DATA_DIR, "story-bundles", "images");

function parseImageUpload(image: string): { buffer: Buffer; hintedExt: string } {
  let base64 = image;
  let hintedExt = "png";
  if (base64.startsWith("data:")) {
    const match = base64.match(/^data:image\/([\w.+-]+);base64,/i);
    if (match?.[1]) {
      hintedExt = match[1].replace("+xml", "");
      base64 = base64.slice(base64.indexOf(",") + 1);
    }
  }
  return { buffer: Buffer.from(base64, "base64"), hintedExt };
}

function getSafeStoryBundleImagePath(filename: string): string | null {
  if (!filename || filename.includes("..") || filename.includes("/") || filename.includes("\\")) return null;
  try {
    return assertInsideDir(STORY_BUNDLE_IMAGES_DIR, join(STORY_BUNDLE_IMAGES_DIR, filename));
  } catch {
    return null;
  }
}

/** Parse a JSON text column into a string array. */
function parseJsonArray(value: unknown): string[] {
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === "string") : [];
  } catch {
    return [];
  }
}

/** Parse a JSON text column into a typed scenario array. */
function parseScenarioArray(value: unknown): StoryBundleScenario[] {
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter(
          (entry): entry is StoryBundleScenario =>
            typeof entry === "object" &&
            entry !== null &&
            typeof entry.id === "string" &&
            typeof entry.title === "string" &&
            typeof entry.openingMessage === "string",
        )
      : [];
  } catch {
    return [];
  }
}

/** Parse a JSON text column into an object or null. */
function parseJsonObject(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "string") return null;
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Parse the JSON columns into typed arrays for the API response. */
export function serializeBundle(row: Record<string, unknown>): StoryBundle {
  return {
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string) ?? null,
    imagePath: (row.imagePath as string) ?? null,
    avatarCrop: parseJsonObject(row.avatarCrop) as StoryBundle["avatarCrop"],
    comment: (row.comment as string) ?? "",
    creator: (row.creator as string) ?? "",
    version: (row.version as string) ?? "",
    tags: parseJsonArray(row.tags),
    characterIds: parseJsonArray(row.characterIds),
    personaIds: parseJsonArray(row.personaIds),
    lorebookIds: parseJsonArray(row.lorebookIds),
    presetIds: parseJsonArray(row.presetIds),
    agentIds: parseJsonArray(row.agentIds),
    scenarios: parseScenarioArray(row.scenarios),
    partyCharacterIds: parseJsonArray(row.partyCharacterIds),
    gameConfig: parseJsonObject(row.gameConfig) as StoryBundle["gameConfig"],
    gameAssetSelection: parseJsonObject(row.gameAssetSelection) as StoryBundle["gameAssetSelection"],
    createdAt: row.createdAt as string,
    updatedAt: row.updatedAt as string,
  };
}

export async function storyBundlesRoutes(app: FastifyInstance) {
  const storage = createStoryBundlesStorage(app.db);

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

  // ── Upload a story bundle image ──
  app.post<{ Params: { id: string } }>("/:id/image", async (req, reply) => {
    const bundle = await storage.getById(req.params.id);
    if (!bundle) return reply.status(404).send({ error: "Story bundle not found" });

    const body = req.body as { image?: string };
    if (!body.image) return reply.status(400).send({ error: "No image data provided" });

    const { buffer, hintedExt } = parseImageUpload(body.image);
    const imageInfo = isAllowedImageBuffer(buffer, `.${hintedExt}`);
    if (!imageInfo) return reply.status(400).send({ error: "Unsupported or invalid story bundle image" });

    const ext = extensionFromImageMime(imageInfo.mimeType);
    await mkdir(STORY_BUNDLE_IMAGES_DIR, { recursive: true });
    const filename = `story-bundle-${req.params.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const filepath = assertInsideDir(STORY_BUNDLE_IMAGES_DIR, join(STORY_BUNDLE_IMAGES_DIR, filename));
    await writeFile(filepath, buffer);

    const updated = await storage.update(req.params.id, { imagePath: `/api/story-bundles/images/file/${filename}` });
    if (!updated) return reply.status(404).send({ error: "Story bundle not found" });
    return reply.send(serializeBundle(updated));
  });

  // ── Remove a story bundle image ──
  app.delete<{ Params: { id: string } }>("/:id/image", async (req, reply) => {
    const bundle = await storage.getById(req.params.id);
    if (!bundle) return reply.status(404).send({ error: "Story bundle not found" });

    const existingPath = (bundle.imagePath as string) ?? null;
    if (existingPath) {
      const filename = existingPath.split("?")[0]!.split("/").pop() ?? "";
      const filepath = getSafeStoryBundleImagePath(filename);
      if (filepath && existsSync(filepath)) {
        try {
          await unlink(filepath);
        } catch (error) {
          logger.warn("Failed to delete story bundle image file %s: %s", filepath, error);
        }
      }
    }

    const updated = await storage.update(req.params.id, { imagePath: null, avatarCrop: null });
    if (!updated) return reply.status(404).send({ error: "Story bundle not found" });
    return reply.send(serializeBundle(updated));
  });

  // ── Serve a story bundle image file ──
  app.get<{ Params: { filename: string } }>("/images/file/:filename", async (req, reply) => {
    const filepath = getSafeStoryBundleImagePath(req.params.filename);
    if (!filepath || !existsSync(filepath)) return reply.status(404).send({ error: "Image not found" });

    const buffer = await readFile(filepath);
    const imageInfo = isAllowedImageBuffer(buffer, extname(req.params.filename));
    if (!imageInfo) return reply.status(404).send({ error: "Image not found" });

    return reply
      .header("Content-Type", imageInfo.mimeType)
      .header("Cache-Control", "public, max-age=31536000, immutable")
      .send(buffer);
  });

  // ── Export a story bundle as a maximally-compressed .storybundle ZIP ──
  // Every binary (avatars, sprites, gallery images) is a raw archive entry —
  // no base64, no single combined JSON. See services/export/story-bundle-archive.ts.
  app.get("/:id/export", async (req, reply) => {
    const { id } = storyBundleIdParamsSchema.parse(req.params);
    const bundleRow = await storage.getById(id);
    if (!bundleRow) return reply.status(404).send({ error: "Story bundle not found" });
    const name = serializeBundle(bundleRow).name;

    reply.hijack();
    reply.raw.writeHead(200, {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${name.replace(/[^a-zA-Z0-9_\- ]/g, "_")}.storybundle"`,
    });
    try {
      await buildBundleArchive(id, app.db, reply.raw);
    } catch (err) {
      logger.error(err, "[story-bundles/export] Failed to build .storybundle archive");
      if (!reply.raw.writableEnded) reply.raw.destroy();
    }
  });

  // ── Import a .storybundle ZIP (multipart upload) ──
  // Streams the upload straight to a temp file (never buffered as one JS
  // string/value), then unpacks + bootstraps it. See
  // services/import/story-bundle-archive-import.ts.
  app.post("/import-archive", async (req, reply) => {
    const uploadDir = await mkdtemp(join(tmpdir(), "marinara-storybundle-upload-"));
    const archivePath = join(uploadDir, "bundle.storybundle");
    try {
      const file = await req.file();
      if (!file) return reply.status(400).send({ error: "No .storybundle file uploaded" });
      const fileStream = file.file as typeof file.file & { truncated?: boolean };
      await pipeline(fileStream, createWriteStream(archivePath));
      if (fileStream.truncated) return reply.status(413).send({ error: "Story bundle archive upload was truncated" });

      const { bundle } = await unpackAndBootstrapBundle(archivePath, app.db);
      return reply.status(201).send(bundle);
    } catch (err) {
      logger.error(err, "[story-bundles/import-archive] Failed to import .storybundle archive");
      return reply.status(400).send({ error: err instanceof Error ? err.message : "Failed to import story bundle" });
    } finally {
      await rm(uploadDir, { recursive: true, force: true }).catch(() => {});
    }
  });
}
