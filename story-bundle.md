# Story Bundle

> Entwicklungs-Dokumentation für das neue **Story-Bundle**-Objekt in Marinara Engine.
> Branch: `story-bundle-dev` · Stand: siebte Iteration (Titel + HTML-Description + Characters + Personas + Lorebooks + Presets + Intros + Import/Export).

## 1. Überblick & Scope

Ein **Story Bundle** ist ein neues, eigenständiges Datenobjekt in Marinara Engine.
Es trägt einen **Titel** (`name`) und eine optionale **HTML-Beschreibung** (`description`).
Alle weiteren Felder (Kapitel, Szenen, Lorebook-Verknüpfungen, Charakter-Zuordnungen …)
sind bewusst noch nicht implementiert — die Architektur ist aber so angelegt,
dass sie in späteren Iterationen erweitert werden kann, ohne bestehende Schichten
umbauen zu müssen.

```ts
interface StoryBundle {
  id: string;             // nanoid, serverseitig erzeugt
  name: string;           // Titel des Bundles (1–200 Zeichen, getrimmt)
  description: string | null; // Optionale HTML-Beschreibung (clientseitig via DOMPurify gesäubert)
  characterIds: string[]; // Zugewiesene Charakter-IDs (JSON-Array in der DB)
  personaIds: string[];   // Zugewiesene Persona-IDs (JSON-Array in der DB)
  lorebookIds: string[];  // Zugewiesene Lorebook-IDs (JSON-Array in der DB)
  presetIds: string[];    // Zugewiesene Preset-IDs (JSON-Array in der DB)
  intros: StoryBundleIntro[]; // Inline-Intros (Name + Text), als JSON-Array in der DB
  createdAt: string;      // ISO-8601 Zeitstempel
  updatedAt: string;      // ISO-8601 Zeitstempel
}

interface StoryBundleIntro {
  id: string;   // clientseitig via crypto.randomUUID() erzeugt
  name: string; // Name des Intros (1–200 Zeichen)
  text: string; // Nachrichtentext (min 1 Zeichen)
}
```

Das Objekt folgt exakt dem etablierten End-to-End-Muster des Repos:

```
Shared (Types + Zod) → Server (DB-Schema + Storage + REST-Routen) → Client (Hook + Store + Panel + Editor)
```

## 2. Schicht: Shared (`packages/shared`)

| Datei | Zweck |
|---|---|
| `src/types/story-bundle.ts` | TypeScript-Interface `StoryBundle` |
| `src/schemas/story-bundle.schema.ts` | Zod-Schemas für API-Eingaben |
| `src/index.ts` | Barrel-Exports (`export * from ...`) |

### Zod-Schemas

| Schema | Regel |
|---|---|
| `storyBundleIdParamsSchema` | `{ id: string, min 1 }` — URL-Parameter |
| `createStoryBundleSchema` | `{ name: string, description?: string \| null, characterIds?: string[], personaIds?: string[], lorebookIds?: string[], presetIds?: string[], intros?: StoryBundleIntro[] }` — name getrimmt, min 1, max 200 |
| `updateStoryBundleSchema` | `{ name?: string, description?: string \| null, characterIds?: string[], personaIds?: string[], lorebookIds?: string[], presetIds?: string[], intros?: StoryBundleIntro[] }` — alle optional |

Abgeleitete Typen: `CreateStoryBundleInput`, `UpdateStoryBundleInput`.

## 3. Schicht: Server (`packages/server`)

| Datei | Zweck |
|---|---|
| `src/db/schema/story-bundles.ts` | `fileTable("story_bundles", …)` — Tabellendefinition |
| `src/db/schema/index.ts` | Barrel-Export ergänzt |
| `src/db/file-backed-store.ts` | `"story_bundles"` in `FILE_BACKED_TABLES` registriert |
| `src/services/storage/story-bundles.storage.ts` | `createStoryBundlesStorage(db)` — CRUD-Zugriff |
| `src/routes/story-bundles.routes.ts` | REST-Endpunkte unter `/api/story-bundles` |
| `src/services/export/export-image-helpers.ts` | Shared Image-Helper: `readAvatarDataUrl()`, `readSpritesForId()`, `readGalleryForCharacter()` |
| `src/routes/index.ts` | Routenregistrierung ergänzt |

Die Tabelle `story_bundles` ist eine File-Native-JSON-Table wie alle anderen
Entitäten (Lorebooks, Presets, Personas …). IDs werden über `newId()` (nanoid),
Zeitstempel über `now()` (ISO) aus `utils/id-generator.ts` erzeugt.

`characterIds`, `personaIds` und `lorebookIds` werden als JSON-Strings in den Textspalten
`character_ids`, `persona_ids` und `lorebook_ids` gespeichert und beim Lesen/Schreiben via
`JSON.stringify`/`JSON.parse` serialisiert (gleiches Muster wie Character Groups).

> **Wichtig:** Jede neue `fileTable` muss zusätzlich in `FILE_BACKED_TABLES`
> (`src/db/file-backed-store.ts`) eingetragen werden, sonst wirft der Store
> `Unsupported table: <name>` bei jedem Zugriff.

### REST-API

| Methode | Pfad | Verhalten |
|---|---|---|
| `GET` | `/api/story-bundles` | Liste, sortiert nach `createdAt` |
| `GET` | `/api/story-bundles/:id` | Ein einzelnes Bundle, sonst `404` |
| `POST` | `/api/story-bundles` | Anlegen (Zod-validiert), `201` + Objekt |
| `PATCH` | `/api/story-bundles/:id` | Titel aktualisieren, `404` wenn unbekannt |
| `DELETE` | `/api/story-bundles/:id` | Löschen, `404` wenn unbekannt |
| `GET` | `/api/story-bundles/:id/export` | Export als `.marinara.json` (Download) |

Zusätzlich wird der Import über den bestehenden `/api/import/marinara`-Endpunkt
abgewickelt (POST mit `ExportEnvelope`, `type: "marinara_story_bundle"`).

Fehlerbehandlung: Zod-Fehler → `400`, fehlende Datensätze → `404`,
interne Fehler → `500` mit `logger.error(err, …)` (Pino, kein `console.*`).

## 4. Schicht: Client (`packages/client`)

### Datenzugriff

| Datei | Zweck |
|---|---|
| `src/hooks/use-story-bundles.ts` | TanStack-Query-Hooks |

- `storyBundleKeys` — Query-Key-Fabrik (`all`, `list`, `detail(id)`)
- `useStoryBundles()` — Liste (`staleTime` 2 min, `placeholderData`)
- `useStoryBundle(id)` — Detail, nur aktiv wenn `id` gesetzt ist
- `useCreateStoryBundle()` / `useUpdateStoryBundle()` / `useDeleteStoryBundle()`
  — Mutationen, invalidieren nach Erfolg `storyBundleKeys.all`

### Navigation & State (`src/stores/ui.store.ts`)

- Neuer Panel-Typ: `"story-bundles"` im `Panel`-Union.
- Neues Detail-Surface-Feld: `storyBundleDetailId: string | null`.
- Aktionen: `openStoryBundleDetail(id)` / `closeStoryBundleDetail()`.
- Gegenseitiger Ausschluss: Jede `open*Detail`-Aktion setzt
  `storyBundleDetailId: null` (und umgekehrt), damit immer nur genau eine
  Detailansicht offen ist. `hasAnyDetailOpen`, `closeAllDetails` und
  `requestChatModeShortcut` berücksichtigen das neue Feld ebenfalls.

### UI-Komponenten

| Datei | Zweck |
|---|---|
| `src/components/panels/StoryBundlesPanel.tsx` | Listen-Panel im rechten Panel |
| `src/components/story-bundles/StoryBundleEditor.tsx` | Vollseiten-Editor (Detailansicht) — Shell mit Tab-Rail |
| `src/components/story-bundles/StoryBundleDescription.tsx` | Description-Tab (Name + HTML-Description mit Preview-Toggle) |
| `src/components/story-bundles/StoryBundleCharacters.tsx` | Characters-Tab (Suche/Random/Load-More, Groups-Dropdown, Selected-Liste) |
| `src/components/story-bundles/StoryBundlePersonas.tsx` | Personas-Tab (gleiches Muster wie Characters, mit Avatar-Crop-Support) |
| `src/components/story-bundles/StoryBundleLorebooks.tsx` | Lorebooks-Tab (Suche/Random/Load-More, Selected-Liste; keine Groups) |
| `src/components/story-bundles/StoryBundlePresets.tsx` | Presets-Tab (Suche/Random/Load-More, Selected-Liste; keine Groups) |
| `src/components/story-bundles/StoryBundleIntros.tsx` | Intros-Tab (Inline-Intros: Name + Text, Add/Edit/Delete) |
| `src/components/layout/RightPanel.tsx` | Panel registriert (`PANEL_CONFIG` + `PANELS`) |
| `src/components/layout/TopBar.tsx` | TopBar-Button (`BookMarked`-Icon, Gradient) |
| `src/components/layout/AppShell.tsx` | Lazy-Import + `detailView`-Kette |
| `src/styles/globals.css` | Gradient `.mari-panel-gradient--story-bundles` (Pink → Violett) |
| `packages/shared/src/types/export.ts` | `ExportType` um `"marinara_story_bundle"` erweitert |
| `packages/server/src/services/import/marinara.importer.ts` | `importStoryBundle()` — Import-Handler für Story-Bundle-Envelopes |
| `tests/story-bundle/helpers/story-bundle-fixture.ts` | Test-Helper: `importStoryBundleFixture()`, `buildStoryBundleEnvelope()` |
| `tests/story-bundle/helpers/story-bundle-api.ts` | Test-Helper: `StoryBundleAPI`-Klasse (create/delete/import/export) |
| `tests/story-bundle/helpers/fresh-client.ts` | Test-Helper: `prepareFreshClient()` (Client-State vor Test) |
| `tests/story-bundle/data/*.json` | Fixture-Dateien in verschiedenen Zuständen (empty, with-description, with-characters, with-personas, with-lorebooks, full) |
| `tests/story-bundle/data/test-data.html` | HTML-Testdaten für Description-Preview |
| `tests/story-bundle/tests/story-bundle.test.ts` | Playwright-e2e-Tests |

**Workflow im UI:**
1. TopBar-Button „Story Bundles" öffnet das rechte Panel.
2. „New Bundle" öffnet einen Prompt-Dialog (Titel „Create Story Bundle")
   mit genau einem Feld (Titel). Nach Bestätigung wird das Bundle angelegt
   und der Editor geöffnet.
3. Der Editor hat sechs Tabs (via `EditorTabRail`): **Description** (Name + HTML-Description),
   **Characters** (Charakter-Zuweisung), **Personas** (Persona-Zuweisung),
   **Lorebooks** (Lorebook-Zuweisung), **Presets** (Preset-Zuweisung),
   **Intros** (Inline-Intros: Name + Text).
   Jeder Tab ist in eine eigene Komponente unter `src/components/story-bundles/`
   ausgelagert.
4. Der **General**-Tab zeigt ein Namensfeld und eine HTML-Description-Textarea.
   Speichern per Button oder `Enter` im Namensfeld.
5. Die Description unterstützt einen **Preview-Toggle**: Im Edit-Modus wird
   HTML eingegeben, im Preview-Modus wird das gesäuberte HTML (via DOMPurify)
   live gerendert. Erlaubte Tags: `a`, `b`, `blockquote`, `br`, `code`, `del`,
   `em`, `h1`–`h6`, `hr`, `i`, `img`, `ins`, `li`, `mark`, `ol`, `p`, `pre`,
   `s`, `small`, `span`, `strong`, `sub`, `sup`, `table`, `tbody`, `td`, `th`,
   `thead`, `tr`, `u`, `ul`.
6. Der **Characters**-Tab hat drei Sektionen:
   - **Selected Characters**: Zeigt alle zugewiesenen Charaktere mit Avatar,
     Name, Titel und einem Remove-Button (Trash2-Icon). Leerer Zustand zeigt
     eine gestrichelte Placeholder-Box.
   - **Groups**: Dropdown aller Character Groups. Ein Klick auf „Add" fügt
     alle Charaktere der gewählten Group hinzu (Duplikate werden ignoriert).
     Zeigt pro Group an, wie viele neue Charaktere hinzugefügt würden.
   - **Add Characters**: Suchfeld mit Lupe-Icon, „Random"-Button (würfelt
     einen zufälligen Charakter), Liste aller verfügbaren Charaktere mit
     Avatar/Name/Titel und Plus-Button zum Hinzufügen. „Load more"-Button
     für Paginierung. Leerer Zustand zeigt passende Meldungen.
7. Der **Personas**-Tab folgt dem gleichen Muster wie Characters:
   - **Selected Personas**: Zugewiesene Personas mit Avatar (inkl. Crop),
     Name, Titel und Remove-Button.
   - **Groups**: Dropdown aller Persona Groups. Persona-IDs werden aus dem
     JSON-String `personaIds` der Group geparst.
   - **Add Personas**: Suchfeld, Random-Button, paginierte Liste mit
     Avatar/Name/Titel und Plus-Button.
8. Der **Lorebooks**-Tab hat zwei Sektionen (keine Groups, da Lorebooks keine
   Folder-Groups haben):
   - **Selected Lorebooks**: Zugewiesene Lorebooks mit BookOpen-Icon, Name,
     Kategorie und Remove-Button.
   - **Add Lorebooks**: Suchfeld, Random-Button, paginierte Liste mit
     BookOpen-Icon/Name/Kategorie und Plus-Button.
9. Der **Presets**-Tab folgt dem gleichen Muster wie Lorebooks (keine Groups):
   - **Selected Presets**: Zugewiesene Presets mit SlidersHorizontal-Icon, Name,
     Description und Remove-Button.
   - **Add Presets**: Suchfeld, Random-Button, paginierte Liste mit
     SlidersHorizontal-Icon/Name/Description und Plus-Button.
10. Der **Intros**-Tab verwaltet 1:n Inline-Intros (keine Referenzen auf externe
    Entitäten):
    - **Add Intro**: Button öffnet ein Inline-Formular mit Name-Input und
      Text-Textarea. Speichern erzeugt ein neues Intro mit `crypto.randomUUID()`.
    - **Selected Intros**: Liste aller Intros mit MessageSquare-Icon, Name,
      Text-Vorschau, Edit-Button (Pencil) und Delete-Button (X).
    - **Edit**: Öffnet das Formular mit den vorhandenen Werten, speichern
      aktualisiert das Intro in-place.
    - **Delete**: Entfernt das Intro sofort aus der Liste.
    - **Empty State**: Gestrichelte Placeholder-Box wenn keine Intros vorhanden.
    - **Play Flow**: Beim Klick auf „Play" wird, falls Intros vorhanden sind,
      ein Choice-Dialog (`showChoiceDialog`) mit den Intro-Namen angezeigt.
      Das gewählte Intro wird als erste Assistant-Message in den Chat eingefügt
      (`POST /api/chats/:id/messages` mit `role: "assistant"`).
      Bei Abbruch wird der Play-Vorgang gestoppt.
11. Löschen läuft über einen destruktiven Bestätigungsdialog.
11. **Export**: `GET /api/story-bundles/:id/export` liefert einen
    `ExportEnvelope` mit `type: "marinara_story_bundle"` als JSON-Download
    (`.marinara.json`). Der Envelope enthält `name`, `description`,
    `characterIds`, `personaIds`, `lorebookIds`, `presetIds`, `intros` sowie `embeddedCharacters`,
    `embeddedPersonas`, `embeddedLorebooks`, `embeddedPresets` mit vollständigen Entitätsdaten.
    Characters und Personas werden mit Avataren, Sprites und Gallery als
    base64-Daten-URLs embedded — das JSON ist komplett self-contained für
    PC-zu-PC-Transfer.
12. **Import**: `POST /api/import/marinara` mit einem Story-Bundle-Envelope
    erstellt ein neues Bundle. Der Import-Handler (`importStoryBundle`)
    validiert den Namen (Pflichtfeld), filtert ID-Arrays auf Strings und
    importiert embedded Characters/Personas/Lorebooks/Presets. Import dedupliziert
    per Name (case-insensitive): existierende Entitäten werden übersprungen,
    nur neue werden angelegt. Binärdaten (Avatare, Sprites, Gallery) werden
    aus den base64-Daten-URLs wiederhergestellt.
    Für Tests gibt es den Helper `importStoryBundleFixture(page, filePath)`
    und `buildStoryBundleEnvelope(input)` in `tests/story-bundle/helpers/story-bundle-fixture.ts`.

### Lokalisierung (`src/localization/locales/en.json`)

Neue semantische Schlüssel: `navigation.topbar.storyBundles` sowie der Block
`storyBundles.*` (add, addCharacters, addFromGroup, addIntros, addLorebooks, addPersonas, addPresets, allAdded, allCharactersAdded,
allLorebooksAdded, allPersonasAdded, allPresetsAdded, back, cancel, charactersEmpty, count, create, createDialogTitle, createFailed,
createPromptMessage, delete, deleteConfirmBody, deleteConfirmTitle, deleteFailed,
descriptionEdit, descriptionEmpty, descriptionHint, descriptionLabel, descriptionPlaceholder,
descriptionPreview, editorTitle, empty, groups, introAddHint, introEdit, introNamePlaceholder, introPickMessage, introPickTitle, introRemove, introSave, introSaveEdit, introTextPlaceholder, introsEmpty, loadMore, lorebookRandomHint, lorebooksEmpty, nameLabel, namePlaceholder, newBundle,
noCharactersMatch, noLorebooksMatch, noPersonasMatch, noPresetsMatch, of, personaRandomHint, personasEmpty, presetRandomHint, presetsEmpty, random, randomHint,
removeCharacter, removeLorebook, removePersona, removePreset, save, saveFailed, saveSuccess, searchCharacters, searchLorebooks, searchPersonas, searchPresets,
selectedCharacters, selectedIntros, selectedLorebooks, selectedPersonas, selectedPresets).
Community-Lokalen bleiben bewusst partiell (Fallback auf Englisch).

## 5. data-testid-Katalog

Jede React-Komponente des Features trägt `data-testid`-Attribute für
smoke-/Regressionstests:

### TopBar
| testid | Element |
|---|---|
| `topbar-panel-button-story-bundles` | TopBar-Button „Story Bundles" |

### `StoryBundlesPanel`
| testid | Element |
|---|---|
| `story-bundles-panel` | Panel-Wurzel |
| `story-bundles-import-button` | Import-Button |
| `story-bundles-create-button` | „New Bundle"-Button |
| `story-bundle-row-${bundle.id}` | Listenzeile eines Bundles |
| `story-bundle-export-button-${bundle.id}` | Export-Button in der Zeile |
| `story-bundle-delete-button-${bundle.id}` | Löschen-Button in der Zeile |

### `StoryBundleEditor`
| testid | Element |
|---|---|
| `story-bundle-editor` | Editor-Wurzel |
| `story-bundle-editor-loading` | Ladezustand |
| `story-bundle-editor-header` | Sticky Kopfzeile |
| `story-bundle-editor-back-button` | Zurück-Button |
| `story-bundle-editor-save-button` | Speichern-Button |
| `story-bundle-editor-delete-button` | Löschen-Button |
| `story-bundle-editor-description` | Description-Tab-Container |
| `story-bundle-editor-name-label` | Label des Namensfelds |
| `story-bundle-editor-name-input` | Namenseingabefeld |
| `story-bundle-editor-description-label` | Label des Description-Felds |
| `story-bundle-editor-description-input` | HTML-Textarea für die Description |
| `story-bundle-editor-description-preview-toggle` | Preview/Edit-Toggle-Button |
| `story-bundle-editor-description-preview` | Gerenderte HTML-Vorschau |
| `story-bundle-editor-characters` | Characters-Tab-Container |
| `story-bundle-editor-characters-search` | Suchfeld im Add-Characters-Bereich |
| `story-bundle-editor-characters-group-select` | Group-Dropdown |
| `story-bundle-editor-characters-add-group` | „Add"-Button für Groups |
| `story-bundle-editor-characters-random` | „Random"-Button |
| `story-bundle-editor-characters-load-more` | „Load more"-Button |
| `story-bundle-editor-characters-empty` | Leerer-Zustand-Text |

### `StoryBundlePersonas`
| testid | Element |
|---|---|
| `story-bundle-editor-personas` | Personas-Tab-Container |
| `story-bundle-editor-personas-search` | Suchfeld im Add-Personas-Bereich |
| `story-bundle-editor-personas-group-select` | Group-Dropdown |
| `story-bundle-editor-personas-add-group` | „Add"-Button für Groups |
| `story-bundle-editor-personas-random` | „Random"-Button |
| `story-bundle-editor-personas-load-more` | „Load more"-Button |
| `story-bundle-editor-personas-empty` | Leerer-Zustand-Text |

### `StoryBundleLorebooks`
| testid | Element |
|---|---|
| `story-bundle-editor-lorebooks` | Lorebooks-Tab-Container |
| `story-bundle-editor-lorebooks-search` | Suchfeld im Add-Lorebooks-Bereich |
| `story-bundle-editor-lorebooks-random` | „Random"-Button |
| `story-bundle-editor-lorebooks-load-more` | „Load more"-Button |
| `story-bundle-editor-lorebooks-empty` | Leerer-Zustand-Text |

### `StoryBundlePresets`
| testid | Element |
|---|---|
| `story-bundle-editor-presets` | Presets-Tab-Container |
| `story-bundle-editor-presets-search` | Suchfeld im Add-Presets-Bereich |
| `story-bundle-editor-presets-random` | „Random"-Button |
| `story-bundle-editor-presets-load-more` | „Load more"-Button |
| `story-bundle-editor-presets-empty` | Leerer-Zustand-Text |

### `StoryBundleIntros`
| testid | Element |
|---|---|
| `story-bundle-editor-intros` | Intros-Tab-Container |
| `story-bundle-editor-intros-add-button` | „Add Intro"-Button |
| `story-bundle-editor-intros-name-input` | Name-Eingabefeld |
| `story-bundle-editor-intros-text-input` | Text-Textarea |
| `story-bundle-editor-intros-save-button` | Speichern-Button |
| `story-bundle-editor-intros-cancel-button` | Abbrechen-Button |
| `story-bundle-editor-intros-edit-button` | Edit-Button (Pencil) |
| `story-bundle-editor-intros-delete-button` | Delete-Button (X) |
| `story-bundle-editor-intros-empty` | Leerer-Zustand-Text |

### App-Dialoge (`Modal` / `AppDialogRenderer`)
| testid | Element |
|---|---|
| `story-bundle-create-dialog` | Modal-Panel des „Create Story Bundle"-Prompt-Dialogs |
| `story-bundle-delete-dialog` | Modal-Panel des Lösch-Bestätigungsdialogs |
| `app-dialog-prompt-input` | Texteingabefeld des Prompt-Dialogs |
| `app-dialog-cancel-button` | Abbrechen-Button (Prompt- und Confirm-Dialoge) |
| `app-dialog-confirm-button` | Bestätigen-Button (Prompt- und Confirm-Dialoge) |
| `${testId}-close-button` | X-Schließen-Button des Modal-Panels (falls `testId` gesetzt) |

> Hinweis: `Modal` akzeptiert eine optionale `testId`-Prop; das
> `AppDialog`-State-Feld `testId` wird vom `AppDialogRenderer` an die
> `Modal`-Komponente durchgereicht.

## 6. Validierung

```bash
pnpm install        # einmalig
pnpm check          # TypeScript + ESLint + Lokalisierung + Build
pnpm localization:check
```

Aktueller Stand: `pnpm check` läuft vollständig grün durch
(einzige Ausgabe ist die präexistente Vite-Chunk-Size-Warnung).

### 6.1 Playwright-e2e-Tests (Story Bundle)

Die Spezifikation liegt in `tests/story-bundle/tests/` und wird über das
dedizierte pnpm-Skript ausgeführt:

```bash
pnpm regression:story-bundle   # alle Story-Bundle-Tests (Desktop + Mobile)
```

Das Skript ruft `playwright test -c playwright.config.ts tests/story-bundle/tests/`
auf und startet die Webserver (Desktop 5178/7971, Mobile 5179/7972) automatisch
über `config.webServer`. Aktueller Stand: **76 passed** (38 Tests × 2 Projekte).

Hinweise zur Ausführung:

- Playwright läuft standardmäßig **headless** – es öffnet sich kein sichtbares
  Browserfenster. Das ist das erwartete Verhalten (auch in der VS-Code-
  Playwright-Extension). Für ein sichtbares Fenster `--headed` anhängen:
  `pnpm exec playwright test -c playwright.config.ts tests/e2e/story-bundle.test.ts --headed`
- Die Tests schreiben bewusst nichts auf stdout; ein „The test case did not
  report any output" in der Extension ist daher normal. Das Ergebnis steht im
  Test-Explorer bzw. in der Zusammenfassung (`2 passed`).
- Die Datei heißt `*.test.ts` (Konvention der Playwright-Extension). Damit sie
  trotz der „Temporary tests"-Muster in `.gitignore` versioniert wird, gibt es
  dort die Ausnahmen `!tests/**/*.test.ts` und `!tests/**/*.spec.ts`.

### 6.2 Test-Fixtures & Helper

Für Tests, die ein Story Bundle in einem bestimmten Zustand benötigen, gibt es:

- **`tests/story-bundle/helpers/story-bundle-fixture.ts`**: `importStoryBundleFixture(page, filePath)`
  importiert eine `.marinara.json`-Fixture-Datei via `POST /api/import/marinara`
  und gibt das erstellte `StoryBundle` zurück. `buildStoryBundleEnvelope(input)`
  baut einen Envelope inline für programmatische Tests.
- **`tests/story-bundle/helpers/story-bundle-api.ts`**: `StoryBundleAPI`-Klasse
  mit `create()`, `delete()`, `importFromEnvelope()`, `export()` — nutzt
  `page.request` für API-Calls mit Cookie/Auth-State.
- **`tests/story-bundle/helpers/fresh-client.ts`**: `prepareFreshClient(page)`
  seeded den Client-State (Onboarding abgeschlossen, UI-Store-Version) vor
  jedem Test.
- **`tests/story-bundle/data/`**: Fixture-JSONs in verschiedenen Zuständen:
  `empty.json`, `with-description.json`, `with-characters.json`,
  `with-personas.json`, `with-lorebooks.json`, `full.json`.

```ts
// Beispiel: Bundle mit Description importieren
import { importStoryBundleFixture } from './tests/story-bundle/helpers/story-bundle-fixture';
const bundle = await importStoryBundleFixture(page, './tests/story-bundle/data/with-description.json');
// bundle.description === "<h1>Chapter One</h1>..."
```

## 7. Ausblick (nächste Iterationen)

Mögliche Erweiterungen, die die jetzige Struktur bereits vorbereitet:

- Felder: `coverImage`, Kapitel-/Szenenliste.
- ~~Verknüpfungen zu Lorebooks.~~ ✅ Erledigt (fünfte Iteration).
- ~~Export/Import als JSON.~~ ✅ Erledigt (sechste Iteration).
- Panel-Suche und Sortierung.

Dafür jeweils erweitern: Shared-Type + Schema → Server-Spalten + Storage →
Client-Editor-Felder + Hooks. Die bestehende Titel-Verarbeitung bleibt davon
unberührt.
