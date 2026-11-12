#!/usr/bin/env node
// L5 T1: the text-to-CAD eval, graded on the kernel's own inspection, never on the agent's words (I3).
// It is the only reader of evals/text2cad/holdout/ (docs/LOOP_CONVENTIONS.md, Judged steps); on the holdout it prints counts only.
//
//   node scripts/eval-text2cad.mjs                       improvement set, 1 run, a line per case
//   node scripts/eval-text2cad.mjs --holdout --runs 3    the deciding analysis of docs/loops/L5_AGENT.md
//   node scripts/eval-text2cad.mjs --self-check          every case's reference build passes and every planted fault is caught
//
// A case expects "part" or "asks". A part passes when the kernel finds one valid solid whose bounding-box extents, sorted,
// are each within 0.05 mm of size_mm (placement and orientation are not graded), whose volume is within 0.5 %, whose hole
// count (concave cylinders closing a full turn) is exact, and whose face count is at least min_faces. An "asks" case passes
// when the agent returns a non-empty question and no document was created. Exit 0 only when every run passes at least 80 %
// of its cases (12 of 15 on the holdout) and every "asks" case.
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CAD = new URL('../cad-AI/', import.meta.url);
const AGENT = new URL('src/services/agent/text2cad.ts', CAD); // L5 T2 and T3 write it
const args = process.argv.slice(2);
const holdout = args.includes('--holdout');
const runs = args.includes('--runs') ? Number(args[args.indexOf('--runs') + 1]) : holdout ? 3 : 1;
if (!(runs >= 1) || (holdout && runs < 3)) {
  console.error('eval-text2cad: --runs must be a number, and at least 3 on the holdout (the deciding rule needs 3 runs)');
  process.exit(2);
}

await import(new URL('node_modules/tsx/dist/esm/api/index.mjs', CAD)).then((m) => m.register());
const { Executor } = await import(new URL('src/services/cad/executor.ts', CAD));
const load = (dir) => JSON.parse(readFileSync(new URL(`../evals/text2cad/${dir}cases.json`, import.meta.url), 'utf8'));

const fmt = (xs) => `[${xs.map((x) => +x.toFixed(3)).join(', ')}]`;
function grade(c, out, inspected) {
  if (c.expect === 'asks') {
    const r = [];
    if (out?.kind !== 'asks' || !String(out.question ?? '').trim()) r.push(`expected a question, got ${out?.kind ?? 'nothing'}${out?.message ? ': ' + out.message : ''}`);
    if (inspected) r.push('a document was created');
    return r;
  }
  if (out?.kind !== 'part') return [`expected a part, got ${out?.kind ?? 'nothing'}${out?.message ? ': ' + out.message : ''}`];
  const v = inspected?.verification, k = c.checks;
  if (!v) return ['the kernel could not inspect the document'];
  const r = [];
  if (!(v.valid && v.counts.solids === 1)) r.push(`not one valid solid (valid ${v.valid}, solids ${v.counts.solids})`);
  const size = ['x', 'y', 'z'].map((a) => v.bbox_mm.max[a] - v.bbox_mm.min[a]).sort((a, b) => a - b);
  const want = [...k.size_mm].sort((a, b) => a - b);
  if (size.some((s, i) => Math.abs(s - want[i]) > 0.05)) r.push(`size ${fmt(size)} mm, expected ${fmt(want)} within 0.05`);
  if (Math.abs(v.volume_mm3 - k.volume_mm3) > 0.005 * k.volume_mm3) r.push(`volume ${v.volume_mm3.toFixed(2)} mm3, expected ${k.volume_mm3} within 0.5 %`);
  if (inspected.result?.holes !== k.holes) r.push(`holes ${inspected.result?.holes}, expected ${k.holes}`);
  if (!(v.counts.faces >= k.min_faces)) r.push(`faces ${v.counts.faces}, expected at least ${k.min_faces}`);
  return r;
}

const proposal = (document, o) => ({ ...o, target: { document }, preconditions: [], status: 'pending', result: null, verification: null, error: null });
async function reference(c, { executor, document, requestId }) {
  for (const o of c.reference ?? []) {
    const res = await executor.execute(proposal(document, o), { requestId });
    if (res.status !== 'succeeded') return { kind: 'failed', message: `${o.id} ${o.type}: ${res.error?.message ?? res.record?.error?.message ?? res.status}` };
  }
  return c.expect === 'asks' ? { kind: 'asks', question: 'reference' } : { kind: 'part' };
}

async function attempt(ex, c, build, document) {
  let out;
  try {
    out = await build(c, { executor: ex, document, requestId: document });
  } catch (e) {
    out = { kind: 'error', message: String(e?.message ?? e) };
  }
  return { out, inspected: ex.store.document(document) ? await ex.inspect(document) : null };
}

async function withExecutor(f) {
  const dir = mkdtempSync(join(tmpdir(), 'text2cad-'));
  const ex = await Executor.open({ dbPath: join(dir, 'cad.db'), dataDir: dir, workerArgs: ['--adapter', 'kernel'] });
  try {
    return await f(ex);
  } finally {
    ex.close();
    rmSync(dir, { recursive: true, force: true, maxRetries: 5 });
  }
}

// A planted fault in each graded quantity must fail the case, or the check grades nothing.
const FAULTS = {
  'volume +0.6 %': (d) => { d.verification.volume_mm3 *= 1.006; },
  'extent +0.06 mm': (d) => { d.verification.bbox_mm.max.x += 0.06; },
  'one hole more': (d) => { d.result.holes += 1; },
  'one face fewer': (d) => { d.verification.counts.faces -= 1; },
  'invalid solid': (d) => { d.verification.valid = false; },
};

async function selfCheck() {
  let bad = 0, total = 0;
  for (const [name, cases] of [['improvement', load('')], ['holdout', load('holdout/')]]) {
    let ok = 0;
    await withExecutor(async (ex) => {
      for (const c of cases) {
        const { out, inspected } = await attempt(ex, c, reference, c.id);
        const r = grade(c, out, inspected);
        if (c.expect === 'asks') {
          if (!grade(c, { kind: 'part' }, null).length || !grade(c, { kind: 'asks', question: ' ' }, null).length) r.push('a wrong answer passes');
        } else if (!r.length) {
          if (inspected.verification.counts.faces !== c.checks.min_faces) r.push(`min_faces ${c.checks.min_faces} is not tight: the reference has ${inspected.verification.counts.faces}`);
          for (const [fault, plant] of Object.entries(FAULTS)) {
            const d = structuredClone(inspected);
            plant(d);
            if (!grade(c, out, d).length) r.push(`${fault} is not caught`);
          }
        }
        if (r.length) console.log(`FAIL ${c.id}: ${r.join('; ')}`);
        else ok++;
      }
    });
    console.log(`${name}: ${ok} of ${cases.length} cases build their reference, pass every check, and catch every planted fault`);
    bad += cases.length - ok;
    total += cases.length;
  }
  return bad === 0 && total >= 40;
}

async function evaluate() {
  const cases = load(holdout ? 'holdout/' : '');
  const agent = existsSync(fileURLToPath(AGENT)) ? (await import(AGENT)).text2cad : null;
  const build = agent ? (c, ctx) => agent(c.request, ctx) : async () => ({ kind: 'none', message: `no agent: ${fileURLToPath(AGENT)} does not exist yet` });
  const bar = Math.ceil(0.8 * cases.length);
  let green = true;
  for (let run = 1; run <= runs; run++) {
    let passed = 0, asked = 0;
    const asks = cases.filter((c) => c.expect === 'asks').length;
    await withExecutor(async (ex) => {
      for (const c of cases) {
        const { out, inspected } = await attempt(ex, c, build, `${c.id}-r${run}`);
        const r = grade(c, out, inspected);
        if (!r.length) { passed++; if (c.expect === 'asks') asked++; }
        if (!holdout) console.log(`${r.length ? 'FAIL' : 'pass'} ${c.id}${r.length ? ': ' + r.join('; ') : ''}`);
      }
    });
    const ok = passed >= bar && asked === asks;
    green &&= ok;
    console.log(`${holdout ? 'holdout' : 'improvement'} run ${run}: ${passed} of ${cases.length} passed (bar ${bar}), ${asked} of ${asks} missing-dimension cases asked · ${ok ? 'meets' : 'below'} the rule`);
  }
  console.log(`eval-text2cad: ${green ? 'meets' : 'below'} the deciding rule over ${runs} run${runs > 1 ? 's' : ''}`);
  return green;
}

const green = args.includes('--self-check') ? await selfCheck() : await evaluate();
process.exit(green ? 0 : 1);
