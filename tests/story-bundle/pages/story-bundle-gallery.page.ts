/**
 * StoryBundleGallery Page Object — the full-page Story Bundle card gallery.
 *
 * Data attributes / test IDs:
 *   [data-component="StoryBundleGalleryView"]
 *   story-bundle-gallery
 *   story-bundle-gallery-close-button
 *   story-bundle-gallery-search
 *   story-bundle-gallery-sort
 *   [data-story-bundle-gallery-card="{id}"]
 *   [data-story-bundle-gallery-card-artwork]
 *   [data-story-bundle-gallery-card-title]
 *   [data-story-bundle-gallery-card-description]
 *   story-bundle-gallery-detail
 *   story-bundle-gallery-play-{id}
 *   story-bundle-gallery-edit-{id}
 *   story-bundle-gallery-export-{id}
 *   story-bundle-gallery-delete-{id}
 */
import { type Locator, type Page } from "@playwright/test";

export class StoryBundleGalleryPage {
  readonly page: Page;
  readonly gallery: Locator;
  readonly closeButton: Locator;
  readonly searchField: Locator;
  readonly sortSelect: Locator;
  readonly detail: Locator;

  constructor(page: Page) {
    this.page = page;
    this.gallery = page.locator('[data-component="StoryBundleGalleryView"]');
    this.closeButton = page.getByTestId("story-bundle-gallery-close-button");
    this.searchField = page.getByTestId("story-bundle-gallery-search");
    this.sortSelect = page.getByTestId("story-bundle-gallery-sort");
    // The detail card renders in two places (mobile inline slot + desktop
    // aside). Scope to the aside so the locator stays unambiguous.
    this.detail = this.gallery.locator("aside").getByTestId("story-bundle-gallery-detail");
  }

  // ── Helpers ───────────────────────────────────────────────

  /** Locate a gallery card by exact bundle name (title text). */
  cardLocator(name: string): Locator {
    return this.gallery
      .locator("[data-story-bundle-gallery-card]")
      .filter({ has: this.page.getByText(name, { exact: true }) });
  }

  /**
   * The detail card renders twice in the DOM (mobile inline + desktop aside),
   * with exactly one visible per viewport, and only for the selected bundle.
   * Return the visible instance so clicks don't hit Playwright strict-mode
   * ambiguity.
   */
  private visibleDetailAction(prefix: string): Locator {
    return this.gallery.locator(`[data-testid^="${prefix}"]`).locator("visible=true");
  }

  /** Locate the Play button inside the visible detail card. */
  playButton(): Locator {
    return this.visibleDetailAction("story-bundle-gallery-play-");
  }

  /** Locate the Export button inside the visible detail card. */
  exportButton(): Locator {
    return this.visibleDetailAction("story-bundle-gallery-export-");
  }

  /** Locate the Delete button inside the visible detail card. */
  deleteButton(): Locator {
    return this.visibleDetailAction("story-bundle-gallery-delete-");
  }

  /** Locate the Edit button inside the visible detail card. */
  editButton(): Locator {
    return this.visibleDetailAction("story-bundle-gallery-edit-");
  }

  // ── Actions ───────────────────────────────────────────────

  /** Wait for the gallery to become visible. */
  async waitFor(): Promise<void> {
    await this.gallery.waitFor({ state: "visible", timeout: 30_000 });
  }

  /** Click a gallery card by bundle name to select it. */
  async clickCard(name: string): Promise<void> {
    await this.cardLocator(name).click();
  }

  /**
   * Open the gallery from the Story Bundles panel. Assumes the panel is
   * already open and visible.
   */
  async openFromPanel(): Promise<void> {
    await this.page.getByTestId("story-bundles-gallery-button").click();
    await this.waitFor();
  }
}
