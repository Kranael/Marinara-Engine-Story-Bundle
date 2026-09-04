// ──────────────────────────────────────────────
// Story Bundle → Conversation DirectInject bootstrapper
// ──────────────────────────────────────────────
// Mirrors story-bundle-gm-direct-inject.ts's Game Mode pattern for Conversation
// mode: creates the chat, tags it, and navigates in directly — no
// ChatSetupWizard ever mounts. Conversation mode is a group chat (1:n), so
// every bundle character is included in the chat's characterIds, matching how
// RP mode starts a bundle with all of its characters.
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useCreateChat, useUpdateChatMetadata } from "../hooks/use-chats";
import { useConnections } from "../hooks/use-connections";
import { getPreferredConnectionId } from "./connection-filters";
import { useChatStore } from "../stores/chat.store";
import { useUIStore } from "../stores/ui.store";

export interface ConvoDirectInjectBundle {
  id: string;
  name: string;
  characterIds: string[];
  personaIds: string[];
  lorebookIds: string[];
  presetIds: string[];
  agentIds: string[];
}

export interface ConvoDirectInjectResult {
  chatId: string;
}

/**
 * The DirectInject bootstrapper for Conversation mode. Given an already-
 * loaded bundle, this creates a group chat with every bundle character, tags
 * it with the bundle, and activates its lorebooks and agents — all before
 * navigating in. No wizard, no intermediate UI state.
 */
export function useDirectInjectStoryBundleConversation() {
  const createChat = useCreateChat();
  const updateChatMetadata = useUpdateChatMetadata();
  const { data: connections } = useConnections();
  const [isStarting, setIsStarting] = useState(false);

  const start = useCallback(
    async (bundle: ConvoDirectInjectBundle): Promise<ConvoDirectInjectResult> => {
      setIsStarting(true);
      try {
        const conns = (connections ?? []) as Array<{ id: string; isDefault?: boolean | string }>;
        const chat = await createChat.mutateAsync({
          name: bundle.name,
          mode: "conversation",
          characterIds: bundle.characterIds ?? [],
          personaId: bundle.personaIds?.[0] ?? null,
          connectionId: getPreferredConnectionId(conns) ?? undefined,
          promptPresetId: bundle.presetIds?.[0] ?? null,
        });

        await updateChatMetadata.mutateAsync({
          id: chat.id,
          storyBundleId: bundle.id,
          storyBundleCharacterIds: bundle.characterIds ?? [],
          activeLorebookIds: bundle.lorebookIds ?? [],
          ...(bundle.agentIds?.length ? { enableAgents: true, activeAgentIds: bundle.agentIds } : {}),
        });

        useUIStore.getState().closeAllDetails();
        useChatStore.getState().setActiveChatId(chat.id);
        useChatStore.getState().setShouldOpenSettings(true);

        return { chatId: chat.id };
      } finally {
        setIsStarting(false);
      }
    },
    [connections, createChat, updateChatMetadata],
  );

  return { start, isStarting };
}

/**
 * Orchestrates the full flow for a Bundle Card's CONVO button: a bundle with
 * no characters shows an error; otherwise it starts a group conversation with
 * every bundle character immediately (no picker — group chat includes all).
 */
export function useStartStoryBundleConversation() {
  const { t } = useTranslation();
  const { start, isStarting } = useDirectInjectStoryBundleConversation();
  const [startingBundleId, setStartingBundleId] = useState<string | null>(null);

  const requestStart = useCallback(
    (bundle: ConvoDirectInjectBundle) => {
      if (!bundle.characterIds?.length) {
        toast.error(t("storyBundles.convoNoCharacters", "This story bundle has no characters to message."));
        return;
      }
      setStartingBundleId(bundle.id);
      void start(bundle)
        .catch((err) => {
          console.error("[directInjectStoryBundleConversation]", err);
          toast.error(t("storyBundles.convoFailed", "Failed to start the conversation."));
        })
        .finally(() => setStartingBundleId(null));
    },
    [start, t],
  );

  return {
    /** Non-null id of the bundle currently being started (for spinner/disable state). */
    startingBundleId,
    isStarting,
    requestStart,
  };
}
