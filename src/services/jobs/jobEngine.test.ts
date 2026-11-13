import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { CadStore } from '../cad/cadStore';
import { JobEngine, openJobDb, type JobOptions } from './jobEngine';

const FIXTURES = fileURLToPath(new URL('./jobs.fixtures.ts', import.meta.url));
const TYPES = ['quick', 'unverified', 'bare', 'tampered', 'slow', 'hang', 'count', 'crash', 'midop'];
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

  it('completes only with an artifact whose file still has its recorded sha256, checked while VERIFYING (council C6, C20)', async () => {
    const e = open(join(dir(), 'jobs.db'));
    const quick = e.submit('quick', {});
    const done = await until(() => e.get(quick.id)!, (j) => j.state === 'COMPLETED', 20_000);
    expect(readFileSync(done.result.step.path, 'utf8')).toBe('ISO-10303-21;\n');
    for (const type of ['bare', 'tampered']) {
      const job = e.submit(type, {});
      const failed = await until(() => e.get(job.id)!, (j) => j.state === 'FAILED', 20_000);
      expect(failed.error?.code, type).toBe('verification_failed');
      expect(e.events(job.id).map((x) => x.state).slice(-2), type).toEqual(['VERIFYING', 'FAILED']);
    }
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

  // Council C3 and C8: after a reboot or a long outage a stored pid may belong to another program. The job fails, and that
  // program lives. An hour-old RUNNING row would otherwise be a timeout, and a PENDING row with a live pid was never failed.
  for (const [state, cols] of [['RUNNING', ', started_at, heartbeat_at'], ['PENDING', '']] as const) {
    it(`fails a ${state} job whose stored pid now runs another program, and leaves that program alive`, async () => {
      const other = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1e9)'], { stdio: 'ignore' });
      try {
        const db = join(dir(), 'jobs.db'), old = new Date(Date.now() - 3_600_000).toISOString(), id = randomUUID();
        const raw = openJobDb(db);
        raw.prepare(`INSERT INTO jobs (id, type, input_json, state, pid, created_at${cols}) VALUES (?, 'slow', 'null', ?, ?, ?${cols ? ', ?, ?' : ''})`)
          .run(id, state, other.pid!, old, ...(cols ? [old, old] : []));
        raw.close();
        const e = open(db, { watchdogMs: 300 });
        const failed = await until(() => e.get(id)!, (j) => j.state === 'FAILED', 20_000);
        expect(failed.error?.code).toBe('worker_crashed');
        await new Promise((r) => setTimeout(r, 1_000));
        expect(alive(other.pid!)).toBe(true);
      } finally {
        other.kill();
      }
    });
  }

  it('cancels a job mid-operation: its worker and kernel stop, and the operation record says cancelled (council C5, C7)', async () => {
    const d = dir();
    const e = open(join(d, 'jobs.db'));
    const job = e.submit('midop', {});
    const jobDir = join(d, 'jobs', job.id);
    const unfinished = () => { const s = new CadStore(join(jobDir, 'cad.db')); try { return s.unfinished(); } finally { s.close(); } };
    const [row] = await until(() => (existsSync(join(jobDir, 'kernel.pid')) ? unfinished() : []), (rows) => rows.some((r) => r.status === 'running'), 30_000);
    const worker = e.get(job.id)!.pid!, kernel = Number(readFileSync(join(jobDir, 'kernel.pid'), 'utf8'));
    expect(alive(kernel)).toBe(true);
    expect(e.cancel(job.id)!.state).toBe('CANCELLED');
    await until(() => alive(worker) || alive(kernel), (a) => !a, 10_000);
    expect(unfinished()).toEqual([]);
    const s = new CadStore(join(jobDir, 'cad.db'));
    try {
      const rec = s.record(row.rowId);
      expect(rec.status).toBe('cancelled');
      expect(rec.errorDetails.code).toBe('cancelled');
      expect(rec.targetDocument.revisionAfter).toBe(rec.targetDocument.revisionBefore);
    } finally {
      s.close();
    }
  });

  it('keeps what a crashed worker printed and names it in the job error (council C22)', async () => {
    const d = dir();
    const e = open(join(d, 'jobs.db'), { watchdogMs: 300 });
    const job = e.submit('crash', {});
    const failed = await until(() => e.get(job.id)!, (j) => j.state === 'FAILED', 20_000);
    expect(failed.error?.code).toBe('worker_crashed');
    expect(failed.error?.message).toContain('fixture crash: out of memory');
    expect(readFileSync(join(d, 'jobs', job.id, 'worker.log'), 'utf8')).toContain('fixture crash: out of memory');
  });

  it('refuses a submission past the worker cap, so jobs cannot exhaust memory, and takes it once a slot frees (council C21)', async () => {
    const e = open(join(dir(), 'jobs.db'), { maxWorkers: 1 });
    const first = e.submit('slow', {});
    expect(() => e.submit('slow', {})).toThrow(/1 job is already running/);
    e.cancel(first.id);
    expect(e.submit('quick', {}).state).toBe('PENDING');
  });

  it('refuses a job type it does not know', () => {
    const e = open(join(dir(), 'jobs.db'));
    expect(() => e.submit('nope', {})).toThrow(/unknown job type/);
  });
});
