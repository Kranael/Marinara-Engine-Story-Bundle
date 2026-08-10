// ──────────────────────────────────────────────
// Story Bundle Editor — Full-page detail view
// ──────────────────────────────────────────────
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowLeft, BookMarked, FileText, Loader2, Save, Trash2, Users } from "lucide-react";
import DOMPurify from "dompurify";
import { useStoryBundle, useUpdateStoryBundle, useDeleteStoryBundle } from "../../hooks/use-story-bundles";
import { useCharacters, useCharacterGroups } from "../../hooks/use-characters";
import { useUIStore } from "../../stores/ui.store";
import { showConfirmDialog } from "../../lib/app-dialogs";
import { cn } from "../../lib/utils";
import { EditorTabRail } from "../ui/EditorTabRail";
import { StoryBundleDescription } from "./StoryBundleDescription";
import { StoryBundleCharacters } from "./StoryBundleCharacters";

/** Allowed HTML tags for the description preview. */
const ALLOWED_DESCRIPTION_TAGS = [
  "a", "abbr", "b", "blockquote", "br", "code", "dd", "del", "div", "dl",
  "dt", "em", "h1", "h2", "h3", "h4", "h5", "h6", "hr", "i", "img",
  "ins", "li", "mark", "ol", "p", "pre", "s", "small", "span", "strong",
  "sub", "sup", "table", "tbody", "td", "th", "thead", "tr", "u", "ul",
];

/** Sanitize HTML for safe rendering in the description preview. */
function sanitizeDescription(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ALLOWED_DESCRIPTION_TAGS,
    ALLOWED_ATTR: ["href", "target", "rel", "src", "alt", "width", "height",
      "class", "id", "style", "colspan", "rowspan", "start", "type"],
  });
}

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
  { id: "description", label: "Description", icon: FileText },
  { id: "characters", label: "Characters", icon: Users },
] as const;
type TabId = (typeof TABS)[number]["id"];

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

  const validCharacterIds = useMemo(
    () => new Set((characters ?? []).map((c) => c.id)),
    [characters],
  );

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [characterIds, setCharacterIds] = useState<string[]>([]);
  const [previewDescription, setPreviewDescription] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("description");
  const [saving, setSaving] = useState(false);

  // Keep the local draft in sync with the loaded bundle.
  useEffect(() => {
    if (bundle) {
      setName(bundle.name);
      setDescription(bundle.description ?? "");
      setCharacterIds(bundle.characterIds ?? []);
    }
  }, [bundle]);

  const nameDirty = bundle ? name.trim() !== bundle.name && name.trim().length > 0 : false;
  const descriptionDirty = bundle ? description !== (bundle.description ?? "") : false;
  const characterIdsDirty = bundle
    ? JSON.stringify([...(characterIds ?? [])].sort()) !== JSON.stringify([...(bundle.characterIds ?? [])].sort())
    : false;
  const isDirty = nameDirty || descriptionDirty || characterIdsDirty;

  const sanitizedDescription = useMemo(
    () => (description ? sanitizeDescription(description) : ""),
    [description],
  );

  const handleSave = useCallback(async () => {
    if (!storyBundleDetailId || !isDirty || saving) return;
    setSaving(true);
    try {
      const payload: { name?: string; description?: string | null; characterIds?: string[] } = {};
      if (nameDirty) payload.name = name.trim();
      if (descriptionDirty) payload.description = description || null;
      if (characterIdsDirty) payload.characterIds = characterIds;
      await updateMutation.mutateAsync({ id: storyBundleDetailId, ...payload });
      toast.success(t("storyBundles.saveSuccess", "Story bundle saved."));
    } catch {
      toast.error(t("storyBundles.saveFailed", "Failed to save the story bundle."));
    } finally {
      setSaving(false);
    }
  }, [storyBundleDetailId, isDirty, saving, nameDirty, descriptionDirty, characterIdsDirty, updateMutation, name, description, characterIds, t]);

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
    <div data-testid="story-bundle-editor" className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <div
        data-testid="story-bundle-editor-header"
        className="sticky top-0 z-10 flex h-12 shrink-0 items-center justify-between gap-2 border-b border-[var(--border)]/30 bg-[var(--card)]/80 px-4 backdrop-blur-sm"
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <button
            data-testid="story-bundle-editor-back-button"
            onClick={closeStoryBundleDetail}
            className="mari-topbar-action flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted-foreground)] transition-all hover:bg-[var(--accent)] active:scale-95"
            title={t("storyBundles.back", "Back")}
          >
            <ArrowLeft size="1rem" />
          </button>
          <div className="mari-panel-gradient-surface mari-panel-gradient--story-bundles flex h-6 w-6 items-center justify-center rounded-md text-white shadow-sm">
            <BookMarked size="0.875rem" />
          </div>
          <h2 className="mari-chrome-text-strong truncate text-sm font-semibold">
            {t("storyBundles.editorTitle", "Edit Story Bundle")}
          </h2>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            data-testid="story-bundle-editor-save-button"
            onClick={handleSave}
            disabled={!isDirty || saving}
            className={cn(
              "mari-panel-gradient-button mari-panel-gradient-surface mari-panel-gradient--story-bundles flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium",
              (!isDirty || saving) && "cursor-not-allowed opacity-45",
            )}
          >
            {saving ? <Loader2 size="0.75rem" className="animate-spin" /> : <Save size="0.75rem" />}
            {t("storyBundles.save", "Save")}
          </button>
          <button
            data-testid="story-bundle-editor-delete-button"
            onClick={handleDelete}
            className="mari-topbar-action flex h-8 w-8 items-center justify-center rounded-lg text-[var(--destructive)] transition-all hover:bg-[var(--accent)] active:scale-95"
            title={t("storyBundles.delete", "Delete")}
          >
            <Trash2 size="0.875rem" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="mari-editor-body @max-5xl:flex-col min-h-0 flex-1">
        <EditorTabRail tabs={TABS} activeId={activeTab} onChange={setActiveTab} />

        <div className="mari-editor-content @max-5xl:p-4">
          <div className="mari-editor-content-inner">
            {activeTab === "description" && (
              <StoryBundleDescription
                name={name}
                onNameChange={setName}
                description={description}
                onDescriptionChange={setDescription}
                previewDescription={previewDescription}
                onPreviewToggle={() => setPreviewDescription((prev) => !prev)}
                sanitizedDescription={sanitizedDescription}
                onSave={handleSave}
              />
            )}

            {activeTab === "characters" && (
              <StoryBundleCharacters
                characterIds={characterIds}
                onCharacterIdsChange={setCharacterIds}
                characters={characters}
                characterFolders={characterFolders}
                validCharacterIds={validCharacterIds}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
