// ──────────────────────────────────────────────
// Story Bundle Description Tab
// ──────────────────────────────────────────────
import { useTranslation } from "react-i18next";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "../../lib/utils";

export interface StoryBundleDescriptionProps {
  name: string;
  onNameChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  previewDescription: boolean;
  onPreviewToggle: () => void;
  sanitizedDescription: string;
  onSave: () => void;
}

export function StoryBundleDescription({
  name,
  onNameChange,
  description,
  onDescriptionChange,
  previewDescription,
  onPreviewToggle,
  sanitizedDescription,
  onSave: _onSave,
}: StoryBundleDescriptionProps) {
  const { t } = useTranslation();

  return (
    <div data-testid="story-bundle-editor-description" className="flex flex-col gap-4">
      {/* Name */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="story-bundle-name"
          data-testid="story-bundle-editor-name-label"
          className="mari-chrome-text-strong text-xs font-medium"
        >
          {t("storyBundles.nameLabel", "Name")}
        </label>
        <input
          id="story-bundle-name"
          data-testid="story-bundle-editor-name-input"
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder={t("storyBundles.namePlaceholder", "Title of this story bundle…")}
          className="mari-input w-full rounded-lg border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--ring)] focus:outline-none focus:ring-1 focus:ring-[var(--ring)]"
        />
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label
            data-testid="story-bundle-editor-description-label"
            className="mari-chrome-text-strong text-xs font-medium"
          >
            {t("storyBundles.descriptionLabel", "Description")}
          </label>
          <button
            data-testid="story-bundle-editor-description-preview-toggle"
            onClick={onPreviewToggle}
            className={cn(
              "flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-all",
              previewDescription
                ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
                : "text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]",
            )}
          >
            {previewDescription ? (
              <>
                <EyeOff size="0.75rem" />
                {t("storyBundles.descriptionEdit", "Edit")}
              </>
            ) : (
              <>
                <Eye size="0.75rem" />
                {t("storyBundles.descriptionPreview", "Preview")}
              </>
            )}
          </button>
        </div>

        {previewDescription ? (
          sanitizedDescription ? (
            <div
              data-testid="story-bundle-editor-description-preview"
              className="mari-prose prose-sm max-w-none rounded-lg border border-[var(--border)] bg-[var(--card)] p-4"
              dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
            />
          ) : (
            <div
              data-testid="story-bundle-editor-description-preview"
              className="flex items-center justify-center rounded-lg border border-dashed border-[var(--border)] bg-[var(--card)] p-8 text-sm text-[var(--muted-foreground)]"
            >
              {t("storyBundles.descriptionEmpty", "No description yet.")}
            </div>
          )
        ) : (
          <textarea
            data-testid="story-bundle-editor-description-input"
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder={t("storyBundles.descriptionPlaceholder", "Write an HTML description for this story bundle…")}
            rows={12}
            className="mari-input w-full resize-y rounded-lg border border-[var(--border)] bg-[var(--input)] px-3 py-2 font-mono text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--ring)] focus:outline-none focus:ring-1 focus:ring-[var(--ring)]"
          />
        )}

        <p className="text-xs text-[var(--muted-foreground)]">
          {t("storyBundles.descriptionHint", "HTML is supported — tags are sanitized for safety.")}
        </p>
      </div>
    </div>
  );
}
