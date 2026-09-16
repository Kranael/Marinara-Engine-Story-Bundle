/**
 * Story Bundle Characters Picker — Playwright E2E Tests
 *
 * Covers: StoryBundleCharacters add/remove interactions within the editor
 * - Add a character via its plus button → appears in the selected section
 * - Remove a character via its X button → selected empty state returns
 * - Random button adds a character from the filtered list
 * - Add-from-group adds every group member at once
 * - Load more paginates beyond the 20-item picker page size
 * - Add-from-group button is disabled while no group is selected
 * - Random button is disabled once every matching character is added
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
import { StoryBundleCharactersTabPage } from "../pages/story-bundle-characters-tab.page.js";
import { importStoryBundleFixture } from "../helpers/story-bundle-fixture.js";
import {
  createCharacter,
  createCharacterGroup,
  deleteCharacter,
  deleteCharacterGroup,
  entitySuffix,
  type EntityRef,
} from "../helpers/story-bundle-entities.js";

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

test.describe("Story Bundle Characters Picker — Positive", () => {
  test("adding a character via the plus button shows it in the selected list", async ({ page }) => {
    const suffix = entitySuffix(test.info().title);
    const seeded: EntityRef[] = [];
    let bundleId: string | null = null;

    try {
      const hero = await createCharacter(page.request, `Picker Hero ${suffix}`);
      seeded.push(hero);

      const { bundle, editor } = await openEditorForBundle(page, "empty.json");
      bundleId = bundle.id;
      const charsTab = new StoryBundleCharactersTabPage(page);

      await editor.switchToCharacters();
      await charsTab.waitFor();

      await expect(charsTab.selectedEmptyState).toBeVisible();

      await charsTab.search(suffix);
      await charsTab.addItem(hero.id);

      await expect(charsTab.selectedSection).toContainText(hero.name);
      await expect(charsTab.addButtonLocator(hero.id)).toBeHidden();
      await expect(charsTab.selectedEmptyState).toBeHidden();
      await expect(charsTab.removeButtonLocator(hero.id)).toBeVisible();
    } finally {
      for (const entity of seeded) await deleteCharacter(page.request, entity.id);
      if (bundleId) await page.request.delete(`/api/story-bundles/${bundleId}`);
    }
  });

  test("removing a character via the X button restores the selected empty state", async ({ page }) => {
    const suffix = entitySuffix(test.info().title);
    const seeded: EntityRef[] = [];
    let bundleId: string | null = null;

    try {
      const hero = await createCharacter(page.request, `Removable Hero ${suffix}`);
      seeded.push(hero);

      const { bundle, editor } = await openEditorForBundle(page, "empty.json");
      bundleId = bundle.id;
      const charsTab = new StoryBundleCharactersTabPage(page);

      await editor.switchToCharacters();
      await charsTab.waitFor();

      await charsTab.search(suffix);
      await charsTab.addItem(hero.id);
      await expect(charsTab.selectedSection).toContainText(hero.name);

      await charsTab.removeItem(hero.id);

      await expect(charsTab.selectedEmptyState).toBeVisible();
      await expect(charsTab.selectedSection).not.toContainText(hero.name);
      await expect(charsTab.addButtonLocator(hero.id)).toBeVisible();
    } finally {
      for (const entity of seeded) await deleteCharacter(page.request, entity.id);
      if (bundleId) await page.request.delete(`/api/story-bundles/${bundleId}`);
    }
  });

  test("random button adds a character from the filtered list", async ({ page }) => {
    const suffix = entitySuffix(test.info().title);
    const seeded: EntityRef[] = [];
    let bundleId: string | null = null;

    try {
      const hero = await createCharacter(page.request, `Random Hero ${suffix}`);
      seeded.push(hero);

      const { bundle, editor } = await openEditorForBundle(page, "empty.json");
      bundleId = bundle.id;
      const charsTab = new StoryBundleCharactersTabPage(page);

      await editor.switchToCharacters();
      await charsTab.waitFor();

      // Narrow the pool to the single seeded character so the random pick is deterministic.
      await charsTab.search(suffix);
      await charsTab.pickRandom();

      await expect(charsTab.selectedSection).toContainText(hero.name);
      await expect(charsTab.addButtonLocator(hero.id)).toBeHidden();
    } finally {
      for (const entity of seeded) await deleteCharacter(page.request, entity.id);
      if (bundleId) await page.request.delete(`/api/story-bundles/${bundleId}`);
    }
  });

  test("add-from-group adds every group member to the selected list", async ({ page }) => {
    const suffix = entitySuffix(test.info().title);
    const seeded: EntityRef[] = [];
    const seededGroups: EntityRef[] = [];
    let bundleId: string | null = null;

    try {
      const alpha = await createCharacter(page.request, `Group Alpha ${suffix}`);
      const beta = await createCharacter(page.request, `Group Beta ${suffix}`);
      seeded.push(alpha, beta);
      const group = await createCharacterGroup(page.request, `Picker Group ${suffix}`, [alpha.id, beta.id]);
      seededGroups.push(group);

      const { bundle, editor } = await openEditorForBundle(page, "empty.json");
      bundleId = bundle.id;
      const charsTab = new StoryBundleCharactersTabPage(page);

      await editor.switchToCharacters();
      await charsTab.waitFor();

      await charsTab.selectGroup(group.id);
      await charsTab.addGroup();

      await expect(charsTab.selectedSection).toContainText(alpha.name);
      await expect(charsTab.selectedSection).toContainText(beta.name);
      await expect(charsTab.addButtonLocator(alpha.id)).toBeHidden();
      await expect(charsTab.addButtonLocator(beta.id)).toBeHidden();
    } finally {
      for (const group of seededGroups) await deleteCharacterGroup(page.request, group.id);
      for (const entity of seeded) await deleteCharacter(page.request, entity.id);
      if (bundleId) await page.request.delete(`/api/story-bundles/${bundleId}`);
    }
  });

  test("load more reveals characters beyond the first picker page", async ({ page }) => {
    const suffix = entitySuffix(test.info().title);
    const seeded: EntityRef[] = [];
    let bundleId: string | null = null;

    try {
      // 21 characters exceed the picker page size of 20.
      for (let index = 0; index < 21; index++) {
        seeded.push(await createCharacter(page.request, `Paged Char ${index} ${suffix}`));
      }

      const { bundle, editor } = await openEditorForBundle(page, "empty.json");
      bundleId = bundle.id;
      const charsTab = new StoryBundleCharactersTabPage(page);

      await editor.switchToCharacters();
      await charsTab.waitFor();

      await charsTab.search(suffix);

      await expect(charsTab.loadMoreButton).toBeVisible();
      await expect(charsTab.loadMoreButton).toContainText(/20 of 21/);
      // Order-independent: only the first picker page of 20 is rendered.
      await expect(charsTab.availableAddButtons).toHaveCount(20);

      await charsTab.loadMore();

      // All 21 matches are rendered and the load-more button disappears.
      await expect(charsTab.availableAddButtons).toHaveCount(21);
      await expect(charsTab.loadMoreButton).toBeHidden();
    } finally {
      for (const entity of seeded) await deleteCharacter(page.request, entity.id);
      if (bundleId) await page.request.delete(`/api/story-bundles/${bundleId}`);
    }
  });
});

test.describe("Story Bundle Characters Picker — Negative", () => {
  test("add-from-group button is disabled while no group is selected", async ({ page }) => {
    const suffix = entitySuffix(test.info().title);
    const seeded: EntityRef[] = [];
    const seededGroups: EntityRef[] = [];
    let bundleId: string | null = null;

    try {
      const hero = await createCharacter(page.request, `Lonely Hero ${suffix}`);
      seeded.push(hero);
      // The groups section only renders once at least one group exists.
      const group = await createCharacterGroup(page.request, `Disabled Group ${suffix}`, [hero.id]);
      seededGroups.push(group);

      const { bundle, editor } = await openEditorForBundle(page, "empty.json");
      bundleId = bundle.id;
      const charsTab = new StoryBundleCharactersTabPage(page);

      await editor.switchToCharacters();
      await charsTab.waitFor();

      await expect(charsTab.groupSelect).toBeVisible();
      await expect(charsTab.addGroupButton).toBeDisabled();
    } finally {
      for (const group of seededGroups) await deleteCharacterGroup(page.request, group.id);
      for (const entity of seeded) await deleteCharacter(page.request, entity.id);
      if (bundleId) await page.request.delete(`/api/story-bundles/${bundleId}`);
    }
  });

  test("random button is disabled once every matching character is added", async ({ page }) => {
    const suffix = entitySuffix(test.info().title);
    const seeded: EntityRef[] = [];
    let bundleId: string | null = null;

    try {
      const hero = await createCharacter(page.request, `Exhausted Hero ${suffix}`);
      seeded.push(hero);

      const { bundle, editor } = await openEditorForBundle(page, "empty.json");
      bundleId = bundle.id;
      const charsTab = new StoryBundleCharactersTabPage(page);

      await editor.switchToCharacters();
      await charsTab.waitFor();

      await charsTab.search(suffix);
      await expect(charsTab.randomButton).toBeEnabled();

      await charsTab.addItem(hero.id);

      await expect(charsTab.randomButton).toBeDisabled();
      await expect(charsTab.emptyState).toBeVisible();
    } finally {
      for (const entity of seeded) await deleteCharacter(page.request, entity.id);
      if (bundleId) await page.request.delete(`/api/story-bundles/${bundleId}`);
    }
  });
});
