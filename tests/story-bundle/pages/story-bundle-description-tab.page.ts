/**
 * StoryBundleDescriptionTab Page Object — the Description tab within the editor.
 *
 * Data test IDs:
 *   story-bundle-editor-description
 *   story-bundle-editor-description-label
 *   story-bundle-editor-description-input
 *   story-bundle-editor-description-preview-toggle
 *   story-bundle-editor-description-preview
 */
import { type Locator, type Page } from "@playwright/test";

export class StoryBundleDescriptionTabPage {
  readonly page: Page;
  readonly section: Locator;
  readonly descriptionLabel: Locator;
  readonly descriptionInput: Locator;
  readonly previewToggle: Locator;
  readonly descriptionPreview: Locator;

  constructor(page: Page) {
    this.page = page;
    this.section = page.getByTestId("story-bundle-editor-description");
    this.descriptionLabel = page.getByTestId("story-bundle-editor-description-label");
    this.descriptionInput = page.getByTestId("story-bundle-editor-description-input");
    this.previewToggle = page.getByTestId("story-bundle-editor-description-preview-toggle");
    this.descriptionPreview = page.getByTestId("story-bundle-editor-description-preview").first();
  }

  // ── Actions ───────────────────────────────────────────────

  /** Wait for the description section to become visible. */
  async waitFor(): Promise<void> {
    await this.section.waitFor({ state: "visible", timeout: 5_000 });
  }

  /** Toggle between edit and preview mode. */
  async togglePreview(): Promise<void> {
    await this.previewToggle.click();
  }

  /** Enter HTML description text (switches to edit mode first if needed). */
  async setDescription(html: string): Promise<void> {
    await this.togglePreview();
    await this.descriptionInput.fill(html);
  }
}
