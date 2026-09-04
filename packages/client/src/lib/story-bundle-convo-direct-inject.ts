// ──────────────────────────────────────────────
// Story Bundle → Conversation DirectInject bootstrapper
// ──────────────────────────────────────────────
// Mirrors story-bundle-gm-direct-inject.ts's Game Mode pattern for Conversation
// mode: creates the chat, tags it, and navigates in directly — no
// ChatSetupWizard ever mounts. Conversation mode supports a group chat (1:n),
// so the player picks one or more bundle characters in a picker before the
// chat is created (never auto-started with every character).
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
 * loaded bundle and the character ids the player picked, this creates a group
 * chat with those characters, tags it with the bundle, and activates its
 * lorebooks and agents — all before navigating in. No wizard.
 */
export function useDirectInjectStoryBundleConversation() {
  const createChat = useCreateChat();
  const updateChatMetadata = useUpdateChatMetadata();
  const { data: connections } = useConnections();
  const [isStarting, setIsStarting] = useState(false);

  const start = useCallback(
    async (bundle: ConvoDirectInjectBundle, characterIds: string[]): Promise<ConvoDirectInjectResult> => {
      setIsStarting(true);
      try {
        const conns = (connections ?? []) as Array<{ id: string; isDefault?: boolean | string }>;
        const chat = await createChat.mutateAsync({
          name: bundle.name,
          mode: "conversation",
          characterIds,
          personaId: bundle.personaIds?.[0] ?? null,
          connectionId: getPreferredConnectionId(conns) ?? undefined,
          promptPresetId: bundle.presetIds?.[0] ?? null,
        });

        await updateChatMetadata.mutateAsync({
          id: chat.id,
          storyBundleId: bundle.id,
          storyBundleCharacterIds: characterIds,
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
 * Orchestrates the full flow for a Bundle Card's CONVO button: Click 1 opens
 * the character picker (pre-selected to the bundle's first character); Click
 * 2 (the picker's "Start Conversation") commits DirectInject with the chosen
 * character ids. A bundle with no characters shows an error instead.
 */
export function useStartStoryBundleConversation() {
  const { t } = useTranslation();
  const { start, isStarting } = useDirectInjectStoryBundleConversation();
  const [pendingBundle, setPendingBundle] = useState<ConvoDirectInjectBundle | null>(null);

  /** Click 1 — "CONVO" on the Bundle Card / editor header. */
  const requestStart = useCallback(
    (bundle: ConvoDirectInjectBundle) => {
      if (!bundle.characterIds?.length) {
        toast.error(t("storyBundles.convoNoCharacters", "This story bundle has no characters to message."));
        return;
      }
      setPendingBundle(bundle);
    },
    [t],
  );

  const cancel = useCallback(() => setPendingBundle(null), []);

  /** Click 2 — the picker's "Start Conversation" confirmed the chosen character ids. */
  const confirmCharacters = useCallback(
    async (characterIds: string[]) => {
      if (!pendingBundle) return null;
      try {
        return await start(pendingBundle, characterIds);
      } catch (err) {
        console.error("[directInjectStoryBundleConversation]", err);
        toast.error(t("storyBundles.convoFailed", "Failed to start the conversation."));
        return null;
      } finally {
        setPendingBundle(null);
      }
    },
    [pendingBundle, start, t],
  );

  return {
    /** Non-null while the character picker modal should be open. */
    pendingBundle,
    isStarting,
    requestStart,
    cancel,
    confirmCharacters,
  };
}
