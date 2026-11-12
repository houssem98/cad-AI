import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { JobEngine } from './jobEngine';
import { jobVerified } from './handlers';

// The worker inherits MODEL_MODE: replay in the gate (recorded responses only), record once with DEEPSEEK_API_KEY set.
process.env.MODEL_MODE ??= 'replay';
const HANDLERS = fileURLToPath(new URL('./handlers.ts', import.meta.url));
let engine: JobEngine;
afterEach(() => engine?.close(true));

async function finished(id: string, ms = 120_000) {
  const end = Date.now() + ms;
  for (;;) {
    const j = engine.get(id)!;
    if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(j.state)) return j;
    if (Date.now() > end) throw new Error(`job still ${j.state}`);
    await new Promise((r) => setTimeout(r, 250));
  }
}

describe('text-to-CAD job (L6 T2)', { timeout: 180_000 }, () => {
  it('completes only with a STEP the kernel verified on re-import, and its records', async () => {
    engine = JobEngine.open({ dbPath: join(mkdtempSync(join(tmpdir(), 'job-t2c-')), 'jobs.db'), handlers: HANDLERS, types: ['text2cad'] });
    const job = await finished(engine.submit('text2cad', { request: 'Plate 100 mm by 60 mm by 5 mm.' }).id);
    expect(job.state, JSON.stringify(job.error)).toBe('COMPLETED');
    expect(job.result.records.length).toBeGreaterThan(0);
    expect(readFileSync(job.result.step.path, 'utf8').startsWith('ISO-10303-21')).toBe(true);
    expect(job.result.report).toContain('30000 mm3');
  });

  it('fails a job whose part is incomplete: a requested hole the kernel could not make', async () => {
    engine = JobEngine.open({ dbPath: join(mkdtempSync(join(tmpdir(), 'job-t2c-')), 'jobs.db'), handlers: HANDLERS, types: ['text2cad'] });
    const job = await finished(engine.submit('text2cad', { request: 'A 40 mm x 40 mm x 5 mm plate with a 6 mm through hole centred 30 mm from the plate centre along X.' }).id);
    expect(job.state, JSON.stringify(job.result)).toBe('FAILED');
    expect(job.error?.code).toBe('verification_failed');
    expect(job.result.step).toBeNull();
  });

  it('counts a job verified only when the part is complete and its STEP export passed the kernel re-import', () => {
    const part = { kind: 'part', report: { unresolved: [] } } as any;
    expect(jobVerified(part, { status: 'succeeded' })).toBe(true);
    expect(jobVerified(part, { status: 'failed' })).toBe(false);
    expect(jobVerified(part, null)).toBe(false);
    expect(jobVerified({ kind: 'part', report: { unresolved: [{ type: 'hole' }] } } as any, { status: 'succeeded' })).toBe(false);
    expect(jobVerified({ kind: 'failed', report: { unresolved: [] } } as any, { status: 'succeeded' })).toBe(false);
  });
});
