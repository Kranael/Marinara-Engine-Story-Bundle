import { expect, type Locator, type Page } from '@playwright/test';

export class HomePage {
    readonly page: Page;
    readonly buttonStoryBundle: Locator;

    constructor(page: Page) {
        this.page = page;
        this.buttonStoryBundle = page.getByTestId('topbar-panel-button-story-bundles');
    }

    async clickOnStoryBundles() {
        await this.buttonStoryBundle.click();
    }
}