import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Executor, type Decision } from '../cad/executor';
import { modelClient, type Complete } from '../model/modelClient';
import { runToolLoop, TOOLS } from './toolLoop';

// Responses were recorded once from the live model (MODEL_RECORD=1 with DEEPSEEK_API_KEY set); the gate only replays them.
const DIR = fileURLToPath(new URL('./recordings/', import.meta.url));
const model = modelClient({ mode: process.env.MODEL_RECORD ? 'record' : 'replay', recordings: DIR, spendFile: `${DIR}spend.json`, capUsd: 3, key: process.env.DEEPSEEK_API_KEY });
const sent: any[][] = [];
const complete: Complete = (r) => { sent.push(structuredClone(r.messages)); return model(r); };
const mm = (value: number) => ({ value, unit: 'mm' });
const op = (id: string, type: string, params: object) => ({ id, target: { document: 'plate' }, type, params, preconditions: [], status: 'pending', result: null, verification: null, error: null });

let ex: Executor;
afterEach(() => { ex?.close(); sent.length = 0; });
const open = (approve?: (op: any) => Promise<Decision>) => {
  const dir = mkdtempSync(join(tmpdir(), 'toolloop-'));
  return Executor.open({ dbPath: join(dir, 'cad.db'), dataDir: dir, workerArgs: ['--adapter', 'kernel'], approve });
};

describe('tool loop on recorded responses', { timeout: 120000 }, () => {
  it('sends every tool call through the operation schema and returns a refusal to the model', async () => {
    ex = await open();
    const res = await runToolLoop('Call new_part, then call sketch_rectangle on the top plane with width 0 mm and height 50 mm.',
      { complete, executor: ex, document: 'plate', requestId: 'r1' });
    const refused = res.steps.find((s) => s.outcome.error?.code === 'validation_failed');
    expect(refused, JSON.stringify(res.steps)).toBeTruthy();
    expect(refused!.outcome.error.details.errors).toContainEqual(expect.objectContaining({ path: '/params/width/value' }));
    const after = sent.find((m) => m.some((x) => x.role === 'tool' && x.tool_call_id === refused!.call.id));
    expect(after?.find((x) => x.tool_call_id === refused!.call.id).content).toContain('validation_failed');
  });

  it('gives the model the edge list an inspect call returns, under the names fillet takes', async () => {
    ex = await open();
    for (const o of [op('p', 'new_part', { name: 'plate' }), op('s', 'sketch_rectangle', { plane: 'top', width: mm(90), height: mm(90) }), op('x', 'extrude', { sketch: 's', depth: mm(15) })])
      expect((await ex.execute(o, { requestId: 'setup' })).status).toBe('succeeded');
    // A scripted model, not a recording: this checks the loop's plumbing, not the model.
    const turns = [{ text: '', toolCalls: [{ id: 't1', name: 'inspect', arguments: '{"id":"i1","params":{}}' }] }, { text: 'done', toolCalls: [] }];
    const seen: any[][] = [];
    const scripted: Complete = async (r) => { seen.push(structuredClone(r.messages)); return { ...turns[seen.length - 1], usage: { prompt_tokens: 0, completion_tokens: 0 } }; };
    const res = await runToolLoop('Inspect the plate.', { complete: scripted, executor: ex, document: 'plate', requestId: 'r3' });
    expect(res.steps[0].outcome.edges).toHaveLength(12);
    expect(res.steps[0].outcome.edges?.[0].name).toBe('x:edge:0');
    expect(JSON.parse(seen[1].at(-1).content).edges).toHaveLength(12);
  });

  it('stops at a cancel and calls the model no more (council C7)', async () => {
    ex = await open();
    const stop = new AbortController();
    let calls = 0;
    const scripted: Complete = async () => {
      calls++;
      if (calls === 2) stop.abort();
      return calls === 1 ? { text: '', toolCalls: [{ id: 't1', name: 'new_part', arguments: '{"id":"p","params":{"name":"x"}}' }], usage: { prompt_tokens: 0, completion_tokens: 0 } }
        : { text: 'done', toolCalls: [], usage: { prompt_tokens: 0, completion_tokens: 0 } };
    };
    const res = await runToolLoop('Make a part.', { complete: scripted, executor: ex, document: 'plate', requestId: 'r4', signal: stop.signal, verify: async () => null });
    expect(res.status).toBe('cancelled');
    expect(calls).toBe(2);
  });

  it('holds an approval-gated operation until the human answers', async () => {
    let answer!: (d: Decision) => void;
    const asked: any[] = [];
    ex = await open((o) => { asked.push(o); return new Promise((r) => { answer = r; }); });
    for (const o of [op('p', 'new_part', { name: 'plate' }), op('s', 'sketch_rectangle', { plane: 'top', width: mm(100), height: mm(60) }), op('x', 'extrude', { sketch: 's', depth: mm(10) })])
      expect((await ex.execute(o, { requestId: 'setup' })).status).toBe('succeeded');
    const loop = runToolLoop('The plate is feature x, extruded 10 mm. Make it 8 mm thick by calling modify_dimension with parameter "x.depth".',
      { complete, executor: ex, document: 'plate', requestId: 'r2' });
    await vi.waitFor(() => expect(asked).toHaveLength(1), { timeout: 60000 });
    expect(asked[0].type).toBe('modify_dimension');
    expect(ex.store.unfinished().map((r) => r.status)).toEqual(['awaiting_approval']);
    answer('approved');
    const res = await loop;
    const changed = res.steps.find((s) => s.call.name === 'modify_dimension');
    expect(changed?.outcome.status).toBe('succeeded');
    expect(changed?.outcome.inspection.bbox_mm.max.z).toBeCloseTo(8, 6);
  });
});

describe('agent tools', () => {
  it('do not offer the sketch offset, so the L5 agent and its recordings stay as signed off (L6 T3)', () => {
    const sketches = TOOLS.filter((t) => t.function.name.startsWith('sketch_'));
    expect(sketches).toHaveLength(3);
    for (const t of sketches) expect(Object.keys(t.function.parameters.properties.params.properties)).not.toContain('offset');
  });
});
