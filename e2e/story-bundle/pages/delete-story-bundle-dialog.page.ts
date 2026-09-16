/**
 * Delete Story Bundle Confirmation Dialog Page Object.
 *
 * Data test IDs:
 *   story-bundle-delete-dialog
 *   story-bundle-delete-dialog-close-button
 *   app-dialog-confirm-button
 *   app-dialog-cancel-button
 */
import { type Locator, type Page } from "@playwright/test";

export class DeleteStoryBundleDialogPage {
  readonly page: Page;
  readonly dialog: Locator;
  readonly confirmButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dialog = page.getByTestId("story-bundle-delete-dialog");
    this.confirmButton = page.getByTestId("app-dialog-confirm-button");
    this.cancelButton = page.getByTestId("app-dialog-cancel-button");
  }

  // ── Actions ───────────────────────────────────────────────

  /** Wait for the dialog to appear. */
  async waitFor(): Promise<void> {
    await this.dialog.waitFor({ state: "visible", timeout: 5_000 });
  }

  /** Confirm deletion. */
  async confirm(): Promise<void> {
    await this.confirmButton.click();
  }

  /** Cancel deletion. */
  async cancel(): Promise<void> {
    await this.cancelButton.click();
  }
}
