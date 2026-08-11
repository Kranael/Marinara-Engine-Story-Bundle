// ──────────────────────────────────────────────
// Story Bundle Metadata Tab
// ──────────────────────────────────────────────
import { useCallback, useRef, useState, type ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Image, Loader2, Pencil, RotateCcw, Tag, Trash2, Upload, X } from "lucide-react";
import { normalizeAvatarCrop, type AvatarCrop } from "@marinara-engine/shared";
import { useUploadStoryBundleImage, useStoryBundleVersions, useDeleteStoryBundleVersion, useDeleteAllStoryBundleVersions, useRestoreStoryBundleVersion, useRenameStoryBundleVersion } from "../../hooks/use-story-bundles";
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
        <StoryBundleVersionHistoryPanel bundleId={bundleId} />
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

function StoryBundleVersionHistoryPanel({ bundleId }: { bundleId: string }) {
  const { t } = useTranslation();
  const { data: versions, isLoading } = useStoryBundleVersions(bundleId);
  const deleteVersion = useDeleteStoryBundleVersion();
  const deleteAllVersions = useDeleteAllStoryBundleVersions();
  const restoreVersion = useRestoreStoryBundleVersion();
  const renameVersion = useRenameStoryBundleVersion();

  const versionMutationPending =
    deleteVersion.isPending || deleteAllVersions.isPending || restoreVersion.isPending || renameVersion.isPending;

  const handleDeleteVersion = useCallback(
    async (versionId: string) => {
      const confirmed = await showConfirmDialog({
        title: t("storyBundles.metadata.deleteVersionTitle", "Delete version?"),
        message: t("storyBundles.metadata.deleteVersionBody", "This version snapshot will be permanently deleted."),
        confirmLabel: t("storyBundles.metadata.delete", "Delete"),
        tone: "destructive",
      });
      if (!confirmed) return;
      try {
        await deleteVersion.mutateAsync({ bundleId, versionId });
      } catch {
        toast.error(t("storyBundles.metadata.versionDeleteFailed", "Failed to delete version."));
      }
    },
    [bundleId, deleteVersion, t],
  );

  const handleDeleteAll = useCallback(async () => {
    const confirmed = await showConfirmDialog({
      title: t("storyBundles.metadata.deleteAllVersionsTitle", "Delete all versions?"),
      message: t("storyBundles.metadata.deleteAllVersionsBody", "All version history for this bundle will be permanently deleted."),
      confirmLabel: t("storyBundles.metadata.deleteAll", "Delete All"),
      tone: "destructive",
    });
    if (!confirmed) return;
    try {
      await deleteAllVersions.mutateAsync(bundleId);
      toast.success(t("storyBundles.metadata.allVersionsDeleted", "All versions deleted."));
    } catch {
      toast.error(t("storyBundles.metadata.allVersionsDeleteFailed", "Failed to delete versions."));
    }
  }, [bundleId, deleteAllVersions, t]);

  const handleRestore = useCallback(
    async (versionId: string, versionLabel: string) => {
      const confirmed = await showConfirmDialog({
        title: t("storyBundles.metadata.restoreVersionTitle", "Restore version?"),
        message: t("storyBundles.metadata.restoreVersionBody", "The bundle will be restored to \"{{version}}\". A snapshot of the current state will be saved first.", { version: versionLabel || "—" }),
        confirmLabel: t("storyBundles.metadata.restore", "Restore"),
      });
      if (!confirmed) return;
      try {
        await restoreVersion.mutateAsync({ bundleId, versionId });
        toast.success(t("storyBundles.metadata.versionRestored", "Bundle restored to \"{{version}}\".", { version: versionLabel || "—" }));
      } catch {
        toast.error(t("storyBundles.metadata.versionRestoreFailed", "Failed to restore version."));
      }
    },
    [bundleId, restoreVersion, t],
  );

  const handleRenameVersion = useCallback(
    async (versionId: string, currentLabel: string) => {
      const nextVersion = await showPromptDialog({
        title: t("storyBundles.metadata.renameVersionTitle", "Rename Version"),
        message: t("storyBundles.metadata.renameVersionMessage", "Enter a new label for this version."),
        defaultValue: currentLabel,
        placeholder: t("storyBundles.metadata.versionPlaceholder", "1.0.0"),
        confirmLabel: t("storyBundles.metadata.save", "Save"),
        tone: "accent",
      });
      const trimmed = nextVersion?.trim();
      if (!trimmed || trimmed === currentLabel) return;
      try {
        await renameVersion.mutateAsync({ bundleId, versionId, version: trimmed });
        toast.success(t("storyBundles.metadata.versionRenamed", "Version renamed to \"{{version}}\".", { version: trimmed }));
      } catch {
        toast.error(t("storyBundles.metadata.versionRenameFailed", "Failed to rename version."));
      }
    },
    [bundleId, renameVersion, t],
  );

  return (
    <div data-testid="story-bundle-editor-metadata-version-history" className="mt-2 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[0.625rem] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
          {t("storyBundles.metadata.versionHistory", "Version History")}
        </span>
        <div className="flex items-center gap-1">
          {(versions?.length ?? 0) > 0 && (
            <button
              type="button"
              data-testid="story-bundle-editor-metadata-version-reset"
              onClick={handleDeleteAll}
              disabled={versionMutationPending}
              className="mari-chrome-control mari-chrome-control--compact px-2 py-0.5 text-[0.625rem] text-[var(--destructive)]"
            >
              {t("storyBundles.metadata.reset", "Reset")}
            </button>
          )}
        </div>
      </div>

      {isLoading && (
        <p data-testid="story-bundle-editor-metadata-version-loading" className="text-[0.625rem] text-[var(--muted-foreground)]">
          {t("storyBundles.metadata.loading", "Loading…")}
        </p>
      )}

      {!isLoading && (versions?.length ?? 0) === 0 && (
        <p data-testid="story-bundle-editor-metadata-version-empty" className="text-[0.625rem] text-[var(--muted-foreground)]">
          {t("storyBundles.metadata.noVersions", "No version history yet. A snapshot is created automatically when you save.")}
        </p>
      )}

      {!isLoading && (versions?.length ?? 0) > 0 && (
        <div data-testid="story-bundle-editor-metadata-version-list" className="max-h-48 space-y-1 overflow-y-auto">
          {(versions ?? []).map((v) => (
            <div
              key={v.id}
              data-testid={`story-bundle-editor-metadata-version-${v.id}`}
              className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--secondary)]/50 px-2.5 py-1.5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[0.6875rem] font-medium text-[var(--foreground)]">
                    {t("storyBundles.metadata.versionLabel", "v{{version}}", { version: v.version || "—" })}
                  </span>
                  <span className="text-[0.5625rem] text-[var(--muted-foreground)]">
                    #{v.revision}
                  </span>
                </div>
                <p className="truncate text-[0.625rem] text-[var(--muted-foreground)]">
                  {new Date(v.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => handleRenameVersion(v.id, v.version)}
                  disabled={versionMutationPending}
                  className="rounded p-0.5 text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
                  title={t("storyBundles.metadata.renameVersion", "Rename version")}
                >
                  {renameVersion.isPending && renameVersion.variables?.versionId === v.id ? (
                    <Loader2 size="0.625rem" className="animate-spin" />
                  ) : (
                    <Pencil size="0.625rem" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleRestore(v.id, v.version)}
                  disabled={versionMutationPending}
                  className="rounded p-0.5 text-[var(--muted-foreground)] transition-colors hover:text-[var(--primary)]"
                  title={t("storyBundles.metadata.restoreVersion", "Restore this version")}
                >
                  {restoreVersion.isPending && restoreVersion.variables?.versionId === v.id ? (
                    <Loader2 size="0.625rem" className="animate-spin" />
                  ) : (
                    <RotateCcw size="0.625rem" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteVersion(v.id)}
                  disabled={versionMutationPending}
                  className="rounded p-0.5 text-[var(--muted-foreground)] transition-colors hover:text-[var(--destructive)]"
                  title={t("storyBundles.metadata.deleteVersion", "Delete version")}
                >
                  {deleteVersion.isPending && deleteVersion.variables?.versionId === v.id ? (
                    <Loader2 size="0.625rem" className="animate-spin" />
                  ) : (
                    <Trash2 size="0.625rem" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
