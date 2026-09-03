/**
 * Game Mode — Known NPCs (Option A) — Playwright E2E Tests
 *
 * General (non-Story-Bundle) coverage for two Game Mode engine fixes:
 * - `/game/setup` (and its JSON-repair sibling `/game/setup/apply-json`) no
 *   longer replace `gameNpcs` wholesale with the AI's own `startingNpcs` —
 *   library-linked NPCs (GameNpc.characterId set) are preserved, and a
 *   freshly-generated NPC whose name collides with an existing one is
 *   dropped instead of duplicated.
 * - The Chat Settings "World Characters" list (ChatSettingsDrawer.tsx)
 *   renders every tracked NPC from `metadata.gameNpcs`, badges
 *   library-linked ones, and can remove one via metadata PATCH.
 *
 * These are plain Game Mode chats created directly through the API
 * (`POST /game/create`) — no Story Bundle involved. `/game/setup/apply-json`
 * is the same endpoint the app's own "repair setup JSON" flow uses; it runs
 * `applyGameSetupPayload` without any AI call, so these tests don't need a
 * configured connection.
 */
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { prepareFreshClient } from "./story-bundle/helpers/fresh-client.js";
import { ChatSettingsDrawerPage } from "./pages/chat-settings-drawer.page.js";

interface CreatedGame {
  gameId: string;
  sessionChat: { id: string };
}

const MINIMAL_SETUP_CONFIG = {
  genre: "Fantasy",
  setting: "A test world",
  tone: "Heroic",
  difficulty: "Normal",
  gmMode: "standalone" as const,
  rating: "sfw" as const,
  partyCharacterIds: [] as string[],
};

/** Create a plain Game Mode chat (no Story Bundle) via POST /game/create. */
async function createGameChat(request: APIRequestContext, name: string): Promise<CreatedGame> {
  const response = await request.post("/api/game/create", {
    data: { name, setupConfig: MINIMAL_SETUP_CONFIG },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  return (await response.json()) as CreatedGame;
}

/**
 * Move a freshly created game chat out of `gameSessionStatus: "setup"` via
 * `/game/setup/apply-json` (no AI call — same endpoint the app's own JSON
 * repair flow uses), then overwrite `gameNpcs` with the exact test fixture,
 * then transition straight to "active" via `/game/start` and seed a fake
 * assistant turn so GameSurface renders its normal toolbar instead of the
 * setup wizard, the lightweight "Start Game" confirmation, or the "adventure
 * begins" first-turn-generation screen (all gated on session status /
 * message history, none of which need a real AI connection here).
 */
async function completeGameSetupWithNpcs(
  request: APIRequestContext,
  chatId: string,
  gameNpcs: Array<Record<string, unknown>>,
): Promise<void> {
  const rawJson = JSON.stringify({
    storyArc: "A test arc",
    worldOverview: "A test overview",
    plotTwists: ["A single twist"],
    startingNpcs: [{ name: "Setup Placeholder NPC" }],
  });
  const applyResponse = await request.post("/api/game/setup/apply-json", { data: { chatId, rawJson } });
  expect(applyResponse.ok(), await applyResponse.text()).toBeTruthy();

  const seedResponse = await request.patch(`/api/chats/${chatId}/metadata`, {
    data: { gameNpcs, gameIntroPresented: true },
  });
  expect(seedResponse.ok(), await seedResponse.text()).toBeTruthy();

  const startResponse = await request.post("/api/game/start", { data: { chatId } });
  expect(startResponse.ok(), await startResponse.text()).toBeTruthy();

  const messageResponse = await request.post(`/api/chats/${chatId}/messages`, {
    data: { role: "assistant", content: "The adventure begins." },
  });
  expect(messageResponse.ok(), await messageResponse.text()).toBeTruthy();
}

test.describe("Game Setup — known NPCs merge (Option A)", () => {
  test("preserves an existing library-linked NPC across a world-setup apply", async ({ page }) => {
    const game = await createGameChat(page.request, `NPC Merge Preserve ${test.info().title}`);
    const chatId = game.sessionChat.id;

    try {
      const seedResponse = await page.request.patch(`/api/chats/${chatId}/metadata`, {
        data: {
          gameNpcs: [
            {
              id: "seeded-library-npc",
              name: "Seeded Library NPC",
              emoji: "🧑",
              description: "",
              gender: null,
              pronouns: null,
              location: "",
              reputation: 0,
              notes: [],
              avatarUrl: null,
              characterId: "seeded-character-id",
              cardSource: "library",
            },
          ],
        },
      });
      expect(seedResponse.ok(), await seedResponse.text()).toBeTruthy();

      const rawJson = JSON.stringify({
        storyArc: "A test arc",
        worldOverview: "A test overview",
        plotTwists: ["A single twist"],
        startingNpcs: [{ name: "Brand New Generated NPC", description: "Invented by the AI" }],
      });
      const applyResponse = await page.request.post("/api/game/setup/apply-json", { data: { chatId, rawJson } });
      expect(applyResponse.ok(), await applyResponse.text()).toBeTruthy();
      const body = (await applyResponse.json()) as { gameNpcs: Array<Record<string, unknown>> };

      const preserved = body.gameNpcs.find((npc) => npc.id === "seeded-library-npc");
      expect(preserved).toBeTruthy();
      expect(preserved!.characterId).toBe("seeded-character-id");

      const generated = body.gameNpcs.find((npc) => npc.name === "Brand New Generated NPC");
      expect(generated).toBeTruthy();
      expect(generated!.characterId ?? null).toBeNull();

      expect(body.gameNpcs).toHaveLength(2);
    } finally {
      await page.request.delete(`/api/chats/${chatId}?force=true`);
    }
  });

  test("drops a freshly generated NPC whose name collides with an existing library NPC", async ({ page }) => {
    const game = await createGameChat(page.request, `NPC Merge Collision ${test.info().title}`);
    const chatId = game.sessionChat.id;

    try {
      const seedResponse = await page.request.patch(`/api/chats/${chatId}/metadata`, {
        data: {
          gameNpcs: [
            {
              id: "seeded-library-npc",
              name: "Duplicate Name NPC",
              emoji: "🧑",
              description: "The one true library card",
              gender: null,
              pronouns: null,
              location: "",
              reputation: 0,
              notes: [],
              avatarUrl: null,
              characterId: "seeded-character-id",
              cardSource: "library",
            },
          ],
        },
      });
      expect(seedResponse.ok(), await seedResponse.text()).toBeTruthy();

      const rawJson = JSON.stringify({
        storyArc: "A test arc",
        worldOverview: "A test overview",
        plotTwists: ["A single twist"],
        // Same name (different case) as the seeded library NPC — must be
        // dropped, not appended as a second, characterId-less duplicate.
        startingNpcs: [{ name: "duplicate name npc", description: "A hallucinated re-invention" }],
      });
      const applyResponse = await page.request.post("/api/game/setup/apply-json", { data: { chatId, rawJson } });
      expect(applyResponse.ok(), await applyResponse.text()).toBeTruthy();
      const body = (await applyResponse.json()) as { gameNpcs: Array<Record<string, unknown>> };

      expect(body.gameNpcs).toHaveLength(1);
      expect(body.gameNpcs[0]!.characterId).toBe("seeded-character-id");
      expect(body.gameNpcs[0]!.description).toBe("The one true library card");
    } finally {
      await page.request.delete(`/api/chats/${chatId}?force=true`);
    }
  });
});

test.describe("Chat Settings — World Characters (Option A)", () => {
  async function openChatSettingsFor(page: Page, chatId: string): Promise<ChatSettingsDrawerPage> {
    await prepareFreshClient(page);
    await page.addInitScript((id) => localStorage.setItem("marinara-active-chat-id", id), chatId);
    await page.goto("/");
    const drawer = new ChatSettingsDrawerPage(page);
    await drawer.open();
    return drawer;
  }

  test("lists tracked NPCs and badges library-linked ones", async ({ page }, testInfo) => {
    test.skip(
      !testInfo.project.name.includes("desktop"),
      "GameSurface's mobile toolbar collapses the settings button into its own mobile-actions menu; covered on desktop.",
    );
    const game = await createGameChat(page.request, `World Characters List ${test.info().title}`);
    const chatId = game.sessionChat.id;

    try {
      await completeGameSetupWithNpcs(page.request, chatId, [
        {
          id: "library-npc",
          name: "Library Linked NPC",
          emoji: "🧑",
          description: "",
          gender: null,
          pronouns: null,
          location: "",
          reputation: 0,
          notes: [],
          avatarUrl: null,
          characterId: "some-character-id",
          cardSource: "library",
        },
        {
          id: "dynamic-npc",
          name: "Dynamic Tavern Keeper",
          emoji: "🧑",
          description: "",
          gender: null,
          pronouns: null,
          location: "The Rusty Tankard",
          reputation: 0,
          notes: [],
          avatarUrl: null,
        },
      ]);

      const drawer = await openChatSettingsFor(page, chatId);
      await drawer.openCharactersSection();

      await expect(drawer.worldCharacterRow("library-npc")).toBeVisible();
      await expect(drawer.worldCharacterRow("library-npc")).toContainText("Library character");

      await expect(drawer.worldCharacterRow("dynamic-npc")).toBeVisible();
      await expect(drawer.worldCharacterRow("dynamic-npc")).toContainText("The Rusty Tankard");
    } finally {
      await page.request.delete(`/api/chats/${chatId}?force=true`);
    }
  });

  test("removing a world character updates chat metadata", async ({ page }, testInfo) => {
    test.skip(
      !testInfo.project.name.includes("desktop"),
      "GameSurface's mobile toolbar collapses the settings button into its own mobile-actions menu; covered on desktop.",
    );
    const game = await createGameChat(page.request, `World Characters Remove ${test.info().title}`);
    const chatId = game.sessionChat.id;

    try {
      await completeGameSetupWithNpcs(page.request, chatId, [
        {
          id: "removable-npc",
          name: "Removable NPC",
          emoji: "🧑",
          description: "",
          gender: null,
          pronouns: null,
          location: "",
          reputation: 0,
          notes: [],
          avatarUrl: null,
        },
      ]);

      const drawer = await openChatSettingsFor(page, chatId);
      await drawer.openCharactersSection();
      await expect(drawer.worldCharacterRow("removable-npc")).toBeVisible();

      await drawer.removeWorldCharacterButton("removable-npc").click();
      await expect(drawer.worldCharacterRow("removable-npc")).toHaveCount(0);
      await expect(drawer.worldCharactersEmptyState()).toBeVisible();

      const chatResponse = await page.request.get(`/api/chats/${chatId}`);
      const chat = (await chatResponse.json()) as { metadata?: { gameNpcs?: unknown[] } };
      expect(chat.metadata?.gameNpcs ?? []).toHaveLength(0);
    } finally {
      await page.request.delete(`/api/chats/${chatId}?force=true`);
    }
  });
});
