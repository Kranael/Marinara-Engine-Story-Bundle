/**
 * Story Bundle Import / Export — Playwright E2E Tests
 *
 * Covers: ImportStoryBundleModal + export flow
 * - Import button opens the import modal
 * - Import modal renders with drop zone and file input
 * - Export button triggers download from panel row
 * - Import of a valid .storybundle archive (round-trip via export)
 * - Import of a non-.storybundle file shows an error
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

  test("importing a valid .storybundle archive succeeds", async ({ page }) => {
    const base = new BasePage(page);
    const home = new HomePage(page);
    const panel = new StoryBundlesPanelPage(page);
    const importModal = new ImportStoryBundleModalPage(page);
    const api = new StoryBundleAPI(page);

    // Game Config (genre/setting/tone) must be complete before a bundle can
    // be exported — set it directly via PATCH rather than the editor UI.
    const suffix = Date.now().toString(36);
    const sourceBundle = await api.create({ name: `Export Source ${suffix}` });
    await page.request.patch(`/api/story-bundles/${sourceBundle.id}`, {
      data: {
        gameConfig: {
          genre: "Fantasy",
          setting: "A test realm",
          tone: "Lighthearted",
          difficulty: "",
          playerGoals: "",
          gmMode: "standalone",
          rating: "sfw",
        },
      },
    });

    const exportResponse = await page.request.get(`/api/story-bundles/${sourceBundle.id}/export`);
    expect(exportResponse.status()).toBe(200);
    const archivePath = path.join(DATA_DIR, `roundtrip-${suffix}.storybundle`);
    fs.writeFileSync(archivePath, await exportResponse.body());
    await api.delete(sourceBundle.id);

    await base.goto();
    await home.openStoryBundlesPanel();
    await panel.waitFor();

    await panel.importButton.click();
    await importModal.waitFor();

    await importModal.uploadFile(archivePath);

    await expect(importModal.results).toContainText(/Imported/, { timeout: 10_000 });

    await importModal.close();

    // The imported bundle should appear in the panel under its original name.
    await expect(panel.panel).toContainText(`Export Source ${suffix}`, { timeout: 5_000 });

    // Clean up: delete the imported bundle.
    const bundles = await page.request.get("/api/story-bundles").then((r) => r.json());
    const imported = bundles.find((b: { name: string }) => b.name === `Export Source ${suffix}`);
    if (imported) await api.delete(imported.id);
    fs.unlinkSync(archivePath);
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

    // Exports are .storybundle ZIP archives (no base64 JSON envelope) — verify
    // the ZIP magic bytes rather than parsing as JSON.
    const body = await exportResponse.body();
    expect(body.length).toBeGreaterThan(0);
    expect(body.subarray(0, 2).toString("latin1")).toBe("PK");

    // Also verify the Content-Disposition header is set for download.
    const disposition = exportResponse.headers()["content-disposition"];
    expect(disposition).toContain("attachment");
    expect(disposition).toContain(".storybundle");

    await api.delete(bundle.id);
  });
});

test.describe("Story Bundle Import/Export — Negative", () => {
  test("importing a non-.storybundle file shows an error message", async ({ page }) => {
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
    fs.writeFileSync(invalidPath, "not a story bundle archive");

    await importModal.uploadFile(invalidPath);

    await expect(importModal.results).toContainText(/Not a valid story bundle file/, { timeout: 10_000 });

    try {
      fs.unlinkSync(invalidPath);
    } catch {
      /* already cleaned up by another worker */
    }
  });
});

