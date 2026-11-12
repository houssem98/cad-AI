#!/usr/bin/env node
// L6 T3: the STEP-to-CAD eval. Each fixture in evals/step2cad/ goes through the step2cad job handler. The grader then imports
// the fixture and the handler's rebuilt STEP on its own kernel and compares the two (I3), never trusting the handler's verdict:
// volume within 0.1 % and every bounding-box bound within 0.001 mm, and the rebuilt document must hold editable features, no
// import. A fixture marked unsupported passes only when the handler reports `unsupported` and writes no STEP.
// Before the cases, the grader must catch planted faults: another fixture, a volume 0.2 % off, a bound 0.01 mm off.
// Exit 0 only when every case passes, at least 10 are rebuilt and at least one is unsupported.
//
//   node scripts/eval-step2cad.mjs
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CAD = new URL('../cad-AI/', import.meta.url);
const DIR = new URL('../evals/step2cad/', import.meta.url);
await import(new URL('node_modules/tsx/dist/esm/api/index.mjs', CAD)).then((m) => m.register());
const { Executor } = await import(new URL('src/services/cad/executor.ts', CAD));
const { handlers } = await import(new URL('src/services/jobs/handlers.ts', CAD));
const cases = JSON.parse(readFileSync(new URL('cases.json', DIR), 'utf8'));
const fixture = (c) => fileURLToPath(new URL(`fixtures/${c.file}`, DIR));
const tmp = mkdtempSync(join(tmpdir(), 'eval-step2cad-'));
const grader = await Executor.open({ dbPath: join(tmp, 'grader.db'), dataDir: tmp, workerArgs: ['--adapter', 'kernel'] });

let n = 0;
async function measure(path) {
  const id = `a${++n}`, data = readFileSync(path);
  grader.store.addArtifact({ id, kind: 'step', path, sha256: createHash('sha256').update(data).digest('hex'), bytes: data.length });
  const out = await grader.execute({ id, target: { document: id }, type: 'import', params: { artifact: id }, preconditions: [],
    status: 'pending', result: null, verification: null, error: null }, { requestId: 'eval-step2cad' });
  if (out.status !== 'succeeded') throw new Error(`the grader could not import ${path}: ${out.error?.message}`);
  return (await grader.inspect(id)).verification;
}
const same = (a, b) => Math.abs(a.volume_mm3 - b.volume_mm3) <= 1e-3 * Math.abs(b.volume_mm3)
  && ['min', 'max'].every((end) => ['x', 'y', 'z'].every((k) => Math.abs(a.bbox_mm[end][k] - b.bbox_mm[end][k]) <= 1e-3));

let bad = 0;
try {
  const ref = {};
  for (const c of cases) ref[c.file] = await measure(fixture(c));
  const rebuilt = cases.filter((c) => c.expect === 'rebuilt');
  rebuilt.forEach((c, i) => {
    const m = ref[c.file], other = ref[rebuilt[(i + 1) % rebuilt.length].file];
    const shifted = { ...m, bbox_mm: { ...m.bbox_mm, max: { ...m.bbox_mm.max, x: m.bbox_mm.max.x + 0.01 } } };
    if (!same(m, m) || same(other, m) || same({ ...m, volume_mm3: m.volume_mm3 * 1.002 }, m) || same(shifted, m)) {
      bad++;
      console.log(`self-check ${c.file}: the grader missed a planted fault or refused the fixture itself`);
    }
  });

  for (const c of cases) {
    const name = c.file.replace(/\.step$/, '');
    const out = await handlers.step2cad({ path: fixture(c) }, { jobId: name, dir: join(tmp, name) });
    const r = out.result ?? {};
    let ok, line;
    if (c.expect === 'unsupported') {
      ok = !out.verified && out.error?.code === 'unsupported' && !r.step;
      line = ok ? `unsupported: ${out.error.message}` : `expected unsupported, got ${out.verified ? 'verified' : JSON.stringify(out.error)}`;
    } else {
      const got = r.step ? await measure(r.step.path) : null;
      ok = Boolean(out.verified && got && same(got, ref[c.file]) && r.operations?.length && !r.operations.includes('import'));
      line = got ? `${r.operations.length} operations (${r.operations.join(' ')}), volume ${got.volume_mm3.toFixed(3)} of ${ref[c.file].volume_mm3.toFixed(3)}`
        : `no rebuilt STEP: ${JSON.stringify(out.error ?? r.unsupported ?? null)}`;
    }
    if (!ok) bad++;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: ${line}`);
  }
  const counts = { rebuilt: cases.filter((c) => c.expect === 'rebuilt').length, unsupported: cases.filter((c) => c.expect === 'unsupported').length };
  if (counts.rebuilt < 10 || counts.unsupported < 1) bad++;
  console.log(`step2cad: ${cases.length - bad} of ${cases.length} cases pass (${counts.rebuilt} to rebuild, ${counts.unsupported} unsupported)`);
} finally {
  grader.close();
}
process.exit(bad ? 1 : 0);
