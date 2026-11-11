import { readFileSync } from 'node:fs';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { PLATE_GLB } from './global-setup';
import { emptyGlb, servePlate } from './helpers';

const ROUTE = '**/api/documents/plate/preview';

// Distinct colours on the canvas and whether its centre is the background colour, decoded in the page itself.
async function pixels(page: Page, canvas: Locator) {
  const png = (await canvas.screenshot()).toString('base64');
  return page.evaluate(async (b64) => {
    const img = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob());
    const c = new OffscreenCanvas(img.width, img.height);
    const ctx = c.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, img.width, img.height).data;
    const colours = new Set<number>();
    for (let i = 0; i < d.length; i += 4) colours.add((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]);
    const at = (x: number, y: number) => { const i = (y * img.width + x) * 4; return [d[i], d[i + 1], d[i + 2]].join(','); };
    return { colours: colours.size, corner: at(2, 2), centre: at(img.width >> 1, img.height >> 1) };
  }, png);
}

test('a kernel part loads in the viewport as a labelled preview with orbit, pan and zoom', async ({ page }) => {
  await page.route(ROUTE, (r) => r.fulfill({ status: 200, contentType: 'model/gltf-binary', body: readFileSync(PLATE_GLB) }));
  await page.goto('/?part=plate');
  const frame = page.locator('[data-panel="viewport"]');
  await expect(frame).toHaveAttribute('data-status', 'completed');
  const view = frame.locator('[data-triangles]');
  await expect(view).toHaveAttribute('data-size-mm', '120.00 × 80.00 × 10.00');
  expect(Number(await view.getAttribute('data-triangles'))).toBeGreaterThan(100);
  await expect(frame.getByText('Preview', { exact: true })).toBeVisible();

  const canvas = frame.locator('canvas');
  // The first frame drawn after the mesh loads can trail the size attribute under load, so wait for it.
  await expect.poll(async () => { const p = await pixels(page, canvas); return p.centre !== p.corner; },
    { message: 'the part, framed at the centre, is not background' }).toBe(true);
  expect((await pixels(page, canvas)).colours).toBeGreaterThan(50);

  const box = (await canvas.boundingBox())!;
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  const before = await canvas.screenshot();
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 120, cy + 40, { steps: 8 });
  await page.mouse.up();
  const orbited = await canvas.screenshot();
  expect(orbited.equals(before), 'orbit changed nothing').toBe(false);
  await page.mouse.move(cx, cy);
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(cx + 80, cy + 60, { steps: 8 });
  await page.mouse.up({ button: 'right' });
  const panned = await canvas.screenshot();
  expect(panned.equals(orbited), 'pan changed nothing').toBe(false);
  await page.mouse.wheel(0, -400);
  await expect.poll(async () => (await canvas.screenshot()).equals(panned), { message: 'zoom changed nothing' }).toBe(false);
});

test('a preview body that is not a GLB puts the viewport in its error state and leaves the app running', async ({ page }) => {
  await servePlate(page, { glb: 'not a glb' });
  await page.goto('/?part=plate');
  await expect(page.locator('[data-panel="viewport"]')).toHaveAttribute('data-status', 'error');
  await expect(page.locator('[data-panel="chat"]')).toBeVisible();
});

test('a GLB with no mesh puts the viewport in its empty state', async ({ page }) => {
  await servePlate(page, { glb: emptyGlb() });
  await page.goto('/?part=plate');
  await expect(page.locator('[data-panel="viewport"]')).toHaveAttribute('data-status', 'empty');
});

test('a part the server cannot preview puts the viewport in its error state', async ({ page }) => {
  await page.route(ROUTE, (r) => r.fulfill({ status: 404, contentType: 'application/json',
    body: JSON.stringify({ error: { code: 'precondition_failed', message: 'document plate does not exist' } }) }));
  await page.goto('/?part=plate');
  const frame = page.locator('[data-panel="viewport"]');
  await expect(frame).toHaveAttribute('data-status', 'error');
  await expect(frame.getByRole('alert')).toContainText('document plate does not exist');
});
