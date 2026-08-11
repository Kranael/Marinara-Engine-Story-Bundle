/**
 * Story Bundle Metadata Tab — Playwright E2E Tests
 *
 * Covers: StoryBundleMetadata component
 * - Metadata tab renders with avatar, bundle ID, name, comment, creator, version, tags
 * - Bundle ID is displayed as read-only
 * - Name change enables save button
 * - Tag add/remove works
 * - Version history shows empty state initially
 * - Version history shows entries after save (auto-snapshot)
 * - Version reset (delete all) works
 *
 * Each test imports its own data via importStoryBundleFixture and cleans up.
 */
import { expect, test } from "@playwright/test";
import path from "node:path";
import { BasePage } from "../pages/base.page.js";
import { HomePage } from "../../pages/home.page.js";
import { StoryBundlesPanelPage } from "../pages/story-bundles-panel.page.js";
import { StoryBundleEditorPage } from "../pages/story-bundle-editor.page.js";
import { StoryBundleMetadataTabPage } from "../pages/story-bundle-metadata-tab.page.js";
import { importStoryBundleFixture } from "../helpers/story-bundle-fixture.js";
import { StoryBundleAPI } from "../helpers/story-bundle-api.js";

const DATA_DIR = path.resolve(import.meta.dirname, "..", "data");

/** Navigate to the app, open the panel, click a bundle row, and switch to the metadata tab. */
async function openMetadataTab(page: Parameters<typeof importStoryBundleFixture>[0], fixtureFile: string) {
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

  // Metadata is the default tab, but click it to be sure
  await editor.switchToMetadata();

  const metadataTab = new StoryBundleMetadataTabPage(page);
  await metadataTab.waitFor();

  return { bundle, editor, metadataTab };
}

test.describe("Story Bundle Metadata — Positive", () => {
  test("metadata tab renders with all fields", async ({ page }) => {
    const { bundle, metadataTab } = await openMetadataTab(page, "empty.json");
    const api = new StoryBundleAPI(page);

    await expect(metadataTab.section).toBeVisible();
    await expect(metadataTab.avatarSection).toBeVisible();
    await expect(metadataTab.avatarPreview).toBeVisible();
    await expect(metadataTab.uploadButton).toBeVisible();
    await expect(metadataTab.bundleId).toBeVisible();
    await expect(metadataTab.bundleId).toContainText(bundle.id);
    await expect(metadataTab.nameInput).toBeVisible();
    await expect(metadataTab.nameInput).toHaveValue(bundle.name);
    await expect(metadataTab.commentInput).toBeVisible();
    await expect(metadataTab.creatorInput).toBeVisible();
    await expect(metadataTab.versionInput).toBeVisible();
    await expect(metadataTab.tagsSection).toBeVisible();
    await expect(metadataTab.versionHistory).toBeVisible();

    await api.delete(bundle.id);
  });

  test("bundle ID is read-only", async ({ page }) => {
    const { bundle, metadataTab } = await openMetadataTab(page, "empty.json");
    const api = new StoryBundleAPI(page);

    // The bundle ID is in a <code> element, not an input
    await expect(metadataTab.bundleId.locator("code")).toContainText(bundle.id);

    await api.delete(bundle.id);
  });

  test("changing the name enables the save button", async ({ page }) => {
    const { bundle, editor, metadataTab } = await openMetadataTab(page, "empty.json");
    const api = new StoryBundleAPI(page);

    await metadataTab.nameInput.fill("Renamed via Metadata");
    await expect(editor.saveButton).toBeEnabled();

    await api.delete(bundle.id);
  });

  test("changing the comment enables the save button", async ({ page }) => {
    const { bundle, editor, metadataTab } = await openMetadataTab(page, "empty.json");
    const api = new StoryBundleAPI(page);

    await metadataTab.commentInput.fill("A test comment");
    await expect(editor.saveButton).toBeEnabled();

    await api.delete(bundle.id);
  });

  test("changing the creator enables the save button", async ({ page }) => {
    const { bundle, editor, metadataTab } = await openMetadataTab(page, "empty.json");
    const api = new StoryBundleAPI(page);

    await metadataTab.creatorInput.fill("Test Creator");
    await expect(editor.saveButton).toBeEnabled();

    await api.delete(bundle.id);
  });

  test("changing the version enables the save button", async ({ page }) => {
    const { bundle, editor, metadataTab } = await openMetadataTab(page, "empty.json");
    const api = new StoryBundleAPI(page);

    await metadataTab.versionInput.fill("2.0.0");
    await expect(editor.saveButton).toBeEnabled();

    await api.delete(bundle.id);
  });

  test("adding a tag shows it in the list", async ({ page }) => {
    const { bundle, metadataTab } = await openMetadataTab(page, "empty.json");
    const api = new StoryBundleAPI(page);

    await metadataTab.addTag("fantasy");
    await expect(metadataTab.tagChip("fantasy")).toBeVisible();

    await api.delete(bundle.id);
  });

  test("removing a tag removes it from the list", async ({ page }) => {
    const { bundle, metadataTab } = await openMetadataTab(page, "empty.json");
    const api = new StoryBundleAPI(page);

    await metadataTab.addTag("scifi");
    await expect(metadataTab.tagChip("scifi")).toBeVisible();

    await metadataTab.removeTag("scifi");
    await expect(metadataTab.tagChip("scifi")).not.toBeVisible();

    await api.delete(bundle.id);
  });

  test("adding a tag enables the save button", async ({ page }) => {
    const { bundle, editor, metadataTab } = await openMetadataTab(page, "empty.json");
    const api = new StoryBundleAPI(page);

    await metadataTab.addTag("horror");
    await expect(editor.saveButton).toBeEnabled();

    await api.delete(bundle.id);
  });

  test("version history shows empty state initially", async ({ page }) => {
    const { bundle, metadataTab } = await openMetadataTab(page, "empty.json");
    const api = new StoryBundleAPI(page);

    await expect(metadataTab.versionEmpty).toBeVisible();

    await api.delete(bundle.id);
  });

  test("save creates a version snapshot automatically", async ({ page }) => {
    const { bundle, editor, metadataTab } = await openMetadataTab(page, "empty.json");
    const api = new StoryBundleAPI(page);

    // Make a change and save
    await metadataTab.nameInput.fill("Auto-Snapshot Bundle");
    await editor.saveButton.click();

    // Wait for save to complete — the save button should become disabled again
    await expect(editor.saveButton).toBeDisabled({ timeout: 5_000 });

    // Version history should now show an entry
    await expect(metadataTab.versionList).toBeVisible({ timeout: 5_000 });

    await api.delete(bundle.id);
  });

  test("version reset button deletes all versions", async ({ page }) => {
    const { bundle, editor, metadataTab } = await openMetadataTab(page, "empty.json");
    const api = new StoryBundleAPI(page);

    // Create a version by saving
    await metadataTab.nameInput.fill("Reset Test Bundle");
    await editor.saveButton.click();
    await expect(editor.saveButton).toBeDisabled({ timeout: 5_000 });
    await expect(metadataTab.versionList).toBeVisible({ timeout: 5_000 });

    // Reset all versions
    await metadataTab.versionReset.click();

    // Confirm the dialog via the shared app-dialog confirm button
    await page.getByTestId("app-dialog-confirm-button").click();

    // Version history should be empty again
    await expect(metadataTab.versionEmpty).toBeVisible({ timeout: 5_000 });

    await api.delete(bundle.id);
  });
});

test.describe("Story Bundle Metadata — Negative", () => {
  test("save button is disabled when nothing has changed", async ({ page }) => {
    const { bundle, editor } = await openMetadataTab(page, "empty.json");
    const api = new StoryBundleAPI(page);

    await expect(editor.saveButton).toBeDisabled();

    await api.delete(bundle.id);
  });

  test("adding a duplicate tag does not create a second chip", async ({ page }) => {
    const { bundle, metadataTab } = await openMetadataTab(page, "empty.json");
    const api = new StoryBundleAPI(page);

    await metadataTab.addTag("unique");
    await metadataTab.addTag("unique");

    // Should still only have one chip
    const chips = metadataTab.tagsList.locator("[data-testid^='story-bundle-editor-metadata-tag-']");
    await expect(chips).toHaveCount(1);

    await api.delete(bundle.id);
  });
});
