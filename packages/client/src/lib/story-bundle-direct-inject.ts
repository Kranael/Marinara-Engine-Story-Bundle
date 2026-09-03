// ──────────────────────────────────────────────
// Story Bundle → Game Mode DirectInject bootstrapper
// ──────────────────────────────────────────────
// Fork-only module that powers the 2-click "Start Adventure" flow: it turns a
// StoryBundle straight into a running Game Mode session chat without ever
// mounting GameSetupWizard. Deliberately isolated from packages/client/src/
// components/game/GameSetupWizard.tsx and hooks/use-game.ts — this only
// *calls* useCreateGame()/useGameSetup(), it never edits the wizard or the
// game hooks. Mirrors the create → setup sequence NewGameExperienceChooser.tsx
// uses for package-driven games; the player still reaches GameSurface's own
// "Start Game" confirmation screen once the setup call resolves.
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import type { GameSetupConfig, StoryBundle } from "@marinara-engine/shared";
import { getStoryBundlePartyCharacterIds } from "@marinara-engine/shared";
import { useCreateGame, useGameSetup } from "../hooks/use-game";
import { useUpdateChatMetadata } from "../hooks/use-chats";
import { useConnections } from "../hooks/use-connections";
import { useChatStore } from "../stores/chat.store";
import { useUIStore } from "../stores/ui.store";

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
    // /game/create requires non-empty genre/setting/tone/difficulty — fall
    // back to the native GameSetupWizard's own defaults so a bundle without
    // an imported gameConfig can still start a game.
    genre: gameConfig?.genre || "Fantasy",
    setting: gameConfig?.setting || "A fantasy world",
    tone: gameConfig?.tone || "Heroic",
    difficulty: gameConfig?.difficulty || "Normal",
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
 * 4. Runs the same AI-driven world-setup pass every game needs (POST
 *    /game/setup) — this is the game system's own bootstrap, not wizard UI,
 *    so skipping it would leave the session without a world overview.
 * 5. Navigates into the new session chat and closes any open gallery/editor
 *    overlay, matching the CONVO flow's `closeAllDetails()`.
 */
export function useDirectInjectStoryBundle() {
  const createGame = useCreateGame();
  const gameSetup = useGameSetup();
  const updateChatMetadata = useUpdateChatMetadata();
  const { data: connections } = useConnections();

  const start = useCallback(
    async (bundle: StoryBundle, personaId: string | null): Promise<DirectInjectResult> => {
      const setupConfig = buildGameSetupConfigFromBundle(bundle, personaId);
      const conns = (connections ?? []) as Array<{ id: string }>;
      const connectionId = conns[0]?.id;

      const { gameId, sessionChat } = await createGame.mutateAsync({
        name: bundle.name,
        setupConfig,
        connectionId,
        promptPresetId: setupConfig.promptPresetId ?? undefined,
      });

      await updateChatMetadata.mutateAsync({
        id: sessionChat.id,
        storyBundleId: bundle.id,
        gameAssetSelection: bundle.gameAssetSelection,
      });

      await gameSetup.mutateAsync({
        chatId: sessionChat.id,
        connectionId,
        promptPresetId: setupConfig.promptPresetId ?? null,
        preferences: "",
      });

      useUIStore.getState().closeAllDetails();
      useChatStore.getState().setActiveChatId(sessionChat.id);

      return { gameId, sessionChatId: sessionChat.id };
    },
    [createGame, gameSetup, updateChatMetadata, connections],
  );

  return { start, isStarting: createGame.isPending || gameSetup.isPending };
}

/**
 * Orchestrates the full 2-click flow for a Bundle Card: Click 1 opens the
 * persona picker (pre-selected to the bundle's default persona); Click 2
 * commits DirectInject. Callers render `<StoryBundlePersonaPickerModal />`
 * bound to the returned state.
 */
export function useStartStoryBundleAdventure() {
  const { t } = useTranslation();
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
      } catch (err) {
        console.error("[directInjectStoryBundle]", err);
        toast.error(t("storyBundles.gmFailed", "Failed to start the game from this story bundle."));
        return null;
      } finally {
        setPendingBundle(null);
      }
    },
    [pendingBundle, start, t],
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
