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
| `packages/shared/src/types/story-bundle.ts` | Interface `StoryBundle { id, name, description, characterIds, personaIds, lorebookIds, createdAt, updatedAt }` |
| `packages/shared/src/schemas/story-bundle.schema.ts` | Zod: `storyBundleIdParamsSchema`, `createStoryBundleSchema` (name trim min1 max200, description + characterIds + personaIds + lorebookIds optional), `updateStoryBundleSchema` (name + description + characterIds + personaIds + lorebookIds optional) |
| `packages/shared/src/index.ts` | Barrel — beide Exportzeilen müssen drin bleiben |
| `packages/server/src/db/schema/story-bundles.ts` | `fileTable("story_bundles", …)` |
| `packages/server/src/db/file-backed-store.ts` | `"story_bundles"` in `FILE_BACKED_TABLES` (Registrierung, sonst `Unsupported table`) |
| `packages/server/src/services/storage/story-bundles.storage.ts` | `createStoryBundlesStorage(db)`: list/getById/create/update/remove |
| `packages/server/src/routes/story-bundles.routes.ts` | REST unter `/api/story-bundles` (GET/POST/PATCH/DELETE) |
| `packages/client/src/hooks/use-story-bundles.ts` | `storyBundleKeys` + Query-/Mutations-Hooks |
| `packages/client/src/components/panels/StoryBundlesPanel.tsx` | Listen-Panel (rechts) |
| `packages/client/src/components/story-bundles/StoryBundleEditor.tsx` | Vollseiten-Editor (Detailansicht) — Shell mit Tab-Rail |
| `packages/client/src/components/story-bundles/StoryBundleDescription.tsx` | Description-Tab (Name + HTML-Description mit Preview-Toggle) |
| `packages/client/src/components/story-bundles/StoryBundleCharacters.tsx` | Characters-Tab (Suche/Random/Load-More, Groups-Dropdown, Selected-Liste) |
| `packages/client/src/components/story-bundles/StoryBundlePersonas.tsx` | Personas-Tab (gleiches Muster wie Characters, mit Avatar-Crop-Support) |
| `packages/client/src/components/story-bundles/StoryBundleLorebooks.tsx` | Lorebooks-Tab (Suche/Random/Load-More, Selected-Liste; keine Groups) |

## 3. Angefasste Infrastruktur-Dateien (Wiring)

| Datei | Was dort für das Feature steckt |
|---|---|
| `packages/server/src/db/schema/index.ts` | `export * from "./story-bundles.js";` |
| `packages/server/src/routes/index.ts` | `app.register(storyBundlesRoutes, { prefix: "/api/story-bundles" })` |
| `packages/client/src/stores/ui.store.ts` | Panel-Typ `"story-bundles"`, `storyBundleDetailId`, `openStoryBundleDetail`/`closeStoryBundleDetail`, Gegenseitiger-Ausschluss in allen `open*Detail`-Aktionen (`storyBundleDetailId: null`), `hasAnyDetailOpen`, `closeAllDetails` |
| `packages/client/src/components/layout/AppShell.tsx` | Lazy-Import `StoryBundleEditor` + `detailView`-Kette (`storyBundleDetailId ? <StoryBundleEditor />`) |
| `packages/client/src/components/layout/RightPanel.tsx` | Lazy-Import `StoryBundlesPanel` + `PANEL_CONFIG["story-bundles"]` + `PANELS["story-bundles"]` |
| `packages/client/src/components/layout/TopBar.tsx` | `RightPanelButtonPanel`-Union, `RIGHT_PANEL_BUTTONS`-Eintrag, `panelContextActive["story-bundles"]`, `!storyBundleDetailId` in `isHomeActive` |
| `packages/client/src/styles/globals.css` | `.mari-panel-gradient--story-bundles` (Pink `#f472b6` → Violett `#a855f7`) + `.mari-description-preview` (HTML-Vorschau-Styling) |
| `packages/client/src/localization/locales/en.json` | `navigation.topbar.storyBundles` + Block `storyBundles.*` (inkl. add, addCharacters, addFromGroup, addLorebooks, addPersonas, allAdded, allCharactersAdded, allLorebooksAdded, allPersonasAdded, charactersEmpty, descriptionEdit, descriptionEmpty, descriptionHint, descriptionLabel, descriptionPlaceholder, descriptionPreview, groups, loadMore, lorebookRandomHint, lorebooksEmpty, noCharactersMatch, noLorebooksMatch, noPersonasMatch, of, personaRandomHint, personasEmpty, random, randomHint, removeCharacter, removeLorebook, removePersona, searchCharacters, searchLorebooks, searchPersonas, selectedCharacters, selectedLorebooks, selectedPersonas) |

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
- **Neue Tabellen registrieren:** Jede neue `fileTable` muss in `FILE_BACKED_TABLES` (`packages/server/src/db/file-backed-store.ts`) eingetragen werden, sonst wirft der File-Store `Unsupported table: <name>` bei jedem Insert/Select (genau so passiert beim ersten Story-Bundle-Create).
- **Styling:** nur CSS-Variablen (`var(--border)`, `var(--card)`, `var(--destructive)` …) + `mari-panel-gradient-surface mari-panel-gradient--<name>`; keine hartkodierten Hex-Farben außerhalb von `globals.css`.
- **data-testid:** jede neue Komponente/interaktives Element bekommt eine; Katalog siehe `story-bundle.md` § 5.
- **Keine `.test.ts`-Dateien ins Repo** — Beweise über Regression-/Smoke-Lanes (`pnpm regression:prompt`, `pnpm smoke:ui`).
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

## 9. Tab-Component-Muster

Jeder neue Tab im StoryBundleEditor folgt diesem Pattern (siehe `StoryBundleCharacters.tsx` / `StoryBundlePersonas.tsx`):

- **Props-Interface**: `ids: string[]`, `onIdsChange: (ids: string[]) => void`, `items: T[]`, `folders: Folder[]`, `validIds: Set<string>`
- **Drei Sektionen**: (1) Add Items — Suchfeld + Random-Button + paginierte Liste mit Plus-Buttons, (2) Groups — Dropdown + Add-Button, (3) Selected Items — Liste mit Remove-Buttons
- **Leere Zustände**: Gestrichelte Border-Box mit i18n-Text
- **Paginierung**: `ITEM_PICKER_PAGE_SIZE = 20`, lokaler `useState`-Limit, "Load more"-Button
- **data-testid**: `story-bundle-editor-<tabname>`, `story-bundle-editor-<tabname>-search`, `story-bundle-editor-<tabname>-random`, `story-bundle-editor-<tabname>-load-more`, `story-bundle-editor-<tabname>-empty`, `story-bundle-editor-<tabname>-group-select`, `story-bundle-editor-<tabname>-add-group`
- **Lorebooks-Tab**: Hat keine Groups-Sektion (Lorebooks haben keine Folder-Groups). Nur zwei Sektionen: Add Lorebooks + Selected Lorebooks.
