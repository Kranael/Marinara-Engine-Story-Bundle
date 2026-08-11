// ──────────────────────────────────────────────
// Story Bundle Metadata Tab
// ──────────────────────────────────────────────
import { useCallback, useRef, useState, type ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { History, Image, Loader2, Pencil, RotateCcw, Tag, Trash2, Upload, X } from "lucide-react";
import { normalizeAvatarCrop, type AvatarCrop } from "@marinara-engine/shared";
import { useUploadStoryBundleImage, useStoryBundleVersions, useDeleteStoryBundleVersion, useResetStoryBundleVersions, useRestoreStoryBundleVersion, useRenameStoryBundleVersion } from "../../hooks/use-story-bundles";
import { showConfirmDialog, showPromptDialog } from "../../lib/app-dialogs";
import { cn } from "../../lib/utils";
import { AvatarCropWidget } from "../ui/AvatarCropWidget";

export interface StoryBundleMetadataProps {
  bundleId: string;
  name: string;
  onNameChange: (value: string) => void;
  comment: string;
  onCommentChange: (value: string) => void;
  creator: string;
  onCreatorChange: (value: string) => void;
  version: string;
  onVersionChange: (value: string) => void;
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  imagePath: string | null;
  avatarCrop: Record<string, unknown> | null;
  onAvatarCropChange: (crop: Record<string, unknown> | null) => void;
  hasUnsavedChanges: boolean;
}

export function StoryBundleMetadata({
  bundleId,
  name,
  onNameChange,
  comment,
  onCommentChange,
  creator,
  onCreatorChange,
  version,
  onVersionChange,
  tags,
  onTagsChange,
  imagePath,
  avatarCrop,
  onAvatarCropChange,
  hasUnsavedChanges,
}: StoryBundleMetadataProps) {
  const { t } = useTranslation();
  const uploadImage = useUploadStoryBundleImage();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [newTag, setNewTag] = useState("");

  const handlePickImage = useCallback(() => {
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
      imageInputRef.current.click();
    }
  }, []);

  const handleImageSelected = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        toast.error(t("storyBundles.invalidImageType", "Please choose an image file."));
        return;
      }
      const reader = new FileReader();
      reader.onload = async () => {
        const image = typeof reader.result === "string" ? reader.result : "";
        if (!image) {
          toast.error(t("storyBundles.imageReadFailed", "Failed to read the image."));
          return;
        }
        try {
          await uploadImage.mutateAsync({ id: bundleId, image });
          toast.success(t("storyBundles.imageUpdated", "Bundle picture updated."));
        } catch {
          toast.error(t("storyBundles.imageUploadFailed", "Failed to upload the bundle picture."));
        }
      };
      reader.onerror = () => {
        toast.error(t("storyBundles.imageReadFailed", "Failed to read the image."));
      };
      reader.readAsDataURL(file);
    },
    [bundleId, uploadImage, t],
  );

  const addTag = useCallback(() => {
    const trimmed = newTag.trim();
    if (!trimmed) return;
    if (tags.includes(trimmed)) {
      setNewTag("");
      return;
    }
    onTagsChange([...tags, trimmed]);
    setNewTag("");
  }, [newTag, tags, onTagsChange]);

  const removeTag = useCallback(
    (tag: string) => {
      onTagsChange(tags.filter((t) => t !== tag));
    },
    [tags, onTagsChange],
  );

  const removeAllTags = useCallback(() => {
    onTagsChange([]);
  }, [onTagsChange]);

  return (
    <div data-testid="story-bundle-editor-metadata" className="flex flex-col gap-5">
      {/* Avatar / Image */}
      <div data-testid="story-bundle-editor-metadata-avatar" className="space-y-1.5">
        <span className="text-xs font-medium text-[var(--muted-foreground)]">
          {t("storyBundles.metadata.avatar", "Avatar")}
        </span>
        <div className="flex items-center gap-3">
          <div
            data-testid="story-bundle-editor-metadata-avatar-preview"
            className={cn(
              "relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl shadow-sm",
              imagePath ? "bg-[var(--muted)]" : "bg-gradient-to-br from-[var(--primary)]/20 to-[var(--primary)]/5",
            )}
          >
            {imagePath ? (
              <img src={imagePath} alt="" className="h-full w-full object-cover" draggable={false} />
            ) : (
              <Image size="1.5rem" className="text-[var(--muted-foreground)]" />
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              data-testid="story-bundle-editor-metadata-upload-button"
              onClick={handlePickImage}
              disabled={uploadImage.isPending}
              className="mari-chrome-control inline-flex items-center gap-1.5 px-3 py-1.5 text-xs"
            >
              <Upload size="0.75rem" />
              {imagePath
                ? t("storyBundles.metadata.changeImage", "Change Image")
                : t("storyBundles.metadata.uploadImage", "Upload Image")}
            </button>
            {uploadImage.isPending && (
              <span className="text-[0.625rem] text-[var(--muted-foreground)]">
                {t("storyBundles.metadata.uploading", "Uploading…")}
              </span>
            )}
          </div>
        </div>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageSelected}
        />
      </div>

      {/* Avatar Crop */}
      {imagePath && (
        <AvatarCropWidget
          src={imagePath}
          alt={name}
          crop={normalizeAvatarCrop(avatarCrop as unknown as AvatarCrop)}
          onChange={(next) => onAvatarCropChange(next as unknown as Record<string, unknown>)}
          onRemove={() => {}}
        />
      )}

      {/* Bundle ID (read-only) */}
      <div data-testid="story-bundle-editor-metadata-bundle-id" className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--secondary)]/70 px-3 py-2">
        <span className="text-[0.625rem] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
          {t("storyBundles.metadata.bundleId", "Bundle ID")}
        </span>
        <code className="min-w-0 flex-1 break-all rounded-lg bg-[var(--background)] px-2 py-1 text-[0.6875rem] text-[var(--foreground)]">
          {bundleId}
        </code>
      </div>

      {/* Name */}
      <label className="space-y-1.5">
        <span className="text-xs font-medium text-[var(--muted-foreground)]">
          {t("storyBundles.metadata.name", "Name")}
        </span>
        <input
          data-testid="story-bundle-editor-metadata-name-input"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--secondary)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)]/40 focus:ring-1 focus:ring-[var(--primary)]/20"
        />
      </label>

      {/* Title / Comment */}
      <label className="space-y-1.5">
        <span className="text-xs font-medium text-[var(--muted-foreground)]">
          {t("storyBundles.metadata.comment", "Title / Comment")}
        </span>
        <input
          data-testid="story-bundle-editor-metadata-comment-input"
          value={comment}
          onChange={(e) => onCommentChange(e.target.value)}
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--secondary)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)]/40 focus:ring-1 focus:ring-[var(--primary)]/20"
          placeholder={t("storyBundles.metadata.commentPlaceholder", "A short note shown under the bundle name…")}
        />
      </label>

      {/* Creator */}
      <label className="space-y-1.5">
        <span className="text-xs font-medium text-[var(--muted-foreground)]">
          {t("storyBundles.metadata.creator", "Creator")}
        </span>
        <input
          data-testid="story-bundle-editor-metadata-creator-input"
          value={creator}
          onChange={(e) => onCreatorChange(e.target.value)}
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--secondary)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)]/40 focus:ring-1 focus:ring-[var(--primary)]/20"
          placeholder={t("storyBundles.metadata.creatorPlaceholder", "Your name or handle…")}
        />
      </label>

      {/* Version */}
      <div className="space-y-1.5">
        <span className="text-xs font-medium text-[var(--muted-foreground)]">
          {t("storyBundles.metadata.version", "Version")}
        </span>
        <input
          data-testid="story-bundle-editor-metadata-version-input"
          value={version}
          onChange={(e) => onVersionChange(e.target.value)}
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--secondary)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)]/40 focus:ring-1 focus:ring-[var(--primary)]/20"
          placeholder={t("storyBundles.metadata.versionPlaceholder", "1.0.0")}
        />
        <StoryBundleVersionHistoryPanel
          bundleId={bundleId}
          bundleName={name}
          hasUnsavedChanges={hasUnsavedChanges}
        />
      </div>

      {/* Tags */}
      <div data-testid="story-bundle-editor-metadata-tags" className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-[var(--muted-foreground)]">
            {t("storyBundles.metadata.tags", "Tags")}
          </span>
          {tags.length > 0 && (
            <button
              type="button"
              data-testid="story-bundle-editor-metadata-tags-remove-all"
              onClick={removeAllTags}
              className="mari-chrome-accent-surface mari-accent-animated rounded-lg border px-2.5 py-1 text-[0.6875rem] font-medium transition-colors"
            >
              {t("storyBundles.metadata.removeAll", "Remove All")}
            </button>
          )}
        </div>
        <div data-testid="story-bundle-editor-metadata-tags-list" className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span key={tag} data-testid={`story-bundle-editor-metadata-tag-${tag}`} className="mari-chrome-control mari-chrome-control--compact group/tag">
              <Tag size="0.625rem" />
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-[var(--primary)]/15 hover:text-[var(--primary)]"
                title={t("storyBundles.metadata.removeTag", "Remove tag")}
              >
                <X size="0.625rem" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-1.5">
          <input
            data-testid="story-bundle-editor-metadata-tag-input"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag();
              }
            }}
            placeholder={t("storyBundles.metadata.addTag", "Add tag…")}
            className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--secondary)] px-3 py-1.5 text-xs outline-none focus:border-[var(--primary)]/40"
          />
          <button
            type="button"
            data-testid="story-bundle-editor-metadata-tag-add-button"
            onClick={addTag}
            className="mari-chrome-control mari-chrome-control--compact mari-chrome-control--selected px-3 py-1.5"
          >
            {t("storyBundles.metadata.add", "Add")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Version History Panel
// ──────────────────────────────────────────────

function getBundleVersionTitle(version: { isCurrent?: boolean; revision: number; version: string }, t: ReturnType<typeof useTranslation>["t"]): string {
  const v = version.version.trim();
  if (version.isCurrent) {
    return v
      ? t("storyBundles.versionHistory.currentWithVersion", "Current · v{{version}}", { version: v })
      : t("storyBundles.versionHistory.current", "Current");
  }
  return v
    ? t("storyBundles.versionHistory.revisionWithVersion", "Revision {{revision}} · v{{version}}", { revision: version.revision, version: v })
    : t("storyBundles.versionHistory.revision", "Revision {{revision}}", { revision: version.revision });
}

function StoryBundleVersionHistoryPanel({
  bundleId,
  bundleName,
  hasUnsavedChanges,
}: {
  bundleId: string;
  bundleName: string;
  hasUnsavedChanges: boolean;
}) {
  const { t } = useTranslation();
  const { data: versions = [], isLoading } = useStoryBundleVersions(bundleId);
  const restoreVersion = useRestoreStoryBundleVersion();
  const deleteVersion = useDeleteStoryBundleVersion();
  const renameVersion = useRenameStoryBundleVersion();
  const resetVersions = useResetStoryBundleVersions();
  const savedVersionCount = versions.filter((v) => !v.isCurrent).length;
  const versionMutationPending =
    restoreVersion.isPending || deleteVersion.isPending || renameVersion.isPending || resetVersions.isPending;

  const handleRestore = async (version: { id: string; version: string; revision: number; isCurrent?: boolean }) => {
    const versionTitle = getBundleVersionTitle(version, t);
    const confirmed = await showConfirmDialog({
      title: t("storyBundles.versionHistory.restoreTitle", "Restore Bundle Version"),
      message: t("storyBundles.versionHistory.restoreMessage", "Restore {{name}} to {{version}}? The current bundle is saved to version history first, so you can switch back to it later.", {
        name: bundleName || t("storyBundles.versionHistory.thisBundle", "this bundle"),
        version: versionTitle,
      }),
      confirmLabel: t("storyBundles.versionHistory.restoreThis", "Restore this version"),
    });
    if (!confirmed) return;
    try {
      await restoreVersion.mutateAsync({ bundleId, versionId: version.id });
      toast.success(t("storyBundles.versionHistory.restored", "Restored {{version}}.", { version: versionTitle }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("storyBundles.versionHistory.restoreFailed", "Failed to restore bundle version."));
    }
  };

  const handleDeleteVersion = async (version: { id: string; version: string; revision: number; isCurrent?: boolean }) => {
    const versionTitle = getBundleVersionTitle(version, t);
    const confirmed = await showConfirmDialog({
      title: t("storyBundles.versionHistory.deleteTitle", "Delete Saved Version"),
      message: t("storyBundles.versionHistory.deleteMessage", "Delete {{version}} from version history? This does not change the current bundle.", { version: versionTitle }),
      confirmLabel: t("storyBundles.delete", "Delete"),
      tone: "destructive",
    });
    if (!confirmed) return;
    try {
      await deleteVersion.mutateAsync({ bundleId, versionId: version.id });
      toast.success(t("storyBundles.versionHistory.deleted", "Deleted {{version}}.", { version: versionTitle }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("storyBundles.versionHistory.deleteFailed", "Failed to delete bundle version."));
    }
  };

  const handleRenameVersion = async (version: { id: string; version: string; revision: number; isCurrent?: boolean }) => {
    const versionTitle = getBundleVersionTitle(version, t);
    const nextVersion = await showPromptDialog({
      title: t("ui.cardversionhistory.renameVersion", "Rename Saved Version"),
      message: t("ui.cardversionhistory.renameVersionMessage", "Enter a new card version for {{value1}}.", { value1: versionTitle }),
      defaultValue: version.version,
      placeholder: t("ui.cardversionhistory.versionPlaceholder", "1.0"),
      confirmLabel: t("ui.cardversionhistory.save", "Save"),
      tone: "accent",
    });
    const trimmed = nextVersion?.trim();
    if (!trimmed || trimmed === version.version) return;
    try {
      await renameVersion.mutateAsync({ bundleId, versionId: version.id, version: trimmed });
      toast.success(t("ui.cardversionhistory.renamedVersion", "Renamed {{value1}} to card v{{value2}}.", { value1: versionTitle, value2: trimmed }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("ui.cardversionhistory.failedToRenameVersion", "Failed to rename the saved version."));
    }
  };

  const handleResetVersions = async () => {
    const name = bundleName || t("storyBundles.versionHistory.thisBundle", "this bundle");
    const confirmed = await showConfirmDialog({
      title: t("storyBundles.versionHistory.resetTitle", "Reset versioning for {{name}}?", { name }),
      message: t("storyBundles.versionHistory.resetMessage", "This deletes every saved version for {{name}} and sets the bundle version to 0.0. This cannot be undone.", { name }),
      confirmLabel: t("storyBundles.versionHistory.reset", "Reset"),
      tone: "destructive",
    });
    if (!confirmed) return;
    try {
      await resetVersions.mutateAsync(bundleId);
      toast.success(t("storyBundles.versionHistory.resetSuccess", "Reset versioning for {{name}} to 0.0.", { name }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("storyBundles.versionHistory.resetFailed", "Failed to reset bundle versioning."));
    }
  };

  return (
    <div data-testid="story-bundle-editor-metadata-version-history" className="rounded-xl border border-[var(--border)] bg-[var(--secondary)]/70 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[0.6875rem] font-medium text-[var(--muted-foreground)]">
          <History size="0.75rem" />
          {t("storyBundles.versionHistory.title", "Version history")}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            data-testid="story-bundle-editor-metadata-version-reset"
            onClick={handleResetVersions}
            disabled={isLoading || versionMutationPending || hasUnsavedChanges}
            className="mari-editor-action mari-editor-action--compact inline-flex h-7 px-2 text-[0.625rem]"
            title={t(
              hasUnsavedChanges
                ? "storyBundles.versionHistory.saveOrDiscard"
                : "storyBundles.versionHistory.reset",
              hasUnsavedChanges
                ? "Save or discard your edits before resetting versioning"
                : "Reset",
            )}
          >
            {resetVersions.isPending ? (
              <Loader2 size="0.75rem" className="animate-spin" />
            ) : (
              <RotateCcw size="0.75rem" />
            )}
            {t("storyBundles.versionHistory.reset", "Reset")}
          </button>
          <span className="mari-editor-chip mari-editor-chip--accent px-2 py-0.5 text-[0.625rem]">
            {isLoading
              ? t("storyBundles.versionHistory.loading", "Loading")
              : t("storyBundles.versionHistory.savedCount", "{{count}} saved", { count: savedVersionCount })}
          </span>
        </div>
      </div>

      {versions.length === 0 ? (
        <p data-testid="story-bundle-editor-metadata-version-empty" className="mt-2 text-[0.6875rem] leading-relaxed text-[var(--muted-foreground)]">
          {t("storyBundles.versionHistory.empty", "Previous bundle states will appear here after the next save.")}
        </p>
      ) : (
        <div data-testid="story-bundle-editor-metadata-version-list" className="mt-2 flex max-h-36 flex-col gap-1.5 overflow-y-auto pr-1">
          {versions.map((version) => (
            <div
              key={version.id}
              data-testid={`story-bundle-editor-metadata-version-${version.id}`}
              className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-2 py-1.5"
            >
              <button
                type="button"
                disabled={version.isCurrent}
                className="min-w-0 flex-1 text-left disabled:cursor-default"
              >
                <span className="block truncate text-[0.6875rem] font-medium text-[var(--foreground)]">
                  {getBundleVersionTitle(version, t)}
                </span>
                <span className="block truncate text-[0.625rem] text-[var(--muted-foreground)]">
                  {new Date(version.createdAt).toLocaleString()}
                  {!version.isCurrent && version.source
                    ? t("storyBundles.versionHistory.sourcePrefix", " · {{source}}", { source: version.source })
                    : ""}
                </span>
              </button>
              {!version.isCurrent && (
                <>
                  <button
                    type="button"
                    data-testid={`story-bundle-editor-metadata-version-rename-${version.id}`}
                    onClick={() => handleRenameVersion(version)}
                    disabled={versionMutationPending}
                    className="mari-editor-action mari-editor-action--compact inline-flex h-7 w-7 rounded-lg p-0"
                    title={t("storyBundles.versionHistory.renameThis", "Rename this saved version")}
                  >
                    {renameVersion.isPending && renameVersion.variables?.versionId === version.id ? (
                      <Loader2 size="0.75rem" className="animate-spin" />
                    ) : (
                      <Pencil size="0.75rem" />
                    )}
                  </button>
                  <button
                    type="button"
                    data-testid={`story-bundle-editor-metadata-version-restore-${version.id}`}
                    onClick={() => handleRestore(version)}
                    disabled={versionMutationPending}
                    className="mari-editor-action mari-editor-action--compact inline-flex h-7 w-7 rounded-lg p-0"
                    title={t("storyBundles.versionHistory.restoreThis", "Restore this version")}
                  >
                    {restoreVersion.isPending ? (
                      <Loader2 size="0.75rem" className="animate-spin" />
                    ) : (
                      <RotateCcw size="0.75rem" />
                    )}
                  </button>
                  <button
                    type="button"
                    data-testid={`story-bundle-editor-metadata-version-delete-${version.id}`}
                    onClick={() => handleDeleteVersion(version)}
                    disabled={versionMutationPending}
                    className="mari-editor-action mari-editor-action--compact mari-editor-action--danger inline-flex h-7 w-7 rounded-lg p-0"
                    title={t("storyBundles.versionHistory.deleteThis", "Delete this saved version")}
                  >
                    {deleteVersion.isPending && deleteVersion.variables?.versionId === version.id ? (
                      <Loader2 size="0.75rem" className="animate-spin" />
                    ) : (
                      <Trash2 size="0.75rem" />
                    )}
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
