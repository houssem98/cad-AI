import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { PLATE_GLB, PLATE_VIEW } from './global-setup';

const view = () => JSON.parse(readFileSync(PLATE_VIEW, 'utf8'));
const serve = (page: Page, inspect: { status: number; body: unknown }) => Promise.all([
  page.route('**/api/documents/plate/preview', (r) => r.fulfill({ status: 200, contentType: 'model/gltf-binary', body: readFileSync(PLATE_GLB) })),
  page.route('**/api/documents/plate/inspect', (r) => r.fulfill({ status: inspect.status, contentType: 'application/json', body: JSON.stringify(inspect.body) })),
]);

test('properties show the record\'s volume and bounding box, and the tree lists the features', async ({ page }) => {
  const v = view();
  const box = (['x', 'y', 'z'] as const).map((a) => (v.inspection.bbox_mm.max[a] - v.inspection.bbox_mm.min[a]).toFixed(2)).join(' × ');
  expect(box).toBe('120.00 × 80.00 × 10.00'); // the fixture itself is the kernel's plate
  expect(v.inspection.volume_mm3).toBeCloseTo(120 * 80 * 10 - 4 * Math.PI * 3 ** 2 * 10, 4);
  await serve(page, { status: 200, body: v });
  await page.goto('/?part=plate');

  const props = page.locator('[data-panel="properties"]');
  await expect(props).toHaveAttribute('data-status', 'completed');
  await expect(props.getByTestId('volume')).toHaveText(`${v.inspection.volume_mm3.toFixed(2)} mm³`);
  await expect(props.getByTestId('bbox')).toHaveText(`${box} mm`);
  await expect(props.getByTestId('record')).toContainText(v.recordOperation);
  await expect(props).not.toContainText('Mounting_Bracket');

  await page.getByRole('button', { name: 'Feature Tree', exact: true }).click();
  const tree = page.locator('[data-panel="tree"]');
  await expect(tree).toHaveAttribute('data-status', 'completed');
  await expect(tree.getByRole('listitem')).toHaveText(['p new part', 's rectangle sketch', 'x extrude', 'h hole']);
});

test('an inspect the server refuses puts properties and tree in their error state', async ({ page }) => {
  await serve(page, { status: 404, body: { error: { code: 'precondition_failed', message: 'document plate does not exist' } } });
  await page.goto('/?part=plate');
  const props = page.locator('[data-panel="properties"]');
  await expect(props).toHaveAttribute('data-status', 'error');
  await expect(props.getByRole('alert')).toContainText('document plate does not exist');
  await page.getByRole('button', { name: 'Feature Tree', exact: true }).click();
  await expect(page.locator('[data-panel="tree"]')).toHaveAttribute('data-status', 'error');
});
