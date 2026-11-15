#!/usr/bin/env node
// L8 T3: the client bundle carries no model API key. Builds cad-AI's client into a temporary folder and scans every file
// for key shapes and for the values of the key variables set in this environment. Before the scan it must catch a planted
// key. A match names the file and the pattern, never the key.
//
//   node scripts/bundle-scan.mjs
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CAD = fileURLToPath(new URL('../cad-AI/', import.meta.url));
const SHAPES = { 'an sk- key': /sk-[A-Za-z0-9]{20,}/, 'a Google key': /AIza[0-9A-Za-z_-]{35}/ };
const values = ['DEEPSEEK_API_KEY', 'GEMINI_API_KEY'].map((n) => process.env[n]).filter((v) => v && v.length >= 8);
const scan = (text) => [...Object.entries(SHAPES).filter(([, re]) => re.test(text)).map(([n]) => n),
  ...(values.some((v) => text.includes(v)) ? ['a key variable value'] : [])];

if (!scan(`const k = "sk-${'a1B2'.repeat(8)}";`).length) {
  console.log('bundle-scan: self-check failed: a planted key was not caught');
  process.exit(1);
}
const out = mkdtempSync(join(tmpdir(), 'bundle-scan-'));
try {
  execFileSync(process.execPath, [join(CAD, 'node_modules/vite/bin/vite.js'), 'build', '--outDir', out, '--emptyOutDir', '--logLevel', 'warn'], { cwd: CAD, stdio: 'inherit' });
  const files = readdirSync(out, { recursive: true }).map((f) => join(out, f)).filter((f) => statSync(f).isFile());
  if (!files.some((f) => f.endsWith('.js'))) {
    console.log('bundle-scan: the build wrote no JavaScript; nothing was scanned');
    process.exit(1);
  }
  let bytes = 0;
  const hits = files.flatMap((f) => {
    const text = readFileSync(f, 'latin1');
    bytes += text.length;
    return scan(text).map((h) => `${f.slice(out.length + 1)}: ${h}`);
  });
  for (const h of hits) console.log(`bundle-scan: ${h}`);
  console.log(`bundle-scan: ${files.length} files, ${bytes} bytes, ${values.length} key variable value(s) set, ${hits.length} key(s) found`);
  process.exitCode = hits.length ? 1 : 0;
} finally {
  rmSync(out, { recursive: true, force: true });
}
