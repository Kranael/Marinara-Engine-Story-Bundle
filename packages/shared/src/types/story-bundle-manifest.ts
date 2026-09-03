// ──────────────────────────────────────────────
// Story Bundle ZIP manifest (.storybundle container)
// ──────────────────────────────────────────────
// Replaces the old single-JSON export, which embedded every avatar/sprite/
// gallery image as base64 inside one JSON string — a ~33% size penalty, and
// a hard crash (Node's ~512 MB max string length) once a bundle's combined
// binaries got large. A `.storybundle` is a ZIP archive instead: every
// binary is a raw, unencoded archive entry, and manifest.json carries only
// text — metadata, game config, and entity relationships (including the
// isPartyMember flag per character).
import type { AvatarCrop } from "./avatar-crop.js";
import type { StoryBundleGameConfig, StoryBundleAssetSelection } from "./story-bundle-game.js";

/** manifest.json entry for one character. Its card JSON/avatar/sprites/gallery live under characters/<id>/. */
export interface BundleManifestCharacter {
  /** Matches the characters/<id>/ folder name. Remapped to a new local DB id on import. */
  id: string;
  /** Rule 1: isPartyMember lives on the mapping itself, not a separate array. */
  isPartyMember: boolean;
  hasAvatar: boolean;
}

/** manifest.json entry for one persona. Its data/avatar/sprites/gallery live under personas/<id>/. */
export interface BundleManifestPersona {
  id: string;
  hasAvatar: boolean;
}

/** A scenario as carried in the manifest — opening message text stays inline; its optional image is a sibling file. */
export interface BundleManifestScenario {
  id: string;
  title: string;
  openingMessage: string;
  /** File name under scenarios/ (e.g. "intro-001.png"), or null when this scenario has no picture. */
  imageFile: string | null;
  avatarCrop?: AvatarCrop | null;
}

/** Display-name pairing for an agent the bundle references but doesn't embed (agents ship via capability packages). */
export interface BundleManifestAgentRef {
  id: string;
  name: string;
}

export const BUNDLE_MANIFEST_FORMAT = "marinara-story-bundle-zip" as const;
export const BUNDLE_MANIFEST_VERSION = 1 as const;

/** The only JSON read into memory up front on import; every binary is a raw zip entry read one at a time. */
export interface BundleManifest {
  format: typeof BUNDLE_MANIFEST_FORMAT;
  version: typeof BUNDLE_MANIFEST_VERSION;
  exportedAt: string;
  name: string;
  description: string | null;
  /** Whether cover.<ext> exists at the archive root. */
  hasCoverImage: boolean;
  avatarCrop: AvatarCrop | null;
  comment: string;
  creator: string;
  /** The bundle's own free-text version label (e.g. "1.0.0") — distinct from the manifest format `version`. */
  bundleVersion: string;
  tags: string[];
  characters: BundleManifestCharacter[];
  personaIds: string[];
  lorebookIds: string[];
  presetIds: string[];
  agents: BundleManifestAgentRef[];
  scenarios: BundleManifestScenario[];
  gameConfig: StoryBundleGameConfig | null;
  assetSelection: StoryBundleAssetSelection | null;
}
