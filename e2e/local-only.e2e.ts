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
