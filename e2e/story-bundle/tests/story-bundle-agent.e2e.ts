/**
 * Story Bundle Agents Tab — Playwright E2E Tests
 *
 * Covers: StoryBundleAgents component within the editor
 * - Agents tab renders with search and random buttons
 * - Agent search with no results shows empty state
 *
 * Each test imports its own data via importStoryBundleFixture and cleans up.
 */
import { expect, test } from "@playwright/test";
import path from "node:path";
import { BasePage } from "../pages/base.page.js";
import { HomePage } from "../../pages/home.page.js";
import { StoryBundlesPanelPage } from "../pages/story-bundles-panel.page.js";
import { StoryBundleEditorPage } from "../pages/story-bundle-editor.page.js";
import { StoryBundleAgentsTabPage } from "../pages/story-bundle-agents-tab.page.js";
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

test.describe("Story Bundle Agents — Positive", () => {
  test("agents tab renders with search and random buttons", async ({ page }) => {
    const { bundle, editor } = await openEditorForBundle(page, "empty.json");
    const agentsTab = new StoryBundleAgentsTabPage(page);
    const api = new StoryBundleAPI(page);

    await editor.switchToAgents();
    await agentsTab.waitFor();

    await expect(agentsTab.searchInput).toBeVisible();
    await expect(agentsTab.randomButton).toBeVisible();

    await api.delete(bundle.id);
  });
});

test.describe("Story Bundle Agents — Negative", () => {
  test("agent search with no results shows empty state", async ({ page }) => {
    const { bundle, editor } = await openEditorForBundle(page, "empty.json");
    const agentsTab = new StoryBundleAgentsTabPage(page);
    const api = new StoryBundleAPI(page);

    await editor.switchToAgents();
    await agentsTab.waitFor();

    await agentsTab.search("nonexistent_agent_name_xyz");
    await expect(agentsTab.emptyState).toBeVisible({ timeout: 5_000 });

    await api.delete(bundle.id);
  });
});
