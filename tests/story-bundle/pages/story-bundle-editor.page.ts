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
 *   story-bundle-editor-tab-scenarios
 */
import { type Locator, type Page } from "@playwright/test";
import { switchEditorTab } from "../helpers/editor-tabs.js";

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
  readonly scenariosTab: Locator;

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
    this.scenariosTab = page.getByTestId("story-bundle-editor-tab-scenarios");
  }

  // ── Actions ───────────────────────────────────────────────

  /** Wait for the editor to become visible. */
  async waitFor(): Promise<void> {
    await this.editor.waitFor({ state: "visible", timeout: 10_000 });
  }

  /** Switch to the Metadata tab. */
  async switchToMetadata(): Promise<void> {
    await switchEditorTab(this.page, "story-bundle-editor-tab-metadata");
  }

  /** Switch to the Description tab. */
  async switchToDescription(): Promise<void> {
    await switchEditorTab(this.page, "story-bundle-editor-tab-description");
  }

  /** Switch to the Characters tab. */
  async switchToCharacters(): Promise<void> {
    await switchEditorTab(this.page, "story-bundle-editor-tab-characters");
  }

  /** Switch to the Personas tab. */
  async switchToPersonas(): Promise<void> {
    await switchEditorTab(this.page, "story-bundle-editor-tab-personas");
  }

  /** Switch to the Lorebooks tab. */
  async switchToLorebooks(): Promise<void> {
    await switchEditorTab(this.page, "story-bundle-editor-tab-lorebooks");
  }

  /** Switch to the Presets tab. */
  async switchToPresets(): Promise<void> {
    await switchEditorTab(this.page, "story-bundle-editor-tab-presets");
  }

  /** Switch to the Agents tab. */
  async switchToAgents(): Promise<void> {
    await switchEditorTab(this.page, "story-bundle-editor-tab-agents");
  }

  /** Switch to the Scenarios tab. */
  async switchToScenarios(): Promise<void> {
    await switchEditorTab(this.page, "story-bundle-editor-tab-scenarios");
  }
}
