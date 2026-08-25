# E2E Test Coverage — Current State Inventory

Snapshot of `e2e/` as of this branch (`upstream/staging`, commit `26f5e9dad`). This is a **current-state inventory only** — no architecture proposal, no test edits.

## Directory contents

```
e2e/
  core-flows.e2e.ts        <- the only spec file (19,714 lines)
  global-setup.mjs
  playwright-color-environment.ts
  respect-no-color.cjs
  start-servers.mjs
```

All product test coverage lives in a **single monolithic file**: `e2e/core-flows.e2e.ts`. There is no `test.describe()` grouping anywhere in the file — it is a flat sequence of **195 top-level `test()` blocks** (194 standalone + 1 block inside a `for (const mode of ["roleplay", "conversation"])` loop that runs twice, so 196 test executions total). Tests are ordered roughly by when they were added, not by feature, and a single test frequently exercises more than one feature end-to-end (e.g. creating a character, attaching a lorebook, and asserting in a Roleplay chat).

Each test runs against both a `desktop-chromium` and `mobile-chromium` Playwright project unless it calls `test.skip(...)` to restrict itself to one viewport (very common in this file).

## Coverage by feature

Counts below assign each test to **one primary feature** (the thing it would break if removed). Where a test also meaningfully exercises another feature, that's noted as cross-feature coverage rather than double-counted.

| # | Feature | Tests | 
|---|---|---|
| 1 | [Conversation](#conversation) | 33 |
| 2 | [Agents & Capability Packages](#agents--capability-packages) | 28 |
| 3 | [Settings](#settings) | 24 |
| 4 | [Home & Navigation](#home--navigation) | 21 |
| 5 | [Roleplay](#roleplay) | 18 |
| 6 | [Characters](#characters) | 16 |
| 7 | [Professor Mari](#professor-mari-ai-home-assistant) | 14 |
| 8 | [Connections](#connections) | 11 |
| 9 | [Game](#game) | 10 |
| 10 | [Lorebooks](#lorebooks) | 7 |
| 11 | [Backgrounds & Media](#backgrounds--media) | 5 |
| 12 | [Presets](#presets) | 5 |
| 13 | [Personas](#personas) | 2 |
| 14 | [Test Tooling (non-product)](#test-tooling-non-product) | 1 |
| | **Total** | **195** |

---

### Conversation — 33 tests

Chat-mode-agnostic and Conversation-specific behavior: message list rendering/actions, Chat Settings panels, message search, chat toolbar/Help overlay, group-chat awareness, media pickers, and mobile composer behavior.

- Chat Settings: greeting insertion after wizard skip, Author's Notes (expand + macro guide + macro/preset variable resolution), summary macro editor layout, inline editing of attached characters/personas/lorebook entries, attaching/retaining custom agents, Long-Term Memory activation and persistence.
- Message list & actions: unified chroma-based deletion/selection controls, transcript date/number formatting, per-message actions on desktop/mobile, bulk chat deletion, empty-chat hover previews, rewrite shield (original vs. rewritten), stopped/refused generation cleanup, autocomplete emoji shortcodes.
- Chat chrome: toolbar panel toggling across modes, Help overlay control labeling, first-run Help auto-open, permanently hiding Help, message search ordering, mode tabs and new-chat connection gating.
- Group/membership: membership notices timing, per-character group awareness scoping (only sibling chats of the replying character).
- Mobile: composer swipe navigation, visual-viewport-aware composer above the keyboard, history-position/focus restore, media search (GIFs) and recently-used media picker persistence.
- Cross-feature: several of these also assert Characters/Personas/Lorebooks attachment behavior, Agents settings visibility, and Roleplay-parallel behavior (mobile swipe/composer tests run against both modes).

### Agents & Capability Packages — 28 tests

The downloadable/enable-able "Agent" capability system (catalog install/uninstall, per-agent settings surfaces, and several named agents: Illustrator, Storyboard, World Maps, Secret Plot, Hierarchical Maps, Lorebook Keeper, Music DJ, Conversation Calls/Whisper, TTS providers) plus the legacy "Extensions" system it replaced.

- Catalog lifecycle: install/uninstall every package, sidebar artwork appears/clears, catalog API-failure messaging, dismissible update prompts, desktop/mobile catalog usability, category headers while scrolling.
- Legacy Extensions: old extension API routes removed, legacy browser records cleaned while imports stay locked, Personal Extensions locked to Professor Mari only, external Agent import Danger Zone gating.
- Named agents: custom Agent prompt result-format preview, custom Agent character-card creation gated on approval, Storyboard Agent settings layout at phone widths, Illustrator/Storyboard subsection ownership, World Maps presence in Agents + Chat Settings, Secret Plot run-interval editing, Gallery "Illustrate" surfacing active image agents.
- Voice/TTS: PocketTTS voice discovery + multipart speech API, OpenAI-compatible TTS custom Kokoro voice mix, ElevenLabs model/voice listing, Music Player gated on Music DJ install.
- Feature-gating integration: Function Calling first-tool-round setting, empty agent libraries pointing Roleplay/Game setup at the Agents tab, Conversation/Game setup command lists following installed agents, Local Whisper exposure gated on Conversation Calls, memory-recall modal, failed Lorebook Keeper run retry.
- Cross-feature: most of these assert their effect inside Conversation, Roleplay, or Game chat settings/setup UI rather than the Agents panel alone.

### Settings — 24 tests

App-wide Settings surfaces: Appearance/theming, settings-profile export/import, Backup & Export, localization, and general shared UI chrome (confirmation buttons, modals, panel widths) that is asserted via a Settings-adjacent test rather than a specific feature panel.

- Appearance/theming: mouse pointer toggle persistence, switch track/thumb geometry, avatar-shape preview, art-scale sliders, custom theme live preview batching, Accent Pulse animation, Android status-bar bridge, default/merged dialogue (speaker) colors.
- Settings profiles: export/import identity + legacy import compatibility, Hierarchical Maps agent state isolation across chats, chat-mode/branch-identity preservation.
- Backup/import-export: automatic backup location, custom generation parameters as reusable controls, streamed profile and full-backup ZIP round-trip through import preview.
- Localization & updates: UI language selection/persistence, mobile Docker update staging-image selection.
- General shared UI (not owned by one feature panel): resource-panel sort-field width, destructive-confirmation button treatment, modal backdrop drag/close behavior, settings search divider alignment, right-panel width with/without scrollbar, desktop resource editors positioning beside sidebars, incomplete synced settings preserving disabled Game text effects.

### Home & Navigation — 21 tests

The Home dashboard/widget system and top-level app navigation chrome (topbar, panel switching, viewport-driven layout).

- Widgets: default five-widget composition for a fresh install, Community/clock widgets, Recent Chats widget (mode colors, character sprites, 2x2 footprint/repack), Achievements preview (desktop + compact mobile), Character of the Day centering, browser-hub bookmarks (desktop scaling, FAQ bookmark window, mobile bookmark menu), hover lift/brighten, drag-to-reorder persistence, lifecycle bounds across repeated navigation.
- Shell/navigation: home shell + topbar panels open without client errors, installed destinations as browser tabs, feed prioritization + Game presentation, mobile topbar reachability while sidebars switch, coarse-pointer (iPad) full-screen side panels, Characters topbar underline color.
- Cross-feature: several widgets surface Professor Mari (its own layout slot, repositioning) and Characters (recent-chat sprites, Character of the Day) — see Professor Mari section for Mari-specific behavior tests.

### Roleplay — 18 tests

Roleplay-mode-specific chat mechanics: composer/caret behavior, streaming/reasoning display, side-panel widgets (Tracker, Echo Chamber), and branch/history handling.

- Composer & input: hides contentless user anchors, typographic-quote caret positioning, ambient-work-off-input-path performance (desktop), draft-rewrite avoidance (mobile), held-key deletion deferring draft persistence, no kaomoji in the composer, code formatting staying inside message width (mobile).
- Streaming/generation: inline streaming reasoning with auto-collapse, rewrite streaming following message height, editing a preceding message keeps one live stream row.
- Side panels/widgets: side-panel slide sync with desktop shell resize, Tracker custom-field defaults on new chats, Tracker scaling into the gutter, Chat Summaries semantic retrieval without overflowing mobile, Chat Settings click-to-copy ID/square param choices.
- Branches & history: renamed branches keep their name in the sidebar/search, reduced-paint-effects preserve styling.
- Cross-feature: Chat Summaries/Tracker are Agent-provided features; several composer tests are mirrored for Conversation mode in the same or a parallel test.

### Characters — 16 tests

Character card creation, editing, import/download, and library browsing. Several tests cover Characters and Personas together (shared components) — counted here, noted as cross-feature.

- Editor: favorite tags/star accent color, expanded editor keyboard/caret behavior, unsaved-field preservation across responsive layout changes, Markdown preview without altering source, character-schedule export/import.
- Library/drag: dragging a character into the active chat, adding a resource via row action (no drag), Chat action reusing mode selection + seeding the setup wizard, matched full-body sprite anchor approval flow.
- Import/download: card downloads via panel + local library, downloaded cards using Marinara destination/lorebook choices, Chub NSFW search filtering/pagination, sidebar search by creator, custom Agent-generated character cards requiring approval.
- Cross-feature with Personas: avatar-action separation, reference-choice persistence/fallback, panel-launched downloads, creator search — all exercise the equivalent Persona UI in the same test.

### Professor Mari (AI Home Assistant) — 14 tests

The in-app AI assistant ("Professor Mari") that operates from Home: chat behavior, navigation actions, and AI-driven character creation/authorization checks.

- Presence & navigation: visibly arrives on Home and navigates without AI calls, opens a named character directly in its editor, introduces Characters/Personas in topbar order, replaces the Noodle tour with Home guidance, can be repositioned within Home.
- Chat behavior: fills the mobile home viewport with composer visible, follows an open conversation across chats/mobile nav, keeps suggestions visible after history loads, shows context budget when token usage is enabled, opens chat history at the newest message, bulk chat deletion follows the active accent, dependency/sensitive-file review explicitness across viewports.
- AI authorization/action-taking: creates a character when authorization phrasing omits the intent verb, creates a character from a German-language instruction with quoted denial-like dialogue, still blocks a generic authorization naming multiple operation categories.

### Connections — 11 tests

LLM/provider connection configuration: editor chrome, NovelAI-specific generation defaults, and Agent-gated features exposed from the Connections panel.

- Editor chrome/errors: model-fetch errors, test-message errors, Discard action — all asserting the configured editor accent color.
- NovelAI: style-plate upload keeping the editor mounted, generation defaults surviving save/navigation, generation defaults surviving connection import.
- Other: dedicated image-captioning connection defaults, provider concurrency errors in generation toasts, generation-fallback replacement-connection toast, Local Whisper only exposed while Conversation Calls is installed, Connections/Lorebooks folders expanding without a React hook error.

### Game — 10 tests

CYOA/Game-mode-specific mechanics: widgets, combat/character sheets, Peek Prompt history, and NPC handling.

- CYOA: stale choices excluded from the chat tail, mobile CYOA usable above four HUD widgets.
- Widgets & sheets: numeric widget-value persistence, widget editing/log deletion following Chroma during weather effects, combat-sheet helpers (ability types, card matches, zero HP), character-sheet Retry remaining a draft until Save.
- History: historical Peek Prompt returns the exact selected turn request, Game history above the dialogue box opens a historical Peek Prompt.
- Other: NPC avatar upload accepting Cyrillic names, setup only showing features owned by installed agents.

### Lorebooks — 7 tests

Lorebook and lorebook-entry editing, saving, and activation-context display.

- Vectorization eligibility settings saved first, Save keeping Overview stable while detail cache settles, lorebook/entry IDs visible and copyable, entry-type description text inheriting editor chrome, safe inline edits + move-destination choice for selected entries, context-filter chip borders (Noodle).
- Cross-feature: Roleplay's Active Context panel test (counted under Roleplay's neighbor, actually counted here) verifies rich lorebook activation provenance (keyword/semantic sources) rendered inside a Roleplay chat.

### Backgrounds & Media — 5 tests

Background image library behavior and one AI background-prompt-review flow.

- Re-imported backgrounds with the same filename bypassing stale browser cache, background cards showing readable names/thumbnails, a selected background rendering in Roleplay when its file route is GET-only, library organization via desktop drag and touch drag, AI background-prompt review preserving edits through rerenders and resuming the background target (Agent-driven generation).

### Presets — 5 tests

Prompt-preset (generation parameter template) transfer, display, and quick-editing.

- Preset transfer discarding deprecated generation parameters, selected-prompt indicator avoiding avatar clipping, preset picture upload/replace from the panel, roleplay quick-preset editor spacing/safe deletion (desktop + mobile-compact variant).

### Personas — 2 tests

Dedicated Persona-only tests (most Persona coverage is shared with Characters — see the Characters section's cross-feature note for ~5 additional tests that also exercise Persona UI).

- Dropping a persona onto the active chat confirms before replacing the current persona, persona editor preserves unsaved fields across responsive layout changes.

### Test Tooling (non-product) — 1 test

- `Playwright color parsing preserves supported force values only` — a unit-style test of the repo's own `playwright-color-environment.ts` helper (terminal color-forcing logic for CI output), not a product feature.

---

## Key observations for future test-architecture work

- **No per-feature files or `describe` grouping exists today.** All 195 tests are flat top-level `test()` calls in one file, ordered by addition history rather than feature.
- **Cross-feature tests are common**, especially: Characters+Personas (shared editor/panel components), Conversation+Agents (feature gating), Roleplay+Game (shared agent-library empty states), and Home+Professor Mari (widget placement).
- **Every named "Agent" capability** (Illustrator, Storyboard, World Maps, Secret Plot, Hierarchical Maps, Tracker, Echo Chamber, Chat Summaries, Long-Term Memory, TTS providers, Lorebook Keeper) currently has its coverage folded into the "Agents & Capability Packages" bucket above rather than its own file — a future split would need to decide whether these become their own feature files or stay grouped under Agents.
- Settings currently mixes Appearance/theming, profile import-export, and generic shared-UI-chrome assertions (e.g. "destructive confirmation accent," "modal backdrop behavior") that don't belong to any one feature panel.
