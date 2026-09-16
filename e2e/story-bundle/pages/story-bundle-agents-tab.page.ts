/**
 * StoryBundleAgentsTab Page Object — the Agents tab within the editor.
 *
 * Data test IDs:
 *   story-bundle-editor-agents
 *   story-bundle-editor-agents-loading
 *   story-bundle-editor-agents-search
 *   story-bundle-editor-agents-random
 *   story-bundle-editor-agents-load-more
 *   story-bundle-editor-agents-empty
 *   story-bundle-editor-agents-selected
 *   story-bundle-editor-agents-selected-empty
 *   story-bundle-editor-agents-add-{id}
 *   story-bundle-editor-agents-remove-{id}
 */
import { type Locator, type Page } from "@playwright/test";

export class StoryBundleAgentsTabPage {
  readonly page: Page;
  readonly section: Locator;
  readonly loadingState: Locator;
  readonly searchInput: Locator;
  readonly randomButton: Locator;
  readonly loadMoreButton: Locator;
  readonly emptyState: Locator;
  readonly selectedSection: Locator;
  readonly selectedEmptyState: Locator;
  readonly availableAddButtons: Locator;

  constructor(page: Page) {
    this.page = page;
    this.section = page.getByTestId("story-bundle-editor-agents");
    this.loadingState = page.getByTestId("story-bundle-editor-agents-loading");
    this.searchInput = page.getByTestId("story-bundle-editor-agents-search");
    this.randomButton = page.getByTestId("story-bundle-editor-agents-random");
    this.loadMoreButton = page.getByTestId("story-bundle-editor-agents-load-more");
    this.emptyState = page.getByTestId("story-bundle-editor-agents-empty");
    this.selectedSection = page.getByTestId("story-bundle-editor-agents-selected");
    this.selectedEmptyState = page.getByTestId("story-bundle-editor-agents-selected-empty");
    this.availableAddButtons = this.section.locator('[data-testid^="story-bundle-editor-agents-add-"]');
  }

  // ── Actions ───────────────────────────────────────────────

  /** Wait for the agents section to become visible. */
  async waitFor(): Promise<void> {
    await this.section.waitFor({ state: "visible", timeout: 5_000 });
  }

  /** Search for an agent by name. */
  async search(query: string): Promise<void> {
    await this.searchInput.fill(query);
  }

  /** Click the Random button to pick a random agent. */
  async pickRandom(): Promise<void> {
    await this.randomButton.click();
  }

  /** Click Load More to show additional agents. */
  async loadMore(): Promise<void> {
    await this.loadMoreButton.click();
  }

  /** Locator for the add (+) button of a specific available agent. */
  addButtonLocator(id: string): Locator {
    return this.page.getByTestId(`story-bundle-editor-agents-add-${id}`);
  }

  /** Locator for the remove (X) button of a specific selected agent. */
  removeButtonLocator(id: string): Locator {
    return this.page.getByTestId(`story-bundle-editor-agents-remove-${id}`);
  }

  /** Add an agent to the bundle via its add button. */
  async addItem(id: string): Promise<void> {
    await this.addButtonLocator(id).click();
  }

  /** Remove an agent from the bundle via its remove button. */
  async removeItem(id: string): Promise<void> {
    await this.removeButtonLocator(id).click();
  }
}
