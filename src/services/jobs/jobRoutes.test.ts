import express from 'express';
import { mkdtempSync, writeFileSync } from 'node:fs';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { JobEngine } from './jobEngine';
import { jobRoutes } from './jobRoutes';

let engine: JobEngine, server: Server;
afterEach(() => { server?.close(); engine?.close(true); });

describe('job routes (API_CONTRACTS §3)', { timeout: 60_000 }, () => {
  it('submit, repeat with the same key, read status and events, cancel', async () => {
    engine = JobEngine.open({ dbPath: join(mkdtempSync(join(tmpdir(), 'jobroutes-')), 'jobs.db'), types: ['slow', 'quick'],
      handlers: fileURLToPath(new URL('./jobs.fixtures.ts', import.meta.url)) });
    const app = express();
    app.use(express.json());
    app.use(jobRoutes(engine));
    server = app.listen(0, '127.0.0.1');
    await new Promise((r) => server.once('listening', r));
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const post = (path: string, body: object) => fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

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
    let done: any;
    for (let i = 0; i < 200 && done?.state !== 'COMPLETED'; i++) {
      await new Promise((r) => setTimeout(r, 100));
      done = await (await fetch(`${base}/api/jobs/${quick}`)).json();
    }
    const ok = await fetch(`${base}/api/jobs/${quick}/step`);
    expect(ok.status).toBe(200);
    expect(await ok.text()).toBe('ISO-10303-21;\n');
    writeFileSync(done.result.step.path, 'ISO-10303-21; altered\n');
    expect((await fetch(`${base}/api/jobs/${quick}/step`)).status).toBe(409);
  });
});
