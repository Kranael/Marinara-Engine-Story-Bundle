/**
 * StoryBundlePresetsTab Page Object — the Presets tab within the editor.
 *
 * Data test IDs:
 *   story-bundle-editor-presets
 *   story-bundle-editor-presets-search
 *   story-bundle-editor-presets-random
 *   story-bundle-editor-presets-load-more
 *   story-bundle-editor-presets-empty
 */
import { type Locator, type Page } from "@playwright/test";

export class StoryBundlePresetsTabPage {
  readonly page: Page;
  readonly section: Locator;
  readonly searchInput: Locator;
  readonly randomButton: Locator;
  readonly loadMoreButton: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    this.page = page;
    this.section = page.getByTestId("story-bundle-editor-presets");
    this.searchInput = page.getByTestId("story-bundle-editor-presets-search");
    this.randomButton = page.getByTestId("story-bundle-editor-presets-random");
    this.loadMoreButton = page.getByTestId("story-bundle-editor-presets-load-more");
    this.emptyState = page.getByTestId("story-bundle-editor-presets-empty");
  }

  // ── Actions ───────────────────────────────────────────────

  /** Wait for the presets section to become visible. */
  async waitFor(): Promise<void> {
    await this.section.waitFor({ state: "visible", timeout: 5_000 });
  }

  /** Search for a preset by name. */
  async search(query: string): Promise<void> {
    await this.searchInput.fill(query);
  }

  /** Click the Random button to pick a random preset. */
  async pickRandom(): Promise<void> {
    await this.randomButton.click();
  }

  /** Click Load More to show additional presets. */
  async loadMore(): Promise<void> {
    await this.loadMoreButton.click();
  }
}
