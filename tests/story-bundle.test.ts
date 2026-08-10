import { expect, test } from '@playwright/test';
import { prepareFreshClient } from './helpers/fresh-client';
import { HomePage } from './pages/home-page';

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