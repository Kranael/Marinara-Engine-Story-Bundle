/**
 * Story Bundle Gallery — Playwright E2E Tests
 *
 * Covers the full-page Story Bundle Gallery:
 * - Gallery loads and lists bundles (cards with artwork, title, description)
 * - Description HTML is rendered safely (sanitized)
 * - Play / Export / Delete actions work from the gallery detail card
 * - Character Gallery is unaffected by the new surface
 * - Responsive behavior (desktop aside vs mobile inline detail)
 *
 * Each test imports its own data via importStoryBundleFixture and cleans up.
 */
import { expect, test, type Page } from "@playwright/test";
import path from "node:path";
import { BasePage } from "../pages/base.page.js";
import { HomePage } from "../../pages/home.page.js";
import { StoryBundlesPanelPage } from "../pages/story-bundles-panel.page.js";
import { StoryBundleGalleryPage } from "../pages/story-bundle-gallery.page.js";
import { DeleteStoryBundleDialogPage } from "../pages/delete-story-bundle-dialog.page.js";
import { importStoryBundleFixture } from "../helpers/story-bundle-fixture.js";
import { StoryBundleAPI } from "../helpers/story-bundle-api.js";

const DATA_DIR = path.resolve(import.meta.dirname, "..", "data");

const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

/** Open the Story Bundles panel, then the gallery, and return the gallery PO. */
async function openGallery(page: Page): Promise<StoryBundleGalleryPage> {
  const base = new BasePage(page);
  const home = new HomePage(page);
  const panel = new StoryBundlesPanelPage(page);
  const gallery = new StoryBundleGalleryPage(page);

  await base.goto();
  await home.openStoryBundlesPanel();
  await panel.waitFor();
  await gallery.openFromPanel();
  return gallery;
}

test.describe("Story Bundle Gallery — Loading & Cards", () => {
  test("gallery loads and lists imported bundles", async ({ page }) => {
    const api = new StoryBundleAPI(page);
    const bundle = await importStoryBundleFixture(page, path.join(DATA_DIR, "empty.json"), test.info().title);

    try {
      const gallery = await openGallery(page);
      await expect(gallery.cardLocator(bundle.name)).toBeVisible();
    } finally {
      await api.delete(bundle.id);
    }
  });

  test("card shows the bundle artwork when an image is uploaded", async ({ page }) => {
    const api = new StoryBundleAPI(page);
    const bundle = await importStoryBundleFixture(page, path.join(DATA_DIR, "empty.json"), test.info().title);

    try {
      const uploadResp = await page.request.post(`/api/story-bundles/${bundle.id}/image`, {
        data: { image: `data:image/png;base64,${TINY_PNG_BASE64}` },
      });
      expect(uploadResp.ok()).toBeTruthy();

      const gallery = await openGallery(page);
      const card = gallery.cardLocator(bundle.name);
      await expect(card).toBeVisible();
      await expect(card.locator("[data-story-bundle-gallery-card-artwork] img")).toBeVisible();
    } finally {
      await api.delete(bundle.id);
    }
  });

  test("card shows the bundle title", async ({ page }) => {
    const api = new StoryBundleAPI(page);
    const bundle = await importStoryBundleFixture(page, path.join(DATA_DIR, "empty.json"), test.info().title);

    try {
      const gallery = await openGallery(page);
      const card = gallery.cardLocator(bundle.name);
      await expect(card.locator("[data-story-bundle-gallery-card-title]")).toHaveText(bundle.name);
    } finally {
      await api.delete(bundle.id);
    }
  });

  test("card shows the description rendered as safe HTML", async ({ page }) => {
    const api = new StoryBundleAPI(page);
    const bundle = await importStoryBundleFixture(
      page,
      path.join(DATA_DIR, "with-description.json"),
      test.info().title,
    );

    try {
      const gallery = await openGallery(page);
      const card = gallery.cardLocator(bundle.name);
      const description = card.locator("[data-story-bundle-gallery-card-description]");
      await expect(description).toBeVisible();

      // The HTML is rendered: the heading text is visible as a real element…
      await expect(description.getByRole("heading", { name: "Chapter One" })).toBeVisible();
      // …and the raw markup is NOT shown as text.
      await expect(card.getByText("<h1>Chapter One</h1>")).toHaveCount(0);
    } finally {
      await api.delete(bundle.id);
    }
  });

  test("script tags in the description are sanitized and never executed", async ({ page }) => {
    const api = new StoryBundleAPI(page);
    const bundle = await api.create({
      name: `Gallery Script Probe ${test.info().title}`,
      description: "<p>Safe text</p><script>window.__storyBundleGalleryPwned = true;</script>",
    });

    try {
      const gallery = await openGallery(page);
      await expect(gallery.cardLocator(bundle.name)).toBeVisible();

      const pwned = await page.evaluate(
        () => (window as unknown as { __storyBundleGalleryPwned?: boolean }).__storyBundleGalleryPwned,
      );
      expect(pwned).toBeUndefined();
    } finally {
      await api.delete(bundle.id);
    }
  });
});

test.describe("Story Bundle Gallery — Actions", () => {
  test("Play from the gallery starts a roleplay and shows the success toast", async ({ page }) => {
    const api = new StoryBundleAPI(page);
    const bundle = await importStoryBundleFixture(page, path.join(DATA_DIR, "empty.json"), test.info().title);
    let chatId: string | null = null;

    try {
      const gallery = await openGallery(page);
      await gallery.clickCard(bundle.name);
      await gallery.playButton().click();

      await expect(page.getByText("Roleplay started!")).toBeVisible({ timeout: 10_000 });

      // Find the created chat so it can be cleaned up.
      const chatsResp = await page.request.get("/api/chats");
      const chats = (await chatsResp.json()) as Array<{ id: string; name: string }>;
      chatId = chats.find((chat) => chat.name === bundle.name)?.id ?? null;
    } finally {
      if (chatId) {
        await page.request.delete(`/api/chats/${chatId}?force=true`);
      }
      await api.delete(bundle.id);
    }
  });

  test("Export from the gallery downloads the bundle", async ({ page }) => {
    const api = new StoryBundleAPI(page);
    const bundle = await importStoryBundleFixture(page, path.join(DATA_DIR, "empty.json"), test.info().title);

    try {
      const gallery = await openGallery(page);
      await gallery.clickCard(bundle.name);
      await gallery.exportButton().click();

      await expect(page.getByText("Story bundle exported.")).toBeVisible({ timeout: 10_000 });

      // The export endpoint itself must still serve the file.
      const exportResponse = await page.request.get(`/api/story-bundles/${bundle.id}/export`);
      expect(exportResponse.status()).toBe(200);
      const disposition = exportResponse.headers()["content-disposition"];
      expect(disposition).toBeTruthy();
    } finally {
      await api.delete(bundle.id);
    }
  });

  test("Delete from the gallery removes the bundle after confirmation", async ({ page }) => {
    const api = new StoryBundleAPI(page);
    const bundle = await importStoryBundleFixture(page, path.join(DATA_DIR, "empty.json"), test.info().title);
    const deleteDialog = new DeleteStoryBundleDialogPage(page);

    const gallery = await openGallery(page);
    await gallery.clickCard(bundle.name);
    await gallery.deleteButton().click();

    await deleteDialog.waitFor();
    await deleteDialog.confirm();

    await expect(gallery.cardLocator(bundle.name)).toHaveCount(0);
  });

  test("Edit from the gallery opens the story bundle editor", async ({ page }) => {
    const api = new StoryBundleAPI(page);
    const bundle = await importStoryBundleFixture(page, path.join(DATA_DIR, "empty.json"), test.info().title);

    try {
      const gallery = await openGallery(page);
      await gallery.clickCard(bundle.name);
      await gallery.editButton().click();

      await expect(page.getByTestId("story-bundle-editor")).toBeVisible({ timeout: 10_000 });
    } finally {
      await api.delete(bundle.id);
    }
  });
});

test.describe("Story Bundle Gallery — Isolation & Responsive", () => {
  test("Character Gallery is unaffected by the Story Bundle Gallery", async ({ page }) => {
    const api = new StoryBundleAPI(page);
    const bundle = await importStoryBundleFixture(page, path.join(DATA_DIR, "empty.json"), test.info().title);

    try {
      const gallery = await openGallery(page);
      await expect(gallery.gallery).toBeVisible();

      // Open the Character Library via the UI store and verify it renders
      // while the Story Bundle Gallery disappears (mutual exclusion).
      await page.evaluate(async () => {
        const { useUIStore } = await import("/src/stores/ui.store.ts");
        useUIStore.getState().openCharacterLibrary();
      });

      await expect(page.locator('[data-component="CharacterLibraryView"]')).toBeVisible({ timeout: 10_000 });
      await expect(gallery.gallery).toBeHidden();
    } finally {
      await api.delete(bundle.id);
    }
  });

  test("responsive: detail renders inline on mobile and in the aside on desktop", async ({ page }) => {
    const api = new StoryBundleAPI(page);
    const bundle = await importStoryBundleFixture(page, path.join(DATA_DIR, "empty.json"), test.info().title);

    try {
      const gallery = await openGallery(page);
      await gallery.clickCard(bundle.name);

      const viewport = page.viewportSize();
      const isMobile = (viewport?.width ?? 1440) < 1024;

      if (isMobile) {
        // Mobile: the detail card renders inline inside the grid.
        await expect(page.getByTestId("story-bundle-gallery-detail-mobile")).toBeVisible();
      } else {
        // Desktop: the detail card renders in the right-hand aside.
        await expect(gallery.detail).toBeVisible();
        await expect(page.getByTestId("story-bundle-gallery-detail-mobile")).toBeHidden();
      }
    } finally {
      await api.delete(bundle.id);
    }
  });
});
