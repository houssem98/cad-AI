import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { PLATE_DXF } from './global-setup';

// L7 T10: drawings through the real server, executor, kernel and agent, on recorded model responses
// (MODEL_MODE=record with DEEPSEEK_API_KEY set records a missing one). No route is stubbed.
const open = async (page: Page, module: string) => {
  await page.goto('/');
  await page.locator('aside').getByRole('button', { name: module, exact: true }).click();
};
const PLATE_MM3 = 120 * 80 * 10 - 4 * Math.PI * 3 ** 2 * 10; // global-setup's plate: four Ø6 through holes

test('an uploaded DXF builds the drawn part, checked by the kernel, and its drawing exports again', async ({ page }) => {
  test.setTimeout(240_000);
  await open(page, 'Drawing-to-CAD');
  await page.getByLabel('Drawing file').setInputFiles(PLATE_DXF);
  await page.getByRole('textbox', { name: 'Document' }).fill('e2e-drawn');
  await page.getByRole('button', { name: 'Build from drawing' }).click();
  const result = page.getByTestId('drawing-result');
  await expect(result).toHaveAttribute('data-kind', 'part', { timeout: 180_000 });
  await expect(result).toContainText('Built and verified');
  const v = await (await page.request.get('/api/documents/e2e-drawn/inspect')).json();
  expect(v.inspection.volume_mm3).toBeCloseTo(PLATE_MM3, 3);

  await open(page, 'Drawing Automation');
  await page.getByRole('textbox', { name: 'Document' }).fill('e2e-drawn');
  await page.getByRole('button', { name: 'Make drawing' }).click();
  await expect(page.getByTestId('drawing-preview')).toBeVisible({ timeout: 60_000 });
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('link', { name: 'Download DXF' }).click()]);
  const dxf = readFileSync((await download.path())!).toString('latin1');
  expect(dxf).toContain('DIMENSION');
  expect(dxf).toContain('%%c6'); // the hole diameter the kernel measured on the rebuilt part
});

test('an image is refused as unsupported, a missing document has no drawing, and the assembly view says it shows demo data', async ({ page }) => {
  await open(page, 'Drawing-to-CAD');
  await page.getByLabel('Drawing file').setInputFiles({ name: 'scan.png', mimeType: 'image/png', buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) });
  await page.getByRole('textbox', { name: 'Document' }).fill('e2e-scan');
  await page.getByRole('button', { name: 'Build from drawing' }).click();
  await expect(page.getByTestId('drawing-result')).toHaveAttribute('data-kind', 'unsupported');
  await expect(page.getByTestId('drawing-result')).toContainText('raster');

  await open(page, 'Drawing Automation');
  await page.getByRole('textbox', { name: 'Document' }).fill('no-such-part');
  await page.getByRole('button', { name: 'Make drawing' }).click();
  await expect(page.getByRole('alert')).toContainText('does not exist');
  await expect(page.getByTestId('drawing-preview')).toHaveCount(0);

  await open(page, 'Assembly Intelligence');
  await expect(page.getByTestId('demo-label')).toContainText('Demo data');
  await expect(page.getByText('0 Interferences Detected')).toHaveCount(0);
});

// Council V7: a part with a requested operation that failed and was never redone was shown as "Built and verified". The route is
// stubbed because a recorded model would need to fail on purpose.
test('a part the report marks incomplete is not shown as verified', async ({ page }) => {
  await page.route('**/api/drawings/read', (r) => r.fulfill({ json: { kind: 'part', report: { operations: [], inspection: null,
    unresolved: [{ record: 'r1', type: 'hole', error: 'hole at (300, 0) removed no material' }],
    text: 'e2e-inc: 4 operations recorded. Incomplete: 1 requested operation failed and was not redone: hole: hole at (300, 0) removed no material' } } }));
  await open(page, 'Drawing-to-CAD');
  await page.getByLabel('Drawing file').setInputFiles(PLATE_DXF);
  await page.getByRole('textbox', { name: 'Document' }).fill('e2e-inc');
  await page.getByRole('button', { name: 'Build from drawing' }).click();
  const result = page.getByTestId('drawing-result');
  await expect(result).toContainText('Built, but incomplete');
  await expect(result).not.toContainText('verified');
});
