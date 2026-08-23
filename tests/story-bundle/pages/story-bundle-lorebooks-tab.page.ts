/**
 * StoryBundleLorebooksTab Page Object — the Lorebooks tab within the editor.
 *
 * Data test IDs:
 *   story-bundle-editor-lorebooks
 *   story-bundle-editor-lorebooks-search
 *   story-bundle-editor-lorebooks-random
 *   story-bundle-editor-lorebooks-load-more
 *   story-bundle-editor-lorebooks-empty
 *   story-bundle-editor-lorebooks-selected
 *   story-bundle-editor-lorebooks-selected-empty
 *   story-bundle-editor-lorebooks-add-{id}
 *   story-bundle-editor-lorebooks-remove-{id}
 */
import { type Locator, type Page } from "@playwright/test";

export class StoryBundleLorebooksTabPage {
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
    this.section = page.getByTestId("story-bundle-editor-lorebooks");
    this.searchInput = page.getByTestId("story-bundle-editor-lorebooks-search");
    this.randomButton = page.getByTestId("story-bundle-editor-lorebooks-random");
    this.loadMoreButton = page.getByTestId("story-bundle-editor-lorebooks-load-more");
    this.emptyState = page.getByTestId("story-bundle-editor-lorebooks-empty");
    this.selectedSection = page.getByTestId("story-bundle-editor-lorebooks-selected");
    this.selectedEmptyState = page.getByTestId("story-bundle-editor-lorebooks-selected-empty");
    this.availableAddButtons = this.section.locator('[data-testid^="story-bundle-editor-lorebooks-add-"]');
  }

  // ── Actions ───────────────────────────────────────────────

  /** Wait for the lorebooks section to become visible. */
  async waitFor(): Promise<void> {
    await this.section.waitFor({ state: "visible", timeout: 5_000 });
  }

  /** Search for a lorebook by name. */
  async search(query: string): Promise<void> {
    await this.searchInput.fill(query);
  }

  /** Click the Random button to pick a random lorebook. */
  async pickRandom(): Promise<void> {
    await this.randomButton.click();
  }

  /** Click Load More to show additional lorebooks. */
  async loadMore(): Promise<void> {
    await this.loadMoreButton.click();
  }

  /** Locator for the add (+) button of a specific available lorebook. */
  addButtonLocator(id: string): Locator {
    return this.page.getByTestId(`story-bundle-editor-lorebooks-add-${id}`);
  }

  /** Locator for the remove (X) button of a specific selected lorebook. */
  removeButtonLocator(id: string): Locator {
    return this.page.getByTestId(`story-bundle-editor-lorebooks-remove-${id}`);
  }

  /** Add a lorebook to the bundle via its add button. */
  async addItem(id: string): Promise<void> {
    await this.addButtonLocator(id).click();
  }

  /** Remove a lorebook from the bundle via its remove button. */
  async removeItem(id: string): Promise<void> {
    await this.removeButtonLocator(id).click();
  }
}
