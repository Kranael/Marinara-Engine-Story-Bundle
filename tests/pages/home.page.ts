/**
 * Home Page Object — top bar navigation and main content area.
 */
import { type Locator, type Page } from "@playwright/test";

export class HomePage {
  readonly page: Page;
  readonly storyBundlesButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.storyBundlesButton = page.locator('[data-tour="panel-story-bundles"]');
  }

  /** Click the Story Bundles button in the top bar to open the right panel. */
  async openStoryBundlesPanel(): Promise<void> {
    await this.storyBundlesButton.click();
  }
}
