/**
 * Story Bundle Presets Picker — Playwright E2E Tests
 *
 * Covers: StoryBundlePresets add/remove interactions within the editor
 * - Add a preset via its plus button → appears in the selected section
 * - Remove a preset via its X button → selected empty state returns
 * - Random button adds a preset from the filtered list
 * - Load more paginates beyond the 20-item picker page size
 * - Random button is disabled once every matching preset is added
 *
 * Precondition data is seeded through REST endpoints (never the UI) with
 * unique name suffixes so parallel workers never collide. Each test cleans
 * up its own entities in a finally block so cleanup survives failures.
 */
import { expect, test } from "@playwright/test";
import path from "node:path";
import { BasePage } from "../pages/base.page.js";
import { HomePage } from "../../pages/home.page.js";
import { StoryBundlesPanelPage } from "../pages/story-bundles-panel.page.js";
import { StoryBundleEditorPage } from "../pages/story-bundle-editor.page.js";
import { StoryBundlePresetsTabPage } from "../pages/story-bundle-presets-tab.page.js";
import { importStoryBundleFixture } from "../helpers/story-bundle-fixture.js";
import { createPreset, deletePreset, entitySuffix, type EntityRef } from "../helpers/story-bundle-entities.js";

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

test.describe("Story Bundle Presets Picker — Positive", () => {
  test("adding a preset via the plus button shows it in the selected list", async ({ page }) => {
    const suffix = entitySuffix(test.info().title);
    const seeded: EntityRef[] = [];
    let bundleId: string | null = null;

    try {
      const preset = await createPreset(page.request, `Picker Preset ${suffix}`);
      seeded.push(preset);

      const { bundle, editor } = await openEditorForBundle(page, "empty.json");
      bundleId = bundle.id;
      const presetsTab = new StoryBundlePresetsTabPage(page);

      await editor.switchToPresets();
      await presetsTab.waitFor();

      await expect(presetsTab.selectedEmptyState).toBeVisible();

      await presetsTab.search(suffix);
      await presetsTab.addItem(preset.id);

      await expect(presetsTab.selectedSection).toContainText(preset.name);
      await expect(presetsTab.addButtonLocator(preset.id)).toBeHidden();
      await expect(presetsTab.selectedEmptyState).toBeHidden();
      await expect(presetsTab.removeButtonLocator(preset.id)).toBeVisible();
    } finally {
      for (const entity of seeded) await deletePreset(page.request, entity.id);
      if (bundleId) await page.request.delete(`/api/story-bundles/${bundleId}`);
    }
  });

  test("removing a preset via the X button restores the selected empty state", async ({ page }) => {
    const suffix = entitySuffix(test.info().title);
    const seeded: EntityRef[] = [];
    let bundleId: string | null = null;

    try {
      const preset = await createPreset(page.request, `Removable Preset ${suffix}`);
      seeded.push(preset);

      const { bundle, editor } = await openEditorForBundle(page, "empty.json");
      bundleId = bundle.id;
      const presetsTab = new StoryBundlePresetsTabPage(page);

      await editor.switchToPresets();
      await presetsTab.waitFor();

      await presetsTab.search(suffix);
      await presetsTab.addItem(preset.id);
      await expect(presetsTab.selectedSection).toContainText(preset.name);

      await presetsTab.removeItem(preset.id);

      await expect(presetsTab.selectedEmptyState).toBeVisible();
      await expect(presetsTab.selectedSection).not.toContainText(preset.name);
      await expect(presetsTab.addButtonLocator(preset.id)).toBeVisible();
    } finally {
      for (const entity of seeded) await deletePreset(page.request, entity.id);
      if (bundleId) await page.request.delete(`/api/story-bundles/${bundleId}`);
    }
  });

  test("random button adds a preset from the filtered list", async ({ page }) => {
    const suffix = entitySuffix(test.info().title);
    const seeded: EntityRef[] = [];
    let bundleId: string | null = null;

    try {
      const preset = await createPreset(page.request, `Random Preset ${suffix}`);
      seeded.push(preset);

      const { bundle, editor } = await openEditorForBundle(page, "empty.json");
      bundleId = bundle.id;
      const presetsTab = new StoryBundlePresetsTabPage(page);

      await editor.switchToPresets();
      await presetsTab.waitFor();

      // Narrow the pool to the single seeded preset so the random pick is deterministic.
      await presetsTab.search(suffix);
      await presetsTab.pickRandom();

      await expect(presetsTab.selectedSection).toContainText(preset.name);
      await expect(presetsTab.addButtonLocator(preset.id)).toBeHidden();
    } finally {
      for (const entity of seeded) await deletePreset(page.request, entity.id);
      if (bundleId) await page.request.delete(`/api/story-bundles/${bundleId}`);
    }
  });

  test("load more reveals presets beyond the first picker page", async ({ page }) => {
    const suffix = entitySuffix(test.info().title);
    const seeded: EntityRef[] = [];
    let bundleId: string | null = null;

    try {
      // 21 presets exceed the picker page size of 20.
      for (let index = 0; index < 21; index++) {
        seeded.push(await createPreset(page.request, `Paged Preset ${index} ${suffix}`));
      }

      const { bundle, editor } = await openEditorForBundle(page, "empty.json");
      bundleId = bundle.id;
      const presetsTab = new StoryBundlePresetsTabPage(page);

      await editor.switchToPresets();
      await presetsTab.waitFor();

      await presetsTab.search(suffix);

      await expect(presetsTab.loadMoreButton).toBeVisible();
      await expect(presetsTab.loadMoreButton).toContainText(/20 of 21/);
      // Order-independent: only the first picker page of 20 is rendered.
      await expect(presetsTab.availableAddButtons).toHaveCount(20);

      await presetsTab.loadMore();

      // All 21 matches are rendered and the load-more button disappears.
      await expect(presetsTab.availableAddButtons).toHaveCount(21);
      await expect(presetsTab.loadMoreButton).toBeHidden();
    } finally {
      for (const entity of seeded) await deletePreset(page.request, entity.id);
      if (bundleId) await page.request.delete(`/api/story-bundles/${bundleId}`);
    }
  });
});

test.describe("Story Bundle Presets Picker — Negative", () => {
  test("random button is disabled once every matching preset is added", async ({ page }) => {
    const suffix = entitySuffix(test.info().title);
    const seeded: EntityRef[] = [];
    let bundleId: string | null = null;

    try {
      const preset = await createPreset(page.request, `Exhausted Preset ${suffix}`);
      seeded.push(preset);

      const { bundle, editor } = await openEditorForBundle(page, "empty.json");
      bundleId = bundle.id;
      const presetsTab = new StoryBundlePresetsTabPage(page);

      await editor.switchToPresets();
      await presetsTab.waitFor();

      await presetsTab.search(suffix);
      await expect(presetsTab.randomButton).toBeEnabled();

      await presetsTab.addItem(preset.id);

      await expect(presetsTab.randomButton).toBeDisabled();
      await expect(presetsTab.emptyState).toBeVisible();
    } finally {
      for (const entity of seeded) await deletePreset(page.request, entity.id);
      if (bundleId) await page.request.delete(`/api/story-bundles/${bundleId}`);
    }
  });
});
