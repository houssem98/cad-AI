import { ModelError, type Complete } from '../model/modelClient';

// L5 T2: a request becomes a typed spec with explicit units, or a question. A missing or contradictory dimension is asked for,
// never guessed (docs/LOOP_CONVENTIONS.md I12). The model only lists what the request states; code converts and decides.
const MM = { mm: 1, cm: 10, m: 1000, in: 25.4 } as const;
export type Unit = keyof typeof MM;
export interface Dimension { name: string; value: number; unit: Unit; mm: number }
// envelope_mm: the overall size the request states outright, which the finished part must measure (I3); assumptions: the
// drafting conventions the spec relied on, shown to the user (roadmap: never infer "without communicating uncertainty").
export interface Spec { part: string; dimensions: Dimension[]; envelope_mm: number[] | null; assumptions: string[] }
export type SpecResult = { kind: 'spec'; spec: Spec } | { kind: 'asks'; question: string; missing: string[] };

export const SPEC_PROMPT = `You turn a request for one mechanical part into a JSON spec. Reply with JSON only, in this shape:
{"part": "<what the part is>", "dimensions": [{"name": "<what it measures>", "value": <number>, "unit": "mm" | "cm" | "m" | "in"}], "missing": ["<name>"], "envelope": {"values": [<number>, <number>, <number>], "unit": "mm" | "cm" | "m" | "in"} | null, "assumptions": ["<convention>"]}
List every dimension the request states, in the unit it states; write fractions such as 1/4 in as 0.25.
Put in "missing" only a dimension without which the part's geometry cannot be built, and never assume a default or a typical value for one.
These drafting conventions are not missing dimensions: edges are sharp unless rounding or chamfering is asked for; a hole goes through unless a depth is given; holes on a bolt circle are evenly spaced, the first on the +X axis; a hole "N in from both edges" has its centre N from each of the two nearest edges; material, finish and tolerances are not dimensions; the part's position and orientation are free.
Put in "assumptions" each of those conventions the part relies on, in a few words.
"envelope" is the part's overall size along its three axes when the request states all three outright (a disk: diameter, diameter, thickness); otherwise null.
If stated dimensions contradict each other, put the conflict in "missing".`;

// Code, not the prompt, refuses a unitless dimension: the recorded model read "plate 100 by 60 by 5" as millimetres (T2),
// and one stated unit elsewhere must not cover it (council C3). Every number must carry a unit, alone or at the end of an
// "a x b x c unit" chain, unless it is a thread size (M6) or a count ("4 holes"); "in" before "each", "from" and the like is a word.
const UNIT = String.raw`(?:mm|cm|m|inch(?:es)?|in(?!\s+(?:each|every|the|a|an|from|to|of|at)\b)|millimet(?:er|re)s?|centimet(?:er|re)s?|met(?:er|re)s?|")(?![a-z])`;
const NUM = String.raw`\d+(?:\.\d+)?(?:\/\d+)?`;
const WITH_UNIT = new RegExp(String.raw`(?:${NUM}\s*(?:x|×|by)\s*)*${NUM}\s*${UNIT}`, 'gi');
const unitless = (request: string) => /\d/.test(request.replace(/\bM\d+(?:\.\d+)?\b/g, ' ').replace(WITH_UNIT, ' ').replace(/\b\d+\s+[a-z]+s\b/gi, ' '));

export async function extractSpec(request: string, complete: Complete): Promise<SpecResult> {
  if (unitless(request)) return { kind: 'asks', missing: ['unit'], question: 'What unit is each dimension in: mm, cm, m or in?' };
  const { text } = await complete({ json: true, maxTokens: 500, messages: [{ role: 'system', content: SPEC_PROMPT }, { role: 'user', content: request }] });
  let raw: any;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new ModelError('the model returned no JSON spec');
  }
  const ok = (d: any) => typeof d?.name === 'string' && Number.isFinite(d.value) && d.value > 0 && Object.hasOwn(MM, d.unit);
  const env = raw?.envelope;
  const envOk = env == null || (Array.isArray(env.values) && env.values.length === 3 && env.values.every((v: any) => Number.isFinite(v) && v > 0) && Object.hasOwn(MM, env.unit));
  if (typeof raw?.part !== 'string' || !Array.isArray(raw.dimensions) || !Array.isArray(raw.missing) || !raw.dimensions.every(ok) || !envOk)
    throw new ModelError('the model returned a spec that is not in the typed shape');
  const missing = raw.missing.map(String).filter((s: string) => s.trim());
  if (!raw.dimensions.length && !missing.length) missing.push('dimensions');
  if (missing.length) return { kind: 'asks', missing, question: `What ${missing.length > 1 ? 'are' : 'is'} the ${missing.join(', ')} of the ${raw.part || 'part'}?` };
  const mm = (v: number, u: Unit) => +(v * MM[u]).toFixed(6);
  const dimensions = raw.dimensions.map((d: any) => ({ name: d.name, value: d.value, unit: d.unit, mm: mm(d.value, d.unit) }));
  return { kind: 'spec', spec: { part: raw.part, dimensions, envelope_mm: env ? env.values.map((v: number) => mm(v, env.unit)) : null,
    assumptions: Array.isArray(raw.assumptions) ? raw.assumptions.map(String).filter((s: string) => s.trim()) : [] } };
}
