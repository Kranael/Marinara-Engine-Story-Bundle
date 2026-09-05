# Story Bundles

A **Story Bundle** packages everything you need for a story into one place: a
title, an optional description, characters, a persona, lorebooks, a prompt
preset, agents, game-mode settings, and scenarios. Instead of setting up a
roleplay piece by piece every time, you build the setup once in a bundle and
start it with a single click — as a **roleplay** (RP), a **conversation**
(CONVO), or a **game** (GM).

This guide walks through the everyday flows: opening the panel, browsing the
gallery, creating a bundle, filling it with content, playing it, sharing it,
and deleting it.

---

## What a Story Bundle is

A Story Bundle is a named container that groups characters, personas,
lorebooks, and more together. Think of it as a ready-to-play story kit.
Instead of picking characters, your persona, and lorebooks one by one every
time you start a new chat, you save them as a bundle and launch the whole set
with one click.

A Story Bundle holds:

- A **name** (title).
- A **description** (optional HTML text that describes the story or setting).
- A **comment**, **creator**, **version**, and **tags**.
- A list of **characters** who appear in the story, plus which of them are
  **party members** (for Game Mode).
- A single **persona** (the role you play in this story).
- A list of **lorebooks** (world facts the AI reads when keywords appear).
- A **prompt preset** that shapes how the story is written.
- A list of **agents** that are pre-configured for the story.
- **Game Mode settings** (genre, setting, tone) and an **asset-folder scope**
  for Game Mode.
- A list of **scenarios** — starting situations with a title, an opening
  message, and an optional picture.

Story Bundles do not change your characters, personas, lorebooks, or agents.
They only point to them. Deleting a bundle never deletes the items inside it.

---

## Opening the Story Bundles panel

1. In the top bar, click the **Story Bundles** button (the bookmark icon).
2. The Story Bundles panel opens on the right side and lists all your bundles.

Each bundle row shows its picture (if it has one), its name, and its comment
(or creation date). Clicking a row opens the bundle in the full-page editor.
Hovering over a row reveals the action buttons: **Export** and **Delete**.

The panel toolbar also has an **Open Gallery** button that switches to the
full-page card gallery (see below), plus **New Bundle** and **Import** buttons.

---

## Browsing the Story Bundle gallery

The gallery is a full-page card view (like the Character Library) that shows
every bundle as a card with its artwork, title, and description.

- The toolbar has **New Bundle**, **Import**, a **search** field, and a
  **sort** control.
- Clicking a card opens a detail view with the bundle's artwork, name,
  comment, creator/version, and rendered description.
- The detail view (and each card) exposes the action buttons: **CONVO**
  (start a conversation), **RP** (start a roleplay), **GM** (start a game),
  **Edit**, **Export**, and **Delete**.

---

## Creating a new bundle

1. In the Story Bundles panel or the gallery, click **New Bundle**.
2. A small dialog appears asking for the bundle title.
3. Enter a title and confirm.
4. The bundle is created and its editor opens right away.

---

## Editing a bundle

The editor is a full-page view with a row of tabs along the top. Everything
you change stays a draft until you click **Save** in the header. The header
also has the mode buttons (**CONVO**, **RP**, **GM**), a **Save** button, a
**Delete** button, and a back arrow that returns you to the panel.

### Metadata tab

The first tab holds the bundle's identity:

- **Picture** — drag & drop an image (JPG, PNG, or WebP) onto the avatar area
  or use the file picker. You can adjust the crop, and the picture later
  appears on the bundle row and on the chat row when you play the bundle.
- **Name** — the bundle title.
- **Title / Comment** — a short note shown under the bundle name in the panel.
- **Creator** — the author of the bundle.
- **Version** — a version label, for example `1.0.0`.
- **Tags** — type a tag and add it; tags appear as chips that you can remove
  individually or all at once.
- **Bundle ID** — shown read-only for reference.

### Description tab

Write an optional description for the bundle. The description supports HTML
formatting, and a preview toggle lets you switch between editing the text and
seeing the rendered result.

### Characters tab

Assign the characters that take part in the story:

- **Add Characters** offers a search field, a **Random** pick, and a
  paginated list of your characters with an add button on each entry.
- **Groups** lets you add all characters of a character group at once.
- **Selected Characters** shows everyone already assigned, with a remove
  button on each.
- Each assigned character also has a **party member** toggle. Characters
  marked as party members become the player's party when the bundle is played
  in Game Mode; the rest are treated as NPCs.

### Personas tab

Assign the persona — who you are in the story. The bundle plays exactly one
persona: picking a persona replaces any previously selected one. The **Add
Persona** picker offers search, a **Random** button, and a paginated list;
your current choice appears under **Selected Persona**.

### Lorebooks tab

Assign the lorebooks that should be active while playing. The tab offers a
search field, a **Random** button, and a paginated list with add and remove
controls.

### Presets tab

Assign the prompt preset that shapes how the story is written. The tab offers
a search field, a **Random** button, and a paginated list with add and remove
controls.

### Agents tab

Assign the agents (for example an illustrator) that should be active in the
story. The tab offers a search field, a **Random** button, and a paginated
list with add and remove controls.

### Assets tab

Choose which Game Mode asset folders (music, ambient, SFX, sprites,
backgrounds) are available when the bundle is played as a game. Each folder
can be toggled between **Included**, **Partial**, and **Excluded**; the
selection is copied onto the new game's chat when you start it.

### Scenarios tab

A **scenario** is a starting situation for the story: a title, an opening
message, and an optional picture. Write scenarios directly inside the bundle —
no separate files needed:

1. Click the add button under **Add Scenario**.
2. Give the scenario a title, write its opening message, and optionally add a
   picture (with crop support).
3. Click **Add Scenario**; it appears in the **Scenarios** list, where you can
   edit or delete it.

### Game Mode settings

The editor also holds the bundle's **GM Settings** (genre, setting, and tone).
These are set once by the creator and used automatically when the bundle is
played in Game Mode — end-users never fill them in. A **Generate from Lore**
button can fill the three fields from the bundle's attached characters and
lorebooks.

### Save

Click **Save** in the editor header to store your changes.

---

## Playing a bundle

A bundle can be started in three modes, all reachable from the gallery, the
editor header, or the panel:

- **RP** — start a roleplay chat.
- **CONVO** — start a conversation-mode chat.
- **GM** — start a Game Mode session.

### Start a roleplay (RP)

Playing turns the bundle into a fresh roleplay chat. You can start from three
places:

- **From the gallery:** click **RP** on a card or in the detail view.
- **From the editor:** click **RP** in the editor header. Playing from the
  editor uses exactly what you currently see in the editor, including unsaved
  changes.

What happens when you play:

1. If the bundle has scenarios, a dialog asks you to pick one — or to describe
   a **Custom Scenario** in free text. Your choice becomes the first message
   of the new chat (a custom scenario is turned into an AI-generated opening
   message).
2. A new roleplay chat is created with the bundle's characters, persona,
   prompt preset, and your first active connection.
3. The bundle's lorebooks and agents are activated on the chat.
4. If the selected preset has configurable variables, a choice dialog opens
   where you pick an option for each variable before you start writing.
5. A confirmation toast appears, and the new chat opens.

In the chat sidebar, the roleplay shows the bundle's picture on its row, so
you can recognize bundle-started stories at a glance.

### Start a conversation (CONVO)

The **CONVO** button starts a conversation-mode chat from the bundle instead
of a roleplay. The persona, connection, prompt preset, lorebooks, and agents
all come directly from the bundle — the only choice left to you is which of
the bundle's characters to message, via the existing conversation setup
wizard (restricted to the bundle's characters).

### Start a game (GM)

The **GM** button starts a Game Mode session from the bundle. A two-step
wizard asks who you are (persona) and which scenario to open with, then
creates the game and its session chat, applies the bundle's characters (party
members vs. NPCs), lorebooks, assets, and GM settings, and generates the world
— all without opening the native Game Setup wizard.

---

## Exporting a bundle

1. In the panel, hover over the bundle row and click **Export** — or use
   **Export** in the gallery detail view.
2. A `.storybundle` file downloads.

The export is fully self-contained: the bundle's characters, personas,
lorebooks, and presets — including their pictures — are embedded in the file.
You can move it to another PC and import it there.

---

## Importing a bundle

1. In the Story Bundles panel or the gallery, click **Import**.
2. Select a `.storybundle` story bundle file.
3. If the file contains embedded content, a dialog shows what was found
   (characters, personas, lorebooks, presets, and how many agents are
   referenced) and asks whether to import it.
4. Confirm the import. A new bundle is created, and any embedded content that
   does not exist yet is added to your library. Content that already exists
   (matched by name) is skipped, so nothing gets duplicated.
5. If the bundle references agents that are not installed, the dialog offers
   to install them for you.

---

## Deleting a bundle

1. In the panel, hover over the bundle row and click **Delete** — or open the
   bundle in the editor and click **Delete** in the header, or use **Delete**
   in the gallery detail view.
2. A confirmation dialog appears.
3. Confirm, and the bundle is removed from your list.

Deleting a bundle is permanent, but it never deletes the characters, personas,
lorebooks, or agents inside it.

---

## Related guides

- [Managing Your Chat List](managing-chats.md)
- [Roleplay Mode: Getting Started](../roleplay/getting-started.md)
- [Game Mode: Getting Started](../game/getting-started.md)
- [Exporting and Importing Chats](export-import.md)
- [Connecting to an AI Provider](../connections/connecting-to-a-provider.md)
