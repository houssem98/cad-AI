import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { JobEngine, type JobOptions } from './jobEngine';

const FIXTURES = fileURLToPath(new URL('./jobs.fixtures.ts', import.meta.url));
const TYPES = ['quick', 'unverified', 'slow', 'hang', 'count'];
const engines: JobEngine[] = [];
afterEach(() => { for (const e of engines.splice(0)) e.close(true); });

const dir = () => mkdtempSync(join(tmpdir(), 'jobs-'));
const open = (dbPath: string, o: Partial<JobOptions> = {}) => {
  const e = JobEngine.open({ dbPath, handlers: FIXTURES, types: TYPES, ...o });
  engines.push(e);
  return e;
};
const alive = (pid: number) => { try { process.kill(pid, 0); return true; } catch { return false; } };
async function until<T>(f: () => T, ok: (v: T) => boolean, ms: number) {
  const end = Date.now() + ms;
  for (;;) {
    const v = f();
    if (ok(v)) return v;
    if (Date.now() > end) throw new Error(`timed out; last: ${JSON.stringify(v)}`);
    await new Promise((r) => setTimeout(r, 100));
  }
}
const state = (e: JobEngine, id: string) => () => e.get(id)!.state;

describe('job engine (L6 T1)', { timeout: 60_000 }, () => {
  it('runs a job through its states to COMPLETED only when its result is verified', async () => {
    const e = open(join(dir(), 'jobs.db'));
    const done = e.submit('quick', {});
    await until(state(e, done.id), (s) => s === 'COMPLETED', 20_000);
    expect(e.events(done.id).map((x) => x.state)).toEqual(['CREATED', 'PENDING', 'RUNNING', 'VERIFYING', 'COMPLETED']);
    const bad = e.submit('unverified', {});
    const failed = await until(() => e.get(bad.id)!, (j) => j.state === 'FAILED', 20_000);
    expect(failed.error?.code).toBe('verification_failed');
  });

  it('fails a worker killed mid-job instead of leaving it RUNNING, and a client after a restart sees the same status', async () => {
    const db = join(dir(), 'jobs.db');
    const e = open(db);
    const job = e.submit('slow', {});
    const running = await until(() => e.get(job.id)!, (j) => j.state === 'RUNNING', 20_000);
    e.close(false); // the server goes down; the worker is left running
    process.kill(running.pid!);
    await until(() => alive(running.pid!), (a) => !a, 5_000);
    const again = open(db); // the server comes back: its watchdog runs at start
    const after = again.get(job.id)!;
    expect(after.state).toBe('FAILED');
    expect(after.error?.code).toBe('worker_crashed');
    expect(again.events(job.id).at(-1)?.state).toBe('FAILED');
  });

  it('fails a hung worker under a live server within 15 s', async () => {
    const e = open(join(dir(), 'jobs.db')); // the real watchdog: every 5 s, stale after 10 s without a heartbeat
    const job = e.submit('hang', {});
    const running = await until(() => e.get(job.id)!, (j) => j.state === 'RUNNING', 20_000);
    const since = running.heartbeatAt!;
    const failed = await until(() => e.get(job.id)!, (j) => j.state === 'FAILED', 20_000);
    expect(Date.parse(failed.finishedAt!) - Date.parse(since)).toBeLessThanOrEqual(15_000);
    expect(failed.error?.code).toBe('worker_crashed');
    await until(() => alive(running.pid!), (a) => !a, 5_000);
  });

  it('ends a job past its maximum duration with timeout and stops its worker', async () => {
    const e = open(join(dir(), 'jobs.db'), { maxMs: { slow: 1500 }, watchdogMs: 300 });
    const job = e.submit('slow', {});
    const running = await until(() => e.get(job.id)!, (j) => j.state === 'RUNNING', 20_000);
    const failed = await until(() => e.get(job.id)!, (j) => j.state === 'FAILED', 10_000);
    expect(failed.error?.code).toBe('timeout');
    await until(() => alive(running.pid!), (a) => !a, 5_000);
  });

  it('runs a duplicate submission with the same idempotency key once', async () => {
    const d = dir();
    const file = join(d, 'runs.txt');
    const e = open(join(d, 'jobs.db'));
    const a = e.submit('count', { file }, 'key-1');
    const b = e.submit('count', { file }, 'key-1');
    expect(b.id).toBe(a.id);
    await until(state(e, a.id), (s) => s === 'COMPLETED', 20_000);
    expect(readFileSync(file, 'utf8')).toBe('ran\n');
  });

  it('cancels a running job: CANCELLED, worker stopped, and the worker cannot overwrite it', async () => {
    const e = open(join(dir(), 'jobs.db'));
    const job = e.submit('slow', {});
    const running = await until(() => e.get(job.id)!, (j) => j.state === 'RUNNING', 20_000);
    expect(e.cancel(job.id)!.state).toBe('CANCELLED');
    await until(() => alive(running.pid!), (a) => !a, 5_000);
    await new Promise((r) => setTimeout(r, 2_500));
    expect(e.get(job.id)!.state).toBe('CANCELLED');
  });

  it('refuses a job type it does not know', () => {
    const e = open(join(dir(), 'jobs.db'));
    expect(() => e.submit('nope', {})).toThrow(/unknown job type/);
  });
});
