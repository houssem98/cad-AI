import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Executor, type Outcome } from '../cad/executor';
import { text2cad, type Text2CadResult } from '../agent/text2cad';

export interface JobContext { jobId: string; dir: string }
type Handler = (input: any, ctx: JobContext) => Promise<{ verified: boolean; result?: unknown; error?: { code: string; message: string } }>;

const open = (ctx: JobContext) => {
  mkdirSync(ctx.dir, { recursive: true });
  return Executor.open({ dbPath: join(ctx.dir, 'cad.db'), dataDir: ctx.dir, workerArgs: ['--adapter', 'kernel'] });
};
const op = (id: string, document: string, type: string, params: object) =>
  ({ id, target: { document }, type, params, preconditions: [], status: 'pending', result: null, verification: null, error: null });
const stepOf = (executor: Executor, exported: Outcome | null) => {
  const a = exported?.status === 'succeeded' ? executor.store.artifact(exported.record.artifactReferences[0].id) : null;
  return a ? { path: a.path, sha256: a.sha256, bytes: a.bytes, record: exported!.operationId } : null; // the export record that verified it
};

// A text-to-CAD job is done only when the agent built the whole part (its report is not incomplete) and the kernel's STEP export
// passed its own re-import check (P9). A job cannot wait for a person: a question fails it, and an operation needing approval is
// denied by the executor, which leaves the part incomplete.
export const jobVerified = (out: Text2CadResult, exported: { status: string } | null) =>
  out.kind === 'part' && out.report.unresolved.length === 0 && exported?.status === 'succeeded';

const text2cadJob: Handler = async (input, ctx) => {
  const executor = await open(ctx);
  try {
    const out = await text2cad(String(input?.request ?? ''), { executor, document: 'part', requestId: ctx.jobId });
    if (out.kind === 'asks') throw new Error(`the request needs an answer first: ${out.question}`);
    const exported = out.kind === 'part' && !out.report.unresolved.length
      ? await executor.execute(op('export-step', 'part', 'export', { format: 'step' }), { requestId: ctx.jobId }) : null;
    return {
      verified: jobVerified(out, exported),
      result: { report: out.report.text, records: out.report.operations.map((o) => o.record), unresolved: out.report.unresolved,
        step: stepOf(executor, exported) },
    };
  } finally {
    executor.close();
  }
};

// The rebuilt solid stands for the imported one when its volume is within 0.1 %, every bounding-box bound within 0.001 mm, and the
// kernel's symmetric difference of the two is at most a 1e-6 mm skin over the imported surface: a moved or mirrored feature keeps
// volume and box but not the space it fills (council C1). That skin never exceeds 1e-3 mm3, so on a large part a small missing
// feature still counts (council D5).
export const sameLimit = (area: number) => Math.min(1e-6 * area, 1e-3);
export const sameSolid = (a: any, b: any, difference: number, area: number) => Math.abs(a.volume_mm3 - b.volume_mm3) <= 1e-3 * Math.abs(b.volume_mm3)
  && (['min', 'max'] as const).every((end) => (['x', 'y', 'z'] as const).every((k) => Math.abs(a.bbox_mm[end][k] - b.bbox_mm[end][k]) <= 1e-3))
  && difference <= sameLimit(area);

// A STEP-to-CAD job imports the file, asks the kernel for a plan of editable features, runs it in a new document through the
// executor (so every feature has its record), and is done only when the rebuilt solid is the imported one (sameSolid) and its
// STEP export passed re-import (P9). A part outside the plan's scope (prismatic: planar faces, holes on principal axes) fails
// with `unsupported` and the kernel's reason.
const step2cadJob: Handler = async (input, ctx) => {
  const executor = await open(ctx);
  try {
    const path = String(input?.path ?? '');
    if (!existsSync(path)) return { verified: false, result: null, error: { code: 'precondition_failed', message: `no STEP file at ${path}` } };
    const data = readFileSync(path);
    executor.store.addArtifact({ id: 'source', kind: 'step', path, sha256: createHash('sha256').update(data).digest('hex'), bytes: data.length });
    const run = (id: string, document: string, type: string, params: object) => executor.execute(op(id, document, type, params), { requestId: ctx.jobId });
    const imported = await run('import', 'source', 'import', { artifact: 'source' });
    if (imported.status !== 'succeeded') return { verified: false, result: null, error: imported.error };
    const plan = await executor.plan('source');
    if (plan.status !== 'succeeded') return { verified: false, result: { unsupported: plan.error?.message ?? null, step: null }, error: plan.error };
    const done: Outcome[] = [];
    for (const o of [{ id: 'new', type: 'new_part', params: { name: 'rebuilt' } }, ...plan.operations!]) {
      done.push(await run(o.id, 'part', o.type, o.params));
      if (done.at(-1)!.status !== 'succeeded') break;
    }
    const built = done.every((o) => o.status === 'succeeded');
    const looked = await executor.inspect('source'), source = looked.verification;
    const rebuilt = built ? (await executor.inspect('part')).verification : null;
    const diff = rebuilt ? await executor.compare('part', 'source') : null;
    const same = Boolean(rebuilt && diff?.status === 'succeeded' && sameSolid(rebuilt, source, diff.difference_mm3!, looked.result.area_mm2));
    const exported = same ? await run('export-step', 'part', 'export', { format: 'step' }) : null;
    const step = stepOf(executor, exported);
    return {
      verified: Boolean(step),
      result: { operations: plan.operations!.map((o) => o.type), plan: plan.operations, records: [imported.operationId, ...done.map((o) => o.operationId)],
        volume_mm3: { source: source.volume_mm3, rebuilt: rebuilt?.volume_mm3 ?? null }, difference_mm3: diff?.difference_mm3 ?? null,
        // Every input of the same-solid verdict, so it can be checked again from the job alone (council D16).
        check: { area_mm2: looked.result.area_mm2, limit_mm3: sameLimit(looked.result.area_mm2), difference_mm3: diff?.difference_mm3 ?? null,
          bbox_mm: { source: source.bbox_mm, rebuilt: rebuilt?.bbox_mm ?? null } }, step },
      ...(!built ? { error: done.at(-1)!.error } : !same ? { error: { code: 'verification_failed', message: 'the rebuilt solid differs from the imported one' } } : {}),
    };
  } finally {
    executor.close();
  }
};

// Production job types, each run by jobWorker in its own process.
export const handlers: Record<string, Handler> = { text2cad: text2cadJob, step2cad: step2cadJob };
