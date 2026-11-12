import { randomUUID } from 'node:crypto';
import express, { type Request, type Response } from 'express';
import type { Decision, Executor } from '../cad/executor';
import type { Complete } from '../model/modelClient';
import { text2cad } from './text2cad';

// L5 T5, docs/cad-agent/architecture/API_CONTRACTS.md §3: the request routes stream the agent's events (Server-Sent Events,
// replayed in full to a client that reconnects), and the document routes serve what the executor's kernel holds.
type EventType = 'plan' | 'operation' | 'record' | 'question' | 'approval' | 'done';
interface Run {
  id: string; text: string; document: string; busy: boolean; abort: AbortController;
  events: { type: EventType; data: any }[]; listeners: Set<(e: { type: EventType; data: any }) => void>;
  approvals: Map<string, (d: Decision) => void>;
}

const fail = (res: Response, status: number, code: string, message: string) => res.status(status).json({ error: { code, message } });
// These routes spend model credit or write files: only this machine may call them.
const local = (req: Request) => ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress ?? '');

export function agentRoutes(executor: Executor, complete: Complete) {
  const runs = new Map<string, Run>();
  const router = express.Router();
  const emit = (run: Run, type: EventType, data: any) => {
    const e = { type, data };
    run.events.push(e);
    for (const l of run.listeners) l(e);
  };
  const nextDocument = () => {
    for (let n = 1; ; n++) {
      const id = `part-${n}`;
      if (!executor.store.document(id) && ![...runs.values()].some((r) => r.document === id)) return id;
    }
  };

  // The executor's single approval hook, answered by the request that owns the document.
  const approve = (op: any): Promise<Decision> => {
    const run = [...runs.values()].find((r) => r.busy && r.document === op.target.document);
    if (!run) return Promise.resolve('denied');
    return new Promise((resolve) => {
      run.approvals.set(op.id, resolve);
      emit(run, 'approval', { operation: op.id, type: op.type, params: op.params });
    });
  };

  async function start(run: Run) {
    run.busy = true;
    try {
      const out = await text2cad(run.text, { executor, document: run.document, requestId: run.id, signal: run.abort.signal, complete,
        onEvent: (type, data) => emit(run, type, data) });
      if (out.kind === 'asks') emit(run, 'question', { question: out.question, missing: out.missing });
      else emit(run, 'done', { status: out.kind === 'part' ? 'succeeded' : 'failed', document: run.document, report: out.report });
    } catch (e) {
      emit(run, 'done', { status: 'failed', document: run.document, report: { text: `Failed: ${(e as Error).message}`, operations: [], inspection: null } });
    } finally {
      run.busy = false;
    }
  }
  const find = (req: Request, res: Response) => runs.get(String(req.params.id)) ?? (fail(res, 404, 'precondition_failed', 'no such request'), undefined);

  router.post('/api/requests', (req, res) => {
    if (!local(req)) return fail(res, 403, 'precondition_failed', 'requests are accepted from this machine only');
    const text = String(req.body?.text ?? '').trim();
    if (!text) return fail(res, 400, 'validation_failed', 'text is required');
    const run: Run = { id: randomUUID(), text, document: nextDocument(), busy: false, abort: new AbortController(), events: [], listeners: new Set(), approvals: new Map() };
    runs.set(run.id, run);
    void start(run);
    res.status(201).json({ id: run.id, document: run.document });
  });

  router.get('/api/requests/:id/events', (req, res) => {
    const run = find(req, res);
    if (!run) return;
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
    const send = (e: { type: EventType; data: any }) => res.write(`event: ${e.type}\ndata: ${JSON.stringify(e.data)}\n\n`);
    run.events.forEach(send);
    run.listeners.add(send);
    req.on('close', () => run.listeners.delete(send));
  });

  router.post('/api/requests/:id/answer', (req, res) => {
    if (!local(req)) return fail(res, 403, 'precondition_failed', 'requests are accepted from this machine only');
    const run = find(req, res);
    if (!run) return;
    if (run.busy || run.events.at(-1)?.type !== 'question') return fail(res, 409, 'precondition_failed', 'the request is not waiting for an answer');
    run.text = `${run.text}\n${String(req.body?.answer ?? '')}`;
    void start(run);
    res.status(204).end();
  });

  router.post('/api/requests/:id/approve', (req, res) => {
    const run = find(req, res);
    if (!run) return;
    const answer = run.approvals.get(String(req.body?.operationId));
    if (!answer) return fail(res, 409, 'precondition_failed', 'no operation of this request is waiting for approval');
    run.approvals.delete(String(req.body.operationId));
    answer(req.body?.approved === true ? 'approved' : 'denied');
    res.status(204).end();
  });

  router.post('/api/requests/:id/cancel', (req, res) => {
    const run = find(req, res);
    if (!run) return;
    run.abort.abort();
    res.status(204).end();
  });

  router.get('/api/documents/:id/inspect', async (req, res) => {
    const out = await executor.view(req.params.id);
    if (out.status !== 'succeeded') return res.status(404).json({ error: out.error });
    res.json(out.view);
  });

  router.get('/api/documents/:id/preview', async (req, res) => {
    const out = await executor.preview(req.params.id);
    if (out.status !== 'succeeded') return res.status(404).json({ error: out.error });
    res.type('model/gltf-binary').send(out.glb);
  });

  // The kernel's STEP export of a document, as an operation with its record; the file is served by its artifact id.
  router.post('/api/documents/:id/export', async (req, res) => {
    if (!local(req)) return fail(res, 403, 'precondition_failed', 'exports are accepted from this machine only');
    const op = { id: `export-${randomUUID().slice(0, 8)}`, target: { document: req.params.id }, type: 'export', params: { format: 'step' },
      preconditions: [], status: 'pending', result: null, verification: null, error: null };
    const out = await executor.execute(op, { requestId: `export-${req.params.id}` });
    if (out.status !== 'succeeded') return res.status(422).json({ error: out.record?.errorDetails ?? out.error, record: out.operationId });
    res.json({ artifact: out.record.artifactReferences[0].id, record: out.operationId });
  });

  router.get('/api/artifacts/:id', (req, res) => {
    const a = executor.store.artifact(req.params.id);
    if (!a) return fail(res, 404, 'precondition_failed', 'no such artifact');
    res.download(a.path, `${req.params.id}.${a.kind}`);
  });

  return { router, approve };
}
