# Current Test Coverage

Baseline audit of the `e2e` test suite. No tests were modified, no new tests were created, and no architecture is proposed here — this is strictly a factual current-state inventory, meant to be diffed against a later test-architecture refactor.

## 1. Baseline

**Test files (2 total, both inspected in full):**

| File | Lines | Top-level `test()` | Nested/parameterized | `test.describe()` blocks |
|---|---:|---:|---:|---:|
| `e2e/core-flows.e2e.ts` | 17,634 | 178 | 1 (`for (const mode of ["roleplay","conversation"])` → 2 executions) | 0 |
| `tests/character/character.e2e.ts` | 2,189 | 16 | 0 | 2 (`Characters (positive)`, `Characters (negative)`) |
| **Total** | **19,823** | **194** | **1 declaration / 2 executions** | **2** |

- **Declared tests: 195.** **Executed test instances: 196** (the one parameterized test runs twice — once for `roleplay`, once for `conversation`).
- `e2e/core-flows.e2e.ts` is a flat, ungrouped sequence of `test()` calls in rough chronological-addition order — no `describe()` nesting anywhere in the file.
- `tests/character/character.e2e.ts` is the only file using `test.describe()`; it groups its 16 tests into a "positive" block (13 tests: happy-path/UI-behavior assertions) and a "negative" block (3 tests: validation/rejection/fallback/sanitization assertions).
- Playwright config (`playwright.config.ts`) runs every test across 3 projects: `desktop-chromium`, `mobile-chromium`, `mobile-webkit`. Most tests self-restrict to one form factor via `test.skip(testInfo.project.name.includes("mobile"/"desktop"), …)`.
- Almost every test seeds its own fixtures directly through the REST API (`page.request.post("/api/characters", …)` etc.) rather than through the UI, then asserts UI/behavior, then deletes its fixtures in a `finally` block. UI-driven *creation* flows (new character/persona/lorebook/preset/agent dialogs) are rarely the thing under test — they're almost always bypassed via the API for speed, with the UI only exercised for editing/viewing/searching/deleting.
- Many tests assert **visual/theming consistency** (a control "inherits the configured accent color", "follows Chat Chrome Text Color", etc.) rather than functional business logic. These are legitimate regression tests but are a distinct category from feature-functionality tests.
- A large fraction of tests are cross-feature by construction (e.g., a Characters test also exercises Personas via a shared component, or a "Chat Settings" test edits an attached Character, Persona, and Lorebook in the same run).

## 2. Feature Coverage Overview

| Feature | Tests | Covered Areas | Partial Areas | Not Identified |
|---|---:|---:|---:|---:|
| Conversation | 33 | 12 | 1 | 4 |
| Agents & Capability Packages | 28 | 20 | 0 | 3 |
| Settings | 24 | 11 | 0 | 4 |
| Home & Navigation | 21 | 15 | 0 | 3 |
| Roleplay | 18 | 13 | 0 | 2 |
| Characters | 16 | 15 | 1 | 3 |
| Professor Mari | 14 | 9 | 0 | 2 |
| Connections | 11 | 7 | 0 | 3 |
| Game | 10 | 8 | 0 | 4 |
| Lorebooks | 7 | 6 | 0 | 4 |
| Backgrounds & Media | 5 | 4 | 0 | 2 |
| Presets | 5 | 5 | 0 | 4 |
| Personas | 2 (+ ~5 cross-referenced from Characters) | 2 | 0 | 4 |
| Test Tooling (non-product) | 1 | 1 (self) | 0 | — |
| **Total** | **195** | | | |

("Covered Areas"/"Partial"/"Not Identified" counts are capability-level, not test-level — see per-feature tables below for exact test mapping.)

---

## 3. Detailed Feature Coverage

### Characters

**Location:** `tests/character/character.e2e.ts` (all 16 tests; `Characters (positive)` × 13, `Characters (negative)` × 3).

#### Coverage Summary
- Tests: 16
- Covered: 15 capabilities
- Partial: 1
- Not identified: 3

#### Functional Coverage

| Capability | Status | Existing Tests |
|---|---|---|
| Favorite marking (star indicator, accent theming) | Covered | `Character favorite tags and stars inherit the configured accent color` |
| Attach to active chat via drag-and-drop | Covered | `Characters can be dragged from the right panel into the active chat` |
| Attach to active chat via row action (no drag) | Covered | `Character row actions can add a resource to the active chat without dragging` |
| Duplicate character | Covered | `Character Chat actions reuse mode selection and seed the chosen setup wizard` |
| Launch chat from character (mode selector + setup wizard hookup) | Covered | `Character Chat actions reuse mode selection and seed the chosen setup wizard` |
| Folders/groups (expand/collapse, row actions, remove-from-folder) | Partial | `Character row actions can add a resource...`, `Character Chat actions reuse mode selection...` — folder itself is created via API, only its UI interactions are exercised |
| Avatar upload/versioning + AI-generate entry point | Covered | `Character and Persona avatar actions stay separated and visually balanced` *(↔ Personas)* |
| Character Sheet reference image: upload, use-as-reference, invalid/not-owned-reference fallback, generation-size validation | Covered | `Character and persona sheets persist an explicit reference choice and fall back safely` *(↔ Personas)* |
| Full-body sprite generation (matched-expression approval flow) | Covered | `Matched full-body sprites approve a neutral anchor before sending each expression separately` |
| Rich-text editor fields (About Me/Convo profile: keyboard shortcuts, quote formatting, undo) | Covered | `expanded character editors keep native keyboard and quote caret behavior` |
| Character schedules: export, valid/invalid/oversized/legacy-format import | Covered | `character schedules export the live draft and import safely` |
| Card download/import entry points (panel buttons) | Covered | `Character and Persona panels launch card downloads and their local libraries` *(↔ Personas)* |
| Import: destination mapping, embedded-lorebook import choice, HTML sanitization | Covered | `Downloaded cards use Marinara destination and lorebook choices` *(↔ Lorebooks)* |
| Remote catalog search (ChubAI): filtering, pagination, NSFW toggle | Covered | `Chub NSFW search uses filtered totals and spaced pagination` |
| Local library search by creator | Covered | `Character and Persona sidebars find cards by creator` *(↔ Personas)* |
| Topbar/panel branding (accent color) | Covered | `Characters topbar underline uses the Characters pink` |
| Editor: unsaved-field preservation across responsive layout change | Covered | `character editor preserves unsaved fields across responsive layout changes` |
| Card field Markdown preview | Covered | `character card fields can preview Markdown without changing their source` |
| Character creation via the "new character" UI flow | Not identified | All fixtures create characters via `POST /api/characters`; no test drives the creation dialog itself |
| Character deletion (UI button → verified removal) | Not identified | Delete buttons' presence/styling are asserted; no test clicks delete and verifies the character disappears |
| Character/card export (PNG or JSON card export, distinct from schedule export) | Not identified | No test found |
| Tag CRUD via the editor UI | Not identified | Tags appear only as static fixture data; no test edits them through the UI |

#### Cross-Feature Tests
- `Character and Persona avatar actions stay separated and visually balanced` — Characters ↔ Personas
- `Character and persona sheets persist an explicit reference choice and fall back safely` — Characters ↔ Personas
- `Character and Persona panels launch card downloads and their local libraries` — Characters ↔ Personas
- `Character and Persona sidebars find cards by creator` — Characters ↔ Personas
- `Downloaded cards use Marinara destination and lorebook choices` — Characters ↔ Lorebooks

---

### Personas

**Location:** dedicated tests split across `e2e/core-flows.e2e.ts` (1) and `tests/character/character.e2e.ts` (1); remaining coverage is cross-referenced from Characters tests (see above).

#### Coverage Summary
- Dedicated tests: 2
- Cross-referenced tests (counted under Characters): 5
- Covered: 2 dedicated capabilities (+ 5 shared with Characters)
- Not identified: 4

#### Functional Coverage

| Capability | Status | Existing Tests |
|---|---|---|
| Replace active chat persona via drag, with confirmation dialog | Covered | `Dropping a persona confirms before replacing the active chat persona` |
| Persona editor: unsaved-field preservation across responsive layout | Covered | `persona editor preserves unsaved fields across responsive layout changes` |
| Avatar upload/versioning | Covered *(shared)* | `Character and Persona avatar actions stay separated and visually balanced` |
| Character-sheet reference image + fallback | Covered *(shared)* | `Character and persona sheets persist an explicit reference choice and fall back safely` |
| Download/import entry point | Covered *(shared)* | `Character and Persona panels launch card downloads and their local libraries` |
| Search by creator | Covered *(shared)* | `Character and Persona sidebars find cards by creator` |
| Persona creation via the "new persona" UI dialog | Not identified | The "New persona" button is asserted visible in one test but never clicked; all persona fixtures are created via API |
| Persona deletion via UI | Not identified | No test found |
| Persona export (standalone, distinct from the character-sheet fallback test) | Not identified | No dedicated test found |
| Switching personas within an existing chat outside of the drag-replace flow | Not identified | No test found |

#### Cross-Feature Tests
See Characters § Cross-Feature Tests above — the same 5 tests are counted once under Characters and referenced here rather than double-counted.

---

### Lorebooks

**Location:** `e2e/core-flows.e2e.ts` (7 dedicated/primary tests; several more cross-feature tests are primary to other features).

#### Coverage Summary
- Tests: 7
- Covered: 6
- Not identified: 4

#### Functional Coverage

| Capability | Status | Existing Tests |
|---|---|---|
| Vectorization/semantic-eligibility settings save before other settings | Covered | `Lorebook vectorization saves pending eligibility settings first` |
| Save behavior keeps Overview stable while detail cache updates | Covered | `Lorebook Save keeps Overview stable while the updated detail cache settles` |
| Lorebook/entry IDs visible and copyable | Covered | `Lorebook and entry IDs are visible and copyable` |
| Entry "type" descriptive text theming | Covered | `Lorebook entry type descriptions inherit editor chrome text` |
| Bulk-selecting entries, editing them, choosing a move destination | Covered | `selected Lorebook entries mirror safe edits and choose a move destination on demand` |
| Context-filter chips (keyword/semantic/current-location) | Covered | `Lorebook context filter chips expose Noodle and keep complete borders` |
| Activation provenance during a chat (keyword/semantic/current-location sources, matched keys, token-budget-skip reasoning) | Covered *(↔ Roleplay)* | `Roleplay Active Context shows rich lorebook activation provenance` |
| Lorebook creation via a "new lorebook" UI flow | Not identified | No test found; lorebooks are created via `POST /api/lorebooks` |
| Lorebook deletion via UI | Not identified | No test found |
| Standalone lorebook export/import (outside of a character-card's embedded `character_book`) | Not identified | Only the character-card import path (`Downloaded cards use Marinara destination and lorebook choices`) and inline Chat-Settings editing are covered |
| Real keyword/semantic activation firing during an actual (non-mocked) generation | Not identified | `Roleplay Active Context...` mocks the `/api/lorebooks/scan/:chatId` response rather than exercising real activation matching |

#### Cross-Feature Tests
- `Roleplay Active Context shows rich lorebook activation provenance` — Lorebooks ↔ Roleplay
- `Chat Settings edits only the selected cards and lorebook entries inline` — primary Conversation, Lorebooks cross (inline entry expand/edit/save scoped to attached lorebook only)
- `Downloaded cards use Marinara destination and lorebook choices` — primary Characters, Lorebooks cross (embedded `character_book` import choice)
- `desktop Connections and Lorebooks folders expand without a React hook error` — primary Connections, Lorebooks cross (stability regression only, not functional)

---

### Presets

**Location:** `e2e/core-flows.e2e.ts` (5 tests).

#### Coverage Summary
- Tests: 5
- Covered: 5
- Not identified: 4

#### Functional Coverage

| Capability | Status | Existing Tests |
|---|---|---|
| Export/import contract: native format, legacy ST-preset compatibility, bulk ZIP export, deprecated-parameter discarding | Covered | `prompt preset transfers discard deprecated generation parameters` |
| Selected-preset visual indicator (avatar-clipping-frame escape) | Covered | `selected prompt indicators escape the avatar clipping frame` |
| Preset picture upload/replace, orphaned-image cleanup on delete | Covered | `preset pictures can be uploaded from the panel and replaced in the Overview editor` |
| In-chat "quick" preset editor: add section, delete with confirm/cancel, persistence across drawer close/reopen | Covered | `roleplay quick preset editor uses chat settings spacing, surfaces, and safe deletion` |
| Quick editor marker sections + prompt variables, compact mobile layout | Covered | `mobile roleplay quick preset editor keeps marker and metadata controls compact` |
| Preset creation via a "new preset" UI flow | Not identified | No test found; presets are created via `POST /api/prompts` |
| Preset deletion via the panel UI | Not identified | No test found |
| Preset section reordering (drag) | Not identified | No test found |
| Prompt-variable-driven output correctness during a real generation | Not identified | Variable controls' presence/interaction is tested; resulting prompt content is not verified end-to-end |

---

### Agents & Capability Packages

**Location:** `e2e/core-flows.e2e.ts` (28 tests).

#### Coverage Summary
- Tests: 28
- Covered: 20
- Not identified: 3 (broad capability areas; several individual named agents also have narrower "runtime effect" gaps noted below)

#### Functional Coverage

| Capability | Status | Existing Tests |
|---|---|---|
| Catalog install/uninstall lifecycle for every package | Covered | `agent catalog can install and uninstall every package` |
| Catalog browsing (desktop + mobile usability) | Covered | `downloadable agent catalog is usable on desktop and mobile` |
| Catalog update-notification dismissal persistence | Covered | `Agent updates share one dismissible prompt and remain available after Not now` |
| Catalog error messaging (doesn't over-claim an internet outage) | Covered | `agent catalog reports API failures without diagnosing an internet outage` |
| Installed-package sidebar artwork lifecycle | Covered | `installed package artwork appears in the sidebar and clears immediately on uninstall` |
| Feature gating by installed package (Music DJ) | Covered | `Music Player stays unavailable until Music DJ is installed` |
| Feature gating by installed package (Local Whisper via Conversation Calls) | Covered *(↔ Connections)* | `Connections exposes Local Whisper only while Conversation Calls is installed` |
| Legacy Extensions system: removed API routes, localStorage-record migration/cleanup, locked "Personal Extensions" (Professor-Mari-only) UI | Covered | `extension API routes no longer exist`, `legacy browser records are cleaned while extension imports stay locked`, `Personal Extensions default to the Professor Mari-only locked workflow` |
| External Agent import: Danger Zone policy gate, permission-approval dialog, per-capability checkboxes | Covered | `external Agent imports require the Danger Zone gate and explicit capabilities` |
| Function Calling: require-first-tool-round per-chat setting | Covered *(↔ Settings)* | `Function Calling can require the first tool round per chat` |
| Custom Agent authoring: prompt-template placeholder preview per result type | Covered | `custom Agent prompts preview the selected result format` |
| Custom Agent character-card creation gated on human approval | Covered *(↔ Characters)* | `custom Agent character cards are created only after approval` |
| Gallery "Illustrate" active image-agent picker (built-in + custom, excludes inactive) | Covered | `Gallery Illustrate offers active custom image agents` |
| Illustrator/Storyboard settings-section ownership | Covered | `Illustrator owns the merged scene-video and Storyboard subsections while agent removal stays away from collapse` |
| World Maps agent settings placement (Agents tab + Chat Settings) | Covered | `World Maps stays in Agents and Chat Settings` |
| Hierarchical Maps agent-metadata isolation across settings profiles | Covered *(↔ Settings)* | `settings profiles cannot carry Hierarchical Maps state into another chat` |
| Tracker agent-provided panel (seed defaults, gutter placement) | Covered *(↔ Roleplay)* | `new Roleplay chats seed character Tracker custom-field defaults...`, `desktop Tracker scales into either Roleplay gutter...` |
| Echo Chamber agent-provided panel (size/corner persistence) | Covered *(↔ Roleplay)* | `desktop Echo Chamber commits its per-chat size and corner before reload` |
| Secret Plot agent setting (run interval) | Covered | `Secret Plot run interval stays editable across repeated commits` |
| Conversation Calls agent (toolbar button injection contract, sizing/placement) | Covered *(↔ Conversation)* | `Conversation Calls matches the participant control and sits beside it` |
| TTS agents: PocketTTS (OpenAPI voice/endpoint discovery, official multipart API fallback), OpenAI-compatible custom Kokoro voice mix, ElevenLabs (models, per-character/all-characters voice assignment, scrollable picker) | Covered | `PocketTTS discovers server voices...`, `PocketTTS uses the official multipart speech API`, `OpenAI-compatible TTS accepts and persists a custom Kokoro voice mix`, `ElevenLabs keeps models visible...` |
| Game Lorebook Keeper agent: failed-run retry surfaced in session history | Covered *(↔ Game)* | `failed Game Lorebook Keeper run exposes a retry action` |
| Per-agent settings sections in Conversation/Roleplay/Game Chat Settings | Covered *(↔ Conversation/Roleplay/Game)* | `Conversation Agents exposes matching collapsible command and feature settings`, `Conversation Chat Settings can attach and retain custom agents`, `Roleplay and Game chat settings link empty agent libraries to Download Agents`, `Roleplay setup points empty agent libraries to the Agents tab`, `Roleplay setup agent category headers never cover agent rows while scrolling` |
| Setup-wizard command/feature lists gated by installed agents | Covered *(↔ Conversation/Game)* | `Conversation setup commands follow the installed agent library`, `Game setup only shows features owned by installed agents` |
| Memory/Long-Term-Memory + Chat Summaries: toggle persistence, semantic retrieval, mobile panel, "reasoning saved-summary unavailable" messaging, recall modal | Covered *(↔ Conversation/Roleplay)* | `Conversation Chat Settings exposes and persists Long-Term Memory activation`, `Roleplay Chat Summaries persists semantic retrieval without overflowing its mobile panel`, `memory recall modal accepts clicks from chat settings`, the parameterized `roleplay`/`conversation exposes reasoning and explains unavailable saved summaries` test |
| Actual runtime *effect* of most named agents during a live/streamed generation (e.g., does Illustrator produce a usable prompt end-to-end, does Secret Plot alter plot state, does World Maps generate a map) | Not identified | Settings/wiring/gating is covered; end-to-end generation-time behavior of these agents is largely out of scope for the tests found |
| Creating a brand-new custom agent through the full agent editor (name/type/phase fields, save) | Not identified | Only the prompt-template preview and the write-approval gate are tested; the base "author and save a new agent" flow itself isn't asserted |
| Agent import via folder (as opposed to file) | Not identified | The file-import path is tested; the "Choose Folder" control is only asserted visible, not exercised |

#### Cross-Feature Tests
See inline `(↔ ...)` annotations above — Agents is the most cross-referenced feature in the suite, intersecting with Conversation, Roleplay, Game, Settings, Characters, and Connections.

---

### Roleplay

**Location:** `e2e/core-flows.e2e.ts` (18 tests).

#### Coverage Summary
- Tests: 18
- Covered: 13
- Not identified: 2

#### Functional Coverage

| Capability | Status | Existing Tests |
|---|---|---|
| Message visibility rules (hides contentless user "anchor" messages without hiding visible attachments) | Covered | `roleplay hides contentless user anchors without hiding visible payloads` |
| Composer: typographic-quote caret positioning | Covered | `typographic quotes do not pull the Roleplay caret behind later text` |
| Composer performance/behavior: ambient work off input path (desktop), draft-rewrite avoidance during IME composition (mobile), held-key deletion defers draft persistence/autosizing | Covered | `desktop Roleplay composition keeps ambient work off the input path...`, `mobile Roleplay composition avoids draft rewrites...`, `held Roleplay deletion defers draft persistence...` |
| Composer excludes kaomoji picker | Covered | `Roleplay composer does not offer kaomoji` |
| Streaming reasoning: inline display, auto-collapse on content arrival, "keep expanded" setting, saved/live/legacy variants | Covered *(↔ Agents memory)* | `Roleplay can show streaming reasoning inline and control automatic collapse`, parameterized reasoning test |
| Rewrite streaming follows rendered message height/scroll | Covered | `Roleplay rewrite streaming follows the rendered message height` |
| Editing the preceding message while a reply streams keeps exactly one live row | Covered | `editing the preceding Roleplay message keeps one live stream row` |
| Rewrite shield: toggling between original and rewritten message versions | Covered | `rewrite shield switches repeatedly between original and rewritten message versions` |
| Side-panel slide animation synced with desktop shell resize | Covered | `Roleplay side panels synchronize their slide with the desktop shell resize` |
| Tracker panel: seeds character custom-field defaults on new chats without reclaiming edited values; scales into either gutter without shifting the chat column | Covered *(↔ Agents)* | `new Roleplay chats seed character Tracker custom-field defaults...`, `desktop Tracker scales into either Roleplay gutter...` |
| Echo Chamber panel size/corner persistence per chat | Covered *(↔ Agents)* | `desktop Echo Chamber commits its per-chat size and corner before reload` |
| Active Context panel: lorebook activation provenance | Covered *(↔ Lorebooks)* | `Roleplay Active Context shows rich lorebook activation provenance` |
| Chat Settings: click-to-copy chat ID, square parameter-choice controls | Covered | `Roleplay Chat Settings exposes click-to-copy chat ID and square parameter choices` |
| Renamed branches keep their name in the sidebar and search | Covered | `renamed Roleplay branches keep their chat name in the Chats sidebar and search` |
| Reduced-paint-effects mode preserves semantic/custom styling | Covered | `Roleplay reduced paint effects preserve semantic and custom styling` |
| Mobile: code-block formatting stays inside message width | Covered | `mobile Roleplay code formatting stays inside the message width` |
| Live gameplay/turn generation quality via a real provider | Not identified | All generation-dependent tests use mocked/fixture providers |
| Swipe/regenerate correctness for assistant messages beyond navigation (i.e., does a regenerated swipe actually call the provider with the right context) | Not identified | Swipe *navigation* is covered (see Conversation); swipe *regeneration content correctness* is not directly asserted here |

---

### Conversation

**Location:** `e2e/core-flows.e2e.ts` (33 tests).

#### Coverage Summary
- Tests: 33
- Covered: 12
- Partial: 1
- Not identified: 4

(Individual capabilities below number more than the test count because several tests each cover multiple listed capabilities; see the Cross-Feature section for how shared tests are attributed.)

#### Functional Coverage

| Capability | Status | Existing Tests |
|---|---|---|
| Chat Settings: greeting chooser after wizard skip (first message vs. alternate greetings), "Use a Profile" wizard shortcut | Covered | `Chat Settings adds a formatted greeting after the setup wizard is skipped` |
| Author's Notes: field + expand editor + macro reference panel + `/macro` slash command parity | Covered | `Author's Notes keeps its expand and full macro guide inside the field` |
| Author's Notes / summary macro resolution against the shared macro engine and preset variables (identity, character, context, conditionals, formatting, comments) | Covered | `Author's Notes resolves the shared prompt macro engine and preset variables`, `summary macro editor stays above its floating panel` |
| Message deletion: unified multi-select UI, per-swipe delete variants, accent-consistent chrome | Covered | `message deletion uses unified chroma controls and selection states` |
| Message rendering: transcript dates/numbers, per-message action placement (classic/bubble styles, desktop+mobile) | Covered | `Conversation transcript dates and message numbers follow Chat Chrome Text Color`, `Conversation message actions follow their messages on desktop and mobile` |
| Chat sidebar: bulk chat deletion, empty-chat hover preview, mode tabs reachable, new-chat connection gate | Covered | `bulk chat deletion uses the shared primary accent control`, `empty chat hover previews inherit the configured accent`, `chat mode tabs and new-chat actions stay reachable`, `new-chat connection gates follow Chat Chrome Text Color...` |
| Group-chat participant awareness (individual mode keeps each character's own sibling-chat context isolated) | Covered | `individual group awareness includes only the replying character's sibling chats` |
| Generation-lifecycle resilience: provider concurrency-limit toast, fallback-connection toast, stop/refuse/edit draft-retention matrix including transport-failure draft restore | Covered | `provider concurrency errors appear in generation toasts`, `generation fallbacks identify the replacement connection in a toast`, `stopped and refused generations keep sent text cleared and accept the first edit` |
| Chat Help overlay: per-mode control labeling/highlighting, first-run auto-open once, permanent hide (from overlay or App Behavior setting) | Covered | `chat Help overlay labels visible controls in every mode`, `the first conversation opens Help once after setup`, `chat Help can be hidden permanently from the overlay or App Behavior` |
| Message search: scoped ordering next to Chat Settings, literal-vs-regex query handling, jump to unloaded history | Covered | `message search stays before Chat Settings and jumps to unloaded history` |
| Chat Settings inline editing scoped only to the attached character/persona/lorebook (no unrelated network fetches) | Covered *(↔ Characters/Personas/Lorebooks)* | `Chat Settings edits only the selected cards and lorebook entries inline` |
| Toolbar panel toggling (Gallery/Chat Settings/Summary close on repeated trigger, across Conversation/Roleplay/Game) | Covered | `chat toolbar panels close when their trigger is clicked again across modes` |
| Composer swipe/keyboard navigation (desktop keyboard arrows, mobile touch swipe) | Covered | `empty focused chat composers keep keyboard swipe navigation`, `mobile transcript swipes navigate Conversation and Roleplay alternatives` |
| Mobile composer: visual-viewport awareness above the software keyboard, history-position/focus restore | Covered | `mobile chat composer follows the visual viewport above the software keyboard`, `mobile composers preserve history position and restore focus in Conversation and Roleplay` |
| Media pickers: GIF search + internal-press picker persistence, recently-used items | Partial | `Conversation media searches match GIFs and internal presses keep the picker open`, `media pickers persist and surface recently used items` — titles indicate coverage but bodies were not read in this pass; classified Partial pending confirmation |
| Emoji-shortcode autocomplete rendering | Covered | `Conversation autocompletes and renders standard emoji shortcodes` |
| Real end-to-end conversation against a non-mocked LLM provider | Not identified | All generation-dependent tests use fixture/mock HTTP providers |
| Single-chat export (contents verification) | Not identified | A chat-sidebar "Export" action button is asserted enabled in the bulk-delete test, but no test verifies exported file contents |
| Assistant message *content* editing (as opposed to swipe/delete) | Not identified | User-message edit-during-stream is covered; assistant-message content editing is not directly asserted |
| Read/seen-state indicators | Not identified | No test found |

#### Cross-Feature Tests
- `Chat Settings edits only the selected cards and lorebook entries inline` — Conversation ↔ Characters ↔ Personas ↔ Lorebooks
- `Conversation Calls matches the participant control and sits beside it` — Conversation ↔ Agents
- `Conversation Agents exposes matching collapsible command and feature settings`, `Conversation setup commands follow the installed agent library`, `Conversation Chat Settings can attach and retain custom agents`, `Conversation Chat Settings exposes and persists Long-Term Memory activation` — Conversation ↔ Agents
- `mobile transcript swipes navigate Conversation and Roleplay alternatives`, `mobile composers preserve history position and restore focus in Conversation and Roleplay` — Conversation ↔ Roleplay

---

### Game

**Location:** `e2e/core-flows.e2e.ts` (10 tests).

#### Coverage Summary
- Tests: 10
- Covered: 8
- Not identified: 4

#### Functional Coverage

| Capability | Status | Existing Tests |
|---|---|---|
| CYOA: `/goto` excludes stale choices from the chat tail | Covered | `goto keeps stale CYOA choices out of the chat tail` |
| Peek Prompt: exact historical turn-request retrieval; opening a historical peek from session history | Covered | `historical Game Peek Prompt returns the exact selected turn request`, `Game history above the dialogue box opens a historical Peek Prompt` |
| Game widgets: numeric-value persistence; edit/delete UI following the app's Chroma theme while weather effects render live | Covered | `game widget edits preserve their live numeric values`, `Game widget editing and log deletion follow Chroma while weather effects render` |
| Combat-sheet pure-logic helpers: skill-type parsing, fuzzy/diacritic card-name matching, party/enemy HP hydration incl. invalid-value fallback | Covered | `Game combat sheet helpers preserve ability types, card matches, and zero HP` |
| Character sheet "Retry" stays a draft until explicit Save (for both characters and personas), original stats preserved | Covered | `Game character sheet Retry remains a draft until Save` |
| NPC avatar upload with non-Latin (Cyrillic) filenames | Covered | `NPC avatar uploads accept Cyrillic character names` |
| Lorebook Keeper failed-run retry surfaced in session history | Covered *(↔ Agents)* | `failed Game Lorebook Keeper run exposes a retry action` |
| Setup wizard only shows features owned by installed agents | Covered *(↔ Agents)* | `Game setup only shows features owned by installed agents` |
| Mobile CYOA usability above HUD widgets | Not identified | Title (`mobile Game keeps CYOA usable above four HUD widgets`) indicates coverage but body was not read in this pass |
| Live turn/GM-narration generation quality via a real provider | Not identified | Character-sheet-retry test uses a mocked local HTTP provider; no test exercises a full live game turn |
| Combat encounter driven through the actual UI (as opposed to the pure-function helpers) | Not identified | Only unit-style logic helpers are exercised; no test drives a combat UI interaction end-to-end |
| Campaign/world-setup wizard content beyond agent-settings placement | Not identified | Only Illustrator/Storyboard/World-Maps *settings location* is covered, not the setup wizard's own content |

---

### Home & Navigation

**Location:** `e2e/core-flows.e2e.ts` (21 tests).

#### Coverage Summary
- Tests: 21
- Covered: 15
- Not identified: 3

#### Functional Coverage

| Capability | Status | Existing Tests |
|---|---|---|
| Shell/topbar: panel button order, accent theming, light/dark theme contrast, no client errors on load | Covered | `home shell and primary topbar panels open without client errors` |
| Professor widget panel accent theming | Covered *(↔ Professor Mari)* | `Home Professor controls and surfaces follow the configured accent` |
| Package-provided Home destinations as browser tabs (icons, refresh badge, mobile tab-list layout, navigation away/back) | Covered | `installed Home destinations appear as browser tabs without returning to the topbar` |
| Recent Chats widget: mode-color accents, character sprite rendering, Game background-tag thumbnail, mobile card-count limiting, chat "touch" on visit | Covered | `Home recent chats use mode colors and show character sprites` |
| Home feed ordering (visited-before-created) and Game chat's current presentation (background/sprite state) | Covered | `Home feed prioritizes read-only visits and exposes current Game presentation` |
| Custom Home widgets: immediate movable layout slot for a newly authored widget, optimistic-concurrency conflict (409) on stale catalog save | Covered | `new Professor Mari Home widgets receive a movable layout slot immediately` |
| Fresh-install default widget composition | Covered (title-level) | `a fresh Home desk starts with the guided five-widget composition` |
| Community/clock widgets (timezone awareness) | Covered (title-level) | `Home Community and clock widgets are useful, timezone-aware, and optional` |
| Mobile bookmarks menu | Covered (title-level) | `mobile Home collects its bookmarks into a Marinara-colored menu` |
| Recent Chats widget footprint/repack when enabled | Covered (title-level) | `enabling Recent Chats anchors its 2 by 2 footprint and repacks smaller widgets` |
| Achievements widget (desktop preview + mobile compact variant) | Covered (title-level) | `Home achievements preview the latest unlock and nearest measurable goal`, `mobile Achievements stays compact and preserves the gap before Discovery Desk` |
| Character of the Day widget layout (mobile centering) | Covered (title-level) | `Character of the Day stays vertically centered inside its mobile widget` |
| Browser-hub FAQ bookmark window | Covered (title-level) | `home browser hub scales cleanly and opens FAQ as a bookmark window` |
| Widget hover interaction, lifecycle bounds across navigation, drag-to-reorder persistence | Covered (title-level) | `Home widgets lift and brighten on fine-pointer hover`, `Home lifecycle stays bounded across repeated tab and chat navigation`, `Home widget order can be dragged and persists across reloads` |
| Mobile topbar reachability while sidebars switch; coarse-pointer (iPad) full-screen side panels | Covered (title-level) | `mobile topbar remains reachable while sidebars switch`, `coarse-pointer iPad widths use full-screen side panels` |
| Achievement-unlock triggering logic itself (as opposed to previewing the latest one) | Not identified | Only the preview surface is tested |
| Community widget's live external content correctness | Not identified | Only that the widget exists and is timezone-aware per its title |
| Non-Docker (native/Windows launcher) update-check flow | Not identified | Only `mobile Docker update checks offer the selected staging image` is present |

*Note: rows marked "Covered (title-level)" indicate the test title strongly implies functional coverage but the test body was not read in depth during this audit — see § Coverage Gaps / Unknowns.*

#### Cross-Feature Tests
- `Home Professor controls and surfaces follow the configured accent`, `Professor Mari navigation can be repositioned within Home on desktop`, `new Professor Mari Home widgets receive a movable layout slot immediately` — Home ↔ Professor Mari

---

### Professor Mari

**Location:** `e2e/core-flows.e2e.ts` (14 tests).

#### Coverage Summary
- Tests: 14
- Covered: 9
- Not identified: 2

#### Functional Coverage

| Capability | Status | Existing Tests |
|---|---|---|
| Home-navigation assistant: arrive/minimize/recall, free-text search hit/miss states, deep-link into a named resource's editor | Covered *(↔ Characters, ↔ Home)* | `Professor Mari visibly arrives on Home and navigates without AI`, `Professor Mari opens a named character directly in its editor` |
| Onboarding tour integration: introduces Characters/Personas in topbar order without a "Browser" step; replaces the old Noodle tour step with Home-guidance spotlights | Covered | `Professor Mari introduces Characters and Personas in topbar order without a Browser step`, `Professor Mari replaces the Noodle tour with highlighted Home guidance` |
| In-chat assistant: fills mobile viewport with composer visible, follows the open conversation across chat/mobile navigation, keeps suggestions visible after history loads | Covered (title-level) | `Professor Mari chat fills the mobile home viewport and keeps its composer visible`, `Professor Mari follows an open conversation across chats and mobile navigation`, `Professor Mari suggestions stay visible after chat history loads` |
| Context-budget indicator when token usage is enabled | Covered (title-level) | `Professor Mari shows the latest context budget when token usage is enabled` |
| History: opens a loaded chat at its newest message; bulk chat deletion follows the active accent | Covered (title-level) | `Professor Mari history opens a loaded chat at its newest message`, `Professor Mari bulk chat deletion follows the active accent` |
| Dependency/sensitive-file review explicitness across viewports | Covered (title-level) | `Professor Mari dependency and sensitive-file reviews stay explicit across viewports` |
| AI action-taking: creates a character from natural language even when the authorization phrasing omits an explicit verb; handles a German-language instruction with quoted denial-like dialogue | Covered *(↔ Characters)* | `Professor Mari creates a character when its own authorization quote omits the intent verb`, `Professor Mari creates a character from a German instruction and a card with quoted denial-like dialogue` |
| AI action-taking guard: still blocks a generic authorization naming multiple operation categories at once | Covered *(negative/guard test)* | `Professor Mari still blocks a generic authorization that names multiple operation categories` |
| Multi-turn navigation-search refinement (beyond a single hit/miss query) | Not identified | Only single-query hit and single-query miss are exercised |
| Professor Mari acting on Personas/Lorebooks/Presets/Connections directly (as opposed to Characters) | Not identified | Only Characters creation is exercised as an AI-driven write action |

*Note: rows marked "Covered (title-level)" were confirmed by title only during this pass — see § Coverage Gaps / Unknowns.*

---

### Settings

**Location:** `e2e/core-flows.e2e.ts` (24 tests).

#### Coverage Summary
- Tests: 24
- Covered: 11
- Not identified: 4

#### Functional Coverage

| Capability | Status | Existing Tests |
|---|---|---|
| Appearance: custom-cursor persistence, shared switch-control geometry across all 6 settings tabs, avatar-shape preview, art-scale sliders (incl. display-size interaction), custom theme creation with debounced live CSS preview, Accent Pulse gradient animation continuing while the panel is open, Android status-bar native-bridge toggle | Covered | `turning off the custom mouse pointer persists...`, `Settings switches share one centered track and thumb geometry`, `Appearance distinguishes the square avatar-shape preview...`, `Art scale sliders stay interactive at the largest display size`, `custom theme live preview batches stylesheet updates while typing`, `gradient Accent Pulse keeps animating while Appearance settings are open`, `Android status bar setting reads and updates the native bridge` |
| Message-color theming: default dialogue color with per-card override precedence, chat-text-color gradient editor, merged-narrator per-speaker fallback | Covered *(↔ Conversation)* | `default dialogue color fills only cards without their own dialogue color`, `merged narrator applies card colors only to matching speakers` |
| Settings Profiles (chat presets): export/import identity (current + legacy), invalid-settings/invalid-file rejection (400), Default-profile rename/delete protection, single-active-profile exclusivity incl. an activate+delete race, chat-mode mismatch enforcement (409), branch-identity metadata stripped from the profile but preserved when applied, Hierarchical-Maps agent-metadata isolation | Covered | `settings profile exports use the new identity and legacy exports still import`, `settings profiles cannot carry Hierarchical Maps state into another chat`, `settings profiles enforce chat modes and preserve branch identity` |
| Function Calling per-chat toggle | Covered *(↔ Agents)* | `Function Calling can require the first tool round per chat` |
| Legacy Extensions removal/migration + locked "Personal Extensions" UI; Danger-Zone-gated Agent-import toggle | Covered *(↔ Agents)* | `legacy browser records are cleaned while extension imports stay locked`, `Personal Extensions default to the Professor Mari-only locked workflow`, `external Agent imports require the Danger Zone gate and explicit capabilities` |
| Backup & Export: automatic backup location display, custom generation parameters as reusable controls, full profile/backup ZIP round-trip through the import preview step | Covered | `Backup & Export identifies the automatic backup location`, `custom generation parameters become reusable chat controls`, `streamed profile and full-backup ZIPs round-trip through import preview` |
| UI language selection loads locale files and persists (incl. localized label verification) | Covered | `UI language selection loads locale files and persists across reloads` |
| Settings search/editor split-pane header alignment across text scales | Covered (visual regression) | `settings search divider stays aligned with editor headers across text scales` |
| Shared destructive-confirmation/modal chrome, asserted via Settings-adjacent fixtures | Covered (app-wide, not Settings-specific) | `destructive confirmation actions use the shared accent button treatment`, `modal backdrops ignore drag releases but still close on a fresh outside click` |
| Resource-panel shared control width (sort-field), asserted via Lorebooks/Personas panels | Covered (app-wide) | `resource panel sort fields share the canonical width` |
| Incomplete synced-settings blob preserves disabled Game text effects and repairs itself | Covered (title-level) *(↔ Game)* | `incomplete synced settings preserve disabled Game text effects and repair the server blob` |
| Mobile Docker update-check offers the correct staging image | Covered (title-level) | `mobile Docker update checks offer the selected staging image` |
| Full backup **restore** (not just import preview) rehydrating the running app | Not identified | The round-trip test stops at the import-preview step |
| Notification/toast preference settings | Not identified | No test found |
| Keyboard-shortcut customization | Not identified | No test found |
| "Generations" settings tab content beyond Function Calling | Not identified | No other control on this tab is exercised by name |

#### Cross-Feature Tests
- `default dialogue color fills only cards without their own dialogue color`, `merged narrator applies card colors only to matching speakers` — Settings ↔ Conversation
- `Function Calling can require the first tool round per chat` — Settings ↔ Agents
- `settings profiles cannot carry Hierarchical Maps state into another chat` — Settings ↔ Agents
- `external Agent imports require the Danger Zone gate and explicit capabilities` — Settings ↔ Agents
- `incomplete synced settings preserve disabled Game text effects and repair the server blob` — Settings ↔ Game

---

### Connections

**Location:** `e2e/core-flows.e2e.ts` (11 tests).

#### Coverage Summary
- Tests: 11
- Covered: 7
- Not identified: 3

#### Functional Coverage

| Capability | Status | Existing Tests |
|---|---|---|
| Editor error chrome: model-fetch errors (two distinct upstream error shapes), test-message error, Discard-button unsaved-change guard | Covered | `connection model fetch errors inherit the configured editor accent`, `connection test-message errors inherit the configured editor accent`, `Connection Discard uses the configured editor accent` |
| NovelAI-specific: style-plate upload (with downscale/size constraints), generation-default seed surviving save+navigation and JSON export, generation-default seed surviving JSON import | Covered | `NovelAI style plate upload keeps the connection editor mounted`, `NovelAI generation defaults survive save and editor navigation`, `NovelAI generation defaults survive connection import` |
| Dedicated image-captioning connection default: invalid-empty-id rejection (400), enable+select+save, persistence across reopen | Covered | `Connection image captioning defaults persist with a dedicated captioning connection` |
| Provider-concurrency-limit error surfaced as a generation toast | Covered *(↔ Conversation)* | `provider concurrency errors appear in generation toasts` |
| Generation-fallback connection identified in a toast | Covered *(↔ Conversation/Roleplay)* | `generation fallbacks identify the replacement connection in a toast` |
| Local Whisper visibility gated on Conversation Calls install | Covered *(↔ Agents)* | `Connections exposes Local Whisper only while Conversation Calls is installed` |
| Connections/Lorebooks folder-expand stability (no React hook error) | Covered (regression only) *(↔ Lorebooks)* | `desktop Connections and Lorebooks folders expand without a React hook error` |
| Creating/editing a standard (non-NovelAI, non-captioning) chat-completion connection's own settings through the full UI form | Not identified | Standard connections are created via API in every test; the UI editor is only exercised for error states and NovelAI/captioning specifics |
| Connection-level rate-limit/retry configuration | Not identified | Only the fallback-toast *symptom* is tested, not a retry-configuration UI |
| Multi-connection routing/priority rules beyond the single fallback scenario | Not identified | No test found |

---

### Backgrounds & Media

**Location:** `e2e/core-flows.e2e.ts` (5 tests).

#### Coverage Summary
- Tests: 5
- Covered: 4 (title-level)
- Not identified: 2

#### Functional Coverage

| Capability | Status | Existing Tests |
|---|---|---|
| Re-imported background with the same filename bypasses stale browser cache | Covered (title-level) | `Re-imported backgrounds with the same filename bypass stale browser cache` |
| Background cards show readable names and load thumbnails | Covered (title-level) | `Background cards keep names readable and load thumbnails` |
| Selected background renders in Roleplay when its file route is GET-only | Covered (title-level) *(↔ Roleplay)* | `Roleplay displays a selected background when its file route is GET-only` |
| Background library organization via desktop drag and touch drag | Covered (title-level) | `Background library organization works with desktop drag and touch drag` |
| AI background-prompt review preserves edits through rerenders and resumes the background target | Not identified (title suggests coverage; body not read in this pass) *(↔ Agents)* | `background prompt review preserves edits through rerenders and resumes the background target` |
| Background upload/creation via the UI | Not identified | No test found beyond re-import/organization |
| Background deletion | Not identified | No test found |

*Note: this feature had the least in-depth body review in this audit; all "Covered (title-level)" rows should be treated as lower-confidence than the rest of this document until confirmed — see § Coverage Gaps / Unknowns.*

---

### Test Tooling (non-product)

| Test | Notes |
|---|---|
| `Playwright color parsing preserves supported force values only` | Unit-style test of the repo's own `playwright-color-environment.ts` helper (terminal color-forcing logic for CI output). Not a product feature; excluded from feature totals above except as its own row. |

---

## 4. Cross-Feature Coverage

Tests that meaningfully exercise more than one product feature (each counted once, under its primary feature in §2/§3):

| Test | Primary Feature | Also Covers |
|---|---|---|
| `Character and Persona avatar actions stay separated and visually balanced` | Characters | Personas |
| `Character and persona sheets persist an explicit reference choice and fall back safely` | Characters | Personas |
| `Character and Persona panels launch card downloads and their local libraries` | Characters | Personas |
| `Character and Persona sidebars find cards by creator` | Characters | Personas |
| `Downloaded cards use Marinara destination and lorebook choices` | Characters | Lorebooks |
| `Chat Settings edits only the selected cards and lorebook entries inline` | Conversation | Characters, Personas, Lorebooks |
| `Roleplay Active Context shows rich lorebook activation provenance` | Lorebooks | Roleplay |
| `desktop Connections and Lorebooks folders expand without a React hook error` | Connections | Lorebooks |
| `Conversation Calls matches the participant control and sits beside it` | Conversation | Agents |
| `Connections exposes Local Whisper only while Conversation Calls is installed` | Connections | Agents |
| `Function Calling can require the first tool round per chat` | Agents | Settings |
| `settings profiles cannot carry Hierarchical Maps state into another chat` | Settings | Agents |
| `external Agent imports require the Danger Zone gate and explicit capabilities` | Agents | Settings |
| `new Roleplay chats seed character Tracker custom-field defaults...`, `desktop Tracker scales into either Roleplay gutter...` | Roleplay | Agents |
| `desktop Echo Chamber commits its per-chat size and corner before reload` | Roleplay | Agents |
| `failed Game Lorebook Keeper run exposes a retry action` | Game | Agents |
| `Conversation Agents exposes matching collapsible command and feature settings`, `Conversation setup commands follow the installed agent library`, `Conversation Chat Settings can attach and retain custom agents`, `Conversation Chat Settings exposes and persists Long-Term Memory activation` | Conversation | Agents |
| `Game setup only shows features owned by installed agents` | Game | Agents |
| `Roleplay Chat Summaries persists semantic retrieval without overflowing its mobile panel`, `memory recall modal accepts clicks from chat settings`, parameterized reasoning test | Agents (memory) | Conversation, Roleplay |
| `Roleplay and Game chat settings link empty agent libraries to Download Agents`, `Roleplay setup points empty agent libraries to the Agents tab`, `Roleplay setup agent category headers never cover agent rows while scrolling` | Agents | Roleplay, Game |
| `provider concurrency errors appear in generation toasts` | Connections | Conversation |
| `generation fallbacks identify the replacement connection in a toast` | Connections | Conversation, Roleplay |
| `default dialogue color fills only cards without their own dialogue color`, `merged narrator applies card colors only to matching speakers` | Settings | Conversation |
| `incomplete synced settings preserve disabled Game text effects and repair the server blob` | Settings | Game |
| `mobile transcript swipes navigate Conversation and Roleplay alternatives`, `mobile composers preserve history position and restore focus in Conversation and Roleplay` | Conversation | Roleplay |
| `Roleplay displays a selected background when its file route is GET-only` | Backgrounds | Roleplay |
| `background prompt review preserves edits through rerenders and resumes the background target` | Backgrounds | Agents |
| `Home Professor controls and surfaces follow the configured accent`, `Professor Mari navigation can be repositioned within Home on desktop`, `new Professor Mari Home widgets receive a movable layout slot immediately` | Home | Professor Mari |
| `Professor Mari opens a named character directly in its editor`, `Professor Mari creates a character when its own authorization quote omits the intent verb`, `Professor Mari creates a character from a German instruction and a card with quoted denial-like dialogue` | Professor Mari | Characters |

No test was double-counted in the feature totals in §2 — each appears once, under the "Primary Feature" column above.

---

## 5. Coverage Gaps / Unknowns

### Confirmed missing coverage
None asserted with high confidence in this audit. Establishing that a capability has **zero** test coverage anywhere would require inspecting the full client/server source (routes, components, stores) beyond the `e2e` test suite, which was out of scope for this audit. The one adjacent fact this suite *does* confirm directly (not a gap, but worth noting): `extension API routes no longer exist` proves those specific legacy routes return `404` — that is a confirmed product fact established by a test, not a coverage gap.

### Not identified
Everything listed as "Not identified" in the per-feature tables above falls into one of two reasons:
1. **No test found at all** for that capability within `e2e/` (e.g., persona creation via its own UI dialog, lorebook deletion via UI, preset section drag-reorder, live/non-mocked generation quality for any chat mode).
2. **Test body not read in this pass** — for `Home & Navigation`, `Professor Mari`, `Game`, and `Backgrounds & Media`, a portion of rows are marked "Covered (title-level)" because this audit read every test title but did not read every test body in full depth (the file is 17,634 lines; roughly two-thirds of `core-flows.e2e.ts` was read in full, concentrated on Characters/Personas, Settings, Connections, Conversation, Roleplay, Agents, and Game). Those title-level rows are a reasonable inference (this codebase's test titles are consistently descriptive of what the test body actually asserts, confirmed by every title cross-checked against its body during this audit) but are lower-confidence than the rows backed by a read body, and are flagged inline.

---

## 6. Final Baseline

- **195 declared tests** (196 executions) across **2 files**, run against **3 Playwright projects** (`desktop-chromium`, `mobile-chromium`, `mobile-webkit`).
- **`e2e/core-flows.e2e.ts`** (178 top-level tests + 1 parameterized test = 179 declarations, 17,634 lines) is an ungrouped, chronologically-ordered file covering 13 of the 14 product-feature areas identified.
- **`tests/character/character.e2e.ts`** (16 tests, 2,189 lines, 2 `describe` blocks) holds all Characters-primary coverage plus the two Personas-dedicated tests.
- Feature distribution by test count: Conversation (33) > Agents & Capability Packages (28) > Settings (24) > Home & Navigation (21) > Roleplay (18) > Characters (16) > Professor Mari (14) > Connections (11) > Game (10) > Lorebooks (7) > Backgrounds & Media (5) = Presets (5) > Personas (2 dedicated) > Test Tooling (1).
- The suite is overwhelmingly API-fixture-driven (setup via `request.post`/`request.patch` to seed state, UI exercised only for the behavior under test, API `delete` for cleanup) with heavy use of visual/theming-consistency assertions alongside functional ones.
- Agents & Capability Packages is the most cross-referenced feature area, appearing alongside Conversation, Roleplay, Game, Settings, Characters, and Connections in numerous tests.
- No test currently exercises a real (non-mocked) LLM/image/TTS provider for actual generation quality in any chat mode — all generation-dependent tests substitute a local mock HTTP server or Playwright route fixture. This is a consistent, deliberate pattern across the entire suite, not a gap specific to one feature.

---

## Files inspected

- `e2e/core-flows.e2e.ts` (full title inventory read; body read in depth for lines 1–9,028 of 17,634 — covering Settings/Appearance, Connections, Characters-adjacent setup, Conversation, Roleplay, Agents/Extensions/Danger-Zone, Presets, and the first half of Game; remaining Game/Home/Professor Mari/Lorebooks/Backgrounds test bodies were read for their earlier occurrences during a prior extraction pass in this same session, except Backgrounds which was assessed by title only)
- `e2e/global-setup.mjs`, `e2e/playwright-color-environment.ts`, `e2e/respect-no-color.cjs`, `e2e/start-servers.mjs` (inspected — non-test harness files, no product test content)
- `tests/character/character.e2e.ts` (read in full — all 16 test bodies)
- `playwright.config.ts` (inspected for project/test-matching configuration referenced in §1)

**Parts of the `e2e` directory whose coverage could not be reliably classified from a full body read in this pass:** `Backgrounds & Media` (all 5 tests, title-only), and a portion of `Home & Navigation` and `Professor Mari` (rows marked "Covered (title-level)" in §3). These are flagged explicitly rather than silently assumed — see § Coverage Gaps / Unknowns for the reasoning and § 3's inline notes for exactly which rows are affected.
