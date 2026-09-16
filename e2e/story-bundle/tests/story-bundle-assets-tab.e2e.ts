/**
 * Story Bundle Assets Tab — Playwright E2E Tests
 *
 * Covers: StoryBundleAssets folder-scope picker within the editor
 * - Category folders render, all included by default
 * - Toggling a folder to excluded shows the excluded count and enables Save
 * - Reset to all clears every exclusion
 * - An exclusion persists via the API after Save
 *
 * Each test imports its own data via importStoryBundleFixture and cleans up.
 */
import { expect, test } from "@playwright/test";
import path from "node:path";
import { BasePage } from "../pages/base.page.js";
import { HomePage } from "../../pages/home.page.js";
import { StoryBundlesPanelPage } from "../pages/story-bundles-panel.page.js";
import { StoryBundleEditorPage } from "../pages/story-bundle-editor.page.js";
import { StoryBundleAssetsTabPage } from "../pages/story-bundle-assets-tab.page.js";
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

test.describe("Story Bundle Assets Tab — Positive", () => {
  test("category folders render, all included by default", async ({ page }) => {
    const { bundle, editor } = await openEditorForBundle(page, "empty.json");

    try {
      await editor.switchToAssets();
      const assetsTab = new StoryBundleAssetsTabPage(page);
      await assetsTab.waitFor();

      await expect(assetsTab.folderStatusButton("music")).toHaveText("Included");
      await expect(assetsTab.resetButton).toBeHidden();
    } finally {
      await page.request.delete(`/api/story-bundles/${bundle.id}`);
    }
  });

  test("toggling a folder to excluded shows the excluded count and enables Save", async ({ page }) => {
    const { bundle, editor } = await openEditorForBundle(page, "empty.json");

    try {
      await editor.switchToAssets();
      const assetsTab = new StoryBundleAssetsTabPage(page);
      await assetsTab.waitFor();

      await expect(editor.saveButton).toBeDisabled();

      await assetsTab.toggleFolder("music");

      await expect(assetsTab.folderStatusButton("music")).toHaveText("Excluded");
      await expect(page.getByText("1 folder(s) excluded")).toBeVisible();
      await expect(editor.saveButton).toBeEnabled();
    } finally {
      await page.request.delete(`/api/story-bundles/${bundle.id}`);
    }
  });

  test("reset to all clears every exclusion", async ({ page }) => {
    const { bundle, editor } = await openEditorForBundle(page, "empty.json");

    try {
      await editor.switchToAssets();
      const assetsTab = new StoryBundleAssetsTabPage(page);
      await assetsTab.waitFor();

      await assetsTab.toggleFolder("music");
      await expect(assetsTab.resetButton).toBeVisible();

      await assetsTab.resetToAll();

      await expect(assetsTab.folderStatusButton("music")).toHaveText("Included");
      await expect(assetsTab.resetButton).toBeHidden();
      await expect(editor.saveButton).toBeDisabled();
    } finally {
      await page.request.delete(`/api/story-bundles/${bundle.id}`);
    }
  });

  test("excluding a folder persists via the API after Save", async ({ page }) => {
    const { bundle, editor } = await openEditorForBundle(page, "empty.json");

    try {
      await editor.switchToAssets();
      const assetsTab = new StoryBundleAssetsTabPage(page);
      await assetsTab.waitFor();

      await assetsTab.toggleFolder("music");
      await editor.saveButton.click();

      await expect(page.getByText("Story bundle saved.")).toBeVisible({ timeout: 10_000 });

      const response = await page.request.get(`/api/story-bundles/${bundle.id}`);
      const saved = (await response.json()) as { gameAssetSelection?: { excludedFolders?: string[] } | null };
      expect(saved.gameAssetSelection?.excludedFolders).toContain("music");
    } finally {
      await page.request.delete(`/api/story-bundles/${bundle.id}`);
    }
  });
});
