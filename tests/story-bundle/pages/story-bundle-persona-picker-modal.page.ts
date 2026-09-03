/**
 * StoryBundlePersonaPickerModal Page Object — the "Who are you?" persona
 * confirmation modal shown by the GM (Game Mode) DirectInject flow.
 *
 * Data test IDs:
 *   story-bundle-persona-picker-modal
 *   story-bundle-persona-picker-modal-close-button
 *   story-bundle-persona-picker-option-{id}
 *   story-bundle-persona-picker-cancel
 *   story-bundle-persona-picker-confirm
 */
import { type Locator, type Page } from "@playwright/test";

export class StoryBundlePersonaPickerModalPage {
  readonly page: Page;
  readonly modal: Locator;
  readonly closeButton: Locator;
  readonly cancelButton: Locator;
  readonly confirmButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.modal = page.getByTestId("story-bundle-persona-picker-modal");
    this.closeButton = page.getByTestId("story-bundle-persona-picker-modal-close-button");
    this.cancelButton = page.getByTestId("story-bundle-persona-picker-cancel");
    this.confirmButton = page.getByTestId("story-bundle-persona-picker-confirm");
  }

  // ── Actions ───────────────────────────────────────────────

  /** Wait for the modal to become visible. */
  async waitFor(): Promise<void> {
    await this.modal.waitFor({ state: "visible", timeout: 10_000 });
  }

  /** Locator for a specific persona option by its id. */
  optionLocator(personaId: string): Locator {
    return this.page.getByTestId(`story-bundle-persona-picker-option-${personaId}`);
  }

  /** Select a persona option by its id. */
  async selectPersona(personaId: string): Promise<void> {
    await this.optionLocator(personaId).click();
  }

  /** Click "Start Adventure" to confirm and commit DirectInject. */
  async confirm(): Promise<void> {
    await this.confirmButton.click();
  }

  /** Click "Cancel" to close the modal without starting a game. */
  async cancel(): Promise<void> {
    await this.cancelButton.click();
  }
}
