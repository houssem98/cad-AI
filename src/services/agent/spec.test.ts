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

  it('asks when stated dimensions contradict each other', async () => {
    await asks('A 40 mm cube that is 60 mm tall.');
  });

  it('keeps the stated unit and converts inches to mm exactly', async () => {
    const r = await extractSpec('plate 4 in by 3 in by 0.25 in', complete);
    expect(r.kind, JSON.stringify(r)).toBe('spec');
    if (r.kind !== 'spec') return;
    expect(r.spec.dimensions.map((d) => d.unit)).toEqual(['in', 'in', 'in']);
    expect(r.spec.dimensions.map((d) => d.mm).sort((a, b) => a - b)).toEqual([6.35, 76.2, 101.6]);
  });
});
