/**
 * Story Bundle Intros — Extra Coverage Playwright E2E Tests
 *
 * Extends story-bundle-intro.test.ts with validation edge cases:
 * - Save button is disabled while the intro name is empty
 * - Save button is disabled while the intro text is empty
 * - Cancel during edit discards changes and keeps the original intro
 *
 * Each test imports its own bundle fixture and cleans it up in a finally
 * block so cleanup survives failures.
 */
import { expect, test } from "@playwright/test";
import path from "node:path";
import { BasePage } from "../pages/base.page.js";
import { HomePage } from "../../pages/home.page.js";
import { StoryBundlesPanelPage } from "../pages/story-bundles-panel.page.js";
import { StoryBundleEditorPage } from "../pages/story-bundle-editor.page.js";
import { StoryBundleIntrosTabPage } from "../pages/story-bundle-intros-tab.page.js";
import { importStoryBundleFixture } from "../helpers/story-bundle-fixture.js";

const DATA_DIR = path.resolve(import.meta.dirname, "..", "data");

/** Navigate to the app, open the panel, and click a bundle row to open its editor. */
async function openEditorForBundle(page: Parameters<typeof importStoryBundleFixture>[0], fixtureFile: string) {
  const base = new BasePage(page);
  const home = new HomePage(page);
  const panel = new StoryBundlesPanelPage(page);

  const bundle = await importStoryBundleFixture(page, path.join(DATA_DIR, fixtureFile), test.info().title);

  await base.goto();
  await home.openStoryBundlesPanel();
  await panel.waitFor();

  await panel.clickRow(bundle.name);

  const editor = new StoryBundleEditorPage(page);
  await editor.waitFor();

  return { bundle, editor };
}

test.describe("Story Bundle Intros Extra — Negative", () => {
  test("save button is disabled while the intro name is empty", async ({ page }) => {
    const { bundle, editor } = await openEditorForBundle(page, "empty.json");
    const introsTab = new StoryBundleIntrosTabPage(page);

    try {
      await editor.switchToIntros();
      await introsTab.waitFor();

      await introsTab.clickAdd();
      await introsTab.fillText("Text without a name.");

      await expect(introsTab.saveButton).toBeDisabled();
    } finally {
      await page.request.delete(`/api/story-bundles/${bundle.id}`);
    }
  });

  test("save button is disabled while the intro text is empty", async ({ page }) => {
    const { bundle, editor } = await openEditorForBundle(page, "empty.json");
    const introsTab = new StoryBundleIntrosTabPage(page);

    try {
      await editor.switchToIntros();
      await introsTab.waitFor();

      await introsTab.clickAdd();
      await introsTab.fillName("Name Without Text");

      await expect(introsTab.saveButton).toBeDisabled();
    } finally {
      await page.request.delete(`/api/story-bundles/${bundle.id}`);
    }
  });

  test("cancel during edit discards changes and keeps the original intro", async ({ page }) => {
    const { bundle, editor } = await openEditorForBundle(page, "empty.json");
    const introsTab = new StoryBundleIntrosTabPage(page);

    try {
      await editor.switchToIntros();
      await introsTab.waitFor();

      await introsTab.addIntro("Keep Me", "Original text stays.");

      await introsTab.clickEdit();
      await introsTab.fillName("Discarded Name");
      await introsTab.fillText("Discarded text.");
      await introsTab.clickCancel();

      await expect(page.getByText("Keep Me", { exact: true })).toBeVisible();
      await expect(page.getByText("Original text stays.")).toBeVisible();
      await expect(page.getByText("Discarded Name", { exact: true })).toBeHidden();
      await expect(page.getByText("Discarded text.")).toBeHidden();
    } finally {
      await page.request.delete(`/api/story-bundles/${bundle.id}`);
    }
  });
});
