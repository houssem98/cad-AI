import { expect, test, type Page } from '@playwright/test';
import { servePlate } from './helpers';

// Graphite (L4 T1): neutral greys, one steel-blue accent, status colours, no gradients or glow.
// Every visible element's text, background and border colour is classified in OKLCH; anything else is reported.
const offPalette = (page: Page) => page.evaluate(() => {
  const ACCENT_HUE = 245;
  const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const oklabFromSrgb = (r: number, g: number, b: number) => {
    const [R, G, B] = [r, g, b].map(lin);
    const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
    const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
    const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
    return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
  };
  const num = (t: string, scale = 1) => (t.endsWith('%') ? (parseFloat(t) / 100) * scale : t === 'none' ? 0 : parseFloat(t));
  // Returns [chroma, hue, alpha], or null when the colour syntax is unknown.
  const parse = (css: string): [number, number, number] | null => {
    const m = css.trim().match(/^(rgba?|oklab|oklch|color)\((.*)\)$/);
    if (!m) return null;
    const [main, a = '1'] = m[2].split('/');
    const t = main.replace(/,/g, ' ').trim().split(/\s+/);
    const alpha = num(a.trim().replace(/,/g, ''));
    let L: number, A: number, B: number;
    if (m[1].startsWith('rgb')) {
      [L, A, B] = oklabFromSrgb(num(t[0], 255) / 255, num(t[1], 255) / 255, num(t[2], 255) / 255);
      return [Math.hypot(A, B), (Math.atan2(B, A) * 180 / Math.PI + 360) % 360, t[3] !== undefined ? num(t[3]) : alpha];
    }
    if (m[1] === 'color') {
      if (t[0] !== 'srgb') return null;
      [L, A, B] = oklabFromSrgb(num(t[1]), num(t[2]), num(t[3]));
    } else if (m[1] === 'oklab') {
      [L, A, B] = [num(t[0]), num(t[1], 0.4), num(t[2], 0.4)];
    } else {
      const C = num(t[1], 0.4), H = num(t[2]) * Math.PI / 180;
      [L, A, B] = [num(t[0]), C * Math.cos(H), C * Math.sin(H)];
    }
    return [Math.hypot(A, B), (Math.atan2(B, A) * 180 / Math.PI + 360) % 360, alpha];
  };
  const near = (h: number, c: number, w: number) => Math.abs(((h - c + 540) % 360) - 180) <= w;
  const verdict = (css: string) => {
    const p = parse(css);
    if (!p) return 'unparsed';
    const [C, H, alpha] = p;
    if (alpha === 0 || C < 0.015) return 'neutral';
    if (near(H, ACCENT_HUE, 6) && C <= 0.13) return 'accent';
    if (H >= 140 && H <= 175) return 'success';
    if (H >= 50 && H <= 95) return 'warning';
    if (H >= 10 && H <= 35) return 'error';
    return 'off';
  };
  const colours = (s: string) => s.match(/(?:rgba?|oklab|oklch|color)\([^()]*\)/g) ?? [];
  const out = new Set<string>();
  for (const el of document.querySelectorAll('body *')) {
    if (el.closest('svg') && el.tagName !== 'svg') continue;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    if (!r.width || !r.height || cs.visibility === 'hidden' || cs.opacity === '0') continue;
    const what = `${el.tagName.toLowerCase()} "${(el as HTMLElement).innerText?.replace(/\s+/g, ' ').trim().slice(0, 30) ?? ''}"`;
    const check = (prop: string, value: string) => { const v = verdict(value); if (v === 'off' || v === 'unparsed') out.add(`${v} ${prop} ${value} on ${what}`); };
    check('color', cs.color);
    check('background', cs.backgroundColor);
    for (const side of ['Top', 'Right', 'Bottom', 'Left'] as const) {
      if (parseFloat(cs[`border${side}Width`]) > 0 && cs[`border${side}Style`] !== 'none') check(`border-${side.toLowerCase()}`, cs[`border${side}Color`]);
    }
    if (cs.backgroundImage.includes('gradient(')) {
      const stops = colours(cs.backgroundImage).filter((c) => parse(c)?.[2] !== 0);
      if (new Set(stops).size > 1 || stops.some((c) => verdict(c) !== 'neutral')) out.add(`gradient ${cs.backgroundImage.slice(0, 80)} on ${what}`);
    }
    if (cs.boxShadow !== 'none') {
      for (const shadow of cs.boxShadow.split(/,(?![^()]*\))/)) {
        const colour = colours(shadow)[0] ?? '';
        const blur = parseFloat(shadow.replace(colour, '').trim().split(/\s+/).filter((x) => x.endsWith('px'))[2] ?? '0');
        if (blur > 0 && verdict(colour) !== 'neutral') out.add(`glow ${shadow.trim().slice(0, 80)} on ${what}`);
      }
    }
  }
  return [...out];
});

test('the palette check flags a planted violet background, cyan text, colour gradient and coloured glow', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-panel="viewport"]')).toHaveAttribute('data-status', 'completed', { timeout: 30_000 });
  await page.evaluate(() => {
    const add = (style: string) => { const d = document.createElement('div'); d.textContent = 'planted'; d.setAttribute('style', `position:fixed;left:0;top:0;width:40px;height:20px;${style}`); document.body.append(d); };
    add('background:oklch(0.6 0.2 300);color:#fff');
    add('color:oklch(0.8 0.12 210);background:#111');
    add('background-image:linear-gradient(#3a3a3a,#5b8db8);color:#fff');
    add('box-shadow:0 0 12px oklch(0.6 0.1 245);color:#fff');
  });
  const found = (await offPalette(page)).filter((x) => x.includes('"planted"'));
  const kind = (x: string) => x.split(' ').slice(0, x.startsWith('off') ? 2 : 1).join(' ');
  expect(found.map(kind).sort()).toEqual(['glow', 'gradient', 'off background', 'off color']);
});

for (const route of ['/', '/?part=plate']) {
  test(`at ${route} every colour is a Graphite grey, the steel accent or a status colour, with no gradient or glow`, async ({ page }) => {
    await servePlate(page);
    await page.goto(route);
    await expect(page.locator('[data-panel="viewport"]')).toHaveAttribute('data-status', 'completed', { timeout: 30_000 });
    expect(await offPalette(page)).toEqual([]);
  });
}
