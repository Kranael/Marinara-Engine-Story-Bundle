// ──────────────────────────────────────────────
// Story Bundle → Game Mode DirectInject bootstrapper
// ──────────────────────────────────────────────
// Fork-only module that powers the 2-click "Start Adventure" flow: it turns a
// StoryBundle straight into a running Game Mode session chat without ever
// mounting GameSetupWizard. Deliberately isolated from packages/client/src/
// components/game/GameSetupWizard.tsx and hooks/use-game.ts — this only
// *calls* useCreateGame(), it never edits the wizard or the game hooks.
import { useCallback, useState } from "react";
import type { GameSetupConfig, StoryBundle } from "@marinara-engine/shared";
import { getStoryBundlePartyCharacterIds } from "@marinara-engine/shared";
import { useCreateGame } from "../hooks/use-game";
import { useUpdateChatMetadata } from "../hooks/use-chats";
import { useConnections } from "../hooks/use-connections";

/**
 * Map a bundle's frozen `gameConfig` + character/lorebook assignments into the
 * exact `GameSetupConfig` shape `POST /game/create` expects. Pure and
 * synchronous — no network calls, no AI generation (rule: "No AI generation
 * during import").
 *
 * @param bundle Story bundle being played.
 * @param personaId Persona chosen in the "Who are you?" modal; falls back to
 *   the bundle's own first assigned persona (the recommended default) when
 *   the player accepts it as-is, and to `null` when the bundle has none.
 */
export function buildGameSetupConfigFromBundle(bundle: StoryBundle, personaId: string | null): GameSetupConfig {
  const gameConfig = bundle.gameConfig;
  return {
    genre: gameConfig?.genre ?? "",
    setting: gameConfig?.setting ?? "",
    tone: gameConfig?.tone ?? "",
    difficulty: gameConfig?.difficulty ?? "",
    playerGoals: gameConfig?.playerGoals ?? "",
    gmMode: gameConfig?.gmMode ?? "standalone",
    rating: gameConfig?.rating ?? "sfw",
    combatStyle: gameConfig?.combatStyle,
    gameWorldMapMode: gameConfig?.gameWorldMapMode,
    language: gameConfig?.language,
    enableCustomWidgets: gameConfig?.enableCustomWidgets,
    enableSpriteGeneration: gameConfig?.enableSpriteGeneration,
    enableGameSoundEffects: gameConfig?.enableGameSoundEffects,
    enableGameMusic: gameConfig?.enableGameMusic,
    gameGmPromptTemplateId: gameConfig?.gameGmPromptTemplateId,
    gameSystemPrompt: gameConfig?.gameSystemPrompt,
    gameSpecialInstructions: gameConfig?.gameSpecialInstructions,
    // Rule 1: isPartyMember is expressed as membership in partyCharacterIds,
    // clamped to characters actually assigned to the bundle.
    partyCharacterIds: getStoryBundlePartyCharacterIds(bundle),
    // Rule 4: the bundle's persona is only a recommendation — the caller's
    // choice (from the "Who are you?" modal) always wins when provided.
    personaId: personaId ?? bundle.personaIds[0] ?? null,
    activeLorebookIds: bundle.lorebookIds,
    promptPresetId: gameConfig?.promptPresetId ?? bundle.presetIds[0] ?? null,
  };
}

export interface DirectInjectResult {
  gameId: string;
  sessionChatId: string;
}

/**
 * The DirectInject bootstrapper. Given an already-loaded StoryBundle and the
 * persona the player picked, this performs the entire "Click 2" commit:
 *
 * 1. Assembles the GameSetupConfig from the bundle's static metadata (no
 *    wizard steps, no AI calls).
 * 2. Creates the game + its session chat in one request — this is the only
 *    "silent DB insert" this flow performs; the bundle's characters,
 *    lorebooks, and persona are expected to already be local library rows
 *    (Story Bundles always reference local IDs — see story-bundle.technical.md
 *    §4 note 17 on import-time deduplication), so nothing needs re-creating
 *    just to play the bundle as a game.
 * 3. Copies the bundle's asset-folder scope onto the new session chat and
 *    tags it with the bundle's id, mirroring how the RP play flow tags
 *    `storyBundleId` (see hooks/use-story-bundle-actions.ts).
 */
export function useDirectInjectStoryBundle() {
  const createGame = useCreateGame();
  const updateChatMetadata = useUpdateChatMetadata();
  const { data: connections } = useConnections();

  const start = useCallback(
    async (bundle: StoryBundle, personaId: string | null): Promise<DirectInjectResult> => {
      const setupConfig = buildGameSetupConfigFromBundle(bundle, personaId);
      const conns = (connections ?? []) as Array<{ id: string }>;

      const { gameId, sessionChat } = await createGame.mutateAsync({
        name: bundle.name,
        setupConfig,
        connectionId: conns[0]?.id,
        promptPresetId: setupConfig.promptPresetId ?? undefined,
      });

      await updateChatMetadata.mutateAsync({
        id: sessionChat.id,
        storyBundleId: bundle.id,
        gameAssetSelection: bundle.gameAssetSelection,
      });

      return { gameId, sessionChatId: sessionChat.id };
    },
    [createGame, updateChatMetadata, connections],
  );

  return { start, isStarting: createGame.isPending };
}

/**
 * Orchestrates the full 2-click flow for a Bundle Card: Click 1 opens the
 * persona picker (pre-selected to the bundle's default persona); Click 2
 * commits DirectInject. Callers render `<StoryBundlePersonaPickerModal />`
 * bound to the returned state.
 */
export function useStartStoryBundleAdventure() {
  const { start, isStarting } = useDirectInjectStoryBundle();
  const [pendingBundle, setPendingBundle] = useState<StoryBundle | null>(null);

  /** Click 1 — "Start Adventure" on the Bundle Card. */
  const requestStart = useCallback((bundle: StoryBundle) => {
    setPendingBundle(bundle);
  }, []);

  const cancel = useCallback(() => setPendingBundle(null), []);

  /** Click 2 — persona confirmed in the modal. */
  const confirmPersona = useCallback(
    async (personaId: string | null) => {
      if (!pendingBundle) return null;
      try {
        return await start(pendingBundle, personaId);
      } finally {
        setPendingBundle(null);
      }
    },
    [pendingBundle, start],
  );

  return {
    /** Non-null while the persona picker modal should be open. */
    pendingBundle,
    isStarting,
    requestStart,
    cancel,
    confirmPersona,
  };
}
