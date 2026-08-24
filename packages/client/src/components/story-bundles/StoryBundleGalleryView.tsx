// ──────────────────────────────────────────────
// Story Bundle Gallery — full-page card gallery
// ──────────────────────────────────────────────
// Mirrors the Character Library layout, but renders Story Bundles:
// artwork, title, and the safely-sanitized HTML description. Play,
// export, and delete reuse the shared Story Bundle action hook.
import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type UIEvent } from "react";
import { ArrowLeft, ArrowUpDown, BookMarked, Loader2, Pencil, Play, Search, Trash2, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { StoryBundle } from "@marinara-engine/shared";
import { useStoryBundles } from "../../hooks/use-story-bundles";
import { useStoryBundleActions } from "../../hooks/use-story-bundle-actions";
import {
  formatCardLibraryMeta,
  matchesCardLibrarySearch,
  parseCardLibrarySearchQuery,
} from "../../lib/card-library-search";
import { sortBasicPanelItems } from "../../lib/panel-sort";
import { sanitizeStoryBundleDescription } from "../../lib/story-bundle-html";
import { cn, getAvatarCropStyle } from "../../lib/utils";
import { useUIStore, type ResourcePanelSort } from "../../stores/ui.store";

const galleryToolbarFieldClass = "mari-chrome-field h-10 w-full text-[0.75rem] md:h-9";

/** Strip HTML tags so the raw description text is searchable and previewable. */
function stripHtmlTags(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toSearchDocument(bundle: StoryBundle) {
  return {
    name: bundle.name,
    title: bundle.comment,
    meta: formatCardLibraryMeta(bundle.creator, bundle.version),
    summary: bundle.description ? stripHtmlTags(bundle.description) : "",
    tags: bundle.tags,
  };
}

function StoryBundleGalleryDetailCard({ bundle, onEdit }: { bundle: StoryBundle; onEdit: (id: string) => void }) {
  const { t } = useTranslation();
  const { play, exportBundle, remove, playingId, exportingId } = useStoryBundleActions();
  const meta = formatCardLibraryMeta(bundle.creator, bundle.version);
  const sanitizedDescription = useMemo(
    () => (bundle.description ? sanitizeStoryBundleDescription(bundle.description) : ""),
    [bundle.description],
  );

  return (
    <div data-testid="story-bundle-gallery-detail" className="space-y-4">
      <div className="overflow-hidden rounded-[1.5rem] border border-[var(--marinara-chat-chrome-panel-border)] bg-[var(--background)]/70 shadow-[0_24px_70px_-40px_rgba(15,23,42,0.95)] sm:rounded-[2rem]">
        <div
          data-story-bundle-gallery-detail-artwork
          className={cn(
            "relative aspect-square overflow-hidden",
            !bundle.imagePath && "mari-panel-gradient-surface mari-panel-gradient--story-bundles",
          )}
        >
          {bundle.imagePath ? (
            <img
              src={bundle.imagePath}
              alt={bundle.name}
              className="h-full w-full object-cover"
              style={getAvatarCropStyle(bundle.avatarCrop)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-white">
              <BookMarked size="2.5rem" />
            </div>
          )}
        </div>

        <div className="space-y-4 p-5">
          <div className="min-w-0">
            <h2 className="truncate text-xl font-semibold text-[var(--marinara-chat-chrome-panel-title)] sm:text-2xl">
              {bundle.name}
            </h2>
            {bundle.comment && (
              <p className="mt-1 truncate text-sm italic text-[var(--marinara-chat-chrome-panel-muted)]">
                {bundle.comment}
              </p>
            )}
            {meta && (
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--marinara-chat-chrome-panel-muted)]">
                {meta}
              </p>
            )}
          </div>

          {bundle.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {bundle.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-[var(--marinara-chat-chrome-highlight-bg)] px-2 py-1 text-[0.625rem] font-medium text-[var(--marinara-chat-chrome-panel-text)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {sanitizedDescription ? (
            <div
              data-story-bundle-gallery-detail-description
              className="mari-prose prose-sm max-w-none rounded-[1.5rem] border border-[var(--marinara-chat-chrome-panel-border)] bg-[var(--marinara-chat-chrome-highlight-bg)] px-4 py-3 text-sm leading-6 text-[var(--marinara-chat-chrome-panel-text)]"
              dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
            />
          ) : (
            <p className="rounded-[1.5rem] border border-dashed border-[var(--marinara-chat-chrome-panel-border)] px-4 py-3 text-sm text-[var(--marinara-chat-chrome-panel-muted)]">
              {t("storyBundles.descriptionEmpty", "No description yet.")}
            </p>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              data-testid={`story-bundle-gallery-play-${bundle.id}`}
              onClick={() => void play(bundle)}
              disabled={playingId === bundle.id}
              className="mari-panel-gradient-button mari-panel-gradient-surface mari-panel-gradient--story-bundles flex min-h-10 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium sm:text-sm"
              title={t("storyBundles.playTitle", "Start roleplay from this story bundle")}
            >
              {playingId === bundle.id ? (
                <Loader2 size="0.875rem" className="animate-spin" />
              ) : (
                <Play size="0.875rem" />
              )}
              {t("storyBundles.play", "Play")}
            </button>
            <button
              data-testid={`story-bundle-gallery-edit-${bundle.id}`}
              onClick={() => onEdit(bundle.id)}
              className="mari-chrome-control mari-chrome-control--regular-label min-h-10 px-3 py-2 text-xs sm:text-sm"
            >
              <Pencil size="0.875rem" />
              {t("storyBundles.editBundle", "Edit Bundle")}
            </button>
            <button
              data-testid={`story-bundle-gallery-export-${bundle.id}`}
              onClick={() => void exportBundle(bundle.id, bundle.name)}
              disabled={exportingId === bundle.id}
              className="mari-chrome-control mari-chrome-control--regular-label min-h-10 px-3 py-2 text-xs sm:text-sm"
              title={t("storyBundles.export", "Export")}
            >
              {exportingId === bundle.id ? (
                <Loader2 size="0.875rem" className="animate-spin" />
              ) : (
                <Upload size="0.875rem" />
              )}
              {t("storyBundles.export", "Export")}
            </button>
            <button
              data-testid={`story-bundle-gallery-delete-${bundle.id}`}
              onClick={() => void remove(bundle.id, bundle.name)}
              className="mari-chrome-control mari-chrome-control--regular-label min-h-10 px-3 py-2 text-xs text-[var(--destructive)] sm:text-sm"
              title={t("storyBundles.delete", "Delete")}
            >
              <Trash2 size="0.875rem" />
              {t("storyBundles.delete", "Delete")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function StoryBundleGalleryView() {
  const { t } = useTranslation();
  const closeGallery = useUIStore((s) => s.closeStoryBundleGallery);
  const openStoryBundleDetail = useUIStore((s) => s.openStoryBundleDetail);
  const selectedId = useUIStore((s) => s.storyBundleGallerySelectedId);
  const setSelectedId = useUIStore((s) => s.setStoryBundleGallerySelectedId);
  const sort = useUIStore((s) => s.storyBundleGallerySort);
  const setSort = useUIStore((s) => s.setStoryBundleGallerySort);

  const [search, setSearch] = useState("");
  const { data: bundles, isLoading } = useStoryBundles();
  const galleryRootScrollRef = useRef<HTMLDivElement | null>(null);
  const galleryListScrollRef = useRef<HTMLElement | null>(null);
  const pendingGalleryScrollTopRef = useRef(0);
  const galleryScrollFrameRef = useRef<number | null>(null);

  const cards = useMemo(() => {
    const list = bundles ?? [];
    return sortBasicPanelItems(
      list,
      sort,
      (bundle) => bundle.name,
      (bundle) => bundle.createdAt,
    ).map((bundle) => ({
      bundle,
      sanitizedDescription: bundle.description ? sanitizeStoryBundleDescription(bundle.description) : "",
    }));
  }, [bundles, sort]);

  const filteredCards = useMemo(() => {
    const query = parseCardLibrarySearchQuery(search);
    return cards.filter((card) => matchesCardLibrarySearch(toSearchDocument(card.bundle), query));
  }, [cards, search]);

  const selectedCard = useMemo(
    () => filteredCards.find((card) => card.bundle.id === selectedId) ?? null,
    [filteredCards, selectedId],
  );

  useEffect(() => {
    if (selectedId && filteredCards.some((card) => card.bundle.id === selectedId)) return;
    setSelectedId(filteredCards[0]?.bundle.id ?? null);
  }, [selectedId, setSelectedId, filteredCards]);

  const getActiveGalleryScrollNode = useCallback(() => {
    const candidates = [galleryRootScrollRef.current, galleryListScrollRef.current];
    return (
      candidates.find((node) => {
        if (!node || node.scrollHeight <= node.clientHeight) return false;
        const overflowY = window.getComputedStyle(node).overflowY;
        return overflowY === "auto" || overflowY === "scroll";
      }) ??
      galleryRootScrollRef.current ??
      galleryListScrollRef.current
    );
  }, []);

  const saveGalleryScrollTop = useUIStore((s) => s.setStoryBundleGalleryScrollTop);

  const rememberGalleryScroll = useCallback(() => {
    const node = getActiveGalleryScrollNode();
    if (!node) return;
    pendingGalleryScrollTopRef.current = node.scrollTop;
    saveGalleryScrollTop(node.scrollTop);
  }, [getActiveGalleryScrollNode, saveGalleryScrollTop]);

  const handleGalleryScroll = useCallback(
    (event: UIEvent<HTMLElement>) => {
      if (event.currentTarget !== event.target) return;
      pendingGalleryScrollTopRef.current = event.currentTarget.scrollTop;
      if (galleryScrollFrameRef.current !== null) return;
      galleryScrollFrameRef.current = window.requestAnimationFrame(() => {
        galleryScrollFrameRef.current = null;
        saveGalleryScrollTop(pendingGalleryScrollTopRef.current);
      });
    },
    [saveGalleryScrollTop],
  );

  useLayoutEffect(() => {
    if (isLoading) return;
    const restoreScroll = () => {
      const scrollTop = useUIStore.getState().storyBundleGalleryScrollTop;
      for (const node of [galleryRootScrollRef.current, galleryListScrollRef.current]) {
        if (!node) continue;
        const maxScrollTop = Math.max(0, node.scrollHeight - node.clientHeight);
        node.scrollTop = Math.min(scrollTop, maxScrollTop);
      }
    };
    restoreScroll();
    const frame = window.requestAnimationFrame(restoreScroll);
    return () => window.cancelAnimationFrame(frame);
  }, [isLoading, filteredCards.length]);

  useLayoutEffect(
    () => () => {
      if (galleryScrollFrameRef.current !== null) window.cancelAnimationFrame(galleryScrollFrameRef.current);
    },
    [],
  );

  const openEditorFromGallery = (id: string) => {
    rememberGalleryScroll();
    setSelectedId(id);
    openStoryBundleDetail(id);
  };

  const handleSortChange = (value: string) => {
    setSort(value as ResourcePanelSort);
  };

  return (
    <div
      ref={galleryRootScrollRef}
      data-component="StoryBundleGalleryView"
      data-testid="story-bundle-gallery"
      onScroll={handleGalleryScroll}
      className="mari-chrome-token-scope flex h-full min-h-0 flex-col overflow-y-auto overflow-x-hidden bg-[radial-gradient(circle_at_top_left,_color-mix(in_srgb,var(--marinara-chat-chrome-accent)_14%,transparent),_transparent_30%),radial-gradient(circle_at_top_right,_color-mix(in_srgb,var(--marinara-chat-chrome-text)_10%,transparent),_transparent_26%),var(--background)] text-[var(--marinara-chat-chrome-panel-text)] lg:overflow-hidden"
    >
      <div className="sticky top-0 z-10 border-b border-[var(--marinara-chat-chrome-panel-divider)] bg-[var(--card)]/85 backdrop-blur-xl">
        <div className="flex flex-col gap-2 px-3 py-2 md:px-6 md:py-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <button
              data-testid="story-bundle-gallery-close-button"
              onClick={closeGallery}
              className="mari-chrome-control h-9 w-9 rounded-2xl p-0 md:h-10 md:w-10"
              title={t("ui.characters.characterlibraryview.closeLibrary", "Close library")}
            >
              <ArrowLeft size="0.95rem" />
            </button>
            <div className="min-w-0">
              <p className="text-[0.625rem] font-semibold uppercase tracking-[0.28em] text-[var(--marinara-chat-chrome-panel-muted)]">
                {t("storyBundles.galleryTitle", "Story Bundle Gallery")}
              </p>
              <h1 className="truncate text-base font-semibold text-[var(--marinara-chat-chrome-panel-title)] md:text-2xl">
                {t("storyBundles.galleryHeading", "Browse your story bundles")}
              </h1>
              <p className="text-xs text-[var(--marinara-chat-chrome-panel-muted)] md:text-sm">
                {filteredCards.length} {t("ui.characters.characterlibraryview.outOf", "out of")}{" "}
                {t("storyBundles.count", { count: (bundles ?? []).length, defaultValue: "{{count}} bundles" })}
              </p>
            </div>
          </div>

          <div className="grid w-full grid-cols-2 gap-1.5 sm:ml-auto sm:w-72 lg:w-80">
            <div className="relative min-w-0">
              <Search
                size="0.75rem"
                className="mari-chrome-field-icon pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2"
              />
              <input
                data-testid="story-bundle-gallery-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("storyBundles.gallerySearchPlaceholder", "Search story bundles…")}
                className={cn(galleryToolbarFieldClass, "pl-7 pr-2.5")}
              />
            </div>

            <div className="relative min-w-0">
              <select
                data-testid="story-bundle-gallery-sort"
                value={sort}
                onChange={(event) => handleSortChange(event.target.value)}
                className={cn(
                  galleryToolbarFieldClass,
                  "mari-chrome-sort-field mari-accent-animated appearance-none pl-2.5 pr-7",
                )}
              >
                <option value="name-asc">{t("ui.characters.characterlibraryview.nameAZ", "Name A-Z")}</option>
                <option value="name-desc">{t("ui.characters.characterlibraryview.nameZA", "Name Z-A")}</option>
                <option value="newest">{t("ui.characters.characterlibraryview.newest", "Newest")}</option>
                <option value="oldest">{t("ui.characters.characterlibraryview.oldest", "Oldest")}</option>
              </select>
              <ArrowUpDown
                size="0.6875rem"
                className="mari-chrome-field-icon mari-chrome-sort-icon mari-accent-animated pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-0 xl:grid-cols-[minmax(0,1.1fr)_28rem]">
        <section
          ref={galleryListScrollRef}
          onScroll={handleGalleryScroll}
          className="min-h-0 overflow-visible px-4 py-4 md:px-6 lg:overflow-y-auto"
        >
          {isLoading && (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <div key={item} className="shimmer aspect-square rounded-[1.75rem]" />
              ))}
            </div>
          )}

          {!isLoading && filteredCards.length === 0 && (
            <div className="flex min-h-[18rem] flex-col items-center justify-center gap-3 rounded-[2rem] border border-dashed border-[var(--marinara-chat-chrome-panel-border)] bg-[var(--card)]/50 p-6 text-center">
              <div className="mari-panel-gradient-surface mari-panel-gradient--story-bundles flex h-14 w-14 items-center justify-center rounded-3xl text-white">
                <BookMarked size="1.5rem" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[var(--marinara-chat-chrome-panel-title)]">
                  {(bundles ?? []).length === 0
                    ? t("storyBundles.empty", "No story bundles yet. Create your first one to get started.")
                    : t("storyBundles.galleryNoMatchHint", "Try a different search or adjust the sorting.")}
                </h2>
              </div>
            </div>
          )}

          {!isLoading && filteredCards.length > 0 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3 xl:grid-cols-3 2xl:grid-cols-4">
              {filteredCards.map((card) => {
                const bundle = card.bundle;
                const isSelected = selectedId === bundle.id;
                return (
                  <Fragment key={bundle.id}>
                    <div
                      data-story-bundle-gallery-card={bundle.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedId(bundle.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedId(bundle.id);
                        }
                      }}
                      className={cn(
                        "group flex h-full cursor-pointer flex-col items-stretch overflow-hidden rounded-[1.25rem] border bg-[var(--card)]/70 text-left shadow-[0_20px_50px_-32px_rgba(15,23,42,0.75)] transition-all hover:border-[var(--marinara-chat-chrome-button-border-hover)] hover:shadow-[0_24px_60px_-32px_color-mix(in_srgb,var(--marinara-chat-chrome-accent)_35%,transparent)] sm:rounded-[1.75rem] sm:hover:-translate-y-0.5",
                        isSelected
                          ? "border-[var(--marinara-chat-chrome-button-border-active)] ring-1 ring-[var(--marinara-chat-chrome-focus-ring)]"
                          : "border-[var(--marinara-chat-chrome-panel-border)]",
                      )}
                    >
                      <div
                        data-story-bundle-gallery-card-artwork
                        className={cn(
                          "relative aspect-square w-full shrink-0 overflow-hidden",
                          !bundle.imagePath && "mari-panel-gradient-surface mari-panel-gradient--story-bundles",
                        )}
                      >
                        {bundle.imagePath ? (
                          <img
                            src={bundle.imagePath}
                            alt={bundle.name}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                            style={getAvatarCropStyle(bundle.avatarCrop)}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-white">
                            <BookMarked size="1.5rem" className="sm:h-8 sm:w-8" />
                          </div>
                        )}
                      </div>

                      <div className="flex min-w-0 flex-1 flex-col gap-2 p-3 sm:gap-3 sm:p-4">
                        <div className="min-w-0">
                          <div
                            data-story-bundle-gallery-card-title
                            className="truncate text-sm font-semibold text-[var(--marinara-chat-chrome-panel-title)] sm:text-base"
                          >
                            {bundle.name}
                          </div>
                          {bundle.comment && (
                            <div className="mt-0.5 truncate text-[0.625rem] italic text-[var(--marinara-chat-chrome-panel-muted)] sm:mt-1 sm:text-[0.6875rem]">
                              {bundle.comment}
                            </div>
                          )}
                        </div>
                        {card.sanitizedDescription ? (
                          <div
                            data-story-bundle-gallery-card-description
                            className="mari-prose prose-sm pointer-events-none max-h-20 overflow-hidden text-[0.6875rem] leading-4 text-[var(--marinara-chat-chrome-panel-muted)] sm:max-h-24 sm:text-xs sm:leading-5"
                            dangerouslySetInnerHTML={{ __html: card.sanitizedDescription }}
                          />
                        ) : null}
                        {bundle.tags.length > 0 && (
                          <div className="mt-auto flex flex-wrap gap-1 sm:gap-1.5">
                            {bundle.tags.slice(0, 2).map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full bg-[var(--marinara-chat-chrome-highlight-bg)] px-1.5 py-0.5 text-[0.5625rem] font-medium text-[var(--marinara-chat-chrome-panel-text)] sm:px-2 sm:py-1 sm:text-[0.625rem]"
                              >
                                {tag}
                              </span>
                            ))}
                            {bundle.tags.length > 2 && (
                              <span className="rounded-full bg-[var(--marinara-chat-chrome-button-bg)] px-1.5 py-0.5 text-[0.5625rem] text-[var(--marinara-chat-chrome-panel-muted)] sm:px-2 sm:py-1 sm:text-[0.625rem]">
                                +{bundle.tags.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <div data-testid="story-bundle-gallery-detail-mobile" className="col-span-full lg:hidden">
                        <StoryBundleGalleryDetailCard bundle={bundle} onEdit={openEditorFromGallery} />
                      </div>
                    )}
                  </Fragment>
                );
              })}
            </div>
          )}
        </section>

        <aside className="hidden min-h-0 overflow-visible border-t border-[var(--marinara-chat-chrome-panel-divider)] bg-[var(--card)]/65 backdrop-blur-xl lg:block lg:overflow-y-auto lg:border-l lg:border-t-0">
          <div className="space-y-4 p-4 md:p-6">
            {selectedCard ? (
              <StoryBundleGalleryDetailCard bundle={selectedCard.bundle} onEdit={openEditorFromGallery} />
            ) : (
              <div className="flex min-h-[18rem] flex-col items-center justify-center gap-3 rounded-[2rem] border border-dashed border-[var(--marinara-chat-chrome-panel-border)] bg-[var(--background)]/65 p-6 text-center">
                <div className="mari-panel-gradient-surface mari-panel-gradient--story-bundles flex h-14 w-14 items-center justify-center rounded-3xl text-white">
                  <BookMarked size="1.5rem" />
                </div>
                <p className="text-sm text-[var(--marinara-chat-chrome-panel-muted)]">
                  {t(
                    "storyBundles.gallerySelectHint",
                    "Pick a bundle from the grid to see its artwork, title, and description.",
                  )}
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
