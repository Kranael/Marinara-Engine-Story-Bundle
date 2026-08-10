// ──────────────────────────────────────────────
// Shared Export Image Helpers
// ──────────────────────────────────────────────
// Extracted from characters.routes.ts so both character/persona export and
// story-bundle export can embed binary data (avatars, sprites, gallery shots)
// as base64 data URLs in the JSON envelope.
import { readFile, readdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { extname } from "path";
import { DATA_DIR } from "../../utils/data-dir.js";
import { assertInsideDir, isAllowedImageBuffer } from "../../utils/security.js";
import { resolveStoredGalleryFile } from "../image/gallery-file-lifecycle.js";

/**
 * Read an image file and return it as a base64 data URL, or null if the file
 * is missing, outside the expected dir, or not a recognized image type.
 */
export async function readImageAsDataUrl(rootDir: string, filename: string): Promise<string | null> {
  if (!filename || filename.includes("..") || filename.includes("/") || filename.includes("\\")) return null;
  let filepath: string;
  try {
    filepath = assertInsideDir(rootDir, join(rootDir, filename));
  } catch {
    return null;
  }
  if (!existsSync(filepath)) return null;
  try {
    const buf = await readFile(filepath);
    const info = isAllowedImageBuffer(buf, extname(filename));
    if (!info) return null;
    return `data:${info.mimeType};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

/**
 * Pull the avatar off disk for the persona/character row's avatarPath
 * (format: /api/avatars/file/<filename>). Returns null if missing/invalid.
 */
export async function readAvatarDataUrl(avatarPath: string | null | undefined): Promise<string | null> {
  if (!avatarPath || typeof avatarPath !== "string") return null;
  const filename = avatarPath.split("?")[0]!.split("/").pop();
  if (!filename) return null;
  return readImageAsDataUrl(join(DATA_DIR, "avatars"), filename);
}

/**
 * Read every sprite file in data/sprites/<id>/ and return it as
 * { filename, data } so import can restore the same expression set under a
 * new id.
 */
export async function readSpritesForId(id: string): Promise<Array<{ filename: string; data: string }>> {
  const dir = join(DATA_DIR, "sprites", id);
  if (!existsSync(dir)) return [];
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return [];
  }
  const sprites: Array<{ filename: string; data: string }> = [];
  for (const entry of entries) {
    const dataUrl = await readImageAsDataUrl(dir, entry);
    if (dataUrl) sprites.push({ filename: entry, data: dataUrl });
  }
  return sprites;
}

/**
 * Read every gallery image for a character (metadata row + binary on disk),
 * returning a serializable list that import can rebuild the gallery from.
 */
export async function readGalleryForCharacter(
  characterId: string,
  galleryStorage: { listByCharacterId: (id: string) => Promise<any[]> },
): Promise<Array<Record<string, unknown>>> {
  const images = await galleryStorage.listByCharacterId(characterId);
  const result: Array<Record<string, unknown>> = [];
  for (const img of images) {
    const relPath: string = typeof img.filePath === "string" ? img.filePath : "";
    const storedFile = relPath ? resolveStoredGalleryFile(relPath) : null;
    if (!storedFile) continue;
    const dataUrl = await readImageAsDataUrl(storedFile.directory, storedFile.filename);
    if (!dataUrl) continue;
    result.push({
      filename: storedFile.filename,
      data: dataUrl,
      prompt: img.prompt ?? "",
      provider: img.provider ?? "",
      model: img.model ?? "",
      width: img.width ?? null,
      height: img.height ?? null,
    });
  }
  return result;
}
