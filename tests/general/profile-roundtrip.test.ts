/**
 * Profile Export/Import Roundtrip Test
 *
 * Verifies that a full profile export can be imported back successfully.
 * This specifically covers the fix for gallery JSON manifest files
 * (e.g. gallery/mari-images/manifest.json) that were previously rejected
 * during import with "not a supported image file".
 *
 * Seeds at least 2 of each entity type, writes a gallery manifest to the
 * data dir, exports the profile as ZIP, imports it back, and verifies all
 * entities survive the roundtrip.
 */
import { expect, test } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "../..");
const desktopDataDir = resolve(repoRoot, ".tmp/playwright-data/desktop");

interface ImportedStats {
  characters: number;
  personas: number;
  lorebooks: number;
  presets: number;
  agents: number;
  themes: number;
  chats: number;
  messages: number;
  connections: number;
  files: number;
  tables: Record<string, number>;
}

test.describe("Profile Export/Import Roundtrip", () => {
  test("full profile roundtrip with 2+ of each entity type including gallery manifest", async ({ request }, testInfo) => {
    test.skip(!testInfo.project.name.includes("desktop"), "Roundtrip is covered once on desktop.");
    test.setTimeout(120_000);

    const suffix = Date.now().toString(36);
    const deleteUrls: string[] = [];

    async function createEntity(
      label: string,
      url: string,
      data: Record<string, unknown>,
      deleteUrlFn: (id: string) => string,
    ): Promise<{ id: string }> {
      const response = await request.post(url, { data });
      const body = await response.text();
      expect(response.ok(), `Failed to create ${label}: ${response.status()} ${body}`).toBeTruthy();
      const parsed = JSON.parse(body) as { id: string };
      deleteUrls.push(deleteUrlFn(parsed.id));
      return parsed;
    }

    try {
      // ── Seed 2 characters ──
      const char1 = await createEntity("character", "/api/characters", { data: { name: `RT Char A ${suffix}` } }, (id) => `/api/characters/${id}`);
      const char2 = await createEntity("character", "/api/characters", { data: { name: `RT Char B ${suffix}` } }, (id) => `/api/characters/${id}`);

      // ── Seed 2 personas ──
      const persona1 = await createEntity("persona", "/api/characters/personas", { name: `RT Persona A ${suffix}` }, (id) => `/api/characters/personas/${id}`);
      const persona2 = await createEntity("persona", "/api/characters/personas", { name: `RT Persona B ${suffix}` }, (id) => `/api/characters/personas/${id}`);

      // ── Seed 2 lorebooks ──
      const lb1 = await createEntity("lorebook", "/api/lorebooks", { name: `RT Lorebook A ${suffix}` }, (id) => `/api/lorebooks/${id}`);
      const lb2 = await createEntity("lorebook", "/api/lorebooks", { name: `RT Lorebook B ${suffix}` }, (id) => `/api/lorebooks/${id}`);

      // ── Seed 2 prompt presets ──
      const preset1 = await createEntity("preset", "/api/prompts", { name: `RT Preset A ${suffix}`, description: "Roundtrip test fixture." }, (id) => `/api/prompts/${id}`);
      const preset2 = await createEntity("preset", "/api/prompts", { name: `RT Preset B ${suffix}`, description: "Roundtrip test fixture." }, (id) => `/api/prompts/${id}`);

      // ── Seed 2 custom agents ──
      const agent1 = await createEntity("agent", "/api/agents", {
        type: `rt-agent-a-${suffix}`,
        name: `RT Agent A ${suffix}`,
        description: "Roundtrip test fixture.",
        phase: "post_processing",
        connectionId: null,
        promptTemplate: "Return the original text.",
        settings: {},
      }, (id) => `/api/agents/${id}`);
      const agent2 = await createEntity("agent", "/api/agents", {
        type: `rt-agent-b-${suffix}`,
        name: `RT Agent B ${suffix}`,
        description: "Roundtrip test fixture.",
        phase: "post_processing",
        connectionId: null,
        promptTemplate: "Return the original text.",
        settings: {},
      }, (id) => `/api/agents/${id}`);

      // ── Seed 2 themes ──
      const theme1 = await createEntity("theme", "/api/themes", { name: `RT Theme A ${suffix}`, css: "" }, (id) => `/api/themes/${id}`);
      const theme2 = await createEntity("theme", "/api/themes", { name: `RT Theme B ${suffix}`, css: "" }, (id) => `/api/themes/${id}`);

      // ── Seed 2 connections ──
      const conn1 = await createEntity("connection", "/api/connections", { name: `RT Conn A ${suffix}`, provider: "openai" }, (id) => `/api/connections/${id}`);
      const conn2 = await createEntity("connection", "/api/connections", { name: `RT Conn B ${suffix}`, provider: "anthropic" }, (id) => `/api/connections/${id}`);

      // ── Seed 2 chats with messages ──
      const chat1 = await createEntity("chat", "/api/chats", { name: `RT Chat A ${suffix}`, mode: "roleplay", characterIds: [char1.id] }, (id) => `/api/chats/${id}`);
      const chat2 = await createEntity("chat", "/api/chats", { name: `RT Chat B ${suffix}`, mode: "roleplay", characterIds: [char2.id] }, (id) => `/api/chats/${id}`);

      const msg1Response = await request.post(`/api/chats/${chat1.id}/messages`, { data: { role: "user", content: `Hello from chat A ${suffix}` } });
      expect(msg1Response.ok(), "Failed to create message in chat A").toBeTruthy();
      const msg2Response = await request.post(`/api/chats/${chat2.id}/messages`, { data: { role: "user", content: `Hello from chat B ${suffix}` } });
      expect(msg2Response.ok(), "Failed to create message in chat B").toBeTruthy();

      // ── Seed 2 story bundles ──
      const bundle1 = await createEntity("story-bundle", "/api/story-bundles", { name: `RT Bundle A ${suffix}` }, (id) => `/api/story-bundles/${id}`);
      const bundle2 = await createEntity("story-bundle", "/api/story-bundles", { name: `RT Bundle B ${suffix}` }, (id) => `/api/story-bundles/${id}`);

      // ── Write a gallery manifest to exercise the gallery JSON fix ──
      // This simulates the Professor Mari preview gallery manifest
      // (gallery/mari-images/manifest.json) that was causing import failures
      // before the fix. The export collects all files under gallery/, and the
      // import must accept .json files there without image validation.
      const galleryManifestDir = resolve(desktopDataDir, "gallery", "mari-images");
      mkdirSync(galleryManifestDir, { recursive: true });
      writeFileSync(
        resolve(galleryManifestDir, "manifest.json"),
        JSON.stringify([
          {
            id: `rt-mari-${suffix}`,
            filename: "roundtrip-test.jpg",
            prompt: "Roundtrip test image",
            createdAt: new Date().toISOString(),
          },
        ]),
      );

      // ── Export the profile as ZIP ──
      const exportResponse = await request.get("/api/backup/export-profile?format=zip", { timeout: 60_000 });
      expect(exportResponse.ok(), "Profile ZIP export should succeed").toBeTruthy();
      expect(exportResponse.headers()["content-type"]).toContain("application/zip");
      const archive = await exportResponse.body();
      expect(archive.subarray(0, 2).toString("ascii")).toBe("PK");

      // ── Import the ZIP back ──
      // This is the critical assertion: before the fix, this would fail with
      // "Profile asset gallery/mari-images/manifest.json is not a supported image file."
      const importResponse = await request.post("/api/backup/import-profile", {
        multipart: {
          file: {
            name: "marinara-profile.zip",
            mimeType: "application/zip",
            buffer: archive,
          },
        },
        timeout: 60_000,
      });
      const importBody = await importResponse.text();
      expect(importResponse.ok(), `Profile import should succeed: ${importResponse.status()} ${importBody}`).toBeTruthy();
      const importResult = JSON.parse(importBody) as { success: boolean; imported: ImportedStats };
      expect(importResult.success).toBe(true);

      // ── Verify imported counts are at least what we seeded ──
      const stats = importResult.imported;
      expect(stats.characters).toBeGreaterThanOrEqual(2);
      expect(stats.personas).toBeGreaterThanOrEqual(2);
      expect(stats.lorebooks).toBeGreaterThanOrEqual(2);
      expect(stats.presets).toBeGreaterThanOrEqual(2);
      expect(stats.agents).toBeGreaterThanOrEqual(2);
      expect(stats.themes).toBeGreaterThanOrEqual(2);
      expect(stats.chats).toBeGreaterThanOrEqual(2);
      expect(stats.messages).toBeGreaterThanOrEqual(2);
      expect(stats.connections).toBeGreaterThanOrEqual(2);
      // At least the gallery manifest file should be counted
      expect(stats.files).toBeGreaterThanOrEqual(1);
      // Story bundles are in the tables map
      expect(stats.tables["story_bundles"] ?? 0).toBeGreaterThanOrEqual(2);

      // ── Verify entities are still present after import ──
      const charCheck = await request.get(`/api/characters/${char1.id}`);
      expect(charCheck.ok(), "Character A should still exist after import").toBeTruthy();

      const personaCheck = await request.get(`/api/characters/personas/${persona1.id}`);
      expect(personaCheck.ok(), "Persona A should still exist after import").toBeTruthy();

      const lbCheck = await request.get(`/api/lorebooks/${lb1.id}`);
      expect(lbCheck.ok(), "Lorebook A should still exist after import").toBeTruthy();

      const bundleCheck = await request.get(`/api/story-bundles/${bundle1.id}`);
      expect(bundleCheck.ok(), "Story bundle A should still exist after import").toBeTruthy();

      const themeCheck = await request.get("/api/themes");
      expect(themeCheck.ok()).toBeTruthy();
      const themes = (await themeCheck.json()) as Array<{ id: string }>;
      expect(themes.some((t) => t.id === theme1.id)).toBeTruthy();

      const connCheck = await request.get("/api/connections");
      expect(connCheck.ok()).toBeTruthy();
      const connections = (await connCheck.json()) as Array<{ id: string }>;
      expect(connections.some((c) => c.id === conn1.id)).toBeTruthy();

    } finally {
      // Clean up created entities (reverse order to respect dependencies)
      for (const deleteUrl of [...deleteUrls].reverse()) {
        await request.delete(deleteUrl).catch(() => undefined);
      }
    }
  });
});
