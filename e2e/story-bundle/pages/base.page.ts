/**
 * Base Page Object — shared navigation and app setup for all E2E tests.
 *
 * Uses prepareFreshClient() to seed localStorage so onboarding is completed
 * and the "What's New?" modal is suppressed before the app loads.
 */
import { type ElementHandle, type Page } from "@playwright/test";
import { prepareFreshClient } from "../helpers/fresh-client.js";

const TOP_BAR_SELECTOR = '[data-component="TopBar"]';
// AppRecoveryBoundary (packages/client/src/App.tsx) renders this button when
// the app shell hits a render error — most commonly a Vite dynamic import
// that the saturated dev server failed to serve in time.
const RECOVERY_RELOAD_SELECTOR = 'button:text-is("Reload")';
// Bounded first pass for the shell. A fully blank page (neither shell nor
// recovery boundary) means the dev server never served the entry module
// graph; waiting the whole test timeout out is wasted, a reload with warm
// modules boots quickly.
const APP_SHELL_FIRST_WAIT_MS = 20_000;

export class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /** Navigate to the app with a fresh, known-good client state. */
  async goto(): Promise<void> {
    await prepareFreshClient(this.page);
    await this.page.goto("/");
    await this.waitForAppShell();
  }

  /**
   * Wait for the app shell to boot, self-healing from crash recovery and a
   * fully blank page.
   *
   * Under multi-worker load the Vite dev server can be too slow serving a
   * dynamically imported shell module; the browser aborts the import and
   * AppRecoveryBoundary renders instead of the app. Click its Reload button
   * once — the module is typically warm by then — and wait for the shell.
   * When even the entry module graph never arrives the page stays blank
   * (neither selector matches); a single bounded reload then boots from the
   * now-warm module cache.
   */
  private async waitForAppShell(): Promise<void> {
    let settled = await this.settleAppShell(APP_SHELL_FIRST_WAIT_MS);
    if (!settled) {
      await this.page.reload();
      settled = await this.settleAppShell(APP_SHELL_FIRST_WAIT_MS);
    }
    if (!settled) throw new Error("App shell did not boot: no TopBar and no recovery Reload button appeared");
    if ((await settled.getAttribute("data-component")) === "TopBar") return;

    await settled.click();
    await this.page.locator(TOP_BAR_SELECTOR).waitFor({ state: "visible" });
  }

  private async settleAppShell(timeout: number): Promise<ElementHandle<SVGElement | HTMLElement> | null> {
    try {
      return await this.page.waitForSelector(`${TOP_BAR_SELECTOR}, ${RECOVERY_RELOAD_SELECTOR}`, {
        state: "visible",
        timeout,
      });
    } catch {
      return null;
    }
  }
}
