import express from 'express';
import { mkdtempSync } from 'node:fs';
import { request as httpRequest, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Executor } from '../cad/executor';
import { workflowRoutes } from './routes';
import { WorkflowStore } from './workflows';

let ex: Executor, server: Server, port: number;
beforeAll(async () => {
  const dir = mkdtempSync(join(tmpdir(), 'workflow-routes-'));
  ex = await Executor.open({ dbPath: join(dir, 'cad.db'), dataDir: dir, workerArgs: ['--adapter', 'kernel'] });
  const app = express();
  app.use(express.json());
  app.use(workflowRoutes(ex, new WorkflowStore(join(dir, 'workflows'))));
  server = app.listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  port = (server.address() as AddressInfo).port;
});
afterAll(() => { server?.close(); ex?.close(); });

// node:http, because fetch will not send a Host header of the caller's choosing.
function call(method: string, path: string, body?: object, host = `127.0.0.1:${port}`): Promise<{ status: number; json: any }> {
  return new Promise((resolve, reject) => {
    const req = httpRequest({ host: '127.0.0.1', port, method, path, headers: { 'content-type': 'application/json', host } }, (res) => {
      let text = '';
      res.on('data', (d) => { text += d; });
      res.on('end', () => resolve({ status: res.statusCode!, json: text ? JSON.parse(text) : null }));
    });
    req.on('error', reject);
    req.end(body ? JSON.stringify(body) : undefined);
  });
}

const P = (name: string) => ({ $param: name });
const PLATE = {
  id: 'plate', name: 'Rectangular plate',
  params: [{ name: 'length', unit: 'mm', default: 100 }, { name: 'width', unit: 'mm', default: 60 }, { name: 'thickness', unit: 'mm', default: 5 }],
  steps: [{ id: 'p', type: 'new_part', params: { name: 'plate' } }, { id: 's', type: 'sketch_rectangle', params: { plane: 'top', width: P('length'), height: P('width') } },
    { id: 'x', type: 'extrude', params: { sketch: 's', depth: P('thickness') } }],
};

describe('workflow routes', { timeout: 180000 }, () => {
  it('saves and lists a workflow, and a replay through the route yields geometry the kernel verifies', async () => {
    expect((await call('POST', '/api/workflows', PLATE)).status).toBe(201);
    expect((await call('GET', '/api/workflows')).json.map((w: any) => [w.id, w.version])).toEqual([['plate', 1]]);
    const out = await call('POST', '/api/workflows/plate/replay', { args: { length: 80, width: 40, thickness: 8 }, document: 'plate-80' });
    expect(out.status).toBe(200);
    expect(out.json.status, JSON.stringify(out.json)).toBe('succeeded');
    expect(out.json.steps.map((s: any) => [s.id, s.status])).toEqual([['p', 'succeeded'], ['s', 'succeeded'], ['x', 'succeeded']]);
    for (const s of out.json.steps) expect(ex.store.record(s.record)?.status).toBe('succeeded');
    const v = (await ex.inspect('plate-80')).verification;
    expect(v.valid).toBe(true);
    expect(v.volume_mm3).toBeCloseTo(80 * 40 * 8, 3);
  });

  it('reports a step whose record failed as failed, and the steps after it as not run', async () => {
    const out = await call('POST', '/api/workflows/plate/replay', { args: { thickness: 0 }, document: 'plate-zero' });
    expect(out.json.status).toBe('failed');
    expect(out.json.steps.map((s: any) => [s.id, s.status])).toEqual([['p', 'succeeded'], ['s', 'succeeded'], ['x', 'failed']]);
    expect(ex.store.record(out.json.steps[2].record)?.status).toBe('failed');
    expect(out.json.steps[2].error).toMatch(/schema/);
  });

  it('refuses a non-operation step, a bad document name, another host, and an unknown workflow', async () => {
    const bad = await call('POST', '/api/workflows', { ...PLATE, id: 'bad', steps: [{ id: 'r', type: 'run_script', params: { code: 'x' } }] });
    expect(bad.status).toBe(400);
    expect(bad.json.error.message).toMatch(/steps\/0\/type: must be one of/);
    expect((await call('POST', '/api/workflows/plate/replay', { args: {}, document: '../x' })).status).toBe(400);
    expect((await call('POST', '/api/workflows/plate/replay', { args: { length: 'ten' }, document: 'p2' })).status).toBe(400);
    expect((await call('GET', '/api/workflows', undefined, 'evil.example')).status).toBe(403);
    expect((await call('POST', '/api/workflows/ghost/replay', { args: {}, document: 'g' })).status).toBe(404);
  });
});
