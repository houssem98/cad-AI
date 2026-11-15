import { fileURLToPath } from 'node:url';
import type { Executor } from '../cad/executor';
import { modelClient, type Complete } from '../model/modelClient';
import { extractSpec, type Spec } from './spec';
import { runToolLoop } from './toolLoop';

// L5 T4: request → spec or question → tool loop → the kernel's verdict. The report is built from execution records only,
// never from the model's text (docs/LOOP_CONVENTIONS.md I3).
const DIR = fileURLToPath(new URL('./recordings/', import.meta.url));
// Live by default, as the eval runner calls it, or as MODEL_MODE says (a job's tests replay); spend joins the recordings' ledger under the human's $3 cap for L5.
const live = () => modelClient({ mode: (process.env.MODEL_MODE as 'live' | 'replay' | 'record' | undefined) ?? 'live', recordings: DIR, spendFile: process.env.CAD_SPEND_FILE ?? `${DIR}spend.json`, capUsd: 3, key: process.env.DEEPSEEK_API_KEY });

export interface Report {
  operations: { record: string; type: string; status: string; error: string | null }[];
  unresolved: { record: string; type: string; error: string | null }[]; // requested operations that failed and were never built
  inspection: any;
  text: string;
}
export type Text2CadResult =
  | { kind: 'part'; report: Report }
  | { kind: 'asks'; question: string; missing: string[] }
  | { kind: 'failed' | 'cancelled'; message: string; report: Report };
export interface Text2CadContext {
  executor: Executor; document: string; requestId: string; signal?: AbortSignal; complete?: Complete;
  spec?: Spec; // a spec read deterministically (a drawing's), so the model is not asked to transcribe it
  check?: (inspected: { verification: any; result: any }) => string | null; // an exact target's objection to the kernel's inspection
  onEvent?: (type: 'plan' | 'operation' | 'record', data: object) => void;
}

const n = (x: number) => +x.toFixed(3);
const extents = (v: any) => ['x', 'y', 'z'].map((a) => v.bbox_mm.max[a] - v.bbox_mm.min[a]);
const sorted = (xs: number[]) => [...xs].sort((a, b) => a - b);

export async function text2cad(request: string, ctx: Text2CadContext): Promise<Text2CadResult> {
  const complete = ctx.complete ?? live();
  const spec = ctx.spec ? { kind: 'spec' as const, spec: ctx.spec } : await extractSpec(request, complete);
  if (spec.kind === 'asks') return spec;
  const { executor, document } = ctx;
  const envelope = spec.spec.envelope_mm;
  // A "done" stands only when the kernel finds one valid solid of the overall size the request states (I3, council C4).
  const verify = async () => {
    const r = executor.store.document(document) ? await executor.inspect(document) : null;
    const v = r?.verification;
    if (!v) return 'the document does not exist';
    if (!(v.valid && v.counts.solids === 1)) return `the document holds ${v.counts.solids} solids and valid is ${v.valid}`;
    const got = sorted(extents(v)), want = envelope && sorted(envelope);
    if (want && got.some((g, i) => Math.abs(g - want[i]) > 0.05))
      return `the part measures ${got.map(n).join(' × ')} mm, but the request's overall size is ${want.map(n).join(' × ')} mm`;
    return ctx.check?.(r) ?? null;
  };
  const res = await runToolLoop(`Build this part: ${request}\nSpec, lengths also in mm: ${JSON.stringify(spec.spec)}`, { ...ctx, complete, verify });

  const operations = res.steps.map((s) => {
    const r = executor.store.record(s.operationId);
    return { record: s.operationId, type: r?.requestedOperation?.type ?? s.call.name, status: r?.status ?? 'not recorded', error: r?.errorDetails?.message ?? null };
  });
  // A failed operation stands unless a later one of its type succeeded: after a schema refusal any such success counts (the model
  // fixed its call); after a kernel refusal only the same parameters count (the requested feature itself was built). A part
  // with one standing is reported incomplete, never plainly built (I12; found in the human's T8 drone frame).
  const records = res.steps.map((s) => ({ id: s.operationId, r: executor.store.record(s.operationId) }));
  const unresolved = records.filter(({ r }, i) => r && r.status !== 'succeeded' && !['inspect', 'new_part'].includes(r.requestedOperation.type)
    && !records.slice(i + 1).some(({ r: q }) => q?.status === 'succeeded' && q.requestedOperation.type === r.requestedOperation.type
      && (r.errorDetails?.code === 'validation_failed' || JSON.stringify(q.requestedOperation.params) === JSON.stringify(r.requestedOperation.params))))
    .map(({ id, r }) => ({ record: id, type: r.requestedOperation.type, error: r.errorDetails?.message ?? r.status }));
  const last = [...res.steps].reverse().find((s) => executor.store.record(s.operationId)?.status === 'succeeded');
  const inspection = last ? executor.store.record(last.operationId).validationResult.inspection ?? null : null;
  const recorded = operations.filter((o) => o.status === 'succeeded').length;
  if (res.status === 'done' && inspection?.valid) {
    const assumed = spec.spec.assumptions.length ? ` Assumed: ${spec.spec.assumptions.join('; ')}.` : '';
    const incomplete = unresolved.length ? ` Incomplete: ${unresolved.length} requested operation${unresolved.length > 1 ? 's' : ''} failed and ${unresolved.length > 1 ? 'were' : 'was'} not redone: ${unresolved.map((u) => `${u.type}: ${u.error}`).join('; ')}.` : '';
    return { kind: 'part', report: { operations, unresolved, inspection,
      text: `${document}: ${recorded} operations recorded; the kernel measures one valid solid, ${n(inspection.volume_mm3)} mm3, ${extents(inspection).map(n).join(' × ')} mm.${incomplete}${assumed}` } };
  }
  if (res.status === 'cancelled') {
    const message = `Cancelled by the user; ${recorded} operations had been recorded.`;
    return { kind: 'cancelled', message, report: { operations, unresolved, inspection, text: message } };
  }
  const why = res.problemFrom === 'kernel' ? `the kernel's last objection: ${res.problem}`
    : res.problemFrom === 'record' ? `the last failed record: ${operations.at(-1)!.type}: ${res.problem}` : `stopped after ${res.steps.length} operations without finishing`;
  const message = `Failed after ${res.failures} failures; ${why}.`;
  return { kind: 'failed', message, report: { operations, unresolved, inspection, text: message } };
}
