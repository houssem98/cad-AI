import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { log } from './log';

const saved = process.env.DEEPSEEK_API_KEY;
afterEach(() => { if (saved === undefined) delete process.env.DEEPSEEK_API_KEY; else process.env.DEEPSEEK_API_KEY = saved; });

it('writes one JSON line per event and never a model key (L8 T3)', () => {
  const file = join(mkdtempSync(join(tmpdir(), 'cad-log-')), 'operations.log');
  process.env.DEEPSEEK_API_KEY = 'planted-key-value-0123456789';
  log(file, 'operation', { message: `sent sk-${'a1B2'.repeat(8)}, AIza${'x'.repeat(35)} and planted-key-value-0123456789` });
  log(file, 'operation', { status: 'succeeded' });
  const [first, second] = readFileSync(file, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  expect(first).toMatchObject({ event: 'operation', message: 'sent [redacted], [redacted] and [redacted]' });
  expect(Date.parse(first.ts)).not.toBeNaN();
  expect(second).toMatchObject({ event: 'operation', status: 'succeeded' });
});
