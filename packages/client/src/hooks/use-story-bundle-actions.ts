// ──────────────────────────────────────────────
// Shared Story Bundle actions (Play / Export / Delete)
// ──────────────────────────────────────────────
// Single implementation of the Story Bundle row actions so the sidebar
// panel, the full-page editor, and the Story Bundle Gallery all reuse
// the exact same behavior. The play flow mirrors the panel's original
// logic: create a roleplay chat seeded with the bundle's characters,
// persona, preset and first connection, tag the chat with the bundle,
// activate the bundle's lorebooks and agents, and insert the chosen
// scenario's opening message.
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useCreateChat, useUpdateChatMetadata } from "./use-chats";
import { useConnections } from "./use-connections";
import { useDeleteStoryBundle } from "./use-story-bundles";
import { useChatStore } from "../stores/chat.store";
import { showScenarioDialog, showConfirmDialog } from "../lib/app-dialogs";
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

  const createChat = useCreateChat();
  const updateChatMetadata = useUpdateChatMetadata();
  const { data: connections } = useConnections();
  const deleteMutation = useDeleteStoryBundle();

  const play = useCallback(
    async (bundle: PlayableStoryBundle, options?: { onPlayed?: () => void }) => {
      if (playingId) return;
      setPlayingId(bundle.id);
      try {
        // If the bundle has scenarios, let the user pick one first.
        let selectedOpeningMessage: string | null = null;
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
          });
          if (!choice) {
            setPlayingId(null);
            return;
          }
          const picked = bundleScenarios.find((s) => s.id === choice);
          selectedOpeningMessage = picked?.openingMessage ?? null;
        }

        const conns = (connections ?? []) as Array<{ id: string }>;

        createChat.mutate(
          {
            name: bundle.name,
            mode: "roleplay",
            characterIds: bundle.characterIds ?? [],
            personaId: bundle.personaIds?.[0] ?? null,
            connectionId: conns[0]?.id,
            promptPresetId: bundle.presetIds?.[0] ?? null,
          },
          {
            onSuccess: async (chat) => {
              useChatStore.getState().setActiveChatId(chat.id);

              // Tag the chat with the story bundle it was started from so the
              // chat sidebar can show the bundle's picture on this RP's row.
              try {
                await updateChatMetadata.mutateAsync({ id: chat.id, storyBundleId: bundle.id });
              } catch (err) {
                console.error("[playStoryBundle] Failed to tag chat with story bundle:", err);
              }

              // Activate the bundle's lorebooks on the new chat.
              const lorebookIds = bundle.lorebookIds ?? [];
              if (lorebookIds.length > 0) {
                try {
                  await api.patch(`/chats/${chat.id}/metadata`, { activeLorebookIds: lorebookIds });
                } catch (err) {
                  console.error("[playStoryBundle] Failed to activate lorebooks:", err);
                }
              }

              // Activate the bundle's pre-configured agents on the new chat.
              const agentIds = bundle.agentIds ?? [];
              if (agentIds.length > 0) {
                try {
                  await api.patch(`/chats/${chat.id}/metadata`, {
                    enableAgents: true,
                    activeAgentIds: agentIds,
                  });
                } catch (err) {
                  console.error("[playStoryBundle] Failed to activate agents:", err);
                }
              }

              // If a scenario was selected, insert its opening message as the first assistant message.
              if (selectedOpeningMessage) {
                try {
                  await api.post(`/chats/${chat.id}/messages`, {
                    role: "assistant",
                    content: selectedOpeningMessage,
                  });
                } catch (err) {
                  console.error("[playStoryBundle] Failed to insert scenario opening message:", err);
                }
              }

              // Check if the preset has configurable variables — if so, show
              // only the ChoiceSelectionModal instead of the full setup wizard.
              const presetId = bundle.presetIds?.[0] ?? null;
              let hasPresetVariables = false;
              if (presetId) {
                try {
                  const presetFull = await api.get<{ choiceBlocks?: Array<{ id: string }> }>(
                    `/prompts/${presetId}/full`,
                  );
                  hasPresetVariables = (presetFull?.choiceBlocks?.length ?? 0) > 0;
                } catch {
                  // If we can't fetch the preset, fall through to settings.
                }
              }

              useChatStore.getState().setShouldOpenSettings(true);
              if (hasPresetVariables && presetId) {
                useChatStore.getState().setPresetVariablesPrompt({ chatId: chat.id, presetId });
              }
              options?.onPlayed?.();
              toast.success(t("storyBundles.playStarted", "Roleplay started!"));
              setPlayingId(null);
            },
            onError: (err) => {
              console.error("[playStoryBundle]", err);
              toast.error(t("storyBundles.playFailed", "Failed to start roleplay."));
              setPlayingId(null);
            },
          },
        );
      } catch (err) {
        console.error("[playStoryBundle]", err);
        toast.error(t("storyBundles.playFailed", "Failed to start roleplay."));
        setPlayingId(null);
      }
    },
    [playingId, connections, createChat, updateChatMetadata, t],
  );

  const exportBundle = useCallback(
    async (id: string, name: string) => {
      if (exportingId) return;
      setExportingId(id);
      try {
        await api.download(`/story-bundles/${id}/export`, `${name.replace(/[^a-zA-Z0-9_\- ]/g, "_")}.marinara.json`);
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
