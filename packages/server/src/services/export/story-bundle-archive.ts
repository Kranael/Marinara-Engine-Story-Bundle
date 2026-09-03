// ──────────────────────────────────────────────
// Story Bundle ZIP export — .storybundle archive builder
// ──────────────────────────────────────────────
// Packs a Story Bundle into a maximally-compressed ZIP with every binary
// (avatars, sprites, gallery images) as a raw archive entry — no base64, no
// single combined JSON blob. See BundleManifest (shared) for the layout:
//
//   manifest.json                 — metadata, game config, isPartyMember flags
//   cover.<ext>                   — optional bundle picture
//   characters/<id>/card.json     — character card data (text)
//   characters/<id>/avatar.<ext>  — optional
//   characters/<id>/sprites/*     — optional
//   characters/<id>/gallery/*     — optional images + gallery.json metadata
//   personas/<id>/persona.json, avatar.<ext>, sprites/*, gallery/*
//   lorebooks/<id>/lorebook.json  — { lorebook, entries, folders }
//   presets/<id>/preset.json      — { preset, sections, groups, choiceBlocks }
//   scenarios/<id>.<ext>          — optional scenario images
//
// Split in two layers on purpose (packing vs. DB mutation stay separate):
//   - gatherBundleArchiveSources() is the only part that touches the DB or
//     filesystem; it returns a plain description of what to zip.
//   - packBundleArchive() only knows how to stream that description into a
//     ZIP — it has no idea what a "character" or "lorebook" is.
import archiver from "archiver";
import { createReadStream, existsSync } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { join, extname } from "node:path";
import type { Writable } from "node:stream";
import type { DB } from "../../db/connection.js";
import { DATA_DIR } from "../../utils/data-dir.js";
import { createStoryBundlesStorage } from "../storage/story-bundles.storage.js";
import { createCharactersStorage } from "../storage/characters.storage.js";
import { createCharacterGalleryStorage } from "../storage/character-gallery.storage.js";
import { createPersonaGalleryStorage } from "../storage/persona-gallery.storage.js";
import { createLorebooksStorage } from "../storage/lorebooks.storage.js";
import { createPromptsStorage } from "../storage/prompts.storage.js";
import { createAgentsStorage } from "../storage/agents.storage.js";
import { resolveStoredGalleryFile } from "../image/gallery-file-lifecycle.js";
import { optimizeArchiveImages } from "./story-bundle-asset-optimizer.js";
import { serializeBundle } from "../../routes/story-bundles.routes.js";
import {
  BUNDLE_MANIFEST_FORMAT,
  BUNDLE_MANIFEST_VERSION,
  BUILT_IN_AGENT_MANIFESTS,
  type BundleManifest,
  type BundleManifestCharacter,
  type BundleManifestScenario,
} from "@marinara-engine/shared";

/**
 * One binary file copied into the archive verbatim (STORE — no benefit
 * re-deflating an already-compressed image/audio file). Either a real file on
 * disk, or an in-memory buffer (e.g. a WebP re-encode from the asset
 * optimizer — see story-bundle-asset-optimizer.ts) — never both.
 */
export interface ArchiveFileEntry {
  zipPath: string;
  diskPath?: string;
  buffer?: Buffer;
}

/** One small text/JSON payload, DEFLATEd at max compression. */
interface ArchiveTextEntry {
  zipPath: string;
  content: string;
}

/** The plain, DB-agnostic description packBundleArchive() turns into a ZIP stream. */
export interface BundleArchiveSources {
  manifest: BundleManifest;
  files: ArchiveFileEntry[];
  texts: ArchiveTextEntry[];
}

function safeJsonRecord(raw: unknown): Record<string, unknown> {
  const value = typeof raw === "string" ? safeJsonParse(raw) : raw;
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function safeJsonParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function listDirectoryFiles(dir: string): Promise<string[]> {
  if (!existsSync(dir)) return [];
  const entries = await readdir(dir).catch(() => [] as string[]);
  const files: string[] = [];
  for (const entry of entries) {
    const stats = await stat(join(dir, entry)).catch(() => null);
    if (stats?.isFile()) files.push(entry);
  }
  return files;
}

/** Resolve a served `/api/.../file/<name>` (or similar) URL down to its on-disk path under `root`. */
function resolveServedFile(servedUrl: string, root: string): string | null {
  const filename = servedUrl.split("?")[0]?.split("/").pop();
  if (!filename) return null;
  const diskPath = join(root, filename);
  return existsSync(diskPath) ? diskPath : null;
}

interface OwnerGalleryResult {
  files: ArchiveFileEntry[];
  metadataJson: string | null;
}

async function gatherOwnerGallery(
  zipFolder: string,
  galleryRows: ReadonlyArray<Record<string, unknown>>,
  characterSheetImageId: string | null,
): Promise<OwnerGalleryResult> {
  const files: ArchiveFileEntry[] = [];
  const metadata: Array<Record<string, unknown>> = [];
  for (const image of galleryRows) {
    const resolved = resolveStoredGalleryFile(String(image.filePath ?? ""));
    if (!resolved || !existsSync(resolved.absolutePath)) continue;
    files.push({ zipPath: `${zipFolder}/${resolved.filename}`, diskPath: resolved.absolutePath });
    metadata.push({
      filename: resolved.filename,
      prompt: image.prompt ?? "",
      provider: image.provider ?? "",
      model: image.model ?? "",
      width: image.width,
      height: image.height,
      isCharacterSheet: characterSheetImageId != null && image.id === characterSheetImageId,
    });
  }
  return { files, metadataJson: metadata.length > 0 ? JSON.stringify(metadata) : null };
}

/**
 * Read every entity a Story Bundle references and describe what its archive
 * needs — the only function in this module that touches storage/disk.
 */
export async function gatherBundleArchiveSources(bundleId: string, db: DB): Promise<BundleArchiveSources | null> {
  const bundleStorage = createStoryBundlesStorage(db);
  const charactersStorage = createCharactersStorage(db);
  const characterGalleryStorage = createCharacterGalleryStorage(db);
  const personaGalleryStorage = createPersonaGalleryStorage(db);
  const lorebooksStorage = createLorebooksStorage(db);
  const promptsStorage = createPromptsStorage(db);
  const agentsStorage = createAgentsStorage(db);

  const row = await bundleStorage.getById(bundleId);
  if (!row) return null;
  const bundle = serializeBundle(row);

  const files: ArchiveFileEntry[] = [];
  const texts: ArchiveTextEntry[] = [];

  // ── Cover image ──
  let hasCoverImage = false;
  if (bundle.imagePath) {
    const diskPath = resolveServedFile(bundle.imagePath, join(DATA_DIR, "story-bundles", "images"));
    if (diskPath) {
      files.push({ zipPath: `cover${extname(diskPath)}`, diskPath });
      hasCoverImage = true;
    }
  }

  // ── Characters ──
  const partyIds = new Set(bundle.partyCharacterIds);
  const manifestCharacters: BundleManifestCharacter[] = [];
  for (const charId of bundle.characterIds) {
    const char = (await charactersStorage.getById(charId)) as Record<string, unknown> | null;
    if (!char) continue;
    const charData = safeJsonRecord(char.data);
    texts.push({
      zipPath: `characters/${charId}/card.json`,
      content: JSON.stringify({ data: charData, comment: char.comment ?? "" }),
    });

    let hasAvatar = false;
    const avatarPath = char.avatarPath as string | null | undefined;
    if (avatarPath) {
      const diskPath = resolveServedFile(avatarPath, join(DATA_DIR, "avatars"));
      if (diskPath) {
        files.push({ zipPath: `characters/${charId}/avatar${extname(diskPath)}`, diskPath });
        hasAvatar = true;
      }
    }

    for (const filename of await listDirectoryFiles(join(DATA_DIR, "sprites", charId))) {
      files.push({
        zipPath: `characters/${charId}/sprites/${filename}`,
        diskPath: join(DATA_DIR, "sprites", charId, filename),
      });
    }

    const extensions = safeJsonRecord(charData.extensions);
    const characterSheetImageId =
      typeof extensions.characterSheetImageId === "string" ? extensions.characterSheetImageId : null;
    const galleryRows = (await characterGalleryStorage.listByCharacterId(charId)) as Array<Record<string, unknown>>;
    const gallery = await gatherOwnerGallery(`characters/${charId}/gallery`, galleryRows, characterSheetImageId);
    files.push(...gallery.files);
    if (gallery.metadataJson)
      texts.push({ zipPath: `characters/${charId}/gallery/gallery.json`, content: gallery.metadataJson });

    manifestCharacters.push({ id: charId, isPartyMember: partyIds.has(charId), hasAvatar });
  }

  // ── Personas ──
  for (const personaId of bundle.personaIds) {
    const persona = (await charactersStorage.getPersona(personaId)) as Record<string, unknown> | null;
    if (!persona) continue;
    texts.push({ zipPath: `personas/${personaId}/persona.json`, content: JSON.stringify(persona) });

    let hasAvatar = false;
    const avatarPath = persona.avatarPath as string | null | undefined;
    if (avatarPath) {
      const diskPath = resolveServedFile(avatarPath, join(DATA_DIR, "avatars"));
      if (diskPath) {
        files.push({ zipPath: `personas/${personaId}/avatar${extname(diskPath)}`, diskPath });
        hasAvatar = true;
      }
    }
    void hasAvatar; // personas.json in the manifest only needs the id; hasAvatar is inferred on import from file presence

    for (const filename of await listDirectoryFiles(join(DATA_DIR, "sprites", personaId))) {
      files.push({
        zipPath: `personas/${personaId}/sprites/${filename}`,
        diskPath: join(DATA_DIR, "sprites", personaId, filename),
      });
    }

    const characterSheetImageId =
      typeof persona.characterSheetImageId === "string" ? persona.characterSheetImageId : null;
    const galleryRows = (await personaGalleryStorage.listByPersonaId(personaId)) as Array<Record<string, unknown>>;
    const gallery = await gatherOwnerGallery(`personas/${personaId}/gallery`, galleryRows, characterSheetImageId);
    files.push(...gallery.files);
    if (gallery.metadataJson)
      texts.push({ zipPath: `personas/${personaId}/gallery/gallery.json`, content: gallery.metadataJson });
  }

  // ── Lorebooks ──
  for (const lorebookId of bundle.lorebookIds) {
    const lorebook = await lorebooksStorage.getById(lorebookId);
    if (!lorebook) continue;
    const [entries, folders] = await Promise.all([
      lorebooksStorage.listEntries(lorebookId),
      lorebooksStorage.listFolders(lorebookId),
    ]);
    texts.push({
      zipPath: `lorebooks/${lorebookId}/lorebook.json`,
      content: JSON.stringify({ lorebook, entries, folders }),
    });
  }

  // ── Presets ──
  for (const presetId of bundle.presetIds) {
    const preset = await promptsStorage.getById(presetId);
    if (!preset) continue;
    const [sections, groups, choiceBlocks] = await Promise.all([
      promptsStorage.listSections(presetId),
      promptsStorage.listGroups(presetId),
      promptsStorage.listChoiceBlocksForPreset(presetId),
    ]);
    texts.push({
      zipPath: `presets/${presetId}/preset.json`,
      content: JSON.stringify({ preset, sections, groups, choiceBlocks }),
    });
  }

  // ── Agents (referenced by id only — agents ship via capability packages, never embedded) ──
  const agentConfigs = bundle.agentIds.length > 0 ? await agentsStorage.list() : [];
  const configNameByType = new Map<string, string>();
  for (const config of agentConfigs as Array<Record<string, unknown>>) {
    if (typeof config.type === "string" && typeof config.name === "string" && config.name.trim()) {
      configNameByType.set(config.type, config.name.trim());
    }
  }
  const manifestAgents = bundle.agentIds.map((agentId) => ({
    id: agentId,
    name: BUILT_IN_AGENT_MANIFESTS.find((m) => m.id === agentId)?.name ?? configNameByType.get(agentId) ?? agentId,
  }));

  // ── Scenarios (opening message stays in the manifest as text; the picture, if any, is a sibling file) ──
  const manifestScenarios: BundleManifestScenario[] = [];
  for (const scenario of bundle.scenarios) {
    let imageFile: string | null = null;
    if (scenario.imagePath) {
      const diskPath = resolveServedFile(scenario.imagePath, join(DATA_DIR, "story-bundles", "images"));
      if (diskPath) {
        imageFile = `${scenario.id}${extname(diskPath)}`;
        files.push({ zipPath: `scenarios/${imageFile}`, diskPath });
      }
    }
    manifestScenarios.push({
      id: scenario.id,
      title: scenario.title,
      openingMessage: scenario.openingMessage,
      imageFile,
      avatarCrop: scenario.avatarCrop ?? null,
    });
  }

  const manifest: BundleManifest = {
    format: BUNDLE_MANIFEST_FORMAT,
    version: BUNDLE_MANIFEST_VERSION,
    exportedAt: new Date().toISOString(),
    name: bundle.name,
    description: bundle.description,
    hasCoverImage,
    avatarCrop: bundle.avatarCrop ?? null,
    comment: bundle.comment,
    creator: bundle.creator,
    bundleVersion: bundle.version,
    tags: bundle.tags,
    characters: manifestCharacters,
    personaIds: bundle.personaIds,
    lorebookIds: bundle.lorebookIds,
    presetIds: bundle.presetIds,
    agents: manifestAgents,
    scenarios: manifestScenarios,
    gameConfig: bundle.gameConfig,
    assetSelection: bundle.gameAssetSelection,
  };

  return { manifest, files, texts };
}

/**
 * Stream a gathered bundle description into a ZIP at maximum compression.
 * Binary files are STOREd verbatim (deflating an already-compressed image or
 * audio file wastes CPU for near-zero size benefit); text/JSON entries are
 * DEFLATEd at level 9. Never touches the database — pure archive packing.
 */
export function packBundleArchive(sources: BundleArchiveSources, destination: Writable): Promise<void> {
  return new Promise((resolve, reject) => {
    const archive = archiver("zip", { zlib: { level: 9 } });
    let settled = false;
    const fail = (err: unknown) => {
      if (settled) return;
      settled = true;
      reject(err instanceof Error ? err : new Error(String(err)));
    };
    archive.on("warning", (err) => {
      if ((err as { code?: string }).code !== "ENOENT") fail(err);
    });
    archive.on("error", fail);
    destination.on("error", fail);
    destination.on("close", () => {
      if (!settled) {
        settled = true;
        resolve();
      }
    });
    archive.pipe(destination);

    archive.append(JSON.stringify(sources.manifest, null, 2), { name: "manifest.json" });
    for (const text of sources.texts) archive.append(text.content, { name: text.zipPath });
    for (const file of sources.files) {
      const content = file.buffer ?? (file.diskPath ? createReadStream(file.diskPath) : null);
      if (content) archive.append(content, { name: file.zipPath, store: true });
    }

    archive.finalize().catch(fail);
  });
}

/** Gather + optimize + pack in one call — the export route's entry point. */
export async function buildBundleArchive(bundleId: string, db: DB, destination: Writable): Promise<boolean> {
  const sources = await gatherBundleArchiveSources(bundleId, db);
  if (!sources) return false;
  sources.files = await optimizeArchiveImages(sources.files);
  await packBundleArchive(sources, destination);
  return true;
}
