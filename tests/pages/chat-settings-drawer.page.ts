/**
 * Chat Settings Drawer Page Object — general, chat-mode-agnostic.
 *
 * Only wraps the bits needed by general (non-Story-Bundle) coverage so far:
 * opening the drawer for the currently active chat and reading/removing rows
 * in the Game Mode "World Characters" list (see ChatSettingsDrawer.tsx).
 */
import { type Locator, type Page } from "@playwright/test";

export class ChatSettingsDrawerPage {
  readonly page: Page;
  readonly root: Locator;

  constructor(page: Page) {
    this.page = page;
    this.root = page.getByTestId("chat-settings-drawer");
  }

  /** Open the drawer via the chat toolbar's settings button (desktop or mobile row, whichever is visible). */
  async open(): Promise<void> {
    const settingsButton = this.page.locator('[data-chat-toolbar-panel-action="settings"]').locator("visible=true");
    await settingsButton.click();
    await this.root.waitFor({ state: "visible" });
  }

  /** Expand the Game Mode "Characters" section (Persona / Party Characters / World Characters), collapsed by default. */
  async openCharactersSection(): Promise<void> {
    const header = this.root.getByTestId("chat-settings-section-game-characters");
    if ((await header.getAttribute("aria-expanded")) !== "true") {
      await header.click();
    }
  }

  /** Row for a tracked NPC in the "World Characters" list, keyed by GameNpc.id. */
  worldCharacterRow(npcId: string): Locator {
    return this.root.getByTestId(`chat-settings-world-character-${npcId}`);
  }

  /** Remove button inside a World Characters row. */
  removeWorldCharacterButton(npcId: string): Locator {
    return this.worldCharacterRow(npcId).locator('[data-chat-settings-remove-resource="world-character"]');
  }

  /** Empty-state text shown when the chat has no tracked NPCs yet. */
  worldCharactersEmptyState(): Locator {
    return this.root.getByText("No world characters tracked yet.");
  }
}
