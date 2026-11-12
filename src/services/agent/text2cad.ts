import { fileURLToPath } from 'node:url';
import type { Executor } from '../cad/executor';
import { modelClient, type Complete } from '../model/modelClient';
import { extractSpec } from './spec';
import { runToolLoop } from './toolLoop';

// L5 T4: request → spec or question → tool loop → the kernel's verdict. The report is built from execution records only,
// never from the model's text (docs/LOOP_CONVENTIONS.md I3).
const DIR = fileURLToPath(new URL('./recordings/', import.meta.url));
// Live by default, as the eval runner calls it; spend joins the recordings' ledger under the human's $3 cap for L5.
const live = () => modelClient({ mode: 'live', recordings: DIR, spendFile: `${DIR}spend.json`, capUsd: 3, key: process.env.DEEPSEEK_API_KEY });

export interface Report {
  operations: { record: string; type: string; status: string; error: string | null }[];
  inspection: any;
  text: string;
}
export type Text2CadResult =
  | { kind: 'part'; report: Report }
  | { kind: 'asks'; question: string; missing: string[] }
  | { kind: 'failed' | 'cancelled'; message: string; report: Report };
export interface Text2CadContext {
  executor: Executor; document: string; requestId: string; signal?: AbortSignal; complete?: Complete;
  onEvent?: (type: 'plan' | 'operation' | 'record', data: object) => void;
}

const n = (x: number) => +x.toFixed(3);
const extents = (v: any) => ['x', 'y', 'z'].map((a) => v.bbox_mm.max[a] - v.bbox_mm.min[a]);
const sorted = (xs: number[]) => [...xs].sort((a, b) => a - b);

export async function text2cad(request: string, ctx: Text2CadContext): Promise<Text2CadResult> {
  const complete = ctx.complete ?? live();
  const spec = await extractSpec(request, complete);
  if (spec.kind === 'asks') return spec;
  const { executor, document } = ctx;
  const envelope = spec.spec.envelope_mm;
  // A "done" stands only when the kernel finds one valid solid of the overall size the request states (I3, council C4).
  const verify = async () => {
    const v = executor.store.document(document) ? (await executor.inspect(document)).verification : null;
    if (!v) return 'the document does not exist';
    if (!(v.valid && v.counts.solids === 1)) return `the document holds ${v.counts.solids} solids and valid is ${v.valid}`;
    const got = sorted(extents(v)), want = envelope && sorted(envelope);
    if (want && got.some((g, i) => Math.abs(g - want[i]) > 0.05))
      return `the part measures ${got.map(n).join(' × ')} mm, but the request's overall size is ${want.map(n).join(' × ')} mm`;
    return null;
  };
  const res = await runToolLoop(`Build this part: ${request}\nSpec, lengths also in mm: ${JSON.stringify(spec.spec)}`, { ...ctx, complete, verify });

  const operations = res.steps.map((s) => {
    const r = executor.store.record(s.operationId);
    return { record: s.operationId, type: r?.requestedOperation?.type ?? s.call.name, status: r?.status ?? 'not recorded', error: r?.errorDetails?.message ?? null };
  });
  const last = [...res.steps].reverse().find((s) => executor.store.record(s.operationId)?.status === 'succeeded');
  const inspection = last ? executor.store.record(last.operationId).validationResult.inspection ?? null : null;
  const recorded = operations.filter((o) => o.status === 'succeeded').length;
  if (res.status === 'done' && inspection?.valid) {
    const assumed = spec.spec.assumptions.length ? ` Assumed: ${spec.spec.assumptions.join('; ')}.` : '';
    return { kind: 'part', report: { operations, inspection,
      text: `${document}: ${recorded} operations recorded; the kernel measures one valid solid, ${n(inspection.volume_mm3)} mm3, ${extents(inspection).map(n).join(' × ')} mm.${assumed}` } };
  }
  if (res.status === 'cancelled') {
    const message = `Cancelled by the user; ${recorded} operations had been recorded.`;
    return { kind: 'cancelled', message, report: { operations, inspection, text: message } };
  }
  const why = res.problemFrom === 'kernel' ? `the kernel's last objection: ${res.problem}`
    : res.problemFrom === 'record' ? `the last failed record: ${operations.at(-1)!.type}: ${res.problem}` : `stopped after ${res.steps.length} operations without finishing`;
  const message = `Failed after ${res.failures} failures; ${why}.`;
  return { kind: 'failed', message, report: { operations, inspection, text: message } };
}
