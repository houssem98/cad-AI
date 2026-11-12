import express from 'express';
import { mkdtempSync } from 'node:fs';
import { request as httpRequest, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { Executor, type Decision } from '../cad/executor';
import type { Complete } from '../model/modelClient';
import { agentRoutes } from './routes';

let ex: Executor, server: Server;
afterEach(() => { server?.close(); ex?.close(); });

async function serve(complete: Complete, approvalTimeoutMs?: number) {
  const dir = mkdtempSync(join(tmpdir(), 'routes-'));
  let hook = (_op: any): Promise<Decision> => Promise.resolve('denied');
  ex = await Executor.open({ dbPath: join(dir, 'cad.db'), dataDir: dir, workerArgs: ['--adapter', 'kernel'], approve: (op) => hook(op) });
  const agent = agentRoutes(ex, complete, { approvalTimeoutMs });
  hook = agent.approve;
  const app = express();
  app.use(express.json());
  app.use(agent.router);
  server = app.listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  return (server.address() as AddressInfo).port;
}

// node:http, because fetch will not send a Host header of the caller's choosing.
function call(port: number, method: string, path: string, body?: object, headers: Record<string, string> = {}): Promise<{ status: number; text: string }> {
  return new Promise((resolve, reject) => {
    const req = httpRequest({ host: '127.0.0.1', port, method, path, headers: { 'content-type': 'application/json', ...headers } }, (res) => {
      let text = '';
      res.on('data', (d) => { text += d; if (text.includes('event: done')) req.destroy(); });
      res.on('end', () => resolve({ status: res.statusCode!, text }));
      res.on('close', () => resolve({ status: res.statusCode!, text }));
    });
    req.on('error', reject);
    req.end(body ? JSON.stringify(body) : undefined);
  });
}

const usage = { prompt_tokens: 0, completion_tokens: 0 };
const spec = JSON.stringify({ part: 'plate', missing: [], assumptions: [], envelope: null, dimensions: [{ name: 'side', value: 10, unit: 'mm' }] });
function scripted(turns: [string, string][]): Complete {
  let n = 0;
  return async (r) => (r.json ? { text: spec, toolCalls: [], usage }
    : n < turns.length ? { text: '', toolCalls: [{ id: `t${n}`, name: turns[n][0], arguments: turns[n++][1] }], usage } : { text: 'done', toolCalls: [], usage });
}
const plate: [string, string][] = [['new_part', '{"id":"p","params":{"name":"p"}}'],
  ['sketch_rectangle', '{"id":"s","params":{"plane":"top","width":{"value":10,"unit":"mm"},"height":{"value":10,"unit":"mm"}}}'],
  ['extrude', '{"id":"x","params":{"sketch":"s","depth":{"value":2,"unit":"mm"}}}']];

describe('agent routes', { timeout: 120000 }, () => {
  it('refuse a request whose Host is not this machine (council C17)', async () => {
    const port = await serve(scripted(plate));
    expect((await call(port, 'POST', '/api/requests', { text: 'Plate 10 mm by 10 mm by 2 mm.' }, { host: 'evil.example' })).status).toBe(403);
    expect((await call(port, 'POST', '/api/requests', { text: 'Plate 10 mm by 10 mm by 2 mm.' }, { origin: 'http://evil.example' })).status).toBe(403);
    expect((await call(port, 'POST', '/api/requests', { text: 'Plate 10 mm by 10 mm by 2 mm.' })).status).toBe(201);
  });

  it('deny an approval nobody answers, so the executor is not held forever (council C6)', async () => {
    const port = await serve(scripted([...plate, ['modify_dimension', '{"id":"m","params":{"parameter":"x.depth","value":{"value":3,"unit":"mm"}}}']]), 300);
    const { id } = JSON.parse((await call(port, 'POST', '/api/requests', { text: 'Plate 10 mm by 10 mm by 2 mm.' })).text);
    const events = (await call(port, 'GET', `/api/requests/${id}/events`)).text;
    expect(events).toContain('event: approval');
    const denied = events.split('\n\n').find((e) => e.startsWith('event: record') && e.includes('"type":"modify_dimension"'));
    expect(denied).toContain('"status":"cancelled"');
    expect(denied).toContain('approval_denied');
    expect(events).toMatch(/event: done\ndata: \{"status":"succeeded"/);
  });
});
