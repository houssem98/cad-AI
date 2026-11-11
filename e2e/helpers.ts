import { readFileSync } from 'node:fs';
import type { Page } from '@playwright/test';
import { PLATE_GLB, PLATE_VIEW } from './global-setup';

export const plateView = () => JSON.parse(readFileSync(PLATE_VIEW, 'utf8'));

// Serves the kernel-built plate on the document routes; either body can be replaced to test a failure.
export async function servePlate(page: Page, over: { glb?: Buffer | string; view?: unknown } = {}) {
  await page.route('**/api/documents/plate/preview', (r) => r.fulfill({ status: 200, contentType: 'model/gltf-binary', body: over.glb ?? readFileSync(PLATE_GLB) }));
  await page.route('**/api/documents/plate/inspect', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(over.view ?? plateView()) }));
}

// A valid GLB whose scene holds no mesh.
export function emptyGlb() {
  const json = Buffer.from(JSON.stringify({ asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [] }] }));
  const chunk = Buffer.concat([json, Buffer.alloc((4 - (json.length % 4)) % 4, 0x20)]);
  const head = Buffer.alloc(20);
  head.write('glTF', 0);
  head.writeUInt32LE(2, 4);
  head.writeUInt32LE(20 + chunk.length, 8);
  head.writeUInt32LE(chunk.length, 12);
  head.write('JSON', 16);
  return Buffer.concat([head, chunk]);
}

// Share of pixels whose colour moved by more than 8 in any channel between two equal-size PNGs, decoded in the page.
export const changed = (page: Page, a: Buffer, b: Buffer) => page.evaluate(async ([x, y]) => {
  const rgba = async (b64: string) => {
    const img = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob());
    const ctx = new OffscreenCanvas(img.width, img.height).getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    return ctx.getImageData(0, 0, img.width, img.height).data;
  };
  const [p, q] = [await rgba(x), await rgba(y)];
  let n = 0;
  for (let i = 0; i < p.length; i += 4) if (Math.max(Math.abs(p[i] - q[i]), Math.abs(p[i + 1] - q[i + 1]), Math.abs(p[i + 2] - q[i + 2])) > 8) n++;
  return n / (p.length / 4);
}, [a.toString('base64'), b.toString('base64')]);
