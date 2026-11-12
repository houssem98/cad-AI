import { expect, test, type Page } from '@playwright/test';
import { servePlate } from './helpers';

// Visible button and tab labels with a run of text that breaks onto a second line.
const wrapped = (page: Page) => page.evaluate(() => [...document.querySelectorAll('button, [role="tab"]')]
  .filter((el) => (el as HTMLElement).getClientRects().length > 0)
  .filter((el) => {
    const tops = new Map<Element, number[]>(); // text runs grouped by their parent element
    const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      if (!n.textContent!.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(n);
      const list = tops.get(n.parentElement!) ?? [];
      list.push(...[...range.getClientRects()].map((r) => r.top));
      tops.set(n.parentElement!, list);
    }
    return [...tops.values()].some((t) => Math.max(...t) - Math.min(...t) > 4);
  })
  .map((el) => (el as HTMLElement).innerText.replace(/\s+/g, ' ').trim()));

// Visible buttons and tabs whose content is wider or taller than the control itself.
const spilled = (page: Page) => page.evaluate(() => [...document.querySelectorAll('button, [role="tab"]')]
  .filter((el) => (el as HTMLElement).getClientRects().length > 0)
  .filter((el) => el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1)
  .map((el) => (el as HTMLElement).innerText.replace(/\s+/g, ' ').trim()));

// Visible elements that cross their panel's edge (header, sidebar or a [data-panel]) or the nearest ancestor that clips them.
// Only vertical scrolling is allowed: nothing in the workspace is meant to scroll sideways, so a sideways overflow is a fault.
const cutOff = (page: Page) => page.evaluate(() => {
  const out: string[] = [];
  const outside = (r: DOMRect, b: DOMRect, axis: 'X' | 'Y') =>
    axis === 'X' ? r.left < b.left - 1 || r.right > b.right + 1 : r.top < b.top - 1 || r.bottom > b.bottom + 1;
  for (const el of document.querySelectorAll('body *')) {
    if (el.closest('svg') && el.tagName !== 'svg') continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height || getComputedStyle(el).visibility === 'hidden') continue;
    const panel = el.parentElement?.closest('header, aside, [data-panel]');
    const name = `${el.tagName.toLowerCase()} "${(el as HTMLElement).innerText?.replace(/\s+/g, ' ').trim().slice(0, 40) ?? ''}" ${(el.getAttribute('class') ?? '').slice(0, 60)}`;
    for (const axis of ['X', 'Y'] as const) {
      let scrolls = false; // a vertical scroller inside the panel lets the element sit past the panel's edge
      let clipped = false;
      for (let a = el.parentElement; a; a = a.parentElement) {
        const overflow = getComputedStyle(a)[`overflow${axis}`];
        if (overflow === 'visible') continue;
        if (axis === 'Y' && (overflow === 'auto' || overflow === 'scroll')) { scrolls = !!panel?.contains(a); break; }
        if (!clipped && outside(r, a.getBoundingClientRect(), axis)) out.push(`${axis} clip ${name}`);
        clipped = true; // only the nearest clip is checked; keep climbing to find a scroller
      }
      if (panel && !scrolls && outside(r, panel.getBoundingClientRect(), axis)) out.push(`${axis} panel ${name}`);
    }
  }
  return out;
});

for (const [width, height] of [[1440, 900], [1280, 720]]) {
  for (const route of ['/', '/?part=plate']) {
    test(`at ${width} × ${height}, ${route} has no wrapped label, no cut-off element, and every sidebar module is reachable`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await servePlate(page);
      await page.goto(route);
      await expect(page.locator('[data-panel="viewport"]')).toHaveAttribute('data-status', 'completed', { timeout: 30_000 }); // a cold dev server on a loaded machine takes up to ~17 s
      if (route !== '/') await expect(page.locator('[data-panel="viewport"] [data-size-mm]')).not.toHaveAttribute('data-size-mm', '');
      expect.soft(await wrapped(page), 'labels that wrap').toEqual([]);
      expect.soft(await spilled(page), 'labels wider than their control').toEqual([]);
      expect.soft(await cutOff(page), 'elements cut off by a panel edge').toEqual([]);
      const modules = page.locator('aside').getByRole('button');
      expect(await modules.count()).toBeGreaterThan(10);
      for (const b of await modules.all()) await b.click({ trial: true, timeout: 10_000 }); // scrolls it into view and fails if hidden or covered
    });
  }
}
