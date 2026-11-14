#!/usr/bin/env node
// L8 T1: every module of the product feature matrix has a row in the readiness report, with a capability word from
// docs/LOOP_CONVENTIONS.md (I11) and, unless the row is UNTESTED or UNSUPPORTED, at least one test cited as `path#literal`
// in a test or eval file (graph-lint checks that each citation resolves). Before the report, the lint must catch a planted
// fault: the same report with one module's row removed.
//
//   node scripts/readiness-lint.mjs
import { existsSync, readFileSync } from 'node:fs';

const MATRIX = new URL('../docs/cad-agent/research/PRODUCT_FEATURE_MATRIX.md', import.meta.url);
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

function problems(report) {
  const got = new Map(rows(report, '## Modules').map((c) => [c[0], c]));
  const out = [];
  for (const m of modules) {
    const c = got.get(m);
    if (!c) { out.push(`no row for module "${m}"`); continue; }
    if (!WORDS.includes(c[1])) out.push(`${m}: "${c[1]}" is not one of ${WORDS.join(', ')}`);
    const cited = [...(c[2] ?? '').matchAll(/`([^`#]+)#[^`]+`/g)].map((x) => x[1]);
    for (const p of cited) if (!TEST_FILE.test(p)) out.push(`${m}: ${p} is not a test or eval file`);
    if (!['UNTESTED', 'UNSUPPORTED'].includes(c[1]) && !cited.length) out.push(`${m}: ${c[1]} with no test cited`);
  }
  for (const k of got.keys()) if (!modules.includes(k)) out.push(`row "${k}" names no matrix module`);
  return out;
}

if (modules.length < 10) {
  console.log(`readiness-lint: the feature matrix lists only ${modules.length} modules; its table was not read`);
  process.exit(1);
}
if (!existsSync(REPORT)) {
  console.log('readiness-lint: no readiness report at docs/cad-agent/reports/PRODUCTION_READINESS.md');
  process.exit(1);
}
const report = readFileSync(REPORT, 'utf8');
const dropped = report.split('\n').filter((l) => !l.startsWith(`| ${modules[0]} |`)).join('\n');
if (!problems(dropped).some((p) => p.startsWith('no row for module'))) {
  console.log('readiness-lint: self-check failed: a report missing a module row was not caught');
  process.exit(1);
}
const found = problems(report);
for (const p of found) console.log(`readiness-lint: ${p}`);
console.log(`readiness-lint: ${modules.length} matrix modules, ${modules.length - found.filter((p) => p.startsWith('no row')).length} with a row, ${found.length} problem(s)`);
process.exit(found.length ? 1 : 0);
