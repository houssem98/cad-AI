import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { Executor } from '../cad/executor';
import { text2cad, type Text2CadResult } from '../agent/text2cad';

export interface JobContext { jobId: string; dir: string }
type Handler = (input: any, ctx: JobContext) => Promise<{ verified: boolean; result?: unknown }>;

// A text-to-CAD job is done only when the agent built the whole part (its report is not incomplete) and the kernel's STEP export
// passed its own re-import check (P9). A job cannot wait for a person: a question fails it, and an operation needing approval is
// denied by the executor, which leaves the part incomplete.
export const jobVerified = (out: Text2CadResult, exported: { status: string } | null) =>
  out.kind === 'part' && out.report.unresolved.length === 0 && exported?.status === 'succeeded';

const text2cadJob: Handler = async (input, ctx) => {
  mkdirSync(ctx.dir, { recursive: true });
  const executor = await Executor.open({ dbPath: join(ctx.dir, 'cad.db'), dataDir: ctx.dir, workerArgs: ['--adapter', 'kernel'] });
  try {
    const out = await text2cad(String(input?.request ?? ''), { executor, document: 'part', requestId: ctx.jobId });
    if (out.kind === 'asks') throw new Error(`the request needs an answer first: ${out.question}`);
    const exported = out.kind === 'part' && !out.report.unresolved.length
      ? await executor.execute({ id: 'export-step', target: { document: 'part' }, type: 'export', params: { format: 'step' },
        preconditions: [], status: 'pending', result: null, verification: null, error: null }, { requestId: ctx.jobId })
      : null;
    const artifact = exported?.status === 'succeeded' ? executor.store.artifact(exported.record.artifactReferences[0].id) : null;
    return {
      verified: jobVerified(out, exported),
      result: { report: out.report.text, records: out.report.operations.map((o) => o.record), unresolved: out.report.unresolved,
        step: artifact ? { path: artifact.path, sha256: artifact.sha256, bytes: artifact.bytes } : null },
    };
  } finally {
    executor.close();
  }
};

// Production job types, each run by jobWorker in its own process. L6 T3 adds STEP-to-CAD.
export const handlers: Record<string, Handler> = { text2cad: text2cadJob };
