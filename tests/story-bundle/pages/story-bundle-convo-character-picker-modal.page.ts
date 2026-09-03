/**
 * StoryBundleConvoCharacterPickerModal Page Object — the "Who do you want to
 * message?" character confirmation modal shown by the CONVO DirectInject
 * flow when a bundle has more than one character.
 *
 * Data test IDs:
 *   story-bundle-convo-character-picker-modal
 *   story-bundle-convo-character-picker-modal-close-button
 *   story-bundle-convo-character-picker-option-{id}
 *   story-bundle-convo-character-picker-cancel
 *   story-bundle-convo-character-picker-confirm
 */
import { type Locator, type Page } from "@playwright/test";

export class StoryBundleConvoCharacterPickerModalPage {
  readonly page: Page;
  readonly modal: Locator;
  readonly closeButton: Locator;
  readonly cancelButton: Locator;
  readonly confirmButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.modal = page.getByTestId("story-bundle-convo-character-picker-modal");
    this.closeButton = page.getByTestId("story-bundle-convo-character-picker-modal-close-button");
    this.cancelButton = page.getByTestId("story-bundle-convo-character-picker-cancel");
    this.confirmButton = page.getByTestId("story-bundle-convo-character-picker-confirm");
  }

  // ── Actions ───────────────────────────────────────────────

  /** Wait for the modal to become visible. */
  async waitFor(): Promise<void> {
    await this.modal.waitFor({ state: "visible", timeout: 10_000 });
  }

  /** Locator for a specific character option by its id. */
  optionLocator(characterId: string): Locator {
    return this.page.getByTestId(`story-bundle-convo-character-picker-option-${characterId}`);
  }

  /** Select a character option by its id. */
  async selectCharacter(characterId: string): Promise<void> {
    await this.optionLocator(characterId).click();
  }

  /** Click "Start Conversation" to confirm and commit DirectInject. */
  async confirm(): Promise<void> {
    await this.confirmButton.click();
  }

  /** Click "Cancel" to close the modal without starting a conversation. */
  async cancel(): Promise<void> {
    await this.cancelButton.click();
  }
}
