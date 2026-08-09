// ──────────────────────────────────────────────
// Story Bundle Editor — Full-page detail view
// ──────────────────────────────────────────────
// Replaces the chat area while a story bundle is being edited. The first
// iteration of the object only carries a title, so the editor is a single
// title field with save/delete, mirroring the visual language of the other
// full-page editors.
// ──────────────────────────────────────────────
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowLeft, BookMarked, Loader2, Save, Trash2 } from "lucide-react";
import { useStoryBundle, useUpdateStoryBundle, useDeleteStoryBundle } from "../../hooks/use-story-bundles";
import { useUIStore } from "../../stores/ui.store";
import { showConfirmDialog } from "../../lib/app-dialogs";
import { cn } from "../../lib/utils";

export function StoryBundleEditor() {
  const { t } = useTranslation();
  const storyBundleDetailId = useUIStore((s) => s.storyBundleDetailId);
  const closeStoryBundleDetail = useUIStore((s) => s.closeStoryBundleDetail);
  const openRightPanel = useUIStore((s) => s.openRightPanel);

  const { data: bundle, isLoading } = useStoryBundle(storyBundleDetailId);
  const updateMutation = useUpdateStoryBundle();
  const deleteMutation = useDeleteStoryBundle();

  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  // Keep the local draft in sync with the loaded bundle.
  useEffect(() => {
    if (bundle) setName(bundle.name);
  }, [bundle]);

  const isDirty = bundle ? name.trim() !== bundle.name && name.trim().length > 0 : false;

  const handleSave = useCallback(async () => {
    if (!storyBundleDetailId || !isDirty || saving) return;
    setSaving(true);
    try {
      await updateMutation.mutateAsync({ id: storyBundleDetailId, name: name.trim() });
      toast.success(t("storyBundles.saveSuccess", "Story bundle saved."));
    } catch {
      toast.error(t("storyBundles.saveFailed", "Failed to save the story bundle."));
    } finally {
      setSaving(false);
    }
  }, [storyBundleDetailId, isDirty, saving, updateMutation, name, t]);

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
    <div data-testid="story-bundle-editor" className="flex h-full min-h-0 flex-col overflow-y-auto">
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
      <div className="mx-auto w-full max-w-2xl px-4 py-6">
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
    </div>
  );
}
