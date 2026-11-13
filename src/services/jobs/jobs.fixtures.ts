import { createHash } from 'node:crypto';
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Job types for the engine's tests only: they exercise states, heartbeats and limits without the CAD kernel.
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
type Ctx = { dir: string };
const artifact = (ctx: Ctx, text = 'ISO-10303-21;\n') => {
  mkdirSync(ctx.dir, { recursive: true });
  const path = join(ctx.dir, 'out.step');
  writeFileSync(path, text);
  return { path, sha256: createHash('sha256').update(text).digest('hex'), bytes: Buffer.byteLength(text), record: 'fixture' };
};

export const handlers = {
  quick: async (input: { ms?: number }, ctx: Ctx) => { await sleep(input.ms ?? 50); return { verified: true, result: { ok: true, step: artifact(ctx) } }; },
  unverified: async () => ({ verified: false, result: { why: 'the artifact did not match' } }),
  bare: async () => ({ verified: true, result: { ok: true } }), // claims verified with no artifact
  tampered: async (_: unknown, ctx: Ctx) => { const step = artifact(ctx); writeFileSync(step.path, 'changed'); return { verified: true, result: { step } }; },
  slow: async (_: unknown, ctx: Ctx) => { await sleep(120_000); return { verified: true, result: { step: artifact(ctx) } }; }, // heartbeats keep going
  hang: async () => { for (;;); }, // blocks the event loop, so no heartbeat is sent
  count: async (input: { file: string }, ctx: Ctx) => { appendFileSync(input.file, 'ran\n'); await sleep(200); return { verified: true, result: { step: artifact(ctx) } }; },
  crash: async () => { process.stderr.write('fixture crash: out of memory\n'); process.exit(1); }, // dies outside the worker's try
};
