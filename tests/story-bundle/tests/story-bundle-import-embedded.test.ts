/**
 * Story Bundle Import — Embedded Entities Playwright E2E Tests
 *
 * Extends story-bundle-import-export.test.ts with the two embedded-content
 * choices that the existing suite only renders:
 * - "Import everything" imports the bundle AND creates the embedded
 *   character in the library
 * - "Skip embedded content" imports the bundle but does NOT create the
 *   embedded character
 *
 * Each test writes a unique envelope file (unique bundle + embedded names)
 * so parallel workers never collide, and cleans up bundle, character, and
 * temp file in a finally block so cleanup survives failures.
 */
import { expect, test, type APIRequestContext } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";
import { BasePage } from "../pages/base.page.js";
import { HomePage } from "../../pages/home.page.js";
import { StoryBundlesPanelPage } from "../pages/story-bundles-panel.page.js";
import { ImportStoryBundleModalPage } from "../pages/import-story-bundle-modal.page.js";

const DATA_DIR = path.resolve(import.meta.dirname, "..", "data");

/** Look up a character id by exact name via the search endpoint. */
async function findCharacterIdByName(request: APIRequestContext, name: string): Promise<string | null> {
  const response = await request.get("/api/characters", { params: { search: name } });
  if (!response.ok()) return null;
  const body = (await response.json()) as { items?: Array<{ id: string; data: unknown }> };
  const items = body.items ?? [];
  for (const item of items) {
    try {
      const parsed = typeof item.data === "string" ? JSON.parse(item.data) : item.data;
      if (parsed?.name === name) return item.id;
    } catch {
      // Skip unparseable rows.
    }
  }
  return null;
}

/** Build an envelope with one embedded character and write it to a temp file. */
function writeEmbeddedEnvelope(filePath: string, bundleName: string, embeddedName: string): void {
  const envelope = {
    type: "marinara_story_bundle",
    version: 1,
    data: {
      name: bundleName,
      description: "",
      characterIds: ["embedded-char-1"],
      personaIds: [],
      lorebookIds: [],
      embeddedCharacters: [{ id: "embedded-char-1", name: embeddedName, data: { name: embeddedName } }],
      embeddedPersonas: [],
      embeddedLorebooks: [],
    },
  };
  fs.writeFileSync(filePath, JSON.stringify(envelope));
}

test.describe("Story Bundle Import Embedded — Positive", () => {
  test("import everything creates the embedded character in the library", async ({ page }) => {
    const base = new BasePage(page);
    const home = new HomePage(page);
    const panel = new StoryBundlesPanelPage(page);
    const importModal = new ImportStoryBundleModalPage(page);

    const suffix = `${Date.now().toString(36)}-${process.env.TEST_WORKER_INDEX ?? "0"}`;
    const bundleName = `Embedded All Bundle ${suffix}`;
    const embeddedName = `Embedded All Char ${suffix}`;
    const envelopePath = path.join(DATA_DIR, `embedded-all-${suffix}.json`);

    let bundleId: string | null = null;
    let characterId: string | null = null;

    try {
      writeEmbeddedEnvelope(envelopePath, bundleName, embeddedName);

      await base.goto();
      await home.openStoryBundlesPanel();
      await panel.waitFor();

      await panel.importButton.click();
      await importModal.waitFor();

      await importModal.uploadFile(envelopePath);

      await expect(importModal.skipEmbeddedButton).toBeVisible();
      await expect(importModal.importAllButton).toBeVisible();

      await importModal.importAllButton.click();

      await expect(importModal.results).toContainText(/Imported/, { timeout: 10_000 });
      await expect(importModal.results).toContainText(/1 embedded entit/);

      await importModal.close();

      // The imported bundle appears in the panel.
      await expect(panel.panel).toContainText(bundleName, { timeout: 5_000 });

      // The embedded character was created in the library.
      characterId = await findCharacterIdByName(page.request, embeddedName);
      expect(characterId).not.toBeNull();

      // Resolve the bundle id for cleanup.
      const bundles = (await page.request.get("/api/story-bundles").then((r) => r.json())) as Array<{
        id: string;
        name: string;
      }>;
      bundleId = bundles.find((b) => b.name === bundleName)?.id ?? null;
    } finally {
      if (bundleId) await page.request.delete(`/api/story-bundles/${bundleId}`);
      if (characterId) await page.request.delete(`/api/characters/${characterId}`);
      if (fs.existsSync(envelopePath)) fs.unlinkSync(envelopePath);
    }
  });

  test("skip embedded content imports the bundle without creating the embedded character", async ({ page }) => {
    const base = new BasePage(page);
    const home = new HomePage(page);
    const panel = new StoryBundlesPanelPage(page);
    const importModal = new ImportStoryBundleModalPage(page);

    const suffix = `${Date.now().toString(36)}-${process.env.TEST_WORKER_INDEX ?? "0"}`;
    const bundleName = `Embedded Skip Bundle ${suffix}`;
    const embeddedName = `Embedded Skip Char ${suffix}`;
    const envelopePath = path.join(DATA_DIR, `embedded-skip-${suffix}.json`);

    let bundleId: string | null = null;
    let characterId: string | null = null;

    try {
      writeEmbeddedEnvelope(envelopePath, bundleName, embeddedName);

      await base.goto();
      await home.openStoryBundlesPanel();
      await panel.waitFor();

      await panel.importButton.click();
      await importModal.waitFor();

      await importModal.uploadFile(envelopePath);

      await expect(importModal.skipEmbeddedButton).toBeVisible();
      await importModal.skipEmbeddedButton.click();

      await expect(importModal.results).toContainText(/Imported/, { timeout: 10_000 });

      await importModal.close();

      // The imported bundle appears in the panel.
      await expect(panel.panel).toContainText(bundleName, { timeout: 5_000 });

      // The embedded character was NOT created in the library.
      characterId = await findCharacterIdByName(page.request, embeddedName);
      expect(characterId).toBeNull();

      // Resolve the bundle id for cleanup.
      const bundles = (await page.request.get("/api/story-bundles").then((r) => r.json())) as Array<{
        id: string;
        name: string;
      }>;
      bundleId = bundles.find((b) => b.name === bundleName)?.id ?? null;
    } finally {
      if (bundleId) await page.request.delete(`/api/story-bundles/${bundleId}`);
      if (characterId) await page.request.delete(`/api/characters/${characterId}`);
      if (fs.existsSync(envelopePath)) fs.unlinkSync(envelopePath);
    }
  });
});
