import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Executor, Outcome } from '../cad/executor';
import { validateOperation } from '../cad/operationSchema';

// A workflow is a stored operation sequence (I6): each step is a typed operation whose lengths may name a parameter. No step
// holds code, and a replay runs every step through the executor, so each one is validated, verified and recorded.
type Unit = 'mm' | 'cm' | 'm' | 'in';
export interface WorkflowParam { name: string; unit: Unit; default?: number }
export interface Workflow { id: string; name: string; params: WorkflowParam[]; steps: { id: string; type: string; params: object }[] }
export interface SavedWorkflow extends Workflow { version: number }
type Values = Record<string, { value: number; unit: Unit }>;

const STEP_KEYS = ['id', 'type', 'params'];
const isParam = (v: any): v is { $param: string } => v !== null && typeof v === 'object' && Object.keys(v).length === 1 && typeof v.$param === 'string';
const envelope = (id: string, document: string, type: string, params: object) =>
  ({ id, target: { document }, type, params, preconditions: [], status: 'pending', result: null, verification: null, error: null });

function fill(v: any, values: Values, used: Set<string>): any {
  if (isParam(v)) {
    used.add(v.$param);
    return values[v.$param] ?? v;
  }
  if (Array.isArray(v)) return v.map((x) => fill(x, values, used));
  if (v !== null && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fill(x, values, used)]));
  return v;
}

export function validateWorkflow(wf: Workflow): string[] {
  const errs: string[] = [];
  if (typeof wf?.id !== 'string' || !/^[A-Za-z0-9_-]+$/.test(wf.id)) errs.push('id: letters, digits, - and _ only');
  const names = new Set<string>();
  for (const p of wf?.params ?? []) {
    if (typeof p?.name !== 'string' || !p.name || names.has(p.name)) errs.push(`params: ${p?.name} is missing or repeated`);
    if (!['mm', 'cm', 'm', 'in'].includes(p?.unit)) errs.push(`params/${p?.name}: unit must be mm, cm, m or in`);
    if (p?.default !== undefined && !(Number.isFinite(p.default) && p.default > 0)) errs.push(`params/${p?.name}: default must be a positive number`);
    names.add(p?.name);
  }
  if (!Array.isArray(wf?.steps) || !wf.steps.length) errs.push('steps: needs at least one operation');
  // Every parameter takes a probe value, so the schema checks each step exactly as a replay would send it.
  const probe: Values = Object.fromEntries([...names].map((n) => [n, { value: 1, unit: wf.params.find((p) => p.name === n)!.unit }]));
  (Array.isArray(wf?.steps) ? wf.steps : []).forEach((step: any, i) => {
    for (const k of Object.keys(step ?? {})) if (!STEP_KEYS.includes(k)) errs.push(`steps/${i}/${k}: not allowed`);
    const used = new Set<string>();
    const op = envelope(step?.id, 'workflow', step?.type, fill(step?.params, probe, used));
    for (const n of used) if (!names.has(n)) errs.push(`steps/${i}: parameter ${n} is not declared`);
    for (const e of validateOperation(op)) errs.push(`steps/${i}${e.path}: ${e.message}`);
  });
  return errs;
}

export class WorkflowStore {
  constructor(private dir: string) {
    mkdirSync(dir, { recursive: true });
  }

  versions(id: string): number[] {
    return readdirSync(this.dir).flatMap((f) => {
      const m = /^(.+)@(\d+)\.json$/.exec(f);
      return m && m[1] === id ? [Number(m[2])] : [];
    }).sort((a, b) => a - b);
  }

  save(wf: Workflow): SavedWorkflow {
    const errs = validateWorkflow(wf);
    if (errs.length) throw new Error(`workflow ${wf?.id} refused: ${errs.join('; ')}`);
    const saved = { ...wf, version: (this.versions(wf.id).at(-1) ?? 0) + 1 };
    writeFileSync(join(this.dir, `${wf.id}@${saved.version}.json`), JSON.stringify(saved), { flag: 'wx' }); // a version is never rewritten
    return saved;
  }

  load(id: string, version?: number): SavedWorkflow {
    const v = version ?? this.versions(id).at(-1);
    const path = join(this.dir, `${id}@${v}.json`);
    if (!/^[A-Za-z0-9_-]+$/.test(id) || v === undefined || !existsSync(path)) throw new Error(`workflow ${id} version ${v} does not exist`);
    const wf = JSON.parse(readFileSync(path, 'utf8')) as SavedWorkflow;
    const errs = validateWorkflow(wf); // the file may have been edited since it was saved
    if (errs.length) throw new Error(`workflow ${id} version ${v} refused: ${errs.join('; ')}`);
    return wf;
  }
}

// Runs the steps in order on one document and stops at the first that does not succeed. A parameter with no value and no
// default is asked for, never guessed (I12).
export async function replay(ex: Executor, wf: SavedWorkflow, args: Record<string, number>, ctx: { document: string; requestId: string; signal?: AbortSignal }):
  Promise<{ status: 'succeeded' | 'failed'; outcomes: Outcome[]; error?: string }> {
  const errs = validateWorkflow(wf);
  if (errs.length) return { status: 'failed', outcomes: [], error: errs.join('; ') };
  const unknown = Object.keys(args).find((k) => !wf.params.some((p) => p.name === k));
  if (unknown) return { status: 'failed', outcomes: [], error: `unknown parameter ${unknown}` };
  const values: Values = {};
  for (const p of wf.params) {
    const value = args[p.name] ?? p.default;
    if (value === undefined) return { status: 'failed', outcomes: [], error: `missing parameter ${p.name}` };
    values[p.name] = { value, unit: p.unit };
  }
  const outcomes: Outcome[] = [];
  for (const step of wf.steps) {
    const out = await ex.execute(envelope(step.id, ctx.document, step.type, fill(step.params, values, new Set())), { requestId: ctx.requestId, signal: ctx.signal });
    outcomes.push(out);
    if (out.status !== 'succeeded') return { status: 'failed', outcomes, error: `${step.id}: ${out.error?.message ?? out.status}` };
  }
  return { status: 'succeeded', outcomes };
}
