/**
 * Story Bundles Panel — Playwright E2E Tests
 *
 * Covers: StoryBundlesPanel component
 * - Panel renders with toolbar
 * - Create a new bundle via the prompt dialog
 * - Bundle rows render with name, date, and action pill
 * - Clicking a row opens the editor
 * - Delete a bundle with confirmation dialog
 *
 * Each test imports its own data via importStoryBundleFixture and cleans up.
 */
import { expect, test } from "@playwright/test";
import path from "node:path";
import { BasePage } from "../pages/base.page.js";
import { HomePage } from "../../pages/home.page.js";
import { StoryBundlesPanelPage } from "../pages/story-bundles-panel.page.js";
import { StoryBundleEditorPage } from "../pages/story-bundle-editor.page.js";
import { CreateStoryBundleDialogPage } from "../pages/create-story-bundle-dialog.page.js";
import { DeleteStoryBundleDialogPage } from "../pages/delete-story-bundle-dialog.page.js";
import { importStoryBundleFixture } from "../helpers/story-bundle-fixture.js";
import { StoryBundleAPI } from "../helpers/story-bundle-api.js";

const DATA_DIR = path.resolve(import.meta.dirname, "..", "data");

test.describe("Story Bundles Panel — Positive", () => {
  test("panel renders with toolbar", async ({ page }) => {
    const base = new BasePage(page);
    const home = new HomePage(page);
    const panel = new StoryBundlesPanelPage(page);

    await base.goto();
    await home.openStoryBundlesPanel();
    await panel.waitFor();

    await expect(panel.createButton).toBeVisible();
    await expect(panel.importButton).toBeVisible();
    await expect(panel.panel).toBeVisible();
  });

  test("create button opens prompt dialog and creates a bundle", async ({ page }) => {
    const base = new BasePage(page);
    const home = new HomePage(page);
    const panel = new StoryBundlesPanelPage(page);
    const createDialog = new CreateStoryBundleDialogPage(page);
    const api = new StoryBundleAPI(page);

    await base.goto();
    await home.openStoryBundlesPanel();
    await panel.waitFor();

    await panel.createButton.click();
    await createDialog.create("My Test Bundle");

    await expect(page.getByTestId("story-bundle-editor")).toBeVisible({ timeout: 10_000 });

    // Clean up.
    const bundles = await page.request.get("/api/story-bundles").then((r) => r.json());
    const created = bundles.find((b: { name: string }) => b.name === "My Test Bundle");
    if (created) await api.delete(created.id);
  });

  test("bundle row shows name, date, and action pill on hover", async ({ page }) => {
    const base = new BasePage(page);
    const home = new HomePage(page);
    const panel = new StoryBundlesPanelPage(page);
    const api = new StoryBundleAPI(page);

    const bundle = await importStoryBundleFixture(page, path.join(DATA_DIR, "empty.json"), test.info().title);

    await base.goto();
    await home.openStoryBundlesPanel();
    await panel.waitFor();

    const row = panel.rowLocator(bundle.name);
    await expect(row).toBeVisible();
    await expect(row).toContainText(/\d{1,2}\/\d{1,2}\/\d{4}/);

    await panel.hoverRow(bundle.name);

    // Play was removed from the action pill — only Export and Delete remain.
    await expect(panel.exportButtonLocator(bundle.name)).toBeVisible();
    await expect(panel.deleteButtonLocator(bundle.name)).toBeVisible();
    await expect(row.locator('[data-testid^="story-bundle-play-button-"]')).toHaveCount(0);

    await api.delete(bundle.id);
  });

  test("clicking a bundle row opens the editor", async ({ page }) => {
    const base = new BasePage(page);
    const home = new HomePage(page);
    const panel = new StoryBundlesPanelPage(page);
    const api = new StoryBundleAPI(page);

    const bundle = await importStoryBundleFixture(page, path.join(DATA_DIR, "empty.json"), test.info().title);

    await base.goto();
    await home.openStoryBundlesPanel();
    await panel.waitFor();

    await panel.clickRow(bundle.name);

    const editor = new StoryBundleEditorPage(page);
    await editor.waitFor();
    await editor.switchToMetadata();
    await expect(page.getByTestId("story-bundle-editor-metadata-name-input")).toHaveValue(bundle.name);

    await api.delete(bundle.id);
  });
});

test.describe("Story Bundles Panel — Negative", () => {
  test("delete button shows confirmation dialog and removes the bundle", async ({ page }) => {
    const base = new BasePage(page);
    const home = new HomePage(page);
    const panel = new StoryBundlesPanelPage(page);
    const deleteDialog = new DeleteStoryBundleDialogPage(page);

    const bundle = await importStoryBundleFixture(page, path.join(DATA_DIR, "empty.json"), test.info().title);

    await base.goto();
    await home.openStoryBundlesPanel();
    await panel.waitFor();

    await panel.hoverRow(bundle.name);
    await panel.clickDelete(bundle.name);

    await deleteDialog.waitFor();
    await expect(deleteDialog.dialog).toContainText(bundle.name);
    await deleteDialog.confirm();

    await expect(panel.panel).not.toContainText(bundle.name, { timeout: 5_000 });
  });
});
