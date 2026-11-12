import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { modelClient } from '../model/modelClient';
import { extractSpec } from './spec';

// Responses were recorded once from the live model (MODEL_RECORD=1 with DEEPSEEK_API_KEY set); the gate only replays them.
const DIR = fileURLToPath(new URL('./recordings/', import.meta.url));
const complete = modelClient({ mode: process.env.MODEL_RECORD ? 'record' : 'replay', recordings: DIR, spendFile: `${DIR}spend.json`, capUsd: 3, key: process.env.DEEPSEEK_API_KEY });
const asks = async (request: string) => {
  const r = await extractSpec(request, complete);
  expect(r.kind, JSON.stringify(r)).toBe('asks');
  return r as Extract<typeof r, { kind: 'asks' }>;
};

describe('spec extraction on recorded responses', () => {
  it('asks for dimensions when a request gives none', async () => {
    expect((await asks('make a bracket')).question).toMatch(/\?$/);
  });

  it('asks when a request gives numbers with no unit', async () => {
    expect((await asks('plate 100 by 60 by 5')).missing.join(' ')).toMatch(/unit/i);
  });

  it('asks for the unit when any dimension lacks one, before calling the model (council C3)', async () => {
    const never: typeof complete = async () => { throw new Error('the model was called'); };
    for (const request of ['Plate 100 by 60 by 5 with 4 holes, 1 in each corner.', 'Plate 100 by 60 by 5 with 2 M6 holes.', 'Plate 100 mm by 60 by 5.', 'Plate 100 by 60 by 5, holes 10 in from each edge.']) {
      const r = await extractSpec(request, never);
      expect(r.kind, request).toBe('asks');
    }
    for (const request of ['A 200 x 100 x 10 mm plate with four 9 mm holes, each 15 mm in from both edges.', 'Rectangular bar 1 in x 1/2 in x 12 in.', 'Plate 100 mm by 60 mm by 5 mm with 2 M6 holes.', 'A 1 inch cube.'])
      await expect(extractSpec(request, never), request).rejects.toThrow('the model was called');
  });

  it('names the drafting conventions it relied on (council C8)', async () => {
    const r = await extractSpec('Disk 60 mm in diameter and 5 mm thick with four 5 mm holes on a 40 mm bolt circle.', complete);
    expect(r.kind, JSON.stringify(r)).toBe('spec');
    if (r.kind === 'spec') expect(r.spec.assumptions.join(' ')).toMatch(/bolt|spac|axis|angle/i);
  });

  it('asks when stated dimensions contradict each other', async () => {
    await asks('A 40 mm cube that is 60 mm tall.');
  });

  it('keeps the stated unit and converts inches to mm exactly', async () => {
    const r = await extractSpec('plate 4 in by 3 in by 0.25 in', complete);
    expect(r.kind, JSON.stringify(r)).toBe('spec');
    if (r.kind !== 'spec') return;
    expect(r.spec.dimensions.map((d) => d.unit)).toEqual(['in', 'in', 'in']);
    expect(r.spec.dimensions.map((d) => d.mm).sort((a, b) => a - b)).toEqual([6.35, 76.2, 101.6]);
    expect([...r.spec.envelope_mm!].sort((a, b) => a - b)).toEqual([6.35, 76.2, 101.6]);
  });
});
