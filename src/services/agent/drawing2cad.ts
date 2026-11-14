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
  if (r.drawing.kind === 'asks') return { kind: 'asks', question: r.drawing.question, missing: [] };
  return text2cad(r.drawing.request, ctx);
}
