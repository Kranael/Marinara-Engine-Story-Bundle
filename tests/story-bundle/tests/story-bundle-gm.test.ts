/**
 * Story Bundle GM (Game Mode) — Playwright E2E Tests
 *
 * Covers: the GM button and DirectInject bootstrapper in the Gallery and
 * the Editor (story-bundle-direct-inject.ts)
 * - GM button is visible and enabled in the gallery detail card and the
 *   editor header (no longer "Coming soon")
 * - Clicking GM opens the "Who are you?" persona picker, defaulting to the
 *   bundle's own persona
 * - Canceling the picker closes it without creating anything
 * - Confirming creates a game session chat tagged with the story bundle,
 *   using only party members as the chat's characters
 *
 * The default test environment has no configured connection, so the
 * AI-driven world-setup call always fails fast — this mirrors the existing
 * "roleplay button enabled when no connection configured" coverage in
 * story-bundle-play.test.ts. The game session chat itself is still created
 * by the time that failure surfaces, since /game/create needs no connection.
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
import { StoryBundlePersonaPickerModalPage } from "../pages/story-bundle-persona-picker-modal.page.js";
import { importStoryBundleFixture } from "../helpers/story-bundle-fixture.js";
import { StoryBundleAPI } from "../helpers/story-bundle-api.js";
import {
  createCharacter,
  createPersona,
  deleteCharacter,
  deletePersona,
  entitySuffix,
  type EntityRef,
} from "../helpers/story-bundle-entities.js";

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

/** Find the game-mode chat created from a bundle by name, for assertions and cleanup. */
async function findGameChatByName(page: Page, name: string): Promise<CreatedChat | null> {
  const response = await page.request.get("/api/chats");
  const chats = (await response.json()) as CreatedChat[];
  return chats.find((chat) => chat.name === name && chat.mode === "game") ?? null;
}

test.describe("Story Bundle GM — Positive", () => {
  test("GM button is visible and enabled in the gallery detail card", async ({ page }) => {
    const api = new StoryBundleAPI(page);
    const bundle = await importStoryBundleFixture(page, path.join(DATA_DIR, "empty.json"), test.info().title);

    try {
      const gallery = await openGallery(page);
      await gallery.clickCard(bundle.name);

      await expect(gallery.gmButton()).toBeVisible();
      await expect(gallery.gmButton()).toBeEnabled();
    } finally {
      await api.delete(bundle.id);
    }
  });

  test("GM button is visible and enabled in the editor header", async ({ page }) => {
    const api = new StoryBundleAPI(page);
    const bundle = await importStoryBundleFixture(page, path.join(DATA_DIR, "empty.json"), test.info().title);

    try {
      const editor = await openEditorForBundle(page, bundle.name);

      await expect(editor.gmButton).toBeVisible();
      await expect(editor.gmButton).toBeEnabled();
    } finally {
      await api.delete(bundle.id);
    }
  });

  test("clicking GM opens the persona picker, defaulting to the bundle's own persona", async ({ page }) => {
    const suffix = entitySuffix(test.info().title);
    const api = new StoryBundleAPI(page);
    const persona = await createPersona(page.request, `GM Picker Persona ${suffix}`);
    const bundle = await importStoryBundleFixture(page, path.join(DATA_DIR, "empty.json"), test.info().title);

    try {
      await page.request.patch(`/api/story-bundles/${bundle.id}`, { data: { personaIds: [persona.id] } });

      const editor = await openEditorForBundle(page, bundle.name);
      await editor.gmButton.click();

      const modal = new StoryBundlePersonaPickerModalPage(page);
      await modal.waitFor();

      await expect(modal.optionLocator(persona.id)).toBeVisible();
    } finally {
      await api.delete(bundle.id);
      await deletePersona(page.request, persona.id);
    }
  });

  test("canceling the persona picker closes it without creating a game", async ({ page }) => {
    const api = new StoryBundleAPI(page);
    const bundle = await importStoryBundleFixture(page, path.join(DATA_DIR, "empty.json"), test.info().title);

    try {
      const editor = await openEditorForBundle(page, bundle.name);
      await editor.gmButton.click();

      const modal = new StoryBundlePersonaPickerModalPage(page);
      await modal.waitFor();
      await modal.cancel();

      await expect(modal.modal).toBeHidden();
      expect(await findGameChatByName(page, bundle.name)).toBeNull();
    } finally {
      await api.delete(bundle.id);
    }
  });

  test("confirming creates a game session using only party members and tags the story bundle", async ({ page }) => {
    const suffix = entitySuffix(test.info().title);
    const seeded: EntityRef[] = [];
    const api = new StoryBundleAPI(page);
    let chatId: string | null = null;

    const partyMember = await createCharacter(page.request, `GM Party Member ${suffix}`);
    seeded.push(partyMember);
    const npc = await createCharacter(page.request, `GM NPC ${suffix}`);
    seeded.push(npc);
    const persona = await createPersona(page.request, `GM Persona ${suffix}`);

    const bundle = await importStoryBundleFixture(page, path.join(DATA_DIR, "empty.json"), test.info().title);

    try {
      await page.request.patch(`/api/story-bundles/${bundle.id}`, {
        data: {
          characterIds: [partyMember.id, npc.id],
          partyCharacterIds: [partyMember.id],
          personaIds: [persona.id],
        },
      });

      const editor = await openEditorForBundle(page, bundle.name);
      await editor.gmButton.click();

      const modal = new StoryBundlePersonaPickerModalPage(page);
      await modal.waitFor();
      await modal.confirm();

      // The AI-driven world-setup call always fails in this connection-less
      // test environment, but the game session chat is already created.
      await expect(page.getByText("Failed to start the game from this story bundle.")).toBeVisible({
        timeout: 10_000,
      });

      const chat = await findGameChatByName(page, bundle.name);
      expect(chat).not.toBeNull();
      chatId = chat!.id;

      expect(chat!.characterIds).toEqual([partyMember.id]);
      expect(chat!.characterIds).not.toContain(npc.id);
      expect(chat!.personaId).toBe(persona.id);
      expect(chat!.metadata?.storyBundleId).toBe(bundle.id);
    } finally {
      if (chatId) await page.request.delete(`/api/chats/${chatId}?force=true`);
      await api.delete(bundle.id);
      for (const entity of seeded) await deleteCharacter(page.request, entity.id);
      await deletePersona(page.request, persona.id);
    }
  });

  test("confirming tags NPC-assigned characters as library-linked known NPCs (Option A)", async ({ page }) => {
    const suffix = entitySuffix(test.info().title);
    const seeded: EntityRef[] = [];
    const api = new StoryBundleAPI(page);
    let chatId: string | null = null;

    const partyMember = await createCharacter(page.request, `GM Fidelity Party ${suffix}`);
    seeded.push(partyMember);
    const npc = await createCharacter(page.request, `GM Fidelity NPC ${suffix}`);
    seeded.push(npc);

    const bundle = await importStoryBundleFixture(page, path.join(DATA_DIR, "empty.json"), test.info().title);

    try {
      await page.request.patch(`/api/story-bundles/${bundle.id}`, {
        data: {
          characterIds: [partyMember.id, npc.id],
          partyCharacterIds: [partyMember.id],
        },
      });

      const editor = await openEditorForBundle(page, bundle.name);
      await editor.gmButton.click();

      const modal = new StoryBundlePersonaPickerModalPage(page);
      await modal.waitFor();
      await modal.confirm();

      // Tagging (which writes gameNpcs) runs before the world-setup AI call
      // that always fails in this connection-less test environment.
      await expect(page.getByText("Failed to start the game from this story bundle.")).toBeVisible({
        timeout: 10_000,
      });

      const chat = await findGameChatByName(page, bundle.name);
      expect(chat).not.toBeNull();
      chatId = chat!.id;

      const gameNpcs = (chat!.metadata?.gameNpcs ?? []) as Array<{
        name: string;
        characterId?: string | null;
        cardSource?: string;
      }>;
      const trackedNpc = gameNpcs.find((candidate) => candidate.name === npc.name);
      expect(trackedNpc).toBeTruthy();
      expect(trackedNpc!.characterId).toBe(npc.id);
      expect(trackedNpc!.cardSource).toBe("library");
      // The party member is never written into gameNpcs — only assigned NPCs are.
      expect(gameNpcs.find((candidate) => candidate.name === partyMember.name)).toBeUndefined();
    } finally {
      if (chatId) await page.request.delete(`/api/chats/${chatId}?force=true`);
      await api.delete(bundle.id);
      for (const entity of seeded) await deleteCharacter(page.request, entity.id);
    }
  });

  test("confirming copies the bundle's excluded asset folders onto the new session chat", async ({ page }) => {
    const api = new StoryBundleAPI(page);
    let chatId: string | null = null;

    const bundle = await importStoryBundleFixture(page, path.join(DATA_DIR, "empty.json"), test.info().title);

    try {
      await page.request.patch(`/api/story-bundles/${bundle.id}`, {
        data: { gameAssetSelection: { excludedFolders: ["music"] } },
      });

      const editor = await openEditorForBundle(page, bundle.name);
      await editor.gmButton.click();

      const modal = new StoryBundlePersonaPickerModalPage(page);
      await modal.waitFor();
      await modal.confirm();

      await expect(page.getByText("Failed to start the game from this story bundle.")).toBeVisible({
        timeout: 10_000,
      });

      const chat = await findGameChatByName(page, bundle.name);
      expect(chat).not.toBeNull();
      chatId = chat!.id;

      const excludedFolders = (chat!.metadata?.gameAssetSelection as { excludedFolders?: string[] } | undefined)
        ?.excludedFolders;
      expect(excludedFolders).toContain("music");
    } finally {
      if (chatId) await page.request.delete(`/api/chats/${chatId}?force=true`);
      await api.delete(bundle.id);
    }
  });
});

test.describe("Story Bundle GM — Negative", () => {
  test("GM button on a gallery card is enabled even when no connection is configured", async ({ page }) => {
    // Mirrors "roleplay button is enabled when no connection is configured"
    // in story-bundle-play.test.ts — the button itself never depends on a
    // connection existing; only the eventual world-setup call can fail.
    const api = new StoryBundleAPI(page);
    const bundle = await importStoryBundleFixture(page, path.join(DATA_DIR, "empty.json"), test.info().title);

    try {
      const gallery = await openGallery(page);
      await gallery.clickCard(bundle.name);

      await expect(gallery.cardGmButton(bundle.id)).toBeEnabled();
    } finally {
      await api.delete(bundle.id);
    }
  });
});
