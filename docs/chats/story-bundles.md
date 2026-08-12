# Story Bundles

This guide covers Story Bundles in Marinara Engine. It explains what they are, how to create and edit them, how to export and import them, and how to start a roleplay from one.

## What a Story Bundle is

A Story Bundle is a named container that groups characters, personas, and lorebooks together. Think of it as a ready-to-play story kit. Instead of picking characters, your persona, and lorebooks one by one every time you start a new roleplay, you save them as a bundle and launch the whole set with one click.

A Story Bundle holds:

- A **name** (title).
- A **description** (optional HTML text that describes the story or setting).
- A list of **characters** who appear in the story.
- A list of **personas** (the roles you can play).
- A list of **lorebooks** (world facts the AI reads when keywords appear).
- A list of **agents** that are pre-configured for the story.

Story Bundles do not change your characters, personas, lorebooks, or agents. They only point to them. Deleting a bundle never deletes the items inside it.

## Opening the Story Bundles panel

The Story Bundles panel lives in the right sidebar. To open it:

1. Click the right sidebar toggle (the panel icon in the top bar).
2. In the panel header, click the tab dropdown and choose **Story Bundles**.

The panel shows a list of your bundles with their names and creation dates. A count at the top reads "N bundles".

## Creating a Story Bundle

1. In the Story Bundles panel, click **New Bundle**.
2. A dialog asks for a title. Type a name and click **Create**.
3. The bundle is created and the full-page editor opens.

You can also create a bundle from the editor if you already have one open.

## Editing a Story Bundle

Click any bundle in the list to open the full-page editor. The editor has a header with the bundle name and tabs on the left rail:

### Description tab

- **Name**. The bundle title. Change it and click **Save** to keep the new name.
- **Description**. An optional HTML text area. Use it to write a story summary, setting notes, or any background you want to keep with the bundle. HTML tags are sanitized for safety. Toggle between **Edit** and **Preview** to see how it renders.

### Characters tab

Shows two columns:

- **Available** (left). All characters in your library. Search by name, pick a random character, or add whole character groups at once.
- **Selected** (right). Characters already in this bundle. Click the **X** button to remove one.

Click a character in the left column to add it. Click **Load more** if you have many characters.

### Personas tab

Works the same way as Characters. Pick which personas belong to this story. The first persona in the list is used as the default when you start a roleplay from the bundle.

### Lorebooks tab

Works the same way. Pick which lorebooks the AI should reference. Lorebooks are sets of world facts triggered by keywords during chat.

### Agents tab

Works the same way. Pick which agents should be pre-configured for this story. When you start a roleplay from the bundle, these agents are enabled automatically. You can still add or remove agents later in **Chat Settings** — the bundle only sets the starting agents.

### Saving

The **Save** button in the header lights up when you make a change. Click it to save. A toast confirms "Story bundle saved." Unsaved changes are lost if you close the editor or switch bundles.

## Exporting a Story Bundle

You can export a bundle as a `.marinara.json` file. The export includes the bundle metadata and, optionally, the full data of every character, persona, and lorebook inside it (embedded content).

To export from the panel:

1. Hover over a bundle row. An action pill appears on the right.
2. Click the **Export** button (up-arrow icon).
3. Your browser downloads the file.

To export from the editor, use the same export flow from the panel.

## Importing a Story Bundle

1. In the Story Bundles panel, click the **Import** button (down-arrow icon).
2. The import dialog opens. Drop one or more `.marinara.json` files or click to browse.
3. If the file contains embedded characters, personas, or lorebooks, the dialog asks whether to import them into your library. Choose **Import everything** to bring them in, or **Skip embedded content** to only create the bundle with references.
4. A toast confirms the import.

Imported bundles appear in your list. If a referenced character, persona, or lorebook does not exist in your library and was not embedded, that reference is silently skipped.

## Starting a roleplay from a Story Bundle

The **Play** button starts a new Roleplay chat from the bundle in one click. It uses the bundle name as the chat name, adds all bundle characters, sets your persona to the first persona in the bundle, and enables any agents pre-configured in the bundle.

From the editor:

1. Open a bundle in the editor.
2. Click the **Play** button in the header (next to **Save**).
3. A new Roleplay chat is created and opens immediately. A toast confirms "Roleplay started!"

From the panel:

1. Hover over a bundle row. The action pill appears.
2. Click the **Play** button (triangle icon).
3. Same result: a new Roleplay chat opens with the bundle's characters and persona.

The Play button uses the first available AI connection. If you have no connection yet, set one up first. See [Connecting to an AI Provider](../connections/connecting-to-a-provider.md).

After the chat opens, you can adjust settings, add agents, or change anything in **Chat Settings** — the bundle only sets the starting characters, persona, and agents.

## Deleting a Story Bundle

From the panel, hover over a bundle row and click the trash button in the action pill. From the editor, click the trash button in the header. A dialog asks you to confirm. Deleting a bundle is permanent, but it never deletes the characters, personas, lorebooks, or agents inside it.

## Related guides

- [Managing Your Chat List](managing-chats.md)
- [Roleplay Mode: Getting Started](../roleplay/getting-started.md)
- [Exporting and Importing Chats](export-import.md)
- [Connecting to an AI Provider](../connections/connecting-to-a-provider.md)
