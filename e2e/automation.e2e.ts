import { expect, test, type Page } from '@playwright/test';

// L7 T8: the Automation Studio replays saved workflows through the real server, executor and kernel. No route is stubbed here
// except in the last test, for states the real server cannot be made to show on demand.
const P = (name: string) => ({ $param: name });
const PLATE = {
  id: 'e2e-plate', name: 'E2E rectangular plate',
  params: [{ name: 'length', unit: 'mm', default: 100 }, { name: 'width', unit: 'mm', default: 60 }, { name: 'thickness', unit: 'mm', default: 5 }],
  steps: [{ id: 'p', type: 'new_part', params: { name: 'plate' } }, { id: 's', type: 'sketch_rectangle', params: { plane: 'top', width: P('length'), height: P('width') } },
    { id: 'x', type: 'extrude', params: { sketch: 's', depth: P('thickness') } }],
};

const openStudio = async (page: Page) => {
  await page.goto('/');
  await page.locator('aside').getByRole('button', { name: 'Automation Studio' }).click();
};

test('the studio runs a saved workflow, shows a step whose record failed as failed, and a good run as succeeded', async ({ page }) => {
  expect((await page.request.post('/api/workflows', { data: PLATE })).status()).toBe(201);
  await openStudio(page);
  await page.getByTestId('workflow').filter({ hasText: PLATE.name }).click();
  const steps = page.getByTestId('workflow-step');
  await expect(steps).toHaveCount(3);
  await expect(steps.getByTestId('step-status')).toHaveText(['not run', 'not run', 'not run']);

  await page.getByRole('spinbutton', { name: 'thickness (mm)' }).fill('0');
  await page.getByRole('textbox', { name: 'Document' }).fill('e2e-zero');
  await page.getByRole('button', { name: 'Run workflow' }).click();
  await expect(page.getByTestId('run-status')).toContainText('failed', { timeout: 60_000 });
  await expect(steps.getByTestId('step-status')).toHaveText(['succeeded', 'succeeded', 'failed']);
  await expect(steps.nth(2)).toContainText('schema');

  await page.getByRole('spinbutton', { name: 'thickness (mm)' }).fill('8');
  await page.getByRole('textbox', { name: 'Document' }).fill('e2e-good');
  await page.getByRole('button', { name: 'Run workflow' }).click();
  await expect(page.getByTestId('run-status')).toContainText('succeeded', { timeout: 60_000 });
  await expect(steps.getByTestId('step-status')).toHaveText(['succeeded', 'succeeded', 'succeeded']);
  const v = await (await page.request.get('/api/documents/e2e-good/inspect')).json();
  expect(v.inspection.valid).toBe(true);
  expect(v.inspection.volume_mm3).toBeCloseTo(100 * 60 * 8, 3); // defaults for length and width, 8 mm entered
});

test('the studio shows loading, an empty list and a read error as distinct states', async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>((r) => { release = r; });
  let down = false;
  await page.route('**/api/workflows', async (r) => {
    await gate;
    await (down ? r.fulfill({ status: 500, json: { error: { code: 'storage_error', message: 'store unavailable' } } }) : r.fulfill({ json: [] }));
  });
  await openStudio(page);
  await expect(page.getByTestId('workflows-loading')).toBeVisible();
  release();
  await expect(page.getByTestId('workflows-empty')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Run workflow' })).toHaveCount(0);
  down = true;
  await openStudio(page);
  await expect(page.getByTestId('workflows-error')).toContainText('store unavailable');
});
