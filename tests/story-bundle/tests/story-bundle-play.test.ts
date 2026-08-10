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
});

test.describe("Story Bundle Play — Negative", () => {
  // No negative play scenarios — play succeeds even without a connection.
});
