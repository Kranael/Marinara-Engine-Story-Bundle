/**
 * Story Bundle Editor — Playwright E2E Tests
 *
 * Covers: StoryBundleEditor component + description, characters, personas, lorebooks tabs
 * - Editor header with back, play, save, delete buttons
 * - Description tab: name input, description textarea, preview toggle
 * - Characters tab: search, random pick
 * - Personas tab: search, random pick
 * - Lorebooks tab: search, random pick
 * - Save button enables/disables based on dirty state
 * - Back button returns to panel
 * - Delete from editor with confirmation
 *
 * Each test imports its own data via importStoryBundleFixture and cleans up.
 */
import { expect, test } from "@playwright/test";
import path from "node:path";
import { BasePage } from "../pages/base.page.js";
import { HomePage } from "../../pages/home.page.js";
import { StoryBundlesPanelPage } from "../pages/story-bundles-panel.page.js";
import { StoryBundleEditorPage } from "../pages/story-bundle-editor.page.js";
import { StoryBundleDescriptionTabPage } from "../pages/story-bundle-description-tab.page.js";
import { StoryBundleCharactersTabPage } from "../pages/story-bundle-characters-tab.page.js";
import { StoryBundlePersonasTabPage } from "../pages/story-bundle-personas-tab.page.js";
import { StoryBundleLorebooksTabPage } from "../pages/story-bundle-lorebooks-tab.page.js";
import { DeleteStoryBundleDialogPage } from "../pages/delete-story-bundle-dialog.page.js";
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

test.describe("Story Bundle Editor — Positive", () => {
  test("editor header shows back, play, save, and delete buttons", async ({ page }) => {
    const { bundle, editor } = await openEditorForBundle(page, "empty.json");
    const api = new StoryBundleAPI(page);

    await expect(editor.header).toBeVisible();
    await expect(editor.backButton).toBeVisible();
    await expect(editor.playButton).toBeVisible();
    await expect(editor.saveButton).toBeVisible();
    await expect(editor.deleteButton).toBeVisible();

    await api.delete(bundle.id);
  });

  test("play and save buttons match the compact icon-button height", async ({ page }) => {
    const { bundle, editor } = await openEditorForBundle(page, "empty.json");
    const api = new StoryBundleAPI(page);

    // Play/Save are compact gradient buttons; Delete is the 2rem (h-8 w-8)
    // icon button they should visually match.
    const deleteBox = await editor.deleteButton.boundingBox();
    const playBox = await editor.playButton.boundingBox();
    const saveBox = await editor.saveButton.boundingBox();

    expect(deleteBox).not.toBeNull();
    expect(playBox).not.toBeNull();
    expect(saveBox).not.toBeNull();
    expect(playBox!.height).toBeCloseTo(deleteBox!.height, 0);
    expect(saveBox!.height).toBeCloseTo(deleteBox!.height, 0);

    await api.delete(bundle.id);
  });

  test("back button returns to the Story Bundles panel", async ({ page }) => {
    const { bundle, editor } = await openEditorForBundle(page, "empty.json");
    const panel = new StoryBundlesPanelPage(page);
    const api = new StoryBundleAPI(page);

    await editor.backButton.click();

    await panel.waitFor();
    await expect(panel.rowLocator(bundle.name)).toBeVisible();

    await api.delete(bundle.id);
  });

  test("description tab shows description textarea", async ({ page }) => {
    const { bundle, editor } = await openEditorForBundle(page, "empty.json");
    const descTab = new StoryBundleDescriptionTabPage(page);
    const api = new StoryBundleAPI(page);

    await editor.switchToDescription();
    await expect(descTab.section).toBeVisible();
    await expect(descTab.descriptionLabel).toBeVisible();

    await descTab.togglePreview();
    await expect(descTab.descriptionInput).toBeVisible();

    await api.delete(bundle.id);
  });

  test("description preview toggle switches between edit and preview", async ({ page }) => {
    const { bundle, editor } = await openEditorForBundle(page, "empty.json");
    const descTab = new StoryBundleDescriptionTabPage(page);
    const api = new StoryBundleAPI(page);

    await editor.switchToDescription();
    await expect(descTab.previewToggle).toBeVisible();

    await descTab.togglePreview();
    await expect(descTab.descriptionInput).toBeVisible();

    await descTab.togglePreview();
    await expect(descTab.descriptionPreview).toBeVisible();

    await api.delete(bundle.id);
  });

  test("description textarea accepts HTML input", async ({ page }) => {
    const { bundle, editor } = await openEditorForBundle(page, "empty.json");
    const descTab = new StoryBundleDescriptionTabPage(page);
    const api = new StoryBundleAPI(page);

    await editor.switchToDescription();
    await descTab.setDescription("<p>A <strong>bold</strong> description.</p>");
    await descTab.togglePreview();

    await expect(descTab.descriptionPreview).toContainText("A bold description.");

    await api.delete(bundle.id);
  });

  test("description tab shows pre-filled description from imported bundle", async ({ page }) => {
    const { bundle, editor } = await openEditorForBundle(page, "with-description.json");
    const descTab = new StoryBundleDescriptionTabPage(page);
    const api = new StoryBundleAPI(page);

    await editor.switchToDescription();
    await descTab.togglePreview();
    await expect(descTab.descriptionInput).toContainText("Chapter One");

    await api.delete(bundle.id);
  });

  test("characters tab renders with search and random buttons", async ({ page }) => {
    const { bundle, editor } = await openEditorForBundle(page, "empty.json");
    const charsTab = new StoryBundleCharactersTabPage(page);
    const api = new StoryBundleAPI(page);

    await editor.switchToCharacters();
    await charsTab.waitFor();

    await expect(charsTab.searchInput).toBeVisible();
    await expect(charsTab.randomButton).toBeVisible();

    await api.delete(bundle.id);
  });

  test("personas tab renders with search and random buttons", async ({ page }) => {
    const { bundle, editor } = await openEditorForBundle(page, "empty.json");
    const personasTab = new StoryBundlePersonasTabPage(page);
    const api = new StoryBundleAPI(page);

    await editor.switchToPersonas();
    await personasTab.waitFor();

    await expect(personasTab.searchInput).toBeVisible();
    await expect(personasTab.randomButton).toBeVisible();

    await api.delete(bundle.id);
  });

  test("lorebooks tab renders with search and random buttons", async ({ page }) => {
    const { bundle, editor } = await openEditorForBundle(page, "empty.json");
    const lorebooksTab = new StoryBundleLorebooksTabPage(page);
    const api = new StoryBundleAPI(page);

    await editor.switchToLorebooks();
    await lorebooksTab.waitFor();

    await expect(lorebooksTab.searchInput).toBeVisible();
    await expect(lorebooksTab.randomButton).toBeVisible();

    await api.delete(bundle.id);
  });

  test("delete button in editor shows confirmation and removes bundle", async ({ page }) => {
    const { bundle, editor } = await openEditorForBundle(page, "empty.json");
    const deleteDialog = new DeleteStoryBundleDialogPage(page);
    const panel = new StoryBundlesPanelPage(page);

    await editor.deleteButton.click();

    await deleteDialog.waitFor();
    await deleteDialog.confirm();

    await panel.waitFor();
    await expect(panel.panel).not.toContainText(bundle.name, { timeout: 5_000 });
  });
});

test.describe("Story Bundle Editor — Negative", () => {
  test("save button is disabled when nothing has changed", async ({ page }) => {
    const { bundle, editor } = await openEditorForBundle(page, "empty.json");
    const api = new StoryBundleAPI(page);

    await expect(editor.saveButton).toBeVisible();
    await expect(editor.saveButton).toBeDisabled();

    await api.delete(bundle.id);
  });

  test("character search with no results shows empty state", async ({ page }) => {
    const { bundle, editor } = await openEditorForBundle(page, "empty.json");
    const charsTab = new StoryBundleCharactersTabPage(page);
    const api = new StoryBundleAPI(page);

    await editor.switchToCharacters();
    await charsTab.waitFor();

    await charsTab.search("nonexistent_character_name_xyz");
    await expect(charsTab.emptyState).toBeVisible({ timeout: 5_000 });

    await api.delete(bundle.id);
  });

  test("persona search with no results shows empty state", async ({ page }) => {
    const { bundle, editor } = await openEditorForBundle(page, "empty.json");
    const personasTab = new StoryBundlePersonasTabPage(page);
    const api = new StoryBundleAPI(page);

    await editor.switchToPersonas();
    await personasTab.waitFor();

    await personasTab.search("nonexistent_persona_name_xyz");
    await expect(personasTab.emptyState).toBeVisible({ timeout: 5_000 });

    await api.delete(bundle.id);
  });

  test("lorebook search with no results shows empty state", async ({ page }) => {
    const { bundle, editor } = await openEditorForBundle(page, "empty.json");
    const lorebooksTab = new StoryBundleLorebooksTabPage(page);
    const api = new StoryBundleAPI(page);

    await editor.switchToLorebooks();
    await lorebooksTab.waitFor();

    await lorebooksTab.search("nonexistent_lorebook_name_xyz");
    await expect(lorebooksTab.emptyState).toBeVisible({ timeout: 5_000 });

    await api.delete(bundle.id);
  });
});
