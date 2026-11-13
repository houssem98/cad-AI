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
  // Mid-operation: the executor's real Python worker, on the test double, hangs inside new_part; its pid goes to kernel.pid.
  midop: async (_: unknown, ctx: Ctx) => {
    const { Executor } = await import('../cad/executor');
    const ex = await Executor.open({ dbPath: join(ctx.dir, 'cad.db'), dataDir: ctx.dir, workerArgs: ['--adapter', 'double', '--hang', 'new_part'] });
    writeFileSync(join(ctx.dir, 'kernel.pid'), String((ex as any).worker.proc.pid));
    await ex.execute({ id: 'p', target: { document: 'part' }, type: 'new_part', params: { name: 'p' }, preconditions: [], status: 'pending',
      result: null, verification: null, error: null }, { requestId: 'midop' });
    return { verified: false };
  },
};
