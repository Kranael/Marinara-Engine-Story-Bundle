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

  test("version history shows Current entry for the current bundle state", async ({ page }) => {
    const { bundle, metadataTab } = await openMetadataTab(page, "empty.json");
    const api = new StoryBundleAPI(page);

    // The version list should be visible with the "Current" entry
    await expect(metadataTab.versionList).toBeVisible();

    // Get versions to find the current entry
    const versions = await api.getVersions(bundle.id);
    const currentVersion = versions.find((v) => v.isCurrent);
    expect(currentVersion).toBeDefined();

    // The current entry should be visible
    await expect(metadataTab.versionEntry(currentVersion!.id)).toBeVisible();

    await api.delete(bundle.id);
  });

  test("save creates a version snapshot with a revision number", async ({ page }) => {
    const { bundle, editor, metadataTab } = await openMetadataTab(page, "empty.json");
    const api = new StoryBundleAPI(page);

    // Make a change and save
    await metadataTab.nameInput.fill("Auto-Snapshot Bundle");
    await editor.saveButton.click();

    // Wait for save to complete — the save button should become disabled again
    await expect(editor.saveButton).toBeDisabled({ timeout: 5_000 });

    // Version history should now show the saved entry alongside Current
    await expect(metadataTab.versionList).toBeVisible({ timeout: 5_000 });

    const versions = await api.getVersions(bundle.id);
    const savedVersions = versions.filter((v) => !v.isCurrent);
    expect(savedVersions.length).toBeGreaterThanOrEqual(1);
    expect(savedVersions[0].revision).toBeGreaterThanOrEqual(1);

    await api.delete(bundle.id);
  });

  test("multiple saves create multiple version entries", async ({ page }) => {
    const { bundle, editor, metadataTab } = await openMetadataTab(page, "empty.json");
    const api = new StoryBundleAPI(page);

    // First save
    await metadataTab.nameInput.fill("First Save");
    await editor.saveButton.click();
    await expect(editor.saveButton).toBeDisabled({ timeout: 5_000 });

    // Second save
    await metadataTab.commentInput.fill("Second save comment");
    await editor.saveButton.click();
    await expect(editor.saveButton).toBeDisabled({ timeout: 5_000 });

    // Should have at least 2 saved versions
    const versions = await api.getVersions(bundle.id);
    const savedVersions = versions.filter((v) => !v.isCurrent);
    expect(savedVersions.length).toBeGreaterThanOrEqual(2);

    await api.delete(bundle.id);
  });

  test("rename a saved version via the pencil button", async ({ page }) => {
    const { bundle, editor, metadataTab } = await openMetadataTab(page, "empty.json");
    const api = new StoryBundleAPI(page);

    // Create a version by saving
    await metadataTab.nameInput.fill("Rename Test");
    await editor.saveButton.click();
    await expect(editor.saveButton).toBeDisabled({ timeout: 5_000 });

    const versions = await api.getVersions(bundle.id);
    const savedVersion = versions.find((v) => !v.isCurrent);
    expect(savedVersion).toBeDefined();

    // Click the rename button
    await metadataTab.versionRename(savedVersion!.id).click();

    // Fill in the prompt dialog
    await page.getByTestId("app-dialog-prompt-input").fill("2.5.0");
    await page.getByTestId("app-dialog-confirm-button").click();

    // Wait for the rename to complete
    await expect(metadataTab.versionEntry(savedVersion!.id)).toContainText("2.5.0", { timeout: 5_000 });

    await api.delete(bundle.id);
  });

  test("restore a saved version via the RotateCcw button", async ({ page }) => {
    const { bundle, editor, metadataTab } = await openMetadataTab(page, "empty.json");
    const api = new StoryBundleAPI(page);

    // Create a version by saving
    const originalName = "Restore Test Original";
    await metadataTab.nameInput.fill(originalName);
    await editor.saveButton.click();
    await expect(editor.saveButton).toBeDisabled({ timeout: 5_000 });

    // Change name and save again to create a second version
    await metadataTab.nameInput.fill("Restore Test Changed");
    await editor.saveButton.click();
    await expect(editor.saveButton).toBeDisabled({ timeout: 5_000 });

    const versions = await api.getVersions(bundle.id);
    const savedVersions = versions.filter((v) => !v.isCurrent);
    // Restore the first saved version (older one)
    const versionToRestore = savedVersions[savedVersions.length - 1];
    expect(versionToRestore).toBeDefined();

    // Click the restore button
    await metadataTab.versionRestore(versionToRestore!.id).click();

    // Confirm the dialog
    await page.getByTestId("app-dialog-confirm-button").click();

    // Wait for restore to complete — the name should revert
    await expect(metadataTab.nameInput).toHaveValue(originalName, { timeout: 5_000 });

    await api.delete(bundle.id);
  });

  test("delete a single saved version via the Trash2 button", async ({ page }) => {
    const { bundle, editor, metadataTab } = await openMetadataTab(page, "empty.json");
    const api = new StoryBundleAPI(page);

    // Create a version by saving
    await metadataTab.nameInput.fill("Delete Test");
    await editor.saveButton.click();
    await expect(editor.saveButton).toBeDisabled({ timeout: 5_000 });

    let versions = await api.getVersions(bundle.id);
    const savedVersion = versions.find((v) => !v.isCurrent);
    expect(savedVersion).toBeDefined();

    // Click the delete button
    await metadataTab.versionDelete(savedVersion!.id).click();

    // Confirm the dialog
    await page.getByTestId("app-dialog-confirm-button").click();

    // The deleted version should be gone
    await expect(metadataTab.versionEntry(savedVersion!.id)).not.toBeVisible({ timeout: 5_000 });

    // Verify via API
    versions = await api.getVersions(bundle.id);
    expect(versions.find((v) => v.id === savedVersion!.id)).toBeUndefined();

    await api.delete(bundle.id);
  });

  test("reset versions button clears all saved history", async ({ page }) => {
    const { bundle, editor, metadataTab } = await openMetadataTab(page, "empty.json");
    const api = new StoryBundleAPI(page);

    // Create two versions by saving twice
    await metadataTab.nameInput.fill("Reset Test 1");
    await editor.saveButton.click();
    await expect(editor.saveButton).toBeDisabled({ timeout: 5_000 });

    await metadataTab.commentInput.fill("Reset Test 2");
    await editor.saveButton.click();
    await expect(editor.saveButton).toBeDisabled({ timeout: 5_000 });

    // Should have saved versions
    let versions = await api.getVersions(bundle.id);
    expect(versions.filter((v) => !v.isCurrent).length).toBeGreaterThanOrEqual(2);

    // Reset all versions
    await metadataTab.versionReset.click();

    // Confirm the dialog
    await page.getByTestId("app-dialog-confirm-button").click();

    // Only the Current entry should remain
    await expect(metadataTab.versionList).toBeVisible({ timeout: 5_000 });
    versions = await api.getVersions(bundle.id);
    const savedVersions = versions.filter((v) => !v.isCurrent);
    expect(savedVersions.length).toBe(0);
    expect(versions.some((v) => v.isCurrent)).toBe(true);

    await api.delete(bundle.id);
  });

  test("version entries show source prefix when available", async ({ page }) => {
    const { bundle, editor, metadataTab } = await openMetadataTab(page, "empty.json");
    const api = new StoryBundleAPI(page);

    // Create a version by saving
    await metadataTab.nameInput.fill("Source Test");
    await editor.saveButton.click();
    await expect(editor.saveButton).toBeDisabled({ timeout: 5_000 });

    const versions = await api.getVersions(bundle.id);
    const savedVersion = versions.find((v) => !v.isCurrent);
    expect(savedVersion).toBeDefined();
    // Saved versions should have a source field (e.g., "manual")
    expect(savedVersion!.source).toBeTruthy();

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

  test("reset button is disabled when there are unsaved changes", async ({ page }) => {
    const { bundle, editor, metadataTab } = await openMetadataTab(page, "empty.json");
    const api = new StoryBundleAPI(page);

    // Make a change without saving
    await metadataTab.nameInput.fill("Unsaved Change");

    // Save button should be enabled (dirty state)
    await expect(editor.saveButton).toBeEnabled();

    // Reset button should be disabled because of unsaved changes
    await expect(metadataTab.versionReset).toBeDisabled();

    await api.delete(bundle.id);
  });

  test("rename dialog cancelled does nothing", async ({ page }) => {
    const { bundle, editor, metadataTab } = await openMetadataTab(page, "empty.json");
    const api = new StoryBundleAPI(page);

    // Create a version by saving
    await metadataTab.nameInput.fill("Cancel Rename Test");
    await editor.saveButton.click();
    await expect(editor.saveButton).toBeDisabled({ timeout: 5_000 });

    const versions = await api.getVersions(bundle.id);
    const savedVersion = versions.find((v) => !v.isCurrent);
    expect(savedVersion).toBeDefined();
    const originalVersion = savedVersion!.version;

    // Click the rename button
    await metadataTab.versionRename(savedVersion!.id).click();

    // Cancel the dialog
    await page.getByTestId("app-dialog-cancel-button").click();

    // The version should still have its original value
    const versionsAfter = await api.getVersions(bundle.id);
    const sameVersion = versionsAfter.find((v) => v.id === savedVersion!.id);
    expect(sameVersion).toBeDefined();
    expect(sameVersion!.version).toBe(originalVersion);

    await api.delete(bundle.id);
  });

  test("restore dialog cancelled does nothing", async ({ page }) => {
    const { bundle, editor, metadataTab } = await openMetadataTab(page, "empty.json");
    const api = new StoryBundleAPI(page);

    // Create a version by saving
    const originalName = "Cancel Restore Original";
    await metadataTab.nameInput.fill(originalName);
    await editor.saveButton.click();
    await expect(editor.saveButton).toBeDisabled({ timeout: 5_000 });

    // Change and save again
    await metadataTab.nameInput.fill("Cancel Restore Changed");
    await editor.saveButton.click();
    await expect(editor.saveButton).toBeDisabled({ timeout: 5_000 });

    const versions = await api.getVersions(bundle.id);
    const savedVersions = versions.filter((v) => !v.isCurrent);
    const versionToRestore = savedVersions[savedVersions.length - 1];

    // Click the restore button
    await metadataTab.versionRestore(versionToRestore!.id).click();

    // Cancel the dialog
    await page.getByTestId("app-dialog-cancel-button").click();

    // The name should NOT have changed
    await expect(metadataTab.nameInput).toHaveValue("Cancel Restore Changed");

    await api.delete(bundle.id);
  });

  test("delete dialog cancelled does nothing", async ({ page }) => {
    const { bundle, editor, metadataTab } = await openMetadataTab(page, "empty.json");
    const api = new StoryBundleAPI(page);

    // Create a version by saving
    await metadataTab.nameInput.fill("Cancel Delete Test");
    await editor.saveButton.click();
    await expect(editor.saveButton).toBeDisabled({ timeout: 5_000 });

    const versions = await api.getVersions(bundle.id);
    const savedVersion = versions.find((v) => !v.isCurrent);
    expect(savedVersion).toBeDefined();

    // Click the delete button
    await metadataTab.versionDelete(savedVersion!.id).click();

    // Cancel the dialog
    await page.getByTestId("app-dialog-cancel-button").click();

    // The version should still exist
    await expect(metadataTab.versionEntry(savedVersion!.id)).toBeVisible();

    await api.delete(bundle.id);
  });

  test("reset dialog cancelled does nothing", async ({ page }) => {
    const { bundle, editor, metadataTab } = await openMetadataTab(page, "empty.json");
    const api = new StoryBundleAPI(page);

    // Create a version by saving
    await metadataTab.nameInput.fill("Cancel Reset Test");
    await editor.saveButton.click();
    await expect(editor.saveButton).toBeDisabled({ timeout: 5_000 });

    const versionsBefore = await api.getVersions(bundle.id);
    const savedCountBefore = versionsBefore.filter((v) => !v.isCurrent).length;
    expect(savedCountBefore).toBeGreaterThanOrEqual(1);

    // Click the reset button
    await metadataTab.versionReset.click();

    // Cancel the dialog
    await page.getByTestId("app-dialog-cancel-button").click();

    // The saved versions should still exist
    const versionsAfter = await api.getVersions(bundle.id);
    const savedCountAfter = versionsAfter.filter((v) => !v.isCurrent).length;
    expect(savedCountAfter).toBe(savedCountBefore);

    await api.delete(bundle.id);
  });

  test("rename with empty string does nothing", async ({ page }) => {
    const { bundle, editor, metadataTab } = await openMetadataTab(page, "empty.json");
    const api = new StoryBundleAPI(page);

    // Create a version by saving
    await metadataTab.nameInput.fill("Empty Rename Test");
    await editor.saveButton.click();
    await expect(editor.saveButton).toBeDisabled({ timeout: 5_000 });

    const versions = await api.getVersions(bundle.id);
    const savedVersion = versions.find((v) => !v.isCurrent);
    expect(savedVersion).toBeDefined();
    const originalVersion = savedVersion!.version;

    // Click the rename button
    await metadataTab.versionRename(savedVersion!.id).click();

    // Clear the input and confirm
    await page.getByTestId("app-dialog-prompt-input").fill("");
    await page.getByTestId("app-dialog-confirm-button").click();

    // The version should still have its original value
    const versionsAfter = await api.getVersions(bundle.id);
    const sameVersion = versionsAfter.find((v) => v.id === savedVersion!.id);
    expect(sameVersion).toBeDefined();
    expect(sameVersion!.version).toBe(originalVersion);

    await api.delete(bundle.id);
  });

  test("rename with same value does nothing", async ({ page }) => {
    const { bundle, editor, metadataTab } = await openMetadataTab(page, "empty.json");
    const api = new StoryBundleAPI(page);

    // Create a version by saving
    await metadataTab.nameInput.fill("Same Rename Test");
    await editor.saveButton.click();
    await expect(editor.saveButton).toBeDisabled({ timeout: 5_000 });

    const versions = await api.getVersions(bundle.id);
    const savedVersion = versions.find((v) => !v.isCurrent);
    expect(savedVersion).toBeDefined();
    const originalVersion = savedVersion!.version;

    // Click the rename button
    await metadataTab.versionRename(savedVersion!.id).click();

    // Fill with the same value and confirm
    await page.getByTestId("app-dialog-prompt-input").fill(originalVersion);
    await page.getByTestId("app-dialog-confirm-button").click();

    // The version should still have its original value
    const versionsAfter = await api.getVersions(bundle.id);
    const sameVersion = versionsAfter.find((v) => v.id === savedVersion!.id);
    expect(sameVersion).toBeDefined();
    expect(sameVersion!.version).toBe(originalVersion);

    await api.delete(bundle.id);
  });

  test("version history only shows Current after reset", async ({ page }) => {
    const { bundle, editor, metadataTab } = await openMetadataTab(page, "empty.json");
    const api = new StoryBundleAPI(page);

    // Create two versions by saving twice
    await metadataTab.nameInput.fill("Post-Reset Test 1");
    await editor.saveButton.click();
    await expect(editor.saveButton).toBeDisabled({ timeout: 5_000 });

    await metadataTab.commentInput.fill("Post-Reset Test 2");
    await editor.saveButton.click();
    await expect(editor.saveButton).toBeDisabled({ timeout: 5_000 });

    // Reset all versions
    await metadataTab.versionReset.click();
    await page.getByTestId("app-dialog-confirm-button").click();

    // Only the Current entry should remain
    await expect(metadataTab.versionList).toBeVisible({ timeout: 5_000 });

    const versions = await api.getVersions(bundle.id);
    const savedVersions = versions.filter((v) => !v.isCurrent);
    expect(savedVersions.length).toBe(0);
    expect(versions.length).toBe(1);
    expect(versions[0].isCurrent).toBe(true);

    await api.delete(bundle.id);
  });
});
