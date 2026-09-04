// ──────────────────────────────────────────────
// Story Bundle Editor — Full-page detail view
// ──────────────────────────────────────────────
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  BookMarked,
  BookOpen,
  FileText,
  FolderOpen,
  Info,
  Loader2,
  MessageSquare,
  Save,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";
import { useStoryBundle, useUpdateStoryBundle, useDeleteStoryBundle } from "../../hooks/use-story-bundles";
import { useCharacters, useCharacterGroups, usePersonas } from "../../hooks/use-characters";
import { useLorebooks, useEntriesAcrossLorebooks } from "../../hooks/use-lorebooks";
import { usePresets } from "../../hooks/use-presets";
import type { Lorebook, PromptPreset, StoryBundleGameConfig, StoryBundleScenario } from "@marinara-engine/shared";
import { buildNarratorInstructionMessage } from "@marinara-engine/shared";
import { useCreateChat, useUpdateChatMetadata, chatKeys } from "../../hooks/use-chats";
import { useConnections } from "../../hooks/use-connections";
import { getPreferredConnectionId } from "../../lib/connection-filters";
import { useGenerate } from "../../hooks/use-generate";
import { useUIStore } from "../../stores/ui.store";
import { useChatStore } from "../../stores/chat.store";
import { api } from "../../lib/api-client";
import { showConfirmDialog } from "../../lib/app-dialogs";
import { sanitizeStoryBundleDescription } from "../../lib/story-bundle-html";
import { cn } from "../../lib/utils";
import { EditorTabNavigation } from "../ui/EditorTabNavigation";
import { ChatModeIcon } from "../chat/ChatModeIcon";
import { HOME_CHAT_MODE_ACCENTS } from "../../lib/home-chat-mode-style";
import { StoryBundleDescription } from "./StoryBundleDescription";
import { StoryBundleMetadata } from "./StoryBundleMetadata";
import { StoryBundleGameConfigForm } from "./StoryBundleGameConfigForm";
import { StoryBundleCharacters } from "./StoryBundleCharacters";
import { StoryBundlePersonas } from "./StoryBundlePersonas";
import { StoryBundleLorebooks } from "./StoryBundleLorebooks";
import { StoryBundlePresets } from "./StoryBundlePresets";
import { StoryBundleAgents } from "./StoryBundleAgents";
import { StoryBundleAssets } from "./StoryBundleAssets";
import { StoryBundleScenarios } from "./StoryBundleScenarios";
import { StoryBundleGmStartModal } from "./StoryBundleGmStartModal";
import { StoryBundleRpStartModal, type StoryBundleRpStartBundle } from "./StoryBundleRpStartModal";
import { useStartStoryBundleAdventure } from "../../lib/story-bundle-gm-direct-inject";
import { useStartStoryBundleConversation } from "../../lib/story-bundle-convo-direct-inject";

/** Parse a JSON string or array into a string[] of character IDs. */
function parseCharacterFolderIds(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0);
  }
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
      : [];
  } catch {
    return [];
  }
}

const TABS = [
  { id: "metadata", label: "Metadata", icon: Info },
  { id: "description", label: "Description", icon: FileText },
  { id: "characters", label: "Characters", icon: Users },
  { id: "personas", label: "Personas", icon: UserRound },
  { id: "lorebooks", label: "Lorebooks", icon: BookOpen },
  { id: "presets", label: "Presets", icon: SlidersHorizontal },
  { id: "agents", label: "Agents", icon: Sparkles },
  { id: "assets", label: "Assets", icon: FolderOpen },
  { id: "scenarios", label: "Scenarios", icon: MessageSquare },
] as const;
type TabId = (typeof TABS)[number]["id"];

/** Draft snapshot captured when Play is clicked (Click 1), consumed once the wizard confirms (Click 2). */
interface PendingPlayDraft extends StoryBundleRpStartBundle {
  name: string;
  characterIds: string[];
  lorebookIds: string[];
  presetId: string | null;
  agentIds: string[];
}

export function StoryBundleEditor() {
  const { t } = useTranslation();
  const storyBundleDetailId = useUIStore((s) => s.storyBundleDetailId);
  const closeStoryBundleDetail = useUIStore((s) => s.closeStoryBundleDetail);
  const openRightPanel = useUIStore((s) => s.openRightPanel);

  const { data: bundle, isLoading } = useStoryBundle(storyBundleDetailId);
  const updateMutation = useUpdateStoryBundle();
  const deleteMutation = useDeleteStoryBundle();

  const { data: allCharacters } = useCharacters();
  const { data: allCharacterGroups } = useCharacterGroups();
  const { data: allPersonas } = usePersonas();
  const { data: allLorebooks } = useLorebooks();
  const { data: allPresets } = usePresets();

  const characters = useMemo(
    () =>
      (allCharacters ?? []) as Array<{ id: string; data: unknown; comment?: string | null; avatarPath: string | null }>,
    [allCharacters],
  );

  const characterFolders = useMemo(
    () =>
      ((allCharacterGroups ?? []) as Array<{ id: string; name: string; characterIds: unknown }>).map((group) => ({
        ...group,
        characterIds: parseCharacterFolderIds(group.characterIds),
      })),
    [allCharacterGroups],
  );

  const validCharacterIds = useMemo(() => new Set((characters ?? []).map((c) => c.id)), [characters]);

  const personas = useMemo(
    () =>
      (allPersonas ?? []) as Array<{
        id: string;
        name: string;
        avatarPath?: string | null;
        avatarCrop?: string;
        comment?: string | null;
        description?: string | null;
      }>,
    [allPersonas],
  );

  const validPersonaIds = useMemo(() => new Set((personas ?? []).map((p) => p.id)), [personas]);

  const lorebooks = useMemo(() => (allLorebooks ?? []) as Lorebook[], [allLorebooks]);

  const validLorebookIds = useMemo(() => new Set((lorebooks ?? []).map((lb) => lb.id)), [lorebooks]);

  const presets = useMemo(() => (allPresets ?? []) as PromptPreset[], [allPresets]);

  const validPresetIds = useMemo(() => new Set((presets ?? []).map((p) => p.id)), [presets]);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [avatarCrop, setAvatarCrop] = useState<Record<string, unknown> | null>(null);
  const [comment, setComment] = useState("");
  const [creator, setCreator] = useState("");
  const [version, setVersion] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [characterIds, setCharacterIds] = useState<string[]>([]);
  const [personaIds, setPersonaIds] = useState<string[]>([]);
  const [lorebookIds, setLorebookIds] = useState<string[]>([]);
  const [presetIds, setPresetIds] = useState<string[]>([]);
  const [agentIds, setAgentIds] = useState<string[]>([]);
  const [partyCharacterIds, setPartyCharacterIds] = useState<string[]>([]);
  const [excludedAssetFolders, setExcludedAssetFolders] = useState<string[]>([]);
  const [scenarios, setScenarios] = useState<StoryBundleScenario[]>([]);
  const [gameConfig, setGameConfig] = useState<StoryBundleGameConfig | null>(null);
  const [previewDescription, setPreviewDescription] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("metadata");
  const [saving, setSaving] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [pendingPlayDraft, setPendingPlayDraft] = useState<PendingPlayDraft | null>(null);

  // RP chat creation hook for the Play button
  const createChat = useCreateChat();
  const updateChatMetadata = useUpdateChatMetadata();
  const { data: connections } = useConnections();
  const { generate } = useGenerate();
  const qc = useQueryClient();
  const {
    pendingBundle: pendingGmBundle,
    isStarting: isStartingGm,
    step: gmStep,
    requestStart: requestStartGm,
    cancel: cancelGm,
    confirmPersona: confirmGmPersona,
  } = useStartStoryBundleAdventure();
  const { isStarting: isStartingConvo, requestStart: requestStartConvo } = useStartStoryBundleConversation();

  // Keep the local draft in sync with the loaded bundle. useLayoutEffect so
  // the draft is populated synchronously before paint — Play must never read
  // an empty draft in the window between the editor rendering and a passive
  // effect running. Keyed on bundle.id only (not the whole bundle object) so
  // a background refetch of the SAME bundle (e.g. after the image mutation
  // below) never silently discards unsaved edits to every other field.
  useLayoutEffect(() => {
    if (bundle) {
      setName(bundle.name);
      setDescription(bundle.description ?? "");
      setImagePath(bundle.imagePath ?? null);
      setAvatarCrop((bundle.avatarCrop as unknown as Record<string, unknown>) ?? null);
      setComment(bundle.comment ?? "");
      setCreator(bundle.creator ?? "");
      setVersion(bundle.version ?? "");
      setTags(bundle.tags ?? []);
      setCharacterIds(bundle.characterIds ?? []);
      setPersonaIds(bundle.personaIds ?? []);
      setLorebookIds(bundle.lorebookIds ?? []);
      setPresetIds(bundle.presetIds ?? []);
      setAgentIds(bundle.agentIds ?? []);
      setPartyCharacterIds(bundle.partyCharacterIds ?? []);
      setExcludedAssetFolders(bundle.gameAssetSelection?.excludedFolders ?? []);
      setScenarios(bundle.scenarios ?? []);
      setGameConfig(bundle.gameConfig ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bundle?.id]);

  // The image upload/remove mutations (StoryBundleMetadata.tsx) write straight
  // to the server and never touch any other draft field — mirror only the
  // image fields when the bundle's own copy of them changes, instead of
  // re-running the full reset above (which would wipe unrelated unsaved edits).
  useEffect(() => {
    if (!bundle) return;
    setImagePath(bundle.imagePath ?? null);
    setAvatarCrop((bundle.avatarCrop as unknown as Record<string, unknown>) ?? null);
  }, [bundle?.imagePath, bundle?.avatarCrop]);

  /** Sets one genre/setting/tone field, filling in the schema-required remaining
   * gameConfig fields with the same defaults DirectInject already falls back to
   * (Normal / standalone / sfw) the first time a creator touches this form. */
  const updateGameConfigField = useCallback((field: "genre" | "setting" | "tone", value: string) => {
    setGameConfig((prev) => ({
      genre: "",
      setting: "",
      tone: "",
      difficulty: "Normal",
      playerGoals: "",
      gmMode: "standalone",
      rating: "sfw",
      ...prev,
      [field]: value,
    }));
  }, []);

  const assignedCharactersForGeneration = useMemo(
    () => characters.filter((c) => characterIds.includes(c.id)).map((c) => ({ id: c.id, data: c.data as unknown })),
    [characters, characterIds],
  );
  const { entries: assignedLorebookEntries } = useEntriesAcrossLorebooks(lorebookIds);
  const gameConfigGenerationEntries = useMemo(
    () => (assignedLorebookEntries ?? []).map((entry) => ({ name: entry.name, content: entry.content })),
    [assignedLorebookEntries],
  );
  const gameConfigGenerationConnectionId = useMemo(
    () => getPreferredConnectionId(connections as Array<{ id: string; isDefault?: boolean | string }> | undefined),
    [connections],
  );

  const nameDirty = bundle ? name.trim() !== bundle.name && name.trim().length > 0 : false;
  const descriptionDirty = bundle ? description !== (bundle.description ?? "") : false;
  const commentDirty = bundle ? comment !== (bundle.comment ?? "") : false;
  const creatorDirty = bundle ? creator !== (bundle.creator ?? "") : false;
  const versionDirty = bundle ? version !== (bundle.version ?? "") : false;
  const tagsDirty = bundle
    ? JSON.stringify([...(tags ?? [])].sort()) !== JSON.stringify([...(bundle.tags ?? [])].sort())
    : false;
  const characterIdsDirty = bundle
    ? JSON.stringify([...(characterIds ?? [])].sort()) !== JSON.stringify([...(bundle.characterIds ?? [])].sort())
    : false;
  const personaIdsDirty = bundle
    ? JSON.stringify([...(personaIds ?? [])].sort()) !== JSON.stringify([...(bundle.personaIds ?? [])].sort())
    : false;
  const lorebookIdsDirty = bundle
    ? JSON.stringify([...(lorebookIds ?? [])].sort()) !== JSON.stringify([...(bundle.lorebookIds ?? [])].sort())
    : false;
  const presetIdsDirty = bundle
    ? JSON.stringify([...(presetIds ?? [])].sort()) !== JSON.stringify([...(bundle.presetIds ?? [])].sort())
    : false;
  const agentIdsDirty = bundle
    ? JSON.stringify([...(agentIds ?? [])].sort()) !== JSON.stringify([...(bundle.agentIds ?? [])].sort())
    : false;
  const partyCharacterIdsDirty = bundle
    ? JSON.stringify([...(partyCharacterIds ?? [])].sort()) !==
      JSON.stringify([...(bundle.partyCharacterIds ?? [])].sort())
    : false;
  const assetSelectionDirty = bundle
    ? JSON.stringify([...(excludedAssetFolders ?? [])].sort()) !==
      JSON.stringify([...(bundle.gameAssetSelection?.excludedFolders ?? [])].sort())
    : false;
  const scenariosDirty = bundle ? JSON.stringify(scenarios) !== JSON.stringify(bundle.scenarios ?? []) : false;
  const avatarCropDirty = bundle ? JSON.stringify(avatarCrop) !== JSON.stringify(bundle.avatarCrop ?? null) : false;
  const gameConfigDirty = bundle ? JSON.stringify(gameConfig) !== JSON.stringify(bundle.gameConfig ?? null) : false;
  const isDirty =
    nameDirty ||
    descriptionDirty ||
    commentDirty ||
    creatorDirty ||
    versionDirty ||
    tagsDirty ||
    characterIdsDirty ||
    personaIdsDirty ||
    lorebookIdsDirty ||
    presetIdsDirty ||
    agentIdsDirty ||
    partyCharacterIdsDirty ||
    assetSelectionDirty ||
    scenariosDirty ||
    avatarCropDirty ||
    gameConfigDirty;

  const sanitizedDescription = useMemo(
    () => (description ? sanitizeStoryBundleDescription(description) : ""),
    [description],
  );

  const handleSave = useCallback(async () => {
    if (!storyBundleDetailId || !isDirty || saving) return;
    setSaving(true);
    try {
      const payload: {
        name?: string;
        description?: string | null;
        avatarCrop?: Record<string, unknown> | null;
        comment?: string;
        creator?: string;
        version?: string;
        tags?: string[];
        characterIds?: string[];
        personaIds?: string[];
        lorebookIds?: string[];
        presetIds?: string[];
        agentIds?: string[];
        scenarios?: StoryBundleScenario[];
        partyCharacterIds?: string[];
        gameAssetSelection?: { excludedFolders: string[] } | null;
        gameConfig?: StoryBundleGameConfig | null;
      } = {};
      if (nameDirty) payload.name = name.trim();
      if (descriptionDirty) payload.description = description || null;
      if (avatarCropDirty) payload.avatarCrop = avatarCrop;
      if (commentDirty) payload.comment = comment;
      if (creatorDirty) payload.creator = creator;
      if (versionDirty) payload.version = version;
      if (tagsDirty) payload.tags = tags;
      if (characterIdsDirty) payload.characterIds = characterIds;
      if (personaIdsDirty) payload.personaIds = personaIds;
      if (lorebookIdsDirty) payload.lorebookIds = lorebookIds;
      if (presetIdsDirty) payload.presetIds = presetIds;
      if (agentIdsDirty) payload.agentIds = agentIds;
      if (scenariosDirty) payload.scenarios = scenarios;
      if (partyCharacterIdsDirty) payload.partyCharacterIds = partyCharacterIds;
      if (assetSelectionDirty) {
        payload.gameAssetSelection = excludedAssetFolders.length > 0 ? { excludedFolders: excludedAssetFolders } : null;
      }
      if (gameConfigDirty) payload.gameConfig = gameConfig;
      await updateMutation.mutateAsync({ id: storyBundleDetailId, ...payload });
      toast.success(t("storyBundles.saveSuccess", "Story bundle saved."));
    } catch {
      toast.error(t("storyBundles.saveFailed", "Failed to save the story bundle."));
    } finally {
      setSaving(false);
    }
  }, [
    storyBundleDetailId,
    isDirty,
    saving,
    nameDirty,
    descriptionDirty,
    avatarCropDirty,
    commentDirty,
    creatorDirty,
    versionDirty,
    tagsDirty,
    characterIdsDirty,
    personaIdsDirty,
    lorebookIdsDirty,
    presetIdsDirty,
    agentIdsDirty,
    partyCharacterIdsDirty,
    assetSelectionDirty,
    scenariosDirty,
    updateMutation,
    name,
    description,
    avatarCrop,
    comment,
    creator,
    version,
    tags,
    characterIds,
    personaIds,
    lorebookIds,
    presetIds,
    agentIds,
    partyCharacterIds,
    excludedAssetFolders,
    scenarios,
    t,
  ]);

  // GM (Game Mode) uses the current editor draft, same as Play — an unsaved
  // preset/party change should be honored, not silently dropped.
  const handleStartGm = useCallback(() => {
    if (!bundle) return;
    requestStartGm({
      ...bundle,
      name: name.trim() || bundle.name,
      characterIds,
      partyCharacterIds,
      personaIds,
      lorebookIds,
      presetIds,
      agentIds,
      scenarios,
      gameAssetSelection: excludedAssetFolders.length > 0 ? { excludedFolders: excludedAssetFolders } : null,
    });
  }, [
    bundle,
    name,
    characterIds,
    partyCharacterIds,
    personaIds,
    lorebookIds,
    presetIds,
    agentIds,
    scenarios,
    excludedAssetFolders,
    requestStartGm,
  ]);

  const handlePlay = useCallback(() => {
    if (!bundle || playing) return;
    // Play what the user sees: use the current editor draft rather than the
    // last saved server state, so unsaved changes (e.g. a freshly added
    // preset) are honored when starting the roleplay. Snapshotted here so
    // the wizard's later confirm can't race a live edit to these fields.
    setPendingPlayDraft({
      id: bundle.id,
      name: name.trim() || bundle.name,
      characterIds,
      personaIds,
      lorebookIds,
      presetId: presetIds[0] ?? null,
      agentIds,
      scenarios,
    });
  }, [bundle, playing, name, characterIds, personaIds, lorebookIds, presetIds, agentIds, scenarios]);

  const handleConfirmPlay = useCallback(
    async (
      personaId: string | null,
      selectedOpeningMessage: string | null,
      openingGenerationDirection: string | null,
    ) => {
      if (!pendingPlayDraft) return;
      const draft = pendingPlayDraft;
      setPlaying(true);
      let loadingToastId: string | number | undefined;

      try {
        if (openingGenerationDirection) {
          loadingToastId = toast.loading(
            t("storyBundles.customScenarioGenerating", "Starting your scenario… this may take a moment."),
          );
        }

        const conns = (connections ?? []) as Array<{ id: string; isDefault?: boolean | string }>;
        const chat = await createChat.mutateAsync({
          name: draft.name,
          mode: "roleplay",
          characterIds: draft.characterIds,
          personaId,
          connectionId: getPreferredConnectionId(conns) ?? undefined,
          promptPresetId: draft.presetId,
        });

        // Tag the chat with the story bundle it was started from (so the chat
        // sidebar can show the bundle's picture on this RP's row) and activate
        // its lorebooks/agents in the same call, routed through
        // useUpdateChatMetadata so the cache merge/rollback behavior applies
        // here too, not just to the initial tagging.
        try {
          await updateChatMetadata.mutateAsync({
            id: chat.id,
            storyBundleId: draft.id,
            ...(draft.lorebookIds.length > 0 ? { activeLorebookIds: draft.lorebookIds } : {}),
            ...(draft.agentIds.length > 0 ? { enableAgents: true, activeAgentIds: draft.agentIds } : {}),
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
        const presetId = draft.presetId;
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
        // AI-generated) is ready — entering earlier is what left mobile on an
        // empty RP screen while the message was still in flight.
        useChatStore.getState().setActiveChatId(chat.id);
        closeStoryBundleDetail();
        toast.success(t("storyBundles.playStarted", "Roleplay started!"));
      } catch (err) {
        console.error("[playStoryBundle]", err);
        toast.error(t("storyBundles.playFailed", "Failed to start roleplay."));
      } finally {
        if (loadingToastId !== undefined) toast.dismiss(loadingToastId);
        setPlaying(false);
        setPendingPlayDraft(null);
      }
    },
    [pendingPlayDraft, connections, createChat, updateChatMetadata, generate, qc, closeStoryBundleDetail, t],
  );

  // Start a Conversation chat from this bundle's current draft: persona,
  // connection, preset, lorebooks, and agents are applied directly via
  // DirectInject — an unsaved preset/party change should be honored, not
  // silently dropped, same as GM.
  const handleStartConvo = useCallback(() => {
    if (!bundle) return;
    requestStartConvo({
      ...bundle,
      name: name.trim() || bundle.name,
      characterIds,
      personaIds,
      lorebookIds,
      presetIds,
      agentIds,
    });
  }, [bundle, name, characterIds, personaIds, lorebookIds, presetIds, agentIds, requestStartConvo]);

  const handleDelete = useCallback(async () => {
    if (!storyBundleDetailId || !bundle) return;
    const confirmed = await showConfirmDialog({
      title: t("storyBundles.deleteConfirmTitle", "Delete story bundle?"),
      message: t("storyBundles.deleteConfirmBody", {
        defaultValue: "“{{name}}” will be permanently deleted.",
        name: bundle.name,
      }),
      confirmLabel: t("storyBundles.delete", "Delete"),
      tone: "destructive",
      testId: "story-bundle-delete-dialog",
    });
    if (!confirmed) return;
    try {
      await deleteMutation.mutateAsync(storyBundleDetailId);
      closeStoryBundleDetail();
      openRightPanel("story-bundles");
    } catch {
      toast.error(t("storyBundles.deleteFailed", "Failed to delete the story bundle."));
    }
  }, [storyBundleDetailId, bundle, deleteMutation, closeStoryBundleDetail, openRightPanel, t]);

  if (isLoading || !bundle) {
    return (
      <div data-testid="story-bundle-editor-loading" className="flex h-full items-center justify-center">
        <Loader2 size="1.25rem" className="mari-chrome-text-muted animate-spin" />
      </div>
    );
  }

  return (
    <div
      data-testid="story-bundle-editor"
      className="mari-editor-shell mari-editor-legacy-bridge flex h-full min-h-0 flex-col overflow-hidden"
    >
      {/* Header */}
      <div data-testid="story-bundle-editor-header" className="mari-editor-header mari-editor-header--with-nav">
        <div className="mari-editor-header-main">
          <button
            data-testid="story-bundle-editor-back-button"
            onClick={closeStoryBundleDetail}
            className="mari-editor-action inline-flex"
            title={t("storyBundles.back", "Back")}
          >
            <ArrowLeft size="1.125rem" />
          </button>
          <div className="mari-editor-icon-tile mari-panel-gradient-surface mari-panel-gradient--story-bundles">
            <BookMarked size="1.125rem" />
          </div>
          <h2 className="mari-editor-title truncate">{t("storyBundles.editorTitle", "Edit Story Bundle")}</h2>
        </div>
        <EditorTabNavigation
          tabs={TABS}
          activeId={activeTab}
          onChange={setActiveTab}
          tabTestId="story-bundle-editor-tab"
        />

        <div className="mari-editor-actions flex">
          <button
            type="button"
            data-testid="story-bundle-editor-mode-conversation"
            onClick={handleStartConvo}
            disabled={isStartingConvo}
            className="mari-editor-action inline-flex gap-1 px-2.5 text-[0.6875rem] font-semibold"
            title={t("storyBundles.convoTitle", "Start a conversation from this story bundle")}
          >
            {isStartingConvo ? (
              <Loader2 size="0.75rem" className="animate-spin" />
            ) : (
              <ChatModeIcon mode="conversation" size="0.75rem" style={{ color: HOME_CHAT_MODE_ACCENTS.conversation }} />
            )}
            {t("storyBundles.modeConvo", "CONVO")}
          </button>
          <button
            data-testid="story-bundle-editor-play-button"
            type="button"
            onClick={handlePlay}
            disabled={playing}
            className="mari-editor-action inline-flex gap-1 px-2.5 text-[0.6875rem] font-semibold"
            title={t("storyBundles.playTitle", "Start roleplay from this story bundle")}
          >
            {playing ? (
              <Loader2 size="0.75rem" className="animate-spin" />
            ) : (
              <ChatModeIcon mode="roleplay" size="0.75rem" style={{ color: HOME_CHAT_MODE_ACCENTS.roleplay }} />
            )}
            {t("storyBundles.modeRp", "RP")}
          </button>
          <button
            type="button"
            data-testid="story-bundle-editor-mode-game"
            onClick={handleStartGm}
            disabled={isStartingGm}
            className="mari-editor-action inline-flex gap-1 px-2.5 text-[0.6875rem] font-semibold"
            title={t("storyBundles.gmTitle", "Start a Game Mode session from this story bundle")}
          >
            {isStartingGm ? (
              <Loader2 size="0.75rem" className="animate-spin" />
            ) : (
              <ChatModeIcon mode="game" size="0.75rem" style={{ color: HOME_CHAT_MODE_ACCENTS.game }} />
            )}
            {t("storyBundles.modeGm", "GM")}
          </button>
          <button
            data-testid="story-bundle-editor-save-button"
            onClick={handleSave}
            disabled={!isDirty || saving}
            className={cn(
              "mari-editor-action mari-editor-action--primary inline-flex",
              (!isDirty || saving) && "cursor-not-allowed opacity-50",
            )}
            aria-label={t("storyBundles.save", "Save")}
            title={t("storyBundles.save", "Save")}
          >
            {saving ? <Loader2 size="0.8125rem" className="animate-spin" /> : <Save size="0.8125rem" />}
            <span className="mari-editor-save-label">{t("storyBundles.save", "Save")}</span>
          </button>
          <button
            data-testid="story-bundle-editor-delete-button"
            onClick={handleDelete}
            className="mari-editor-action inline-flex"
            title={t("storyBundles.delete", "Delete")}
          >
            <Trash2 size="1rem" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="mari-editor-body min-h-0 flex-1">
        <div className="mari-editor-content @max-5xl:p-4">
          <div className="mari-editor-content-inner">
            {activeTab === "metadata" && (
              <div className="space-y-6">
                <StoryBundleMetadata
                  bundleId={storyBundleDetailId ?? ""}
                  name={name}
                  onNameChange={setName}
                  comment={comment}
                  onCommentChange={setComment}
                  creator={creator}
                  onCreatorChange={setCreator}
                  version={version}
                  onVersionChange={setVersion}
                  tags={tags}
                  onTagsChange={setTags}
                  imagePath={imagePath}
                  avatarCrop={avatarCrop}
                  onAvatarCropChange={setAvatarCrop}
                />
                <StoryBundleGameConfigForm
                  genre={gameConfig?.genre ?? ""}
                  onGenreChange={(value) => updateGameConfigField("genre", value)}
                  setting={gameConfig?.setting ?? ""}
                  onSettingChange={(value) => updateGameConfigField("setting", value)}
                  tone={gameConfig?.tone ?? ""}
                  onToneChange={(value) => updateGameConfigField("tone", value)}
                  characters={assignedCharactersForGeneration}
                  lorebookEntries={gameConfigGenerationEntries}
                  connectionId={gameConfigGenerationConnectionId}
                />
              </div>
            )}

            {activeTab === "description" && (
              <StoryBundleDescription
                description={description}
                onDescriptionChange={setDescription}
                previewDescription={previewDescription}
                onPreviewToggle={() => setPreviewDescription((prev) => !prev)}
                sanitizedDescription={sanitizedDescription}
              />
            )}

            {activeTab === "characters" && (
              <StoryBundleCharacters
                characterIds={characterIds}
                onCharacterIdsChange={setCharacterIds}
                partyCharacterIds={partyCharacterIds}
                onPartyCharacterIdsChange={setPartyCharacterIds}
                characters={characters}
                characterFolders={characterFolders}
                validCharacterIds={validCharacterIds}
              />
            )}

            {activeTab === "personas" && (
              <StoryBundlePersonas
                personaIds={personaIds}
                onPersonaIdsChange={setPersonaIds}
                personas={personas}
                validPersonaIds={validPersonaIds}
              />
            )}

            {activeTab === "lorebooks" && (
              <StoryBundleLorebooks
                lorebookIds={lorebookIds}
                onLorebookIdsChange={setLorebookIds}
                lorebooks={lorebooks}
                validLorebookIds={validLorebookIds}
              />
            )}

            {activeTab === "presets" && (
              <StoryBundlePresets
                presetIds={presetIds}
                onPresetIdsChange={setPresetIds}
                presets={presets}
                validPresetIds={validPresetIds}
              />
            )}

            {activeTab === "agents" && <StoryBundleAgents agentIds={agentIds} onAgentIdsChange={setAgentIds} />}

            {activeTab === "assets" && (
              <StoryBundleAssets
                excludedFolders={excludedAssetFolders}
                onExcludedFoldersChange={setExcludedAssetFolders}
              />
            )}

            {activeTab === "scenarios" && (
              <StoryBundleScenarios scenarios={scenarios} onScenariosChange={setScenarios} />
            )}
          </div>
        </div>
      </div>

      <StoryBundleGmStartModal
        bundle={pendingGmBundle}
        isConfirming={isStartingGm}
        step={gmStep}
        onConfirm={confirmGmPersona}
        onCancel={cancelGm}
      />
      <StoryBundleRpStartModal
        bundle={pendingPlayDraft}
        isConfirming={playing}
        onConfirm={handleConfirmPlay}
        onCancel={() => setPendingPlayDraft(null)}
      />
    </div>
  );
}
