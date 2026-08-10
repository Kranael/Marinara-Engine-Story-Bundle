import { expect, test } from '@playwright/test';
import { prepareFreshClient } from '../helpers/fresh-client';
import { StoryBundle, StoryBundleAPI } from '../helpers/story-bundle-api';
import { HomePage } from '../../pages/home-page';
import { readFile } from 'fs/promises';

test.describe('Story Bundles without Precondition Object:Story Bundle', () => {
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
        await expect(page.getByLabel('Story Bundles', { exact: true })).toBeVisible();
        await expect(page.getByTestId('story-bundles-create-button')).toBeVisible();
    });

    test('Click on Create button should open the Create Story Bundle dialog', async ({ page }) => {
        const homePage = new HomePage(page);
        await homePage.clickOnStoryBundles();
        await page.getByTestId('story-bundles-create-button').click();
        await expect(page.getByRole('dialog', { name: 'Create Story Bundle' })).toBeVisible();
    });
})

test.describe('Story Bundles with Precondition Object:Story Bundle', () => {
    let storyBundle: StoryBundle
    let api: StoryBundleAPI;

    test.beforeEach(async ({ page }) => {
        const resetUiSettings = await page.request.put('/api/app-settings/ui', { data: { value: '' } });
        expect(resetUiSettings.ok()).toBeTruthy();
        await prepareFreshClient(page);

        api = new StoryBundleAPI(page);
        // Create a story bundle via the API
        storyBundle = await api.create({ name: 'E2E Test Bundle' });

        await page.goto('/');
    });

    test('Click on Story Bundles should display the Story Bundles panel', async ({ page }) => {
        const homePage = new HomePage(page);
        await homePage.clickOnStoryBundles();
        // The right panel is lazy-loaded; allow extra time for the first Vite dev compile.
        await expect(page.getByLabel('Story Bundles', { exact: true })).toBeVisible();
        await expect(page.getByTestId('story-bundles-create-button')).toBeVisible();
    });

    test('Click on Create button should open the Create Story Bundle dialog', async ({ page }) => {
        const homePage = new HomePage(page);
        await homePage.clickOnStoryBundles();
        await page.getByTestId('story-bundles-create-button').click();
        await expect(page.getByRole('dialog', { name: 'Create Story Bundle' })).toBeVisible();
    });

    test('Create a new Story Bundle, edit its description, and delete it', async ({ page }) => {

        // Read Test Data HTML and save it to variable for filling the description input field
        const testDataHtml = await readFile('./tests/story-bundle/data/test-data.html', 'utf-8');

        const homePage = new HomePage(page);
        await homePage.clickOnStoryBundles();
        await page.getByTestId(`story-bundle-row-${storyBundle.id}`).click();

        // Preview is ON by default — switch to edit mode to fill the description
        await page.getByTestId('story-bundle-editor-description-preview-toggle').click();
        await page.getByTestId('story-bundle-editor-description-input').fill(testDataHtml);

        // Switch back to preview mode
        await page.getByTestId('story-bundle-editor-description-preview-toggle').click();

        test.step('Verify that the description preview is visible and contains the expected content', async () => {
            await expect(page.getByTestId('story-bundle-editor-description-preview')).toBeVisible();
            await expect(page.getByRole('img').nth(1)).toBeVisible();
            await expect(page.getByRole('img').nth(2)).toBeVisible();
            await expect(page.getByRole('img').nth(3)).toBeVisible();
            await expect(page.getByRole('img').nth(4)).toBeVisible();
            await expect(page.getByRole('img').nth(5)).toBeVisible();
            await expect(page.getByText('READY TO FACE THE ELITE?')).toBeVisible();
            await expect(page.getByText('Confidential')).toBeVisible();
            await expect(page.getByText('⚑ Monthly Audit — Standing Order Conduct is recorded continuously. No subject')).toBeVisible();
        });
    })

    test('Export a story bundle and re-import it (round-trip)', async ({ page }) => {
        // 1. Export the bundle via API
        const exported = await api.export(storyBundle.id);
        expect(exported.type).toBe('marinara_story_bundle');
        expect(exported.version).toBe(1);
        expect(typeof exported.exportedAt).toBe('string');
        const data = exported.data as Record<string, unknown>;
        expect(data.name).toBe('E2E Test Bundle');
        expect(data.embeddedCharacters).toEqual([]);
        expect(data.embeddedPersonas).toEqual([]);
        expect(data.embeddedLorebooks).toEqual([]);

        // 2. Delete the original so the import creates a fresh row
        await api.delete(storyBundle.id);

        // 3. Re-import from the exported envelope
        const imported = await api.importFromEnvelope(exported);
        expect(imported.name).toBe('E2E Test Bundle');

        // 4. Update the reference so afterEach cleans up the imported bundle
        storyBundle = imported;
    });

    test.afterEach(async () => {
        await api.delete(storyBundle.id);
    })
});