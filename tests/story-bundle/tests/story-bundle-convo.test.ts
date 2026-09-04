/**
 * Story Bundle CONVO (Conversation Mode) — Playwright E2E Tests
 *
 * Covers: the CONVO button and DirectInject bootstrapper in the Gallery and
 * the Editor (story-bundle-convo-direct-inject.ts)
 * - CONVO button is visible and enabled in the gallery detail card and the
 *   editor header
 * - A bundle with 1+ characters starts a group conversation (1:n) with every
 *   assigned character immediately — no picker modal
 * - A bundle with no characters shows an error and creates nothing
 * - The Conversation setup wizard never mounts at any point (this is the
 *   whole point of DirectInject — no `ChatSetupWizard` UI coupling)
 *
 * Unlike GM's DirectInject, CONVO's flow makes no AI call at all, so these
 * tests assert full success — including with no connection configured.
 *
 * Each test imports its own data via importStoryBundleFixture and cleans up.
 */
import { expect, test, type Page } from "@playwright/test";
import path from "node:path";
import { BasePage } from "../pages/base.page.js";
import { HomePage } from "../../pages/home.page.js";
import { StoryBundlesPanelPage } from "../pages/story-bundles-panel.page.js";
import { StoryBundleGalleryPage } from "../pages/story-bundle-gallery.page.js";
import { StoryBundleEditorPage } from "../pages/story-bundle-editor.page.js";
import { importStoryBundleFixture } from "../helpers/story-bundle-fixture.js";
import { StoryBundleAPI } from "../helpers/story-bundle-api.js";
import { createCharacter, deleteCharacter, entitySuffix, type EntityRef } from "../helpers/story-bundle-entities.js";

const DATA_DIR = path.resolve(import.meta.dirname, "..", "data");

interface CreatedChat {
  id: string;
  name: string;
  mode: string;
  characterIds: string[];
  personaId: string | null;
  metadata: Record<string, unknown>;
}

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

/** Navigate to the app, open the panel, and click a bundle row to open its editor. */
async function openEditorForBundle(page: Page, bundleName: string) {
  const base = new BasePage(page);
  const home = new HomePage(page);
  const panel = new StoryBundlesPanelPage(page);

  await base.goto();
  await home.openStoryBundlesPanel();
  await panel.waitFor();
  await panel.clickRow(bundleName);

  const editor = new StoryBundleEditorPage(page);
  await editor.waitFor();
  return editor;
}

/** Find the conversation chat created from a bundle by name, for assertions and cleanup. */
async function findConvoChatByName(page: Page, name: string): Promise<CreatedChat | null> {
  const response = await page.request.get("/api/chats");
  const chats = (await response.json()) as CreatedChat[];
  return chats.find((chat) => chat.name === name && chat.mode === "conversation") ?? null;
}

test.describe("Story Bundle CONVO — Positive", () => {
  test("CONVO button is visible and enabled in the gallery detail card", async ({ page }) => {
    const api = new StoryBundleAPI(page);
    const bundle = await importStoryBundleFixture(page, path.join(DATA_DIR, "empty.json"), test.info().title);

    try {
      const gallery = await openGallery(page);
      await gallery.clickCard(bundle.name);

      await expect(gallery.convoButton()).toBeVisible();
      await expect(gallery.convoButton()).toBeEnabled();
    } finally {
      await api.delete(bundle.id);
    }
  });

  test("CONVO button is visible and enabled in the editor header", async ({ page }) => {
    const api = new StoryBundleAPI(page);
    const bundle = await importStoryBundleFixture(page, path.join(DATA_DIR, "empty.json"), test.info().title);

    try {
      const editor = await openEditorForBundle(page, bundle.name);

      await expect(editor.convoButton).toBeVisible();
      await expect(editor.convoButton).toBeEnabled();
    } finally {
      await api.delete(bundle.id);
    }
  });

  test("clicking CONVO on a single-character bundle starts a group chat immediately, no picker modal", async ({
    page,
  }) => {
    const suffix = entitySuffix(test.info().title);
    const seeded: EntityRef[] = [];
    const api = new StoryBundleAPI(page);
    let chatId: string | null = null;

    const onlyCharacter = await createCharacter(page.request, `Convo Solo Character ${suffix}`);
    seeded.push(onlyCharacter);

    const bundle = await importStoryBundleFixture(page, path.join(DATA_DIR, "empty.json"), test.info().title);

    try {
      await page.request.patch(`/api/story-bundles/${bundle.id}`, {
        data: { characterIds: [onlyCharacter.id] },
      });

      const editor = await openEditorForBundle(page, bundle.name);
      await editor.convoButton.click();

      const chat = await findConvoChatByName(page, bundle.name);
      expect(chat).not.toBeNull();
      chatId = chat!.id;
      expect(chat!.characterIds).toEqual([onlyCharacter.id]);
      expect(chat!.metadata?.storyBundleId).toBe(bundle.id);
      expect(chat!.metadata?.storyBundleCharacterIds).toEqual([onlyCharacter.id]);
    } finally {
      if (chatId) await page.request.delete(`/api/chats/${chatId}?force=true`);
      await api.delete(bundle.id);
      for (const entity of seeded) await deleteCharacter(page.request, entity.id);
    }
  });

  test("clicking CONVO on a multi-character bundle starts a group chat with every character", async ({ page }) => {
    const suffix = entitySuffix(test.info().title);
    const seeded: EntityRef[] = [];
    const api = new StoryBundleAPI(page);
    let chatId: string | null = null;

    const first = await createCharacter(page.request, `Convo Multi First ${suffix}`);
    seeded.push(first);
    const second = await createCharacter(page.request, `Convo Multi Second ${suffix}`);
    seeded.push(second);

    const bundle = await importStoryBundleFixture(page, path.join(DATA_DIR, "empty.json"), test.info().title);

    try {
      await page.request.patch(`/api/story-bundles/${bundle.id}`, {
        data: { characterIds: [first.id, second.id] },
      });

      const editor = await openEditorForBundle(page, bundle.name);
      await editor.convoButton.click();

      const chat = await findConvoChatByName(page, bundle.name);
      expect(chat).not.toBeNull();
      chatId = chat!.id;

      // Group chat: every bundle character is included (1:n), not just one.
      expect(chat!.characterIds).toEqual([first.id, second.id]);
      expect(chat!.metadata?.storyBundleId).toBe(bundle.id);
      expect(chat!.metadata?.storyBundleCharacterIds).toEqual([first.id, second.id]);

      // The whole point of DirectInject: the Conversation setup wizard never mounts.
      await expect(page.getByRole("dialog", { name: "New Conversation" })).toHaveCount(0);
    } finally {
      if (chatId) await page.request.delete(`/api/chats/${chatId}?force=true`);
      await api.delete(bundle.id);
      for (const entity of seeded) await deleteCharacter(page.request, entity.id);
    }
  });
});

test.describe("Story Bundle CONVO — Negative", () => {
  test("CONVO button on a gallery card is enabled even when no connection is configured", async ({ page }) => {
    // CONVO's DirectInject makes no AI call at all, unlike GM — this proves
    // the button and the whole flow never depend on a configured connection.
    const api = new StoryBundleAPI(page);
    const bundle = await importStoryBundleFixture(page, path.join(DATA_DIR, "empty.json"), test.info().title);

    try {
      const gallery = await openGallery(page);
      await gallery.clickCard(bundle.name);

      await expect(gallery.cardConvoButton(bundle.id)).toBeEnabled();
    } finally {
      await api.delete(bundle.id);
    }
  });

  test("clicking CONVO on a bundle with no characters shows an error and creates nothing", async ({ page }) => {
    const api = new StoryBundleAPI(page);
    const bundle = await importStoryBundleFixture(page, path.join(DATA_DIR, "empty.json"), test.info().title);

    try {
      const editor = await openEditorForBundle(page, bundle.name);
      await editor.convoButton.click();

      await expect(page.getByText("This story bundle has no characters to message.")).toBeVisible();
      expect(await findConvoChatByName(page, bundle.name)).toBeNull();
    } finally {
      await api.delete(bundle.id);
    }
  });
});
