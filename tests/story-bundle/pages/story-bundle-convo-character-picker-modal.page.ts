/**
 * StoryBundleConvoCharacterPickerModal Page Object — the "Who do you want to
 * message?" multi-select picker (Click 2 of the CONVO DirectInject flow).
 *
 * Data test IDs:
 *   story-bundle-convo-character-picker-modal
 *   story-bundle-convo-character-picker-option-{id}
 *   story-bundle-convo-character-picker-cancel
 *   story-bundle-convo-character-picker-confirm
 */
import { type Locator, type Page } from "@playwright/test";

export class StoryBundleConvoCharacterPickerModalPage {
  readonly page: Page;
  readonly modal: Locator;
  readonly cancelButton: Locator;
  readonly confirmButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.modal = page.getByTestId("story-bundle-convo-character-picker-modal");
    this.cancelButton = page.getByTestId("story-bundle-convo-character-picker-cancel");
    this.confirmButton = page.getByTestId("story-bundle-convo-character-picker-confirm");
  }

  // ── Actions ───────────────────────────────────────────────

  /** Wait for the modal to become visible. */
  async waitFor(): Promise<void> {
    await this.modal.waitFor({ state: "visible", timeout: 10_000 });
  }

  /** Locator for a specific character option by its id. */
  characterOptionLocator(characterId: string): Locator {
    return this.page.getByTestId(`story-bundle-convo-character-picker-option-${characterId}`);
  }

  /** Toggle a character option by its id. */
  async toggleCharacter(characterId: string): Promise<void> {
    await this.characterOptionLocator(characterId).click();
  }

  /** Click "Start Conversation" — commits DirectInject with the current selection. */
  async confirm(): Promise<void> {
    await this.confirmButton.click();
  }

  /** Click "Cancel" — aborts, starts nothing. */
  async cancel(): Promise<void> {
    await this.cancelButton.click();
  }
}
