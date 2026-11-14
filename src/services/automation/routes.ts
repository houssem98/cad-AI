import express, { type Response } from 'express';
import { randomUUID } from 'node:crypto';
import type { Executor } from '../cad/executor';
import { local, refuse } from '../agent/routes';
import { replay, WorkflowStore } from './workflows';

const fail = (res: Response, status: number, code: string, message: string) => res.status(status).json({ error: { code, message } });

// L7 T8: saved workflows over HTTP, for this machine only. A replay reports each step by its execution record's status.
export function workflowRoutes(executor: Executor, store: WorkflowStore) {
  const router = express.Router();

  router.get('/api/workflows', (req, res) => {
    if (!local(req)) return refuse(res);
    res.json(store.ids().map((id) => store.load(id)));
  });

  router.post('/api/workflows', (req, res) => {
    if (!local(req)) return refuse(res);
    try {
      res.status(201).json(store.save(req.body));
    } catch (e) {
      fail(res, 400, 'validation_failed', (e as Error).message);
    }
  });

  router.post('/api/workflows/:id/replay', async (req, res) => {
    if (!local(req)) return refuse(res);
    const { args = {}, document, version } = req.body ?? {};
    if (typeof document !== 'string' || !/^[A-Za-z0-9_-]+$/.test(document)) return fail(res, 400, 'validation_failed', 'document: letters, digits, - and _ only');
    if (typeof args !== 'object' || Object.values(args).some((v) => typeof v !== 'number')) return fail(res, 400, 'validation_failed', 'args: a number per parameter');
    let wf;
    try {
      wf = store.load(req.params.id, version);
    } catch (e) {
      return fail(res, 404, 'precondition_failed', (e as Error).message);
    }
    const out = await replay(executor, wf, args, { document, requestId: `workflow-${wf.id}-${randomUUID().slice(0, 8)}` });
    const steps = wf.steps.map((s, i) => {
      const o = out.outcomes[i];
      const r = o && executor.store.record(o.operationId);
      return { id: s.id, type: s.type, status: o ? (r?.status ?? o.status) : 'not run', error: o ? (r?.errorDetails?.message ?? o.error?.message ?? null) : null, record: o?.operationId ?? null };
    });
    res.json({ status: out.status, error: out.error ?? null, document, version: wf.version, steps });
  });

  return router;
}
