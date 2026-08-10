# Story Bundle

> Entwicklungs-Dokumentation für das neue **Story-Bundle**-Objekt in Marinara Engine.
> Branch: `story-bundle-dev` · Stand: zweite Iteration (Titel + HTML-Description).

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
  createdAt: string;      // ISO-8601 Zeitstempel
  updatedAt: string;      // ISO-8601 Zeitstempel
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
| `createStoryBundleSchema` | `{ name: string, description?: string \| null }` — name getrimmt, min 1, max 200 |
| `updateStoryBundleSchema` | `{ name?: string, description?: string \| null }` — beide optional |

Abgeleitete Typen: `CreateStoryBundleInput`, `UpdateStoryBundleInput`.

## 3. Schicht: Server (`packages/server`)

| Datei | Zweck |
|---|---|
| `src/db/schema/story-bundles.ts` | `fileTable("story_bundles", …)` — Tabellendefinition |
| `src/db/schema/index.ts` | Barrel-Export ergänzt |
| `src/db/file-backed-store.ts` | `"story_bundles"` in `FILE_BACKED_TABLES` registriert |
| `src/services/storage/story-bundles.storage.ts` | `createStoryBundlesStorage(db)` — CRUD-Zugriff |
| `src/routes/story-bundles.routes.ts` | REST-Endpunkte unter `/api/story-bundles` |
| `src/routes/index.ts` | Routenregistrierung ergänzt |

Die Tabelle `story_bundles` ist eine File-Native-JSON-Table wie alle anderen
Entitäten (Lorebooks, Presets, Personas …). IDs werden über `newId()` (nanoid),
Zeitstempel über `now()` (ISO) aus `utils/id-generator.ts` erzeugt.

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
| `src/components/story-bundles/StoryBundleEditor.tsx` | Vollseiten-Editor (Detailansicht) |
| `src/components/layout/RightPanel.tsx` | Panel registriert (`PANEL_CONFIG` + `PANELS`) |
| `src/components/layout/TopBar.tsx` | TopBar-Button (`BookMarked`-Icon, Gradient) |
| `src/components/layout/AppShell.tsx` | Lazy-Import + `detailView`-Kette |
| `src/styles/globals.css` | Gradient `.mari-panel-gradient--story-bundles` (Pink → Violett) |

**Workflow im UI:**
1. TopBar-Button „Story Bundles" öffnet das rechte Panel.
2. „New Bundle" öffnet einen Prompt-Dialog (Titel „Create Story Bundle")
   mit genau einem Feld (Titel). Nach Bestätigung wird das Bundle angelegt
   und der Editor geöffnet.
3. Der Editor zeigt ein Namensfeld und eine HTML-Description-Textarea.
   Speichern per Button oder `Enter` im Namensfeld.
4. Die Description unterstützt einen **Preview-Toggle**: Im Edit-Modus wird
   HTML eingegeben, im Preview-Modus wird das gesäuberte HTML (via DOMPurify)
   live gerendert. Erlaubte Tags: `a`, `b`, `blockquote`, `br`, `code`, `del`,
   `em`, `h1`–`h6`, `hr`, `i`, `img`, `ins`, `li`, `mark`, `ol`, `p`, `pre`,
   `s`, `small`, `span`, `strong`, `sub`, `sup`, `table`, `tbody`, `td`, `th`,
   `thead`, `tr`, `u`, `ul`.
5. Löschen läuft über einen destruktiven Bestätigungsdialog.

### Lokalisierung (`src/localization/locales/en.json`)

Neue semantische Schlüssel: `navigation.topbar.storyBundles` sowie der Block
`storyBundles.*` (back, cancel, count, create, createDialogTitle, createFailed, createPromptMessage,
delete, deleteConfirmBody, deleteConfirmTitle, deleteFailed, descriptionEdit, descriptionEmpty,
descriptionHint, descriptionLabel, descriptionPlaceholder, descriptionPreview,
editorTitle, empty, nameLabel, namePlaceholder, newBundle, save, saveFailed, saveSuccess).
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
| `story-bundles-create-button` | „New Bundle"-Button |
| `story-bundle-row-${bundle.id}` | Listenzeile eines Bundles |
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
| `story-bundle-editor-name-label` | Label des Namensfelds |
| `story-bundle-editor-name-input` | Namenseingabefeld |
| `story-bundle-editor-description-label` | Label des Description-Felds |
| `story-bundle-editor-description-input` | HTML-Textarea für die Description |
| `story-bundle-editor-description-preview-toggle` | Preview/Edit-Toggle-Button |
| `story-bundle-editor-description-preview` | Gerenderte HTML-Vorschau |

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

Die Spezifikation liegt in `tests/e2e/story-bundle.test.ts` und wird über das
dedizierte pnpm-Skript ausgeführt:

```bash
pnpm regression:story-bundle   # alle 4 Story-Bundle-Tests (Desktop + Mobile)
```

Das Skript ruft `playwright test -c playwright.config.ts tests/e2e/story-bundle.test.ts`
auf und startet die Webserver (Desktop 5178/7971, Mobile 5179/7972) automatisch
über `config.webServer`. Aktueller Stand: **4 passed**.

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

## 7. Ausblick (nächste Iterationen)

Mögliche Erweiterungen, die die jetzige Struktur bereits vorbereitet:

- Felder: `description`, `coverImage`, Kapitel-/Szenenliste.
- Verknüpfungen zu Lorebooks, Charakteren und Personas.
- Export/Import als JSON.
- Panel-Suche und Sortierung.

Dafür jeweils erweitern: Shared-Type + Schema → Server-Spalten + Storage →
Client-Editor-Felder + Hooks. Die bestehende Titel-Verarbeitung bleibt davon
unberührt.
