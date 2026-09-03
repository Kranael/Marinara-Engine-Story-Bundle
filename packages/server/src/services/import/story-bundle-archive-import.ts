// ──────────────────────────────────────────────
// Story Bundle ZIP import — .storybundle archive unpacker + bootstrapper
// ──────────────────────────────────────────────
// Split in two layers on purpose (packing vs. DB mutation stay separate):
//   - unpackBundleArchive() only knows how to safely extract a ZIP and read
//     manifest.json — it never touches the database.
//   - unpackAndBootstrapBundle() takes that extracted directory and silently
//     inserts characters/personas/lorebooks/presets, maps isPartyMember into
//     partyCharacterIds, and creates the StoryBundle row — ready for the
//     "Who are you?" modal and DirectInject (see story-bundle-direct-inject.ts
//     on the client).
import AdmZip from "adm-zip";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readdir, readFile, rename, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, extname } from "node:path";
import type { DB } from "../../db/connection.js";
import { logger } from "../../lib/logger.js";
import { DATA_DIR } from "../../utils/data-dir.js";
import { newId } from "../../utils/id-generator.js";
import { isAllowedImageBuffer } from "../../utils/security.js";
import { GAME_ASSETS_DIR, buildAssetManifest } from "../game/asset-manifest.service.js";
import { createStoryBundlesStorage } from "../storage/story-bundles.storage.js";
import { importCharacter, importPersona, importLorebookPayload, importPreset } from "./marinara.importer.js";
import { serializeBundle } from "../../routes/story-bundles.routes.js";
import {
  BUNDLE_MANIFEST_FORMAT,
  type BundleManifest,
  type StoryBundle,
  type StoryBundleScenario,
} from "@marinara-engine/shared";

const MAX_ARCHIVE_ENTRIES = 20_000;
const MAX_EXPANDED_BYTES = 4 * 1024 * 1024 * 1024; // 4 GB — generous but bounded (zip-bomb guard)

/** Reject entries with unsafe names before anything is extracted (zip-slip guard). */
function normalizeArchiveEntryPath(rawName: string): string {
  const name = rawName.replace(/\\/g, "/");
  const parts = name.split("/");
  if (parts.some((part) => !part || part === "." || part === ".." || part.includes(":"))) {
    throw new Error(`Story bundle archive contains an unsafe path: ${rawName}`);
  }
  return parts.join("/");
}

function isSymlinkEntry(entry: AdmZip.IZipEntry): boolean {
  return ((entry.attr >>> 16) & 0o170000) === 0o120000;
}

function validateArchiveEntries(zip: AdmZip): void {
  const entries = zip.getEntries().filter((entry) => !entry.isDirectory);
  if (entries.length > MAX_ARCHIVE_ENTRIES) throw new Error("Story bundle archive contains too many files");
  let expandedBytes = 0;
  for (const entry of entries) {
    normalizeArchiveEntryPath(entry.entryName);
    if (isSymlinkEntry(entry)) throw new Error("Story bundle archive links are not allowed");
    expandedBytes += entry.header.size;
    if (expandedBytes > MAX_EXPANDED_BYTES) throw new Error("Story bundle archive is too large");
  }
}

export interface UnpackedBundleArchive {
  manifest: BundleManifest;
  extractDir: string;
  cleanup: () => Promise<void>;
}

/**
 * Safely extract a `.storybundle` ZIP to a temp directory and read only
 * manifest.json into memory. Every binary stays on disk as a real file —
 * nothing here ever base64-encodes or holds a whole archive's contents as
 * one JS value.
 */
export async function unpackBundleArchive(zipFilePath: string): Promise<UnpackedBundleArchive> {
  const zip = new AdmZip(zipFilePath);
  validateArchiveEntries(zip);

  const extractDir = await mkdtemp(join(tmpdir(), "marinara-storybundle-"));
  const cleanup = () => rm(extractDir, { recursive: true, force: true }).catch(() => {});
  try {
    await new Promise<void>((resolvePromise, reject) => {
      zip.extractAllToAsync(extractDir, true, false, (err) => (err ? reject(err) : resolvePromise()));
    });

    const manifestPath = join(extractDir, "manifest.json");
    if (!existsSync(manifestPath)) throw new Error("Story bundle archive is missing manifest.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as BundleManifest;
    if (manifest.format !== BUNDLE_MANIFEST_FORMAT) throw new Error("Not a recognized .storybundle archive");

    return { manifest, extractDir, cleanup };
  } catch (err) {
    await cleanup();
    throw err;
  }
}

/** Read one file as a base64 data URL — used only to bridge into the existing avatar/sprite/gallery restore pipeline, one small already-size-bounded file at a time (never the whole archive). */
async function fileToDataUrl(filePath: string): Promise<string | null> {
  const buffer = await readFile(filePath).catch(() => null);
  if (!buffer) return null;
  const info = isAllowedImageBuffer(buffer, extname(filePath));
  if (!info) return null;
  return `data:${info.mimeType};base64,${buffer.toString("base64")}`;
}

/** Find `<stem>.<any-ext>` in a folder (there is ever at most one avatar/cover per entity). */
async function findFileByStem(folder: string, stem: string): Promise<string | null> {
  if (!existsSync(folder)) return null;
  const entries = await readdir(folder).catch(() => [] as string[]);
  const match = entries.find((name) => name.startsWith(`${stem}.`));
  return match ? join(folder, match) : null;
}

async function spritesAsDataUrls(dir: string): Promise<Array<{ filename: string; data: string }>> {
  if (!existsSync(dir)) return [];
  const filenames = await readdir(dir).catch(() => [] as string[]);
  const sprites: Array<{ filename: string; data: string }> = [];
  for (const filename of filenames) {
    const data = await fileToDataUrl(join(dir, filename));
    if (data) sprites.push({ filename, data });
  }
  return sprites;
}

interface GalleryMetadataEntry {
  filename: string;
  prompt?: string;
  provider?: string;
  model?: string;
  width?: number;
  height?: number;
  isCharacterSheet?: boolean;
}

async function galleryAsDataUrls(dir: string): Promise<Array<Record<string, unknown>>> {
  const metadataPath = join(dir, "gallery.json");
  if (!existsSync(metadataPath)) return [];
  const metadata = JSON.parse(await readFile(metadataPath, "utf8").catch(() => "[]")) as GalleryMetadataEntry[];
  const gallery: Array<Record<string, unknown>> = [];
  for (const item of metadata) {
    const data = await fileToDataUrl(join(dir, item.filename));
    if (!data) continue;
    gallery.push({ ...item, data });
  }
  return gallery;
}

/** Copy an already-extracted file into the story-bundle image store, matching the existing upload naming convention. */
async function copyIntoStoryBundleImages(sourcePath: string, ownerId: string): Promise<string | null> {
  const buffer = await readFile(sourcePath).catch(() => null);
  if (!buffer) return null;
  const info = isAllowedImageBuffer(buffer, extname(sourcePath));
  if (!info) return null;
  const imagesDir = join(DATA_DIR, "story-bundles", "images");
  await mkdir(imagesDir, { recursive: true });
  const filename = `story-bundle-${ownerId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${info.ext}`;
  const { writeFile } = await import("node:fs/promises");
  await writeFile(join(imagesDir, filename), buffer);
  return `/api/story-bundles/images/file/${filename}`;
}

/** Recursively move every file from `src` into `dest`, preserving relative subpaths, creating folders as needed. */
async function moveDirectoryContents(src: string, dest: string): Promise<void> {
  const entries = await readdir(src, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    const from = join(src, entry.name);
    const to = join(dest, entry.name);
    if (entry.isDirectory()) {
      await mkdir(to, { recursive: true });
      await moveDirectoryContents(from, to);
    } else if (entry.isFile()) {
      await mkdir(dest, { recursive: true });
      // Never clobber an existing shared/game-installed asset with the same name.
      if (existsSync(to)) continue;
      await rename(from, to).catch(async () => {
        // Cross-device temp dirs can't rename(); fall back to copy.
        const { copyFile } = await import("node:fs/promises");
        await copyFile(from, to);
      });
    }
  }
}

export interface BootstrapBundleResult {
  bundle: StoryBundle;
}

/**
 * Unpack a `.storybundle` archive and silently bootstrap it into the local
 * library: move `/assets/**` into the engine's own game-assets directory,
 * insert every character/persona/lorebook/preset, map `isPartyMember` into
 * `partyCharacterIds`, and create the resulting StoryBundle row.
 */
export async function unpackAndBootstrapBundle(zipFilePath: string, db: DB): Promise<BootstrapBundleResult> {
  const { manifest, extractDir, cleanup } = await unpackBundleArchive(zipFilePath);
  try {
    // Crucial: physical assets land in the real library BEFORE any DB work,
    // so a game can use them the instant the bundle is created.
    const assetsDir = join(extractDir, "assets");
    if (existsSync(assetsDir) && (await stat(assetsDir)).isDirectory()) {
      await moveDirectoryContents(assetsDir, GAME_ASSETS_DIR);
      buildAssetManifest();
    }

    const characterIdMap = new Map<string, string>();
    for (const entry of manifest.characters) {
      const folder = join(extractDir, "characters", entry.id);
      const cardPath = join(folder, "card.json");
      if (!existsSync(cardPath)) continue;
      const card = JSON.parse(await readFile(cardPath, "utf8")) as {
        data: Record<string, unknown>;
        comment?: string;
      };
      const avatar = entry.hasAvatar
        ? await findFileByStem(folder, "avatar").then((p) => (p ? fileToDataUrl(p) : null))
        : null;
      const [sprites, gallery] = await Promise.all([
        spritesAsDataUrls(join(folder, "sprites")),
        galleryAsDataUrls(join(folder, "gallery")),
      ]);
      try {
        const result = await importCharacter(
          { data: card.data, metadata: { comment: card.comment }, avatar, sprites, gallery },
          db,
        );
        if (result.success && result.id) characterIdMap.set(entry.id, result.id);
      } catch (err) {
        logger.warn(err, "[story-bundle-archive] Failed to import character %s from archive", entry.id);
      }
    }

    const personaIdMap = new Map<string, string>();
    for (const personaId of manifest.personaIds) {
      const folder = join(extractDir, "personas", personaId);
      const personaJsonPath = join(folder, "persona.json");
      if (!existsSync(personaJsonPath)) continue;
      const personaRow = JSON.parse(await readFile(personaJsonPath, "utf8")) as Record<string, unknown>;
      const avatarFile = await findFileByStem(folder, "avatar");
      const [avatar, sprites, gallery] = await Promise.all([
        avatarFile ? fileToDataUrl(avatarFile) : null,
        spritesAsDataUrls(join(folder, "sprites")),
        galleryAsDataUrls(join(folder, "gallery")),
      ]);
      try {
        const result = await importPersona({ ...personaRow, avatar, sprites, gallery }, db);
        if (result.success && result.id) personaIdMap.set(personaId, result.id);
      } catch (err) {
        logger.warn(err, "[story-bundle-archive] Failed to import persona %s from archive", personaId);
      }
    }

    const lorebookIdMap = new Map<string, string>();
    for (const lorebookId of manifest.lorebookIds) {
      const filePath = join(extractDir, "lorebooks", lorebookId, "lorebook.json");
      if (!existsSync(filePath)) continue;
      try {
        const payload = JSON.parse(await readFile(filePath, "utf8"));
        const result = await importLorebookPayload(payload, db);
        if (result.success && result.id) lorebookIdMap.set(lorebookId, result.id);
      } catch (err) {
        logger.warn(err, "[story-bundle-archive] Failed to import lorebook %s from archive", lorebookId);
      }
    }

    const presetIdMap = new Map<string, string>();
    for (const presetId of manifest.presetIds) {
      const filePath = join(extractDir, "presets", presetId, "preset.json");
      if (!existsSync(filePath)) continue;
      try {
        const payload = JSON.parse(await readFile(filePath, "utf8"));
        const result = await importPreset(payload, db);
        if (result.success && result.id) presetIdMap.set(presetId, result.id);
      } catch (err) {
        logger.warn(err, "[story-bundle-archive] Failed to import preset %s from archive", presetId);
      }
    }

    // Cover + scenario images are already real files on disk — copy them
    // straight into the story-bundle image store, no base64 round-trip needed.
    let imagePath: string | null = null;
    if (manifest.hasCoverImage) {
      const coverFile = (await readdir(extractDir)).find((name) => name.startsWith("cover."));
      if (coverFile) imagePath = await copyIntoStoryBundleImages(join(extractDir, coverFile), newId());
    }

    const scenarios: StoryBundleScenario[] = [];
    for (const scenario of manifest.scenarios) {
      let scenarioImagePath: string | null = null;
      if (scenario.imageFile) {
        const src = join(extractDir, "scenarios", scenario.imageFile);
        if (existsSync(src)) scenarioImagePath = await copyIntoStoryBundleImages(src, newId());
      }
      scenarios.push({
        id: newId(),
        title: scenario.title,
        openingMessage: scenario.openingMessage,
        imagePath: scenarioImagePath,
        avatarCrop: scenario.avatarCrop ?? null,
      });
    }

    const characterIds = manifest.characters
      .map((entry) => characterIdMap.get(entry.id))
      .filter((id): id is string => !!id);
    const partyCharacterIds = manifest.characters
      .filter((entry) => entry.isPartyMember)
      .map((entry) => characterIdMap.get(entry.id))
      .filter((id): id is string => !!id);

    const bundleStorage = createStoryBundlesStorage(db);
    const created = await bundleStorage.create({
      name: manifest.name,
      description: manifest.description,
      imagePath,
      avatarCrop: manifest.avatarCrop,
      comment: manifest.comment,
      creator: manifest.creator,
      version: manifest.bundleVersion,
      tags: manifest.tags,
      characterIds,
      personaIds: Array.from(personaIdMap.values()),
      lorebookIds: Array.from(lorebookIdMap.values()),
      presetIds: Array.from(presetIdMap.values()),
      agentIds: manifest.agents.map((agent) => agent.id),
      scenarios,
      partyCharacterIds,
      gameConfig: manifest.gameConfig,
      gameAssetSelection: manifest.assetSelection,
    });
    if (!created) throw new Error("Failed to create the imported story bundle");

    return { bundle: serializeBundle(created as unknown as Record<string, unknown>) };
  } finally {
    await cleanup();
  }
}
