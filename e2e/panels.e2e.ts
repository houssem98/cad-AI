import { expect, test } from '@playwright/test';

const STATES = ['loading', 'empty', 'error', 'running', 'completed', 'cancelled'];
// A panel that sits behind an inspector tab names that tab.
const PANELS: Array<[string, string | null]> = [
  ['chat', null], ['viewport', null], ['properties', 'Properties'], ['tree', 'Feature Tree'], ['tasks', null], ['history', null],
];

for (const [panel, tab] of PANELS) {
  test(`${panel} renders each of the six states distinctly`, async ({ page }) => {
    const shots = new Map<string, Buffer>();
    for (const state of STATES) {
      await page.goto(`/?panels=${panel}:${state}`);
      if (tab) await page.getByRole('button', { name: tab, exact: true }).click();
      const frame = page.locator(`[data-panel="${panel}"]`);
      await expect(frame).toHaveAttribute('data-status', state);
      await expect(frame).toBeVisible();
      if (state !== 'completed') await expect(frame.getByRole(state === 'error' ? 'alert' : 'status')).toBeVisible();
      shots.set(state, await frame.screenshot({ animations: 'disabled' }));
    }
    for (const a of STATES) {
      for (const b of STATES) {
        if (a < b) expect(shots.get(a)!.equals(shots.get(b)!), `${panel}: ${a} and ${b} look the same`).toBe(false);
      }
    }
  });
}
