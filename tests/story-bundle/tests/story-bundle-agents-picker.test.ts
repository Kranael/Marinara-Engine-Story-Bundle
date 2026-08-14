/**
 * Story Bundle Agents Picker — Playwright E2E Tests
 *
 * Covers: StoryBundleAgents add/remove interactions within the editor
 * - Add a custom agent via its plus button → appears in the selected section
 * - Remove a custom agent via its X button → selected empty state returns
 * - Random button adds an agent from the filtered list
 * - Load more paginates beyond the 20-item picker page size
 * - Random button is disabled once every matching agent is added
 *
 * The agents picker keys its add/remove buttons by agent `type` (not the
 * config id), so custom agents are seeded through POST /api/agents with
 * unique names/types and the returned `type` drives the locators.
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
import { StoryBundleAgentsTabPage } from "../pages/story-bundle-agents-tab.page.js";
import { importStoryBundleFixture } from "../helpers/story-bundle-fixture.js";
import {
  createCustomAgent,
  deleteAgent,
  entitySuffix,
  type AgentRef,
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

test.describe("Story Bundle Agents Picker — Positive", () => {
  test("adding a custom agent via the plus button shows it in the selected list", async ({ page }) => {
    const suffix = entitySuffix(test.info().title);
    const seeded: AgentRef[] = [];
    let bundleId: string | null = null;

    try {
      const agent = await createCustomAgent(page.request, `Picker Agent ${suffix}`);
      seeded.push(agent);

      const { bundle, editor } = await openEditorForBundle(page, "empty.json");
      bundleId = bundle.id;
      const agentsTab = new StoryBundleAgentsTabPage(page);

      await editor.switchToAgents();
      await agentsTab.waitFor();

      await expect(agentsTab.selectedEmptyState).toBeVisible();

      await agentsTab.search(suffix);
      await agentsTab.addItem(agent.type);

      await expect(agentsTab.selectedSection).toContainText(agent.name);
      await expect(agentsTab.addButtonLocator(agent.type)).toBeHidden();
      await expect(agentsTab.selectedEmptyState).toBeHidden();
      await expect(agentsTab.removeButtonLocator(agent.type)).toBeVisible();
    } finally {
      for (const entity of seeded) await deleteAgent(page.request, entity.id);
      if (bundleId) await page.request.delete(`/api/story-bundles/${bundleId}`);
    }
  });

  test("removing a custom agent via the X button restores the selected empty state", async ({ page }) => {
    const suffix = entitySuffix(test.info().title);
    const seeded: AgentRef[] = [];
    let bundleId: string | null = null;

    try {
      const agent = await createCustomAgent(page.request, `Removable Agent ${suffix}`);
      seeded.push(agent);

      const { bundle, editor } = await openEditorForBundle(page, "empty.json");
      bundleId = bundle.id;
      const agentsTab = new StoryBundleAgentsTabPage(page);

      await editor.switchToAgents();
      await agentsTab.waitFor();

      await agentsTab.search(suffix);
      await agentsTab.addItem(agent.type);
      await expect(agentsTab.selectedSection).toContainText(agent.name);

      await agentsTab.removeItem(agent.type);

      await expect(agentsTab.selectedEmptyState).toBeVisible();
      await expect(agentsTab.selectedSection).not.toContainText(agent.name);
      await expect(agentsTab.addButtonLocator(agent.type)).toBeVisible();
    } finally {
      for (const entity of seeded) await deleteAgent(page.request, entity.id);
      if (bundleId) await page.request.delete(`/api/story-bundles/${bundleId}`);
    }
  });

  test("random button adds an agent from the filtered list", async ({ page }) => {
    const suffix = entitySuffix(test.info().title);
    const seeded: AgentRef[] = [];
    let bundleId: string | null = null;

    try {
      const agent = await createCustomAgent(page.request, `Random Agent ${suffix}`);
      seeded.push(agent);

      const { bundle, editor } = await openEditorForBundle(page, "empty.json");
      bundleId = bundle.id;
      const agentsTab = new StoryBundleAgentsTabPage(page);

      await editor.switchToAgents();
      await agentsTab.waitFor();

      // Narrow the pool to the single seeded agent so the random pick is deterministic.
      await agentsTab.search(suffix);
      await agentsTab.pickRandom();

      await expect(agentsTab.selectedSection).toContainText(agent.name);
      await expect(agentsTab.addButtonLocator(agent.type)).toBeHidden();
    } finally {
      for (const entity of seeded) await deleteAgent(page.request, entity.id);
      if (bundleId) await page.request.delete(`/api/story-bundles/${bundleId}`);
    }
  });

  test("load more reveals agents beyond the first picker page", async ({ page }) => {
    const suffix = entitySuffix(test.info().title);
    const seeded: AgentRef[] = [];
    let bundleId: string | null = null;

    try {
      // 21 agents exceed the picker page size of 20.
      for (let index = 0; index < 21; index++) {
        seeded.push(await createCustomAgent(page.request, `Paged Agent ${index} ${suffix}`));
      }

      const { bundle, editor } = await openEditorForBundle(page, "empty.json");
      bundleId = bundle.id;
      const agentsTab = new StoryBundleAgentsTabPage(page);

      await editor.switchToAgents();
      await agentsTab.waitFor();

      await agentsTab.search(suffix);

      await expect(agentsTab.loadMoreButton).toBeVisible();
      await expect(agentsTab.loadMoreButton).toContainText(/20 of 21/);
      // Order-independent: only the first picker page of 20 is rendered.
      await expect(agentsTab.availableAddButtons).toHaveCount(20);

      await agentsTab.loadMore();

      // All 21 matches are rendered and the load-more button disappears.
      await expect(agentsTab.availableAddButtons).toHaveCount(21);
      await expect(agentsTab.loadMoreButton).toBeHidden();
    } finally {
      for (const entity of seeded) await deleteAgent(page.request, entity.id);
      if (bundleId) await page.request.delete(`/api/story-bundles/${bundleId}`);
    }
  });
});

test.describe("Story Bundle Agents Picker — Negative", () => {
  test("random button is disabled once every matching agent is added", async ({ page }) => {
    const suffix = entitySuffix(test.info().title);
    const seeded: AgentRef[] = [];
    let bundleId: string | null = null;

    try {
      const agent = await createCustomAgent(page.request, `Exhausted Agent ${suffix}`);
      seeded.push(agent);

      const { bundle, editor } = await openEditorForBundle(page, "empty.json");
      bundleId = bundle.id;
      const agentsTab = new StoryBundleAgentsTabPage(page);

      await editor.switchToAgents();
      await agentsTab.waitFor();

      await agentsTab.search(suffix);
      await expect(agentsTab.randomButton).toBeEnabled();

      await agentsTab.addItem(agent.type);

      await expect(agentsTab.randomButton).toBeDisabled();
      await expect(agentsTab.emptyState).toBeVisible();
    } finally {
      for (const entity of seeded) await deleteAgent(page.request, entity.id);
      if (bundleId) await page.request.delete(`/api/story-bundles/${bundleId}`);
    }
  });
});
