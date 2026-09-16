/**
 * Story Bundle Scenarios — Extra Coverage Playwright E2E Tests
 *
 * Extends story-bundle-scenario.test.ts with validation edge cases:
 * - Save button is disabled while the scenario title is empty
 * - Save button is disabled while the scenario opening message is empty
 * - Cancel during edit discards changes and keeps the original scenario
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
import { StoryBundleScenariosTabPage } from "../pages/story-bundle-scenarios-tab.page.js";
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

test.describe("Story Bundle Scenarios Extra — Negative", () => {
  test("save button is disabled while the scenario title is empty", async ({ page }) => {
    const { bundle, editor } = await openEditorForBundle(page, "empty.json");
    const scenariosTab = new StoryBundleScenariosTabPage(page);

    try {
      await editor.switchToScenarios();
      await scenariosTab.waitFor();

      await scenariosTab.clickAdd();
      await scenariosTab.fillMessage("Text without a title.");

      await expect(scenariosTab.saveButton).toBeDisabled();
    } finally {
      await page.request.delete(`/api/story-bundles/${bundle.id}`);
    }
  });

  test("save button is disabled while the scenario opening message is empty", async ({ page }) => {
    const { bundle, editor } = await openEditorForBundle(page, "empty.json");
    const scenariosTab = new StoryBundleScenariosTabPage(page);

    try {
      await editor.switchToScenarios();
      await scenariosTab.waitFor();

      await scenariosTab.clickAdd();
      await scenariosTab.fillTitle("Title Without Message");

      await expect(scenariosTab.saveButton).toBeDisabled();
    } finally {
      await page.request.delete(`/api/story-bundles/${bundle.id}`);
    }
  });

  test("cancel during edit discards changes and keeps the original scenario", async ({ page }) => {
    const { bundle, editor } = await openEditorForBundle(page, "empty.json");
    const scenariosTab = new StoryBundleScenariosTabPage(page);

    try {
      await editor.switchToScenarios();
      await scenariosTab.waitFor();

      await scenariosTab.addScenario("Keep Me", "Original text stays.");

      await scenariosTab.clickEdit();
      await scenariosTab.fillTitle("Discarded Title");
      await scenariosTab.fillMessage("Discarded text.");
      await scenariosTab.clickCancel();

      await expect(page.getByText("Keep Me", { exact: true })).toBeVisible();
      await expect(page.getByText("Original text stays.")).toBeVisible();
      await expect(page.getByText("Discarded Title", { exact: true })).toBeHidden();
      await expect(page.getByText("Discarded text.")).toBeHidden();
    } finally {
      await page.request.delete(`/api/story-bundles/${bundle.id}`);
    }
  });
});
