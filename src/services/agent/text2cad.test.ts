import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { Executor } from '../cad/executor';
import { modelClient, type Complete } from '../model/modelClient';
import { text2cad } from './text2cad';

// Responses were recorded once from the live model (MODEL_RECORD=1 with DEEPSEEK_API_KEY set); the gate only replays them.
const DIR = fileURLToPath(new URL('./recordings/', import.meta.url));
const model = modelClient({ mode: process.env.MODEL_RECORD ? 'record' : 'replay', recordings: DIR, spendFile: `${DIR}spend.json`, capUsd: 3, key: process.env.DEEPSEEK_API_KEY });
const texts: string[] = [];
const complete: Complete = async (r) => { const out = await model(r); if (out.text) texts.push(out.text); return out; };

let ex: Executor;
afterEach(() => { ex?.close(); texts.length = 0; });
const open = (workerArgs: string[]) => {
  const dir = mkdtempSync(join(tmpdir(), 'text2cad-'));
  return Executor.open({ dbPath: join(dir, 'cad.db'), dataDir: dir, workerArgs });
};

describe('verify and recover on recorded responses', { timeout: 180000 }, () => {
  it('stops after two replans when the kernel keeps failing, and reports only what the records hold', async () => {
    ex = await open(['--adapter', 'double', '--fail', 'extrude']);
    const out = await text2cad('Plate 100 mm by 60 mm by 5 mm.', { executor: ex, document: 'plate', requestId: 'r1', complete });
    expect(out.kind).toBe('failed');
    if (out.kind !== 'failed') return;
    const extrudes = out.report.operations.filter((o) => o.type === 'extrude');
    expect(extrudes.length).toBeGreaterThan(0);
    expect(extrudes.every((o) => o.status === 'failed' && o.error === 'double: extrude failed on purpose')).toBe(true);
    expect(out.report.operations.filter((o) => o.status !== 'succeeded')).toHaveLength(3); // the failure and its two replans
    expect(out.report.text).toMatch(/^Failed/);
    expect(out.report.text).not.toMatch(/succeeded|built|created|complete/i);
    for (const t of texts) expect(out.report.text).not.toContain(t);
  });

  it('reports a built part from the kernel inspection in its records', async () => {
    ex = await open(['--adapter', 'kernel']);
    const out = await text2cad('Plate 100 mm by 60 mm by 5 mm.', { executor: ex, document: 'plate', requestId: 'r2', complete });
    expect(out.kind, JSON.stringify(out)).toBe('part');
    if (out.kind !== 'part') return;
    expect(out.report.inspection.valid).toBe(true);
    expect(out.report.inspection.volume_mm3).toBeCloseTo(30000, 3);
    expect(out.report.text).toContain('30000');
    for (const t of texts) expect(out.report.text).not.toContain(t);
  });
});
