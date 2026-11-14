#!/usr/bin/env node
// L7 T2: the Drawing-to-CAD eval, graded on the kernel's own inspection, never on the agent's words (I3). It is the only reader
// of evals/drawing2cad/holdout/ (docs/LOOP_CONVENTIONS.md, Judged steps); on the holdout it prints counts only.
//
//   node scripts/eval-drawing2cad.mjs --self-check          no model: every drawing reads as its case expects, every "part"
//                                                           case's spec built by fixed operations passes the grader against
//                                                           its reference STEP, and the grader refuses every planted fault
//   node scripts/eval-drawing2cad.mjs                       the improvement set through the live agent, 1 run, a line per case
//   node scripts/eval-drawing2cad.mjs --holdout --runs 3    the deciding analysis of docs/loops/L7_INTELLIGENCE.md (T2)
//
// The deciding rule (T2's line): a part passes when its kernel volume is within 1e-4 of the reference's, its bounding box within
// 1e-3 mm and its hole count equal; the part's position is free, so the box is compared as its extent along each axis, which the
// drawing's request names. This grader is stricter: each hole's diameter and its position from the box's minimum corner must
// also agree within 1e-3 mm. An "unsupported" case passes only on unsupported, an "asks" case only on a question with no document
// made. Exit 0 only when every case passes in every run.
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CAD = new URL('../cad-AI/', import.meta.url);
const args = process.argv.slice(2);
const selfCheck = args.includes('--self-check');
const holdout = args.includes('--holdout');
const runs = args.includes('--runs') ? Number(args[args.indexOf('--runs') + 1]) : holdout ? 3 : 1;
if (!(runs >= 1) || (holdout && runs < 3)) {
  console.error('eval-drawing2cad: --runs must be a number, and at least 3 on the holdout (the deciding rule needs 3 runs)');
  process.exit(2);
}
const DIR = new URL(holdout ? '../evals/drawing2cad/holdout/' : '../evals/drawing2cad/', import.meta.url);
const casesFile = new URL('cases.json', DIR);
if (!existsSync(casesFile)) {
  console.error(`eval-drawing2cad: no cases at ${fileURLToPath(casesFile)}`);
  process.exit(1);
}
const cases = JSON.parse(readFileSync(casesFile, 'utf8'));
const fixture = (f, base = DIR) => fileURLToPath(new URL(`fixtures/${f}`, base));
// Seen holdouts, retired after their deciding looks: the self-check runs them as a regression set and prints counts only.
const RETIRED = ['holdout-retired-1', 'holdout-retired-2'].map((d) => new URL(`../evals/drawing2cad/${d}/`, import.meta.url));

await import(new URL('node_modules/tsx/dist/esm/api/index.mjs', CAD)).then((m) => m.register());
const { Executor } = await import(new URL('src/services/cad/executor.ts', CAD));
const { drawing2cad } = await import(new URL('src/services/agent/drawing2cad.ts', CAD));

const tmp = mkdtempSync(join(tmpdir(), 'eval-drawing2cad-'));
const ex = await Executor.open({ dbPath: join(tmp, 'cad.db'), dataDir: tmp, workerArgs: ['--adapter', 'kernel'] });
const mm = (value) => ({ value, unit: 'mm' });
const op = (document, id, type, params) => ({ id, target: { document }, type, params, preconditions: [], status: 'pending', result: null, verification: null, error: null });
let n = 0;
const run = async (o) => {
  const out = await ex.execute(o, { requestId: 'eval-drawing2cad' });
  if (out.status !== 'succeeded') throw new Error(`${o.target.document} ${o.id}: ${out.error?.message}`);
};

async function reference(file, base = DIR) {
  const id = `ref${++n}`, path = fixture(file, base), data = readFileSync(path);
  ex.store.addArtifact({ id, kind: 'step', path, sha256: createHash('sha256').update(data).digest('hex'), bytes: data.length });
  await run(op(id, id, 'import', { artifact: id }));
  return id;
}

// The spec, built by a fixed operation sequence: the plate's minimum corner on the origin, holes at the spec's corner-relative positions.
async function build(s, { dx = 0, dt = 0, dd = 0, drop = false, blind = false, pocket = false } = {}) {
  const doc = `built${++n}`;
  for (const o of [op(doc, 'p', 'new_part', { name: doc }),
    op(doc, 's', 'sketch_rectangle', { plane: 'top', width: mm(s.length), height: mm(s.width), center: { x: mm(s.length / 2), y: mm(s.width / 2) } }),
    op(doc, 'x', 'extrude', { sketch: 's', depth: mm(s.height + dt) })]) await run(o);
  for (const [i, h] of s.holes.slice(drop ? 1 : 0).entries())
    await run(op(doc, `h${i}`, 'hole', { diameter: mm(h.diameter + (i ? 0 : dd)), ...(blind && !i ? { depth: mm(s.height * 0.7) } : { through_all: true }),
      positions: [{ x: mm(h.x + (i ? 0 : dx)), y: mm(h.y) }] }));
  if (pocket) { // a small pocket from below, near a corner: inside the volume tolerance on a large plate (council round 3, W1)
    const q = Math.min(3, s.length / 4, s.width / 4);
    await run(op(doc, 'k', 'sketch_rectangle', { plane: 'top', width: mm(q), height: mm(q), center: { x: mm(q), y: mm(q) } }));
    await run(op(doc, 'c', 'cut', { sketch: 'k', depth: mm(s.height / 2) }));
  }
  return doc;
}

const extents = (v) => ['x', 'y', 'z'].map((k) => v.bbox_mm.max[k] - v.bbox_mm.min[k]);
// Depth too (council V1): a small blind hole on a large plate stays inside the volume tolerance.
const holesAt = (r, v) => r.hole_list.map((h) => [h.diameter, h.point[0] - v.bbox_mm.min.x, h.point[1] - v.bbox_mm.min.y, h.depth]).sort((a, b) => a[1] - b[1] || a[2] - b[2] || a[0] - b[0]);
async function grade(doc, ref) {
  const [a, b] = [await ex.inspect(doc), await ex.inspect(ref)];
  const [va, vb] = [a.verification, b.verification];
  if (!va?.valid || va.counts.solids !== 1) return 'not one valid solid';
  if (Math.abs(va.volume_mm3 - vb.volume_mm3) > 1e-4 * vb.volume_mm3) return `volume ${va.volume_mm3.toFixed(3)} of ${vb.volume_mm3.toFixed(3)} mm3`;
  if (extents(va).some((e, i) => Math.abs(e - extents(vb)[i]) > 1e-3)) return `extents ${extents(va).map((e) => +e.toFixed(3))} of ${extents(vb).map((e) => +e.toFixed(3))} mm`;
  if (a.result.holes !== b.result.holes) return `${a.result.holes} holes of ${b.result.holes}`;
  if (va.counts.faces !== vb.counts.faces) return `${va.counts.faces} faces of ${vb.counts.faces}`; // a feature the drawing does not show (W1)
  const [ha, hb] = [holesAt(a.result, va), holesAt(b.result, vb)];
  if (ha.some((h, i) => h.some((x, k) => Math.abs(x - hb[i][k]) > 1e-3))) return `holes ${JSON.stringify(ha)} of ${JSON.stringify(hb)}`;
  return null;
}

let bad = 0;
try {
  if (selfCheck) {
    // One set: each drawing reads as expected, each "part" spec built by fixed operations matches its reference, and the grader
    // refuses every planted fault. Lines per case only when verbose.
    const checkSet = async (list, base, verbose) => {
      let failed = 0, faults = 0, caught = 0;
      for (const c of list) {
        const r = await ex.readDrawing(fixture(c.file, base));
        const kind = r.status === 'unsupported' ? 'unsupported' : r.drawing?.kind === 'asks' ? 'asks' : r.drawing?.kind === 'spec' ? 'part' : `failed (${r.error?.message})`;
        let line = kind === c.expect ? `reads as ${kind}` : `expected ${c.expect}, read as ${kind}`;
        let ok = kind === c.expect;
        if (ok && c.expect === 'part') {
          const ref = await reference(c.reference, base), s = r.drawing;
          const miss = await grade(await build(s), ref);
          ok = !miss;
          line += miss ? `, but its spec built by fixed operations differs: ${miss}` : `, and its spec built by fixed operations matches ${c.reference}`;
          const planted = [{ dt: 0.01 }, { pocket: true }, ...(s.holes.length ? [{ dx: 0.5 }, { dd: 0.1 }, { drop: true }, { blind: true }] : [])];
          for (const f of planted) {
            faults++;
            if (await grade(await build(s, f), ref)) caught++;
            else { ok = false; line += `; the grader passed a planted fault ${JSON.stringify(f)}`; }
          }
        }
        if (!ok) failed++;
        if (verbose) console.log(`${ok ? 'PASS' : 'FAIL'} ${c.file}: ${line}`);
      }
      return { failed, faults, caught };
    };
    const own = await checkSet(cases, DIR, true);
    console.log(`drawing2cad self-check: ${cases.length - own.failed} of ${cases.length} cases as expected, ${own.caught} of ${own.faults} planted faults caught`);
    bad += own.failed + own.faults - own.caught;
    for (const base of RETIRED) {
      const list = JSON.parse(readFileSync(new URL('cases.json', base), 'utf8'));
      const r = await checkSet(list, base, false);
      console.log(`drawing2cad self-check, ${base.pathname.split('/').filter(Boolean).at(-1)} (seen, counts only): ${list.length - r.failed} of ${list.length} cases as expected, ${r.caught} of ${r.faults} planted faults caught`);
      bad += r.failed + r.faults - r.caught;
    }
  } else {
    for (let k = 1; k <= runs; k++) {
      let passed = 0;
      for (const [i, c] of cases.entries()) {
        const doc = `run${k}-case${i}`;
        let ok = false, line;
        try {
          const out = await drawing2cad(fixture(c.file), { executor: ex, document: doc, requestId: `eval-drawing2cad-${k}-${i}` });
          if (c.expect === 'part') {
            const miss = out.kind === 'part' ? await grade(doc, await reference(c.reference)) : `ended ${out.kind}: ${out.message ?? out.question ?? ''}`;
            ok = !miss;
            line = miss ?? 'part matches its reference';
          } else {
            ok = out.kind === c.expect && (c.expect !== 'asks' || !ex.store.document(doc));
            line = `ended ${out.kind}`;
          }
        } catch (e) {
          line = `error: ${e.message}`;
        }
        if (ok) passed++;
        if (!holdout) console.log(`${ok ? 'PASS' : 'FAIL'} run ${k} ${c.file}: ${line}`);
      }
      console.log(`drawing2cad run ${k}${holdout ? ' (holdout)' : ''}: ${passed} of ${cases.length} cases pass`);
      if (passed < cases.length) bad++;
    }
  }
} finally {
  ex.close();
}
process.exit(bad ? 1 : 0);
