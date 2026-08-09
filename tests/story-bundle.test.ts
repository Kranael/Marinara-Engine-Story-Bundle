import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { HomePage } from './pages/home-page';

const APP_VERSION = (
  JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string }
).version;

// The persisted UI store version changes whenever a migration is added to
// ui.store.ts. Seed localStorage with the store's *current* version so
// hydration skips the migration chain entirely; a hardcoded version would
// silently drift with every update and eventually run migrations against a
// minimal state they were never designed for.
const UI_STORE_VERSION = Number(
  readFileSync(new URL('../packages/client/src/stores/ui.store.ts', import.meta.url), 'utf8').match(
    /name:\s*"marinara-engine-ui",\s*version:\s*(\d+)/u,
  )?.[1],
);
if (!Number.isInteger(UI_STORE_VERSION)) {
  throw new Error('Could not read the persisted UI store version from ui.store.ts');
}

async function prepareFreshClient(page: Page) {
  await page.addInitScript(({ appVersion, uiStoreVersion }) => {
    if (sessionStorage.getItem('marinara:e2e:show-whats-new') !== 'true') {
      localStorage.setItem('marinara:whats-new:seen-version', appVersion);
    }
    if (localStorage.getItem('marinara-engine-ui')) return;
    localStorage.setItem(
      'marinara-engine-ui',
      JSON.stringify({
        state: {
          hasCompletedOnboarding: true,
          rightPanelOpen: false,
          sidebarOpen: false,
        },
        version: uiStoreVersion,
      }),
    );
  }, { appVersion: APP_VERSION, uiStoreVersion: UI_STORE_VERSION });
}

test.beforeEach(async ({ page }) => {
  const resetUiSettings = await page.request.put('/api/app-settings/ui', { data: { value: '' } });
  expect(resetUiSettings.ok()).toBeTruthy();
  await prepareFreshClient(page);
  await page.goto('/');
});

test('Click on Story Bundles should display the Story Bundles panel', async ({ page }) => {
  const homePage = new HomePage(page);
  await homePage.clickOnStoryBundles();
  // The right panel is lazy-loaded; allow extra time for the first Vite dev compile.
  await expect(page.getByLabel('Story Bundles', { exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('story-bundles-create-button')).toBeVisible();
});

test('Click on Create button should open the Create Story Bundle dialog', async ({ page }) => {
  const homePage = new HomePage(page);
  await homePage.clickOnStoryBundles();
  await page.getByTestId('story-bundles-create-button').click();
  await expect(page.getByRole('dialog', { name: 'Create Story Bundle' })).toBeVisible();
});