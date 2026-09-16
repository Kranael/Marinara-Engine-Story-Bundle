/**
 * Import Story Bundle Modal Page Object.
 *
 * Data test IDs:
 *   story-bundle-import-modal
 *   story-bundle-import-drop-zone
 *   story-bundle-import-file-input
 *   story-bundle-import-loading
 *   story-bundle-import-results
 *   story-bundle-import-close-button
 */
import { type Locator, type Page } from "@playwright/test";

export class ImportStoryBundleModalPage {
  readonly page: Page;
  readonly modal: Locator;
  readonly dropZone: Locator;
  readonly fileInput: Locator;
  readonly loadingIndicator: Locator;
  readonly results: Locator;
  readonly closeButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.modal = page.getByTestId("story-bundle-import-modal");
    this.dropZone = page.getByTestId("story-bundle-import-drop-zone");
    this.fileInput = page.getByTestId("story-bundle-import-file-input");
    this.loadingIndicator = page.getByTestId("story-bundle-import-loading");
    this.results = page.getByTestId("story-bundle-import-results");
    this.closeButton = page.getByTestId("story-bundle-import-close-button");
  }

  // ── Actions ───────────────────────────────────────────────

  /** Wait for the modal to appear. */
  async waitFor(): Promise<void> {
    await this.modal.waitFor({ state: "visible", timeout: 10_000 });
  }

  /** Wait for the modal to close. */
  async waitForClosed(): Promise<void> {
    await this.modal.waitFor({ state: "hidden", timeout: 5_000 });
  }

  /** Upload a file via the hidden file input. */
  async uploadFile(filePath: string): Promise<void> {
    await this.fileInput.setInputFiles(filePath);
  }

  /** Close the modal via the footer Close button. */
  async close(): Promise<void> {
    await this.closeButton.click();
    await this.waitForClosed();
  }
}
