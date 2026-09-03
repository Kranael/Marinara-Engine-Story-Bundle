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
import type { TFunction } from "i18next";
import type { GameNpc, GameSetupConfig, StoryBundle } from "@marinara-engine/shared";
import { getStoryBundleNpcCharacterIds, getStoryBundlePartyCharacterIds } from "@marinara-engine/shared";
import { useCreateGame, useGameSetup } from "../hooks/use-game";
import { useCharacters } from "../hooks/use-characters";
import { useUpdateChatMetadata } from "../hooks/use-chats";
import { useConnections } from "../hooks/use-connections";
import { getPreferredConnectionId } from "./connection-filters";
import { showScenarioDialog, CUSTOM_SCENARIO_CHOICE_PREFIX, SURPRISE_ME_CHOICE_KEY } from "./app-dialogs";
import { useChatStore } from "../stores/chat.store";
import { useUIStore } from "../stores/ui.store";
import { useGameModeStore } from "../stores/game-mode.store";

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

/** Character `data` is a JSON-string card payload on the wire; parse defensively. */
function readCharacterCardNameAndDescription(raw: unknown): { name: string; description: string } {
  const data =
    typeof raw === "string"
      ? (() => {
          try {
            return JSON.parse(raw) as Record<string, unknown>;
          } catch {
            return {};
          }
        })()
      : ((raw as Record<string, unknown>) ?? {});
  return {
    name: typeof data.name === "string" && data.name.trim() ? data.name.trim() : "Unknown",
    description: typeof data.description === "string" ? data.description.trim() : "",
  };
}

/**
 * Map every Story Bundle character assigned as an NPC (not party) into a
 * library-linked `GameNpc` — the "Option A" NPC Fidelity Cliff fix. Only
 * name/description are captured here as a flat fallback for consumers that
 * don't know about `characterId` (journal, chat settings list); the full
 * personality/voice/system-prompt card is resolved from `characterId` at
 * prompt build time instead (see `<known_npcs>` in gm-prompts.ts) — never
 * duplicated or regenerated here. Pure and synchronous, same rule as
 * `buildGameSetupConfigFromBundle`: no AI generation during import.
 */
export function buildStoryBundleGameNpcs(
  bundle: StoryBundle,
  characters: ReadonlyArray<{ id: string; data: unknown }>,
): GameNpc[] {
  const charactersById = new Map(characters.map((character) => [character.id, character]));
  return getStoryBundleNpcCharacterIds(bundle).map((characterId) => {
    const { name, description } = readCharacterCardNameAndDescription(charactersById.get(characterId)?.data);
    return {
      id: characterId,
      name,
      emoji: "\uD83E\uDDD1",
      description,
      descriptionSource: "library",
      gender: null,
      pronouns: null,
      location: "",
      reputation: 0,
      notes: [],
      avatarUrl: null,
      characterId,
      cardSource: "library",
    };
  });
}

export interface DirectInjectResult {
  gameId: string;
  sessionChatId: string;
}

/**
 * Builds the one-shot override for GameSurface's generateInitialGameTurn()
 * when the player picked a saved or custom scenario instead of "Surprise Me"
 * (see resolveStoryBundleOpeningGuideOverride below). Mirrors the phrasing of
 * GameSurface's own default GAME_START_GENERATION_GUIDE so the model treats
 * this the same way — an invisible startup trigger, not a player action —
 * while steering the very first GM turn toward the chosen situation.
 */
function buildGameStartOpeningGuideOverride(direction: string): string {
  return `Begin the game now with the first visible GM VN narration/dialogue segment, opening with this exact situation: ${direction} This is an invisible startup trigger, not a player action. Do not mention a start command.`;
}

/**
 * Click 1.5 — shown between the persona picker and DirectInject's commit.
 * Reuses the same scenario dialog RP's Play flow uses (same Surprise Me
 * card, same Custom Scenario option), but maps the choice to a one-shot
 * `gameOpeningGuideOverride` instead of inserting a chat message: GM always
 * generates its first turn via an AI-guided instruction (see
 * GameSurface.tsx's generateInitialGameTurn), there is no static-message path
 * like RP has. "Surprise Me" needs no override at all — GAME_START_GENERATION_GUIDE
 * already is an AI-improvised opening by default. Canceling the dialog must
 * abort the whole "Start Adventure" flow — no game is created, distinct from
 * picking Surprise Me (which still starts the game, just uninstructed).
 */
type OpeningGuideResolution = { cancelled: true } | { cancelled: false; override: string | null };

async function resolveStoryBundleOpeningGuideOverride(
  bundle: StoryBundle,
  t: TFunction,
): Promise<OpeningGuideResolution> {
  // Nothing configured to choose from — keep the existing instant-confirm
  // behavior and let the default GAME_START_GENERATION_GUIDE (already an
  // AI-improvised opening) run unmodified.
  if (bundle.scenarios.length === 0) return { cancelled: false, override: null };
  const choice = await showScenarioDialog({
    title: t("storyBundles.scenarioPickTitle", "Choose a Scenario"),
    message: t("storyBundles.scenarioPickMessage", "Select a scenario to use as the first message."),
    scenarios: bundle.scenarios.map((scenario) => ({
      key: scenario.id,
      title: scenario.title,
      imagePath: scenario.imagePath,
      avatarCrop: scenario.avatarCrop,
    })),
    allowCustomScenario: true,
    customScenarioLabel: t("storyBundles.customScenario", "Custom Scenario"),
    customScenarioPlaceholder: t("storyBundles.customScenarioPlaceholder", "Describe how the story should begin…"),
    customScenarioConfirmLabel: t("storyBundles.customScenarioStart", "Start Scenario"),
  });
  if (!choice) return { cancelled: true };
  if (choice === SURPRISE_ME_CHOICE_KEY) return { cancelled: false, override: null };
  if (choice.startsWith(CUSTOM_SCENARIO_CHOICE_PREFIX)) {
    return {
      cancelled: false,
      override: buildGameStartOpeningGuideOverride(choice.slice(CUSTOM_SCENARIO_CHOICE_PREFIX.length).trim()),
    };
  }
  const picked = bundle.scenarios.find((s) => s.id === choice);
  return { cancelled: false, override: picked ? buildGameStartOpeningGuideOverride(picked.openingMessage) : null };
}

/** Steps the DirectInject flow moves through, in order — drives the modal's progress bar. */
export type DirectInjectStep = "creating" | "tagging" | "world-setup" | "done";

/** Progress-bar percentage for each step, so the modal never hardcodes its own numbers. */
export const DIRECT_INJECT_STEP_PERCENT: Record<DirectInjectStep, number> = {
  creating: 15,
  tagging: 35,
  "world-setup": 60,
  done: 100,
};

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
  const { data: characters } = useCharacters();
  const [step, setStep] = useState<DirectInjectStep | null>(null);

  const start = useCallback(
    async (
      bundle: StoryBundle,
      personaId: string | null,
      openingGuideOverride?: string | null,
    ): Promise<DirectInjectResult> => {
      const setupConfig = buildGameSetupConfigFromBundle(bundle, personaId);
      const conns = (connections ?? []) as Array<{ id: string; isDefault?: boolean | string }>;
      const connectionId = getPreferredConnectionId(conns) ?? undefined;

      setStep("creating");
      const { gameId, sessionChat } = await createGame.mutateAsync({
        name: bundle.name,
        setupConfig,
        connectionId,
        promptPresetId: setupConfig.promptPresetId ?? undefined,
      });

      setStep("tagging");
      await updateChatMetadata.mutateAsync({
        id: sessionChat.id,
        storyBundleId: bundle.id,
        gameAssetSelection: bundle.gameAssetSelection,
        gameNpcs: buildStoryBundleGameNpcs(bundle, (characters ?? []) as Array<{ id: string; data: unknown }>),
        ...(openingGuideOverride ? { gameOpeningGuideOverride: openingGuideOverride } : {}),
      });

      setStep("world-setup");
      await gameSetup.mutateAsync({
        chatId: sessionChat.id,
        connectionId,
        promptPresetId: setupConfig.promptPresetId ?? null,
        preferences: "",
      });

      setStep("done");
      // useCreateGame()'s onSuccess sets isSetupActive true — normally cleared
      // by GameSetupWizard's own onComplete once it finishes. DirectInject
      // never mounts that wizard, so it must clear this itself or GameSurface
      // reopens the setup wizard on every load (shouldShowSetupWizard reads
      // isSetupActive) until the user manually dismisses it.
      useGameModeStore.getState().setSetupActive(false);
      useUIStore.getState().closeAllDetails();
      useChatStore.getState().setActiveChatId(sessionChat.id);

      return { gameId, sessionChatId: sessionChat.id };
    },
    [createGame, gameSetup, updateChatMetadata, connections, characters],
  );

  const reset = useCallback(() => setStep(null), []);

  return { start, reset, step, isStarting: step !== null && step !== "done" };
}

/**
 * Orchestrates the full 2-click flow for a Bundle Card: Click 1 opens the
 * persona picker (pre-selected to the bundle's default persona); Click 2
 * commits DirectInject. Callers render `<StoryBundlePersonaPickerModal />`
 * bound to the returned state.
 */
export function useStartStoryBundleAdventure() {
  const { t } = useTranslation();
  const { start, reset, step, isStarting } = useDirectInjectStoryBundle();
  const [pendingBundle, setPendingBundle] = useState<StoryBundle | null>(null);
  const [isResolvingScenario, setIsResolvingScenario] = useState(false);

  /** Click 1 — "Start Adventure" on the Bundle Card. */
  const requestStart = useCallback(
    (bundle: StoryBundle) => {
      reset();
      setPendingBundle(bundle);
    },
    [reset],
  );

  const cancel = useCallback(() => setPendingBundle(null), []);

  /** Click 2 — persona confirmed in the modal. */
  const confirmPersona = useCallback(
    async (personaId: string | null) => {
      if (!pendingBundle || isResolvingScenario) return null;
      setIsResolvingScenario(true);
      try {
        // Click 1.5 — same scenario dialog (with its Surprise Me card) RP's
        // Play flow uses, shown before DirectInject actually commits.
        // Canceling here (like canceling the persona picker itself) aborts
        // the whole flow — no game is created, back to where the player was.
        const scenarioResolution = await resolveStoryBundleOpeningGuideOverride(pendingBundle, t);
        if (scenarioResolution.cancelled) return null;
        return await start(pendingBundle, personaId, scenarioResolution.override);
      } catch (err) {
        console.error("[directInjectStoryBundle]", err);
        toast.error(t("storyBundles.gmFailed", "Failed to start the game from this story bundle."));
        return null;
      } finally {
        setIsResolvingScenario(false);
        setPendingBundle(null);
      }
    },
    [pendingBundle, isResolvingScenario, start, t],
  );

  return {
    /** Non-null while the persona picker modal should be open. */
    pendingBundle,
    // True while resolving the scenario dialog OR while DirectInject itself
    // is running — the persona picker's Confirm button stays disabled/busy
    // across both, since there's no distinct "step" for the scenario dialog.
    isStarting: isStarting || isResolvingScenario,
    step,
    requestStart,
    cancel,
    confirmPersona,
  };
}
