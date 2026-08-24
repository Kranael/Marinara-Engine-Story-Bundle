/**
 * StoryBundleScenariosTab Page Object — the Scenarios tab within the editor.
 *
 * Data test IDs:
 *   story-bundle-editor-scenarios
 *   story-bundle-editor-scenarios-add-button
 *   story-bundle-editor-scenarios-title-input
 *   story-bundle-editor-scenarios-message-input
 *   story-bundle-editor-scenarios-save-button
 *   story-bundle-editor-scenarios-cancel-button
 *   story-bundle-editor-scenarios-edit-button
 *   story-bundle-editor-scenarios-delete-button
 *   story-bundle-editor-scenarios-empty
 *   story-bundle-editor-scenarios-image-upload-button
 *   story-bundle-editor-scenarios-image-input
 */
import { type Locator, type Page } from "@playwright/test";

export class StoryBundleScenariosTabPage {
  readonly page: Page;
  readonly section: Locator;
  readonly addButton: Locator;
  readonly titleInput: Locator;
  readonly messageInput: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly editButton: Locator;
  readonly deleteButton: Locator;
  readonly emptyState: Locator;
  readonly imageUploadButton: Locator;
  readonly imageInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.section = page.getByTestId("story-bundle-editor-scenarios");
    this.addButton = page.getByTestId("story-bundle-editor-scenarios-add-button");
    this.titleInput = page.getByTestId("story-bundle-editor-scenarios-title-input");
    this.messageInput = page.getByTestId("story-bundle-editor-scenarios-message-input");
    this.saveButton = page.getByTestId("story-bundle-editor-scenarios-save-button");
    this.cancelButton = page.getByTestId("story-bundle-editor-scenarios-cancel-button");
    this.editButton = page.getByTestId("story-bundle-editor-scenarios-edit-button");
    this.deleteButton = page.getByTestId("story-bundle-editor-scenarios-delete-button");
    this.emptyState = page.getByTestId("story-bundle-editor-scenarios-empty");
    this.imageUploadButton = page.getByTestId("story-bundle-editor-scenarios-image-upload-button");
    this.imageInput = page.getByTestId("story-bundle-editor-scenarios-image-input");
  }

  // ── Actions ───────────────────────────────────────────────

  /** Wait for the scenarios section to become visible. */
  async waitFor(): Promise<void> {
    await this.section.waitFor({ state: "visible", timeout: 5_000 });
  }

  /** Click the Add button to open the add form. */
  async clickAdd(): Promise<void> {
    await this.addButton.click();
  }

  /** Fill the scenario title input. */
  async fillTitle(title: string): Promise<void> {
    await this.titleInput.fill(title);
  }

  /** Fill the scenario opening message input. */
  async fillMessage(message: string): Promise<void> {
    await this.messageInput.fill(message);
  }

  /** Click the Save button. */
  async clickSave(): Promise<void> {
    await this.saveButton.click();
  }

  /** Click the Cancel button. */
  async clickCancel(): Promise<void> {
    await this.cancelButton.click();
  }

  /** Click the Edit button for the first scenario. */
  async clickEdit(): Promise<void> {
    await this.editButton.first().click();
  }

  /** Click the Delete button for the first scenario. */
  async clickDelete(): Promise<void> {
    await this.deleteButton.first().click();
  }

  /** Add a new scenario with the given title and opening message. */
  async addScenario(title: string, message: string): Promise<void> {
    await this.clickAdd();
    await this.fillTitle(title);
    await this.fillMessage(message);
    await this.clickSave();
  }
}
