import { expect, test } from '@playwright/test';
import { servePlate } from './helpers';

test.use({ launchOptions: { args: ['--disable-3d-apis'] } });

for (const url of ['/?part=plate', '/']) {
  test(`without WebGL the viewport at ${url} shows its error state and the app keeps running`, async ({ page }) => {
    await servePlate(page);
    await page.goto(url);
    await expect(page.locator('[data-panel="viewport"]')).toHaveAttribute('data-status', 'error');
    // The error says how to turn WebGL back on, not only that it failed (human request, 2026-11-12).
    await expect(page.locator('[data-panel="viewport"]')).toContainText('chrome://gpu');
    await expect(page.locator('[data-panel="chat"]')).toBeVisible();
  });
}
