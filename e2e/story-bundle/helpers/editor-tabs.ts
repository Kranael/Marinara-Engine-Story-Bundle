import type { Page } from "@playwright/test";

/**
 * Switch an editor section tab on desktop and mobile alike.
 *
 * The shared `EditorTabNavigation` renders its tab buttons on wide layouts
 * but collapses into a compact dropdown menu below the `@max-5xl` container
 * width (mobile). Both surfaces carry the same `${tabTestId}` data-testid;
 * the dropdown item only exists while the menu is open, so on compact
 * layouts this helper opens the menu first.
 */
export async function switchEditorTab(page: Page, tabTestId: string): Promise<void> {
  const visibleTab = page.getByTestId(tabTestId).filter({ visible: true });
  if ((await visibleTab.count()) === 0) {
    await page.getByRole("button", { name: "Editor sections" }).click();
  }
  await visibleTab.click();
}
