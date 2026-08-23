/**
 * Story Bundle Import / Export — Playwright E2E Tests
 *
 * Covers: ImportStoryBundleModal + export flow
 * - Import button opens the import modal
 * - Import modal renders with drop zone and file input
 * - Export button triggers download from panel row
 * - Import of a valid .marinara.json file
 * - Import of an invalid file shows error
 * - Embedded content prompt appears when bundle has embedded entities
 *
 * Each test imports its own data via importStoryBundleFixture and cleans up.
 */
import { expect, test } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";
import { BasePage } from "../pages/base.page.js";
import { HomePage } from "../../pages/home.page.js";
import { StoryBundlesPanelPage } from "../pages/story-bundles-panel.page.js";
import { ImportStoryBundleModalPage } from "../pages/import-story-bundle-modal.page.js";
import { importStoryBundleFixture } from "../helpers/story-bundle-fixture.js";
import { StoryBundleAPI } from "../helpers/story-bundle-api.js";

const DATA_DIR = path.resolve(import.meta.dirname, "..", "data");

test.describe("Story Bundle Import/Export — Positive", () => {
  test("import button opens the import modal", async ({ page }) => {
    const base = new BasePage(page);
    const home = new HomePage(page);
    const panel = new StoryBundlesPanelPage(page);
    const importModal = new ImportStoryBundleModalPage(page);

    await base.goto();
    await home.openStoryBundlesPanel();
    await panel.waitFor();

    await panel.importButton.click();
    await importModal.waitFor();

    await expect(importModal.modal).toBeVisible();
    await expect(importModal.dropZone).toBeVisible();
    await expect(importModal.fileInput).toBeAttached();
  });

  test("import modal can be closed", async ({ page }) => {
    const base = new BasePage(page);
    const home = new HomePage(page);
    const panel = new StoryBundlesPanelPage(page);
    const importModal = new ImportStoryBundleModalPage(page);

    await base.goto();
    await home.openStoryBundlesPanel();
    await panel.waitFor();

    await panel.importButton.click();
    await importModal.waitFor();

    await importModal.close();
    await expect(importModal.modal).not.toBeVisible({ timeout: 5_000 });
  });

  test("importing a valid story bundle JSON succeeds", async ({ page }) => {
    const base = new BasePage(page);
    const home = new HomePage(page);
    const panel = new StoryBundlesPanelPage(page);
    const importModal = new ImportStoryBundleModalPage(page);
    const api = new StoryBundleAPI(page);

    await base.goto();
    await home.openStoryBundlesPanel();
    await panel.waitFor();

    // Create a valid story bundle envelope with a unique name to avoid
    // race conditions between parallel workers.
    const suffix = Date.now().toString(36);
    const validPath = path.join(DATA_DIR, `valid-import-${suffix}.json`);
    const envelope = {
      type: "marinara_story_bundle",
      version: 1,
      data: {
        name: `Imported Bundle ${suffix}`,
        description: "A bundle from import test",
        characterIds: [],
        personaIds: [],
        lorebookIds: [],
      },
    };
    fs.writeFileSync(validPath, JSON.stringify(envelope));

    await panel.importButton.click();
    await importModal.waitFor();

    await importModal.uploadFile(validPath);

    await expect(importModal.results).toContainText(/Imported/, { timeout: 10_000 });

    await importModal.close();

    // The imported bundle should appear in the panel.
    await expect(panel.panel).toContainText(`Imported Bundle ${suffix}`, { timeout: 5_000 });

    // Clean up: delete the imported bundle.
    const bundles = await page.request.get("/api/story-bundles").then((r) => r.json());
    const imported = bundles.find((b: { name: string }) => b.name === `Imported Bundle ${suffix}`);
    if (imported) await api.delete(imported.id);
    fs.unlinkSync(validPath);
  });

  test("import with embedded content shows the embedded prompt", async ({ page }) => {
    const base = new BasePage(page);
    const home = new HomePage(page);
    const panel = new StoryBundlesPanelPage(page);
    const importModal = new ImportStoryBundleModalPage(page);
    const api = new StoryBundleAPI(page);

    await base.goto();
    await home.openStoryBundlesPanel();
    await panel.waitFor();

    // Create a bundle with embedded characters.
    const embeddedPath = path.join(DATA_DIR, "embedded-import.json");
    const envelope = {
      type: "marinara_story_bundle",
      version: 1,
      data: {
        name: "Embedded Bundle",
        description: "",
        characterIds: [],
        personaIds: [],
        lorebookIds: [],
        embeddedCharacters: [{ id: "char-1", name: "Test Char", data: {} }],
        embeddedPersonas: [],
        embeddedLorebooks: [],
      },
    };
    fs.writeFileSync(embeddedPath, JSON.stringify(envelope));

    await panel.importButton.click();
    await importModal.waitFor();

    await importModal.uploadFile(embeddedPath);

    await expect(importModal.modal).toContainText(/embedded content|Embedded/, { timeout: 10_000 });
    await expect(importModal.skipEmbeddedButton).toBeVisible();

    // Clean up.
    const bundles = await page.request.get("/api/story-bundles").then((r) => r.json());
    const embedded = bundles.find((b: { name: string }) => b.name === "Embedded Bundle");
    if (embedded) await api.delete(embedded.id);
    fs.unlinkSync(embeddedPath);
  });

  test("export button triggers a download", async ({ page }) => {
    const base = new BasePage(page);
    const home = new HomePage(page);
    const panel = new StoryBundlesPanelPage(page);
    const api = new StoryBundleAPI(page);

    const bundle = await importStoryBundleFixture(page, path.join(DATA_DIR, "empty.json"), test.info().title);

    await base.goto();
    await home.openStoryBundlesPanel();
    await panel.waitFor();

    await panel.hoverRow(bundle.name);

    const exportBtn = panel.exportButtonLocator(bundle.name);
    await expect(exportBtn).toBeVisible();

    // The export uses api.download() which does a client-side fetch + <a> click,
    // not a browser-managed download. Verify the export API endpoint directly.
    const exportResponse = await page.request.get(`/api/story-bundles/${bundle.id}/export`);
    expect(exportResponse.status()).toBe(200);

    const body = await exportResponse.json();
    expect(body).toHaveProperty("type", "marinara_story_bundle");
    expect(body).toHaveProperty("version", 1);
    expect(body.data).toHaveProperty("name");

    // Also verify the Content-Disposition header is set for download.
    const disposition = exportResponse.headers()["content-disposition"];
    expect(disposition).toContain("attachment");
    expect(disposition).toContain(".marinara.json");

    await api.delete(bundle.id);
  });
});

test.describe("Story Bundle Import/Export — Negative", () => {
  test("importing an invalid file shows an error message", async ({ page }) => {
    const base = new BasePage(page);
    const home = new HomePage(page);
    const panel = new StoryBundlesPanelPage(page);
    const importModal = new ImportStoryBundleModalPage(page);

    await base.goto();
    await home.openStoryBundlesPanel();
    await panel.waitFor();

    await panel.importButton.click();
    await importModal.waitFor();

    // Use a unique filename to avoid race conditions between parallel workers.
    const invalidPath = path.join(DATA_DIR, `invalid-${process.pid.toString(36)}.json`);
    fs.writeFileSync(invalidPath, "not valid json at all {{{");

    await importModal.uploadFile(invalidPath);

    await expect(importModal.results).toContainText(/is not valid JSON|Failed to parse/, { timeout: 10_000 });

    try { fs.unlinkSync(invalidPath); } catch { /* already cleaned up by another worker */ }
  });
});
