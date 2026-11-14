import express from 'express';
import { mkdtempSync } from 'node:fs';
import { request as httpRequest, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { KnowledgeBase } from './knowledge';
import { knowledgeRoutes } from './routes';

let server: Server, port: number;
beforeAll(async () => {
  const app = express();
  app.use(express.json({ limit: '15mb' }));
  app.use(knowledgeRoutes(new KnowledgeBase(join(mkdtempSync(join(tmpdir(), 'knowledge-routes-')), 'kb'))));
  server = app.listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  port = (server.address() as AddressInfo).port;
});
afterAll(() => server?.close());

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

const GUIDE = 'Wall thickness\nInjection-moulded ABS walls should be 2 to 3 mm thick.\n\nFillets\nInside corners take a fillet of half the wall thickness.\n';

describe('knowledge routes', () => {
  it('ingests a local document, lists it, and answers with a citation of its chunk', async () => {
    expect((await call('GET', '/api/knowledge')).json).toEqual([]);
    const added = await call('POST', '/api/knowledge', { source: 'design-guide.md', text: GUIDE });
    expect(added.status).toBe(201);
    expect(added.json).toEqual({ source: 'design-guide.md', chunks: 2 });
    expect((await call('GET', '/api/knowledge')).json).toEqual([{ source: 'design-guide.md', chunks: 2 }]);
    const a = await call('POST', '/api/knowledge/ask', { question: 'what fillet for an inside corner?' });
    expect(a.status).toBe(200);
    expect(a.json.citations).toEqual(['design-guide.md#1']);
    expect(a.json.text).toContain('> Inside corners take a fillet of half the wall thickness.');
    expect(a.json.text).toContain('[design-guide.md#1, lines 4-5]');
  });

  it('refuses an unsafe source name, a missing text or question, and another host', async () => {
    expect((await call('POST', '/api/knowledge', { source: '../x.md', text: 'x' })).status).toBe(400);
    expect((await call('POST', '/api/knowledge', { source: 'a.md' })).status).toBe(400);
    expect((await call('POST', '/api/knowledge', { text: 'Bolts. Use M3 screws.' })).status).toBe(400); // council S11: no name, never 'undefined'
    expect((await call('GET', '/api/knowledge')).json.map((s: any) => s.source)).not.toContain('undefined');
    expect((await call('POST', '/api/knowledge/ask', {})).status).toBe(400);
    expect((await call('GET', '/api/knowledge', undefined, 'evil.example')).status).toBe(403);
    expect((await call('POST', '/api/knowledge/ask', { question: 'fillet' }, 'evil.example')).status).toBe(403);
  });
});
