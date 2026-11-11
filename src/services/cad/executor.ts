import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CadStore, type Artifact, type Doc, type OpRow } from './cadStore';
import { CadWorker, WorkerError } from './cadWorker';
import { validateProposal } from './operationSchema';

// docs/cad-agent/architecture/EXECUTION_AND_VERIFICATION.md is the lifecycle this file implements.
const MM: Record<string, number> = { mm: 1, cm: 10, m: 1000, in: 25.4 };
const CONSEQUENTIAL = new Set(['modify_dimension']);
const CREATES = new Set(['new_part', 'import']);
// Once a document holds a solid, every operation must leave it exactly one valid solid (I3).
const SOLID = ['extrude', 'cut', 'hole', 'fillet', 'chamfer', 'import'];
const defaultDeadline = (type: string) => (type === 'import' || type === 'export' ? 120_000 : 30_000);
const sha256 = (data: Buffer) => createHash('sha256').update(data).digest('hex');

export type Decision = 'approved' | 'denied' | 'auto';
export interface ExecutorOptions {
  dbPath: string;
  dataDir: string;
  workerArgs?: string[];
  deadlineMs?: (type: string) => number;
  approve?: (op: any) => Promise<Decision>;
}
interface TypedError { code: string; message: string; details?: object }
interface Outcome { operationId: string; status: string; record: any; error?: TypedError }

function toMm(v: any): any {
  if (Array.isArray(v)) return v.map(toMm);
  if (v && typeof v === 'object') {
    if (typeof v.value === 'number' && Object.hasOwn(MM, v.unit)) return { value: v.value * MM[v.unit], unit: 'mm' };
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, toMm(x)]));
  }
  return v;
}

export class Executor {
  private halted: TypedError | null = null;
  private closed = false;
  private caps: any;
  private tail: Promise<unknown> = Promise.resolve();

  private constructor(readonly store: CadStore, private worker: CadWorker, private opts: ExecutorOptions) {}

  static async open(opts: ExecutorOptions): Promise<Executor> {
    mkdirSync(join(opts.dataDir, 'checkpoints'), { recursive: true });
    mkdirSync(join(opts.dataDir, 'artifacts'), { recursive: true });
    const worker = new CadWorker([...(opts.workerArgs ?? []), '--artifacts', join(opts.dataDir, 'artifacts')]);
    const ex = new Executor(new CadStore(opts.dbPath), worker, opts);
    await ex.reloadAll();
    for (const row of ex.store.unfinished()) {
      const rev = ex.store.document(row.docId)?.revision ?? 0;
      const base = { started: new Date().toISOString(), rev, revAfter: rev };
      if (row.status === 'running' || row.status === 'inspecting') {
        const restore = await ex.look(row.docId).catch(() => null);
        ex.finish(row, 'failed', { ...base, validation: { restore },
          error: { code: 'worker_crashed', message: 'the server stopped while this operation ran; the document was restored from its checkpoint' } });
      } else {
        ex.finish(row, 'cancelled', { ...base, validation: {}, error: { code: 'cancelled', message: 'the server stopped before this operation ran' } });
      }
    }
    return ex;
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.worker.close();
    this.store.close();
  }

  health() {
    return this.serial(() => this.worker.request({ kind: 'health' }));
  }

  inspect(docId: string) {
    return this.serial(() => this.look(docId));
  }

  execute(proposal: any, ctx: { requestId: string; signal?: AbortSignal }): Promise<Outcome> {
    return this.serial(() => this.run(proposal, ctx));
  }

  // The worker answers one request at a time, so every public call waits for the one before it.
  private serial<T>(f: () => Promise<T>): Promise<T> {
    const next = this.tail.then(f);
    this.tail = next.catch(() => undefined);
    return next;
  }

  private look(docId: string) {
    return this.worker.request({ kind: 'inspect', document: docId });
  }

  private async run(proposal: any, ctx: { requestId: string; signal?: AbortSignal }): Promise<Outcome> {
    const started = new Date().toISOString();
    const row: OpRow = { rowId: randomUUID(), opId: String(proposal?.id ?? ''), docId: String(proposal?.target?.document ?? '') };
    if (this.halted) return { operationId: row.rowId, status: 'failed', record: null, error: this.halted };
    const rev = this.store.document(row.docId)?.revision ?? 0;
    const base = { started, rev, revAfter: rev };
    const approval = { required: CONSEQUENTIAL.has(proposal?.type), decision: null as Decision | null };
    let command: object | null = null;
    let schema: object[] = [];
    try {
      this.store.insertOperation(row, ctx.requestId, proposal);
      schema = validateProposal(proposal);
      if (schema.length) return this.finish(row, 'failed', { ...base, validation: { schema }, error: { code: 'validation_failed', message: 'refused by the operation schema', details: { errors: schema } } });
      const pre = this.preconditions(proposal, row, rev);
      if (pre) return this.finish(row, 'failed', { ...base, validation: { schema, preconditions: pre }, error: { code: 'precondition_failed', message: pre } });
      this.store.setStatus(row.rowId, 'validated');
      // An adapter imports a file path; the model names an artifact id, and only ids this store issued, unchanged since, resolve.
      let params = toMm(proposal.params);
      if (proposal.type === 'import') {
        const id = proposal.params.artifact;
        const source = this.store.artifact(String(id));
        const problem = !source ? `artifact ${id} does not exist`
          : !existsSync(source.path) || sha256(readFileSync(source.path)) !== source.sha256 ? `artifact ${id} changed since it was stored` : null;
        if (problem) return this.finish(row, 'failed', { ...base, validation: { schema, preconditions: problem }, error: { code: 'precondition_failed', message: problem } });
        params = { ...params, artifact: source!.path };
      }
      const { manifest, calls } = await this.capabilities();
      const lacks = manifest.operations[proposal.type] !== 'supported' || (proposal.type === 'export' && !manifest.exports.includes(proposal.params.format));
      if (lacks) return this.finish(row, 'unsupported', { ...base, validation: { schema }, error: { code: 'unsupported', message: `${proposal.type} is not supported by the ${manifest.adapter} adapter` } });

      if (approval.required) {
        this.store.setStatus(row.rowId, 'awaiting_approval');
        const answer = await this.decide(proposal, ctx.signal);
        if (answer === 'cancelled') return this.finish(row, 'cancelled', { ...base, approval, validation: { schema }, error: { code: 'cancelled', message: 'cancelled by the user while waiting for approval' } });
        approval.decision = answer;
        if (answer === 'denied') return this.finish(row, 'cancelled', { ...base, approval, validation: { schema }, error: { code: 'approval_denied', message: 'the user did not approve this operation' } });
        const again = this.preconditions(proposal, row, rev);
        if (again) return this.finish(row, 'failed', { ...base, approval, validation: { schema, preconditions: again }, error: { code: 'precondition_failed', message: again } });
      }

      const op = { ...proposal, params, status: 'running' };
      const deadline = Date.now() + (this.opts.deadlineMs ?? defaultDeadline)(proposal.type);
      this.store.setStatus(row.rowId, 'running');
      command = { call: calls[proposal.type], params: op.params };
      const res = await this.worker.request({ kind: 'op', operation: op }, deadline - Date.now(), ctx.signal);
      if (res.status !== 'succeeded') {
        const restore = await this.restore(row.docId);
        return this.finish(row, res.status, { ...base, approval, command, result: res.result, validation: { schema, restore, export: res.verification ?? null }, error: res.error });
      }
      this.store.setStatus(row.rowId, 'inspecting');
      const inspection = await this.worker.request({ kind: 'inspect', document: row.docId }, deadline - Date.now(), ctx.signal);
      const unverified = this.unverified(proposal, row.docId, inspection.verification, res);
      if (unverified) {
        const restore = await this.restore(row.docId);
        return this.finish(row, 'failed', { ...base, approval, command, result: res.result,
          validation: { schema, preconditions: 'passed', inspection: inspection.verification, export: res.verification ?? null, restore }, error: { code: 'verification_failed', message: unverified } });
      }
      const checkpoint = join(this.opts.dataDir, 'checkpoints', `${row.rowId}.ckpt`);
      await this.worker.request({ kind: 'save', document: row.docId, path: checkpoint }, deadline - Date.now(), ctx.signal);
      const prev = this.store.document(row.docId);
      const doc: Doc = { id: row.docId, kind: prev?.kind ?? 'part', adapter: manifest.adapter, revision: rev + 1, checkpoint, state: 'ok' };
      const files: Artifact[] = [];
      if (proposal.type === 'export') {
        const data = readFileSync(res.result.path); // the record's hash is the executor's own, not the worker's claim
        files.push({ id: randomUUID(), kind: String(res.result.format), path: String(res.result.path), sha256: sha256(data), bytes: data.length });
      }
      const artifacts = files.map((a) => ({ id: a.id, sha256: a.sha256 }));
      return this.finish(row, 'succeeded', { ...base, revAfter: rev + 1, approval, command, result: res.result, validation: { schema, preconditions: 'passed', inspection: inspection.verification, export: res.verification ?? null }, artifacts }, doc, files);
    } catch (e) {
      if (e instanceof WorkerError) {
        await this.reloadAll();
        const restore = await this.look(row.docId).catch(() => null);
        const status = e.code === 'cancelled' ? 'cancelled' : 'failed';
        return this.finish(row, status, { ...base, approval, command, validation: { schema, restore }, error: { code: e.code, message: e.message } });
      }
      const restore = await this.restore(row.docId);
      return this.finish(row, 'failed', { ...base, approval, command, validation: { schema, restore }, error: { code: 'storage_error', message: String(e) } });
    }
  }

  private unverified(p: any, docId: string, v: any, res: any): string | null {
    if (p.type === 'export' && !(res.result?.path && existsSync(res.result.path) && res.verification)) return 'the adapter reported an export with no file or no re-import measurement';
    if (!SOLID.includes(p.type) && !this.store.hasSucceededType(docId, SOLID)) return null;
    if (!v?.valid) return `after ${p.type} ${p.id} the part is not a valid solid`;
    if (v.counts?.solids !== 1) return `after ${p.type} ${p.id} the part has ${v.counts?.solids} solids, not 1`;
    return null;
  }

  // Only an explicit approved or auto runs the operation; any other answer, or a failed approval request, is a denial.
  private decide(proposal: any, signal?: AbortSignal): Promise<Decision | 'cancelled'> {
    const approve = this.opts.approve;
    if (!approve) return Promise.resolve('denied');
    return new Promise((resolve) => {
      if (signal?.aborted) return resolve('cancelled');
      const onAbort = () => resolve('cancelled');
      signal?.addEventListener('abort', onAbort, { once: true });
      Promise.resolve().then(() => approve(proposal))
        .then((d): Decision => (d === 'approved' || d === 'auto' ? d : 'denied'), (): Decision => 'denied')
        .then((d) => { signal?.removeEventListener('abort', onAbort); resolve(d); });
    });
  }

  private preconditions(p: any, row: OpRow, rev: number): string | null {
    const doc = this.store.document(row.docId);
    if (doc?.state === 'unknown') return 'the document state is unknown; reopen it';
    const creates = CREATES.has(p.type);
    if (creates ? doc : !doc) return creates ? 'the document already exists' : 'the document does not exist';
    if ((doc?.revision ?? 0) !== rev) return 'the document changed since validation';
    if (this.store.hasSucceeded(row.docId, row.opId)) return `operation id ${row.opId} is already used in this document`;
    for (const c of p.preconditions) {
      if (c.kind === 'document_kind' && doc?.kind !== c.value) return `the document is not a ${c.value}`;
      if (c.kind === 'document_revision' && rev !== c.value) return `the document is at revision ${rev}, not ${c.value}`;
      if (c.kind === 'feature_exists' && !this.store.hasSucceeded(row.docId, String(c.value))) return `feature ${c.value} does not exist`;
    }
    return null;
  }

  private async capabilities(): Promise<{ manifest: any; calls: Record<string, string> }> {
    this.caps ??= await this.worker.request({ kind: 'capabilities' });
    return this.caps;
  }

  // After a worker restart every document is gone from its memory, so all of them come back from their checkpoints.
  private async reloadAll() {
    for (const d of this.store.documents()) {
      try { await this.worker.request({ kind: 'load', document: d.id, path: d.checkpoint }); } catch { this.store.setDocState(d.id, 'unknown'); }
    }
  }

  private async restore(docId: string) {
    try {
      await this.worker.request({ kind: 'load', document: docId, path: this.store.document(docId)?.checkpoint ?? null });
      return await this.look(docId);
    } catch (e) {
      this.store.setDocState(docId, 'unknown');
      return { error: String(e) };
    }
  }

  private finish(row: OpRow, status: string, f: { started: string; rev: number; revAfter: number; validation: object; approval?: object; command?: object | null; result?: unknown; error?: TypedError | null; artifacts?: object[] }, doc?: Doc, files: Artifact[] = []): Outcome {
    const ended = new Date().toISOString();
    try {
      this.store.commit(row, status, {
        revisionBefore: f.rev, revisionAfter: f.revAfter, command: f.command ?? null, result: { status, result: f.result ?? null, started: f.started, ended },
        validation: f.validation, approval: f.approval ?? { required: false, decision: null }, error: f.error ?? null,
        artifacts: f.artifacts ?? [], started: f.started, ended,
      }, doc, files);
    } catch (e) {
      this.halted = { code: 'storage_error', message: String(e) }; // no further operation runs until the server restarts with working storage
      console.error('storage_error', e);
      return { operationId: row.rowId, status: 'failed', record: null, error: this.halted };
    }
    return { operationId: row.rowId, status, record: this.store.record(row.rowId) };
  }
}
