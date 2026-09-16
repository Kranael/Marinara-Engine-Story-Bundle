/**
 * Story Bundles Panel — Extra Coverage Playwright E2E Tests
 *
 * Extends story-bundles-panel.test.ts with the dialog cancel paths:
 * - Cancel button in the create dialog closes it without creating a bundle
 * - Cancel button in the delete dialog keeps the bundle row
 *
 * Each test imports its own bundle fixture where needed and cleans up in a
 * finally block so cleanup survives failures.
 */
import { expect, test } from "@playwright/test";
import path from "node:path";
import { BasePage } from "../pages/base.page.js";
import { HomePage } from "../../pages/home.page.js";
import { StoryBundlesPanelPage } from "../pages/story-bundles-panel.page.js";
import { CreateStoryBundleDialogPage } from "../pages/create-story-bundle-dialog.page.js";
import { DeleteStoryBundleDialogPage } from "../pages/delete-story-bundle-dialog.page.js";
import { importStoryBundleFixture } from "../helpers/story-bundle-fixture.js";

const DATA_DIR = path.resolve(import.meta.dirname, "..", "data");

test.describe("Story Bundles Panel Extra — Negative", () => {
  test("cancel button in the create dialog closes it without creating a bundle", async ({ page }) => {
    const base = new BasePage(page);
    const home = new HomePage(page);
    const panel = new StoryBundlesPanelPage(page);
    const createDialog = new CreateStoryBundleDialogPage(page);

    // Unique name so no other worker's bundle can satisfy the assertion.
    const cancelledName = `Cancelled Bundle ${Date.now().toString(36)}-${process.env.TEST_WORKER_INDEX ?? "0"}`;

    await base.goto();
    await home.openStoryBundlesPanel();
    await panel.waitFor();

    await panel.createButton.click();
    await createDialog.waitFor();
    await createDialog.nameInput.fill(cancelledName);
    await createDialog.cancelButton.click();

    await createDialog.waitForClosed();
    await expect(panel.rowLocator(cancelledName)).toHaveCount(0);
  });

  test("cancel button in the delete dialog keeps the bundle row", async ({ page }) => {
    const base = new BasePage(page);
    const home = new HomePage(page);
    const panel = new StoryBundlesPanelPage(page);
    const deleteDialog = new DeleteStoryBundleDialogPage(page);

    const bundle = await importStoryBundleFixture(page, path.join(DATA_DIR, "empty.json"), test.info().title);

    try {
      await base.goto();
      await home.openStoryBundlesPanel();
      await panel.waitFor();

      await expect(panel.rowLocator(bundle.name)).toBeVisible();

      await panel.hoverRow(bundle.name);
      await panel.clickDelete(bundle.name);

      await deleteDialog.waitFor();
      await deleteDialog.cancel();

      await expect(deleteDialog.dialog).toBeHidden();
      await expect(panel.rowLocator(bundle.name)).toBeVisible();
    } finally {
      await page.request.delete(`/api/story-bundles/${bundle.id}`);
    }
  });
});
