/**
 * Story Bundle Scenarios Tab — Playwright E2E Tests
 *
 * Covers: StoryBundleScenarios component within the editor
 * - Scenarios tab renders with add button and empty state
 * - Adding a scenario shows it in the list
 * - Editing a scenario updates its title and opening message
 * - Deleting a scenario removes it from the list
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
import { StoryBundleScenariosTabPage } from "../pages/story-bundle-scenarios-tab.page.js";
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

test.describe("Story Bundle Scenarios — Positive", () => {
  test("scenarios tab renders with add button and empty state", async ({ page }) => {
    const { bundle, editor } = await openEditorForBundle(page, "empty.json");
    const scenariosTab = new StoryBundleScenariosTabPage(page);
    const api = new StoryBundleAPI(page);

    await editor.switchToScenarios();
    await scenariosTab.waitFor();

    await expect(scenariosTab.addButton).toBeVisible();
    await expect(scenariosTab.emptyState).toBeVisible();

    await api.delete(bundle.id);
  });

  test("adding a scenario shows it in the list", async ({ page }) => {
    const { bundle, editor } = await openEditorForBundle(page, "empty.json");
    const scenariosTab = new StoryBundleScenariosTabPage(page);
    const api = new StoryBundleAPI(page);

    await editor.switchToScenarios();
    await scenariosTab.waitFor();

    await scenariosTab.addScenario("Greeting", "Hello there, traveler!");

    // The empty state should be gone and the scenario should appear
    await expect(scenariosTab.emptyState).not.toBeVisible();
    await expect(page.getByText("Greeting", { exact: true })).toBeVisible();
    await expect(page.getByText("Hello there, traveler!")).toBeVisible();

    await api.delete(bundle.id);
  });

  test("editing a scenario updates its title and opening message", async ({ page }) => {
    const { bundle, editor } = await openEditorForBundle(page, "empty.json");
    const scenariosTab = new StoryBundleScenariosTabPage(page);
    const api = new StoryBundleAPI(page);

    await editor.switchToScenarios();
    await scenariosTab.waitFor();

    // Add a scenario first
    await scenariosTab.addScenario("Original", "Original text.");

    // Edit it
    await scenariosTab.clickEdit();
    await scenariosTab.fillTitle("Updated");
    await scenariosTab.fillMessage("Updated text.");
    await scenariosTab.clickSave();

    await expect(page.getByText("Updated", { exact: true })).toBeVisible();
    await expect(page.getByText("Updated text.")).toBeVisible();
    await expect(page.getByText("Original", { exact: true })).not.toBeVisible();

    await api.delete(bundle.id);
  });

  test("deleting a scenario removes it from the list", async ({ page }) => {
    const { bundle, editor } = await openEditorForBundle(page, "empty.json");
    const scenariosTab = new StoryBundleScenariosTabPage(page);
    const api = new StoryBundleAPI(page);

    await editor.switchToScenarios();
    await scenariosTab.waitFor();

    // Add a scenario first
    await scenariosTab.addScenario("ToDelete", "Will be removed.");

    // Delete it
    await scenariosTab.clickDelete();

    await expect(page.getByText("ToDelete", { exact: true })).not.toBeVisible();
    await expect(scenariosTab.emptyState).toBeVisible();

    await api.delete(bundle.id);
  });

  test("cancel button dismisses the add form without saving", async ({ page }) => {
    const { bundle, editor } = await openEditorForBundle(page, "empty.json");
    const scenariosTab = new StoryBundleScenariosTabPage(page);
    const api = new StoryBundleAPI(page);

    await editor.switchToScenarios();
    await scenariosTab.waitFor();

    await scenariosTab.clickAdd();
    await scenariosTab.fillTitle("Cancelled");
    await scenariosTab.fillMessage("Should not appear.");
    await scenariosTab.clickCancel();

    // The empty state should still be visible
    await expect(scenariosTab.emptyState).toBeVisible();
    await expect(page.getByText("Cancelled", { exact: true })).not.toBeVisible();

    await api.delete(bundle.id);
  });
});

test.describe("Story Bundle Scenarios — Negative", () => {
  test("empty scenarios tab shows empty state", async ({ page }) => {
    const { bundle, editor } = await openEditorForBundle(page, "empty.json");
    const scenariosTab = new StoryBundleScenariosTabPage(page);
    const api = new StoryBundleAPI(page);

    await editor.switchToScenarios();
    await scenariosTab.waitFor();

    await expect(scenariosTab.emptyState).toBeVisible();

    await api.delete(bundle.id);
  });
});
