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
  | { kind: 'failed'; message: string; report: Report };
export interface Text2CadContext {
  executor: Executor; document: string; requestId: string; signal?: AbortSignal; complete?: Complete;
  onEvent?: (type: 'plan' | 'operation' | 'record', data: object) => void;
}

const n = (x: number) => +x.toFixed(3);

export async function text2cad(request: string, ctx: Text2CadContext): Promise<Text2CadResult> {
  const complete = ctx.complete ?? live();
  const spec = await extractSpec(request, complete);
  if (spec.kind === 'asks') return spec;
  const { executor, document } = ctx;
  const verify = async () => {
    const v = executor.store.document(document) ? (await executor.inspect(document)).verification : null;
    return v?.valid && v.counts.solids === 1 ? null : v ? `the document holds ${v.counts.solids} solids and valid is ${v.valid}` : 'the document does not exist';
  };
  const res = await runToolLoop(`Build this part: ${request}\nSpec, lengths also in mm: ${JSON.stringify(spec.spec)}`, { ...ctx, complete, verify });

  const operations = res.steps.map((s) => {
    const r = executor.store.record(s.operationId);
    return { record: s.operationId, type: r?.requestedOperation?.type ?? s.call.name, status: r?.status ?? 'not recorded', error: r?.errorDetails?.message ?? null };
  });
  const last = [...res.steps].reverse().find((s) => executor.store.record(s.operationId)?.status === 'succeeded');
  const inspection = last ? executor.store.record(last.operationId).validationResult.inspection ?? null : null;
  if (res.status === 'done' && inspection?.valid) {
    const { min, max } = inspection.bbox_mm;
    const size = ['x', 'y', 'z'].map((a) => n(max[a] - min[a])).join(' × ');
    return { kind: 'part', report: { operations, inspection,
      text: `${document}: ${operations.filter((o) => o.status === 'succeeded').length} operations recorded; the kernel measures one valid solid, ${n(inspection.volume_mm3)} mm3, ${size} mm.` } };
  }
  const failed = operations.filter((o) => o.status !== 'succeeded');
  const why = failed.length ? `${failed[failed.length - 1].type}: ${failed[failed.length - 1].error ?? failed[failed.length - 1].status}` : res.problem ?? res.status;
  const message = `Failed after ${failed.length} failed operations and ${Math.min(failed.length, 2)} replans; last record says ${why}.`;
  return { kind: 'failed', message, report: { operations, inspection, text: message } };
}
