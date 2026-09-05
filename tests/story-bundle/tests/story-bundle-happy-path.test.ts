import { expect, test, type Page } from "@playwright/test";
import { BasePage } from "../pages/base.page.js";
import { HomePage } from "../../pages/home.page.js";
import { StoryBundlesPanelPage } from "../pages/story-bundles-panel.page.js";
import { StoryBundleEditorPage } from "../pages/story-bundle-editor.page.js";
import { StoryBundleConvoCharacterPickerModalPage } from "../pages/story-bundle-convo-character-picker-modal.page.js";
import { StoryBundleGmStartModalPage } from "../pages/story-bundle-gm-start-modal.page.js";
import { StoryBundleAPI, type StoryBundle } from "../helpers/story-bundle-api.js";
import {
  createCharacter,
  createPersona,
  createLorebook,
  createPreset,
  createCustomAgent,
  deleteCharacter,
  deletePersona,
  deleteLorebook,
  deletePreset,
  deleteAgent,
  entitySuffix,
  type EntityRef,
  type AgentRef,
} from "../helpers/story-bundle-entities.js";

/**
 * Story Bundle Happy Path — one suite, three mode tests.
 *
 * Each test assembles the same complete bundle (one character, one persona,
 * one lorebook, one preset, four agents) through the REST API, then drives a
 * single mode's UI flow from the editor header all the way to a created chat:
 *
 *   - CONVO: 1 character → character picker → group conversation chat
 *   - RP:    persona → scenario ("Surprise Me" default) → roleplay chat
 *   - GM:    persona → scenario ("Surprise Me" default) → game session chat
 *            (the single character is an NPC, so it lands in gameNpcs)
 *
 * The bundle assembly is shared so the three modes are exercised against an
 * identical, realistic setup without repeating the entity-creation UI flow.
 */

interface CreatedChat {
  id: string;
  name: string;
  mode: string;
  characterIds: string[];
  personaId: string | null;
  metadata: Record<string, unknown>;
}

/** Everything a test needs to drive a mode and clean up afterwards. */
interface AssembledBundle {
  bundle: StoryBundle;
  character: EntityRef;
  persona: EntityRef;
  lorebook: EntityRef;
  preset: EntityRef;
  agents: AgentRef[];
}

/**
 * Seed one character, one persona, one lorebook, one preset and four custom
 * agents, then create a story bundle wired to all of them. When `withScenario`
 * is set, a single scenario is attached so the RP/GM wizards show their
 * Persona → Scenario → Go flow (the "Surprise Me" default is always present).
 */
async function assembleStoryBundle(page: Page, options: { withScenario: boolean }): Promise<AssembledBundle> {
  const suffix = entitySuffix(test.info().title);
  const api = new StoryBundleAPI(page);

  const character = await createCharacter(page.request, `Happy Path Character ${suffix}`);
  const persona = await createPersona(page.request, `Happy Path Persona ${suffix}`);
  const lorebook = await createLorebook(page.request, `Happy Path Lorebook ${suffix}`);
  const preset = await createPreset(page.request, `Happy Path Preset ${suffix}`);
  const agents = await Promise.all([
    createCustomAgent(page.request, `Happy Path Continuity ${suffix}`, "happy-path-continuity"),
    createCustomAgent(page.request, `Happy Path World State ${suffix}`, "happy-path-world-state"),
    createCustomAgent(page.request, `Happy Path Prose Guardian ${suffix}`, "happy-path-prose-guardian"),
    createCustomAgent(page.request, `Happy Path Character Tracker ${suffix}`, "happy-path-character-tracker"),
  ]);

  const bundle = await api.create({ name: `Happy Path Bundle ${suffix}` });
  await page.request.patch(`/api/story-bundles/${bundle.id}`, {
    data: {
      characterIds: [character.id],
      personaIds: [persona.id],
      lorebookIds: [lorebook.id],
      presetIds: [preset.id],
      agentIds: agents.map((agent) => agent.id),
      ...(options.withScenario
        ? { scenarios: [{ id: "happy-path-start", title: "Happy Path Start", openingMessage: "A fresh beginning." }] }
        : {}),
    },
  });

  return { bundle, character, persona, lorebook, preset, agents };
}

/** Navigate to the app, open the panel, and click a bundle row to open its editor. */
async function openEditorForBundle(page: Page, bundleName: string): Promise<StoryBundleEditorPage> {
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

/** Find a chat created from a bundle by name and mode, for assertions and cleanup. */
async function findChatByName(page: Page, name: string, mode: string): Promise<CreatedChat | null> {
  const response = await page.request.get("/api/chats");
  const chats = (await response.json()) as CreatedChat[];
  return chats.find((chat) => chat.name === name && chat.mode === mode) ?? null;
}

/**
 * Poll until a chat with the given name/mode exists AND its bundle tagging has
 * landed. The CONVO/RP/GM DirectInject flows create the chat first, then tag
 * `metadata.storyBundleId` in a follow-up request — under parallel load the
 * chat can be visible before the tag, so a single read races.
 */
async function waitForTaggedChat(page: Page, name: string, mode: string): Promise<CreatedChat> {
  let chat: CreatedChat | null = null;
  await expect
    .poll(
      async () => {
        chat = await findChatByName(page, name, mode);
        return chat?.metadata?.storyBundleId ?? null;
      },
      { timeout: 10_000 },
    )
    .toBeTruthy();
  return chat!;
}

/** Delete the chat, bundle and every seeded entity created by assembleStoryBundle. */
async function cleanupAssembled(page: Page, assembled: AssembledBundle, chatId: string | null): Promise<void> {
  if (chatId) await page.request.delete(`/api/chats/${chatId}?force=true`);
  await new StoryBundleAPI(page).delete(assembled.bundle.id);
  await deleteCharacter(page.request, assembled.character.id);
  await deletePersona(page.request, assembled.persona.id);
  await deleteLorebook(page.request, assembled.lorebook.id);
  await deletePreset(page.request, assembled.preset.id);
  for (const agent of assembled.agents) await deleteAgent(page.request, agent.id);
}

test.describe("Story Bundle Happy Path", () => {
  test("CONVO mode: one character starts a group conversation chat", async ({ page }) => {
    const assembled = await assembleStoryBundle(page, { withScenario: false });
    let chatId: string | null = null;

    try {
      const editor = await openEditorForBundle(page, assembled.bundle.name);
      await editor.convoButton.click();

      // The picker modal appears (never auto-starts with all characters).
      const picker = new StoryBundleConvoCharacterPickerModalPage(page);
      await picker.waitFor();

      // The single bundle character is pre-selected; confirm to start.
      await picker.confirm();

      const chat = await waitForTaggedChat(page, assembled.bundle.name, "conversation");
      chatId = chat.id;
      expect(chat.characterIds).toEqual([assembled.character.id]);
      expect(chat.metadata?.storyBundleId).toBe(assembled.bundle.id);
      expect(chat.metadata?.storyBundleCharacterIds).toEqual([assembled.character.id]);
    } finally {
      await cleanupAssembled(page, assembled, chatId);
    }
  });

  test("RP mode: persona then scenario (Surprise Me) starts a roleplay chat", async ({ page }) => {
    const assembled = await assembleStoryBundle(page, { withScenario: true });
    let chatId: string | null = null;

    try {
      const editor = await openEditorForBundle(page, assembled.bundle.name);
      await editor.playButton.click();

      // Persona step → Next → Scenario step → Surprise Me (the default).
      await page.getByTestId("story-bundle-rp-wizard-next").click();
      await page.getByTestId("story-bundle-rp-scenario-surprise-me").click();

      await expect(page.getByText("Roleplay started!")).toBeVisible({ timeout: 10_000 });

      const chat = await waitForTaggedChat(page, assembled.bundle.name, "roleplay");
      chatId = chat.id;
      expect(chat.characterIds).toEqual([assembled.character.id]);
      expect(chat.personaId).toBe(assembled.persona.id);
      expect(chat.metadata?.storyBundleId).toBe(assembled.bundle.id);
    } finally {
      await cleanupAssembled(page, assembled, chatId);
    }
  });

  test("GM mode: persona then scenario (Surprise Me) starts a game session chat", async ({ page }) => {
    const assembled = await assembleStoryBundle(page, { withScenario: true });
    let chatId: string | null = null;

    try {
      const editor = await openEditorForBundle(page, assembled.bundle.name);
      await editor.gmButton.click();

      const modal = new StoryBundleGmStartModalPage(page);
      await modal.waitFor();
      await modal.goNext();
      await modal.surpriseMeCard().click();

      // The AI-driven world-setup call always fails in this connection-less
      // test environment, but the game session chat is already created.
      await expect(page.getByText("Failed to start the game from this story bundle.")).toBeVisible({
        timeout: 10_000,
      });

      const chat = await waitForTaggedChat(page, assembled.bundle.name, "game");
      chatId = chat.id;
      expect(chat.personaId).toBe(assembled.persona.id);
      expect(chat.metadata?.storyBundleId).toBe(assembled.bundle.id);

      // The single bundle character is assigned as an NPC (not a party member),
      // so it lands in gameNpcs as a library-linked known NPC — never in
      // characterIds (which only holds party members).
      expect(chat.characterIds).toEqual([]);
      const gameNpcs = (chat.metadata?.gameNpcs ?? []) as Array<{
        name: string;
        characterId?: string | null;
        cardSource?: string;
      }>;
      const trackedNpc = gameNpcs.find((candidate) => candidate.characterId === assembled.character.id);
      expect(trackedNpc).toBeTruthy();
      expect(trackedNpc!.cardSource).toBe("library");
    } finally {
      await cleanupAssembled(page, assembled, chatId);
    }
  });
});
