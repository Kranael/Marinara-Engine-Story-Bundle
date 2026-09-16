/**
 * Story Bundle Personas Picker — Playwright E2E Tests
 *
 * Covers: StoryBundlePersonas add/remove interactions within the editor
 * - Add a persona via its plus button → appears in the selected section
 * - Remove a persona via its X button → selected empty state returns
 * - Random button adds a persona from the filtered list
 * - Selecting a second persona replaces the first (a bundle plays exactly one)
 * - Random button is disabled once every matching persona is added
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
import { StoryBundlePersonasTabPage } from "../pages/story-bundle-personas-tab.page.js";
import { importStoryBundleFixture } from "../helpers/story-bundle-fixture.js";
import { createPersona, deletePersona, entitySuffix, type EntityRef } from "../helpers/story-bundle-entities.js";

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

test.describe("Story Bundle Personas Picker — Positive", () => {
  test("adding a persona via the plus button shows it in the selected list", async ({ page }) => {
    const suffix = entitySuffix(test.info().title);
    const seeded: EntityRef[] = [];
    let bundleId: string | null = null;

    try {
      const persona = await createPersona(page.request, `Picker Persona ${suffix}`);
      seeded.push(persona);

      const { bundle, editor } = await openEditorForBundle(page, "empty.json");
      bundleId = bundle.id;
      const personasTab = new StoryBundlePersonasTabPage(page);

      await editor.switchToPersonas();
      await personasTab.waitFor();

      await expect(personasTab.selectedEmptyState).toBeVisible();

      await personasTab.search(suffix);
      await personasTab.addItem(persona.id);

      await expect(personasTab.selectedSection).toContainText(persona.name);
      await expect(personasTab.addButtonLocator(persona.id)).toBeHidden();
      await expect(personasTab.selectedEmptyState).toBeHidden();
      await expect(personasTab.removeButtonLocator(persona.id)).toBeVisible();
    } finally {
      for (const entity of seeded) await deletePersona(page.request, entity.id);
      if (bundleId) await page.request.delete(`/api/story-bundles/${bundleId}`);
    }
  });

  test("removing a persona via the X button restores the selected empty state", async ({ page }) => {
    const suffix = entitySuffix(test.info().title);
    const seeded: EntityRef[] = [];
    let bundleId: string | null = null;

    try {
      const persona = await createPersona(page.request, `Removable Persona ${suffix}`);
      seeded.push(persona);

      const { bundle, editor } = await openEditorForBundle(page, "empty.json");
      bundleId = bundle.id;
      const personasTab = new StoryBundlePersonasTabPage(page);

      await editor.switchToPersonas();
      await personasTab.waitFor();

      await personasTab.search(suffix);
      await personasTab.addItem(persona.id);
      await expect(personasTab.selectedSection).toContainText(persona.name);

      await personasTab.removeItem(persona.id);

      await expect(personasTab.selectedEmptyState).toBeVisible();
      await expect(personasTab.selectedSection).not.toContainText(persona.name);
      await expect(personasTab.addButtonLocator(persona.id)).toBeVisible();
    } finally {
      for (const entity of seeded) await deletePersona(page.request, entity.id);
      if (bundleId) await page.request.delete(`/api/story-bundles/${bundleId}`);
    }
  });

  test("random button adds a persona from the filtered list", async ({ page }) => {
    const suffix = entitySuffix(test.info().title);
    const seeded: EntityRef[] = [];
    let bundleId: string | null = null;

    try {
      const persona = await createPersona(page.request, `Random Persona ${suffix}`);
      seeded.push(persona);

      const { bundle, editor } = await openEditorForBundle(page, "empty.json");
      bundleId = bundle.id;
      const personasTab = new StoryBundlePersonasTabPage(page);

      await editor.switchToPersonas();
      await personasTab.waitFor();

      // Narrow the pool to the single seeded persona so the random pick is deterministic.
      await personasTab.search(suffix);
      await personasTab.pickRandom();

      await expect(personasTab.selectedSection).toContainText(persona.name);
      await expect(personasTab.addButtonLocator(persona.id)).toBeHidden();
    } finally {
      for (const entity of seeded) await deletePersona(page.request, entity.id);
      if (bundleId) await page.request.delete(`/api/story-bundles/${bundleId}`);
    }
  });

  test("load more reveals personas beyond the first picker page", async ({ page }) => {
    const suffix = entitySuffix(test.info().title);
    const seeded: EntityRef[] = [];
    let bundleId: string | null = null;

    try {
      // 21 personas exceed the picker page size of 20.
      for (let index = 0; index < 21; index++) {
        seeded.push(await createPersona(page.request, `Paged Persona ${index} ${suffix}`));
      }

      const { bundle, editor } = await openEditorForBundle(page, "empty.json");
      bundleId = bundle.id;
      const personasTab = new StoryBundlePersonasTabPage(page);

      await editor.switchToPersonas();
      await personasTab.waitFor();

      await personasTab.search(suffix);

      await expect(personasTab.loadMoreButton).toBeVisible();
      await expect(personasTab.loadMoreButton).toContainText(/20 of 21/);
      // Order-independent: only the first picker page of 20 is rendered.
      await expect(personasTab.availableAddButtons).toHaveCount(20);

      await personasTab.loadMore();

      // All 21 matches are rendered and the load-more button disappears.
      await expect(personasTab.availableAddButtons).toHaveCount(21);
      await expect(personasTab.loadMoreButton).toBeHidden();
    } finally {
      for (const entity of seeded) await deletePersona(page.request, entity.id);
      if (bundleId) await page.request.delete(`/api/story-bundles/${bundleId}`);
    }
  });

  test("selecting a second persona replaces the first one", async ({ page }) => {
    const suffix = entitySuffix(test.info().title);
    const seeded: EntityRef[] = [];
    let bundleId: string | null = null;

    try {
      const alpha = await createPersona(page.request, `Persona Alpha ${suffix}`);
      const beta = await createPersona(page.request, `Persona Beta ${suffix}`);
      seeded.push(alpha, beta);

      const { bundle, editor } = await openEditorForBundle(page, "empty.json");
      bundleId = bundle.id;
      const personasTab = new StoryBundlePersonasTabPage(page);

      await editor.switchToPersonas();
      await personasTab.waitFor();

      await personasTab.search(suffix);
      await personasTab.addItem(alpha.id);
      await expect(personasTab.selectedSection).toContainText(alpha.name);

      // A bundle plays exactly one persona: picking Beta replaces Alpha.
      await personasTab.addItem(beta.id);

      await expect(personasTab.selectedSection).toContainText(beta.name);
      await expect(personasTab.selectedSection).not.toContainText(alpha.name);
      await expect(personasTab.removeButtonLocator(beta.id)).toBeVisible();
      await expect(personasTab.removeButtonLocator(alpha.id)).toBeHidden();
      // Alpha is available for selection again.
      await expect(personasTab.addButtonLocator(alpha.id)).toBeVisible();
    } finally {
      for (const entity of seeded) await deletePersona(page.request, entity.id);
      if (bundleId) await page.request.delete(`/api/story-bundles/${bundleId}`);
    }
  });
});

test.describe("Story Bundle Personas Picker — Negative", () => {
  test("picker shows the already-selected empty state once a persona is chosen", async ({ page }) => {
    const suffix = entitySuffix(test.info().title);
    const seeded: EntityRef[] = [];
    let bundleId: string | null = null;

    try {
      const persona = await createPersona(page.request, `Solo Persona ${suffix}`);
      seeded.push(persona);

      const { bundle, editor } = await openEditorForBundle(page, "empty.json");
      bundleId = bundle.id;
      const personasTab = new StoryBundlePersonasTabPage(page);

      await editor.switchToPersonas();
      await personasTab.waitFor();

      await personasTab.search(suffix);
      await personasTab.addItem(persona.id);

      // The search still matches the seeded persona, but it is selected — so
      // the picker explains the selection instead of claiming no matches.
      await expect(personasTab.emptyState).toBeVisible();
      await expect(personasTab.emptyState).toContainText(/already selected/i);
      await expect(personasTab.availableAddButtons).toHaveCount(0);
    } finally {
      for (const entity of seeded) await deletePersona(page.request, entity.id);
      if (bundleId) await page.request.delete(`/api/story-bundles/${bundleId}`);
    }
  });

  test("random button is disabled once every matching persona is added", async ({ page }) => {
    const suffix = entitySuffix(test.info().title);
    const seeded: EntityRef[] = [];
    let bundleId: string | null = null;

    try {
      const persona = await createPersona(page.request, `Exhausted Persona ${suffix}`);
      seeded.push(persona);

      const { bundle, editor } = await openEditorForBundle(page, "empty.json");
      bundleId = bundle.id;
      const personasTab = new StoryBundlePersonasTabPage(page);

      await editor.switchToPersonas();
      await personasTab.waitFor();

      await personasTab.search(suffix);
      await expect(personasTab.randomButton).toBeEnabled();

      await personasTab.addItem(persona.id);

      await expect(personasTab.randomButton).toBeDisabled();
      await expect(personasTab.emptyState).toBeVisible();
    } finally {
      for (const entity of seeded) await deletePersona(page.request, entity.id);
      if (bundleId) await page.request.delete(`/api/story-bundles/${bundleId}`);
    }
  });
});
