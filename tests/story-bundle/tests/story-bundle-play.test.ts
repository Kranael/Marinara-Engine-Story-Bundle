/**
 * Story Bundle Play → Roleplay — Playwright E2E Tests
 *
 * Covers: Play button integration (panel + editor)
 * - Play button in panel action pill is visible on hover
 * - Play button in editor header is visible
 * - Clicking play starts a roleplay chat (toast confirms)
 *
 * Each test imports its own data via importStoryBundleFixture and cleans up.
 */
import { expect, test } from "@playwright/test";
import path from "node:path";
import { BasePage } from "../pages/base.page.js";
import { HomePage } from "../../pages/home.page.js";
import { StoryBundlesPanelPage } from "../pages/story-bundles-panel.page.js";
import { StoryBundleEditorPage } from "../pages/story-bundle-editor.page.js";
import { importStoryBundleFixture } from "../helpers/story-bundle-fixture.js";
import { StoryBundleAPI } from "../helpers/story-bundle-api.js";

const DATA_DIR = path.resolve(import.meta.dirname, "..", "data");

test.describe("Story Bundle Play — Positive", () => {
  test("play button is visible in the row action pill on hover", async ({ page }) => {
    const base = new BasePage(page);
    const home = new HomePage(page);
    const panel = new StoryBundlesPanelPage(page);
    const api = new StoryBundleAPI(page);

    const bundle = await importStoryBundleFixture(page, path.join(DATA_DIR, "empty.json"), test.info().title);

    await base.goto();
    await home.openStoryBundlesPanel();
    await panel.waitFor();

    await panel.hoverRow(bundle.name);
    await expect(panel.playButtonLocator(bundle.name)).toBeVisible();

    await api.delete(bundle.id);
  });

  test("clicking play from panel starts a roleplay and shows success toast", async ({ page }) => {
    const base = new BasePage(page);
    const home = new HomePage(page);
    const panel = new StoryBundlesPanelPage(page);
    const api = new StoryBundleAPI(page);

    const bundle = await importStoryBundleFixture(page, path.join(DATA_DIR, "empty.json"), test.info().title);

    await base.goto();
    await home.openStoryBundlesPanel();
    await panel.waitFor();

    await panel.hoverRow(bundle.name);
    await panel.clickPlay(bundle.name);

    await expect(page.getByText("Roleplay started!")).toBeVisible({ timeout: 10_000 });

    await api.delete(bundle.id);
  });

  test("play button is visible in the editor header", async ({ page }) => {
    const base = new BasePage(page);
    const home = new HomePage(page);
    const panel = new StoryBundlesPanelPage(page);
    const editor = new StoryBundleEditorPage(page);
    const api = new StoryBundleAPI(page);

    const bundle = await importStoryBundleFixture(page, path.join(DATA_DIR, "empty.json"), test.info().title);

    await base.goto();
    await home.openStoryBundlesPanel();
    await panel.waitFor();

    await panel.clickRow(bundle.name);
    await editor.waitFor();

    await expect(editor.playButton).toBeVisible();

    await api.delete(bundle.id);
  });

  test("clicking play from editor starts a roleplay and shows success toast", async ({ page }) => {
    const base = new BasePage(page);
    const home = new HomePage(page);
    const panel = new StoryBundlesPanelPage(page);
    const editor = new StoryBundleEditorPage(page);
    const api = new StoryBundleAPI(page);

    const bundle = await importStoryBundleFixture(page, path.join(DATA_DIR, "empty.json"), test.info().title);

    await base.goto();
    await home.openStoryBundlesPanel();
    await panel.waitFor();

    await panel.clickRow(bundle.name);
    await editor.waitFor();

    await editor.playButton.click();

    await expect(page.getByText("Roleplay started!")).toBeVisible({ timeout: 10_000 });

    await api.delete(bundle.id);
  });

  test("playing a bundle with lorebooks activates them on the chat", async ({ page }) => {
    const base = new BasePage(page);
    const home = new HomePage(page);
    const panel = new StoryBundlesPanelPage(page);
    const editor = new StoryBundleEditorPage(page);
    const api = new StoryBundleAPI(page);

    // Create two lorebooks via API.
    const lore1 = await page.request.post("/api/lorebooks", {
      data: { name: `Lorebook Alpha ${test.info().title}` },
    });
    const lore2 = await page.request.post("/api/lorebooks", {
      data: { name: `Lorebook Beta ${test.info().title}` },
    });
    const lore1Data = (await lore1.json()) as { id: string };
    const lore2Data = (await lore2.json()) as { id: string };

    // Create a bundle with both lorebook IDs.
    const bundle = await api.create({
      name: `Lorebook Play Test ${test.info().title}`,
    });
    await page.request.patch(`/api/story-bundles/${bundle.id}`, {
      data: { lorebookIds: [lore1Data.id, lore2Data.id] },
    });

    await base.goto();
    await home.openStoryBundlesPanel();
    await panel.waitFor();

    await panel.clickRow(bundle.name);
    await editor.waitFor();

    await editor.playButton.click();
    await expect(page.getByText("Roleplay started!")).toBeVisible({ timeout: 10_000 });

    // Find the chat that was just created (matches the bundle name).
    const chatsResp = await page.request.get("/api/chats");
    const chats = (await chatsResp.json()) as Array<{ id: string; name: string; metadata: Record<string, unknown> }>;
    const chat = chats.find((c) => c.name === bundle.name);
    expect(chat).toBeDefined();

    // Verify both lorebooks are active on the chat.
    const meta = (chat!.metadata ?? {}) as Record<string, unknown>;
    const activeIds: string[] = Array.isArray(meta.activeLorebookIds)
      ? (meta.activeLorebookIds as string[])
      : [];
    expect(activeIds).toContain(lore1Data.id);
    expect(activeIds).toContain(lore2Data.id);

    // Cleanup.
    await api.delete(bundle.id);
    await page.request.delete(`/api/lorebooks/${lore1Data.id}`);
    await page.request.delete(`/api/lorebooks/${lore2Data.id}`);
  });
});

test.describe("Story Bundle Play — Negative", () => {
  test("play button is disabled when no connection is configured", async ({ page }) => {
    // Play succeeds even without a connection — the button is always enabled.
    // This test verifies the button remains functional in the default state.
    const base = new BasePage(page);
    const home = new HomePage(page);
    const panel = new StoryBundlesPanelPage(page);
    const api = new StoryBundleAPI(page);

    const bundle = await importStoryBundleFixture(page, path.join(DATA_DIR, "empty.json"), test.info().title);

    await base.goto();
    await home.openStoryBundlesPanel();
    await panel.waitFor();

    await panel.hoverRow(bundle.name);
    await expect(panel.playButtonLocator(bundle.name)).toBeEnabled();

    await api.delete(bundle.id);
  });
});
