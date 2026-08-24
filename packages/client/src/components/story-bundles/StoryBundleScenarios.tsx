// ──────────────────────────────────────────────
// Story Bundle Scenarios Tab
// ──────────────────────────────────────────────
// A Scenario is only a starting situation for a Story Bundle: a title, an
// opening chat message, and an optional picture. There are no branches,
// paths, or choices — just one possible way to start the conversation.
import { useCallback, useRef, useState, type ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { BookOpen, Pencil, Plus, Upload, X } from "lucide-react";
import { normalizeAvatarCrop, type AvatarCrop, type StoryBundleScenario } from "@marinara-engine/shared";
import { AvatarCropWidget } from "../ui/AvatarCropWidget";
import { generateClientId, cn, getAvatarCropStyle } from "../../lib/utils";

export interface StoryBundleScenariosProps {
  scenarios: StoryBundleScenario[];
  onScenariosChange: (scenarios: StoryBundleScenario[]) => void;
}

export function StoryBundleScenarios({ scenarios, onScenariosChange }: StoryBundleScenariosProps) {
  const { t } = useTranslation();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftMessage, setDraftMessage] = useState("");
  const [draftImagePath, setDraftImagePath] = useState<string | null>(null);
  const [draftAvatarCrop, setDraftAvatarCrop] = useState<AvatarCrop | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleStartAdd = () => {
    setDraftTitle("");
    setDraftMessage("");
    setDraftImagePath(null);
    setDraftAvatarCrop(null);
    setAdding(true);
    setEditingId(null);
  };

  const handleStartEdit = (scenario: StoryBundleScenario) => {
    setDraftTitle(scenario.title);
    setDraftMessage(scenario.openingMessage);
    setDraftImagePath(scenario.imagePath ?? null);
    setDraftAvatarCrop((scenario.avatarCrop as AvatarCrop) ?? null);
    setEditingId(scenario.id);
    setAdding(false);
  };

  const handleCancel = () => {
    setAdding(false);
    setEditingId(null);
    setDraftTitle("");
    setDraftMessage("");
    setDraftImagePath(null);
    setDraftAvatarCrop(null);
  };

  const handleImageSelected = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        toast.error(t("storyBundles.invalidImageType", "Please choose an image file."));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const image = typeof reader.result === "string" ? reader.result : "";
        if (!image) {
          toast.error(t("storyBundles.imageReadFailed", "Failed to read the image."));
          return;
        }
        setDraftImagePath(image);
        setDraftAvatarCrop(null);
      };
      reader.onerror = () => {
        toast.error(t("storyBundles.imageReadFailed", "Failed to read the image."));
      };
      reader.readAsDataURL(file);
    },
    [t],
  );

  const handleRemoveImage = useCallback(() => {
    setDraftImagePath(null);
    setDraftAvatarCrop(null);
  }, []);

  const handleSave = () => {
    const trimmedTitle = draftTitle.trim();
    const trimmedMessage = draftMessage.trim();
    if (!trimmedTitle || !trimmedMessage) return;

    if (editingId) {
      onScenariosChange(
        scenarios.map((s) =>
          s.id === editingId
            ? {
                ...s,
                title: trimmedTitle,
                openingMessage: trimmedMessage,
                imagePath: draftImagePath,
                avatarCrop: draftAvatarCrop,
              }
            : s,
        ),
      );
    } else {
      onScenariosChange([
        ...scenarios,
        {
          id: generateClientId(),
          title: trimmedTitle,
          openingMessage: trimmedMessage,
          imagePath: draftImagePath,
          avatarCrop: draftAvatarCrop,
        },
      ]);
    }
    handleCancel();
  };

  const handleDelete = (id: string) => {
    onScenariosChange(scenarios.filter((s) => s.id !== id));
    if (editingId === id) handleCancel();
  };

  const isEditing = adding || editingId !== null;

  return (
    <div data-testid="story-bundle-editor-scenarios" className="flex flex-col gap-6">
      {/* Add / Edit Scenario */}
      <section>
        <h3 className="mari-chrome-text-strong mb-3 text-sm font-semibold">
          {t("storyBundles.addScenarios", "Add Scenario")}
        </h3>

        {!isEditing ? (
          <button
            data-testid="story-bundle-editor-scenarios-add-button"
            onClick={handleStartAdd}
            className="flex w-full items-center gap-2 rounded-lg border border-dashed border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--muted-foreground)] transition-all hover:border-[var(--ring)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]"
          >
            <Plus size="0.875rem" />
            {t("storyBundles.scenarioAddHint", "Create a new starting scenario")}
          </button>
        ) : (
          <div className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
            <input
              data-testid="story-bundle-editor-scenarios-title-input"
              type="text"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              placeholder={t("storyBundles.scenarioTitlePlaceholder", "Scenario title…")}
              className="mari-input w-full rounded-lg border border-[var(--border)] bg-[var(--input)] px-3 py-1.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--ring)] focus:outline-none focus:ring-1 focus:ring-[var(--ring)]"
              autoFocus
            />
            <textarea
              data-testid="story-bundle-editor-scenarios-message-input"
              value={draftMessage}
              onChange={(e) => setDraftMessage(e.target.value)}
              placeholder={t("storyBundles.scenarioMessagePlaceholder", "Opening message…")}
              rows={4}
              className="mari-input w-full resize-y rounded-lg border border-[var(--border)] bg-[var(--input)] px-3 py-1.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--ring)] focus:outline-none focus:ring-1 focus:ring-[var(--ring)]"
            />

            {/* Optional Image */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div
                  data-testid="story-bundle-editor-scenarios-image-preview"
                  className={cn(
                    "relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg",
                    draftImagePath
                      ? "bg-[var(--muted)]"
                      : "bg-gradient-to-br from-[var(--primary)]/20 to-[var(--primary)]/5",
                  )}
                >
                  {draftImagePath ? (
                    <img
                      src={draftImagePath}
                      alt=""
                      className="h-full w-full object-cover"
                      style={getAvatarCropStyle(draftAvatarCrop)}
                    />
                  ) : (
                    <BookOpen size="1.125rem" className="text-[var(--muted-foreground)]" />
                  )}
                </div>
                <button
                  type="button"
                  data-testid="story-bundle-editor-scenarios-image-upload-button"
                  onClick={() => {
                    if (imageInputRef.current) {
                      imageInputRef.current.value = "";
                      imageInputRef.current.click();
                    }
                  }}
                  className="mari-chrome-control inline-flex items-center gap-1.5 px-3 py-1.5 text-xs"
                >
                  <Upload size="0.75rem" />
                  {draftImagePath
                    ? t("storyBundles.metadata.changeImage", "Change Image")
                    : t("storyBundles.metadata.uploadImage", "Upload Image")}
                </button>
                <input
                  ref={imageInputRef}
                  data-testid="story-bundle-editor-scenarios-image-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageSelected}
                />
              </div>
              {draftImagePath && (
                <AvatarCropWidget
                  src={draftImagePath}
                  alt={draftTitle}
                  crop={normalizeAvatarCrop(draftAvatarCrop)}
                  onChange={(next) => setDraftAvatarCrop(next)}
                  onRemove={handleRemoveImage}
                />
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                data-testid="story-bundle-editor-scenarios-save-button"
                onClick={handleSave}
                disabled={!draftTitle.trim() || !draftMessage.trim()}
                className="rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-medium text-[var(--primary-foreground)] transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {editingId ? t("storyBundles.scenarioSaveEdit", "Save") : t("storyBundles.scenarioSave", "Add")}
              </button>
              <button
                data-testid="story-bundle-editor-scenarios-cancel-button"
                onClick={handleCancel}
                className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs font-medium text-[var(--muted-foreground)] transition-all hover:bg-[var(--accent)]"
              >
                {t("storyBundles.cancel", "Cancel")}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Selected Scenarios */}
      <section>
        <h3 className="mari-chrome-text-strong mb-3 text-sm font-semibold">
          {t("storyBundles.selectedScenarios", "Scenarios")}
        </h3>

        {scenarios.length > 0 ? (
          <div className="space-y-1 rounded-lg border border-[var(--border)] bg-[var(--card)] p-1.5">
            {scenarios.map((scenario) => (
              <div key={scenario.id} className="flex items-center gap-2.5 rounded-md px-2 py-1.5">
                <div className="relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--accent)] text-[var(--accent-foreground)]">
                  {scenario.imagePath ? (
                    <img
                      src={scenario.imagePath}
                      alt=""
                      className="h-full w-full object-cover"
                      style={getAvatarCropStyle(normalizeAvatarCrop(scenario.avatarCrop))}
                    />
                  ) : (
                    <BookOpen size="0.75rem" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-[var(--foreground)]">{scenario.title}</div>
                  <div className="truncate text-xs text-[var(--muted-foreground)]">{scenario.openingMessage}</div>
                </div>
                <button
                  data-testid="story-bundle-editor-scenarios-edit-button"
                  onClick={() => handleStartEdit(scenario)}
                  className="shrink-0 rounded p-1 text-[var(--muted-foreground)] transition-all hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]"
                  title={t("storyBundles.scenarioEdit", "Edit")}
                >
                  <Pencil size="0.875rem" />
                </button>
                <button
                  data-testid="story-bundle-editor-scenarios-delete-button"
                  onClick={() => handleDelete(scenario.id)}
                  className="shrink-0 rounded p-1 text-[var(--muted-foreground)] transition-all hover:bg-[var(--destructive)]/10 hover:text-[var(--destructive)]"
                  title={t("storyBundles.scenarioRemove", "Remove")}
                >
                  <X size="0.875rem" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div
            data-testid="story-bundle-editor-scenarios-empty"
            className="flex items-center justify-center rounded-lg border border-dashed border-[var(--border)] bg-[var(--card)] py-6 text-sm text-[var(--muted-foreground)]"
          >
            {t("storyBundles.scenariosEmpty", "No scenarios added yet.")}
          </div>
        )}
      </section>
    </div>
  );
}
