import express from 'express';
import { local, refuse } from '../agent/routes';
import type { JobEngine } from './jobEngine';

// docs/cad-agent/architecture/API_CONTRACTS.md §3 job rows. Status and events come from the store, so a client that
// reconnects, or a server that restarts, reports the same job the same way.
export function jobRoutes(engine: JobEngine) {
  const router = express.Router();
  const fail = (res: express.Response, status: number, code: string, message: string) => res.status(status).json({ error: { code, message } });

  router.post('/api/jobs', (req, res) => {
    if (!local(req)) return refuse(res);
    const { type, input, idempotencyKey } = req.body ?? {};
    try {
      res.status(201).json(engine.submit(String(type), input ?? null, idempotencyKey ? String(idempotencyKey) : undefined));
    } catch (e) {
      fail(res, 400, 'validation_failed', (e as Error).message);
    }
  });

  router.get('/api/jobs', (_req, res) => { res.json(engine.list()); });

  router.get('/api/jobs/:id', (req, res) => {
    const job = engine.get(req.params.id);
    if (!job) return fail(res, 404, 'precondition_failed', 'no such job');
    res.json({ ...job, events: engine.events(job.id) });
  });

  // Only a COMPLETED job has a STEP, and COMPLETED needs the kernel's re-import check (P9).
  router.get('/api/jobs/:id/step', (req, res) => {
    const job = engine.get(req.params.id);
    if (!job) return fail(res, 404, 'precondition_failed', 'no such job');
    if (job.state !== 'COMPLETED' || !job.result?.step) return fail(res, 409, 'precondition_failed', `the job is ${job.state} and has no verified STEP`);
    res.download(job.result.step.path, `${job.id}.step`);
  });

  router.post('/api/jobs/:id/cancel', (req, res) => {
    if (!local(req)) return refuse(res);
    if (!engine.cancel(req.params.id)) return fail(res, 404, 'precondition_failed', 'no such job');
    res.status(204).end();
  });

  return router;
}
