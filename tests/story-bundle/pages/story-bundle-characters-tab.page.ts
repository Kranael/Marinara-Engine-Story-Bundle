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
 *   story-bundle-editor-characters-selected
 *   story-bundle-editor-characters-selected-empty
 *   story-bundle-editor-characters-add-{id}
 *   story-bundle-editor-characters-remove-{id}
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
  readonly selectedSection: Locator;
  readonly selectedEmptyState: Locator;
  readonly availableAddButtons: Locator;

  constructor(page: Page) {
    this.page = page;
    this.section = page.getByTestId("story-bundle-editor-characters");
    this.searchInput = page.getByTestId("story-bundle-editor-characters-search");
    this.randomButton = page.getByTestId("story-bundle-editor-characters-random");
    this.loadMoreButton = page.getByTestId("story-bundle-editor-characters-load-more");
    this.emptyState = page.getByTestId("story-bundle-editor-characters-empty");
    this.groupSelect = page.getByTestId("story-bundle-editor-characters-group-select");
    this.addGroupButton = page.getByTestId("story-bundle-editor-characters-add-group");
    this.selectedSection = page.getByTestId("story-bundle-editor-characters-selected");
    this.selectedEmptyState = page.getByTestId("story-bundle-editor-characters-selected-empty");
    this.availableAddButtons = this.section.locator(
      '[data-testid^="story-bundle-editor-characters-add-"]:not([data-testid="story-bundle-editor-characters-add-group"])',
    );
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

  /** Locator for the add (+) button of a specific available character. */
  addButtonLocator(id: string): Locator {
    return this.page.getByTestId(`story-bundle-editor-characters-add-${id}`);
  }

  /** Locator for the remove (X) button of a specific selected character. */
  removeButtonLocator(id: string): Locator {
    return this.page.getByTestId(`story-bundle-editor-characters-remove-${id}`);
  }

  /** Add a character to the bundle via its add button. */
  async addItem(id: string): Promise<void> {
    await this.addButtonLocator(id).click();
  }

  /** Remove a character from the bundle via its remove button. */
  async removeItem(id: string): Promise<void> {
    await this.removeButtonLocator(id).click();
  }

  /** Select a character group from the group dropdown. */
  async selectGroup(id: string): Promise<void> {
    await this.groupSelect.selectOption(id);
  }

  /** Add all members of the currently selected group. */
  async addGroup(): Promise<void> {
    await this.addGroupButton.click();
  }
}
