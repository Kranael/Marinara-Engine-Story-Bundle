# General Fixes

## Profile import rejects backups containing chat-gallery JSON manifests

**Status:** Fixed
**Affected file:** `packages/server/src/services/import/profile-import-assets.ts`

### Symptom

Importing a profile backup (ZIP) fails with:

```
Profile import failed
Profile asset gallery/mari-images/manifest.json is not a supported image file.
```

The backup was exported by an older version of Marinara Engine and contains a
`manifest.json` inside a chat gallery directory. The export itself is correct —
the import refuses it.

### Root cause

The profile **export** collects every file under `gallery/` recursively, which
legitimately includes JSON metadata files that chat galleries keep next to their
media:

- `gallery/<chatId>/manifest.json` — per-chat gallery metadata
- `gallery/mari-images/manifest.json` — the Professor Mari preview gallery
  (`packages/server/src/services/mari-db/mari-images.service.ts`,
  `PREVIEW_CHAT_ID = "mari-images"`)

The profile **import** validates every asset via `validateProfileImportAsset()`.
For video-asset paths (`gallery/character-videos/`, `gallery/persona-videos/`,
`game-scene-videos/`, `conversation-call-character-videos/`) there was already a
`.json` exemption. But for all other `gallery/` paths,
`profileAssetImagePolicy()` returns an image policy, so every file — including
`manifest.json` — was run through `validateImageAssetFile()`, which rejects JSON
with "not a supported image file."

This is **not** related to Story Bundles. The failing file belongs to Professor
Mari's image-preview chat gallery.

### Fix

Added a `.json` exemption for `gallery/` paths in `validateProfileImportAsset()`,
mirroring the existing video-asset exemption:

```ts
// Chat galleries keep JSON manifests next to their media (for example
// gallery/<chatId>/manifest.json and gallery/mari-images/manifest.json for
// the Professor Mari preview gallery). Let metadata files through without
// image validation, mirroring the video-asset exemption above, so backups
// that include them import cleanly.
if (normalized.startsWith("gallery/") && /\.json$/iu.test(normalized)) return;
```

JSON files are pure metadata (served as `application/json`), not executable
content, so accepting them poses no security risk. HTML, JavaScript, and SVG
payloads under `gallery/` are still rejected by the existing image validation.

### Verification

- **New roundtrip test:** `tests/general/profile-roundtrip.test.ts` seeds 2+ of
  every entity type (characters, personas, lorebooks, presets, agents, themes,
  connections, chats + messages, story bundles), writes a
  `gallery/mari-images/manifest.json` into the data directory, exports the
  profile as ZIP, imports it back, and verifies all entities and file counts
  survive.
- Without the fix, the test fails with the **exact** reported error
  (`Profile asset gallery/mari-images/manifest.json is not a supported image
  file.`), proving it covers the bug.
- With the fix, the test passes.
- `pnpm check` (TypeScript + ESLint + build) passes.

### Note

The `profile-import-asset-security` regression has a pre-existing Windows-only
`EPERM` failure in its own descriptor race-safety section (line 133,
`renameSync` over an open file handle). It occurs identically with and without
this fix and is unrelated.
