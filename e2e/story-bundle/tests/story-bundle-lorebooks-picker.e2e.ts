/**
 * Story Bundle Lorebooks Picker — Playwright E2E Tests
 *
 * Covers: StoryBundleLorebooks add/remove interactions within the editor
 * - Add a lorebook via its plus button → appears in the selected section
 * - Remove a lorebook via its X button → selected empty state returns
 * - Random button adds a lorebook from the filtered list
 * - Load more paginates beyond the 20-item picker page size
 * - Random button is disabled once every matching lorebook is added
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
import { StoryBundleLorebooksTabPage } from "../pages/story-bundle-lorebooks-tab.page.js";
import { importStoryBundleFixture } from "../helpers/story-bundle-fixture.js";
import { createLorebook, deleteLorebook, entitySuffix, type EntityRef } from "../helpers/story-bundle-entities.js";

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

test.describe("Story Bundle Lorebooks Picker — Positive", () => {
  test("adding a lorebook via the plus button shows it in the selected list", async ({ page }) => {
    const suffix = entitySuffix(test.info().title);
    const seeded: EntityRef[] = [];
    let bundleId: string | null = null;

    try {
      const lorebook = await createLorebook(page.request, `Picker Lorebook ${suffix}`);
      seeded.push(lorebook);

      const { bundle, editor } = await openEditorForBundle(page, "empty.json");
      bundleId = bundle.id;
      const lorebooksTab = new StoryBundleLorebooksTabPage(page);

      await editor.switchToLorebooks();
      await lorebooksTab.waitFor();

      await expect(lorebooksTab.selectedEmptyState).toBeVisible();

      await lorebooksTab.search(suffix);
      await lorebooksTab.addItem(lorebook.id);

      await expect(lorebooksTab.selectedSection).toContainText(lorebook.name);
      await expect(lorebooksTab.addButtonLocator(lorebook.id)).toBeHidden();
      await expect(lorebooksTab.selectedEmptyState).toBeHidden();
      await expect(lorebooksTab.removeButtonLocator(lorebook.id)).toBeVisible();
    } finally {
      for (const entity of seeded) await deleteLorebook(page.request, entity.id);
      if (bundleId) await page.request.delete(`/api/story-bundles/${bundleId}`);
    }
  });

  test("removing a lorebook via the X button restores the selected empty state", async ({ page }) => {
    const suffix = entitySuffix(test.info().title);
    const seeded: EntityRef[] = [];
    let bundleId: string | null = null;

    try {
      const lorebook = await createLorebook(page.request, `Removable Lorebook ${suffix}`);
      seeded.push(lorebook);

      const { bundle, editor } = await openEditorForBundle(page, "empty.json");
      bundleId = bundle.id;
      const lorebooksTab = new StoryBundleLorebooksTabPage(page);

      await editor.switchToLorebooks();
      await lorebooksTab.waitFor();

      await lorebooksTab.search(suffix);
      await lorebooksTab.addItem(lorebook.id);
      await expect(lorebooksTab.selectedSection).toContainText(lorebook.name);

      await lorebooksTab.removeItem(lorebook.id);

      await expect(lorebooksTab.selectedEmptyState).toBeVisible();
      await expect(lorebooksTab.selectedSection).not.toContainText(lorebook.name);
      await expect(lorebooksTab.addButtonLocator(lorebook.id)).toBeVisible();
    } finally {
      for (const entity of seeded) await deleteLorebook(page.request, entity.id);
      if (bundleId) await page.request.delete(`/api/story-bundles/${bundleId}`);
    }
  });

  test("random button adds a lorebook from the filtered list", async ({ page }) => {
    const suffix = entitySuffix(test.info().title);
    const seeded: EntityRef[] = [];
    let bundleId: string | null = null;

    try {
      const lorebook = await createLorebook(page.request, `Random Lorebook ${suffix}`);
      seeded.push(lorebook);

      const { bundle, editor } = await openEditorForBundle(page, "empty.json");
      bundleId = bundle.id;
      const lorebooksTab = new StoryBundleLorebooksTabPage(page);

      await editor.switchToLorebooks();
      await lorebooksTab.waitFor();

      // Narrow the pool to the single seeded lorebook so the random pick is deterministic.
      await lorebooksTab.search(suffix);
      await lorebooksTab.pickRandom();

      await expect(lorebooksTab.selectedSection).toContainText(lorebook.name);
      await expect(lorebooksTab.addButtonLocator(lorebook.id)).toBeHidden();
    } finally {
      for (const entity of seeded) await deleteLorebook(page.request, entity.id);
      if (bundleId) await page.request.delete(`/api/story-bundles/${bundleId}`);
    }
  });

  test("load more reveals lorebooks beyond the first picker page", async ({ page }) => {
    const suffix = entitySuffix(test.info().title);
    const seeded: EntityRef[] = [];
    let bundleId: string | null = null;

    try {
      // 21 lorebooks exceed the picker page size of 20.
      for (let index = 0; index < 21; index++) {
        seeded.push(await createLorebook(page.request, `Paged Lorebook ${index} ${suffix}`));
      }

      const { bundle, editor } = await openEditorForBundle(page, "empty.json");
      bundleId = bundle.id;
      const lorebooksTab = new StoryBundleLorebooksTabPage(page);

      await editor.switchToLorebooks();
      await lorebooksTab.waitFor();

      await lorebooksTab.search(suffix);

      await expect(lorebooksTab.loadMoreButton).toBeVisible();
      await expect(lorebooksTab.loadMoreButton).toContainText(/20 of 21/);
      // Order-independent: only the first picker page of 20 is rendered.
      await expect(lorebooksTab.availableAddButtons).toHaveCount(20);

      await lorebooksTab.loadMore();

      // All 21 matches are rendered and the load-more button disappears.
      await expect(lorebooksTab.availableAddButtons).toHaveCount(21);
      await expect(lorebooksTab.loadMoreButton).toBeHidden();
    } finally {
      for (const entity of seeded) await deleteLorebook(page.request, entity.id);
      if (bundleId) await page.request.delete(`/api/story-bundles/${bundleId}`);
    }
  });
});

test.describe("Story Bundle Lorebooks Picker — Negative", () => {
  test("random button is disabled once every matching lorebook is added", async ({ page }) => {
    const suffix = entitySuffix(test.info().title);
    const seeded: EntityRef[] = [];
    let bundleId: string | null = null;

    try {
      const lorebook = await createLorebook(page.request, `Exhausted Lorebook ${suffix}`);
      seeded.push(lorebook);

      const { bundle, editor } = await openEditorForBundle(page, "empty.json");
      bundleId = bundle.id;
      const lorebooksTab = new StoryBundleLorebooksTabPage(page);

      await editor.switchToLorebooks();
      await lorebooksTab.waitFor();

      await lorebooksTab.search(suffix);
      await expect(lorebooksTab.randomButton).toBeEnabled();

      await lorebooksTab.addItem(lorebook.id);

      await expect(lorebooksTab.randomButton).toBeDisabled();
      await expect(lorebooksTab.emptyState).toBeVisible();
    } finally {
      for (const entity of seeded) await deleteLorebook(page.request, entity.id);
      if (bundleId) await page.request.delete(`/api/story-bundles/${bundleId}`);
    }
  });
});
