#!/usr/bin/env node
// L8 T1: every module of the product feature matrix has a row in the readiness report, with a capability word from
// docs/LOOP_CONVENTIONS.md (I11) and, unless the row is UNTESTED or UNSUPPORTED, at least one test cited as `path#literal`
// (graph-lint checks that each citation resolves).
// L8 T2: every claim of the parity spec has a row in the report's Parity table with either a test cited or UNSUPPORTED and
// its reason; UNTESTED is not allowed there.
// L8 T5 (council X5, X8): a cited literal must name a test, the start of an it()/test() title or a pytest `def test_`;
// PRODUCTION READY needs the human's T6 signoff; the Security table has one row per T3 requirement, under the Parity rules.
// Before the report, the lint must catch planted faults: a module row removed, a claim row removed, a claim row with neither
// a test nor UNSUPPORTED, a PRODUCTION READY row backed by a fragment of a test file, and a Security row with no test.
//
//   node scripts/readiness-lint.mjs
import { existsSync, readFileSync } from 'node:fs';

const MATRIX = new URL('../docs/cad-agent/research/PRODUCT_FEATURE_MATRIX.md', import.meta.url);
const SPEC = new URL('../docs/cad-agent/research/PARITY_SPEC.md', import.meta.url);
const REPORT = new URL('../docs/cad-agent/reports/PRODUCTION_READINESS.md', import.meta.url);
const LEDGER = new URL('../docs/loops/L8_RELEASE.md', import.meta.url);
const WORDS = ['PRODUCTION READY', 'PARTIALLY IMPLEMENTED', 'MOCKED', 'UNTESTED', 'UNSUPPORTED'];
const TEST_FILE = /(\.test\.ts|\.e2e\.ts|\/test_[a-z0-9_]+\.py)$/;
const SECURITY = ['Keys in the OS credential store', 'No key in logs or the bundle', 'Permission levels per tool',
  'Audit trail of every operation', 'Structured logs', 'Rate and resource limits'];
const signed = readFileSync(LEDGER, 'utf8').includes('- [x] T6 (human) Signoff');

// The names of the tests a file holds: it()/test() titles as written, and pytest functions as `def test_...`.
const tests = new Map();
function names(path) {
  if (!tests.has(path)) {
    const file = new URL(`../${path}`, import.meta.url);
    const text = existsSync(file) ? readFileSync(file, 'utf8') : '';
    tests.set(path, path.endsWith('.py') ? [...text.matchAll(/^def (test_\w+)/gm)].map((m) => `def ${m[1]}`)
      : [...text.matchAll(/\b(?:it|test)\(\s*(['"`])((?:\\.|(?!\1).)*)\1/g)].map((m) => m[2]));
  }
  return tests.get(path);
}

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

function problems(report, heading, keys, label, strict) {
  const got = new Map(rows(report, heading).map((c) => [c[0], c]));
  const out = [];
  for (const m of keys) {
    const c = got.get(m);
    if (!c) { out.push(`no row for ${label} "${m}"`); continue; }
    if (!WORDS.includes(c[1])) out.push(`${m}: "${c[1]}" is not one of ${WORDS.join(', ')}`);
    if (c[1] === 'PRODUCTION READY' && !signed) out.push(`${m}: PRODUCTION READY needs the human's L8 T6 signoff`);
    const cited = [...(c[2] ?? '').matchAll(/`([^`#]+)#([^`]+)`/g)];
    for (const [, p, literal] of cited) {
      if (!TEST_FILE.test(p)) out.push(`${m}: ${p} is not a test file`);
      else if (!names(p).some((t) => t.startsWith(literal))) out.push(`${m}: "${literal}" is not the start of a test name in ${p}`);
    }
    if (strict && c[1] === 'UNTESTED') out.push(`${m}: neither a test name nor UNSUPPORTED`);
    if (strict && c[1] === 'UNSUPPORTED' && !c[3]) out.push(`${m}: UNSUPPORTED with no reason`);
    if (!['UNTESTED', 'UNSUPPORTED'].includes(c[1]) && !cited.length) out.push(`${m}: ${c[1]} with no test cited`);
  }
  for (const k of got.keys()) if (!keys.includes(k)) out.push(`row "${k}" names no ${label}`);
  return out;
}
const check = (r) => [...problems(r, '## Modules', modules, 'module'), ...problems(r, '## Parity', claims, 'parity claim', true),
  ...problems(r, '## Security', SECURITY, 'security requirement', true)];

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
const swap = (start, row) => lines.map((l) => (l.startsWith(start) ? row : l));
const planted = {
  'a report missing a module row': [lines.filter((l) => !l.startsWith(`| ${modules[0]} |`)), 'no row for module'],
  'a report missing a parity claim row': [lines.filter((l) => !l.startsWith('| P1 |')), 'no row for parity claim'],
  'a parity claim with neither a test nor UNSUPPORTED': [swap('| P1 |', '| P1 | UNTESTED | none | |'), 'P1: neither'],
  'a PRODUCTION READY row backed by a fragment of a test file': [swap(`| ${modules[0]} |`, `| ${modules[0]} | PRODUCTION READY | \`cad-AI/src/services/log.test.ts#it(\` | |`), `${modules[0]}: "it(" is not the start of a test name`],
  'a Security row with no test': [swap(`| ${SECURITY[3]} |`, `| ${SECURITY[3]} | PRODUCTION READY | none | |`), `${SECURITY[3]}: PRODUCTION READY with no test cited`],
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
console.log(`readiness-lint: ${modules.length} matrix modules, ${covered('module', modules.length)} with a row; ${claims.length} parity claims, ${covered('parity claim', claims.length)} with a row; ${SECURITY.length} security requirements, ${covered('security requirement', SECURITY.length)} with a row; ${found.length} problem(s)`);
process.exit(found.length ? 1 : 0);
