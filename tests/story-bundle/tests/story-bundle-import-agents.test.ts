/**
 * Story Bundle Import — Missing Agents & Image Restore Playwright E2E Tests
 *
 * Extends story-bundle-import-export.test.ts with the two import behaviors
 * added for agent-aware, self-contained imports:
 * - Importing a bundle that references an agent that is NOT installed shows
 *   the "missing agents" prompt with the agent's display name and an Install
 *   button (agents are provided by capability packages).
 * - Importing a bundle that references an agent that IS installed (a custom
 *   agent config) does NOT show the missing-agents prompt.
 * - Importing a bundle that carries an embedded `bundleImage` data URL and an
 *   `avatarCrop` restores both on the importing machine (self-contained export).
 *
 * Each test writes a unique envelope (unique bundle + agent names) so parallel
 * workers never collide, and cleans up bundles, agents, and temp files in a
 * finally block so cleanup survives failures.
 */
import { expect, test } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";
import { BasePage } from "../pages/base.page.js";
import { HomePage } from "../../pages/home.page.js";
import { StoryBundlesPanelPage } from "../pages/story-bundles-panel.page.js";
import { ImportStoryBundleModalPage } from "../pages/import-story-bundle-modal.page.js";

const DATA_DIR = path.resolve(import.meta.dirname, "..", "data");

/** 1x1 transparent PNG, the smallest valid image payload. */
const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

/** Build an envelope referencing agents and write it to a temp file. */
function writeAgentEnvelope(
  filePath: string,
  bundleName: string,
  agentIds: string[],
  embeddedAgents: Array<{ id: string; name: string }>,
): void {
  const envelope = {
    type: "marinara_story_bundle",
    version: 1,
    data: {
      name: bundleName,
      description: "",
      characterIds: [],
      personaIds: [],
      lorebookIds: [],
      agentIds,
      embeddedAgents,
    },
  };
  fs.writeFileSync(filePath, JSON.stringify(envelope));
}

/** Resolve a story bundle id by exact name via the list endpoint. */
async function findBundleIdByName(
  request: import("@playwright/test").APIRequestContext,
  name: string,
): Promise<string | null> {
  const bundles = (await request.get("/api/story-bundles").then((r) => r.json())) as Array<{
    id: string;
    name: string;
  }>;
  return bundles.find((b) => b.name === name)?.id ?? null;
}

test.describe("Story Bundle Import Agents — Positive", () => {
  test("importing a bundle with a missing agent shows the install prompt", async ({ page }) => {
    const base = new BasePage(page);
    const home = new HomePage(page);
    const panel = new StoryBundlesPanelPage(page);
    const importModal = new ImportStoryBundleModalPage(page);

    const suffix = `${Date.now().toString(36)}-${process.env.TEST_WORKER_INDEX ?? "0"}`;
    const bundleName = `Missing Agent Bundle ${suffix}`;
    const missingAgentId = `nonexistent-agent-${suffix}`;
    const missingAgentLabel = `Fancy Missing Agent ${suffix}`;
    const envelopePath = path.join(DATA_DIR, `missing-agent-${suffix}.json`);

    let bundleId: string | null = null;

    try {
      writeAgentEnvelope(
        envelopePath,
        bundleName,
        [missingAgentId],
        [{ id: missingAgentId, name: missingAgentLabel }],
      );

      await base.goto();
      await home.openStoryBundlesPanel();
      await panel.waitFor();

      await panel.importButton.click();
      await importModal.waitFor();

      await importModal.uploadFile(envelopePath);

      // The import completes first…
      await expect(importModal.results).toContainText(/Imported/, { timeout: 10_000 });

      // …then the missing-agents prompt appears with the friendly label.
      await expect(importModal.missingAgentsSection).toBeVisible({ timeout: 10_000 });
      await expect(importModal.missingAgentsSection).toContainText(missingAgentLabel);
      await expect(importModal.missingAgentRows).toHaveCount(1);
      await expect(importModal.installAgentButtons).toHaveCount(1);

      bundleId = await findBundleIdByName(page.request, bundleName);
    } finally {
      if (bundleId) await page.request.delete(`/api/story-bundles/${bundleId}`);
      if (fs.existsSync(envelopePath)) fs.unlinkSync(envelopePath);
    }
  });

  test("importing a bundle whose agent is already installed shows no prompt", async ({ page }) => {
    const base = new BasePage(page);
    const home = new HomePage(page);
    const panel = new StoryBundlesPanelPage(page);
    const importModal = new ImportStoryBundleModalPage(page);

    const suffix = `${Date.now().toString(36)}-${process.env.TEST_WORKER_INDEX ?? "0"}`;
    const bundleName = `Present Agent Bundle ${suffix}`;
    const agentType = `custom-agent-${suffix}`;
    const envelopePath = path.join(DATA_DIR, `present-agent-${suffix}.json`);

    let bundleId: string | null = null;
    let agentId: string | null = null;

    try {
      // Create a custom agent config so the referenced agent is "known" locally.
      const agentResponse = await page.request.post("/api/agents", {
        data: {
          type: agentType,
          name: `Custom Agent ${suffix}`,
          description: "",
          phase: "parallel",
          connectionId: null,
          imagePath: null,
          promptTemplate: "",
          settings: {},
        },
      });
      expect(agentResponse.ok()).toBe(true);
      agentId = ((await agentResponse.json()) as { id?: string }).id ?? null;

      writeAgentEnvelope(envelopePath, bundleName, [agentType], [
        { id: agentType, name: `Custom Agent ${suffix}` },
      ]);

      await base.goto();
      await home.openStoryBundlesPanel();
      await panel.waitFor();

      await panel.importButton.click();
      await importModal.waitFor();

      await importModal.uploadFile(envelopePath);

      await expect(importModal.results).toContainText(/Imported/, { timeout: 10_000 });

      // No missing-agents prompt because the agent is already available.
      await expect(importModal.missingAgentsSection).toHaveCount(0);

      bundleId = await findBundleIdByName(page.request, bundleName);
    } finally {
      if (bundleId) await page.request.delete(`/api/story-bundles/${bundleId}`);
      if (agentId) await page.request.delete(`/api/agents/${agentId}`);
      if (fs.existsSync(envelopePath)) fs.unlinkSync(envelopePath);
    }
  });

  test("importing a bundle with an embedded image restores the picture and crop", async ({ page }) => {
    const suffix = `${Date.now().toString(36)}-${process.env.TEST_WORKER_INDEX ?? "0"}`;
    const bundleName = `Image Restore Bundle ${suffix}`;

    let bundleId: string | null = null;

    try {
      // Self-contained envelope: the source machine's imagePath is stale, but
      // the embedded bundleImage data URL + avatarCrop must be restored.
      const envelope = {
        type: "marinara_story_bundle",
        version: 1,
        data: {
          name: bundleName,
          description: "",
          characterIds: [],
          personaIds: [],
          lorebookIds: [],
          imagePath: "/api/story-bundles/images/file/source-machine.png",
          avatarCrop: { srcX: 0.1, srcY: 0.1, srcWidth: 0.5, srcHeight: 0.5 },
          bundleImage: `data:image/png;base64,${TINY_PNG_BASE64}`,
        },
      };

      const importResponse = await page.request.post("/api/import/marinara", { data: envelope });
      expect(importResponse.ok()).toBe(true);
      const imported = (await importResponse.json()) as { success: boolean; id?: string };
      expect(imported.success).toBe(true);
      bundleId = imported.id ?? null;
      expect(bundleId).not.toBeNull();

      const bundle = (await (await page.request.get(`/api/story-bundles/${bundleId}`)).json()) as {
        imagePath: string | null;
        avatarCrop: { srcX: number; srcY: number; srcWidth: number; srcHeight: number } | null;
      };

      // The image was written locally (not the stale source-machine path)…
      expect(bundle.imagePath).toBeTruthy();
      expect(bundle.imagePath).not.toBe("/api/story-bundles/images/file/source-machine.png");
      // …and is actually served.
      expect((await page.request.get(bundle.imagePath as string)).ok()).toBe(true);

      // The avatar crop round-trips.
      expect(bundle.avatarCrop).not.toBeNull();
      expect(bundle.avatarCrop?.srcX).toBeCloseTo(0.1);
      expect(bundle.avatarCrop?.srcWidth).toBeCloseTo(0.5);
    } finally {
      if (bundleId) await page.request.delete(`/api/story-bundles/${bundleId}`);
    }
  });

  test("embedded prompt shows the count of agents included in the bundle", async ({ page }) => {
    const base = new BasePage(page);
    const home = new HomePage(page);
    const panel = new StoryBundlesPanelPage(page);
    const importModal = new ImportStoryBundleModalPage(page);

    const suffix = `${Date.now().toString(36)}-${process.env.TEST_WORKER_INDEX ?? "0"}`;
    const bundleName = `Agent Count Bundle ${suffix}`;
    const envelopePath = path.join(DATA_DIR, `agent-count-${suffix}.json`);

    let bundleId: string | null = null;

    try {
      // Embedded character (so the prompt appears) plus two referenced agents
      // (so the agent count badge shows "2").
      const envelope = {
        type: "marinara_story_bundle",
        version: 1,
        data: {
          name: bundleName,
          description: "",
          characterIds: [],
          personaIds: [],
          lorebookIds: [],
          agentIds: [`agent-a-${suffix}`, `agent-b-${suffix}`],
          embeddedCharacters: [{ id: `char-${suffix}`, name: `Count Char ${suffix}`, data: {} }],
          embeddedPersonas: [],
          embeddedLorebooks: [],
          embeddedAgents: [
            { id: `agent-a-${suffix}`, name: `Agent A ${suffix}` },
            { id: `agent-b-${suffix}`, name: `Agent B ${suffix}` },
          ],
        },
      };
      fs.writeFileSync(envelopePath, JSON.stringify(envelope));

      await base.goto();
      await home.openStoryBundlesPanel();
      await panel.waitFor();

      await panel.importButton.click();
      await importModal.waitFor();

      await importModal.uploadFile(envelopePath);

      // The embedded prompt appears and shows the agent count.
      await expect(importModal.modal).toContainText(/embedded content|Embedded/, { timeout: 10_000 });
      await expect(importModal.embeddedAgentCount).toBeVisible();
      await expect(importModal.embeddedAgentCount).toHaveText("2");

      // Skip embedded content so we do not actually import the character.
      await importModal.skipEmbeddedButton.click();
      await expect(importModal.results).toContainText(/Imported/, { timeout: 10_000 });

      bundleId = await findBundleIdByName(page.request, bundleName);
    } finally {
      if (bundleId) await page.request.delete(`/api/story-bundles/${bundleId}`);
      if (fs.existsSync(envelopePath)) fs.unlinkSync(envelopePath);
    }
  });
});
