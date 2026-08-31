# Story Bundles — User Flows

A **Story Bundle** packages everything you need for a story into one place: a
title, an optional description, characters, a persona, lorebooks, a prompt
preset, agents, and scenarios. Instead of setting up a roleplay piece by piece
every time, you build the setup once in a bundle and start it with a single
click — either as a **roleplay** (RP) or as a **conversation** (CONVO).

This guide walks through the everyday flows: opening the panel, browsing the
gallery, creating a bundle, filling it with content, playing it, sharing it,
and deleting it.

---

## 1. Open the Story Bundles panel

1. In the top bar, click the **Story Bundles** button (the bookmark icon).
2. The Story Bundles panel opens on the right side and lists all your bundles.

Each bundle row shows its picture (if it has one), its name, and its comment
(or creation date). Clicking a row opens the bundle in the full-page editor.
Hovering over a row reveals the action buttons: **Export** and **Delete**.

The panel toolbar also has an **Open Gallery** button that switches to the
full-page card gallery (see § 2), plus **New Bundle** and **Import** buttons.

---

## 2. Browse the Story Bundle gallery

The gallery is a full-page card view (like the Character Library) that shows
every bundle as a card with its artwork, title, and description.

- The toolbar has **New Bundle**, **Import**, a **search** field, and a
  **sort** control.
- Clicking a card opens a detail view with the bundle's artwork, name,
  comment, creator/version, and rendered description.
- The detail view (and each card) exposes the action buttons: **CONVO**
  (start a conversation), **RP** (start a roleplay), **GM** (coming soon),
  **Edit**, **Export**, and **Delete**.

---

## 3. Create a new bundle

1. In the Story Bundles panel or the gallery, click **New Bundle**.
2. A small dialog appears asking for the bundle title.
3. Enter a title and confirm.
4. The bundle is created and its editor opens right away.

---

## 4. Edit a bundle

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

### Scenarios tab

A **scenario** is a starting situation for the story: a title, an opening
message, and an optional picture. Write scenarios directly inside the bundle —
no separate files needed:

1. Click the add button under **Add Scenario**.
2. Give the scenario a title, write its opening message, and optionally add a
   picture (with crop support).
3. Click **Add Scenario**; it appears in the **Scenarios** list, where you can
   edit or delete it.

### Save

Click **Save** in the editor header to store your changes.

---

## 5. Play a bundle (RP)

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

---

## 6. Start a conversation (CONVO)

The **CONVO** button starts a conversation-mode chat from the bundle instead
of a roleplay. The persona, connection, prompt preset, lorebooks, and agents
all come directly from the bundle — the only choice left to you is which of
the bundle's characters to message, via the existing conversation setup
wizard (restricted to the bundle's characters).

---

## 7. Export a bundle

1. In the panel, hover over the bundle row and click **Export** — or use
   **Export** in the gallery detail view.
2. A `.marinara.json` file downloads.

The export is fully self-contained: the bundle's characters, personas,
lorebooks, and presets — including their pictures — are embedded in the file.
You can move it to another PC and import it there.

---

## 8. Import a bundle

1. In the Story Bundles panel or the gallery, click **Import**.
2. Select a `.marinara.json` story bundle file.
3. If the file contains embedded content, a dialog shows what was found
   (characters, personas, lorebooks, presets, and how many agents are
   referenced) and asks whether to import it.
4. Confirm the import. A new bundle is created, and any embedded content that
   does not exist yet is added to your library. Content that already exists
   (matched by name) is skipped, so nothing gets duplicated.
5. If the bundle references agents that are not installed, the dialog offers
   to install them for you.

---

## 9. Delete a bundle

1. In the panel, hover over the bundle row and click **Delete** — or open the
   bundle in the editor and click **Delete** in the header, or use **Delete**
   in the gallery detail view.
2. A confirmation dialog appears.
3. Confirm, and the bundle is removed from your list.
