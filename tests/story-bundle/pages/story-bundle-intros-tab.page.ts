/**
 * StoryBundleIntrosTab Page Object — the Intros tab within the editor.
 *
 * Data test IDs:
 *   story-bundle-editor-intros
 *   story-bundle-editor-intros-add-button
 *   story-bundle-editor-intros-name-input
 *   story-bundle-editor-intros-text-input
 *   story-bundle-editor-intros-save-button
 *   story-bundle-editor-intros-cancel-button
 *   story-bundle-editor-intros-edit-button
 *   story-bundle-editor-intros-delete-button
 *   story-bundle-editor-intros-empty
 */
import { type Locator, type Page } from "@playwright/test";

export class StoryBundleIntrosTabPage {
  readonly page: Page;
  readonly section: Locator;
  readonly addButton: Locator;
  readonly nameInput: Locator;
  readonly textInput: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly editButton: Locator;
  readonly deleteButton: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    this.page = page;
    this.section = page.getByTestId("story-bundle-editor-intros");
    this.addButton = page.getByTestId("story-bundle-editor-intros-add-button");
    this.nameInput = page.getByTestId("story-bundle-editor-intros-name-input");
    this.textInput = page.getByTestId("story-bundle-editor-intros-text-input");
    this.saveButton = page.getByTestId("story-bundle-editor-intros-save-button");
    this.cancelButton = page.getByTestId("story-bundle-editor-intros-cancel-button");
    this.editButton = page.getByTestId("story-bundle-editor-intros-edit-button");
    this.deleteButton = page.getByTestId("story-bundle-editor-intros-delete-button");
    this.emptyState = page.getByTestId("story-bundle-editor-intros-empty");
  }

  // ── Actions ───────────────────────────────────────────────

  /** Wait for the intros section to become visible. */
  async waitFor(): Promise<void> {
    await this.section.waitFor({ state: "visible", timeout: 5_000 });
  }

  /** Click the Add button to open the add form. */
  async clickAdd(): Promise<void> {
    await this.addButton.click();
  }

  /** Fill the intro name input. */
  async fillName(name: string): Promise<void> {
    await this.nameInput.fill(name);
  }

  /** Fill the intro text input. */
  async fillText(text: string): Promise<void> {
    await this.textInput.fill(text);
  }

  /** Click the Save button. */
  async clickSave(): Promise<void> {
    await this.saveButton.click();
  }

  /** Click the Cancel button. */
  async clickCancel(): Promise<void> {
    await this.cancelButton.click();
  }

  /** Click the Edit button for the first intro. */
  async clickEdit(): Promise<void> {
    await this.editButton.first().click();
  }

  /** Click the Delete button for the first intro. */
  async clickDelete(): Promise<void> {
    await this.deleteButton.first().click();
  }

  /** Add a new intro with the given name and text. */
  async addIntro(name: string, text: string): Promise<void> {
    await this.clickAdd();
    await this.fillName(name);
    await this.fillText(text);
    await this.clickSave();
  }
}
