// ──────────────────────────────────────────────
// Story Bundle Editor — Full-page detail view
// ──────────────────────────────────────────────
// Replaces the chat area while a story bundle is being edited. Supports a
// title field and an optional HTML description with a live preview toggle.
// ──────────────────────────────────────────────
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowLeft, BookMarked, Eye, EyeOff, FileText, Loader2, Save, Trash2, Users } from "lucide-react";
import DOMPurify from "dompurify";
import { useStoryBundle, useUpdateStoryBundle, useDeleteStoryBundle } from "../../hooks/use-story-bundles";
import { useUIStore } from "../../stores/ui.store";
import { showConfirmDialog } from "../../lib/app-dialogs";
import { cn } from "../../lib/utils";
import { EditorTabRail } from "../ui/EditorTabRail";

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

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [previewDescription, setPreviewDescription] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("description");
  const [saving, setSaving] = useState(false);

  // Keep the local draft in sync with the loaded bundle.
  useEffect(() => {
    if (bundle) {
      setName(bundle.name);
      setDescription(bundle.description ?? "");
    }
  }, [bundle]);

  const nameDirty = bundle ? name.trim() !== bundle.name && name.trim().length > 0 : false;
  const descriptionDirty = bundle ? description !== (bundle.description ?? "") : false;
  const isDirty = nameDirty || descriptionDirty;

  const sanitizedDescription = useMemo(
    () => (description ? sanitizeDescription(description) : ""),
    [description],
  );

  const handleSave = useCallback(async () => {
    if (!storyBundleDetailId || !isDirty || saving) return;
    setSaving(true);
    try {
      const payload: { name?: string; description?: string | null } = {};
      if (nameDirty) payload.name = name.trim();
      if (descriptionDirty) payload.description = description || null;
      await updateMutation.mutateAsync({ id: storyBundleDetailId, ...payload });
      toast.success(t("storyBundles.saveSuccess", "Story bundle saved."));
    } catch {
      toast.error(t("storyBundles.saveFailed", "Failed to save the story bundle."));
    } finally {
      setSaving(false);
    }
  }, [storyBundleDetailId, isDirty, saving, nameDirty, descriptionDirty, updateMutation, name, description, t]);

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
              <div className="space-y-6">
                {/* Name field */}
                <div>
                  <label
                    data-testid="story-bundle-editor-name-label"
                    htmlFor="story-bundle-name"
                    className="mari-chrome-text-muted mb-1.5 block text-xs font-medium"
                  >
                    {t("storyBundles.nameLabel", "Name")}
                  </label>
                  <input
                    id="story-bundle-name"
                    data-testid="story-bundle-editor-name-input"
                    type="text"
                    value={name}
                    maxLength={200}
                    onChange={(event) => setName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void handleSave();
                    }}
                    placeholder={t("storyBundles.namePlaceholder", "Title of this story bundle…")}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--input)]/60 px-3.5 py-2.5 text-sm text-[var(--foreground)] outline-none transition-colors focus:border-[var(--primary)]/60 focus:ring-2 focus:ring-[var(--primary)]/20"
                  />
                </div>

                {/* Description field */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label
                      data-testid="story-bundle-editor-description-label"
                      htmlFor="story-bundle-description"
                      className="mari-chrome-text-muted text-xs font-medium"
                    >
                      {t("storyBundles.descriptionLabel", "Description")}
                    </label>
                    <button
                      data-testid="story-bundle-editor-description-preview-toggle"
                      onClick={() => setPreviewDescription((prev) => !prev)}
                      className={cn(
                        "flex items-center gap-1 rounded-md px-2 py-0.5 text-xs transition-colors",
                        previewDescription
                          ? "bg-[var(--primary)]/15 text-[var(--primary)]"
                          : "text-[var(--muted-foreground)] hover:bg-[var(--accent)]",
                      )}
                      title={previewDescription
                        ? t("storyBundles.descriptionEdit", "Edit HTML")
                        : t("storyBundles.descriptionPreview", "Preview")}
                    >
                      {previewDescription ? <EyeOff size="0.75rem" /> : <Eye size="0.75rem" />}
                      {previewDescription
                        ? t("storyBundles.descriptionEdit", "Edit")
                        : t("storyBundles.descriptionPreview", "Preview")}
                    </button>
                  </div>

                  {previewDescription ? (
                    sanitizedDescription ? (
                      <div
                        data-testid="story-bundle-editor-description-preview"
                        className="mari-description-preview min-h-[8rem] w-full rounded-xl border border-[var(--border)] bg-[var(--card)]/60 px-3.5 py-2.5 text-sm text-[var(--foreground)]"
                        dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
                      />
                    ) : (
                      <div
                        data-testid="story-bundle-editor-description-preview"
                        className="mari-description-preview flex min-h-[8rem] w-full items-center rounded-xl border border-[var(--border)] bg-[var(--card)]/60 px-3.5 py-2.5 text-sm"
                      >
                        <span className="text-[var(--muted-foreground)] italic">
                          {t("storyBundles.descriptionEmpty", "No description yet.")}
                        </span>
                      </div>
                    )
                  ) : (
                    <textarea
                      id="story-bundle-description"
                      data-testid="story-bundle-editor-description-input"
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      placeholder={t("storyBundles.descriptionPlaceholder", "Write an HTML description for this story bundle…")}
                      rows={8}
                      className="w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--input)]/60 px-3.5 py-2.5 text-sm text-[var(--foreground)] outline-none transition-colors focus:border-[var(--primary)]/60 focus:ring-2 focus:ring-[var(--primary)]/20"
                    />
                  )}
                  <p className="mt-1 text-right text-[0.625rem] text-[var(--muted-foreground)]">
                    {t("storyBundles.descriptionHint", "HTML is supported — tags are sanitized for safety.")}
                  </p>
                </div>
              </div>
            )}

            {activeTab === "characters" && (
              <div
                data-testid="story-bundle-editor-characters"
                className="flex min-h-[16rem] items-center justify-center"
              >
                <span className="text-sm text-[var(--muted-foreground)]">
                  {t("storyBundles.charactersEmpty", "No characters assigned yet.")}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
