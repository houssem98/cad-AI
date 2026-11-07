#!/usr/bin/env node
// clean-room-lint — fails when reference-product material enters the repo.
//
//   node scripts/clean-room-lint.mjs
//   node scripts/clean-room-lint.mjs --self-check
//
// Fails on any tracked file that is
//   - under .rea/ (raw investigation output) or a binary from the reference install (.asar .dll .exe .pak)
//   - product code (outside docs/, .claude/, .gitignore and root *.md) naming the reference product
//   - any text file containing a line of .rea/fingerprints.txt (distinctive strings seen only in the reference app)
//   - product code containing a line of .rea/identifiers.txt (reference IPC, type, route names; research docs may cite them)
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";

const ARTIFACT = /^\.rea\/|\.(asar|dll|exe|pak)$/i;
const DOC = /^(docs\/|\.claude\/|[^/]+\.md$|\.gitignore$)/;
const NAME = /mec\s?agent/i;

export function violations(files, read, prints, ids = []) {
  const out = [];
  for (const f of files) {
    if (ARTIFACT.test(f)) {
      out.push(`${f}: reference artifact is tracked`);
      continue;
    }
    const t = read(f);
    if (t === null) continue;
    if (!DOC.test(f) && NAME.test(t)) out.push(`${f}: product code names the reference product`);
    for (const p of prints) if (t.includes(p)) out.push(`${f}: contains fingerprint "${p.slice(0, 40)}"`);
    if (!DOC.test(f))
      for (const p of ids) if (t.includes(p)) out.push(`${f}: product code uses reference identifier "${p.slice(0, 40)}"`);
  }
  return out;
}

if (process.argv.includes("--self-check")) {
  const ref = ["Mec", "Agent"].join("");
  const files = {
    "src/a.ts": "const x = 1;",
    "src/b.ts": `title = '${ref} clone'`,
    "docs/r.md": `${ref} ships an Electron shell`,
    "src/c.ts": "You are a helpful CAD copilot named Z",
    "src/d.ts": "ipcRenderer.invoke('zz-run-feature')",
    "docs/e.md": "the renderer calls zz-run-feature",
  };
  const read = (f) => files[f] ?? null;
  const cases = [
    [["src/a.ts"], [], [], 0, "clean file passes"],
    [["src/b.ts"], [], [], 1, "product name in code fails"],
    [["docs/r.md"], [], [], 0, "research docs may name it"],
    [["src/c.ts"], ["helpful CAD copilot named Z"], [], 1, "fingerprint fails"],
    [[".rea/dump.txt", "x/app.asar", "y/Host.dll"], [], [], 3, "artifacts fail"],
    [["src/d.ts"], [], ["zz-run-feature"], 1, "reference identifier in code fails"],
    [["docs/e.md"], [], ["zz-run-feature"], 0, "research docs may cite identifiers"],
  ];
  for (const [fs, prints, ids, want, msg] of cases) {
    const got = violations(fs, read, prints, ids).length;
    if (got !== want) {
      console.error(`FAIL ${msg}: got ${got}, want ${want}`);
      process.exit(1);
    }
  }
  console.log(`clean-room-lint self-check: ${cases.length} assertions passed`);
  process.exit(0);
}

let files;
try {
  files = execFileSync("git", ["ls-files"], { encoding: "utf8" }).split("\n").filter(Boolean);
} catch {
  console.error("clean-room-lint: not a git repository (L0 T0 runs git init)");
  process.exit(1);
}
const prints = existsSync(".rea/fingerprints.txt")
  ? readFileSync(".rea/fingerprints.txt", "utf8").split(/\r?\n/).filter((l) => l.trim().length >= 12)
  : [];
const ids = existsSync(".rea/identifiers.txt")
  ? readFileSync(".rea/identifiers.txt", "utf8").split(/\r?\n/).filter((l) => l.trim().length >= 8)
  : [];
const read = (f) => (existsSync(f) ? readFileSync(f, "utf8") : null);
const errs = violations(files, read, prints, ids);
console.log(`clean-room-lint: ${files.length} tracked files · ${prints.length} fingerprints · ${ids.length} identifiers`);
if (errs.length === 0) {
  console.log("clean-room-lint: clean");
  process.exit(0);
}
for (const e of errs) console.log(`   ✗ ${e}`);
process.exit(1);
