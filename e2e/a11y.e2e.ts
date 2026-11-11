import { expect, test, type Locator, type Page } from '@playwright/test';
import { changed, servePlate } from './helpers';

// Visible controls whose name would be empty (aria-label, a label, labelled-by text, own text or title).
const unnamed = (page: Page) => page.evaluate(() => [...document.querySelectorAll('button, input, select, textarea, [role="tab"]')]
  .filter((el) => (el as HTMLElement).getClientRects().length > 0)
  .filter((el) => {
    const by = el.getAttribute('aria-labelledby');
    const labels = (el as HTMLInputElement).labels;
    const name = el.getAttribute('aria-label') || (labels?.length ? labels[0].textContent : '') || (by ? document.getElementById(by)?.textContent : '')
      || (el as HTMLElement).innerText?.trim() || el.getAttribute('title');
    return !name?.trim();
  })
  .map((el) => el.outerHTML.slice(0, 140)));

const focusInside = (page: Page) => page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'));

async function changesRender(canvas: Locator, act: () => Promise<void>) {
  const before = await canvas.screenshot();
  await act();
  await expect.poll(async () => (await canvas.screenshot()).equals(before)).toBe(false);
}

test('every visible control has a name, including in dimension edit mode', async ({ page }) => {
  await page.goto('/');
  expect(await unnamed(page)).toEqual([]);
  await page.getByRole('button', { name: /^\d+\.\d\d mm$/ }).first().click();
  expect(await unnamed(page)).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-panel="properties"] input[type="number"]')).toHaveCount(0);
});

test('tabs say which one is selected', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('tab', { name: 'Properties' })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('tab', { name: 'Feature Tree' }).click();
  await expect(page.getByRole('tab', { name: 'Feature Tree' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tab', { name: 'Properties' })).toHaveAttribute('aria-selected', 'false');
  await page.getByRole('tab', { name: 'Logs' }).click();
  await expect(page.getByRole('tab', { name: 'Logs' })).toHaveAttribute('aria-selected', 'true');
});

test('help and report open as dialogs that hold focus and close on Escape', async ({ page }) => {
  await page.goto('/');
  for (const opener of ['Documentation & Shortcuts', 'View Report']) {
    await page.getByRole('button', { name: opener }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(await focusInside(page), `${opener}: focus moves into the dialog`).toBe(true);
    for (let i = 0; i < 8; i++) await page.keyboard.press('Tab');
    expect(await focusInside(page), `${opener}: Tab stays in the dialog`).toBe(true);
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  }
});

test('the copilot role select shows focus', async ({ page }) => {
  await page.goto('/');
  const select = page.getByRole('combobox', { name: 'Copilot role' });
  await select.focus();
  expect(await select.evaluate((el) => getComputedStyle(el).boxShadow)).not.toBe('none');
});

test('the kernel preview can be panned, orbited and zoomed from the keyboard', async ({ page }) => {
  await servePlate(page);
  await page.goto('/?part=plate');
  const canvas = page.locator('[data-panel="viewport"] canvas');
  await expect(page.locator('[data-panel="viewport"]')).toHaveAttribute('data-status', 'completed');
  await expect(canvas).toHaveAttribute('tabindex', '0');
  await expect(canvas).toHaveAttribute('aria-label', /arrow/i);
  await canvas.focus();
  await changesRender(canvas, async () => { for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowLeft'); });
  await changesRender(canvas, async () => { for (let i = 0; i < 6; i++) await page.keyboard.press('Shift+ArrowUp'); });
  await changesRender(canvas, () => page.keyboard.press('+'));
  await changesRender(canvas, () => page.keyboard.press('-'));
});

test('the demo viewport takes keyboard focus, and its Pan tool pans where Rotate orbits', async ({ page }) => {
  await page.goto('/');
  const canvas = page.locator('[data-panel="viewport"] canvas');
  await expect(canvas).toHaveAttribute('tabindex', '0');
  await canvas.focus();
  await changesRender(canvas, async () => { for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowLeft'); });
  const drag = async () => {
    const b = (await canvas.boundingBox())!;
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2 + 150, b.y + b.height / 2 + 60, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(2500); // let damping settle, so two equal drags end in the same view
    return canvas.screenshot();
  };
  const rotateDrag = async () => {
    await page.reload();
    await page.getByRole('button', { name: 'Rotate', exact: true }).click();
    return drag();
  };
  // Damped controls settle a few antialiased pixels differently each run, so views are compared by share of pixels changed.
  const rotated = await rotateDrag();
  expect(await changed(page, await rotateDrag(), rotated), 'two equal Rotate drags differ, so the comparison below means nothing').toBeLessThan(0.001);
  await page.reload();
  await page.getByRole('button', { name: 'Pan', exact: true }).click();
  const panned = await drag();
  expect(await changed(page, panned, rotated), 'Pan and Rotate moved the view the same way').toBeGreaterThan(0.05);
});
