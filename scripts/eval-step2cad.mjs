#!/usr/bin/env node
// L6 T3, council C1, C2 and C19: the STEP-to-CAD eval. Each fixture in evals/step2cad/ goes through the step2cad job handler. The
// grader then imports the fixture and the handler's rebuilt STEP on its own kernel and compares the two (I3), never trusting the
// handler's verdict: volume within 0.1 %, every bounding-box bound within 0.001 mm, and a symmetric difference, measured by the
// kernel, of at most a 1e-6 mm skin over the fixture's surface; the rebuilt document must hold editable features, no import.
// A fixture marked unsupported passes only when the handler reports `unsupported` and writes no STEP.
// Before the cases, the grader must catch planted faults: another fixture, a volume 0.2 % off, a bound 0.01 mm off, and each part
// in faults/ (a moved hole, a mirrored bracket, a pocket without its pin), whose volume and box match its fixture's.
// Exit 0 only when every case passes, at least 10 are rebuilt and at least one is unsupported.
// Then the holdout (holdout/, written by a fresh agent and read only by this script) runs once and prints verdicts only. A false
// pass (the handler verified a part the grader finds different, or verified a case expected unsupported) fails the eval; any
// other miss is counted and reported, never tuned against.
//
//   node scripts/eval-step2cad.mjs
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CAD = new URL('../cad-AI/', import.meta.url);
const DIR = new URL('../evals/step2cad/', import.meta.url);
const HOLD = new URL('holdout/', DIR);
await import(new URL('node_modules/tsx/dist/esm/api/index.mjs', CAD)).then((m) => m.register());
const { Executor } = await import(new URL('src/services/cad/executor.ts', CAD));
const { handlers } = await import(new URL('src/services/jobs/handlers.ts', CAD));
const cases = JSON.parse(readFileSync(new URL('cases.json', DIR), 'utf8'));
const FAULTS = [['plate_holes_moved', 'plate_holes'], ['l_bracket_mirrored', 'l_bracket'], ['pin_pocket_bare', 'pin_pocket']];
const fixture = (c, base = DIR) => fileURLToPath(new URL(`fixtures/${c.file}`, base));
const tmp = mkdtempSync(join(tmpdir(), 'eval-step2cad-'));
const grader = await Executor.open({ dbPath: join(tmp, 'grader.db'), dataDir: tmp, workerArgs: ['--adapter', 'kernel'] });

let n = 0;
async function measure(path) {
  const id = `a${++n}`, data = readFileSync(path);
  grader.store.addArtifact({ id, kind: 'step', path, sha256: createHash('sha256').update(data).digest('hex'), bytes: data.length });
  const out = await grader.execute({ id, target: { document: id }, type: 'import', params: { artifact: id }, preconditions: [],
    status: 'pending', result: null, verification: null, error: null }, { requestId: 'eval-step2cad' });
  if (out.status !== 'succeeded') throw new Error(`the grader could not import ${path}: ${out.error?.message}`);
  const r = await grader.inspect(id);
  return { id, ...r.verification, area_mm2: r.result.area_mm2 };
}
const close = (a, b) => Math.abs(a.volume_mm3 - b.volume_mm3) <= 1e-3 * Math.abs(b.volume_mm3)
  && ['min', 'max'].every((end) => ['x', 'y', 'z'].every((k) => Math.abs(a.bbox_mm[end][k] - b.bbox_mm[end][k]) <= 1e-3));
const same = async (a, b) => close(a, b) && (await grader.compare(a.id, b.id)).difference_mm3 <= 1e-6 * b.area_mm2;

let bad = 0, failed = 0;
try {
  const ref = {};
  for (const c of cases) ref[c.file] = await measure(fixture(c));
  const rebuilt = cases.filter((c) => c.expect === 'rebuilt');
  for (const [i, c] of rebuilt.entries()) {
    const m = ref[c.file], other = ref[rebuilt[(i + 1) % rebuilt.length].file];
    const shifted = { ...m, bbox_mm: { ...m.bbox_mm, max: { ...m.bbox_mm.max, x: m.bbox_mm.max.x + 0.01 } } };
    if (!(await same(m, m)) || await same(other, m) || await same({ ...m, volume_mm3: m.volume_mm3 * 1.002 }, m) || await same(shifted, m)) {
      bad++;
      console.log(`self-check ${c.file}: the grader missed a planted fault or refused the fixture itself`);
    }
  }
  for (const [fault, of] of FAULTS) {
    const g = await measure(fileURLToPath(new URL(`faults/${fault}.step`, DIR))), m = ref[`${of}.step`];
    if (!close(g, m) || await same(g, m)) {
      bad++;
      console.log(`self-check ${fault}: ${close(g, m) ? 'the grader took it for its fixture' : 'it does not keep its fixture\'s volume and box'}`);
    }
  }

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
      ok = Boolean(out.verified && got && await same(got, ref[c.file]) && r.operations?.length && !r.operations.includes('import'));
      line = got ? `${r.operations.length} operations (${r.operations.join(' ')}), volume ${got.volume_mm3.toFixed(3)} of ${ref[c.file].volume_mm3.toFixed(3)}, difference ${r.difference_mm3.toExponential(2)} mm3`
        : `no rebuilt STEP: ${JSON.stringify(out.error ?? r.unsupported ?? null)}`;
    }
    if (!ok) failed++;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: ${line}`);
  }
  const counts = { rebuilt: rebuilt.length, unsupported: cases.length - rebuilt.length };
  if (counts.rebuilt < 10 || counts.unsupported < 1) bad++;
  console.log(`step2cad: ${cases.length - failed} of ${cases.length} cases pass (${counts.rebuilt} to rebuild, ${counts.unsupported} unsupported)`);

  const hold = JSON.parse(readFileSync(new URL('cases.json', HOLD), 'utf8'));
  const tally = { PASS: 0, MISS: 0, 'FALSE PASS': 0 };
  for (const c of hold) {
    const name = c.file.replace(/\.step$/, ''), path = fixture(c, HOLD);
    const out = await handlers.step2cad({ path }, { jobId: `holdout-${name}`, dir: join(tmp, `holdout-${name}`) });
    const right = out.verified && out.result?.step ? await same(await measure(out.result.step.path), await measure(path)) : false;
    const verdict = out.verified ? (c.expect === 'rebuilt' && right ? 'PASS' : 'FALSE PASS')
      : c.expect === 'unsupported' && out.error?.code === 'unsupported' ? 'PASS' : 'MISS';
    tally[verdict]++;
    console.log(`holdout ${name}: ${verdict}${verdict === 'MISS' ? ` (${out.error?.code})` : verdict === 'FALSE PASS' ? ` (expected ${c.expect}; the grader finds the rebuilt part ${right ? 'the same' : 'different'})` : ''}`);
  }
  console.log(`holdout: ${tally.PASS} of ${hold.length} as expected, ${tally.MISS} honest misses, ${tally['FALSE PASS']} false passes`);
  bad += failed + tally['FALSE PASS'];
} finally {
  grader.close();
}
process.exit(bad ? 1 : 0);
