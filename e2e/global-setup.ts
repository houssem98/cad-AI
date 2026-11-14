import { copyFileSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Executor } from '../src/services/cad/executor';

// The viewport suite renders a part the real kernel built and tessellated, never a hand-made mesh.
export const PLATE_GLB = fileURLToPath(new URL('./.fixtures/plate.glb', import.meta.url));
export const PLATE_VIEW = fileURLToPath(new URL('./.fixtures/plate.view.json', import.meta.url));
export const PLATE_DXF = fileURLToPath(new URL('./.fixtures/plate.dxf', import.meta.url)); // the kernel's drawing of the plate (L7 T10)

const mm = (value: number) => ({ value, unit: 'mm' });
const op = (id: string, type: string, params: object) => ({
  id, target: { document: 'plate' }, type, params, preconditions: [], status: 'pending', result: null, verification: null, error: null,
});
const PLATE = [
  op('p', 'new_part', { name: 'plate' }),
  op('s', 'sketch_rectangle', { plane: 'top', width: mm(120), height: mm(80) }),
  op('x', 'extrude', { sketch: 's', depth: mm(10) }),
  op('h', 'hole', { diameter: mm(6), through_all: true, positions: [[-50, -30], [50, -30], [50, 30], [-50, 30]].map(([x, y]) => ({ x: mm(x), y: mm(y) })) }),
];

export default async function globalSetup() {
  const dir = mkdtempSync(join(tmpdir(), 'cad-e2e-'));
  const ex = await Executor.open({ dbPath: join(dir, 'cad.db'), dataDir: dir, workerArgs: ['--adapter', 'kernel'] });
  try {
    for (const o of PLATE) {
      const out = await ex.execute(o, { requestId: 'e2e' });
      if (out.status !== 'succeeded') throw new Error(`${o.id} ${out.status}: ${out.record?.errorDetails?.message}`);
    }
    const preview = await ex.preview('plate');
    if (preview.status !== 'succeeded') throw new Error(`preview ${preview.status}: ${preview.error?.message}`);
    const view = await ex.view('plate');
    if (view.status !== 'succeeded') throw new Error(`view ${view.status}: ${view.error?.message}`);
    mkdirSync(dirname(PLATE_GLB), { recursive: true });
    writeFileSync(PLATE_GLB, preview.glb!);
    writeFileSync(PLATE_VIEW, JSON.stringify(view.view));
    const drawn = await ex.drawing('plate');
    if (drawn.status !== 'succeeded') throw new Error(`drawing ${drawn.status}: ${drawn.error?.message}`);
    copyFileSync(drawn.files!.dxf, PLATE_DXF);
  } finally {
    ex.close();
  }
}
