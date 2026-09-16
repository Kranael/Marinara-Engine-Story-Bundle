/**
 * StoryBundleMetadataTab Page Object — the Metadata tab within the editor.
 *
 * Data test IDs:
 *   story-bundle-editor-metadata
 *   story-bundle-editor-metadata-avatar
 *   story-bundle-editor-metadata-avatar-preview
 *   story-bundle-editor-metadata-upload-button
 *   story-bundle-editor-metadata-bundle-id
 *   story-bundle-editor-metadata-name-input
 *   story-bundle-editor-metadata-comment-input
 *   story-bundle-editor-metadata-creator-input
 *   story-bundle-editor-metadata-version-input
 *   story-bundle-editor-metadata-tags
 *   story-bundle-editor-metadata-tags-list
 *   story-bundle-editor-metadata-tags-remove-all
 *   story-bundle-editor-metadata-tag-input
 *   story-bundle-editor-metadata-tag-add-button
 *   story-bundle-editor-metadata-image-input
 *   avatar-crop-remove-button
 */
import { type Locator, type Page } from "@playwright/test";

export class StoryBundleMetadataTabPage {
  readonly page: Page;
  readonly section: Locator;
  readonly avatarSection: Locator;
  readonly avatarPreview: Locator;
  readonly uploadButton: Locator;
  readonly bundleId: Locator;
  readonly nameInput: Locator;
  readonly commentInput: Locator;
  readonly creatorInput: Locator;
  readonly versionInput: Locator;
  readonly tagsSection: Locator;
  readonly tagsList: Locator;
  readonly tagsRemoveAll: Locator;
  readonly tagInput: Locator;
  readonly tagAddButton: Locator;
  readonly imageInput: Locator;
  readonly avatarCropRemoveButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.section = page.getByTestId("story-bundle-editor-metadata");
    this.avatarSection = page.getByTestId("story-bundle-editor-metadata-avatar");
    this.avatarPreview = page.getByTestId("story-bundle-editor-metadata-avatar-preview");
    this.uploadButton = page.getByTestId("story-bundle-editor-metadata-upload-button");
    this.bundleId = page.getByTestId("story-bundle-editor-metadata-bundle-id");
    this.nameInput = page.getByTestId("story-bundle-editor-metadata-name-input");
    this.commentInput = page.getByTestId("story-bundle-editor-metadata-comment-input");
    this.creatorInput = page.getByTestId("story-bundle-editor-metadata-creator-input");
    this.versionInput = page.getByTestId("story-bundle-editor-metadata-version-input");
    this.tagsSection = page.getByTestId("story-bundle-editor-metadata-tags");
    this.tagsList = page.getByTestId("story-bundle-editor-metadata-tags-list");
    this.tagsRemoveAll = page.getByTestId("story-bundle-editor-metadata-tags-remove-all");
    this.tagInput = page.getByTestId("story-bundle-editor-metadata-tag-input");
    this.tagAddButton = page.getByTestId("story-bundle-editor-metadata-tag-add-button");
    this.imageInput = page.getByTestId("story-bundle-editor-metadata-image-input");
    this.avatarCropRemoveButton = page.getByTestId("avatar-crop-remove-button");
  }

  // ── Actions ───────────────────────────────────────────────

  /** Wait for the metadata section to become visible. */
  async waitFor(): Promise<void> {
    await this.section.waitFor({ state: "visible", timeout: 5_000 });
  }

  /** Get a locator for a specific tag chip by its label. */
  tagChip(label: string): Locator {
    return this.page.getByTestId(`story-bundle-editor-metadata-tag-${label}`);
  }

  /** Add a tag by typing and clicking Add. */
  async addTag(label: string): Promise<void> {
    await this.tagInput.fill(label);
    await this.tagAddButton.click();
  }

  /** Remove a tag by clicking its X button. */
  async removeTag(label: string): Promise<void> {
    const chip = this.tagChip(label);
    await chip.getByRole("button").click();
  }

  /** Remove every tag via the Remove All button. */
  async removeAllTags(): Promise<void> {
    await this.tagsRemoveAll.click();
  }

  /** Upload an image file through the hidden file input. */
  async uploadImage(filePath: string): Promise<void> {
    await this.imageInput.setInputFiles(filePath);
  }
}
