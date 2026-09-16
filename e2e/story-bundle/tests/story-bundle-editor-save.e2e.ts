/**
 * Story Bundle Editor Save — Playwright E2E Tests
 *
 * Extends story-bundle-editor.test.ts, which verifies the save button
 * enables/disables but never clicks it. This suite exercises the actual
 * save round-trip:
 * - Rename the bundle in the Metadata tab, click Save, and verify the
 *   change persists via the API and the save button disables again.
 *
 * The test imports its own fixture and cleans up in a finally block so
 * cleanup survives failures.
 */
import { expect, test } from "@playwright/test";
import path from "node:path";
import { BasePage } from "../pages/base.page.js";
import { HomePage } from "../../pages/home.page.js";
import { StoryBundlesPanelPage } from "../pages/story-bundles-panel.page.js";
import { StoryBundleEditorPage } from "../pages/story-bundle-editor.page.js";
import { StoryBundleMetadataTabPage } from "../pages/story-bundle-metadata-tab.page.js";
import { importStoryBundleFixture } from "../helpers/story-bundle-fixture.js";

const DATA_DIR = path.resolve(import.meta.dirname, "..", "data");

test.describe("Story Bundle Editor Save — Positive", () => {
  test("save button persists a renamed bundle and disables again", async ({ page }) => {
    const base = new BasePage(page);
    const home = new HomePage(page);
    const panel = new StoryBundlesPanelPage(page);

    const bundle = await importStoryBundleFixture(page, path.join(DATA_DIR, "empty.json"), test.info().title);

    try {
      const newName = `Saved Bundle ${Date.now().toString(36)}-${process.env.TEST_WORKER_INDEX ?? "0"}`;

      await base.goto();
      await home.openStoryBundlesPanel();
      await panel.waitFor();

      await panel.clickRow(bundle.name);

      const editor = new StoryBundleEditorPage(page);
      await editor.waitFor();

      await editor.switchToMetadata();

      const metadataTab = new StoryBundleMetadataTabPage(page);
      await metadataTab.waitFor();

      await metadataTab.nameInput.fill(newName);

      // Dirty state enables the save button.
      await expect(editor.saveButton).toBeEnabled();

      await editor.saveButton.click();

      // Success toast appears.
      await expect(page.getByText("Story bundle saved.")).toBeVisible({ timeout: 10_000 });

      // The change persisted server-side.
      const response = await page.request.get(`/api/story-bundles/${bundle.id}`);
      expect(response.ok()).toBe(true);
      const saved = (await response.json()) as { name?: string };
      expect(saved.name).toBe(newName);

      // After the refetch syncs the draft, the save button disables again.
      await expect(editor.saveButton).toBeDisabled({ timeout: 10_000 });
    } finally {
      await page.request.delete(`/api/story-bundles/${bundle.id}`);
    }
  });
});
