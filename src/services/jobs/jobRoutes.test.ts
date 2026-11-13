import express from 'express';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { request as httpRequest, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { JobEngine } from './jobEngine';
import { jobRoutes } from './jobRoutes';

const FIXTURES = fileURLToPath(new URL('./jobs.fixtures.ts', import.meta.url));
let engine: JobEngine, server: Server;
afterEach(() => { server?.close(); engine?.close(true); });

async function serve(db = join(mkdtempSync(join(tmpdir(), 'jobroutes-')), 'jobs.db')) {
  engine = JobEngine.open({ dbPath: db, types: ['slow', 'quick'], handlers: FIXTURES });
  const app = express();
  app.use(express.json());
  app.use(jobRoutes(engine));
  server = app.listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  const port = (server.address() as AddressInfo).port, base = `http://127.0.0.1:${port}`;
  const post = (path: string, body: object) => fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return { db, port, base, post };
}
async function completed(base: string, id: string) {
  let job: any;
  for (let i = 0; i < 200 && job?.state !== 'COMPLETED'; i++) {
    await new Promise((r) => setTimeout(r, 100));
    job = await (await fetch(`${base}/api/jobs/${id}`)).json();
  }
  return job;
}
// node:http, because fetch will not send a Host header of the caller's choosing.
const call = (port: number, method: string, path: string, headers: Record<string, string>) => new Promise<number>((resolve, reject) => {
  const req = httpRequest({ host: '127.0.0.1', port, method, path, headers: { 'content-type': 'application/json', ...headers } }, (res) => {
    res.resume();
    resolve(res.statusCode!);
  });
  req.on('error', reject);
  req.end(method === 'POST' ? JSON.stringify({ type: 'quick', input: {} }) : undefined);
});

describe('job routes (API_CONTRACTS §3)', { timeout: 60_000 }, () => {
  it('submit, repeat with the same key, read status and events, cancel', async () => {
    const { base, post } = await serve();
    const first = await post('/api/jobs', { type: 'slow', input: {}, idempotencyKey: 'k' });
    expect(first.status).toBe(201);
    const { id } = await first.json();
    expect((await (await post('/api/jobs', { type: 'slow', input: {}, idempotencyKey: 'k' })).json()).id).toBe(id);
    expect((await post('/api/jobs', { type: 'nope', input: {} })).status).toBe(400);
    expect((await (await fetch(`${base}/api/jobs`)).json()).map((j: any) => j.id)).toEqual([id]);
    expect((await post(`/api/jobs/${id}/cancel`, {})).status).toBe(204);
    const job = await (await fetch(`${base}/api/jobs/${id}`)).json();
    expect(job.state).toBe('CANCELLED');
    expect(job.events.map((e: any) => e.state)).toContain('CANCELLED');
    expect((await fetch(`${base}/api/jobs/${id}/step`)).status).toBe(409);
    expect((await fetch(`${base}/api/jobs/nope/step`)).status).toBe(404);
    expect((await fetch(`${base}/api/jobs/nope`)).status).toBe(404);

    // council C16: the STEP is served only while its file still has the sha256 the job recorded
    const quick = (await (await post('/api/jobs', { type: 'quick', input: {} })).json()).id;
    const done = await completed(base, quick);
    const ok = await fetch(`${base}/api/jobs/${quick}/step`);
    expect(ok.status).toBe(200);
    expect(await ok.text()).toBe('ISO-10303-21;\n');
    writeFileSync(done.result.step.path, 'ISO-10303-21; altered\n');
    expect((await fetch(`${base}/api/jobs/${quick}/step`)).status).toBe(409);
  });

  it('answers job reads and writes on this machine only (council C4)', async () => {
    const { port } = await serve();
    for (const [method, path] of [['GET', '/api/jobs'], ['GET', '/api/jobs/x'], ['GET', '/api/jobs/x/step'], ['POST', '/api/jobs'], ['POST', '/api/jobs/x/cancel']])
      expect(await call(port, method, path, { host: 'evil.example' }), `${method} ${path}`).toBe(403);
    expect(await call(port, 'GET', '/api/jobs', { origin: 'http://evil.example' })).toBe(403);
    expect(await call(port, 'GET', '/api/jobs', {})).toBe(200);
  });

  it('refuses a reused idempotency key for another request, and a cancel that changes nothing (council C14, C15)', async () => {
    const { base, post } = await serve();
    const a = await post('/api/jobs', { type: 'quick', input: { ms: 50 }, idempotencyKey: 'k' });
    expect(a.status).toBe(201);
    const { id } = await a.json();
    expect((await post('/api/jobs', { type: 'quick', input: { ms: 60 }, idempotencyKey: 'k' })).status).toBe(409);
    expect((await post('/api/jobs', { type: 'slow', input: { ms: 50 }, idempotencyKey: 'k' })).status).toBe(409);
    expect((await completed(base, id)).state).toBe('COMPLETED');
    expect((await post(`/api/jobs/${id}/cancel`, {})).status).toBe(409);
    expect((await (await fetch(`${base}/api/jobs/${id}`)).json()).state).toBe('COMPLETED');
  });

  it('serves a completed job and its STEP again after a restart (roadmap: artifact recovery)', async () => {
    const first = await serve();
    const { id } = await (await first.post('/api/jobs', { type: 'quick', input: {} })).json();
    await completed(first.base, id);
    const before = await (await fetch(`${first.base}/api/jobs/${id}/step`)).text();
    server.close();
    engine.close(false);
    const again = await serve(first.db);
    expect((await (await fetch(`${again.base}/api/jobs/${id}`)).json()).state).toBe('COMPLETED');
    const after = await fetch(`${again.base}/api/jobs/${id}/step`);
    expect(after.status).toBe(200);
    expect(await after.text()).toBe(before);
  });
});
