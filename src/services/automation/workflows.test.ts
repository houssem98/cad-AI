import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Executor } from '../cad/executor';
import { replay, WorkflowStore, type Workflow } from './workflows';

const P = (name: string) => ({ $param: name });
const PLATE: Workflow = {
  id: 'plate', name: 'Rectangular plate',
  params: [{ name: 'length', unit: 'mm', default: 100 }, { name: 'width', unit: 'mm', default: 60 }, { name: 'thickness', unit: 'mm', default: 5 }],
  steps: [
    { id: 'p', type: 'new_part', params: { name: 'plate' } },
    { id: 's', type: 'sketch_rectangle', params: { plane: 'top', width: P('length'), height: P('width') } },
    { id: 'x', type: 'extrude', params: { sketch: 's', depth: P('thickness') } },
  ],
};

let ex: Executor;
let store: WorkflowStore;
beforeAll(async () => {
  const dir = mkdtempSync(join(tmpdir(), 'workflows-'));
  ex = await Executor.open({ dbPath: join(dir, 'cad.db'), dataDir: dir, workerArgs: ['--adapter', 'kernel'] });
  store = new WorkflowStore(join(dir, 'workflows'));
});
afterAll(() => ex?.close());

const inspect = async (document: string) =>
  (await ex.execute({ id: `${document}-i`, target: { document }, type: 'inspect', params: {}, preconditions: [], status: 'pending', result: null, verification: null, error: null },
    { requestId: 'wf-test' })).record.validationResult.inspection;

describe('saved, versioned, parameterized workflows', { timeout: 180000 }, () => {
  it('replays a saved workflow at new parameters into geometry the kernel verifies', async () => {
    const saved = store.save(PLATE);
    expect(saved.version).toBe(1);
    const out = await replay(ex, store.load('plate'), { length: 80, width: 40, thickness: 8 }, { document: 'plate-80', requestId: 'wf-1' });
    expect(out.status, out.error).toBe('succeeded');
    expect(out.outcomes.map((o) => o.status)).toEqual(['succeeded', 'succeeded', 'succeeded']);
    for (const o of out.outcomes) expect(ex.store.record(o.operationId)?.status).toBe('succeeded');
    const v = await inspect('plate-80');
    expect(v.valid).toBe(true);
    expect(v.volume_mm3).toBeCloseTo(80 * 40 * 8, 3);
    expect(v.bbox_mm.max.x - v.bbox_mm.min.x).toBeCloseTo(80, 6);
    expect(v.bbox_mm.max.y - v.bbox_mm.min.y).toBeCloseTo(40, 6);
    expect(v.bbox_mm.max.z - v.bbox_mm.min.z).toBeCloseTo(8, 6);

    const defaults = await replay(ex, store.load('plate'), {}, { document: 'plate-default', requestId: 'wf-2' });
    expect(defaults.status, defaults.error).toBe('succeeded');
    expect((await inspect('plate-default')).volume_mm3).toBeCloseTo(100 * 60 * 5, 3);
  });

  it('keeps every saved version', () => {
    const v2 = store.save({ ...PLATE, params: PLATE.params.map((p) => (p.name === 'thickness' ? { ...p, default: 3 } : p)) });
    expect(v2.version).toBe(2);
    expect(store.versions('plate')).toEqual([1, 2]);
    expect(store.load('plate', 1).params.find((p) => p.name === 'thickness')?.default).toBe(5);
    expect(store.load('plate').params.find((p) => p.name === 'thickness')?.default).toBe(3);
  });

  it('refuses a workflow holding a step that is not a typed operation', () => {
    const withStep = (step: object): Workflow => ({ ...PLATE, id: 'bad', steps: [...PLATE.steps, step as Workflow['steps'][number]] });
    expect(() => store.save(withStep({ id: 'r', type: 'run_script', params: { code: 'import os' } }))).toThrow(/steps\/3\/type: must be one of/);
    expect(() => store.save(withStep({ id: 'r', type: 'extrude', params: { sketch: 's', depth: P('thickness') }, code: 'import os' }))).toThrow(/steps\/3\/code: not allowed/);
    expect(() => store.save(withStep({ id: 'r', type: 'extrude', params: { sketch: 's', depth: P('height') } }))).toThrow(/steps\/3: parameter height is not declared/);
    expect(() => store.save({ ...PLATE, id: '../escape' })).toThrow(/id/);
    expect(store.versions('bad')).toEqual([]);
  });

  it('asks for a parameter that has no value instead of guessing it', async () => {
    const noDefault = store.save({ ...PLATE, id: 'plate-nd', params: PLATE.params.map(({ name, unit }) => ({ name, unit })) });
    const out = await replay(ex, noDefault, { length: 80, width: 40 }, { document: 'plate-nd', requestId: 'wf-3' });
    expect(out.status).toBe('failed');
    expect(out.error).toBe('missing parameter thickness');
    expect(out.outcomes).toEqual([]);
  });
});
