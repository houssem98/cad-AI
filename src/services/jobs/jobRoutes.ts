import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import express from 'express';
import { local, refuse } from '../agent/routes';
import { JobConflict, type JobEngine } from './jobEngine';

// docs/cad-agent/architecture/API_CONTRACTS.md §3 job rows. Status and events come from the store, so a client that
// reconnects, or a server that restarts, reports the same job the same way. Every job route answers this machine only: the
// list holds every request's text and file paths, and the download the user's parts (council C4).
export function jobRoutes(engine: JobEngine) {
  const router = express.Router();
  const fail = (res: express.Response, status: number, code: string, message: string) => res.status(status).json({ error: { code, message } });
  router.use('/api/jobs', (req, res, next) => (local(req) ? next() : refuse(res)));

  router.post('/api/jobs', (req, res) => {
    const { type, input, idempotencyKey } = req.body ?? {};
    try {
      res.status(201).json(engine.submit(String(type), input ?? null, idempotencyKey ? String(idempotencyKey) : undefined));
    } catch (e) {
      if (e instanceof JobConflict) return fail(res, 409, 'precondition_failed', e.message);
      fail(res, 400, 'validation_failed', (e as Error).message);
    }
  });

  router.get('/api/jobs', (_req, res) => { res.json(engine.list()); });

  router.get('/api/jobs/:id', (req, res) => {
    const job = engine.get(req.params.id);
    if (!job) return fail(res, 404, 'precondition_failed', 'no such job');
    res.json({ ...job, events: engine.events(job.id) });
  });

  // Only a COMPLETED job has a STEP, and COMPLETED needs the kernel's re-import check (P9); the file is served only while it
  // still has the sha256 the job recorded (council C16).
  router.get('/api/jobs/:id/step', (req, res) => {
    const job = engine.get(req.params.id);
    if (!job) return fail(res, 404, 'precondition_failed', 'no such job');
    if (job.state !== 'COMPLETED' || !job.result?.step) return fail(res, 409, 'precondition_failed', `the job is ${job.state} and has no verified STEP`);
    let data: Buffer | null = null;
    try { data = readFileSync(job.result.step.path); } catch { /* gone */ }
    if (!data || createHash('sha256').update(data).digest('hex') !== job.result.step.sha256)
      return fail(res, 409, 'precondition_failed', 'the STEP file is missing or no longer has the sha256 the job recorded');
    res.attachment(`${job.id}.step`).send(data);
  });

  // A cancel that finds the job already finished, cancelled included, changes nothing, and says so (council C15, D13).
  router.post('/api/jobs/:id/cancel', (req, res) => {
    const was = engine.get(req.params.id)?.state;
    const job = engine.cancel(req.params.id);
    if (!job) return fail(res, 404, 'precondition_failed', 'no such job');
    if (was === 'CANCELLED' || job.state !== 'CANCELLED') return fail(res, 409, 'precondition_failed', `the job is already ${job.state}`);
    res.status(204).end();
  });

  return router;
}
