/**
 * Base Page Object — shared navigation and app setup for all E2E tests.
 *
 * Uses prepareFreshClient() to seed localStorage so onboarding is completed
 * and the "What's New?" modal is suppressed before the app loads.
 */
import { type Page } from "@playwright/test";
import { prepareFreshClient } from "../helpers/fresh-client.js";

export class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /** Navigate to the app with a fresh, known-good client state. */
  async goto(): Promise<void> {
    await prepareFreshClient(this.page);
    await this.page.goto("/");
  }
}
