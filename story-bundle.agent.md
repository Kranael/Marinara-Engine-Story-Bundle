# story-bundle.agent.md

> Agent context file for the **Story Bundle** feature. Contains all files and
> conventions needed to understand and extend it — so you don't have to
> re-search the repo every time.
> Branch: `story-bundle-dev` · Feature doc: `docs/story-bundle/story-bundle-overview.md`

## 1. Repo Architecture in 30 Seconds

pnpm monorepo with three packages. Every entity follows exactly this chain:

```
packages/shared   → types + Zod schemas (imported as "@marinara-engine/shared")
packages/server   → Fastify + file-native JSON tables (fileTable) + REST routes
packages/client   → React 19 + TanStack Query + Zustand + Tailwind v4 + i18next
```

New field/feature = always touch all three layers + barrel exports + en.json.

## 2. Feature Files (Story Bundle Itself)

| File | Role |
|---|---|
| `packages/shared/src/types/story-bundle.ts` | Interfaces `StoryBundle { id, name, description, imagePath, avatarCrop, comment, creator, version, tags, characterIds, personaIds, lorebookIds, presetIds, agentIds, scenarios, createdAt, updatedAt }` + `StoryBundleScenario { id, title, openingMessage, imagePath?, avatarCrop? }` |
| `packages/shared/src/schemas/story-bundle.schema.ts` | Zod: `storyBundleIdParamsSchema`, `storyBundleScenarioSchema`, `createStoryBundleSchema` (name trim min1 max200, all other fields optional), `updateStoryBundleSchema` (all fields optional) |
| `packages/shared/src/index.ts` | Barrel — both export lines must stay |
| `packages/server/src/db/schema/story-bundles.ts` | `fileTable("story_bundles", …)` |
| `packages/server/src/db/file-backed-store.ts` | `"story_bundles"` in `FILE_BACKED_TABLES` (registration, else `Unsupported table`) |
| `packages/server/src/db/story-bundle-scenario-migration.ts` | `migrateLegacyStoryBundleScenariosRow()` — converts legacy `intros` (`name`/`text`) rows to `scenarios` (`title`/`openingMessage`) on read |
| `packages/server/src/services/storage/story-bundles.storage.ts` | `createStoryBundlesStorage(db)`: list/getById/create/update/remove |
| `packages/server/src/routes/story-bundles.routes.ts` | REST under `/api/story-bundles` (GET/POST/PATCH/DELETE) + image endpoints (`POST/DELETE /:id/image`, `GET /images/file/:filename`) + `GET /:id/export` (`.storybundle` ZIP) + `POST /import-archive` (multipart `.storybundle` upload) |
| `packages/server/src/services/export/story-bundle-archive.ts` | `.storybundle` ZIP builder: `gatherBundleArchiveSources()` (DB/disk → plain description) + `packBundleArchive()` (streams description into a ZIP via `archiver`) + `buildBundleArchive()` (gather + optimize + pack) |
| `packages/server/src/services/export/story-bundle-asset-optimizer.ts` | `optimizeArchiveImages()` — re-encodes large images (e.g. WebP) before packing |
| `packages/server/src/services/import/story-bundle-archive-import.ts` | `.storybundle` ZIP unpacker + bootstrapper: `unpackBundleArchive()` (safe extract + read `manifest.json`) + `unpackAndBootstrapBundle()` (insert entities, map `isPartyMember` → `partyCharacterIds`, create the bundle row) |
| `packages/client/src/hooks/use-story-bundles.ts` | `storyBundleKeys` + query/mutation hooks (incl. image upload/remove) |
| `packages/client/src/hooks/use-story-bundle-actions.ts` | `useStoryBundleActions()` — shared `play` (RP), `exportBundle`, `remove` + busy state (`playingId`, `exportingId`); used by panel, gallery, and editor |
| `packages/client/src/components/panels/StoryBundlesPanel.tsx` | List panel (right side) — toolbar with Gallery/Import/New buttons; rows have export + delete only (no Play) |
| `packages/client/src/components/story-bundles/StoryBundleGalleryView.tsx` | Full-page overlay gallery (search, sort, cards, detail card, CONVO/RP/GM mode buttons, edit/export/delete) |
| `packages/client/src/components/story-bundles/StoryBundleEditor.tsx` | Full-page editor (detail view) — shell with tab rail; header mode buttons CONVO / RP / GM (GM disabled "Coming soon"); Play uses the current draft state |
| `packages/client/src/components/story-bundles/StoryBundleMetadata.tsx` | Metadata tab (avatar/image upload, bundle ID, name, comment, creator, version, tags) |
| `packages/client/src/components/story-bundles/StoryBundleDescription.tsx` | Description tab (HTML description with preview toggle) |
| `packages/client/src/components/story-bundles/StoryBundleCharacters.tsx` | Characters tab (search/random/load-more, groups dropdown, selected list) |
| `packages/client/src/components/story-bundles/StoryBundlePersonas.tsx` | Personas tab (single-select persona picker with avatar-crop support) |
| `packages/client/src/components/story-bundles/StoryBundleLorebooks.tsx` | Lorebooks tab (search/random/load-more, selected list; no groups) |
| `packages/client/src/components/story-bundles/StoryBundlePresets.tsx` | Presets tab (search/random/load-more, selected list; no groups) |
| `packages/client/src/components/story-bundles/StoryBundleAgents.tsx` | Agents tab (search/random/load-more, selected list; no groups) |
| `packages/client/src/components/story-bundles/StoryBundleScenarios.tsx` | Scenarios tab (inline scenarios: title + opening message + optional image, add/edit/delete) |
| `packages/client/src/lib/app-dialogs.ts` | `showScenarioDialog(options)` + `CUSTOM_SCENARIO_CHOICE_PREFIX` — scenario picker with optional Custom Scenario free-text |
| `packages/client/src/lib/story-bundle-html.ts` | `sanitizeStoryBundleDescription()` — DOMPurify sanitization for gallery/description HTML |
| `packages/shared/src/types/story-bundle-manifest.ts` | `.storybundle` ZIP manifest types: `BundleManifest`, `BundleManifestCharacter`, `BundleManifestScenario`, `BundleManifestAgentRef`, `BUNDLE_MANIFEST_FORMAT` (`"marinara-story-bundle-zip"`), `BUNDLE_MANIFEST_VERSION` (`1`) |
| `packages/shared/src/types/story-bundle-game.ts` | Game Mode extension: `StoryBundleGameModeFields { partyCharacterIds, gameConfig, gameAssetSelection }`, `StoryBundleGameConfig`, `StoryBundleAssetSelection`, party/NPC helpers, `extractStoryBundleGameConfigFromSetupExport()` |
| `packages/server/src/services/import/marinara.importer.ts` | `importStoryBundle()` — dead legacy `.marinara.json` import handler (never released; the UI no longer routes here) |
| `tests/story-bundle/helpers/story-bundle-fixture.ts` | Test helper: `importStoryBundleFixture()`, `buildStoryBundleEnvelope()` |
| `tests/story-bundle/helpers/story-bundle-api.ts` | Test helper: `StoryBundleAPI` class (create/delete/import/export) |
| `tests/story-bundle/helpers/fresh-client.ts` | Test helper: `prepareFreshClient()` (client state before each test) |
| `tests/story-bundle/data/*.json` | Fixture files (empty, with-description, with-characters, with-personas, with-lorebooks, full) |
| `tests/story-bundle/data/test-data.html` | HTML test data for the description preview |
| `tests/story-bundle/tests/*.test.ts` | Playwright e2e tests (panel, editor, metadata, description, pickers, scenarios, play, gallery, import/export) |
| `tests/story-bundle/pages/*.page.ts` | Page objects for panel, dialogs, editor shell, gallery, and each tab |

Interfaces:

```ts
export interface StoryBundle {
  id: string;
  name: string;
  description: string | null;
  imagePath: string | null;
  avatarCrop?: AvatarCrop | null;
  comment: string;
  creator: string;
  version: string;
  tags: string[];
  characterIds: string[];
  personaIds: string[];      // max 1
  lorebookIds: string[];
  presetIds: string[];       // Prompt-Presets (max 1)
  agentIds: string[];
  scenarios: StoryBundleScenario[]; // renamed from `intros`; auto-migrated on read
  partyCharacterIds: string[];      // subset of characterIds who join the party; rest are NPCs
  gameConfig: StoryBundleGameConfig | null;         // frozen Game Mode setup metadata
  gameAssetSelection: StoryBundleAssetSelection | null; // game-asset folder scope
  createdAt: string;
  updatedAt: string;
}

export interface StoryBundleScenario {
  id: string;
  title: string;
  openingMessage: string;
  imagePath?: string | null;   // served image URL, scenario thumbnail/card art
  avatarCrop?: AvatarCrop | null;
}
```

> **Rename note:** the `intros` field (`StoryBundleIntro { id, name, text }`) was
> renamed to `scenarios` (`StoryBundleScenario { id, title, openingMessage, … }`).
> `migrateLegacyStoryBundleScenariosRow()` converts legacy `intros` rows to
> `scenarios` on read, and the importer accepts both fields — so existing bundles
> and older exports keep their content.

## 3. Touched Infrastructure Files (Wiring)

| File | What lives there for the feature |
|---|---|
| `packages/server/src/db/schema/index.ts` | `export * from "./story-bundles.js";` |
| `packages/server/src/db/file-backed-store.ts` | `"story_bundles"` in `FILE_BACKED_TABLES` |
| `packages/server/src/routes/index.ts` | `app.register(storyBundlesRoutes, { prefix: "/api/story-bundles" })` |
| `packages/client/src/stores/ui.store.ts` | Panel type `"story-bundles"`, `storyBundleDetailId`, `openStoryBundleDetail`/`closeStoryBundleDetail`, mutual exclusion in all `open*Detail` actions (`storyBundleDetailId: null`), `hasAnyDetailOpen`, `closeAllDetails`; **gallery state**: `storyBundleGalleryOpen`, `storyBundleGallerySelectedId`, `storyBundleGallerySort`, `storyBundleGalleryScrollTop` + `openStoryBundleGallery`/`closeStoryBundleGallery`/`setStoryBundleGallerySelectedId`/`setStoryBundleGallerySort`/`setStoryBundleGalleryScrollTop` |
| `packages/client/src/components/layout/AppShell.tsx` | Lazy import `StoryBundleEditor` + `detailView` chain (`storyBundleDetailId ? <StoryBundleEditor />`); lazy import `StoryBundleGalleryView` + `storyBundleGalleryOpen ? <StoryBundleGalleryView />` |
| `packages/client/src/components/layout/RightPanel.tsx` | Lazy import `StoryBundlesPanel` + `PANEL_CONFIG["story-bundles"]` + `PANELS["story-bundles"]` |
| `packages/client/src/components/layout/TopBar.tsx` | `RightPanelButtonPanel` union, `RIGHT_PANEL_BUTTONS` entry, `panelContextActive["story-bundles"]`, `!storyBundleDetailId` in `isHomeActive`, `storyBundleGalleryOpen` in the active-state checks |
| `packages/client/src/styles/globals.css` | `.mari-panel-gradient--story-bundles` (pink `#f472b6` → violet `#a855f7`) + `.mari-description-preview` (HTML preview styling) |
| `packages/client/src/localization/locales/en.json` | `navigation.topbar.storyBundles` + `storyBundles.*` block + `storyBundles.metadata.*` sub-block (see `story-bundle.technical.md` § 4 Localization for the full key list) |

## 4. Reference Files: How Other Entities Do It

For extensions, read these neighbors as templates:

- **Schema:** `packages/server/src/db/schema/lorebooks.ts`, `regex-scripts.ts`
- **Storage:** `packages/server/src/services/storage/regex-scripts.storage.ts`, `library-folders.storage.ts`
- **Routes:** `packages/server/src/routes/regex-scripts.routes.ts`, `library-folders.routes.ts`
- **Hooks:** `packages/client/src/hooks/use-regex-scripts.ts`, `use-lorebooks.ts`
- **Panel:** `packages/client/src/components/panels/LorebooksPanel.tsx`, `PersonasPanel.tsx`
- **Editor:** `packages/client/src/components/personas/PersonaEditor.tsx`, `presets/PresetEditor.tsx`, `lorebooks/LorebookEditor.tsx`

## 5. Important Infrastructure (Always Reuse, Never Rebuild)

| File | Purpose |
|---|---|
| `packages/server/src/lib/logger.ts` | Pino `logger` — mandatory in server code, `console.*` forbidden |
| `packages/server/src/utils/id-generator.ts` | `newId()` (nanoid), `now()` (ISO) |
| `packages/server/src/db/connection.ts` | `DB` type (`export type DB = FileNativeDB`) |
| `packages/server/src/db/file-schema.ts` | `fileTable`, `text`, column definitions |
| `packages/server/src/db/file-query.ts` | Query builder: `db.select().from(t).where(eq(col, v)).orderBy(col)` |
| `packages/client/src/lib/app-dialogs.ts` | `showConfirmDialog({ title, message, confirmLabel, cancelLabel, tone })` — **options object, no positional args**; tone: `"default" \| "destructive" \| "accent"` |
| `packages/client/src/localization/use-localized-ui-text.ts` | `useLocalizedUiText()` maps English text → en.json key (`findEnglishMessageKey`) |
| `packages/client/src/lib/utils.ts` | `cn()` (class merge) |
| `packages/client/.instructions.md` | **Required reading before any client change** |

## 6. Conventions & Pitfalls

- **Logging (server):** `logger.error(err, "Msg")` (error first), format specifiers: `logger.info("Resolved %d agents", n)`. New prompt/generation routes need debug logging (`logDebugOverride` or similar).
- **i18n:** New UI text → semantic keys in `en.json` (sort alphabetically). Maintain English only; other locales stay partial (fallback). Before shipping: `pnpm localization:check`.
- **TopBar labels** go through `useLocalizedUiText()` — the English label text therefore needs an en.json key (here: `navigation.topbar.storyBundles`).
- **Detail surfaces are mutually exclusive:** every new `open*Detail` action must set all other detail IDs to `null` in `ui.store.ts` (and vice versa) + be added to `hasAnyDetailOpen`, `closeAllDetails`, `requestChatModeShortcut`.
- **Register new tables:** every new `fileTable` must be added to `FILE_BACKED_TABLES` (`packages/server/src/db/file-backed-store.ts`), otherwise the file store throws `Unsupported table: <name>` on every insert/select (exactly what happened on the first story-bundle create — the error only surfaced on the actual API call, not at server start).
- **Cascade rules:** when a table references another via FK, a cascade rule must be added to `CASCADES` (`file-backed-store.ts`) so deleting the parent also deletes child rows.
- **Styling:** only CSS variables (`var(--border)`, `var(--card)`, `var(--destructive)` …) + `mari-panel-gradient-surface mari-panel-gradient--<name>`; no hard-coded hex colors outside `globals.css`.
- **data-testid:** every new component/interactive element gets one; catalog in `story-bundle.technical.md` § 5.
- **Test files:** Playwright e2e tests live in `tests/story-bundle/tests/` and are versioned via a `.gitignore` exception (`!tests/**/*.test.ts`). Page objects in `tests/story-bundle/pages/`. New tests follow the existing pattern (page object + data-testid + `prepareFreshClient`).
- **Editor draft state:** the editor keeps a local draft (`presetIds`, `characterIds`, …) synced from the loaded bundle via `useLayoutEffect`. Play reads the draft, not the server state — keep it that way so unsaved changes are honored when playing.
- **Branches:** changes against `staging`, not `main` (currently working on `story-bundle-dev`).
- **Never check PR checkboxes**; list manual verification explicitly.

## 7. Commands

```bash
pnpm install              # once / after lockfile changes
pnpm check                # baseline validation: TS + ESLint + localization + build
pnpm localization:check   # localization only
pnpm version:check        # only for version/release metadata
pnpm regression:story-bundle  # all story-bundle Playwright tests (desktop + mobile)
pnpm run manual-validation:story-bundle  # visible Chrome, one test at a time, 1.5s slow-mo per action
```

PowerShell: chain commands with `;`, never with `&&`.

## 8. Extension Checklist (Next Iteration, e.g. New Fields)

1. `packages/shared`: extend interface + Zod schema (keep the update schema optional).
2. `packages/server`: add columns to the `fileTable`, adjust storage methods (register new tables in `FILE_BACKED_TABLES` too).
3. `packages/client`: create a new tab component (pattern: `StoryBundleCharacters.tsx` / `StoryBundlePresets.tsx`), import it in `StoryBundleEditor.tsx` and add it to the TABS array + rendering, add hooks for data loading.
4. Add `en.json` keys (sort alphabetically).
5. `pnpm check` green, assign new `data-testid`s, update `docs/story-bundle/story-bundle-overview.md` + this file.
6. Commit on the feature branch.

## 9. Tab Component Pattern

Every new tab in the StoryBundleEditor follows this pattern (see `StoryBundleCharacters.tsx` / `StoryBundlePresets.tsx`):

- **Props interface**: `ids: string[]`, `onIdsChange: (ids: string[]) => void`, `items: T[]`, `folders: Folder[]`, `validIds: Set<string>`
- **Three sections**: (1) Add Items — search field + random button + paginated list with plus buttons, (2) Groups — dropdown + add button, (3) Selected Items — list with remove buttons
- **Empty states**: dashed border box with i18n text
- **Pagination**: `ITEM_PICKER_PAGE_SIZE = 20`, local `useState` limit, "Load more" button
- **data-testid**: `story-bundle-editor-<tabname>`, `story-bundle-editor-<tabname>-search`, `story-bundle-editor-<tabname>-random`, `story-bundle-editor-<tabname>-load-more`, `story-bundle-editor-<tabname>-empty`, `story-bundle-editor-<tabname>-group-select`, `story-bundle-editor-<tabname>-add-group`
- **Lorebooks/Presets/Agents tabs**: no Groups section (those entities have no folder groups). Only two sections: Add + Selected.
- **Personas tab**: single-select — picking a persona replaces the previous one.
- **Scenarios tab** (`StoryBundleScenarios.tsx`): inline 1:n data, no references to other entities. Pattern: "Add Scenario" button opens an inline form (title input + opening-message textarea + optional image upload with crop), saving creates/updates a scenario in the draft's `scenarios` array; the selected list shows title + message preview + optional image with edit/delete buttons. No search/random/pagination.

## 10. Import/Export Pattern (`.storybundle` ZIP)

Story Bundles export and import as a **`.storybundle` ZIP archive** — not the
legacy `.marinara.json` base64 JSON envelope. The old single-JSON format
embedded every avatar/sprite/gallery image as base64 inside one JSON string
(~33% size penalty) and crashed on large bundles (Node's ~512 MB max string
length). The ZIP format stores every binary as a raw, unencoded archive entry
and keeps `manifest.json` text-only.

### Archive layout

```
manifest.json                 — metadata, game config, isPartyMember flags (text only)
cover.<ext>                   — optional bundle picture
characters/<id>/card.json     — character card data (text)
characters/<id>/avatar.<ext>  — optional
characters/<id>/sprites/*     — optional
characters/<id>/gallery/*     — optional images + gallery.json metadata
personas/<id>/persona.json, avatar.<ext>, sprites/*, gallery/*
lorebooks/<id>/lorebook.json  — { lorebook, entries, folders }
presets/<id>/preset.json      — { preset, sections, groups, choiceBlocks }
scenarios/<id>.<ext>          — optional scenario images
```

`manifest.json` is the only JSON read into memory up front on import; every
binary is a raw zip entry read one at a time. `format` is
`"marinara-story-bundle-zip"`, `version` is `1`.

### Export

- **Route**: `GET /api/story-bundles/:id/export` → streams a ZIP via
  `reply.hijack()`, `Content-Type: application/octet-stream`,
  `Content-Disposition: attachment; filename="<name>.storybundle"`.
- **Builder** (`services/export/story-bundle-archive.ts`), split in two layers:
  - `gatherBundleArchiveSources(bundleId, db)` — the only part that touches the
    DB/filesystem; returns a plain `BundleArchiveSources { manifest, files, texts }`.
  - `packBundleArchive(sources, destination)` — streams that description into a
    ZIP via `archiver` (zlib level 9); binary files are STOREd verbatim (no
    benefit re-deflating already-compressed images), text/JSON entries are
    DEFLATEd at max compression. Never touches the DB.
  - `buildBundleArchive()` = gather + `optimizeArchiveImages()` (asset optimizer
    re-encodes large images, e.g. WebP) + pack.
- **Agents** are referenced by id only (never embedded) — they ship via
  capability packages. The manifest carries `{ id, name }` pairs resolved from
  built-in agent manifests or the installed agent config.
- **Presets** strip `parameters` and `systemKey` before export (same fields the
  repo's own preset exporter strips) so a re-import can't claim Engine-owned
  stock presets or carry sampler/API-key-shaped overrides.

### Import

- **Route**: `POST /api/story-bundles/import-archive` (multipart upload). The
  upload streams straight to a temp file (never buffered as one JS value), then
  unpacks + bootstraps it.
- **Unpacker** (`services/import/story-bundle-archive-import.ts`), split in two
  layers:
  - `unpackBundleArchive(zipFilePath)` — safely extracts the ZIP to a temp dir
    (zip-slip guard rejects `..`/absolute/symlink entries; zip-bomb guard caps
    entry count at 20 000 and expanded size at 4 GB) and reads only
    `manifest.json` into memory.
  - `unpackAndBootstrapBundle(archivePath, db)` — inserts
    characters/personas/lorebooks/presets, maps `isPartyMember` →
    `partyCharacterIds`, and creates the `StoryBundle` row.
- **Deduplication**: import deduplicates by name (case-insensitive) — existing
  characters/personas/lorebooks/presets are skipped, only new ones are created.
- **Binary restore**: avatars/sprites/gallery are read one small, size-bounded
  file at a time and bridged into the existing restore pipeline via
  `fileToDataUrl()` (never the whole archive at once).
- **Scenarios** are inline data in the manifest — parsed and validated with new
  IDs generated for each; older exports carrying the legacy `intros` field
  (`name`/`text`) are accepted and migrated.
- **Referenced agents** that are not installed are surfaced in the import dialog
  with an install option for the providing capability package.

### Legacy format (never released — no backward compatibility)

The old `.marinara.json` envelope (`type: "marinara_story_bundle"`, base64 JSON)
was never released — it was only used during development. There is **no
backward compatibility** for it. Import accepts **only** `.storybundle` ZIP
archives via `POST /api/story-bundles/import-archive`; the import dialog
rejects anything else. The dead `importStoryBundle()` handler in
`services/import/marinara.importer.ts` and the `"marinara_story_bundle"` value
in `ExportType` are leftovers and should not be treated as a supported path.

### Test helpers

- `importStoryBundleFixture(page, filePath)` in
  `tests/story-bundle/helpers/story-bundle-fixture.ts` imports a fixture and
  returns the created `StoryBundle`.
- `buildStoryBundleEnvelope(input)` builds an envelope inline (for programmatic
  tests).
- `StoryBundleAPI` in `tests/story-bundle/helpers/story-bundle-api.ts` offers
  create/delete/import/export.
- Fixtures: `tests/story-bundle/data/` contains JSON files in various states
  (empty, with-description, with-characters, with-personas, with-lorebooks,
  full).
