import { expect, test, type Page } from '@playwright/test';
import { servePlate } from './helpers';

// Claims that no record backs: a live CAD connection, a kernel or verification result, a fabricated engine log.
const FALSE_CLAIM = new RegExp([
  'Bridge Connected', 'SolidWorks Bridge', 'Parasolid', 'Dimensions verified', 'All Checks Passed', 'CERTIFIED PASS', 'Euler genus',
  'Euler check verified', 'Manifold Watertight', 'verified B-Rep', 'Rebuild OK', 'bidirectionally linked', 'Hash: 0x', 'FeatID',
  'Von Mises max stress', 'Invariants Verified', 'Connected to local SolidWorks', 'Integrity Verified', 'Checksum Verified',
  'Operation completed successfully', 'geometric constraints verified', 'Dispatching COM',
].join('|'), 'i');

async function noClaims(page: Page, where: string) {
  const text = await page.locator('body').innerText();
  expect(text.match(FALSE_CLAIM)?.[0] ?? null, `false claim on ${where}`).toBeNull();
}

async function walk(page: Page) {
  await noClaims(page, 'first paint');
  for (const tab of ['Feature Tree', 'BOM', 'Properties', 'Verification Results', 'Task Progress', 'Logs', 'Operation History']) {
    await page.getByRole('tab', { name: tab }).click();
    await noClaims(page, tab);
  }
  await page.getByRole('button', { name: 'Notifications' }).click();
  await noClaims(page, 'notifications');
  await page.getByRole('button', { name: 'Notifications' }).click();
  await page.getByRole('button', { name: 'View Report' }).click();
  await noClaims(page, 'verification report');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Documentation & Shortcuts' }).click();
  await noClaims(page, 'help');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Length 100mm' }).click();
  await page.getByRole('button', { name: 'Apply to preview' }).click();
  await expect(page.getByText('Demo finished', { exact: true })).toBeVisible({ timeout: 15_000 });
  await noClaims(page, 'after a demo run');
}

test('the default workspace claims nothing that no record backs, and labels its viewport a preview', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-panel="viewport"]').getByText('Preview', { exact: true })).toBeVisible();
  await walk(page);
});

test('with a kernel part loaded the workspace claims nothing beyond its record', async ({ page }) => {
  await servePlate(page);
  await page.goto('/?part=plate');
  await expect(page.locator('[data-panel="viewport"]')).toHaveAttribute('data-status', 'completed');
  await expect(page.getByTestId('verdict')).toHaveText('Kernel inspection: valid solid');
  await walk(page);
});
