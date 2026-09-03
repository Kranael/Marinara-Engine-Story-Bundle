// ──────────────────────────────────────────────
// Shared Story Bundle actions (Play / Export / Delete)
// ──────────────────────────────────────────────
// Single implementation of the Story Bundle row actions so the sidebar
// panel, the full-page editor, and the Story Bundle Gallery all reuse
// the exact same behavior. The play flow mirrors the panel's original
// logic: create a roleplay chat seeded with the bundle's characters,
// persona, preset and first connection, tag the chat with the bundle,
// activate the bundle's lorebooks and agents, and insert the chosen
// scenario's opening message (or generate one from a custom description)
// before navigating into the chat — so mobile never lands on an empty RP.
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { buildNarratorInstructionMessage, SURPRISE_ME_OPENING_DIRECTION } from "@marinara-engine/shared";
import { useCreateChat, useUpdateChatMetadata, chatKeys } from "./use-chats";
import { useConnections } from "./use-connections";
import { getPreferredConnectionId } from "../lib/connection-filters";
import { useDeleteStoryBundle } from "./use-story-bundles";
import { useGenerate } from "./use-generate";
import { useChatStore } from "../stores/chat.store";
import {
  showScenarioDialog,
  showConfirmDialog,
  CUSTOM_SCENARIO_CHOICE_PREFIX,
  SURPRISE_ME_CHOICE_KEY,
} from "../lib/app-dialogs";
import { api } from "../lib/api-client";

export interface PlayableStoryBundle {
  id: string;
  name: string;
  characterIds: string[];
  personaIds: string[];
  lorebookIds: string[];
  presetIds: string[];
  agentIds: string[];
  scenarios?: Array<{
    id: string;
    title: string;
    openingMessage: string;
    imagePath?: string | null;
    avatarCrop?: unknown;
  }>;
}

/**
 * Shared Story Bundle action handlers with per-bundle busy state.
 * Callers keep their own confirmation UX; the delete handler includes
 * the standard confirmation dialog used everywhere.
 */
export function useStoryBundleActions() {
  const { t } = useTranslation();
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const qc = useQueryClient();
  const createChat = useCreateChat();
  const updateChatMetadata = useUpdateChatMetadata();
  const { data: connections } = useConnections();
  const deleteMutation = useDeleteStoryBundle();
  const { generate } = useGenerate();

  const play = useCallback(
    async (bundle: PlayableStoryBundle, options?: { onPlayed?: () => void }) => {
      if (playingId) return;
      setPlayingId(bundle.id);
      let loadingToastId: string | number | undefined;
      try {
        // If the bundle has scenarios, let the user pick one — a saved one, a
        // custom free-text one, or the default "Surprise Me" AI-improvised
        // opening (no more "None"/cancel-to-nothing outcome). A bundle with
        // no saved scenarios keeps the existing instant-Play behavior —
        // nothing configured to choose from, so the dialog is skipped.
        let selectedOpeningMessage: string | null = null;
        let openingGenerationDirection: string | null = null;
        const bundleScenarios = bundle.scenarios ?? [];
        if (bundleScenarios.length > 0) {
          const choice = await showScenarioDialog({
            title: t("storyBundles.scenarioPickTitle", "Choose a Scenario"),
            message: t("storyBundles.scenarioPickMessage", "Select a scenario to use as the first message."),
            scenarios: bundleScenarios.map((scenario) => ({
              key: scenario.id,
              title: scenario.title,
              imagePath: scenario.imagePath,
              avatarCrop: scenario.avatarCrop,
            })),
            allowCustomScenario: true,
            customScenarioLabel: t("storyBundles.customScenario", "Custom Scenario"),
            customScenarioPlaceholder: t(
              "storyBundles.customScenarioPlaceholder",
              "Describe how the story should begin…",
            ),
            customScenarioConfirmLabel: t("storyBundles.customScenarioStart", "Start Scenario"),
          });
          if (choice.startsWith(CUSTOM_SCENARIO_CHOICE_PREFIX)) {
            openingGenerationDirection = choice.slice(CUSTOM_SCENARIO_CHOICE_PREFIX.length).trim();
          } else if (choice === SURPRISE_ME_CHOICE_KEY) {
            openingGenerationDirection = SURPRISE_ME_OPENING_DIRECTION;
          } else {
            const picked = bundleScenarios.find((s) => s.id === choice);
            selectedOpeningMessage = picked?.openingMessage ?? null;
          }
        }

        if (openingGenerationDirection) {
          loadingToastId = toast.loading(
            t("storyBundles.customScenarioGenerating", "Starting your scenario… this may take a moment."),
          );
        }

        const conns = (connections ?? []) as Array<{ id: string; isDefault?: boolean | string }>;

        const chat = await createChat.mutateAsync({
          name: bundle.name,
          mode: "roleplay",
          characterIds: bundle.characterIds ?? [],
          personaId: bundle.personaIds?.[0] ?? null,
          connectionId: getPreferredConnectionId(conns) ?? undefined,
          promptPresetId: bundle.presetIds?.[0] ?? null,
        });

        // Tag the chat with the story bundle it was started from (so the
        // chat sidebar can show the bundle's picture on this RP's row) and
        // activate its lorebooks/agents in the same call, routed through
        // useUpdateChatMetadata so the cache merge/rollback behavior applies.
        const lorebookIds = bundle.lorebookIds ?? [];
        const agentIds = bundle.agentIds ?? [];
        try {
          await updateChatMetadata.mutateAsync({
            id: chat.id,
            storyBundleId: bundle.id,
            ...(lorebookIds.length > 0 ? { activeLorebookIds: lorebookIds } : {}),
            ...(agentIds.length > 0 ? { enableAgents: true, activeAgentIds: agentIds } : {}),
          });
        } catch (err) {
          console.error("[playStoryBundle] Failed to tag chat with story bundle:", err);
        }

        // If a scenario was selected, insert its opening message as the first
        // assistant message and refresh the messages cache so it is visible
        // the moment we navigate in.
        if (selectedOpeningMessage) {
          try {
            await api.post(`/chats/${chat.id}/messages`, {
              role: "assistant",
              content: selectedOpeningMessage,
            });
            await qc.invalidateQueries({ queryKey: chatKeys.messages(chat.id) });
          } catch (err) {
            console.error("[playStoryBundle] Failed to insert scenario opening message:", err);
          }
        } else if (openingGenerationDirection) {
          // Generate the opening message from the user's free-text description
          // (or the Surprise Me direction) using the same narrator-guided
          // generation the "/narrator" command uses — no separate AI/preset
          // system, just an unmounted (silent) run of the existing generation
          // pipeline.
          try {
            await generate({
              chatId: chat.id,
              connectionId: null,
              generationGuide: buildNarratorInstructionMessage(openingGenerationDirection),
              generationGuideSource: "narrator",
            });
          } catch (err) {
            console.error("[playStoryBundle] Failed to generate custom scenario opening message:", err);
          }
        }

        // Check if the preset has configurable variables — if so, show
        // only the ChoiceSelectionModal instead of the full setup wizard.
        const presetId = bundle.presetIds?.[0] ?? null;
        let hasPresetVariables = false;
        if (presetId) {
          try {
            const presetFull = await api.get<{ choiceBlocks?: Array<{ id: string }> }>(`/prompts/${presetId}/full`);
            hasPresetVariables = (presetFull?.choiceBlocks?.length ?? 0) > 0;
          } catch {
            // If we can't fetch the preset, fall through to settings.
          }
        }

        useChatStore.getState().setShouldOpenSettings(true);
        if (hasPresetVariables && presetId) {
          useChatStore.getState().setPresetVariablesPrompt({ chatId: chat.id, presetId });
        }
        // Navigate into the chat only once the first message (static or
        // AI-generated) is ready — entering earlier is what left mobile on
        // an empty RP screen while the message was still in flight.
        useChatStore.getState().setActiveChatId(chat.id);
        options?.onPlayed?.();
        toast.success(t("storyBundles.playStarted", "Roleplay started!"));
      } catch (err) {
        console.error("[playStoryBundle]", err);
        toast.error(t("storyBundles.playFailed", "Failed to start roleplay."));
      } finally {
        if (loadingToastId !== undefined) toast.dismiss(loadingToastId);
        setPlayingId(null);
      }
    },
    [playingId, connections, createChat, updateChatMetadata, generate, qc, t],
  );

  const exportBundle = useCallback(
    async (id: string, name: string) => {
      if (exportingId) return;
      setExportingId(id);
      try {
        await api.download(`/story-bundles/${id}/export`, `${name.replace(/[^a-zA-Z0-9_\- ]/g, "_")}.storybundle`);
        toast.success(t("storyBundles.exportSuccess", "Story bundle exported."));
      } catch {
        toast.error(t("storyBundles.exportFailed", "Failed to export the story bundle."));
      } finally {
        setExportingId(null);
      }
    },
    [exportingId, t],
  );

  const remove = useCallback(
    async (id: string, name: string) => {
      const confirmed = await showConfirmDialog({
        title: t("storyBundles.deleteConfirmTitle", "Delete story bundle?"),
        message: t("storyBundles.deleteConfirmBody", {
          defaultValue: "“{{name}}” will be permanently deleted.",
          name,
        }),
        confirmLabel: t("storyBundles.delete", "Delete"),
        tone: "destructive",
        testId: "story-bundle-delete-dialog",
      });
      if (!confirmed) return false;
      try {
        await deleteMutation.mutateAsync(id);
        return true;
      } catch {
        toast.error(t("storyBundles.deleteFailed", "Failed to delete the story bundle."));
        return false;
      }
    },
    [deleteMutation, t],
  );

  return { play, exportBundle, remove, playingId, exportingId };
}
