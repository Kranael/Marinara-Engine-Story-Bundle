# story-bundle.agent.md

> Agent-Kontextdatei für das **Story-Bundle**-Feature. Enthält alle Dateien und
> Konventionen, die man zum Verständnis und zur Weiterentwicklung braucht —
> damit man das Repo nicht jedes Mal neu durchsuchen muss.
> Branch: `story-bundle-dev` · Feature-Doku: `story-bundle.md`

## 1. Repo-Architektur in 30 Sekunden

pnpm-Monorepo mit drei Paketen. Jede Entität folgt exakt dieser Kette:

```
packages/shared   → Typen + Zod-Schemas (importiert als "@marinara-engine/shared")
packages/server   → Fastify + File-Native-JSON-Tabellen (fileTable) + REST-Routen
packages/client   → React 19 + TanStack Query + Zustand + Tailwind v4 + i18next
```

Neues Feld/Feature = immer alle drei Schichten + Barrel-Exports + en.json anfassen.

## 2. Feature-Dateien (Story Bundle selbst)

| Datei | Rolle |
|---|---|
| `packages/shared/src/types/story-bundle.ts` | Interface `StoryBundle { id, name, description, characterIds, personaIds, lorebookIds, presetIds, intros, createdAt, updatedAt }` + `StoryBundleIntro { id, name, text }` |
| `packages/shared/src/schemas/story-bundle.schema.ts` | Zod: `storyBundleIdParamsSchema`, `storyBundleIntroSchema`, `createStoryBundleSchema` (name trim min1 max200, description + characterIds + personaIds + lorebookIds + presetIds + intros optional), `updateStoryBundleSchema` (name + description + characterIds + personaIds + lorebookIds + presetIds + intros optional) |
| `packages/shared/src/index.ts` | Barrel — beide Exportzeilen müssen drin bleiben |
| `packages/server/src/db/schema/story-bundles.ts` | `fileTable("story_bundles", …)` |
| `packages/server/src/db/file-backed-store.ts` | `"story_bundles"` in `FILE_BACKED_TABLES` (Registrierung, sonst `Unsupported table`) |
| `packages/server/src/services/storage/story-bundles.storage.ts` | `createStoryBundlesStorage(db)`: list/getById/create/update/remove |
| `packages/server/src/routes/story-bundles.routes.ts` | REST unter `/api/story-bundles` (GET/POST/PATCH/DELETE) + `GET /:id/export` |
| `packages/client/src/hooks/use-story-bundles.ts` | `storyBundleKeys` + Query-/Mutations-Hooks |
| `packages/client/src/components/panels/StoryBundlesPanel.tsx` | Listen-Panel (rechts) |
| `packages/client/src/components/story-bundles/StoryBundleEditor.tsx` | Vollseiten-Editor (Detailansicht) — Shell mit Tab-Rail, Auto-Snapshot bei Save |
| `packages/client/src/components/story-bundles/StoryBundleMetadata.tsx` | Metadata-Tab (Avatar/Image-Upload, Bundle-ID, Name, Comment, Creator, Version, Tags, Version-History-Panel mit Auto-Snapshot) |
| `packages/client/src/components/story-bundles/StoryBundleDescription.tsx` | Description-Tab (nur HTML-Description mit Preview-Toggle; Name wurde in Metadata-Tab verschoben) |
| `packages/client/src/components/story-bundles/StoryBundleCharacters.tsx` | Characters-Tab (Suche/Random/Load-More, Groups-Dropdown, Selected-Liste) |
| `packages/client/src/components/story-bundles/StoryBundlePersonas.tsx` | Personas-Tab (gleiches Muster wie Characters, mit Avatar-Crop-Support) |
| `packages/client/src/components/story-bundles/StoryBundleLorebooks.tsx` | Lorebooks-Tab (Suche/Random/Load-More, Selected-Liste; keine Groups) |
| `packages/client/src/components/story-bundles/StoryBundlePresets.tsx` | Presets-Tab (Suche/Random/Load-More, Selected-Liste; keine Groups) |
| `packages/client/src/components/story-bundles/StoryBundleIntros.tsx` | Intros-Tab (Inline-Intros: Name + Text, Add/Edit/Delete) |
| `packages/shared/src/types/export.ts` | `ExportType` um `"marinara_story_bundle"` erweitert |
| `packages/server/src/services/import/marinara.importer.ts` | `importStoryBundle()` — Import-Handler + `case` im Switch |
| `packages/server/src/services/export/export-image-helpers.ts` | Shared Image-Helper: `readAvatarDataUrl()`, `readSpritesForId()`, `readGalleryForCharacter()` |
| `tests/story-bundle/helpers/story-bundle-fixture.ts` | Test-Helper: `importStoryBundleFixture()`, `buildStoryBundleEnvelope()` |
| `tests/story-bundle/helpers/story-bundle-api.ts` | Test-Helper: `StoryBundleAPI`-Klasse (create/delete/import/export) |
| `tests/story-bundle/helpers/fresh-client.ts` | Test-Helper: `prepareFreshClient()` (Client-State vor Test) |
| `tests/story-bundle/data/*.json` | Fixture-Dateien (empty, with-description, with-characters, with-personas, with-lorebooks, full) |
| `tests/story-bundle/data/test-data.html` | HTML-Testdaten für Description-Preview |
| `packages/shared/src/types/story-bundle-version.ts` | Interface `StoryBundleVersion { id, storyBundleId, name, description, comment, creator, version, tags, source, createdAt }` |
| `packages/shared/src/schemas/story-bundle-version.schema.ts` | Zod: `createStoryBundleVersionSchema` (name + description + comment + creator + version + tags + source) |
| `packages/server/src/db/schema/story-bundle-versions.ts` | `fileTable("story_bundle_versions", …)` |
| `packages/server/src/services/storage/story-bundle-versions.storage.ts` | `createStoryBundleVersionsStorage(db)`: listByBundleId/create/deleteByBundleId |
| `packages/server/src/routes/story-bundle-versions.routes.ts` | REST unter `/api/story-bundles/:id/versions` (GET/POST) + `DELETE /:versionId` |
| `packages/client/src/hooks/use-story-bundle-versions.ts` | `storyBundleVersionKeys` + Query-/Mutations-Hooks (useStoryBundleVersions, useCreateStoryBundleVersion, useDeleteStoryBundleVersion) |
| `tests/story-bundle/tests/story-bundle.test.ts` | Playwright-e2e-Tests (CRUD, Import/Export, Description-Tab) |
| `tests/story-bundle/tests/story-bundle-editor.test.ts` | Playwright-e2e-Tests für Editor-Shell |
| `tests/story-bundle/pages/story-bundle-editor.page.ts` | Page Object für Editor-Shell (inkl. Tab-Navigation) |
| `tests/story-bundle/pages/story-bundle-description-tab.page.ts` | Page Object für Description-Tab |
| `tests/story-bundle/tests/story-bundle-intro.test.ts` | Playwright-e2e-Tests für Intros-Tab |
| `tests/story-bundle/pages/story-bundle-intros-tab.page.ts` | Page Object für Intros-Tab |
| `tests/story-bundle/tests/story-bundle-metadata.test.ts` | Playwright-e2e-Tests für Metadata-Tab (14 Tests) |
| `tests/story-bundle/pages/story-bundle-metadata-tab.page.ts` | Page Object für Metadata-Tab |

## 3. Angefasste Infrastruktur-Dateien (Wiring)

| Datei | Was dort für das Feature steckt |
|---|---|
| `packages/server/src/db/schema/index.ts` | `export * from "./story-bundles.js";` + `export * from "./story-bundle-versions.js";` |
| `packages/server/src/db/file-backed-store.ts` | `"story_bundles"` + `"story_bundle_versions"` in `FILE_BACKED_TABLES`; Cascade-Regel in `CASCADES`: `story_bundles` → `story_bundle_versions` (DELETE) |
| `packages/server/src/routes/index.ts` | `app.register(storyBundlesRoutes, { prefix: "/api/story-bundles" })` + `app.register(storyBundleVersionsRoutes, { prefix: "/api/story-bundles" })` |
| `packages/client/src/stores/ui.store.ts` | Panel-Typ `"story-bundles"`, `storyBundleDetailId`, `openStoryBundleDetail`/`closeStoryBundleDetail`, Gegenseitiger-Ausschluss in allen `open*Detail`-Aktionen (`storyBundleDetailId: null`), `hasAnyDetailOpen`, `closeAllDetails` |
| `packages/client/src/components/layout/AppShell.tsx` | Lazy-Import `StoryBundleEditor` + `detailView`-Kette (`storyBundleDetailId ? <StoryBundleEditor />`) |
| `packages/client/src/components/layout/RightPanel.tsx` | Lazy-Import `StoryBundlesPanel` + `PANEL_CONFIG["story-bundles"]` + `PANELS["story-bundles"]` |
| `packages/client/src/components/layout/TopBar.tsx` | `RightPanelButtonPanel`-Union, `RIGHT_PANEL_BUTTONS`-Eintrag, `panelContextActive["story-bundles"]`, `!storyBundleDetailId` in `isHomeActive` |
| `packages/client/src/styles/globals.css` | `.mari-panel-gradient--story-bundles` (Pink `#f472b6` → Violett `#a855f7`) + `.mari-description-preview` (HTML-Vorschau-Styling) |
| `packages/client/src/localization/locales/en.json` | `navigation.topbar.storyBundles` + Block `storyBundles.*` (inkl. add, addCharacters, addFromGroup, addIntros, addLorebooks, addPersonas, addPresets, allAdded, allCharactersAdded, allLorebooksAdded, allPersonasAdded, allPresetsAdded, charactersEmpty, commentLabel, commentPlaceholder, creatorLabel, creatorPlaceholder, descriptionEdit, descriptionEmpty, descriptionHint, descriptionLabel, descriptionPlaceholder, descriptionPreview, groups, introAddHint, introEdit, introNamePlaceholder, introPickMessage, introPickTitle, introRemove, introSave, introSaveEdit, introTextPlaceholder, introsEmpty, loadMore, lorebookRandomHint, lorebooksEmpty, metadata, nameLabel, namePlaceholder, noCharactersMatch, noLorebooksMatch, noPersonasMatch, noPresetsMatch, of, personaRandomHint, personasEmpty, presetRandomHint, presetsEmpty, random, randomHint, removeCharacter, removeLorebook, removePersona, removePreset, searchCharacters, searchLorebooks, searchPersonas, searchPresets, selectedCharacters, selectedIntros, selectedLorebooks, selectedPersonas, selectedPresets, tags, tagsAdd, tagsPlaceholder, tagsRemoveAll, uploadImage, version, versionEmpty, versionHistory, versionLabel, versionPlaceholder, versionReset, versionSource) |

## 4. Referenz-Dateien: So machen es die anderen Entitäten

Bei Erweiterungen am besten diese Nachbarn als Vorlage lesen:

- **Schema:** `packages/server/src/db/schema/lorebooks.ts`, `regex-scripts.ts`
- **Storage:** `packages/server/src/services/storage/regex-scripts.storage.ts`, `library-folders.storage.ts`
- **Routes:** `packages/server/src/routes/regex-scripts.routes.ts`, `library-folders.routes.ts`
- **Hooks:** `packages/client/src/hooks/use-regex-scripts.ts`, `use-lorebooks.ts`
- **Panel:** `packages/client/src/components/panels/LorebooksPanel.tsx`, `PersonasPanel.tsx`
- **Editor:** `packages/client/src/components/personas/PersonaEditor.tsx`, `presets/PresetEditor.tsx`, `lorebooks/LorebookEditor.tsx`

## 5. Wichtige Infrastruktur (immer wiederverwenden, nie neu bauen)

| Datei | Zweck |
|---|---|
| `packages/server/src/lib/logger.ts` | Pino-`logger` — in Server-Code Pflicht, `console.*` verboten |
| `packages/server/src/utils/id-generator.ts` | `newId()` (nanoid), `now()` (ISO) |
| `packages/server/src/db/connection.ts` | `DB`-Typ (`export type DB = FileNativeDB`) |
| `packages/server/src/db/file-schema.ts` | `fileTable`, `text`, Spalten-Definitionen |
| `packages/server/src/db/file-query.ts` | Query-Builder: `db.select().from(t).where(eq(col, v)).orderBy(col)` |
| `packages/client/src/lib/app-dialogs.ts` | `showConfirmDialog({ title, message, confirmLabel, cancelLabel, tone })` — **Options-Objekt, keine Positionsargumente**; tone: `"default" \| "destructive" \| "accent"` |
| `packages/client/src/localization/use-localized-ui-text.ts` | `useLocalizedUiText()` mappt englischen Text → en.json-Key (`findEnglishMessageKey`) |
| `packages/client/src/lib/utils.ts` | `cn()` (Class-Merge) |
| `packages/client/.instructions.md` | **Pflichtlektüre vor jeder Client-Änderung** |

## 6. Konventionen & Stolperfallen

- **Logging (Server):** `logger.error(err, "Msg")` (Error zuerst), Format-Specifiers: `logger.info("Resolved %d agents", n)`. Neue Prompt-/Generierungsrouten brauchen Debug-Logging (`logDebugOverride` o. ä.).
- **i18n:** Neue UI-Texte → semantische Keys in `en.json` (alphabetisch einsortieren). Nur Englisch pflegen; andere Lokalen bleiben partiell (Fallback). Vor dem Shippen: `pnpm localization:check`.
- **TopBar-Labels** laufen über `useLocalizedUiText()` — der englische Label-Text braucht daher einen en.json-Key (hier: `navigation.topbar.storyBundles`).
- **Detail-Surfaces sind mutual exclusive:** Jede neue `open*Detail`-Aktion muss in `ui.store.ts` alle anderen Detail-IDs auf `null` setzen (und umgekehrt) + in `hasAnyDetailOpen`, `closeAllDetails`, `requestChatModeShortcut` aufgenommen werden.
- **Neue Tabellen registrieren:** Jede neue `fileTable` muss in `FILE_BACKED_TABLES` (`packages/server/src/db/file-backed-store.ts`) eingetragen werden, sonst wirft der File-Store `Unsupported table: <name>` bei jedem Insert/Select (genau so passiert beim ersten Story-Bundle-Create und erneut bei `story_bundle_versions` — der Fehler trat erst beim tatsächlichen API-Call auf, nicht beim Server-Start).\n- **Cascade-Regeln:** Wenn eine Tabelle per FK auf eine andere verweist, muss eine Cascade-Regel in `CASCADES` (`file-backed-store.ts`) eingetragen werden, damit beim Löschen des Parents die Child-Rows mitgelöscht werden. Für `story_bundles` → `story_bundle_versions`: `{ parent: "story_bundles", child: { table: "story_bundle_versions", fkColumn: "story_bundle_id" } }`.\n- **Auto-Snapshot-Pattern:** Bei jedem Save wird automatisch ein Version-Snapshot erstellt (best-effort, Fehler werden still protokolliert). Der Snapshot speichert Name, Description, Comment, Creator, Version und Tags. Kein manueller Button nötig."
- **Styling:** nur CSS-Variablen (`var(--border)`, `var(--card)`, `var(--destructive)` …) + `mari-panel-gradient-surface mari-panel-gradient--<name>`; keine hartkodierten Hex-Farben außerhalb von `globals.css`.
- **data-testid:** jede neue Komponente/interaktives Element bekommt eine; Katalog siehe `story-bundle.md` § 5.
- **Test-Dateien:** Playwright-e2e-Tests liegen in `tests/story-bundle/tests/` und sind via `.gitignore`-Ausnahme (`!tests/**/*.test.ts`) versioniert. Page Objects in `tests/story-bundle/pages/`. Neue Tests folgen dem bestehenden Muster (Page Object + data-testid + `prepareFreshClient`).
- **Branches:** Änderungen gegen `staging`, nicht `main` (aktuell arbeiten wir auf `story-bundle-dev`).
- **Keine PR-Checkboxen anhaken**; manuelle Verifikation explizit auflisten.

## 7. Befehle

```bash
pnpm install              # einmalig / nach Lockfile-Änderungen
pnpm check                # Basis-Validierung: TS + ESLint + Lokalisierung + Build
pnpm localization:check   # nur Lokalisierung
pnpm version:check        # nur bei Versions-/Release-Metadaten
```

PowerShell: Befehle mit `;` verketten, nie mit `&&`.

## 8. Erweiterung-Checkliste (nächste Iteration, z. B. neue Felder)

1. `packages/shared`: Interface + Zod-Schema erweitern (update-Schema optional halten).
2. `packages/server`: Spalten in `fileTable` ergänzen, Storage-Methoden anpassen (neue Tabellen zusätzlich in `FILE_BACKED_TABLES` eintragen).
3. `packages/client`: Neues Tab-Component erstellen (Muster: `StoryBundleCharacters.tsx` / `StoryBundlePersonas.tsx`), in `StoryBundleEditor.tsx` importieren und TABS-Array + Rendering ergänzen, Hooks für Daten laden.
4. `en.json`-Keys ergänzen (alphabetisch einsortieren).
5. `pnpm check` grün, neue `data-testid`s vergeben, `story-bundle.md` + diese Datei nachziehen.
6. Commit auf dem Feature-Branch.

## 10. Import/Export-Muster

Story Bundles folgen dem etablierten Marinara-Export/Import-Pattern:

- **Export**: `GET /api/story-bundles/:id/export` → `ExportEnvelope` mit `type: "marinara_story_bundle"`, `version: 1`, `data: { name, description, characterIds, personaIds, lorebookIds, embeddedCharacters, embeddedPersonas, embeddedLorebooks }`. Characters und Personas werden mit Avataren, Sprites und Gallery als base64-Daten-URLs embedded — das JSON ist komplett self-contained für PC-zu-PC-Transfer. Wird als `.marinara.json`-Download ausgeliefert.
- **Import**: `POST /api/import/marinara` mit dem Envelope → dispatcher in `importMarinara()` routed an `importStoryBundle()`. Validiert `name` (Pflicht), filtert ID-Arrays auf Strings, erstellt Bundle via `createStoryBundlesStorage`. Import dedupliziert per Name (case-insensitive): existierende Characters/Personas/Lorebooks werden übersprungen, nur neue werden angelegt. Binärdaten (Avatare, Sprites, Gallery) werden aus den base64-Daten-URLs wiederhergestellt.
- **Image-Helper**: `packages/server/src/services/export/export-image-helpers.ts` — `readAvatarDataUrl()`, `readSpritesForId()`, `readGalleryForCharacter()` lesen Binärdaten von Disk und geben base64-Daten-URLs zurück. Wird von Character-Export und Story-Bundle-Export gemeinsam genutzt.
- **Test-Helper**: `importStoryBundleFixture(page, filePath)` in `tests/story-bundle/helpers/story-bundle-fixture.ts` liest eine Fixture-JSON, POSTet sie an `/api/import/marinara` und gibt das erstellte `StoryBundle` zurück. `buildStoryBundleEnvelope(input)` baut einen Envelope inline (für programmatische Tests). `StoryBundleAPI` in `tests/story-bundle/helpers/story-bundle-api.ts` bietet create/delete/import/export.
- **Fixtures**: `tests/story-bundle/data/` enthält JSON-Dateien in verschiedenen Zuständen (empty, with-description, with-characters, with-personas, with-lorebooks, full).

## 9. Tab-Component-Muster

Jeder neue Tab im StoryBundleEditor folgt diesem Pattern (siehe `StoryBundleCharacters.tsx` / `StoryBundlePersonas.tsx`):

- **Props-Interface**: `ids: string[]`, `onIdsChange: (ids: string[]) => void`, `items: T[]`, `folders: Folder[]`, `validIds: Set<string>`
- **Drei Sektionen**: (1) Add Items — Suchfeld + Random-Button + paginierte Liste mit Plus-Buttons, (2) Groups — Dropdown + Add-Button, (3) Selected Items — Liste mit Remove-Buttons
- **Leere Zustände**: Gestrichelte Border-Box mit i18n-Text
- **Paginierung**: `ITEM_PICKER_PAGE_SIZE = 20`, lokaler `useState`-Limit, "Load more"-Button
- **data-testid**: `story-bundle-editor-<tabname>`, `story-bundle-editor-<tabname>-search`, `story-bundle-editor-<tabname>-random`, `story-bundle-editor-<tabname>-load-more`, `story-bundle-editor-<tabname>-empty`, `story-bundle-editor-<tabname>-group-select`, `story-bundle-editor-<tabname>-add-group`
- **Lorebooks-Tab**: Hat keine Groups-Sektion (Lorebooks haben keine Folder-Groups). Nur zwei Sektionen: Add Lorebooks + Selected Lorebooks.
