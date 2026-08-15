/**
 * StoryBundlePersonasTab Page Object — the Personas tab within the editor.
 *
 * Data test IDs:
 *   story-bundle-editor-personas
 *   story-bundle-editor-personas-search
 *   story-bundle-editor-personas-random
 *   story-bundle-editor-personas-load-more
 *   story-bundle-editor-personas-empty
 *   story-bundle-editor-personas-selected
 *   story-bundle-editor-personas-selected-empty
 *   story-bundle-editor-personas-add-{id}
 *   story-bundle-editor-personas-remove-{id}
 */
import { type Locator, type Page } from "@playwright/test";

export class StoryBundlePersonasTabPage {
  readonly page: Page;
  readonly section: Locator;
  readonly searchInput: Locator;
  readonly randomButton: Locator;
  readonly loadMoreButton: Locator;
  readonly emptyState: Locator;
  readonly selectedSection: Locator;
  readonly selectedEmptyState: Locator;
  readonly availableAddButtons: Locator;

  constructor(page: Page) {
    this.page = page;
    this.section = page.getByTestId("story-bundle-editor-personas");
    this.searchInput = page.getByTestId("story-bundle-editor-personas-search");
    this.randomButton = page.getByTestId("story-bundle-editor-personas-random");
    this.loadMoreButton = page.getByTestId("story-bundle-editor-personas-load-more");
    this.emptyState = page.getByTestId("story-bundle-editor-personas-empty");
    this.selectedSection = page.getByTestId("story-bundle-editor-personas-selected");
    this.selectedEmptyState = page.getByTestId("story-bundle-editor-personas-selected-empty");
    this.availableAddButtons = this.section.locator(
      '[data-testid^="story-bundle-editor-personas-add-"]',
    );
  }

  // ── Actions ───────────────────────────────────────────────

  /** Wait for the personas section to become visible. */
  async waitFor(): Promise<void> {
    await this.section.waitFor({ state: "visible", timeout: 5_000 });
  }

  /** Search for a persona by name. */
  async search(query: string): Promise<void> {
    await this.searchInput.fill(query);
  }

  /** Click the Random button to pick a random persona. */
  async pickRandom(): Promise<void> {
    await this.randomButton.click();
  }

  /** Click Load More to show additional personas. */
  async loadMore(): Promise<void> {
    await this.loadMoreButton.click();
  }

  /** Locator for the add (+) button of a specific available persona. */
  addButtonLocator(id: string): Locator {
    return this.page.getByTestId(`story-bundle-editor-personas-add-${id}`);
  }

  /** Locator for the remove (X) button of a specific selected persona. */
  removeButtonLocator(id: string): Locator {
    return this.page.getByTestId(`story-bundle-editor-personas-remove-${id}`);
  }

  /** Add a persona to the bundle via its add button. */
  async addItem(id: string): Promise<void> {
    await this.addButtonLocator(id).click();
  }

  /** Remove a persona from the bundle via its remove button. */
  async removeItem(id: string): Promise<void> {
    await this.removeButtonLocator(id).click();
  }
}
