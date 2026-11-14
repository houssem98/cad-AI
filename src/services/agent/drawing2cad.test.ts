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
    // The reader's spec is exact, so the model is never asked to transcribe it again (8 holes once overran its reply).
    expect(seen.some((m) => m.includes('into a JSON spec'))).toBe(false);
    expect(JSON.parse(seen[0]).map((m: { content: string }) => m.content).join('\n')).toContain('"envelope_mm":[90,50,6]');
    const [a, b] = [(await ex.inspect('rebuilt')).verification, (await ex.inspect('src')).verification];
    expect(a.valid).toBe(true);
    expect(a.volume_mm3).toBeCloseTo(b.volume_mm3, 6);
  });

  // Council S1: the overall-size check alone took a rotated, slightly thick plate with its hole missing for the drawn part.
  it('does not accept a part that differs from the drawing in holes, axes or volume', async () => {
    for (const o of [op('s1', 'p', 'new_part', { name: 'plate' }), op('s1', 's', 'sketch_rectangle', { plane: 'top', width: mm(90), height: mm(50) }),
      op('s1', 'x', 'extrude', { sketch: 's', depth: mm(6) }), op('s1', 'h', 'hole', { diameter: mm(20), through_all: true, positions: [at(0, 0)] })])
      expect((await ex.execute(o, { requestId: 'd2c-s1' })).status).toBe('succeeded');
    const drawn = await ex.drawing('s1');
    const usage = { prompt_tokens: 0, completion_tokens: 0 };
    const wrong = [['new_part', { name: 'plate' }], ['sketch_rectangle', { plane: 'top', width: mm(50), height: mm(90) }], ['extrude', { sketch: 's', depth: mm(6.04) }]];
    let n = 0;
    const model: Complete = async () => {
      const t = wrong[n];
      return t ? { text: '', toolCalls: [{ id: `w${n}`, name: t[0] as string, arguments: JSON.stringify({ id: ['p', 's', 'x'][n++], params: t[1] }) }], usage }
        : { text: 'Done.', toolCalls: [], usage };
    };
    const out = await drawing2cad(drawn.files!.dxf, { executor: ex, document: 's1-rebuilt', requestId: 'd2c-s1b', complete: model });
    expect(out.kind, JSON.stringify(out)).toBe('failed');
    if (out.kind === 'failed') expect(out.message).toMatch(/kernel's last objection: the part measures 50 × 90 × 6.04 mm along X, Y and Z, but the drawing shows 90 × 50 × 6 mm/);
  });

  // Council V1: the volume and hole branches had no test, and depth was never compared, so a blind hole passed on a large plate.
  const drawPlate = async (doc: string, l: number, w: number, t: number, hole: object) => {
    for (const o of [op(doc, 'p', 'new_part', { name: 'plate' }), op(doc, 's', 'sketch_rectangle', { plane: 'top', width: mm(l), height: mm(w) }),
      op(doc, 'x', 'extrude', { sketch: 's', depth: mm(t) }), op(doc, 'h', 'hole', hole)]) expect((await ex.execute(o, { requestId: `d2c-${doc}` })).status).toBe('succeeded');
    return (await ex.drawing(doc)).files!.dxf;
  };
  const builds = (turns: [string, object][]): Complete => {
    let n = 0;
    const usage = { prompt_tokens: 0, completion_tokens: 0 };
    return async () => {
      const t = turns[n];
      return t ? { text: '', toolCalls: [{ id: `v${n}`, name: t[0], arguments: JSON.stringify({ id: ['p', 's', 'x', 'h'][n++], params: t[1] }) }], usage }
        : { text: 'Done.', toolCalls: [], usage };
    };
  };
  const plateTurns = (l: number, w: number, t: number, hole?: object): [string, object][] => [['new_part', { name: 'plate' }],
    ['sketch_rectangle', { plane: 'top', width: mm(l), height: mm(w) }], ['extrude', { sketch: 's', depth: mm(t) }], ...(hole ? [['hole', hole] as [string, object]] : [])];
  const objection = async (dxf: string, doc: string, model: Complete) => {
    const out = await drawing2cad(dxf, { executor: ex, document: doc, requestId: `d2c-${doc}`, complete: model });
    expect(out.kind, JSON.stringify(out)).toBe('failed');
    return out.kind === 'failed' ? out.message : '';
  };

  it('objects to a right-size part whose hole is missing, by its volume', async () => {
    const dxf = await drawPlate('v1a', 90, 50, 6, { diameter: mm(20), through_all: true, positions: [at(0, 0)] });
    expect(await objection(dxf, 'v1a-rebuilt', builds(plateTurns(90, 50, 6)))).toMatch(/the part's volume is 27000 mm3, but the drawn plate with its holes is 25115\.044 mm3/);
  });

  it('objects to a hole in the wrong place', async () => {
    const dxf = await drawPlate('v1b', 90, 50, 6, { diameter: mm(8), through_all: true, positions: [at(-25, 10)] });
    const moved = { diameter: mm(8), through_all: true, positions: [at(-24, 10)] };
    expect(await objection(dxf, 'v1b-rebuilt', builds(plateTurns(90, 50, 6, moved)))).toMatch(/has no through hole of diameter 8 mm along Z at x 20 mm, y 35 mm/);
  });

  it('objects to a hole that stops short, though its volume is inside the tolerance', async () => {
    const dxf = await drawPlate('v1c', 300, 200, 10, { diameter: mm(5), through_all: true, positions: [at(0, 0)] });
    const blind = { diameter: mm(5), depth: mm(7.1), positions: [at(0, 0)] };
    expect(await objection(dxf, 'v1c-rebuilt', builds(plateTurns(300, 200, 10, blind)))).toMatch(/has no through hole of diameter 5 mm along Z at x 150 mm, y 100 mm/);
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
