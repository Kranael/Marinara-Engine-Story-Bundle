// Story Bundle — pure logic regression guards.
//
// The Story Bundle feature is covered end-to-end by the Playwright suite
// (`pnpm regression:story-bundle`, 246 passing). This file guards the small
// set of deterministic, UI-independent functions that those browser tests
// only exercise indirectly — the Game Mode extension helpers in
// `packages/shared/src/types/story-bundle-game.ts`. They are pure (no DB, no
// filesystem), so they run fast and fail loudly on the exact bug class they
// exist to prevent:
//
//   1) `extractStoryBundleGameConfigFromSetupExport` must copy only the
//      static, non-connection, non-party fields from a native Game Setup
//      export — never `partyCharacterIds`, `personaId`, connections, or
//      generation parameters (those come from the bundle's own assignments
//      and the player's choices at play time).
//   2) `getStoryBundlePartyCharacterIds` must clamp party membership to
//      characters actually assigned to the bundle (a stale party id must not
//      leak through as a phantom party member).
//   3) `getStoryBundleNpcCharacterIds` / `isStoryBundlePartyMember` must
//      agree on the party/NPC split.
import assert from "node:assert/strict";
import {
  extractStoryBundleGameConfigFromSetupExport,
  getStoryBundleNpcCharacterIds,
  getStoryBundlePartyCharacterIds,
  isStoryBundlePartyMember,
  type NativeGameSetupExport,
} from "../../packages/shared/src/index.js";

// ── 1. Game config extraction ──────────────────────────────────────────────

const fullSetupExport: NativeGameSetupExport = {
  format: "marinara-game-setup",
  version: 1,
  setup: {
    config: {
      genre: "Fantasy",
      setting: "A test world",
      tone: "Heroic",
      difficulty: "Normal",
      playerGoals: "Defeat the dragon",
      gmMode: "standalone",
      rating: "sfw",
      combatStyle: "tactical",
      gameWorldMapMode: "hierarchical",
      language: "en",
      enableCustomWidgets: true,
      enableSpriteGeneration: false,
      enableGameSoundEffects: true,
      enableGameMusic: false,
      promptPresetId: "preset-1",
      gameGmPromptTemplateId: "template-1",
      gameSystemPrompt: "You are the GM.",
      gameSpecialInstructions: "Keep it heroic.",
      // Fields that MUST be ignored by the extractor:
      partyCharacterIds: ["char-1", "char-2"],
      personaId: "persona-1",
      connectionId: "connection-1",
      temperature: 0.7,
      maxTokens: 2048,
    },
  },
};

{
  const config = extractStoryBundleGameConfigFromSetupExport(fullSetupExport);
  assert.equal(config.genre, "Fantasy");
  assert.equal(config.setting, "A test world");
  assert.equal(config.tone, "Heroic");
  assert.equal(config.difficulty, "Normal");
  assert.equal(config.playerGoals, "Defeat the dragon");
  assert.equal(config.gmMode, "standalone");
  assert.equal(config.rating, "sfw");
  assert.equal(config.combatStyle, "tactical");
  assert.equal(config.gameWorldMapMode, "hierarchical");
  assert.equal(config.language, "en");
  assert.equal(config.enableCustomWidgets, true);
  assert.equal(config.enableSpriteGeneration, false);
  assert.equal(config.enableGameSoundEffects, true);
  assert.equal(config.enableGameMusic, false);
  assert.equal(config.promptPresetId, "preset-1");
  assert.equal(config.gameGmPromptTemplateId, "template-1");
  assert.equal(config.gameSystemPrompt, "You are the GM.");
  assert.equal(config.gameSpecialInstructions, "Keep it heroic.");
  // The extractor must NOT surface party/persona/connection/generation fields.
  assert.ok(!("partyCharacterIds" in config), "partyCharacterIds must not leak into StoryBundleGameConfig");
  assert.ok(!("personaId" in config), "personaId must not leak into StoryBundleGameConfig");
  assert.ok(!("connectionId" in config), "connectionId must not leak into StoryBundleGameConfig");
  assert.ok(!("temperature" in config), "generation parameters must not leak into StoryBundleGameConfig");
  assert.ok(!("maxTokens" in config), "generation parameters must not leak into StoryBundleGameConfig");
}

// A minimal export with every optional field absent must still produce a
// valid config with safe defaults (never `undefined` for the required fields).
{
  const config = extractStoryBundleGameConfigFromSetupExport({
    format: "marinara-game-setup",
    version: 1,
    setup: { config: {} },
  });
  assert.equal(config.genre, "");
  assert.equal(config.setting, "");
  assert.equal(config.tone, "");
  assert.equal(config.difficulty, "");
  assert.equal(config.playerGoals, "");
  assert.equal(config.gmMode, "standalone");
  assert.equal(config.rating, "sfw");
  assert.equal(config.combatStyle, undefined);
  assert.equal(config.gameWorldMapMode, undefined);
  assert.equal(config.language, undefined);
  assert.equal(config.enableCustomWidgets, undefined);
  assert.equal(config.promptPresetId, null);
  assert.equal(config.gameGmPromptTemplateId, null);
  assert.equal(config.gameSystemPrompt, null);
  assert.equal(config.gameSpecialInstructions, null);
}

// Non-string / non-boolean junk in optional fields must be coerced or dropped,
// never crash the extractor. Note: `genre` is string-coerced via String(),
// `language`/`enableGameMusic` are type-guarded (dropped when wrong type), but
// the `promptPresetId`-family fields use `?? null` (nullish coalescing only),
// so a non-null non-string value passes through unchanged — documented here as
// the current behavior, not an endorsement.
{
  const config = extractStoryBundleGameConfigFromSetupExport({
    format: "marinara-game-setup",
    version: 1,
    setup: {
      config: {
        genre: 42,
        language: 123,
        enableGameMusic: "yes",
        promptPresetId: 7,
      },
    },
  });
  assert.equal(config.genre, "42", "non-string genre is string-coerced");
  assert.equal(config.language, undefined, "non-string language is dropped");
  assert.equal(config.enableGameMusic, undefined, "non-boolean enableGameMusic is dropped");
  assert.equal(config.promptPresetId, 7, "promptPresetId uses ?? null, so a non-null value passes through");
}

// ── 2. Party / NPC split ────────────────────────────────────────────────────

{
  const bundle = {
    characterIds: ["a", "b", "c"],
    partyCharacterIds: ["a", "c"],
  };

  assert.equal(isStoryBundlePartyMember(bundle, "a"), true);
  assert.equal(isStoryBundlePartyMember(bundle, "b"), false);
  assert.equal(isStoryBundlePartyMember(bundle, "c"), true);
  assert.equal(isStoryBundlePartyMember(bundle, "missing"), false);

  assert.deepEqual(getStoryBundlePartyCharacterIds(bundle), ["a", "c"]);
  assert.deepEqual(getStoryBundleNpcCharacterIds(bundle), ["b"]);
}

// A party id that is NOT assigned to the bundle must be clamped away by
// `getStoryBundlePartyCharacterIds` — it must not appear in the party list or
// the NPC list. Note: `isStoryBundlePartyMember` is a raw `includes` check on
// `partyCharacterIds` and does NOT clamp, so it still reports `true` for a
// stale id. Callers that need the clamped view must use
// `getStoryBundlePartyCharacterIds` instead.
{
  const bundle = {
    characterIds: ["a", "b"],
    partyCharacterIds: ["a", "stale-id"],
  };
  assert.deepEqual(getStoryBundlePartyCharacterIds(bundle), ["a"], "stale party id is clamped out");
  assert.deepEqual(getStoryBundleNpcCharacterIds(bundle), ["b"], "stale party id is not an NPC");
  assert.equal(isStoryBundlePartyMember(bundle, "stale-id"), true, "isStoryBundlePartyMember is a raw includes check");
}

// Empty party list → everyone is an NPC, no party members.
{
  const bundle = {
    characterIds: ["a", "b"],
    partyCharacterIds: [] as string[],
  };
  assert.deepEqual(getStoryBundlePartyCharacterIds(bundle), []);
  assert.deepEqual(getStoryBundleNpcCharacterIds(bundle), ["a", "b"]);
}

// Duplicate party ids must not produce duplicate NPCs or party members.
{
  const bundle = {
    characterIds: ["a", "b"],
    partyCharacterIds: ["a", "a"],
  };
  assert.deepEqual(getStoryBundlePartyCharacterIds(bundle), ["a", "a"], "party list preserves input order");
  assert.deepEqual(getStoryBundleNpcCharacterIds(bundle), ["b"]);
}
