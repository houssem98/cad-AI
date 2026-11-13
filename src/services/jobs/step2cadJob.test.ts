import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { CadStore } from '../cad/cadStore';
import { Executor } from '../cad/executor';
import { sameSolid } from './handlers';
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
    // Council D15: the job's records start with the import, then the new part, then the plan's features.
    const store = new CadStore(join(dir, 'jobs', ok.id, 'cad.db'));
    try {
      const types = ok.result.records.map((id: string) => store.record(id));
      expect(types.map((r: any) => r.requestedOperation.type)).toEqual(['import', 'new_part', ...ok.result.operations]);
      expect(types.every((r: any) => r.status === 'succeeded')).toBe(true);
    } finally {
      store.close();
    }
    // Council D16: the result keeps the whole plan and every input of the same-solid verdict, so the verdict can be re-checked.
    expect(ok.result.plan.map((o: any) => o.type)).toEqual(ok.result.operations);
    expect(ok.result.check).toMatchObject({ area_mm2: expect.closeTo(2800, 6), limit_mm3: 1e-3, difference_mm3: ok.result.difference_mm3 });
    expect(ok.result.check.bbox_mm.rebuilt).toEqual(ok.result.check.bbox_mm.source);
    for (const path of [join(dir, 'nope.step'), broken]) {
      const job = await finished(engine.submit('step2cad', { path }).id);
      expect(job.state, path).toBe('FAILED');
      expect(TYPED, `${path}: ${JSON.stringify(job.error)}`).toContain(job.error?.code);
      expect(job.result?.step ?? null, path).toBeNull();
    }
  });

  // Council D5: a 1000 x 1000 x 200 mm block missing a 1 mm hole 3 mm deep is 2.356 mm3 off. The old limit, 1e-6 mm over its
  // 2.8e6 mm2 of surface, was 2.8 mm3 and passed it; the limit is now at most 1e-3 mm3.
  it('refuses a large part missing a small hole as the same solid (council D5)', () => {
    const block = { volume_mm3: 2e8, bbox_mm: { min: { x: 0, y: 0, z: 0 }, max: { x: 1000, y: 1000, z: 200 } } };
    expect(sameSolid({ ...block, volume_mm3: 2e8 - 2.356 }, block, 2.356, 2.8e6)).toBe(false);
    expect(sameSolid(block, block, 1e-3, 2.8e6)).toBe(true);
    expect(sameSolid(block, block, 2e-3, 2.8e6)).toBe(false);
  });
});
