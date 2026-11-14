#!/usr/bin/env node
// L8 T1: every module of the product feature matrix has a row in the readiness report, with a capability word from
// docs/LOOP_CONVENTIONS.md (I11) and, unless the row is UNTESTED or UNSUPPORTED, at least one test cited as `path#literal`
// in a test or eval file (graph-lint checks that each citation resolves).
// L8 T2: every claim of the parity spec has a row in the report's Parity table with either a test cited or UNSUPPORTED and
// its reason; UNTESTED is not allowed there.
// Before the report, the lint must catch planted faults: a module row removed, a claim row removed, and a claim row with
// neither a test nor UNSUPPORTED.
//
//   node scripts/readiness-lint.mjs
import { existsSync, readFileSync } from 'node:fs';

const MATRIX = new URL('../docs/cad-agent/research/PRODUCT_FEATURE_MATRIX.md', import.meta.url);
const SPEC = new URL('../docs/cad-agent/research/PARITY_SPEC.md', import.meta.url);
const REPORT = new URL('../docs/cad-agent/reports/PRODUCTION_READINESS.md', import.meta.url);
const WORDS = ['PRODUCTION READY', 'PARTIALLY IMPLEMENTED', 'MOCKED', 'UNTESTED', 'UNSUPPORTED'];
const TEST_FILE = /(\.test\.ts|\.e2e\.ts|\/test_[a-z0-9_]+\.py|\/eval-[a-z0-9]+\.mjs)$/;

// The cells of each table row under a "## <heading>" section, header and separator rows left out.
function rows(md, heading) {
  const start = md.indexOf(`\n${heading}\n`);
  if (start < 0) return [];
  const end = md.indexOf('\n## ', start + heading.length + 2);
  return md.slice(start, end < 0 ? undefined : end).split('\n').filter((l) => l.startsWith('| ')).slice(1) // the |---| line never starts with "| "
    .map((l) => l.slice(2, -2).split(' | ').map((c) => c.trim()));
}

const matrix = rows(readFileSync(MATRIX, 'utf8'), '## Modules');
const modules = matrix.map((c) => c[1]);
// The matrix numbers its modules 1 to N: a row the parser skipped shows as a gap (the first version skipped row 1).
if (matrix.some((c, i) => Number(c[0]) !== i + 1)) {
  console.log(`readiness-lint: the feature matrix's module numbers do not run 1 to ${matrix.length}: ${matrix.map((c) => c[0]).join(' ')}`);
  process.exit(1);
}
const spec = readFileSync(SPEC, 'utf8');
const claims = [...spec.slice(spec.indexOf('\n## Claims\n'), spec.indexOf('\n## Not in parity\n')).matchAll(/^- (P\d+) /gm)].map((m) => m[1]);
if (claims.some((p, i) => p !== `P${i + 1}`)) {
  console.log(`readiness-lint: the parity spec's claims do not run P1 to P${claims.length}: ${claims.join(' ')}`);
  process.exit(1);
}

function problems(report, heading, keys, label, parity) {
  const got = new Map(rows(report, heading).map((c) => [c[0], c]));
  const out = [];
  for (const m of keys) {
    const c = got.get(m);
    if (!c) { out.push(`no row for ${label} "${m}"`); continue; }
    if (!WORDS.includes(c[1])) out.push(`${m}: "${c[1]}" is not one of ${WORDS.join(', ')}`);
    const cited = [...(c[2] ?? '').matchAll(/`([^`#]+)#[^`]+`/g)].map((x) => x[1]);
    for (const p of cited) if (!TEST_FILE.test(p)) out.push(`${m}: ${p} is not a test or eval file`);
    if (parity && c[1] === 'UNTESTED') out.push(`${m}: neither a test name nor UNSUPPORTED`);
    if (parity && c[1] === 'UNSUPPORTED' && !c[3]) out.push(`${m}: UNSUPPORTED with no reason`);
    if (!['UNTESTED', 'UNSUPPORTED'].includes(c[1]) && !cited.length) out.push(`${m}: ${c[1]} with no test cited`);
  }
  for (const k of got.keys()) if (!keys.includes(k)) out.push(`row "${k}" names no ${label}`);
  return out;
}
const check = (r) => [...problems(r, '## Modules', modules, 'module'), ...problems(r, '## Parity', claims, 'parity claim', true)];

if (modules.length < 10 || claims.length < 20) {
  console.log(`readiness-lint: read ${modules.length} matrix modules and ${claims.length} parity claims; a table or list was not read`);
  process.exit(1);
}
if (!existsSync(REPORT)) {
  console.log('readiness-lint: no readiness report at docs/cad-agent/reports/PRODUCTION_READINESS.md');
  process.exit(1);
}
const report = readFileSync(REPORT, 'utf8');
const lines = report.split('\n');
const planted = {
  'a report missing a module row': [lines.filter((l) => !l.startsWith(`| ${modules[0]} |`)), 'no row for module'],
  'a report missing a parity claim row': [lines.filter((l) => !l.startsWith('| P1 |')), 'no row for parity claim'],
  'a parity claim with neither a test nor UNSUPPORTED': [lines.map((l) => (l.startsWith('| P1 |') ? '| P1 | UNTESTED | none | |' : l)), 'P1: neither'],
};
for (const [what, [faulty, expected]] of Object.entries(planted)) {
  if (!check(faulty.join('\n')).some((p) => p.startsWith(expected))) {
    console.log(`readiness-lint: self-check failed: ${what} was not caught`);
    process.exit(1);
  }
}
const found = check(report);
for (const p of found) console.log(`readiness-lint: ${p}`);
const covered = (label, n) => n - found.filter((p) => p.startsWith(`no row for ${label}`)).length;
console.log(`readiness-lint: ${modules.length} matrix modules, ${covered('module', modules.length)} with a row; ${claims.length} parity claims, ${covered('parity claim', claims.length)} with a row; ${found.length} problem(s)`);
process.exit(found.length ? 1 : 0);
