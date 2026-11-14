import type { Spec } from './spec';
import { text2cad, type Text2CadContext, type Text2CadResult } from './text2cad';

// L7 T2, vector-first: a drawing → the worker's reader (spec and request, or a question) → the L5 agent → the kernel's verdict.
// A raster image, or a drawing the reader cannot read, is unsupported before any model call (I12).
export type Drawing2CadResult = Text2CadResult | { kind: 'unsupported'; message: string };

export async function drawing2cad(path: string, ctx: Text2CadContext): Promise<Drawing2CadResult> {
  const r = await ctx.executor.readDrawing(path);
  if (r.status === 'unsupported') return { kind: 'unsupported', message: r.error!.message };
  if (r.status !== 'succeeded') {
    const message = `the drawing could not be read: ${r.error?.message ?? r.status}`;
    return { kind: 'failed', message, report: { operations: [], unresolved: [], inspection: null, text: `Failed: ${message}` } };
  }
  const d = r.drawing;
  if (d.kind === 'asks') return { kind: 'asks', question: d.question, missing: [] };
  const mm = (name: string, value: number) => ({ name, value, unit: 'mm' as const, mm: value });
  const spec: Spec = {
    part: 'rectangular plate with through holes', envelope_mm: [d.length, d.width, d.height], assumptions: ['every hole goes through'],
    dimensions: [mm('length along X', d.length), mm('width along Y', d.width), mm('thickness along Z', d.height),
      ...d.holes.flatMap((h: { diameter: number; x: number; y: number }, i: number) => [mm(`hole ${i + 1} diameter`, h.diameter),
        mm(`hole ${i + 1} centre x from the corner`, h.x), mm(`hole ${i + 1} centre y from the corner`, h.y)])],
  };
  return text2cad(d.request, { ...ctx, spec, check: matches(d) });
}

// Council S1: the reader's spec is exact, so a part is accepted only when the kernel finds the drawing's own numbers, by the T2
// rule's tolerances: each axis's extent within 1e-3 mm, the plate-minus-holes volume within 1e-4, every hole by diameter and by
// position from the corner at minimum X and Y.
type Read = { length: number; width: number; height: number; holes: { diameter: number; x: number; y: number }[] };
function matches(d: Read) {
  const want = [d.length, d.width, d.height];
  const volume = d.length * d.width * d.height - d.holes.reduce((s, h) => s + Math.PI * (h.diameter / 2) ** 2 * d.height, 0);
  const n = (x: number) => +x.toFixed(3);
  return ({ verification: v, result }: { verification: any; result: any }) => {
    const got = ['x', 'y', 'z'].map((k) => v.bbox_mm.max[k] - v.bbox_mm.min[k]);
    if (got.some((g, i) => Math.abs(g - want[i]) > 1e-3))
      return `the part measures ${got.map(n).join(' × ')} mm along X, Y and Z, but the drawing shows ${want.map(n).join(' × ')} mm`;
    if (Math.abs(v.volume_mm3 - volume) > 1e-4 * volume) return `the part's volume is ${n(v.volume_mm3)} mm3, but the drawn plate with its holes is ${n(volume)} mm3`;
    const holes: { diameter: number; depth: number; point: number[]; direction: number[] }[] = result?.hole_list ?? [];
    if (holes.length !== d.holes.length) return `the part has ${holes.length} holes, but the drawing shows ${d.holes.length}`;
    // Depth too (council V1): a small blind hole on a large plate stays inside the volume tolerance.
    for (const h of d.holes)
      if (!holes.some((p) => Math.abs(p.direction[2]) > 1 - 1e-6 && Math.abs(p.diameter - h.diameter) <= 1e-3 && Math.abs(p.depth - d.height) <= 1e-3
        && Math.abs(p.point[0] - v.bbox_mm.min.x - h.x) <= 1e-3 && Math.abs(p.point[1] - v.bbox_mm.min.y - h.y) <= 1e-3))
        return `the part has no through hole of diameter ${n(h.diameter)} mm along Z at x ${n(h.x)} mm, y ${n(h.y)} mm from its corner at minimum X and Y`;
    // A plate with through holes has exactly 6 faces and one per hole; a fillet, chamfer or pocket the drawing does not show adds
    // faces while staying inside the volume tolerance (council round 3, W1).
    if (v.counts.faces !== 6 + d.holes.length) return `the part has ${v.counts.faces} faces, but the drawn plate with its holes has ${6 + d.holes.length}`;
    return null;
  };
}
