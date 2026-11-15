import { request } from 'node:http';
import { connect } from 'node:net';
import { networkInterfaces } from 'node:os';
import { expect, test } from '@playwright/test';

// Council D1: in dev mode Vite serves files under cad-AI, data/jobs.db and job STEPs included, so the server takes no
// connection from another machine. It is reached here through this machine's own LAN address.
test('the server refuses a connection on a LAN address and serves this machine on 127.0.0.1', async ({ baseURL }) => {
  const lan = Object.values(networkInterfaces()).flat().find((a) => a && a.family === 'IPv4' && !a.internal)?.address;
  test.skip(!lan, 'this machine has no LAN address');
  const port = new URL(baseURL!).port;
  expect((await fetch(`${baseURL}/api/jobs`)).status).toBe(200);
  await expect(fetch(`http://${lan}:${port}/e2e/.fixtures/server-data/jobs.db`)).rejects.toThrow();
  // Council R1: Vite's live-update socket shares the server's own 127.0.0.1 listener, so its default port 24678 is never opened.
  const opens = (host: string, p: number) => new Promise<boolean>((resolve) => {
    const s = connect({ host, port: p });
    s.once('connect', () => { s.destroy(); resolve(true); });
    s.once('error', () => resolve(false));
  });
  expect(await opens(lan!, 24678)).toBe(false);
});

// Council X1 (L8 T5): a browser applies no CORS to a WebSocket, and a page that rebinds a name to 127.0.0.1 is same-origin
// with it, so the voice socket and the read routes check the Host and Origin like every write route.
test('the voice socket refuses a foreign origin, and the read routes refuse a foreign host', async ({ baseURL }) => {
  const { port } = new URL(baseURL!);
  const status = (path: string, headers: Record<string, string>) => new Promise<number>((resolve) => {
    const req = request({ host: '127.0.0.1', port, path, headers });
    req.on('upgrade', (_res, socket) => { socket.destroy(); resolve(101); });
    req.on('response', (res) => { res.resume(); resolve(res.statusCode!); });
    req.on('error', () => resolve(0));
    req.end();
  });
  const ws = { Connection: 'Upgrade', Upgrade: 'websocket', 'Sec-WebSocket-Version': '13', 'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==' };
  expect(await status('/api/live', { ...ws, Origin: 'http://evil.example' })).toBe(403);
  expect(await status('/api/live', { ...ws, Host: 'evil.example' })).toBe(403);
  for (const path of ['/api/documents/part-1/inspect', '/api/documents/part-1/preview', '/api/requests/x/events', '/api/artifacts/x']) {
    expect(await status(path, { Host: 'evil.example' }), path).toBe(403);
  }
});
