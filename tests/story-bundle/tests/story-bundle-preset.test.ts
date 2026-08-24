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
    // (no full wizard). The modal uses a generic role="dialog" since
    // ChoiceSelectionModal does not expose dedicated data-testid attributes.
    await editor.playButton.click();

    // The "Configure Preset Variables" dialog should appear directly
    const choiceDialog = page.getByRole("dialog", { name: "Configure Preset Variables" });
    await expect(choiceDialog).toBeVisible({ timeout: 10_000 });

    // Skip the dialog — uses role-based locator because ChoiceSelectionModal
    // is a shared component without story-bundle-specific data-testid attributes.
    await choiceDialog.getByRole("button", { name: "Skip", exact: true }).click();
    await expect(choiceDialog).toBeHidden({ timeout: 5_000 });

    // Cleanup
    await api.delete(bundle.id);
    await request.delete(`/api/prompts/${preset.id}`);
  });

  test("playing a bundle with a preset that has variables from the panel shows the choice dialog", async ({
    page,
    request,
  }) => {
    const suffix = Date.now().toString(36);

    // Create a preset with variables
    const presetResponse = await request.post("/api/prompts", {
      data: { name: `SB Panel Preset ${suffix}`, description: "Story bundle panel play test fixture." },
    });
    expect(presetResponse.ok()).toBeTruthy();
    const preset = (await presetResponse.json()) as { id: string };

    const variableResponse = await request.post(`/api/prompts/${preset.id}/variables`, {
      data: {
        variableName: `SB_PANEL_VAR_${suffix}`,
        question: "Choose an option",
        options: [
          { id: `sb_panel_${suffix}_a`, label: "Option A", value: "value_a" },
          { id: `sb_panel_${suffix}_b`, label: "Option B", value: "value_b" },
        ],
      },
    });
    expect(variableResponse.ok()).toBeTruthy();

    // Create a story bundle with the preset
    const api = new StoryBundleAPI(page);
    const bundle = await api.create({ name: `SB Panel Preset Test ${suffix}` });

    // Update the bundle to include the preset
    const updateResponse = await page.request.patch(`/api/story-bundles/${bundle.id}`, {
      data: { presetIds: [preset.id] },
    });
    expect(updateResponse.ok()).toBeTruthy();

    const base = new BasePage(page);
    const home = new HomePage(page);
    const panel = new StoryBundlesPanelPage(page);
    const editor = new StoryBundleEditorPage(page);

    let chatId: string | null = null;
    try {
      await base.goto();
      await home.openStoryBundlesPanel();
      await panel.waitFor();

      // Play was removed from the panel row action pill — start from the editor.
      await panel.clickRow(bundle.name);
      await editor.waitFor();
      await editor.playButton.click();

      // The "Configure Preset Variables" dialog should appear directly
      const choiceDialog = page.getByRole("dialog", { name: "Configure Preset Variables" });
      await expect(choiceDialog).toBeVisible({ timeout: 10_000 });

      // Skip the dialog
      await choiceDialog.getByRole("button", { name: "Skip", exact: true }).click();
      await expect(choiceDialog).toBeHidden({ timeout: 5_000 });

      // Track the created chat for cleanup
      const chatsResp = await request.get("/api/chats");
      const chats = (await chatsResp.json()) as Array<{ id: string; name: string }>;
      chatId = chats.find((c) => c.name === bundle.name)?.id ?? null;
    } finally {
      if (chatId) await request.delete(`/api/chats/${chatId}?force=true`);
      await api.delete(bundle.id);
      await request.delete(`/api/prompts/${preset.id}`);
    }
  });

  test("playing a bundle with the seeded Marinara preset from the panel shows the choice dialog", async ({
    page,
    request,
  }) => {
    // Locate the seeded stock preset by its reserved system key.
    const presetsResp = await request.get("/api/prompts");
    expect(presetsResp.ok()).toBeTruthy();
    const presets = (await presetsResp.json()) as Array<{ id: string; systemKey?: string }>;
    const marinaraPreset = presets.find((p) => p.systemKey === "marinara-universal-preset");
    expect(marinaraPreset, "seeded Marinara universal preset must exist").toBeDefined();

    // Sanity: the stock preset must actually have configurable variables.
    const fullResp = await request.get(`/api/prompts/${marinaraPreset!.id}/full`);
    expect(fullResp.ok()).toBeTruthy();
    const full = (await fullResp.json()) as { choiceBlocks?: Array<{ id: string }> };
    expect((full.choiceBlocks ?? []).length).toBeGreaterThan(0);

    const suffix = Date.now().toString(36);
    const api = new StoryBundleAPI(page);
    const bundle = await api.create({ name: `SB Marinara Preset Test ${suffix}` });

    const updateResponse = await page.request.patch(`/api/story-bundles/${bundle.id}`, {
      data: { presetIds: [marinaraPreset!.id] },
    });
    expect(updateResponse.ok()).toBeTruthy();

    const base = new BasePage(page);
    const home = new HomePage(page);
    const panel = new StoryBundlesPanelPage(page);
    const editor = new StoryBundleEditorPage(page);

    let chatId: string | null = null;
    try {
      await base.goto();
      await home.openStoryBundlesPanel();
      await panel.waitFor();

      // Play was removed from the panel row action pill — start from the editor.
      await panel.clickRow(bundle.name);
      await editor.waitFor();
      await editor.playButton.click();

      // The "Configure Preset Variables" dialog should appear directly
      const choiceDialog = page.getByRole("dialog", { name: "Configure Preset Variables" });
      await expect(choiceDialog).toBeVisible({ timeout: 10_000 });

      // Skip the dialog
      await choiceDialog.getByRole("button", { name: "Skip", exact: true }).click();
      await expect(choiceDialog).toBeHidden({ timeout: 5_000 });

      // The new chat must carry the Marinara preset.
      const chatsResp = await request.get("/api/chats");
      const chats = (await chatsResp.json()) as Array<{
        id: string;
        name: string;
        promptPresetId: string | null;
      }>;
      const chat = chats.find((c) => c.name === bundle.name);
      expect(chat).toBeDefined();
      chatId = chat!.id;
      expect(chat!.promptPresetId).toBe(marinaraPreset!.id);
    } finally {
      if (chatId) await request.delete(`/api/chats/${chatId}?force=true`);
      await api.delete(bundle.id);
    }
  });

  test("playing a bundle with a scenario and a variable preset from the panel shows the choice dialog after the scenario pick", async ({
    page,
    request,
  }) => {
    const suffix = Date.now().toString(36);

    // Create a preset with variables
    const presetResponse = await request.post("/api/prompts", {
      data: { name: `SB Scenario Preset ${suffix}`, description: "Scenario + variables play test fixture." },
    });
    expect(presetResponse.ok()).toBeTruthy();
    const preset = (await presetResponse.json()) as { id: string };

    const variableResponse = await request.post(`/api/prompts/${preset.id}/variables`, {
      data: {
        variableName: `SB_SCENARIO_VAR_${suffix}`,
        question: "Choose an option",
        options: [
          { id: `sb_scenario_${suffix}_a`, label: "Option A", value: "value_a" },
          { id: `sb_scenario_${suffix}_b`, label: "Option B", value: "value_b" },
        ],
      },
    });
    expect(variableResponse.ok()).toBeTruthy();

    // Create a bundle with the preset AND a scenario.
    const api = new StoryBundleAPI(page);
    const bundle = await api.create({ name: `SB Scenario Preset Test ${suffix}` });

    const scenarioTitle = `Scenario ${suffix}`;
    const updateResponse = await page.request.patch(`/api/story-bundles/${bundle.id}`, {
      data: {
        presetIds: [preset.id],
        scenarios: [{ id: `scenario_${suffix}`, title: scenarioTitle, openingMessage: "The story begins..." }],
      },
    });
    expect(updateResponse.ok()).toBeTruthy();

    const base = new BasePage(page);
    const home = new HomePage(page);
    const panel = new StoryBundlesPanelPage(page);
    const editor = new StoryBundleEditorPage(page);

    let chatId: string | null = null;
    try {
      await base.goto();
      await home.openStoryBundlesPanel();
      await panel.waitFor();

      // Play was removed from the panel row action pill — start from the editor.
      await panel.clickRow(bundle.name);
      await editor.waitFor();
      await editor.playButton.click();

      // Step 1: the scenario pick dialog appears first.
      await page.getByRole("button", { name: scenarioTitle, exact: true }).click();

      // Step 2: the "Configure Preset Variables" dialog must follow.
      const choiceDialog = page.getByRole("dialog", { name: "Configure Preset Variables" });
      await expect(choiceDialog).toBeVisible({ timeout: 10_000 });

      await choiceDialog.getByRole("button", { name: "Skip", exact: true }).click();
      await expect(choiceDialog).toBeHidden({ timeout: 5_000 });

      // Track the created chat for cleanup
      const chatsResp = await request.get("/api/chats");
      const chats = (await chatsResp.json()) as Array<{ id: string; name: string }>;
      chatId = chats.find((c) => c.name === bundle.name)?.id ?? null;
    } finally {
      if (chatId) await request.delete(`/api/chats/${chatId}?force=true`);
      await api.delete(bundle.id);
      await request.delete(`/api/prompts/${preset.id}`);
    }
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
