/**
 * Create Story Bundle Dialog Page Object.
 *
 * Data test IDs:
 *   story-bundle-create-dialog
 *   story-bundle-create-dialog-close-button
 *   app-dialog-prompt-input
 *   app-dialog-confirm-button
 *   app-dialog-cancel-button
 */
import { type Locator, type Page } from "@playwright/test";

export class CreateStoryBundleDialogPage {
  readonly page: Page;
  readonly dialog: Locator;
  readonly nameInput: Locator;
  readonly confirmButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dialog = page.getByTestId("story-bundle-create-dialog");
    this.nameInput = page.getByTestId("app-dialog-prompt-input");
    this.confirmButton = page.getByTestId("app-dialog-confirm-button");
    this.cancelButton = page.getByTestId("app-dialog-cancel-button");
  }

  // ── Actions ───────────────────────────────────────────────

  /** Wait for the dialog to appear. */
  async waitFor(): Promise<void> {
    await this.dialog.waitFor({ state: "visible", timeout: 10_000 });
  }

  /** Wait for the dialog to close. */
  async waitForClosed(): Promise<void> {
    await this.dialog.waitFor({ state: "hidden", timeout: 5_000 });
  }

  /** Fill the name and confirm to create the bundle. */
  async create(name: string): Promise<void> {
    await this.waitFor();
    await this.nameInput.fill(name);
    await this.confirmButton.click();
    await this.waitForClosed();
  }
}
