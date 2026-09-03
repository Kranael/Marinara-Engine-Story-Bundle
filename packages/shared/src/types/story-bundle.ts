// ──────────────────────────────────────────────
// Story Bundle Types
// ──────────────────────────────────────────────
import type { AvatarCrop } from "./avatar-crop.js";
import type { StoryBundleGameModeFields } from "./story-bundle-game.js";

/**
 * A Scenario is only a starting situation: a title, an opening chat message,
 * and an optional picture. Selecting one when playing a Story Bundle seeds
 * the new chat's first message — there are no branches, paths, or choices.
 */
export interface StoryBundleScenario {
  id: string;
  title: string;
  openingMessage: string;
  /** Optional picture shown as the scenario's thumbnail and card artwork. */
  imagePath?: string | null;
  /** Avatar crop settings for the scenario image, same shape as the bundle picture. */
  avatarCrop?: AvatarCrop | null;
}

/**
 * A Story Bundle is a named container that groups characters, personas,
 * lorebooks, presets, and scenarios into a ready-to-play story.
 */
export interface StoryBundle extends StoryBundleGameModeFields {
  id: string;
  /** The bundle's title. */
  name: string;
  /** Optional HTML description. Rendered safely via DOMPurify on the client. */
  description: string | null;
  /** Optional picture displayed for this bundle in the library UI. */
  imagePath: string | null;
  /** Avatar crop settings for the bundle image. Accepts both the current
   *  source-rectangle shape and the legacy zoom+offset shape (kept readable so
   *  previously saved crops display unchanged until the user re-edits). */
  avatarCrop?: AvatarCrop | null;
  /** User-only note shown under the bundle name in selectors and editors. */
  comment: string;
  /** Creator/author name for attribution. */
  creator: string;
  /** Semantic version string (e.g. "1.0.0"). */
  version: string;
  /** Searchable tags for library organization. */
  tags: string[];
  /** IDs of characters assigned to this story bundle. */
  characterIds: string[];
  /** IDs of personas assigned to this story bundle. */
  personaIds: string[];
  /** IDs of lorebooks assigned to this story bundle. */
  lorebookIds: string[];
  /** IDs of presets assigned to this story bundle. */
  presetIds: string[];
  /** IDs of agents pre-configured for this story bundle. */
  agentIds: string[];
  /** Starting-situation scenarios that can be selected as the first RP message. */
  scenarios: StoryBundleScenario[];
  createdAt: string;
  updatedAt: string;
}
