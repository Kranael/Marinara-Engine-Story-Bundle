/**
 * Story Bundle Intros Tab — Playwright E2E Tests
 *
 * Covers: StoryBundleIntros component within the editor
 * - Intros tab renders with add button and empty state
 * - Adding an intro shows it in the list
 * - Editing an intro updates its name and text
 * - Deleting an intro removes it from the list
 * - Cancel button dismisses the add form without saving
 *
 * Each test imports its own data via importStoryBundleFixture and cleans up.
 */
import { expect, test } from "@playwright/test";
import path from "node:path";
import { BasePage } from "../pages/base.page.js";
import { HomePage } from "../../pages/home.page.js";
import { StoryBundlesPanelPage } from "../pages/story-bundles-panel.page.js";
import { StoryBundleEditorPage } from "../pages/story-bundle-editor.page.js";
import { StoryBundleIntrosTabPage } from "../pages/story-bundle-intros-tab.page.js";
import { importStoryBundleFixture } from "../helpers/story-bundle-fixture.js";
import { StoryBundleAPI } from "../helpers/story-bundle-api.js";

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

test.describe("Story Bundle Intros — Positive", () => {
  test("intros tab renders with add button and empty state", async ({ page }) => {
    const { bundle, editor } = await openEditorForBundle(page, "empty.json");
    const introsTab = new StoryBundleIntrosTabPage(page);
    const api = new StoryBundleAPI(page);

    await editor.switchToIntros();
    await introsTab.waitFor();

    await expect(introsTab.addButton).toBeVisible();
    await expect(introsTab.emptyState).toBeVisible();

    await api.delete(bundle.id);
  });

  test("adding an intro shows it in the list", async ({ page }) => {
    const { bundle, editor } = await openEditorForBundle(page, "empty.json");
    const introsTab = new StoryBundleIntrosTabPage(page);
    const api = new StoryBundleAPI(page);

    await editor.switchToIntros();
    await introsTab.waitFor();

    await introsTab.addIntro("Greeting", "Hello there, traveler!");

    // The empty state should be gone and the intro should appear
    await expect(introsTab.emptyState).not.toBeVisible();
    await expect(page.getByText("Greeting", { exact: true })).toBeVisible();
    await expect(page.getByText("Hello there, traveler!")).toBeVisible();

    await api.delete(bundle.id);
  });

  test("editing an intro updates its name and text", async ({ page }) => {
    const { bundle, editor } = await openEditorForBundle(page, "empty.json");
    const introsTab = new StoryBundleIntrosTabPage(page);
    const api = new StoryBundleAPI(page);

    await editor.switchToIntros();
    await introsTab.waitFor();

    // Add an intro first
    await introsTab.addIntro("Original", "Original text.");

    // Edit it
    await introsTab.clickEdit();
    await introsTab.fillName("Updated");
    await introsTab.fillText("Updated text.");
    await introsTab.clickSave();

    await expect(page.getByText("Updated", { exact: true })).toBeVisible();
    await expect(page.getByText("Updated text.")).toBeVisible();
    await expect(page.getByText("Original", { exact: true })).not.toBeVisible();

    await api.delete(bundle.id);
  });

  test("deleting an intro removes it from the list", async ({ page }) => {
    const { bundle, editor } = await openEditorForBundle(page, "empty.json");
    const introsTab = new StoryBundleIntrosTabPage(page);
    const api = new StoryBundleAPI(page);

    await editor.switchToIntros();
    await introsTab.waitFor();

    // Add an intro first
    await introsTab.addIntro("ToDelete", "Will be removed.");

    // Delete it
    await introsTab.clickDelete();

    await expect(page.getByText("ToDelete", { exact: true })).not.toBeVisible();
    await expect(introsTab.emptyState).toBeVisible();

    await api.delete(bundle.id);
  });

  test("cancel button dismisses the add form without saving", async ({ page }) => {
    const { bundle, editor } = await openEditorForBundle(page, "empty.json");
    const introsTab = new StoryBundleIntrosTabPage(page);
    const api = new StoryBundleAPI(page);

    await editor.switchToIntros();
    await introsTab.waitFor();

    await introsTab.clickAdd();
    await introsTab.fillName("Cancelled");
    await introsTab.fillText("Should not appear.");
    await introsTab.clickCancel();

    // The empty state should still be visible
    await expect(introsTab.emptyState).toBeVisible();
    await expect(page.getByText("Cancelled", { exact: true })).not.toBeVisible();

    await api.delete(bundle.id);
  });
});
