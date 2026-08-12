/**
 * StoryBundleEditor Page Object — the full-page editor shell with tab rail.
 *
 * Data test IDs:
 *   story-bundle-editor
 *   story-bundle-editor-header
 *   story-bundle-editor-back-button
 *   story-bundle-editor-play-button
 *   story-bundle-editor-save-button
 *   story-bundle-editor-delete-button
 *   story-bundle-editor-tab-metadata
 *   story-bundle-editor-tab-description
 *   story-bundle-editor-tab-characters
 *   story-bundle-editor-tab-personas
 *   story-bundle-editor-tab-lorebooks
 *   story-bundle-editor-tab-presets
 *   story-bundle-editor-tab-agents
 *   story-bundle-editor-tab-intros
 */
import { type Locator, type Page } from "@playwright/test";

export class StoryBundleEditorPage {
  readonly page: Page;
  readonly editor: Locator;
  readonly header: Locator;
  readonly backButton: Locator;
  readonly playButton: Locator;
  readonly saveButton: Locator;
  readonly deleteButton: Locator;
  readonly metadataTab: Locator;
  readonly descriptionTab: Locator;
  readonly charactersTab: Locator;
  readonly personasTab: Locator;
  readonly lorebooksTab: Locator;
  readonly presetsTab: Locator;
  readonly agentsTab: Locator;
  readonly introsTab: Locator;

  constructor(page: Page) {
    this.page = page;
    this.editor = page.getByTestId("story-bundle-editor");
    this.header = page.getByTestId("story-bundle-editor-header");
    this.backButton = page.getByTestId("story-bundle-editor-back-button");
    this.playButton = page.getByTestId("story-bundle-editor-play-button");
    this.saveButton = page.getByTestId("story-bundle-editor-save-button");
    this.deleteButton = page.getByTestId("story-bundle-editor-delete-button");
    this.metadataTab = page.getByTestId("story-bundle-editor-tab-metadata");
    this.descriptionTab = page.getByTestId("story-bundle-editor-tab-description");
    this.charactersTab = page.getByTestId("story-bundle-editor-tab-characters");
    this.personasTab = page.getByTestId("story-bundle-editor-tab-personas");
    this.lorebooksTab = page.getByTestId("story-bundle-editor-tab-lorebooks");
    this.presetsTab = page.getByTestId("story-bundle-editor-tab-presets");
    this.agentsTab = page.getByTestId("story-bundle-editor-tab-agents");
    this.introsTab = page.getByTestId("story-bundle-editor-tab-intros");
  }

  // ── Actions ───────────────────────────────────────────────

  /** Wait for the editor to become visible. */
  async waitFor(): Promise<void> {
    await this.editor.waitFor({ state: "visible", timeout: 10_000 });
  }

  /** Switch to the Metadata tab. */
  async switchToMetadata(): Promise<void> {
    await this.metadataTab.click();
  }

  /** Switch to the Description tab. */
  async switchToDescription(): Promise<void> {
    await this.descriptionTab.click();
  }

  /** Switch to the Characters tab. */
  async switchToCharacters(): Promise<void> {
    await this.charactersTab.click();
  }

  /** Switch to the Personas tab. */
  async switchToPersonas(): Promise<void> {
    await this.personasTab.click();
  }

  /** Switch to the Lorebooks tab. */
  async switchToLorebooks(): Promise<void> {
    await this.lorebooksTab.click();
  }

  /** Switch to the Presets tab. */
  async switchToPresets(): Promise<void> {
    await this.presetsTab.click();
  }

  /** Switch to the Agents tab. */
  async switchToAgents(): Promise<void> {
    await this.agentsTab.click();
  }

  /** Switch to the Intros tab. */
  async switchToIntros(): Promise<void> {
    await this.introsTab.click();
  }
}
