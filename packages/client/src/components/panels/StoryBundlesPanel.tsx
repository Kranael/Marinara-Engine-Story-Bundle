// ──────────────────────────────────────────────
// Panel: Story Bundles
// ──────────────────────────────────────────────
// Minimal list panel for the new Story Bundle object. The first iteration
// only carries a title; create/delete live here, editing in the full-page
// StoryBundleEditor.
// ──────────────────────────────────────────────
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { BookMarked, Loader2, Plus, Trash2 } from "lucide-react";
import { useStoryBundles, useCreateStoryBundle, useDeleteStoryBundle } from "../../hooks/use-story-bundles";
import { useUIStore } from "../../stores/ui.store";
import { showConfirmDialog, showPromptDialog } from "../../lib/app-dialogs";
import { cn } from "../../lib/utils";

export function StoryBundlesPanel() {
  const { t } = useTranslation();
  const openStoryBundleDetail = useUIStore((s) => s.openStoryBundleDetail);
  const { data: bundles, isLoading } = useStoryBundles();
  const createMutation = useCreateStoryBundle();
  const deleteMutation = useDeleteStoryBundle();
  const [creating, setCreating] = useState(false);

  const handleCreate = useCallback(async () => {
    if (creating) return;
    const title = await showPromptDialog({
      title: t("storyBundles.createDialogTitle", "Create Story Bundle"),
      message: t("storyBundles.createPromptMessage", "Enter a title for the new story bundle."),
      placeholder: t("storyBundles.namePlaceholder", "Title of this story bundle…"),
      confirmLabel: t("storyBundles.create", "Create"),
      cancelLabel: t("storyBundles.cancel", "Cancel"),
      tone: "accent",
      testId: "story-bundle-create-dialog",
    });
    if (title === null) return;
    const name = title.trim();
    if (!name) return;
    setCreating(true);
    try {
      const bundle = await createMutation.mutateAsync({ name });
      openStoryBundleDetail(bundle.id);
    } catch {
      toast.error(t("storyBundles.createFailed", "Failed to create the story bundle."));
    } finally {
      setCreating(false);
    }
  }, [createMutation, creating, openStoryBundleDetail, t]);

  const handleDelete = useCallback(
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
      if (!confirmed) return;
      try {
        await deleteMutation.mutateAsync(id);
      } catch {
        toast.error(t("storyBundles.deleteFailed", "Failed to delete the story bundle."));
      }
    },
    [deleteMutation, t],
  );

  return (
    <div data-testid="story-bundles-panel" className="flex h-full min-h-0 flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <span className="mari-chrome-text-muted text-xs">
          {t("storyBundles.count", { count: bundles?.length ?? 0, defaultValue: "{{count}} bundles" })}
        </span>
        <button
          data-testid="story-bundles-create-button"
          onClick={handleCreate}
          disabled={creating}
          className="mari-panel-gradient-button mari-panel-gradient-surface mari-panel-gradient--story-bundles flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium"
        >
          {creating ? <Loader2 size="0.75rem" className="animate-spin" /> : <Plus size="0.75rem" />}
          {t("storyBundles.newBundle", "New Bundle")}
        </button>
      </div>

      {/* List */}
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {isLoading ? (
          <div className="mari-chrome-text-muted flex h-24 items-center justify-center text-sm">
            <Loader2 size="1rem" className="animate-spin" />
          </div>
        ) : !bundles || bundles.length === 0 ? (
          <div className="mari-chrome-text-muted flex flex-col items-center gap-2 px-4 py-8 text-center text-xs">
            <BookMarked size="1.25rem" />
            {t("storyBundles.empty", "No story bundles yet. Create your first one to get started.")}
          </div>
        ) : (
          <ul className="flex flex-col gap-1">
            {bundles.map((bundle) => (
              <li key={bundle.id}>
                <div
                  data-testid={`story-bundle-row-${bundle.id}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => openStoryBundleDetail(bundle.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openStoryBundleDetail(bundle.id);
                    }
                  }}
                  className="group relative flex cursor-pointer items-center gap-2.5 rounded-xl p-2.5 transition-all hover:bg-[var(--sidebar-accent)]"
                >
                  <div className="mari-panel-gradient-surface mari-panel-gradient--story-bundles flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white">
                    <BookMarked size="0.875rem" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mari-chrome-text-strong truncate text-sm font-medium">{bundle.name}</div>
                    <div className="mari-chrome-text-muted truncate text-xs">
                      {new Date(bundle.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  {/* Row action pill (visible on hover / always on mobile) */}
                  <div className="absolute right-2 top-1/2 flex shrink-0 -translate-y-1/2 items-center gap-0.5 rounded-lg bg-[var(--sidebar)] px-1 py-0.5 opacity-0 shadow-sm ring-1 ring-[var(--border)] transition-opacity group-hover:opacity-100 max-md:opacity-100">
                    <button
                      data-testid={`story-bundle-delete-button-${bundle.id}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleDelete(bundle.id, bundle.name);
                      }}
                      className="rounded-md p-1 transition-transform hover:bg-[var(--sidebar-accent)] active:scale-90"
                      title={t("storyBundles.delete", "Delete")}
                    >
                      <Trash2 size="0.75rem" className={cn("text-[var(--destructive)]")} />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
