import type { Page } from "@playwright/test";
import { readFileSync } from "node:fs";

const APP_VERSION = (
  JSON.parse(readFileSync(new URL("../../../package.json", import.meta.url), "utf8")) as { version: string }
).version;

// The persisted UI store version changes whenever a migration is added to
// ui.store.ts. Seed localStorage with the store's *current* version so
// hydration skips the migration chain entirely; a hardcoded version would
// silently drift with every update and eventually run migrations against a
// minimal state they were never designed for.
const UI_STORE_VERSION = Number(
  readFileSync(new URL("../../../packages/client/src/lib/ui-persistence.ts", import.meta.url), "utf8").match(
    /name:\s*"marinara-engine-ui",\s*version:\s*(\d+)/u,
  )?.[1],
);
if (!Number.isInteger(UI_STORE_VERSION)) {
  throw new Error("Could not read the persisted UI store version from ui-persistence.ts");
}

/**
 * Seeds the client with a "known user" state before the app loads: onboarding
 * completed, no What's-New modal for the current version, and the persisted UI
 * store stamped with its current version so no migration chain runs. Tests that
 * need the first-run experience instead can opt back in via sessionStorage.
 */
export async function prepareFreshClient(page: Page) {
  // Neutralize the cross-device settings sync (use-settings-sync.ts). The
  // server blob persists across tests within a run and — because this seed
  // leaves no trusted local timestamp — its startup merge overwrites the
  // local UI store with whatever an earlier test pushed, including
  // `sidebarOpen`. Under multi-worker load that merge lands after a test has
  // already opened the mobile sidebar overlay and slams it shut mid-test.
  // Answering "no blob" makes the sync seed the server from local state
  // instead, so local state always wins. Same pattern as accent-pulse.e2e.ts.
  await page.route("**/api/app-settings/ui", (route) => route.fulfill({ json: { value: null } }));
  await page.addInitScript(
    ({ appVersion, uiStoreVersion }) => {
      if (sessionStorage.getItem("marinara:e2e:show-whats-new") !== "true") {
        localStorage.setItem("marinara:whats-new:seen-version", appVersion);
      }
      if (localStorage.getItem("marinara-engine-ui")) return;
      localStorage.setItem(
        "marinara-engine-ui",
        JSON.stringify({
          state: {
            hasCompletedOnboarding: true,
            rightPanelOpen: false,
            sidebarOpen: false,
            // The Music DJ "download to configure" banner floats over the top
            // bar and intercepts clicks on editor action buttons; e2e runs do
            // not exercise the music player, so keep it off.
            musicPlayerEnabled: false,
          },
          version: uiStoreVersion,
        }),
      );
    },
    { appVersion: APP_VERSION, uiStoreVersion: UI_STORE_VERSION },
  );
}
