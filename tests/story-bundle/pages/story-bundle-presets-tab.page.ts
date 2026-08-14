/**
 * StoryBundlePresetsTab Page Object — the Presets tab within the editor.
 *
 * Data test IDs:
 *   story-bundle-editor-presets
 *   story-bundle-editor-presets-search
 *   story-bundle-editor-presets-random
 *   story-bundle-editor-presets-load-more
 *   story-bundle-editor-presets-empty
 *   story-bundle-editor-presets-selected
 *   story-bundle-editor-presets-selected-empty
 *   story-bundle-editor-presets-add-{id}
 *   story-bundle-editor-presets-remove-{id}
 */
import { type Locator, type Page } from "@playwright/test";

export class StoryBundlePresetsTabPage {
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
    this.section = page.getByTestId("story-bundle-editor-presets");
    this.searchInput = page.getByTestId("story-bundle-editor-presets-search");
    this.randomButton = page.getByTestId("story-bundle-editor-presets-random");
    this.loadMoreButton = page.getByTestId("story-bundle-editor-presets-load-more");
    this.emptyState = page.getByTestId("story-bundle-editor-presets-empty");
    this.selectedSection = page.getByTestId("story-bundle-editor-presets-selected");
    this.selectedEmptyState = page.getByTestId("story-bundle-editor-presets-selected-empty");
    this.availableAddButtons = this.section.locator('[data-testid^="story-bundle-editor-presets-add-"]');
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

  /** Locator for the add (+) button of a specific available preset. */
  addButtonLocator(id: string): Locator {
    return this.page.getByTestId(`story-bundle-editor-presets-add-${id}`);
  }

  /** Locator for the remove (X) button of a specific selected preset. */
  removeButtonLocator(id: string): Locator {
    return this.page.getByTestId(`story-bundle-editor-presets-remove-${id}`);
  }

  /** Add a preset to the bundle via its add button. */
  async addItem(id: string): Promise<void> {
    await this.addButtonLocator(id).click();
  }

  /** Remove a preset from the bundle via its remove button. */
  async removeItem(id: string): Promise<void> {
    await this.removeButtonLocator(id).click();
  }
}
