/**
 * StoryBundleCharactersTab Page Object — the Characters tab within the editor.
 *
 * Data test IDs:
 *   story-bundle-editor-characters
 *   story-bundle-editor-characters-search
 *   story-bundle-editor-characters-random
 *   story-bundle-editor-characters-load-more
 *   story-bundle-editor-characters-empty
 *   story-bundle-editor-characters-group-select
 *   story-bundle-editor-characters-add-group
 */
import { type Locator, type Page } from "@playwright/test";

export class StoryBundleCharactersTabPage {
  readonly page: Page;
  readonly section: Locator;
  readonly searchInput: Locator;
  readonly randomButton: Locator;
  readonly loadMoreButton: Locator;
  readonly emptyState: Locator;
  readonly groupSelect: Locator;
  readonly addGroupButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.section = page.getByTestId("story-bundle-editor-characters");
    this.searchInput = page.getByTestId("story-bundle-editor-characters-search");
    this.randomButton = page.getByTestId("story-bundle-editor-characters-random");
    this.loadMoreButton = page.getByTestId("story-bundle-editor-characters-load-more");
    this.emptyState = page.getByTestId("story-bundle-editor-characters-empty");
    this.groupSelect = page.getByTestId("story-bundle-editor-characters-group-select");
    this.addGroupButton = page.getByTestId("story-bundle-editor-characters-add-group");
  }

  // ── Actions ───────────────────────────────────────────────

  /** Wait for the characters section to become visible. */
  async waitFor(): Promise<void> {
    await this.section.waitFor({ state: "visible", timeout: 5_000 });
  }

  /** Search for a character by name. */
  async search(query: string): Promise<void> {
    await this.searchInput.fill(query);
  }

  /** Click the Random button to pick a random character. */
  async pickRandom(): Promise<void> {
    await this.randomButton.click();
  }

  /** Click Load More to show additional characters. */
  async loadMore(): Promise<void> {
    await this.loadMoreButton.click();
  }
}
