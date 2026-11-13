import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

// L6 T4: jobs run through the real server, job engine, worker processes and kernel on recorded model responses. No route is stubbed.
const PLATE = 'Plate 100 mm by 60 mm by 5 mm.';
const HOLE = 'A 40 mm x 40 mm x 5 mm plate with a 6 mm through hole centred 30 mm from the plate centre along X.';

test('the tasks dashboard submits jobs, shows their progress, cancels one and downloads another', async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto('/');
  await page.locator('aside').getByRole('button', { name: 'Background Tasks' }).click();
  await expect(page.getByTestId('jobs-empty')).toBeVisible();
  const request = page.getByRole('textbox', { name: 'Text-to-CAD request' });
  const submit = page.getByRole('button', { name: 'Run in background' });

  await request.fill(HOLE);
  await submit.click();
  const cancelled = page.getByTestId('job').filter({ hasText: HOLE });
  await cancelled.getByRole('button', { name: 'Cancel' }).click();
  await expect(cancelled.getByTestId('job-state')).toHaveText('CANCELLED');
  await expect(cancelled.getByRole('button', { name: 'Cancel' })).toHaveCount(0);
  await expect(cancelled.getByRole('link', { name: 'Download STEP' })).toHaveCount(0);
  const cancelledId = (await cancelled.getAttribute('data-job-id'))!;

  await request.fill(PLATE);
  await submit.click();
  const done = page.getByTestId('job').filter({ hasText: PLATE });
  const progress = done.getByRole('progressbar');
  await expect(progress).toHaveAttribute('aria-valuenow', '2', { timeout: 60_000 });
  await expect(done.getByTestId('job-state')).toHaveText('COMPLETED', { timeout: 150_000 });
  await expect(progress).toHaveAttribute('aria-valuenow', '4');

  const [download] = await Promise.all([page.waitForEvent('download'), done.getByRole('link', { name: 'Download STEP' }).click()]);
  const file = readFileSync((await download.path())!);
  const job = await (await page.request.get(`/api/jobs/${await done.getAttribute('data-job-id')}`)).json();
  expect(file.toString('utf8', 0, 12)).toBe('ISO-10303-21');
  expect(createHash('sha256').update(file).digest('hex')).toBe(job.result.step.sha256);

  // The cancel held: still CANCELLED after the other job ran, and its worker is gone.
  const stopped = await (await page.request.get(`/api/jobs/${cancelledId}`)).json();
  expect(stopped.state).toBe('CANCELLED');
  expect(() => process.kill(stopped.pid, 0)).toThrow();
});
