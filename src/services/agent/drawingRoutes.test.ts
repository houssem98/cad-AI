import express from 'express';
import { mkdtempSync } from 'node:fs';
import { request as httpRequest, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Executor } from '../cad/executor';
import type { Complete } from '../model/modelClient';
import { drawingRoutes } from './drawingRoutes';

const mm = (value: number) => ({ value, unit: 'mm' });
const op = (document: string, id: string, type: string, params: object) =>
  ({ id, target: { document }, type, params, preconditions: [], status: 'pending', result: null, verification: null, error: null });
const PLATE = (doc: string) => [op(doc, 'p', 'new_part', { name: 'plate' }), op(doc, 's', 'sketch_rectangle', { plane: 'top', width: mm(90), height: mm(50) }),
  op(doc, 'x', 'extrude', { sketch: 's', depth: mm(6) }), op(doc, 'h', 'hole', { diameter: mm(8), through_all: true, positions: [{ x: mm(-25), y: mm(10) }] })];

// A scripted model that builds the drawn plate, so the test grades the route, not a model.
let calls = 0, throwing = false, throwAt = -1;
const usage = { prompt_tokens: 0, completion_tokens: 0 };
const complete: Complete = async () => {
  if (throwing) throw new Error('DEEPSEEK_API_KEY is not set');
  if (calls === throwAt) throw new Error('the model timed out');
  const t = PLATE('x')[calls];
  calls++;
  return t ? { text: '', toolCalls: [{ id: `t${calls}`, name: t.type, arguments: JSON.stringify({ id: t.id, params: t.params }) }], usage } : { text: 'Done.', toolCalls: [], usage };
};

let ex: Executor, server: Server, port: number;
beforeAll(async () => {
  const dir = mkdtempSync(join(tmpdir(), 'drawing-routes-'));
  ex = await Executor.open({ dbPath: join(dir, 'cad.db'), dataDir: dir, workerArgs: ['--adapter', 'kernel'] });
  for (const o of PLATE('src')) expect((await ex.execute(o, { requestId: 'routes' })).status).toBe('succeeded');
  const app = express();
  app.use(express.json({ limit: '15mb' }));
  app.use(drawingRoutes(ex, complete, dir));
  server = app.listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  port = (server.address() as AddressInfo).port;
});
afterAll(() => { server?.close(); ex?.close(); });

// node:http, because fetch will not send a Host header of the caller's choosing.
function call(method: string, path: string, body?: object, host = `127.0.0.1:${port}`): Promise<{ status: number; text: string; type: string }> {
  return new Promise((resolve, reject) => {
    const req = httpRequest({ host: '127.0.0.1', port, method, path, headers: { 'content-type': 'application/json', host } }, (res) => {
      let text = '';
      res.setEncoding('latin1');
      res.on('data', (d) => { text += d; });
      res.on('end', () => resolve({ status: res.statusCode!, text, type: String(res.headers['content-type'] ?? '') }));
    });
    req.on('error', reject);
    req.end(body ? JSON.stringify(body) : undefined);
  });
}

describe('drawing routes', { timeout: 180000 }, () => {
  it('exports the kernel drawing of a document as SVG, DXF and PDF', async () => {
    const dxf = await call('GET', '/api/documents/src/drawing.dxf');
    expect(dxf.status).toBe(200);
    expect(dxf.text).toContain('DIMENSION');
    expect((await call('GET', '/api/documents/src/drawing.svg')).text).toContain('<svg');
    expect((await call('GET', '/api/documents/src/drawing.pdf')).text.startsWith('%PDF-1.4')).toBe(true);
    expect((await call('GET', '/api/documents/src/drawing.exe')).status).toBe(400);
    expect((await call('GET', '/api/documents/ghost/drawing.dxf')).status).toBe(404);
  });

  it('builds an uploaded DXF into a part the kernel checks against the drawing', async () => {
    const dxf = await call('GET', '/api/documents/src/drawing.dxf');
    const out = await call('POST', '/api/drawings/read', { name: 'plate.dxf', base64: Buffer.from(dxf.text, 'latin1').toString('base64'), document: 'from-drawing' });
    expect(out.status).toBe(200);
    const body = JSON.parse(out.text);
    expect(body.kind, out.text).toBe('part');
    expect(body.report.inspection.volume_mm3).toBeCloseTo((await ex.inspect('src')).verification.volume_mm3, 6);
  });

  it('answers unsupported for an image, and refuses a bad document name, a taken document and another host', async () => {
    const png = await call('POST', '/api/drawings/read', { name: 'scan.png', base64: Buffer.from([0x89, 0x50, 0x4e, 0x47]).toString('base64'), document: 'from-scan' });
    expect(JSON.parse(png.text)).toEqual({ kind: 'unsupported', message: expect.stringContaining('raster') });
    expect(ex.store.document('from-scan')).toBeFalsy();
    expect((await call('POST', '/api/drawings/read', { name: 'a.dxf', base64: 'AA==', document: '../x' })).status).toBe(400);
    expect((await call('POST', '/api/drawings/read', { name: 'a.dxf', base64: 'AA==', document: 'src' })).status).toBe(409);
    expect((await call('GET', '/api/documents/src/drawing.dxf', undefined, 'evil.example')).status).toBe(403);
  });

  // Council V2: a model error escaped the async handler and ended the server process; a prototype key passed the format check.
  it('turns a model error into a failed result and keeps answering, and refuses prototype keys as formats', async () => {
    const dxf = await call('GET', '/api/documents/src/drawing.dxf');
    throwing = true;
    const out = await call('POST', '/api/drawings/read', { name: 'plate.dxf', base64: Buffer.from(dxf.text, 'latin1').toString('base64'), document: 'thrower' });
    throwing = false;
    expect(out.status).toBe(200);
    expect(JSON.parse(out.text)).toMatchObject({ kind: 'failed', message: expect.stringContaining('DEEPSEEK_API_KEY is not set') });
    expect((await call('GET', '/api/documents/src/drawing.dxf')).status).toBe(200);
    for (const fmt of ['__proto__', 'toString', 'constructor']) expect((await call('GET', `/api/documents/src/drawing.${fmt}`)).status, fmt).toBe(400);
  });

  // Council V8 and V12: two uploads to one name both passed the name check; another host was refused only on the export.
  it('lets one of two uploads to the same name through, and refuses an upload from another host', async () => {
    const dxf = await call('GET', '/api/documents/src/drawing.dxf');
    const body = { name: 'plate.dxf', base64: Buffer.from(dxf.text, 'latin1').toString('base64'), document: 'twin' };
    calls = 0;
    const statuses = (await Promise.all([call('POST', '/api/drawings/read', body), call('POST', '/api/drawings/read', body)])).map((r) => r.status).sort();
    expect(statuses).toEqual([200, 409]);
    expect((await call('POST', '/api/drawings/read', { ...body, document: 'elsewhere' }, 'evil.example')).status).toBe(403);
  });

  // Council round 3, W2: an error after some operations ran reported none of them and said nothing of the half-built document.
  it('reports the operations a stopped upload recorded and the document it left half built', async () => {
    const dxf = await call('GET', '/api/documents/src/drawing.dxf');
    calls = 0;
    throwAt = 2;
    const out = JSON.parse((await call('POST', '/api/drawings/read', { name: 'plate.dxf', base64: Buffer.from(dxf.text, 'latin1').toString('base64'), document: 'half' })).text);
    throwAt = -1;
    expect(out.kind).toBe('failed');
    expect(out.report.operations.map((o: any) => [o.type, o.status])).toEqual([['new_part', 'succeeded'], ['sketch_rectangle', 'succeeded']]);
    expect(out.message).toMatch(/document half holds a partial build/);
  });
});
