import { expect, test } from '@playwright/test';

// L5 T5: a request runs through the real server, executor and kernel on recorded model responses. No route is stubbed.
test('a request shows its plan, each operation and the final record, and its part opens from the served routes', async ({ page }) => {
  await page.goto('/');
  const chat = page.locator('[data-panel="chat"]');
  await chat.getByRole('textbox', { name: 'Message' }).fill('Plate 100 mm by 60 mm by 5 mm.');
  await chat.getByRole('button', { name: 'Send', exact: true }).click();
  const run = chat.getByTestId('agent-request').last();
  await expect(run.getByTestId('report')).toContainText('30000 mm3', { timeout: 90_000 });
  await expect(run.getByTestId('plan').first()).toBeVisible();
  for (const type of ['new_part', 'sketch_rectangle', 'extrude'])
    await expect(run.getByTestId('record').filter({ hasText: type }).first()).toContainText('succeeded');
  await run.getByText('Trace', { exact: true }).click();
  await expect(run.getByTestId('trace')).toContainText('"type":"record"');

  await run.getByRole('button', { name: 'Export STEP' }).click();
  const download = run.getByRole('link', { name: 'Download STEP' });
  await expect(download).toBeVisible({ timeout: 60_000 });
  const step = await page.request.get((await download.getAttribute('href'))!);
  expect(step.status()).toBe(200);
  expect((await step.text()).startsWith('ISO-10303-21')).toBe(true);

  const href = await run.getByRole('link', { name: 'Open part' }).getAttribute('href');
  await page.goto(href!);
  await expect(page.locator('[data-panel="viewport"]')).toHaveAttribute('data-status', 'completed', { timeout: 30_000 });
  await expect(page.getByTestId('verdict')).toHaveText('Kernel inspection: valid solid');
});
