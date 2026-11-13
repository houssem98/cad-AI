import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

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

const openTasks = async (page: Page) => {
  await page.goto('/');
  await page.locator('aside').getByRole('button', { name: 'Background Tasks' }).click();
};

// Council C23, C24, C28: states the real server cannot be made to show on demand, so the job list and cancel are stubbed here.
test('the dashboard shows loading, a cancel that never reached the server, and a stale list after a read error', async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>((r) => { release = r; });
  let down = false;
  const live = [{ id: 'stub-1', type: 'text2cad', input: { request: 'Stub plate' }, state: 'RUNNING', result: null, error: null, createdAt: new Date().toISOString() }];
  await page.route('**/api/jobs', async (r) => {
    if (r.request().method() !== 'GET') return r.continue();
    await gate;
    await (down ? r.fulfill({ status: 500, json: { error: { code: 'kernel_error', message: 'store unavailable' } } }) : r.fulfill({ json: live }));
  });
  await page.route('**/api/jobs/stub-1/cancel', (r) => r.abort('failed'));
  await openTasks(page);
  await expect(page.getByTestId('jobs-loading')).toBeVisible();
  release();
  const row = page.getByTestId('job').filter({ hasText: 'Stub plate' });
  await row.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('alert')).toContainText('Could not reach the server');
  down = true;
  await expect(page.getByRole('alert')).toContainText('Could not read the jobs: store unavailable');
  await expect(page.getByTestId('jobs-stale')).toBeVisible();
  await expect(row.getByRole('button', { name: 'Cancel' })).toHaveCount(0);
});

// Council D20: the server took the job but its answer was lost; the person then edits the request. That is a new request, so it
// must become a new job, not a conflict on the old idempotency key.
test('after a submit whose answer was lost, an edited request becomes its own job', async ({ page }) => {
  let first = true;
  await page.route('**/api/jobs', async (r) => {
    if (r.request().method() !== 'POST' || !first) return r.continue();
    first = false;
    await r.fetch();
    await r.abort('failed');
  });
  await openTasks(page);
  const box = page.getByRole('textbox', { name: 'Text-to-CAD request' });
  await box.fill('D20 lost answer, first text');
  await page.getByRole('button', { name: 'Run in background' }).click();
  await expect(page.getByRole('alert')).toContainText('Could not reach the server');
  await box.fill('D20 lost answer, edited text');
  await page.getByRole('button', { name: 'Run in background' }).click();
  await expect(page.getByTestId('job').filter({ hasText: 'D20 lost answer, edited text' })).toHaveCount(1);
  await expect(page.getByRole('alert')).toHaveCount(0);
});

// Council D21: a slow server must not pile up overlapping reads of the job list.
test('the job list is read one request at a time while the server is slow', async ({ page }) => {
  let open = 0, most = 0;
  await page.route('**/api/jobs', async (r) => {
    if (r.request().method() !== 'GET') return r.continue();
    most = Math.max(most, ++open);
    await new Promise((x) => setTimeout(x, 2_500));
    open--;
    await r.fulfill({ json: [] });
  });
  await openTasks(page);
  await page.waitForTimeout(6_000);
  expect(most).toBe(1);
});

test('a double click submits one job, and a failed job shows its error with no cancel or download', async ({ page }) => {
  test.setTimeout(180_000);
  await openTasks(page);
  await expect(page.getByTestId('jobs-empty').or(page.getByTestId('job').first())).toBeVisible();
  const rows = page.getByTestId('job').filter({ hasText: HOLE });
  const before = await rows.count();
  await page.getByRole('textbox', { name: 'Text-to-CAD request' }).fill(HOLE);
  await page.getByRole('button', { name: 'Run in background' }).dblclick();
  await expect(rows).toHaveCount(before + 1);
  await page.waitForTimeout(2_000);
  await expect(rows).toHaveCount(before + 1);
  const failed = rows.first();
  await expect(failed.getByTestId('job-state')).toHaveText('FAILED', { timeout: 150_000 });
  await expect(failed).toContainText('verification_failed');
  await expect(failed.getByRole('button', { name: 'Cancel' })).toHaveCount(0);
  await expect(failed.getByRole('link', { name: 'Download STEP' })).toHaveCount(0);
});
