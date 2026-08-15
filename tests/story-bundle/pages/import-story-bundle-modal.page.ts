/**
 * Import Story Bundle Modal Page Object.
 *
 * Data test IDs:
 *   story-bundle-import-modal
 *   story-bundle-import-modal-close-button
 *   story-bundle-import-drop-zone
 *   story-bundle-import-file-input
 *   story-bundle-import-loading
 *   story-bundle-import-results
 *   story-bundle-import-skip-embedded
 *   story-bundle-import-import-all
 *   story-bundle-import-close-button
 *   story-bundle-import-missing-agents
 *   story-bundle-import-missing-agent-row
 *   story-bundle-import-install-agent
 */
import { type Locator, type Page } from "@playwright/test";

export class ImportStoryBundleModalPage {
  readonly page: Page;
  readonly modal: Locator;
  readonly dropZone: Locator;
  readonly fileInput: Locator;
  readonly loadingIndicator: Locator;
  readonly results: Locator;
  readonly skipEmbeddedButton: Locator;
  readonly importAllButton: Locator;
  readonly closeButton: Locator;
  readonly missingAgentsSection: Locator;
  readonly missingAgentRows: Locator;
  readonly installAgentButtons: Locator;

  constructor(page: Page) {
    this.page = page;
    this.modal = page.getByTestId("story-bundle-import-modal");
    this.dropZone = page.getByTestId("story-bundle-import-drop-zone");
    this.fileInput = page.getByTestId("story-bundle-import-file-input");
    this.loadingIndicator = page.getByTestId("story-bundle-import-loading");
    this.results = page.getByTestId("story-bundle-import-results");
    this.skipEmbeddedButton = page.getByTestId("story-bundle-import-skip-embedded");
    this.importAllButton = page.getByTestId("story-bundle-import-import-all");
    this.closeButton = page.getByTestId("story-bundle-import-close-button");
    this.missingAgentsSection = page.getByTestId("story-bundle-import-missing-agents");
    this.missingAgentRows = page.getByTestId("story-bundle-import-missing-agent-row");
    this.installAgentButtons = page.getByTestId("story-bundle-import-install-agent");
  }

  // ── Actions ───────────────────────────────────────────────

  /** Wait for the modal to appear. */
  async waitFor(): Promise<void> {
    await this.modal.waitFor({ state: "visible", timeout: 10_000 });
  }

  /** Wait for the modal to close. */
  async waitForClosed(): Promise<void> {
    await this.modal.waitFor({ state: "hidden", timeout: 5_000 });
  }

  /** Upload a file via the hidden file input. */
  async uploadFile(filePath: string): Promise<void> {
    await this.fileInput.setInputFiles(filePath);
  }

  /** Close the modal via the footer Close button. */
  async close(): Promise<void> {
    await this.closeButton.click();
    await this.waitForClosed();
  }
}
