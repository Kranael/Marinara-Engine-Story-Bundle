/**
 * Story Bundle Play → Scenario First Message — Playwright E2E Tests
 *
 * Regression coverage for a bug where starting a Roleplay from a Story
 * Bundle (especially on mobile viewports) could navigate into the chat
 * before the chosen scenario's opening message was inserted, leaving the
 * user looking at an empty RP. These tests run on both the desktop and
 * mobile Playwright projects (playwright.config.ts) so the mobile-chromium
 * project exercises the exact flow that was broken.
 *
 * Play now opens the same Persona-then-Scenario wizard GM's "Start
 * Adventure" uses (StoryBundleRpStartModal) instead of a standalone
 * scenario dialog — these tests click through the Persona step's "Next"
 * first. Also covers the "Custom Scenario" free-text option: the wizard
 * can switch to a description textarea and back without losing the ability
 * to pick a normal scenario card.
 *
 * Each test imports its own data and cleans up in a finally block.
 */
import { expect, test } from "@playwright/test";
import { BasePage } from "../pages/base.page.js";
import { HomePage } from "../../pages/home.page.js";
import { StoryBundlesPanelPage } from "../pages/story-bundles-panel.page.js";
import { StoryBundleEditorPage } from "../pages/story-bundle-editor.page.js";
import { StoryBundleAPI } from "../helpers/story-bundle-api.js";

test.describe("Story Bundle Play — Scenario First Message", () => {
  test("picking a scenario shows its opening message in the chat after Play", async ({ page }) => {
    const base = new BasePage(page);
    const home = new HomePage(page);
    const panel = new StoryBundlesPanelPage(page);
    const editor = new StoryBundleEditorPage(page);
    const api = new StoryBundleAPI(page);

    const bundle = await api.create({ name: `Scenario Play Test ${test.info().title}` });
    const openingMessage = "You arrive at the tavern and the innkeeper waves you over with a grin.";
    try {
      await page.request.patch(`/api/story-bundles/${bundle.id}`, {
        data: { scenarios: [{ id: "tavern-start", title: "Tavern Start", openingMessage }] },
      });

      await base.goto();
      await home.openStoryBundlesPanel();
      await panel.waitFor();
      await panel.clickRow(bundle.name);
      await editor.waitFor();

      await editor.playButton.click();
      await page.getByTestId("story-bundle-rp-wizard-next").click();

      const scenarioCard = page.getByTestId("story-bundle-rp-scenario-tavern-start");
      await expect(scenarioCard).toBeVisible();
      await scenarioCard.click();

      await expect(page.getByText("Roleplay started!")).toBeVisible({ timeout: 10_000 });
      // The opening message must actually be visible in the chat transcript,
      // not just implied by the success toast.
      await expect(page.getByText(openingMessage)).toBeVisible({ timeout: 10_000 });
    } finally {
      await page.request.delete(`/api/story-bundles/${bundle.id}`);
    }
  });

  test("Custom Scenario option switches the picker to a description textarea and back", async ({ page }) => {
    const base = new BasePage(page);
    const home = new HomePage(page);
    const panel = new StoryBundlesPanelPage(page);
    const editor = new StoryBundleEditorPage(page);
    const api = new StoryBundleAPI(page);

    const bundle = await api.create({ name: `Custom Scenario Test ${test.info().title}` });
    try {
      await page.request.patch(`/api/story-bundles/${bundle.id}`, {
        data: { scenarios: [{ id: "fixed-start", title: "Fixed Start", openingMessage: "A fixed beginning." }] },
      });

      await base.goto();
      await home.openStoryBundlesPanel();
      await panel.waitFor();
      await panel.clickRow(bundle.name);
      await editor.waitFor();

      await editor.playButton.click();
      await page.getByTestId("story-bundle-rp-wizard-next").click();

      const customButton = page.getByTestId("story-bundle-rp-custom-scenario-button");
      await expect(customButton).toBeVisible();
      await customButton.click();

      const customInput = page.getByTestId("story-bundle-rp-custom-scenario-input");
      await expect(customInput).toBeVisible();
      const confirmButton = page.getByTestId("story-bundle-rp-custom-scenario-confirm");
      await expect(confirmButton).toBeDisabled();

      // Going back returns to the scenario grid without losing the flow.
      await page.getByTestId("story-bundle-rp-custom-scenario-back").click();
      await expect(page.getByTestId("story-bundle-rp-scenario-fixed-start")).toBeVisible();
    } finally {
      await page.request.delete(`/api/story-bundles/${bundle.id}`);
    }
  });

  test("closing the wizard (X) on the Scenario step aborts Play — no chat is created", async ({ page }) => {
    const base = new BasePage(page);
    const home = new HomePage(page);
    const panel = new StoryBundlesPanelPage(page);
    const editor = new StoryBundleEditorPage(page);
    const api = new StoryBundleAPI(page);

    const bundle = await api.create({ name: `Cancel Scenario Test ${test.info().title}` });
    try {
      await page.request.patch(`/api/story-bundles/${bundle.id}`, {
        data: { scenarios: [{ id: "cancel-start", title: "Cancel Start", openingMessage: "Never inserted." }] },
      });

      await base.goto();
      await home.openStoryBundlesPanel();
      await panel.waitFor();
      await panel.clickRow(bundle.name);
      await editor.waitFor();

      await editor.playButton.click();
      await page.getByTestId("story-bundle-rp-wizard-next").click();

      const scenarioCard = page.getByTestId("story-bundle-rp-scenario-cancel-start");
      await expect(scenarioCard).toBeVisible();
      await page.getByTestId("story-bundle-rp-start-modal-close-button").click();
      await expect(scenarioCard).not.toBeVisible();

      // The editor stays put — no chat was created for this bundle.
      await expect(editor.playButton).toBeVisible();
      const chatsResp = await page.request.get("/api/chats");
      const chats = (await chatsResp.json()) as Array<{ name: string }>;
      expect(chats.some((chat) => chat.name === bundle.name)).toBe(false);
    } finally {
      await page.request.delete(`/api/story-bundles/${bundle.id}`);
    }
  });

  test("canceling the Persona step aborts Play — no chat is created", async ({ page }) => {
    const base = new BasePage(page);
    const home = new HomePage(page);
    const panel = new StoryBundlesPanelPage(page);
    const editor = new StoryBundleEditorPage(page);
    const api = new StoryBundleAPI(page);

    const bundle = await api.create({ name: `Cancel Persona Test ${test.info().title}` });
    try {
      await base.goto();
      await home.openStoryBundlesPanel();
      await panel.waitFor();
      await panel.clickRow(bundle.name);
      await editor.waitFor();

      await editor.playButton.click();
      const wizardCancel = page.getByTestId("story-bundle-rp-wizard-cancel");
      await expect(wizardCancel).toBeVisible();
      await wizardCancel.click();

      await expect(page.getByTestId("story-bundle-rp-start-modal")).toBeHidden();
      const chatsResp = await page.request.get("/api/chats");
      const chats = (await chatsResp.json()) as Array<{ name: string }>;
      expect(chats.some((chat) => chat.name === bundle.name)).toBe(false);
    } finally {
      await page.request.delete(`/api/story-bundles/${bundle.id}`);
    }
  });
});
