# Story Bundle

> Entwicklungs-Dokumentation für das neue **Story-Bundle**-Objekt in Marinara Engine.
> Branch: `story-bundle-dev` · Stand: erste Iteration (nur Titel).

## 1. Überblick & Scope

Ein **Story Bundle** ist ein neues, eigenständiges Datenobjekt in Marinara Engine.
In dieser ersten Iteration trägt es **ausschließlich einen Titel** (`name`).
Alle weiteren Felder (Kapitel, Szenen, Lorebook-Verknüpfungen, Charakter-Zuordnungen …)
sind bewusst noch nicht implementiert — die Architektur ist aber so angelegt,
dass sie in späteren Iterationen erweitert werden kann, ohne bestehende Schichten
umbauen zu müssen.

```ts
interface StoryBundle {
  id: string;        // nanoid, serverseitig erzeugt
  name: string;      // Titel des Bundles (1–200 Zeichen, getrimmt)
  createdAt: string; // ISO-8601 Zeitstempel
  updatedAt: string; // ISO-8601 Zeitstempel
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
| `createStoryBundleSchema` | `{ name: string }` — getrimmt, min 1, max 200 |
| `updateStoryBundleSchema` | `{ name?: string }` — optional, gleiche Regeln |

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
2. „New Bundle" öffnet einen Prompt-Dialog mit genau einem Feld (Titel).
   Nach Bestätigung wird das Bundle angelegt und der Editor geöffnet.
3. Der Editor zeigt ein einzelnes Namensfeld; speichern per Button oder `Enter`.
4. Löschen läuft über einen destruktiven Bestätigungsdialog.

### Lokalisierung (`src/localization/locales/en.json`)

Neue semantische Schlüssel: `navigation.topbar.storyBundles` sowie der Block
`storyBundles.*` (back, cancel, count, create, createFailed, createPromptMessage,
delete, deleteConfirmBody, deleteConfirmTitle, deleteFailed, editorTitle, empty,
nameLabel, namePlaceholder, newBundle, save, saveFailed, saveSuccess).
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

## 6. Validierung

```bash
pnpm install        # einmalig
pnpm check          # TypeScript + ESLint + Lokalisierung + Build
pnpm localization:check
```

Aktueller Stand: `pnpm check` läuft vollständig grün durch
(einzige Ausgabe ist die präexistente Vite-Chunk-Size-Warnung).

## 7. Ausblick (nächste Iterationen)

Mögliche Erweiterungen, die die jetzige Struktur bereits vorbereitet:

- Felder: `description`, `coverImage`, Kapitel-/Szenenliste.
- Verknüpfungen zu Lorebooks, Charakteren und Personas.
- Export/Import als JSON.
- Panel-Suche und Sortierung.

Dafür jeweils erweitern: Shared-Type + Schema → Server-Spalten + Storage →
Client-Editor-Felder + Hooks. Die bestehende Titel-Verarbeitung bleibt davon
unberührt.
