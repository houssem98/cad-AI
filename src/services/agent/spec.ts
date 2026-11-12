import { ModelError, type Complete } from '../model/modelClient';

// L5 T2: a request becomes a typed spec with explicit units, or a question. A missing or contradictory dimension is asked for,
// never guessed (docs/LOOP_CONVENTIONS.md I12). The model only lists what the request states; code converts and decides.
const MM = { mm: 1, cm: 10, m: 1000, in: 25.4 } as const;
export type Unit = keyof typeof MM;
export interface Dimension { name: string; value: number; unit: Unit; mm: number }
export interface Spec { part: string; dimensions: Dimension[] }
export type SpecResult = { kind: 'spec'; spec: Spec } | { kind: 'asks'; question: string; missing: string[] };

export const SPEC_PROMPT = `You turn a request for one mechanical part into a JSON spec. Reply with JSON only, in this shape:
{"part": "<what the part is>", "dimensions": [{"name": "<what it measures>", "value": <number>, "unit": "mm" | "cm" | "m" | "in"}], "missing": ["<name>"]}
List every dimension the request states, in the unit it states; write fractions such as 1/4 in as 0.25.
Put in "missing" every dimension needed to build the part that the request does not state. Never assume a default or a typical value.
If numbers come without a unit, put "unit" in "missing". If stated dimensions contradict each other, put the conflict in "missing".`;

// A number followed by a unit. The recorded model read "plate 100 by 60 by 5" as millimetres, so code, not the prompt, refuses that guess.
const STATED_UNIT = /\d\s*(mm|cm|m|in|inch|inches|millimet(er|re)s?|centimet(er|re)s?|met(er|re)s?|")(?![a-z])/i;

export async function extractSpec(request: string, complete: Complete): Promise<SpecResult> {
  if (/\d/.test(request) && !STATED_UNIT.test(request))
    return { kind: 'asks', missing: ['unit'], question: 'What unit are these dimensions in: mm, cm, m or in?' };
  const { text } = await complete({ json: true, maxTokens: 400, messages: [{ role: 'system', content: SPEC_PROMPT }, { role: 'user', content: request }] });
  let raw: any;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new ModelError('the model returned no JSON spec');
  }
  const ok = (d: any) => typeof d?.name === 'string' && Number.isFinite(d.value) && d.value > 0 && Object.hasOwn(MM, d.unit);
  if (typeof raw?.part !== 'string' || !Array.isArray(raw.dimensions) || !Array.isArray(raw.missing) || !raw.dimensions.every(ok))
    throw new ModelError('the model returned a spec that is not in the typed shape');
  const missing = raw.missing.map(String).filter((s: string) => s.trim());
  if (!raw.dimensions.length && !missing.length) missing.push('dimensions');
  if (missing.length) return { kind: 'asks', missing, question: `What ${missing.length > 1 ? 'are' : 'is'} the ${missing.join(', ')} of the ${raw.part || 'part'}?` };
  const dimensions = raw.dimensions.map((d: any) => ({ name: d.name, value: d.value, unit: d.unit, mm: +(d.value * MM[d.unit as Unit]).toFixed(6) }));
  return { kind: 'spec', spec: { part: raw.part, dimensions } };
}
