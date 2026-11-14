import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Executor } from '../cad/executor';
import type { Complete } from '../model/modelClient';
import { drawing2cad } from './drawing2cad';

const mm = (value: number) => ({ value, unit: 'mm' });
const op = (document: string, id: string, type: string, params: object) =>
  ({ id, target: { document }, type, params, preconditions: [], status: 'pending', result: null, verification: null, error: null });
const at = (x: number, y: number) => ({ x: mm(x), y: mm(y) });

let ex: Executor, dir: string;
beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'drawing2cad-'));
  ex = await Executor.open({ dbPath: join(dir, 'cad.db'), dataDir: dir, workerArgs: ['--adapter', 'kernel'] });
});
afterAll(() => ex?.close());

// A scripted model, not a recording: it keeps what it was asked and builds a fixed plate, so the test grades the path, not a model.
function scripted(seen: string[]): Complete {
  const usage = { prompt_tokens: 0, completion_tokens: 0 };
  const spec = JSON.stringify({ part: 'plate', missing: [], assumptions: [], envelope: { values: [90, 50, 6], unit: 'mm' }, dimensions: [{ name: 'length', value: 90, unit: 'mm' }] });
  const turns = [['new_part', { name: 'plate' }], ['sketch_rectangle', { plane: 'top', width: mm(90), height: mm(50) }], ['extrude', { sketch: 's', depth: mm(6) }],
    ['hole', { diameter: mm(8), through_all: true, positions: [at(-25, 10)] }]];
  const ids = ['p', 's', 'x', 'h'];
  let n = 0;
  return async (r) => {
    seen.push(JSON.stringify(r.messages));
    if (r.json) return { text: spec, toolCalls: [], usage };
    const t = turns[n];
    return t ? { text: '', toolCalls: [{ id: `t${n}`, name: t[0] as string, arguments: JSON.stringify({ id: ids[n++], params: t[1] }) }], usage }
      : { text: 'Done.', toolCalls: [], usage };
  };
}

describe('drawing to CAD through the agent', { timeout: 180000 }, () => {
  it('reads a vector drawing into the request the agent builds, and the kernel verifies the part', async () => {
    for (const o of [op('src', 'p', 'new_part', { name: 'plate' }), op('src', 's', 'sketch_rectangle', { plane: 'top', width: mm(90), height: mm(50) }),
      op('src', 'x', 'extrude', { sketch: 's', depth: mm(6) }), op('src', 'h', 'hole', { diameter: mm(8), through_all: true, positions: [at(-25, 10)] })])
      expect((await ex.execute(o, { requestId: 'd2c' })).status).toBe('succeeded');
    const drawn = await ex.drawing('src');
    expect(drawn.status, JSON.stringify(drawn.error)).toBe('succeeded');

    const seen: string[] = [];
    const out = await drawing2cad(drawn.files!.dxf, { executor: ex, document: 'rebuilt', requestId: 'd2c-1', complete: scripted(seen) });
    expect(out.kind, JSON.stringify(out)).toBe('part');
    expect(seen[0]).toContain('Rectangular plate 90 mm long along X, 50 mm wide along Y and 6 mm thick along Z, with a through hole whose centre is measured from the plate\'s corner at minimum X and minimum Y: diameter 8 mm at x 20 mm, y 35 mm.');
    const [a, b] = [(await ex.inspect('rebuilt')).verification, (await ex.inspect('src')).verification];
    expect(a.valid).toBe(true);
    expect(a.volume_mm3).toBeCloseTo(b.volume_mm3, 6);
  });

  it('refuses a raster image as unsupported before any model call or document', async () => {
    const scan = join(dir, 'scan.png');
    writeFileSync(scan, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const seen: string[] = [];
    const out = await drawing2cad(scan, { executor: ex, document: 'from-scan', requestId: 'd2c-2', complete: scripted(seen) });
    expect(out).toEqual({ kind: 'unsupported', message: expect.stringContaining('raster') });
    expect(seen).toEqual([]);
    expect(ex.store.document('from-scan')).toBeFalsy();
  });
});
