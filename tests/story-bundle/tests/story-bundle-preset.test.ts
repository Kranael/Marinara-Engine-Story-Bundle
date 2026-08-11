/**
 * Story Bundle Presets Tab — Playwright E2E Tests
 *
 * Covers: StoryBundlePresets component within the editor
 * - Presets tab renders with search and random buttons
 * - Preset search with no results shows empty state
 * - Playing a bundle with a preset that has variables shows the choice dialog
 *
 * Each test imports its own data via importStoryBundleFixture and cleans up.
 */
import { expect, test } from "@playwright/test";
import path from "node:path";
import { BasePage } from "../pages/base.page.js";
import { HomePage } from "../../pages/home.page.js";
import { StoryBundlesPanelPage } from "../pages/story-bundles-panel.page.js";
import { StoryBundleEditorPage } from "../pages/story-bundle-editor.page.js";
import { StoryBundlePresetsTabPage } from "../pages/story-bundle-presets-tab.page.js";
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

test.describe("Story Bundle Presets — Positive", () => {
  test("presets tab renders with search and random buttons", async ({ page }) => {
    const { bundle, editor } = await openEditorForBundle(page, "empty.json");
    const presetsTab = new StoryBundlePresetsTabPage(page);
    const api = new StoryBundleAPI(page);

    await editor.switchToPresets();
    await presetsTab.waitFor();

    await expect(presetsTab.searchInput).toBeVisible();
    await expect(presetsTab.randomButton).toBeVisible();

    await api.delete(bundle.id);
  });

  test("playing a bundle with a preset that has variables shows the choice dialog", async ({ page, request }) => {
    const suffix = Date.now().toString(36);

    // Create a preset with variables
    const presetResponse = await request.post("/api/prompts", {
      data: { name: `SB Preset ${suffix}`, description: "Story bundle preset test fixture." },
    });
    expect(presetResponse.ok()).toBeTruthy();
    const preset = (await presetResponse.json()) as { id: string };

    const variableResponse = await request.post(`/api/prompts/${preset.id}/variables`, {
      data: {
        variableName: `SB_VAR_${suffix}`,
        question: "Choose an option",
        options: [
          { id: `sb_${suffix}_a`, label: "Option A", value: "value_a" },
          { id: `sb_${suffix}_b`, label: "Option B", value: "value_b" },
        ],
      },
    });
    expect(variableResponse.ok()).toBeTruthy();

    // Create a story bundle with the preset
    const api = new StoryBundleAPI(page);
    const bundle = await api.create({ name: `SB Preset Test ${suffix}` });

    // Update the bundle to include the preset
    const updateResponse = await page.request.patch(`/api/story-bundles/${bundle.id}`, {
      data: { presetIds: [preset.id] },
    });
    expect(updateResponse.ok()).toBeTruthy();

    const base = new BasePage(page);
    const home = new HomePage(page);
    const panel = new StoryBundlesPanelPage(page);
    const editor = new StoryBundleEditorPage(page);

    await base.goto();
    await home.openStoryBundlesPanel();
    await panel.waitFor();

    await panel.clickRow(bundle.name);
    await editor.waitFor();

    // Click Play — this creates a chat with promptPresetId set.
    // Since the preset has variables, the ChoiceSelectionModal opens directly
    // (no full wizard).
    await editor.playButton.click();

    // The "Configure Preset Variables" dialog should appear directly
    const choiceDialog = page.getByRole("dialog", { name: "Configure Preset Variables" });
    await expect(choiceDialog).toBeVisible({ timeout: 10_000 });

    // Skip the dialog
    await choiceDialog.getByRole("button", { name: "Skip", exact: true }).click();
    await expect(choiceDialog).toBeHidden({ timeout: 5_000 });

    // Cleanup
    await api.delete(bundle.id);
    await request.delete(`/api/prompts/${preset.id}`);
  });
});

test.describe("Story Bundle Presets — Negative", () => {
  test("preset search with no results shows empty state", async ({ page }) => {
    const { bundle, editor } = await openEditorForBundle(page, "empty.json");
    const presetsTab = new StoryBundlePresetsTabPage(page);
    const api = new StoryBundleAPI(page);

    await editor.switchToPresets();
    await presetsTab.waitFor();

    await presetsTab.search("nonexistent_preset_name_xyz");
    await expect(presetsTab.emptyState).toBeVisible({ timeout: 5_000 });

    await api.delete(bundle.id);
  });
});
