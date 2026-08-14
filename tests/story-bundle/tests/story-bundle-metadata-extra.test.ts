/**
 * Story Bundle Metadata — Extra Coverage Playwright E2E Tests
 *
 * Extends story-bundle-metadata.test.ts with the remaining metadata buttons:
 * - Upload Image button: picking a valid image stores it and swaps the
 *   button label to "Change Image"
 * - Remove All tags button clears every tag chip at once
 * - Picking a non-image file shows an error toast and keeps the placeholder
 *
 * Each test imports its own bundle fixture and cleans it up in a finally
 * block so cleanup survives failures.
 */
import { expect, test } from "@playwright/test";
import path from "node:path";
import { BasePage } from "../pages/base.page.js";
import { HomePage } from "../../pages/home.page.js";
import { StoryBundlesPanelPage } from "../pages/story-bundles-panel.page.js";
import { StoryBundleEditorPage } from "../pages/story-bundle-editor.page.js";
import { StoryBundleMetadataTabPage } from "../pages/story-bundle-metadata-tab.page.js";
import { importStoryBundleFixture } from "../helpers/story-bundle-fixture.js";

const DATA_DIR = path.resolve(import.meta.dirname, "..", "data");

/** 1x1 transparent PNG, the smallest valid image payload. */
const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

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

test.describe("Story Bundle Metadata Extra — Positive", () => {
  test("uploading an image shows the preview and changes the button to Change Image", async ({ page }) => {
    const { bundle, editor } = await openEditorForBundle(page, "empty.json");
    const metadataTab = new StoryBundleMetadataTabPage(page);

    try {
      await editor.switchToMetadata();
      await metadataTab.waitFor();

      await expect(metadataTab.uploadButton).toContainText("Upload Image");
      await expect(metadataTab.avatarPreview.locator("img")).toHaveCount(0);

      await metadataTab.imageInput.setInputFiles({
        name: "bundle-pixel.png",
        mimeType: "image/png",
        buffer: Buffer.from(TINY_PNG_BASE64, "base64"),
      });

      await expect(page.getByText("Bundle picture updated.")).toBeVisible({ timeout: 10_000 });
      await expect(metadataTab.avatarPreview.locator("img")).toBeVisible();
      await expect(metadataTab.uploadButton).toContainText("Change Image");
    } finally {
      await page.request.delete(`/api/story-bundles/${bundle.id}`);
    }
  });

  test("remove all tags clears every tag chip at once", async ({ page }) => {
    const { bundle, editor } = await openEditorForBundle(page, "empty.json");
    const metadataTab = new StoryBundleMetadataTabPage(page);

    try {
      await editor.switchToMetadata();
      await metadataTab.waitFor();

      await expect(metadataTab.tagsRemoveAll).toBeHidden();

      await metadataTab.addTag("alpha-tag");
      await metadataTab.addTag("beta-tag");

      await expect(metadataTab.tagChip("alpha-tag")).toBeVisible();
      await expect(metadataTab.tagChip("beta-tag")).toBeVisible();
      await expect(metadataTab.tagsRemoveAll).toBeVisible();

      await metadataTab.removeAllTags();

      await expect(metadataTab.tagChip("alpha-tag")).toBeHidden();
      await expect(metadataTab.tagChip("beta-tag")).toBeHidden();
      await expect(metadataTab.tagsRemoveAll).toBeHidden();
    } finally {
      await page.request.delete(`/api/story-bundles/${bundle.id}`);
    }
  });
});

test.describe("Story Bundle Metadata Extra — Negative", () => {
  test("uploading a non-image file shows an error toast and keeps the placeholder", async ({ page }) => {
    const { bundle, editor } = await openEditorForBundle(page, "empty.json");
    const metadataTab = new StoryBundleMetadataTabPage(page);

    try {
      await editor.switchToMetadata();
      await metadataTab.waitFor();

      await metadataTab.imageInput.setInputFiles({
        name: "not-an-image.txt",
        mimeType: "text/plain",
        buffer: Buffer.from("this is not an image"),
      });

      await expect(page.getByText("Please choose an image file.")).toBeVisible({ timeout: 10_000 });
      await expect(metadataTab.avatarPreview.locator("img")).toHaveCount(0);
      await expect(metadataTab.uploadButton).toContainText("Upload Image");
    } finally {
      await page.request.delete(`/api/story-bundles/${bundle.id}`);
    }
  });
});
