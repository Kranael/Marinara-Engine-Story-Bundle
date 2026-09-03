// ──────────────────────────────────────────────
// Story Bundle × Game Mode extension types
// ──────────────────────────────────────────────
// Fork-only additions layered on top of the upstream StoryBundle schema so a
// bundle can carry everything the 2-click "Start Adventure" bootstrapper
// needs to skip GameSetupWizard entirely. Kept in its own module (rather than
// folded into story-bundle.ts) to minimize merge conflicts with upstream.
import type { GameCombatStyle, GameGmMode, GameWorldMapMode } from "./game.js";
import type { StoryBundle } from "./story-bundle.js";

/**
 * Static Game Mode metadata captured once, at bundle-authoring time, from a
 * native Game Setup export (see `extractStoryBundleGameConfigFromSetupExport`).
 * Never regenerated or AI-touched afterward — it's a frozen recommendation.
 */
export interface StoryBundleGameConfig {
  genre: string;
  setting: string;
  tone: string;
  difficulty: string;
  playerGoals: string;
  gmMode: GameGmMode;
  rating: "sfw" | "nsfw";
  combatStyle?: GameCombatStyle;
  gameWorldMapMode?: GameWorldMapMode;
  language?: string;
  enableCustomWidgets?: boolean;
  enableSpriteGeneration?: boolean;
  enableGameSoundEffects?: boolean;
  enableGameMusic?: boolean;
  promptPresetId?: string | null;
  gameGmPromptTemplateId?: string | null;
  gameSystemPrompt?: string | null;
  gameSpecialInstructions?: string | null;
}

/**
 * Which game-asset folders (music, ambient, SFX, sprites, backgrounds) this
 * bundle's game should use. Same shape as `ChatMetadata.gameAssetSelection`
 * so the existing folder-selection helpers in `lib/game-asset-selection.ts`
 * work unchanged on both a live chat and a bundle draft.
 */
export interface StoryBundleAssetSelection {
  excludedFolders: string[];
}

/** The Game Mode fields layered onto `StoryBundle`. See story-bundle.ts for the merged interface. */
export interface StoryBundleGameModeFields {
  /** Subset of `characterIds` who join the player's party; the rest are treated as NPCs. */
  partyCharacterIds: string[];
  /** Frozen Game Mode setup metadata, or null if this bundle isn't playable as a Game. */
  gameConfig: StoryBundleGameConfig | null;
  /** Game-asset folder scope for this bundle's game, or null to allow every folder. */
  gameAssetSelection: StoryBundleAssetSelection | null;
}

/** True when `characterId` is assigned to the bundle and marked as a party member. */
export function isStoryBundlePartyMember(bundle: Pick<StoryBundle, "partyCharacterIds">, characterId: string): boolean {
  return bundle.partyCharacterIds.includes(characterId);
}

/** Party member IDs, clamped to characters actually assigned to the bundle. */
export function getStoryBundlePartyCharacterIds(
  bundle: Pick<StoryBundle, "characterIds" | "partyCharacterIds">,
): string[] {
  const assigned = new Set(bundle.characterIds);
  return bundle.partyCharacterIds.filter((id) => assigned.has(id));
}

/** Assigned characters not marked as party members — the bundle's NPCs. */
export function getStoryBundleNpcCharacterIds(
  bundle: Pick<StoryBundle, "characterIds" | "partyCharacterIds">,
): string[] {
  const party = new Set(bundle.partyCharacterIds);
  return bundle.characterIds.filter((id) => !party.has(id));
}

/** Shape of a `format: "marinara-game-setup"` export, as produced by GameSetupSummary's "Download Setup". */
export interface NativeGameSetupExport {
  format: "marinara-game-setup";
  version: number;
  setup: {
    config: Record<string, unknown>;
  };
}

/**
 * Extract only the static, non-connection, non-party fields from a native Game
 * Setup export into a `StoryBundleGameConfig`. Deliberately ignores
 * `partyCharacterIds`, `personaId`, connections, and generation parameters —
 * those come from the bundle's own character/persona assignments and the
 * player's choices at play time, never from the imported file.
 */
export function extractStoryBundleGameConfigFromSetupExport(setupExport: NativeGameSetupExport): StoryBundleGameConfig {
  const config = setupExport.setup.config;
  return {
    genre: String(config.genre ?? ""),
    setting: String(config.setting ?? ""),
    tone: String(config.tone ?? ""),
    difficulty: String(config.difficulty ?? ""),
    playerGoals: String(config.playerGoals ?? ""),
    gmMode: (config.gmMode as GameGmMode) ?? "standalone",
    rating: (config.rating as "sfw" | "nsfw") ?? "sfw",
    combatStyle: config.combatStyle as GameCombatStyle | undefined,
    gameWorldMapMode: config.gameWorldMapMode as GameWorldMapMode | undefined,
    language: typeof config.language === "string" ? config.language : undefined,
    enableCustomWidgets: typeof config.enableCustomWidgets === "boolean" ? config.enableCustomWidgets : undefined,
    enableSpriteGeneration:
      typeof config.enableSpriteGeneration === "boolean" ? config.enableSpriteGeneration : undefined,
    enableGameSoundEffects:
      typeof config.enableGameSoundEffects === "boolean" ? config.enableGameSoundEffects : undefined,
    enableGameMusic: typeof config.enableGameMusic === "boolean" ? config.enableGameMusic : undefined,
    promptPresetId: (config.promptPresetId as string | null | undefined) ?? null,
    gameGmPromptTemplateId: (config.gameGmPromptTemplateId as string | null | undefined) ?? null,
    gameSystemPrompt: (config.gameSystemPrompt as string | null | undefined) ?? null,
    gameSpecialInstructions: (config.gameSpecialInstructions as string | null | undefined) ?? null,
  };
}
