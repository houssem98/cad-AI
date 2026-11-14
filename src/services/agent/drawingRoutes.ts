import express, { type Response } from 'express';
import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import type { Executor } from '../cad/executor';
import type { Complete } from '../model/modelClient';
import { drawing2cad } from './drawing2cad';
import { local, refuse } from './routes';

const fail = (res: Response, status: number, code: string, message: string) => res.status(status).json({ error: { code, message } });
const SAFE = /^[A-Za-z0-9_-]+$/;
const TYPES: Record<string, string> = { svg: 'image/svg+xml', dxf: 'application/dxf', pdf: 'application/pdf' };

// L7 T10: drawings in and out, for this machine only. An upload is stored under a name the server makes (only its extension is
// kept, so the reader can refuse what it cannot read) and goes through drawing2cad; an export is the kernel's own drawing.
export function drawingRoutes(executor: Executor, complete: Complete, dataDir: string) {
  const router = express.Router();
  const uploads = join(dataDir, 'uploads');
  const running = new Set<string>(); // names taken by an upload still being built, so a second upload cannot edit the same document (council V8)

  router.post('/api/drawings/read', async (req, res) => {
    if (!local(req)) return refuse(res);
    const { name, base64, document } = req.body ?? {};
    if (typeof name !== 'string' || typeof base64 !== 'string' || !base64) return fail(res, 400, 'validation_failed', 'name and base64: the file and its name are required');
    if (typeof document !== 'string' || !SAFE.test(document)) return fail(res, 400, 'validation_failed', 'document: letters, digits, - and _ only');
    if (executor.store.document(document) || running.has(document)) return fail(res, 409, 'precondition_failed', `document ${document} already exists`);
    const ext = extname(name).toLowerCase();
    mkdirSync(uploads, { recursive: true });
    const path = join(uploads, `${randomUUID()}${/^\.[a-z0-9]{1,5}$/.test(ext) ? ext : ''}`);
    running.add(document);
    try {
      writeFileSync(path, Buffer.from(base64, 'base64'));
      res.json(await drawing2cad(path, { executor, document, requestId: `drawing-${document}`, complete }));
    } catch (e) {
      // A model or kernel error ends this request, never the server (council V2).
      const message = `the agent stopped: ${(e as Error).message}`;
      res.json({ kind: 'failed', message, report: { operations: [], unresolved: [], inspection: null, text: `Failed: ${message}` } });
    } finally {
      running.delete(document);
    }
  });

  router.get('/api/documents/:id/drawing.:fmt', async (req, res) => {
    if (!local(req)) return refuse(res);
    const { id, fmt } = req.params;
    if (!Object.hasOwn(TYPES, fmt)) return fail(res, 400, 'validation_failed', 'format: svg, dxf or pdf'); // not __proto__ (council V2)
    if (!SAFE.test(id) || !executor.store.document(id)) return fail(res, 404, 'precondition_failed', `document ${id} does not exist`);
    try {
      const out = await executor.drawing(id);
      if (out.status !== 'succeeded') return res.status(out.status === 'unsupported' ? 422 : 500).json({ error: out.error });
      res.type(TYPES[fmt]).sendFile(out.files![fmt]);
    } catch (e) {
      fail(res, 500, 'kernel_error', (e as Error).message);
    }
  });

  return router;
}
