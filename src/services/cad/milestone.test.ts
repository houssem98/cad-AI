import { copyFileSync, mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import { Executor } from './executor';

// L3 T5: a fixed operation sequence, no model. The STEP files land in cad-AI/milestone-out for the human's signoff.
const OUT = fileURLToPath(new URL('../../../milestone-out/', import.meta.url));
const mm = (value: number) => ({ value, unit: 'mm' });
const at = (x: number, y: number) => ({ x: mm(x), y: mm(y) });
const BOSSES = [at(-52, -32), at(52, -32), at(52, 32), at(-52, 32)];
const op = (document: string, id: string, type: string, params: object) => ({
  id, target: { document }, type, params, preconditions: [], status: 'pending', result: null, verification: null, error: null,
});

const ENCLOSURE = [
  op('enclosure', 'e1', 'new_part', { name: 'enclosure' }),
  op('enclosure', 'e2', 'sketch_rectangle', { plane: 'top', width: mm(120), height: mm(80) }),
  op('enclosure', 'e3', 'extrude', { sketch: 'e2', depth: mm(40) }),
  op('enclosure', 'e4', 'sketch_rectangle', { plane: 'top', width: mm(116), height: mm(76) }),
  op('enclosure', 'e5', 'cut', { sketch: 'e4', depth: mm(40), through_all: true }),
  op('enclosure', 'e6', 'sketch_rectangle', { plane: 'top', width: mm(120), height: mm(80) }),
  op('enclosure', 'e7', 'extrude', { sketch: 'e6', depth: mm(2) }),
  ...BOSSES.flatMap((center, i) => [
    op('enclosure', `b${i}`, 'sketch_circle', { plane: 'top', diameter: mm(6), center }),
    op('enclosure', `x${i}`, 'extrude', { sketch: `b${i}`, depth: mm(10) }),
  ]),
  op('enclosure', 'e8', 'hole', { diameter: mm(2.5), depth: mm(36), positions: BOSSES }),
  op('enclosure', 'e9', 'assign_material', { material: 'abs' }),
];
const LID = [
  op('lid', 'l1', 'new_part', { name: 'lid' }),
  op('lid', 'l2', 'sketch_rectangle', { plane: 'top', width: mm(120), height: mm(80) }),
  op('lid', 'l3', 'extrude', { sketch: 'l2', depth: mm(2) }),
  op('lid', 'l4', 'hole', { diameter: mm(3.4), through_all: true, positions: BOSSES }),
  op('lid', 'l5', 'assign_material', { material: 'abs' }),
];

// Shell: outer box minus the through cavity, plus the floor inside the walls; bosses above the floor; M3 tap holes 6 mm deep.
const ENCLOSURE_MM3 = 120 * 80 * 40 - 116 * 76 * 40 + 116 * 76 * 2 + 4 * Math.PI * 3 ** 2 * (10 - 2) - 4 * Math.PI * 1.25 ** 2 * 6;
const LID_MM3 = 120 * 80 * 2 - 4 * Math.PI * 1.7 ** 2 * 2;

let ex: Executor;
afterAll(() => ex?.close());

describe('headless milestone', { timeout: 180000 }, () => {
  it('builds a valid enclosure and lid at their analytic volumes, round-trips STEP, and records every operation', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'cad-milestone-'));
    ex = await Executor.open({ dbPath: join(dir, 'cad.db'), dataDir: dir, workerArgs: ['--adapter', 'kernel'] });
    const rows: string[] = [];
    const run = async (o: object) => {
      const out = await ex.execute(o, { requestId: 'milestone' });
      rows.push(out.operationId);
      expect(out.status, JSON.stringify(out.record?.errorDetails)).toBe('succeeded');
      return out;
    };
    mkdirSync(OUT, { recursive: true });
    for (const [name, seq, expected, height] of [['enclosure', ENCLOSURE, ENCLOSURE_MM3, 40], ['lid', LID, LID_MM3, 2]] as const) {
      for (const o of seq) await run(o);
      const inspected = (await run(op(name, `${name}-inspect`, 'inspect', {}))).record.validationResult.inspection;
      expect(inspected.valid).toBe(true);
      expect(inspected.counts.solids).toBe(1);
      expect(Math.abs(inspected.volume_mm3 - expected) / expected).toBeLessThan(5e-4);
      expect(inspected.bbox_mm).toEqual({ min: { x: expect.closeTo(-60, 3), y: expect.closeTo(-40, 3), z: expect.closeTo(0, 3) }, max: { x: expect.closeTo(60, 3), y: expect.closeTo(40, 3), z: expect.closeTo(height, 3) } });

      const exported = await run(op(name, `${name}-step`, 'export', { format: 'step' }));
      const [ref] = exported.record.artifactReferences;
      copyFileSync(ex.store.artifact(ref.id)!.path, join(OUT, `${name}.step`));
      await run(op(`${name}-copy`, `${name}-import`, 'import', { artifact: ref.id }));
      const back = (await run(op(`${name}-copy`, `${name}-copy-inspect`, 'inspect', {}))).record.validationResult.inspection;
      expect(Math.abs(back.volume_mm3 - inspected.volume_mm3) / inspected.volume_mm3).toBeLessThan(1e-4);
      expect(back.bbox_mm).toEqual(inspected.bbox_mm);
      console.log(`${name}: ${inspected.volume_mm3.toFixed(4)} mm3, analytic ${expected.toFixed(4)}, STEP back ${back.volume_mm3.toFixed(4)}`);
    }
    for (const id of rows) expect(ex.store.record(id)?.status).toBe('succeeded');
    console.log(`records: ${rows.length} operations, ${rows.filter((id) => ex.store.record(id)).length} records`);
  });
});
