/**
 * StoryBundleAssetsTab Page Object — the Assets tab within the editor.
 *
 * Data test IDs:
 *   story-bundle-editor-assets
 *   story-bundle-assets-reset
 *   story-bundle-assets-folder-status-{path}
 */
import { type Locator, type Page } from "@playwright/test";

export class StoryBundleAssetsTabPage {
  readonly page: Page;
  readonly section: Locator;
  readonly resetButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.section = page.getByTestId("story-bundle-editor-assets");
    this.resetButton = page.getByTestId("story-bundle-assets-reset");
  }

  // ── Actions ───────────────────────────────────────────────

  /** Wait for the assets section to become visible. */
  async waitFor(): Promise<void> {
    await this.section.waitFor({ state: "visible", timeout: 5_000 });
  }

  /** Locator for a folder's tri-state status button (Included/Partial/Excluded), by its game-assets path (e.g. "music" or "sfx/combat"). */
  folderStatusButton(path: string): Locator {
    return this.page.getByTestId(`story-bundle-assets-folder-status-${path}`);
  }

  /** Click a folder's status button, toggling it between included and excluded. */
  async toggleFolder(path: string): Promise<void> {
    await this.folderStatusButton(path).click();
  }

  /** Click "Reset to all" to clear every folder exclusion. */
  async resetToAll(): Promise<void> {
    await this.resetButton.click();
  }
}
