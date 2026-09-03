// ──────────────────────────────────────────────
// Story Bundle → Conversation DirectInject bootstrapper
// ──────────────────────────────────────────────
// Mirrors story-bundle-gm-direct-inject.ts's Game Mode pattern for Conversation
// mode: creates the chat, tags it, and navigates in directly — no
// ChatSetupWizard ever mounts. The only remaining ambiguity for a bundle is
// WHICH of its characters to start messaging first; a bundle with zero or
// one character skips the picker entirely, matching the "Who are you?"
// modal's "only if ambiguous" rule from the Game Mode flow.
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useCreateChat, useUpdateChatMetadata } from "../hooks/use-chats";
import { useConnections } from "../hooks/use-connections";
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

/** Every bundle character is a valid conversation partner — no party/NPC split like Game Mode. */
export function getConvoCharacterCandidateIds(bundle: ConvoDirectInjectBundle): string[] {
  return bundle.characterIds ?? [];
}

/**
 * The DirectInject bootstrapper for Conversation mode. Given an already-
 * loaded bundle and the character the player chose to message first, this
 * creates the chat, tags it with the bundle, and activates its lorebooks and
 * agents — all before navigating in. No wizard, no intermediate UI state.
 */
export function useDirectInjectStoryBundleConversation() {
  const createChat = useCreateChat();
  const updateChatMetadata = useUpdateChatMetadata();
  const { data: connections } = useConnections();
  const [isStarting, setIsStarting] = useState(false);

  const start = useCallback(
    async (bundle: ConvoDirectInjectBundle, characterId: string): Promise<ConvoDirectInjectResult> => {
      setIsStarting(true);
      try {
        const conns = (connections ?? []) as Array<{ id: string }>;
        const chat = await createChat.mutateAsync({
          name: bundle.name,
          mode: "conversation",
          characterIds: [characterId],
          personaId: bundle.personaIds?.[0] ?? null,
          connectionId: conns[0]?.id,
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
 * 0-1 characters commits immediately; one with more opens a minimal picker
 * (`<StoryBundleConvoCharacterPickerModal />`) for which character to
 * message first.
 */
export function useStartStoryBundleConversation() {
  const { t } = useTranslation();
  const { start, isStarting } = useDirectInjectStoryBundleConversation();
  const [pendingBundle, setPendingBundle] = useState<ConvoDirectInjectBundle | null>(null);

  const commit = useCallback(
    async (bundle: ConvoDirectInjectBundle, characterId: string | null) => {
      if (!characterId) {
        toast.error(t("storyBundles.convoNoCharacters", "This story bundle has no characters to message."));
        setPendingBundle(null);
        return null;
      }
      try {
        return await start(bundle, characterId);
      } catch (err) {
        console.error("[directInjectStoryBundleConversation]", err);
        toast.error(t("storyBundles.convoFailed", "Failed to start the conversation."));
        return null;
      } finally {
        setPendingBundle(null);
      }
    },
    [start, t],
  );

  /** Click 1 — "CONVO" on the Bundle Card. Skips the picker when unambiguous. */
  const requestStart = useCallback(
    (bundle: ConvoDirectInjectBundle) => {
      const candidateIds = getConvoCharacterCandidateIds(bundle);
      if (candidateIds.length <= 1) {
        void commit(bundle, candidateIds[0] ?? null);
        return;
      }
      setPendingBundle(bundle);
    },
    [commit],
  );

  const cancel = useCallback(() => setPendingBundle(null), []);

  /** Click 2 — character confirmed in the picker modal. */
  const confirmCharacter = useCallback(
    async (characterId: string | null) => {
      if (!pendingBundle) return null;
      return commit(pendingBundle, characterId);
    },
    [pendingBundle, commit],
  );

  return {
    /** Non-null while the character picker modal should be open. */
    pendingBundle,
    isStarting,
    requestStart,
    cancel,
    confirmCharacter,
  };
}
