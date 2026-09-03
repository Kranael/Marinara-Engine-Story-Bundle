// ──────────────────────────────────────────────
// Story Bundle Builder — Game Config Form (genre / setting / tone)
// ──────────────────────────────────────────────
// End-users never fill these in — the creator sets them once, here, before
// export. DirectInject reads them at play time; export is blocked until all
// three are non-empty (see StoryBundlesPanel/StoryBundleGalleryView export
// button disabled state).
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Sparkles } from "lucide-react";
import {
  generateGameConfigFromLore,
  type GameConfigSourceCharacter,
  type GameConfigSourceLorebookEntry,
} from "../../lib/story-bundle-game-config-generation";

export interface StoryBundleGameConfigFormProps {
  genre: string;
  onGenreChange: (value: string) => void;
  setting: string;
  onSettingChange: (value: string) => void;
  tone: string;
  onToneChange: (value: string) => void;
  /** The bundle's currently assigned characters, sampled for "Generate from Lore". */
  characters: GameConfigSourceCharacter[];
  /** The bundle's currently assigned lorebooks' entries, sampled for "Generate from Lore". */
  lorebookEntries: GameConfigSourceLorebookEntry[];
  /** Connection to run the one-off generation with, or null if none is configured. */
  connectionId: string | null;
}

const FIELD_INPUT_CLASS =
  "w-full rounded-xl border border-[var(--border)] bg-[var(--secondary)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)]/40 focus:ring-1 focus:ring-[var(--primary)]/20";

function RequiredFieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs font-medium text-[var(--muted-foreground)]">
      {children} <span className="text-[var(--destructive)]">*</span>
    </span>
  );
}

export function StoryBundleGameConfigForm({
  genre,
  onGenreChange,
  setting,
  onSettingChange,
  tone,
  onToneChange,
  characters,
  lorebookEntries,
  connectionId,
}: StoryBundleGameConfigFormProps) {
  const { t } = useTranslation();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const canGenerate = !isGenerating && !!connectionId;

  const handleGenerate = async () => {
    if (!connectionId || isGenerating) return;
    setIsGenerating(true);
    setGenerationError(null);
    try {
      const generated = await generateGameConfigFromLore({ characters, entries: lorebookEntries, connectionId });
      onGenreChange(generated.genre);
      onSettingChange(generated.setting);
      onToneChange(generated.tone);
    } catch (error) {
      setGenerationError(
        error instanceof Error
          ? error.message
          : t("storyBundles.gameConfig.generateFailed", "Failed to generate from lore."),
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div data-testid="story-bundle-editor-gameconfig" className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h4 className="text-xs font-semibold text-[var(--foreground)]">
            {t("storyBundles.gameConfig.title", "Game Config")}
          </h4>
          <p className="text-[0.6875rem] text-[var(--muted-foreground)]">
            {t(
              "storyBundles.gameConfig.hint",
              "Required before export \u2014 end-users won't be asked to fill these in.",
            )}
          </p>
        </div>
        <button
          type="button"
          data-testid="story-bundle-editor-gameconfig-generate-button"
          onClick={() => void handleGenerate()}
          disabled={!canGenerate}
          title={
            connectionId
              ? t("storyBundles.gameConfig.generateTitle", "Generate genre/setting/tone from attached lore")
              : t("storyBundles.gameConfig.noConnection", "Configure a connection first")
          }
          className="flex shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:bg-[var(--secondary)] disabled:text-[var(--muted-foreground)] enabled:bg-[var(--secondary)] enabled:text-[var(--foreground)] enabled:ring-1 enabled:ring-[var(--border)] enabled:hover:bg-[var(--accent)] enabled:active:scale-[0.98]"
        >
          {isGenerating ? <Loader2 size="0.8125rem" className="animate-spin" /> : <Sparkles size="0.8125rem" />}
          {isGenerating
            ? t("storyBundles.gameConfig.generating", "Generating\u2026")
            : t("storyBundles.gameConfig.generateFromLore", "Generate from Lore")}
        </button>
      </div>

      {generationError && (
        <p data-testid="story-bundle-editor-gameconfig-generate-error" className="text-xs text-[var(--destructive)]">
          {generationError}
        </p>
      )}

      <label className="space-y-1.5">
        <RequiredFieldLabel>{t("storyBundles.gameConfig.genre", "Genre")}</RequiredFieldLabel>
        <input
          data-testid="story-bundle-editor-gameconfig-genre-input"
          value={genre}
          onChange={(e) => onGenreChange(e.target.value)}
          placeholder={t("storyBundles.gameConfig.genrePlaceholder", "e.g. Dark Fantasy")}
          className={FIELD_INPUT_CLASS}
        />
        {!genre.trim() && (
          <p className="text-[0.625rem] text-[var(--destructive)]">
            {t("storyBundles.gameConfig.genreRequired", "Genre is required before this bundle can be exported.")}
          </p>
        )}
      </label>

      <label className="space-y-1.5">
        <RequiredFieldLabel>{t("storyBundles.gameConfig.setting", "Setting")}</RequiredFieldLabel>
        <input
          data-testid="story-bundle-editor-gameconfig-setting-input"
          value={setting}
          onChange={(e) => onSettingChange(e.target.value)}
          placeholder={t("storyBundles.gameConfig.settingPlaceholder", "e.g. A war-torn kingdom of ancient ruins")}
          className={FIELD_INPUT_CLASS}
        />
        {!setting.trim() && (
          <p className="text-[0.625rem] text-[var(--destructive)]">
            {t("storyBundles.gameConfig.settingRequired", "Setting is required before this bundle can be exported.")}
          </p>
        )}
      </label>

      <label className="space-y-1.5">
        <RequiredFieldLabel>{t("storyBundles.gameConfig.tone", "Tone")}</RequiredFieldLabel>
        <input
          data-testid="story-bundle-editor-gameconfig-tone-input"
          value={tone}
          onChange={(e) => onToneChange(e.target.value)}
          placeholder={t("storyBundles.gameConfig.tonePlaceholder", "e.g. Heroic and hopeful")}
          className={FIELD_INPUT_CLASS}
        />
        {!tone.trim() && (
          <p className="text-[0.625rem] text-[var(--destructive)]">
            {t("storyBundles.gameConfig.toneRequired", "Tone is required before this bundle can be exported.")}
          </p>
        )}
      </label>
    </div>
  );
}
