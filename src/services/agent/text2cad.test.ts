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

// A scripted model, not a recording: these check the agent's own rules, whatever a model says.
const plateSpec = (assumptions: string[]) => JSON.stringify({ part: 'plate', missing: [], assumptions, envelope: { values: [100, 60, 5], unit: 'mm' },
  dimensions: [{ name: 'length', value: 100, unit: 'mm' }, { name: 'width', value: 60, unit: 'mm' }, { name: 'thickness', value: 5, unit: 'mm' }] });
function scripted(spec: string, width: number): Complete {
  const turns = [['new_part', '{"id":"p","params":{"name":"plate"}}'], ['sketch_rectangle', `{"id":"s","params":{"plane":"top","width":{"value":${width},"unit":"mm"},"height":{"value":60,"unit":"mm"}}}`],
    ['extrude', '{"id":"x","params":{"sketch":"s","depth":{"value":5,"unit":"mm"}}}']];
  let n = 0;
  return async (r) => {
    const usage = { prompt_tokens: 0, completion_tokens: 0 };
    if (r.json) return { text: spec, toolCalls: [], usage };
    const t = turns[n++];
    return t ? { text: '', toolCalls: [{ id: `t${n}`, name: t[0], arguments: t[1] }], usage } : { text: 'The plate is done.', toolCalls: [], usage };
  };
}

describe('the agent checks the part against the request', { timeout: 180000 }, () => {
  it('fails a part whose size differs from the overall size the request states (council C4)', async () => {
    ex = await open(['--adapter', 'kernel']);
    const out = await text2cad('Plate 100 mm by 60 mm by 5 mm.', { executor: ex, document: 'plate', requestId: 'r3', complete: scripted(plateSpec([]), 50) });
    expect(out.kind).toBe('failed');
    if (out.kind === 'failed') expect(out.message).toMatch(/kernel's last objection: the part measures 5 × 50 × 60 mm, but the request's overall size is 5 × 60 × 100 mm/);
  });

  it('reports the conventions it assumed with the part (council C8)', async () => {
    ex = await open(['--adapter', 'kernel']);
    const out = await text2cad('Plate 100 mm by 60 mm by 5 mm.', { executor: ex, document: 'plate', requestId: 'r4', complete: scripted(plateSpec(['edges are sharp']), 100) });
    expect(out.kind).toBe('part');
    if (out.kind === 'part') expect(out.report.text).toContain('Assumed: edges are sharp.');
  });
});

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
