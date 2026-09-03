/**
 * StoryBundleGmStartModal Page Object — the single "Start Adventure" wizard
 * (Persona step, then Scenario step) shown by the GM DirectInject flow.
 *
 * Data test IDs:
 *   story-bundle-gm-start-modal
 *   story-bundle-gm-start-modal-close-button (X — always cancels)
 *   story-bundle-persona-picker-option-{id}
 *   story-bundle-gm-wizard-cancel (Persona step only)
 *   story-bundle-gm-wizard-next (Persona step only, when the bundle has scenarios)
 *   story-bundle-gm-wizard-back (Scenario step only)
 *   story-bundle-persona-picker-confirm (Start Adventure — Persona step when no
 *     scenarios exist, or the Scenario step's own Start Adventure button)
 *   story-bundle-gm-scenario-{id} / story-bundle-gm-scenario-surprise-me
 *   story-bundle-gm-custom-scenario-button / -input / -back / -confirm
 */
import { type Locator, type Page } from "@playwright/test";

export class StoryBundleGmStartModalPage {
  readonly page: Page;
  readonly modal: Locator;
  readonly closeButton: Locator;
  readonly wizardCancelButton: Locator;
  readonly wizardNextButton: Locator;
  readonly wizardBackButton: Locator;
  readonly startAdventureButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.modal = page.getByTestId("story-bundle-gm-start-modal");
    this.closeButton = page.getByTestId("story-bundle-gm-start-modal-close-button");
    this.wizardCancelButton = page.getByTestId("story-bundle-gm-wizard-cancel");
    this.wizardNextButton = page.getByTestId("story-bundle-gm-wizard-next");
    this.wizardBackButton = page.getByTestId("story-bundle-gm-wizard-back");
    this.startAdventureButton = page.getByTestId("story-bundle-persona-picker-confirm");
  }

  // ── Actions ───────────────────────────────────────────────

  /** Wait for the modal to become visible. */
  async waitFor(): Promise<void> {
    await this.modal.waitFor({ state: "visible", timeout: 10_000 });
  }

  /** Locator for a specific persona option by its id (Persona step). */
  personaOptionLocator(personaId: string): Locator {
    return this.page.getByTestId(`story-bundle-persona-picker-option-${personaId}`);
  }

  /** Select a persona option by its id (Persona step). */
  async selectPersona(personaId: string): Promise<void> {
    await this.personaOptionLocator(personaId).click();
  }

  /** Locator for a specific scenario card by its id (Scenario step). */
  scenarioCardLocator(scenarioId: string): Locator {
    return this.page.getByTestId(`story-bundle-gm-scenario-${scenarioId}`);
  }

  /** The always-present "Surprise Me" card (Scenario step). */
  surpriseMeCard(): Locator {
    return this.page.getByTestId("story-bundle-gm-scenario-surprise-me");
  }

  /** Click "Cancel" on the Persona step — aborts, starts nothing. */
  async cancelOnPersonaStep(): Promise<void> {
    await this.wizardCancelButton.click();
  }

  /** Click "Next" on the Persona step — advances to the Scenario step. */
  async goNext(): Promise<void> {
    await this.wizardNextButton.click();
  }

  /** Click "Back" on the Scenario step — returns to the Persona step. */
  async goBack(): Promise<void> {
    await this.wizardBackButton.click();
  }

  /** Click "Start Adventure" — commits DirectInject with the current selection. */
  async startAdventure(): Promise<void> {
    await this.startAdventureButton.click();
  }

  /** Click the X close button — always cancels, regardless of step. */
  async close(): Promise<void> {
    await this.closeButton.click();
  }
}
