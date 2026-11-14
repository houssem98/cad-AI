import { expect, test, type Page } from '@playwright/test';

// L7 T9: the Knowledge Hub ingests a local document and answers from it with citations, through the real server. Only the last
// test stubs a route, for states the real server cannot be made to show on demand.
const GUIDE = 'Wall thickness\nInjection-moulded ABS walls should be 2 to 3 mm thick.\n\nFillets\nInside corners take a fillet of half the wall thickness.\n';

const openHub = async (page: Page) => {
  await page.goto('/');
  await page.locator('aside').getByRole('button', { name: 'Knowledge Hub' }).click();
};

test('the hub ingests a local document and shows an answer with the chunk it cites', async ({ page }) => {
  await openHub(page);
  await page.getByLabel('Add a local document').setInputFiles({ name: 'e2e-design-guide.md', mimeType: 'text/markdown', buffer: Buffer.from(GUIDE) });
  await expect(page.getByTestId('source').filter({ hasText: 'e2e-design-guide.md' })).toContainText('2 chunks');

  await page.getByRole('textbox', { name: 'Question' }).fill('what fillet for an inside corner?');
  await page.getByRole('button', { name: 'Ask', exact: true }).click();
  await expect(page.getByTestId('citation')).toHaveText(['e2e-design-guide.md#1']);
  await expect(page.getByTestId('answer')).toContainText('Inside corners take a fillet of half the wall thickness.');
  await expect(page.getByTestId('answer')).toContainText('[e2e-design-guide.md#1, lines 4-5]');
  await expect(page.getByText('Yield Strength')).toHaveCount(0); // the mock material cards are gone

  await page.getByRole('textbox', { name: 'Question' }).fill('anodising colour codes');
  await page.getByRole('button', { name: 'Ask', exact: true }).click();
  await expect(page.getByTestId('answer')).toHaveText('No local document answers this.');
  await expect(page.getByTestId('citation')).toHaveCount(0);
});

test('the hub shows loading, an empty library and a read error as distinct states', async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>((r) => { release = r; });
  let down = false;
  await page.route('**/api/knowledge', async (r) => {
    if (r.request().method() !== 'GET') return r.continue();
    await gate;
    await (down ? r.fulfill({ status: 500, json: { error: { code: 'storage_error', message: 'library unavailable' } } }) : r.fulfill({ json: [] }));
  });
  await openHub(page);
  await expect(page.getByTestId('sources-loading')).toBeVisible();
  release();
  await expect(page.getByTestId('sources-empty')).toBeVisible();
  down = true;
  await openHub(page);
  await expect(page.getByTestId('sources-error')).toContainText('library unavailable');
});
