import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { Executor } from '../cad/executor';
import { JobEngine } from './jobEngine';

const HANDLERS = fileURLToPath(new URL('./handlers.ts', import.meta.url));
const TYPED = ['validation_failed', 'precondition_failed', 'unsupported', 'kernel_error', 'verification_failed'];
let engine: JobEngine;
afterEach(() => engine?.close(true));

const mm = (value: number) => ({ value, unit: 'mm' });
const op = (id: string, type: string, params: object) =>
  ({ id, target: { document: 'block' }, type, params, preconditions: [], status: 'pending', result: null, verification: null, error: null });

async function finished(id: string, ms = 120_000) {
  const end = Date.now() + ms;
  for (;;) {
    const j = engine.get(id)!;
    if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(j.state)) return j;
    if (Date.now() > end) throw new Error(`job still ${j.state}`);
    await new Promise((r) => setTimeout(r, 250));
  }
}

// Council C13 and the roadmap's "Invalid input files": step2cad through the engine and its worker, not only in-process.
describe('step2cad job through the engine', { timeout: 180_000 }, () => {
  it('rebuilds a STEP file the kernel wrote; a missing or broken file ends FAILED with a typed code and no STEP', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'job-s2c-'));
    const ex = await Executor.open({ dbPath: join(dir, 'source.db'), dataDir: dir, workerArgs: ['--adapter', 'kernel'] });
    let source: string;
    try {
      for (const o of [op('p', 'new_part', { name: 'block' }), op('s', 'sketch_rectangle', { plane: 'top', width: mm(40), height: mm(20) }),
        op('x', 'extrude', { sketch: 's', depth: mm(10) })]) expect((await ex.execute(o, { requestId: 's2c' })).status).toBe('succeeded');
      const out = await ex.execute(op('e', 'export', { format: 'step' }), { requestId: 's2c' });
      source = ex.store.artifact(out.record.artifactReferences[0].id)!.path;
    } finally {
      ex.close();
    }
    const broken = join(dir, 'broken.step');
    writeFileSync(broken, 'ISO-10303-21;\nHEADER;\n');

    engine = JobEngine.open({ dbPath: join(dir, 'jobs.db'), handlers: HANDLERS, types: ['step2cad'] });
    const ok = await finished(engine.submit('step2cad', { path: source }).id);
    expect(ok.state, JSON.stringify(ok.error)).toBe('COMPLETED');
    expect(ok.result.operations).toContain('extrude');
    for (const path of [join(dir, 'nope.step'), broken]) {
      const job = await finished(engine.submit('step2cad', { path }).id);
      expect(job.state, path).toBe('FAILED');
      expect(TYPED, `${path}: ${JSON.stringify(job.error)}`).toContain(job.error?.code);
      expect(job.result?.step ?? null, path).toBeNull();
    }
  });
});
