/**
 * Story Bundle Party Toggle — Playwright E2E Tests
 *
 * Covers: StoryBundlePartyMemberToggle within the editor's Characters tab
 * - A newly-added character defaults to NPC
 * - Clicking the toggle marks a character as a party member, clicking again
 *   reverts it back to NPC
 * - Removing a character clears its party membership
 * - Party membership persists via the API after Save
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
import { createCharacter, deleteCharacter, entitySuffix, type EntityRef } from "../helpers/story-bundle-entities.js";

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

test.describe("Story Bundle Party Toggle — Positive", () => {
  test("a newly-added character defaults to NPC", async ({ page }) => {
    const suffix = entitySuffix(test.info().title);
    const seeded: EntityRef[] = [];
    let bundleId: string | null = null;

    try {
      const hero = await createCharacter(page.request, `Party Toggle Hero ${suffix}`);
      seeded.push(hero);

      const { bundle, editor } = await openEditorForBundle(page, "empty.json");
      bundleId = bundle.id;
      const charsTab = new StoryBundleCharactersTabPage(page);

      await editor.switchToCharacters();
      await charsTab.waitFor();
      await charsTab.search(suffix);
      await charsTab.addItem(hero.id);

      await expect(charsTab.partyToggleLocator(hero.id)).toHaveText(/NPC/);
    } finally {
      for (const entity of seeded) await deleteCharacter(page.request, entity.id);
      if (bundleId) await page.request.delete(`/api/story-bundles/${bundleId}`);
    }
  });

  test("clicking the toggle marks a character as a party member, clicking again reverts to NPC", async ({
    page,
  }) => {
    const suffix = entitySuffix(test.info().title);
    const seeded: EntityRef[] = [];
    let bundleId: string | null = null;

    try {
      const hero = await createCharacter(page.request, `Party Toggle Flip ${suffix}`);
      seeded.push(hero);

      const { bundle, editor } = await openEditorForBundle(page, "empty.json");
      bundleId = bundle.id;
      const charsTab = new StoryBundleCharactersTabPage(page);

      await editor.switchToCharacters();
      await charsTab.waitFor();
      await charsTab.search(suffix);
      await charsTab.addItem(hero.id);

      await charsTab.togglePartyMember(hero.id);
      await expect(charsTab.partyToggleLocator(hero.id)).toHaveText(/Party/);
      await expect(editor.saveButton).toBeEnabled();

      await charsTab.togglePartyMember(hero.id);
      await expect(charsTab.partyToggleLocator(hero.id)).toHaveText(/NPC/);
    } finally {
      for (const entity of seeded) await deleteCharacter(page.request, entity.id);
      if (bundleId) await page.request.delete(`/api/story-bundles/${bundleId}`);
    }
  });

  test("removing a character clears its party membership", async ({ page }) => {
    const suffix = entitySuffix(test.info().title);
    const seeded: EntityRef[] = [];
    let bundleId: string | null = null;

    try {
      const hero = await createCharacter(page.request, `Party Toggle Remove ${suffix}`);
      seeded.push(hero);

      const { bundle, editor } = await openEditorForBundle(page, "empty.json");
      bundleId = bundle.id;
      const charsTab = new StoryBundleCharactersTabPage(page);

      await editor.switchToCharacters();
      await charsTab.waitFor();
      await charsTab.search(suffix);
      await charsTab.addItem(hero.id);
      await charsTab.togglePartyMember(hero.id);
      await expect(charsTab.partyToggleLocator(hero.id)).toHaveText(/Party/);

      await charsTab.removeItem(hero.id);
      await charsTab.addItem(hero.id);

      // Re-added after removal — party membership was not retained.
      await expect(charsTab.partyToggleLocator(hero.id)).toHaveText(/NPC/);
    } finally {
      for (const entity of seeded) await deleteCharacter(page.request, entity.id);
      if (bundleId) await page.request.delete(`/api/story-bundles/${bundleId}`);
    }
  });

  test("party membership persists via the API after Save", async ({ page }) => {
    const suffix = entitySuffix(test.info().title);
    const seeded: EntityRef[] = [];
    let bundleId: string | null = null;

    try {
      const hero = await createCharacter(page.request, `Party Toggle Save ${suffix}`);
      seeded.push(hero);

      const { bundle, editor } = await openEditorForBundle(page, "empty.json");
      bundleId = bundle.id;
      const charsTab = new StoryBundleCharactersTabPage(page);

      await editor.switchToCharacters();
      await charsTab.waitFor();
      await charsTab.search(suffix);
      await charsTab.addItem(hero.id);
      await charsTab.togglePartyMember(hero.id);

      await editor.saveButton.click();
      await expect(page.getByText("Story bundle saved.")).toBeVisible({ timeout: 10_000 });

      const response = await page.request.get(`/api/story-bundles/${bundle.id}`);
      const saved = (await response.json()) as { partyCharacterIds?: string[] };
      expect(saved.partyCharacterIds).toContain(hero.id);
    } finally {
      for (const entity of seeded) await deleteCharacter(page.request, entity.id);
      if (bundleId) await page.request.delete(`/api/story-bundles/${bundleId}`);
    }
  });
});
