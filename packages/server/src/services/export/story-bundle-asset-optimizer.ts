// ──────────────────────────────────────────────
// Story Bundle export — asset optimization pipeline
// ──────────────────────────────────────────────
// Runs BEFORE packBundleArchive(): re-encodes eligible raster images
// (avatars, sprites, gallery images, cover/scenario pictures — anything
// gathered as a plain PNG/JPG ArchiveFileEntry) to WebP at quality 80,
// which is what actually shrinks a multi-hundred-MB export. Import needs no
// changes: entities are located by filename stem (see findFileByStem in
// story-bundle-archive-import.ts), so swapping .png/.jpg for .webp here is
// transparent on the read side.
//
// Story bundles don't embed raw game-asset audio today (music/ambience/SFX
// stay referenced by folder scope in BundleManifest.assetSelection, not
// shipped as files), so there is nothing to transcode yet. warnIfAudioTooLarge
// is exported as the validation half of that future path.
import { stat } from "node:fs/promises";
import { extname } from "node:path";
import { logger } from "../../lib/logger.js";
import { getSharp } from "../../utils/sharp.js";
import { settleAgentJobsWithConcurrencyLimit } from "../agents/agent-concurrency.js";
import type { ArchiveFileEntry } from "./story-bundle-archive.js";

const WEBP_QUALITY = 80;
const OPTIMIZABLE_IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg"]);
const AUDIO_WARN_BYTES = 5 * 1024 * 1024;
// sharp's encode runs on libuv's threadpool (native libvips code), so it never blocks the
// event loop — the cap here is about bounding peak memory/CPU for bundles with 100+ images,
// not about "freezing a UI thread" (there is none server-side).
const MAX_CONCURRENT_CONVERSIONS = 4;

function isOptimizableImage(zipPath: string): boolean {
  return OPTIMIZABLE_IMAGE_EXTENSIONS.has(extname(zipPath).toLowerCase());
}

/**
 * Re-encode one PNG/JPG file to WebP. Returns null (never throws) on any
 * failure, or when the WebP result isn't actually smaller than the source —
 * the caller falls back to shipping the original file untouched either way.
 */
async function toWebpIfSmaller(diskPath: string): Promise<Buffer | null> {
  const sharp = await getSharp();
  if (!sharp) return null;
  try {
    const [webp, original] = await Promise.all([
      sharp(diskPath, { limitInputPixels: false }).webp({ quality: WEBP_QUALITY }).toBuffer(),
      stat(diskPath),
    ]);
    return webp.length < original.size ? webp : null;
  } catch (error) {
    logger.warn(error, "[story-bundle-export] Failed to re-encode %s to WebP; shipping the original file", diskPath);
    return null;
  }
}

/**
 * Re-encode every eligible PNG/JPG archive entry to WebP (quality 80) in
 * parallel, bounded so a bundle with hundreds of images can't spike memory.
 * Entries that aren't raster images, that sharp can't improve, or where
 * sharp isn't available on this platform pass through unchanged.
 */
export async function optimizeArchiveImages(files: ArchiveFileEntry[]): Promise<ArchiveFileEntry[]> {
  const candidateIndices = files
    .map((_file, index) => index)
    .filter((index) => files[index]!.diskPath && isOptimizableImage(files[index]!.zipPath));
  if (candidateIndices.length === 0) return files;

  const settled = await settleAgentJobsWithConcurrencyLimit(
    candidateIndices,
    MAX_CONCURRENT_CONVERSIONS,
    async (index) => {
      const file = files[index]!;
      const webp = await toWebpIfSmaller(file.diskPath!);
      return webp ? { zipPath: file.zipPath.replace(/\.(png|jpe?g)$/i, ".webp"), buffer: webp } : file;
    },
  );

  const result = [...files];
  settled.forEach((outcome, i) => {
    const index = candidateIndices[i]!;
    if (outcome.status === "fulfilled") {
      result[index] = outcome.value;
    } else {
      logger.warn(outcome.reason, "[story-bundle-export] WebP conversion job failed; shipping the original file");
    }
  });
  return result;
}

/**
 * Validation half of the audio-downsampling spec: warns (does not throw —
 * export should never fail over an oversized asset) when an audio file
 * exceeds `maxBytes`. Not currently wired into buildBundleArchive() because
 * no export path embeds raw audio yet; call this from whatever gathers audio
 * files once one does.
 */
export async function warnIfAudioTooLarge(diskPath: string, maxBytes = AUDIO_WARN_BYTES): Promise<boolean> {
  const stats = await stat(diskPath).catch(() => null);
  if (!stats) return false;
  const oversized = stats.size > maxBytes;
  if (oversized) {
    logger.warn(
      "[story-bundle-export] Audio asset %s is %dMB, over the %dMB guideline; consider downsampling (e.g. lower MP3 bitrate or WAV\u2192OGG) before bundling",
      diskPath,
      Math.round(stats.size / 1024 / 1024),
      Math.round(maxBytes / 1024 / 1024),
    );
  }
  return oversized;
}
