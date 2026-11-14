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
  return text2cad(d.request, { ...ctx, spec });
}
