// ──────────────────────────────────────────────
// Story Bundle Editor — Full-page detail view
// ──────────────────────────────────────────────
// Replaces the chat area while a story bundle is being edited. Supports a
// title field and an optional HTML description with a live preview toggle.
// ──────────────────────────────────────────────
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowLeft, BookMarked, Dices, Eye, EyeOff, FileText, FolderOpen, Loader2, Plus, Save, Search, Trash2, Users } from "lucide-react";
import DOMPurify from "dompurify";
import { useStoryBundle, useUpdateStoryBundle, useDeleteStoryBundle } from "../../hooks/use-story-bundles";
import { useCharacters, useCharacterGroups } from "../../hooks/use-characters";
import { useUIStore } from "../../stores/ui.store";
import { showConfirmDialog } from "../../lib/app-dialogs";
import { cn, getAvatarCropStyle } from "../../lib/utils";
import { characterMatchesSearch, getCharacterTitle, parseCharacterDisplayData } from "../../lib/character-display";
import type { AvatarCrop } from "@marinara-engine/shared";
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

/** Inline cropped avatar image (mirrors ChatSetupWizard pattern). */
function CroppedAvatarImage({
  src,
  alt,
  className,
  crop,
}: {
  src: string;
  alt: string;
  className: string;
  crop: AvatarCrop | null;
}) {
  return (
    <span className={cn("relative block shrink-0 overflow-hidden", className)}>
      <img src={src} alt={alt} loading="lazy" className="h-full w-full object-cover" style={getAvatarCropStyle(crop)} />
    </span>
  );
}

const CHARACTER_PICKER_PAGE_SIZE = 50;

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

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [characterIds, setCharacterIds] = useState<string[]>([]);
  const [previewDescription, setPreviewDescription] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("description");
  const [saving, setSaving] = useState(false);
  const [charSearch, setCharSearch] = useState("");
  const [characterPickerLimit, setCharacterPickerLimit] = useState(CHARACTER_PICKER_PAGE_SIZE);
  const [selectedGroupId, setSelectedGroupId] = useState("");

  // Keep the local draft in sync with the loaded bundle.
  useEffect(() => {
    if (bundle) {
      setName(bundle.name);
      setDescription(bundle.description ?? "");
      setCharacterIds(bundle.characterIds ?? []);
    }
  }, [bundle]);

  // Reset picker limit when search changes.
  useEffect(() => {
    setCharacterPickerLimit(CHARACTER_PICKER_PAGE_SIZE);
  }, [charSearch]);

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

  // ── Character helpers ──
  const getCharacterInfo = useCallback(
    (c: { data: unknown; comment?: string | null }) => parseCharacterDisplayData({ data: c.data, comment: c.comment }),
    [],
  );
  const charName = useCallback(
    (c: { id?: string; data: unknown; comment?: string | null }) => getCharacterInfo(c).name,
    [getCharacterInfo],
  );
  const charTitle = useCallback(
    (c: { id?: string; data: unknown; comment?: string | null }) => getCharacterTitle(getCharacterInfo(c)),
    [getCharacterInfo],
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

  const getAddableFolderCharacterIds = useCallback(
    (folder: { characterIds: string[] }) =>
      folder.characterIds.filter((id) => validCharacterIds.has(id) && !characterIds.includes(id)),
    [characterIds, validCharacterIds],
  );

  const toggleCharacter = useCallback(
    (charId: string) => {
      setCharacterIds((prev) => {
        const idx = prev.indexOf(charId);
        if (idx >= 0) {
          const next = [...prev];
          next.splice(idx, 1);
          return next;
        }
        return [...prev, charId];
      });
    },
    [],
  );

  const addCharactersFromGroup = useCallback(
    (folderId: string) => {
      const folder = characterFolders.find((entry) => entry.id === folderId);
      if (!folder) return;
      const newIds = getAddableFolderCharacterIds(folder);
      if (newIds.length === 0) return;
      setCharacterIds((prev) => {
        const existing = new Set(prev);
        const merged = [...prev];
        for (const id of newIds) {
          if (!existing.has(id)) merged.push(id);
        }
        return merged;
      });
    },
    [characterFolders, getAddableFolderCharacterIds],
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
              <div data-testid="story-bundle-editor-characters" className="space-y-6">
                {/* ── Selected Characters ── */}
                <div>
                  <label className="mari-chrome-text-muted mb-1.5 block text-xs font-medium">
                    {t("storyBundles.selectedCharacters", "Selected Characters")}
                  </label>
                  {characterIds.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      {characterIds.map((cid) => {
                        const c = (characters ?? []).find((ch) => ch.id === cid);
                        if (!c) return null;
                        const name = charName(c);
                        const title = charTitle(c);
                        const info = getCharacterInfo(c);
                        return (
                          <div
                            key={cid}
                            className="flex items-center gap-2.5 rounded-lg bg-[var(--primary)]/10 px-3 py-2 ring-1 ring-[var(--primary)]/30"
                          >
                            {c.avatarPath ? (
                              <CroppedAvatarImage
                                src={c.avatarPath}
                                alt={name}
                                className="h-6 w-6 rounded-full"
                                crop={info.avatarCrop ?? null}
                              />
                            ) : (
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent)] text-[0.5625rem] font-bold">
                                {name[0]}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <span className="block truncate text-xs">{name}</span>
                              {title && (
                                <span className="block truncate text-[0.625rem] italic text-[var(--muted-foreground)]">
                                  {title}
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => toggleCharacter(cid)}
                              className="flex h-5 w-5 items-center justify-center rounded-md text-[var(--muted-foreground)] transition-colors hover:bg-[var(--destructive)]/15 hover:text-[var(--destructive)]"
                              title={t("storyBundles.removeCharacter", "Remove")}
                            >
                              <Trash2 size="0.6875rem" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex min-h-[4rem] items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--card)]/40">
                      <span className="text-xs text-[var(--muted-foreground)] italic">
                        {t("storyBundles.charactersEmpty", "No characters assigned yet.")}
                      </span>
                    </div>
                  )}
                </div>

                {/* ── Groups ── */}
                {characterFolders.length > 0 && (
                  <div>
                    <label className="mari-chrome-text-muted mb-1.5 block text-xs font-medium">
                      {t("storyBundles.groups", "Groups")}
                    </label>
                    <div className="rounded-lg ring-1 ring-[var(--border)] bg-[var(--card)] overflow-hidden">
                      <div className="flex items-center gap-2 px-3 py-2">
                        <FolderOpen size="0.75rem" className="shrink-0 text-[var(--muted-foreground)]" />
                        <select
                          data-testid="story-bundle-editor-characters-group-select"
                          value={selectedGroupId}
                          onChange={(event) => setSelectedGroupId(event.target.value)}
                          className="min-w-0 flex-1 bg-transparent text-xs text-[var(--foreground)] outline-none"
                          aria-label={t("storyBundles.addFromGroup", "Add characters from group")}
                        >
                          <option value="">{t("storyBundles.addFromGroup", "Add from group…")}</option>
                          {characterFolders.map((folder) => {
                            const newCount = getAddableFolderCharacterIds(folder).length;
                            return (
                              <option key={folder.id} value={folder.id}>
                                {folder.name} ({newCount > 0 ? newCount : t("storyBundles.allAdded", "all added")})
                              </option>
                            );
                          })}
                        </select>
                        <button
                          data-testid="story-bundle-editor-characters-add-group"
                          type="button"
                          onClick={() => {
                            addCharactersFromGroup(selectedGroupId);
                            setSelectedGroupId("");
                          }}
                          disabled={!selectedGroupId}
                          className="rounded-lg bg-[var(--primary)]/15 px-2.5 py-1 text-[0.625rem] font-medium text-[var(--primary)] transition-colors hover:bg-[var(--primary)]/25 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {t("storyBundles.add", "Add")}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Add Characters ── */}
                <div>
                  <label className="mari-chrome-text-muted mb-1.5 block text-xs font-medium">
                    {t("storyBundles.addCharacters", "Add Characters")}
                  </label>
                  <div className="rounded-lg ring-1 ring-[var(--border)] bg-[var(--card)] overflow-hidden">
                    <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2">
                      <Search size="0.75rem" className="text-[var(--muted-foreground)]" />
                      <input
                        data-testid="story-bundle-editor-characters-search"
                        value={charSearch}
                        onChange={(e) => setCharSearch(e.target.value)}
                        placeholder={t("storyBundles.searchCharacters", "Search characters…")}
                        className="flex-1 bg-transparent text-xs outline-none placeholder:text-[var(--muted-foreground)]"
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {(() => {
                        const available = (characters ?? []).filter((c) => {
                          if (characterIds.includes(c.id)) return false;
                          return characterMatchesSearch(getCharacterInfo(c), charSearch);
                        });
                        const visibleAvailable = available.slice(0, characterPickerLimit);
                        const hasMoreAvailable = available.length > visibleAvailable.length;

                        const addRandomCharacter = () => {
                          const selected = new Set(characterIds);
                          const pool = (characters ?? []).filter((c) => {
                            if (selected.has(c.id)) return false;
                            return characterMatchesSearch(getCharacterInfo(c), charSearch);
                          });
                          const character = pool[Math.floor(Math.random() * pool.length)];
                          if (character) toggleCharacter(character.id);
                        };

                        return (
                          <>
                            {available.length > 0 && (
                              <button
                                type="button"
                                data-testid="story-bundle-editor-characters-random"
                                onClick={addRandomCharacter}
                                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-all hover:bg-[var(--accent)]"
                              >
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--primary)]/10 text-[var(--primary)] ring-1 ring-[var(--primary)]/25">
                                  <Dices size="0.8125rem" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <span className="block truncate text-xs">{t("storyBundles.random", "Random")}</span>
                                  <span className="block truncate text-[0.625rem] italic text-[var(--muted-foreground)]">
                                    {t("storyBundles.randomHint", "Pick a random character")}
                                  </span>
                                </div>
                                <Plus size="0.75rem" className="text-[var(--muted-foreground)]" />
                              </button>
                            )}
                            {visibleAvailable.map((c) => {
                              const name = charName(c);
                              const title = charTitle(c);
                              const info = getCharacterInfo(c);
                              return (
                                <button
                                  key={c.id}
                                  onClick={() => toggleCharacter(c.id)}
                                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-all hover:bg-[var(--accent)]"
                                >
                                  {c.avatarPath ? (
                                    <CroppedAvatarImage
                                      src={c.avatarPath}
                                      alt={name}
                                      className="h-6 w-6 rounded-full"
                                      crop={info.avatarCrop ?? null}
                                    />
                                  ) : (
                                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent)] text-[0.5625rem] font-bold">
                                      {name[0]}
                                    </div>
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <span className="block truncate text-xs">{name}</span>
                                    {title && (
                                      <span className="block truncate text-[0.625rem] italic text-[var(--muted-foreground)]">
                                        {title}
                                      </span>
                                    )}
                                  </div>
                                  <Plus size="0.75rem" className="text-[var(--muted-foreground)]" />
                                </button>
                              );
                            })}
                            {hasMoreAvailable && (
                              <button
                                type="button"
                                data-testid="story-bundle-editor-characters-load-more"
                                onClick={() => setCharacterPickerLimit((limit) => limit + CHARACTER_PICKER_PAGE_SIZE)}
                                className="w-full border-t border-[var(--border)] px-3 py-2 text-xs font-medium text-[var(--primary)] transition-colors hover:bg-[var(--primary)]/10"
                              >
                                {t("storyBundles.loadMore", "Load more")} ({visibleAvailable.length} {t("storyBundles.of", "of")} {available.length})
                              </button>
                            )}
                            {available.length === 0 && (
                              <p data-testid="story-bundle-editor-characters-empty" className="px-3 py-2 text-[0.6875rem] text-[var(--muted-foreground)]">
                                {(characters ?? []).filter((c) => !characterIds.includes(c.id)).length === 0
                                  ? t("storyBundles.allCharactersAdded", "All characters have been added.")
                                  : t("storyBundles.noCharactersMatch", "No characters match your search.")}
                              </p>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
