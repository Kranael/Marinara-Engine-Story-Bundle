/**
 * StoryBundlesPanel Page Object — the right-sidebar panel listing all story bundles.
 *
 * Data test IDs:
 *   story-bundles-panel
 *   story-bundles-create-button
 *   story-bundles-import-button
 *   story-bundle-row-{id}
 *   story-bundle-export-button-{id}
 *   story-bundle-delete-button-{id}
 */
import { type Locator, type Page } from "@playwright/test";

export class StoryBundlesPanelPage {
  readonly page: Page;
  readonly panel: Locator;
  readonly createButton: Locator;
  readonly importButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.panel = page.getByTestId("story-bundles-panel");
    this.createButton = page.getByTestId("story-bundles-create-button");
    this.importButton = page.getByTestId("story-bundles-import-button");
  }

  // ── Helpers ───────────────────────────────────────────────

  /**
   * Locate a bundle row by exact name.
   * Rows use dynamic data-testid="story-bundle-row-{id}" so we scope
   * by the prefix and filter by exact text content.
   */
  rowLocator(name: string): Locator {
    return this.panel
      .locator('[data-testid^="story-bundle-row-"]')
      .filter({ has: this.page.getByText(name, { exact: true }) });
  }

  /** Locate the export button inside a row's action pill. */
  exportButtonLocator(name: string): Locator {
    return this.rowLocator(name).locator('[data-testid^="story-bundle-export-button-"]');
  }

  /** Locate the delete button inside a row's action pill. */
  deleteButtonLocator(name: string): Locator {
    return this.rowLocator(name).locator('[data-testid^="story-bundle-delete-button-"]');
  }

  // ── Actions ───────────────────────────────────────────────

  /** Wait for the panel to become visible. */
  async waitFor(): Promise<void> {
    await this.panel.waitFor({ state: "visible", timeout: 30_000 });
  }

  /** Click a bundle row by name to open its editor. */
  async clickRow(name: string): Promise<void> {
    await this.rowLocator(name).click();
  }

  /** Hover a row to reveal the action pill. */
  async hoverRow(name: string): Promise<void> {
    await this.rowLocator(name).hover();
  }

  /** Click the export button for a bundle. */
  async clickExport(name: string): Promise<void> {
    await this.exportButtonLocator(name).click();
  }

  /** Click the delete button for a bundle. */
  async clickDelete(name: string): Promise<void> {
    await this.deleteButtonLocator(name).click();
  }
}
