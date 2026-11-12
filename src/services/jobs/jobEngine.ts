import { spawn, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

// L6 T1, docs/cad-agent/architecture/AGENT_ORCHESTRATION.md "Job engine": durable jobs in SQLite, each run by its own worker
// process that heartbeats every 2 s. A watchdog, at start and every 5 s, fails a job whose worker is gone, silent for 10 s or
// past its maximum duration, so no job stays RUNNING. COMPLETED needs a verified result (P9). There is no automatic retry.
export type JobState = 'CREATED' | 'PENDING' | 'RUNNING' | 'VERIFYING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export interface Job {
  id: string; type: string; input: any; key: string | null; state: JobState; pid: number | null;
  result: any; error: { code: string; message: string } | null;
  createdAt: string; startedAt: string | null; heartbeatAt: string | null; finishedAt: string | null;
}
export interface JobOptions {
  dbPath: string;
  handlers: string; // the module whose `handlers` the worker runs, by job type
  types: string[];
  watchdogMs?: number;
  staleMs?: number;
  maxMs?: Record<string, number>; // maximum duration per job type; 10 minutes by default
}

const WORKER = fileURLToPath(new URL('./jobWorker.ts', import.meta.url));
const CAD_ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const LIVE: JobState[] = ['CREATED', 'PENDING', 'RUNNING', 'VERIFYING'];
const SCHEMA = `
CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY, type TEXT NOT NULL, input_json TEXT NOT NULL, idem_key TEXT UNIQUE,
  state TEXT NOT NULL, pid INTEGER, result_json TEXT, error_json TEXT, created_at TEXT NOT NULL, started_at TEXT, heartbeat_at TEXT, finished_at TEXT);
CREATE TABLE IF NOT EXISTS job_events (id INTEGER PRIMARY KEY AUTOINCREMENT, job_id TEXT NOT NULL, state TEXT NOT NULL, at TEXT NOT NULL, data_json TEXT);`;

export const iso = () => new Date().toISOString();
export function openJobDb(path: string) {
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;${SCHEMA}`);
  return db;
}

// A state change happens only from the given states and is logged; that guard keeps a cancelled or failed job from being overwritten.
export function move(db: DatabaseSync, id: string, to: JobState, from: JobState[], set: Record<string, string | number | null> = {}) {
  const cols = Object.keys(set);
  const r = db.prepare(`UPDATE jobs SET state = ?${cols.map((c) => `, ${c} = ?`).join('')} WHERE id = ? AND state IN (${from.map(() => '?').join(', ')})`)
    .run(to, ...cols.map((c) => set[c]), id, ...from);
  if (r.changes) db.prepare('INSERT INTO job_events (job_id, state, at, data_json) VALUES (?, ?, ?, ?)').run(id, to, iso(), set.error_json ?? set.result_json ?? null);
  return r.changes > 0;
}

const alive = (pid: number | null) => { if (!pid) return false; try { process.kill(pid, 0); return true; } catch { return false; } };
// The whole tree: a job's worker starts its own kernel process, which must not outlive it.
const stop = (pid: number | null) => {
  if (!pid) return;
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
  else try { process.kill(pid); } catch { /* already gone */ }
};
const row = (r: any): Job => ({
  id: r.id, type: r.type, input: JSON.parse(r.input_json), key: r.idem_key, state: r.state, pid: r.pid,
  result: r.result_json ? JSON.parse(r.result_json) : null, error: r.error_json ? JSON.parse(r.error_json) : null,
  createdAt: r.created_at, startedAt: r.started_at, heartbeatAt: r.heartbeat_at, finishedAt: r.finished_at,
});

export class JobEngine {
  private timer?: ReturnType<typeof setInterval>;
  private constructor(private db: DatabaseSync, private o: JobOptions) {}

  static open(o: JobOptions) {
    const e = new JobEngine(openJobDb(o.dbPath), o);
    e.watchdog();
    e.timer = setInterval(() => e.watchdog(), o.watchdogMs ?? 5_000);
    return e;
  }

  submit(type: string, input: unknown, key?: string): Job {
    if (!this.o.types.includes(type)) throw new Error(`unknown job type ${type}`);
    if (key) {
      const old = this.db.prepare('SELECT id FROM jobs WHERE idem_key = ?').get(key) as { id: string } | undefined;
      if (old) return this.get(old.id)!; // a duplicate submission returns the job it repeats
    }
    const id = randomUUID();
    this.db.prepare('INSERT INTO jobs (id, type, input_json, idem_key, state, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, type, JSON.stringify(input ?? null), key ?? null, 'CREATED', iso());
    this.db.prepare('INSERT INTO job_events (job_id, state, at, data_json) VALUES (?, ?, ?, NULL)').run(id, 'CREATED', iso());
    const child = spawn(process.execPath, ['--import', 'tsx', WORKER, this.o.dbPath, id, this.o.handlers], { cwd: CAD_ROOT, stdio: 'ignore', windowsHide: true });
    child.unref(); // a worker outlives a server restart; the watchdog decides what happens to its job
    move(this.db, id, 'PENDING', ['CREATED'], { pid: child.pid ?? null });
    return this.get(id)!;
  }

  get(id: string): Job | undefined {
    const r = this.db.prepare('SELECT * FROM jobs WHERE id = ?').get(id);
    return r ? row(r) : undefined;
  }

  list(): Job[] {
    return this.db.prepare('SELECT * FROM jobs ORDER BY created_at DESC').all().map(row);
  }

  events(id: string): { state: JobState; at: string; data: any }[] {
    return (this.db.prepare('SELECT state, at, data_json FROM job_events WHERE job_id = ? ORDER BY id').all(id) as any[])
      .map((e) => ({ state: e.state, at: e.at, data: e.data_json ? JSON.parse(e.data_json) : null }));
  }

  cancel(id: string): Job | undefined {
    const job = this.get(id);
    if (job && move(this.db, id, 'CANCELLED', LIVE, { finished_at: iso() })) stop(job.pid);
    return this.get(id);
  }

  close(stopWorkers = false) {
    if (!this.db.isOpen) return;
    clearInterval(this.timer);
    if (stopWorkers) for (const j of this.list()) if (LIVE.includes(j.state)) stop(j.pid);
    this.db.close();
  }

  private watchdog() {
    const now = Date.now(), stale = this.o.staleMs ?? 10_000;
    for (const j of this.list().filter((j) => LIVE.includes(j.state))) {
      const fail = (code: string, message: string) => {
        if (move(this.db, j.id, 'FAILED', LIVE, { finished_at: iso(), error_json: JSON.stringify({ code, message }) })) stop(j.pid);
      };
      const max = this.o.maxMs?.[j.type] ?? 600_000;
      if (j.startedAt && now - Date.parse(j.startedAt) > max) fail('timeout', `the job ran longer than its maximum of ${max} ms`);
      else if (!alive(j.pid)) { if (j.state !== 'CREATED' || now - Date.parse(j.createdAt) > stale) fail('worker_crashed', 'the worker process is gone'); }
      else if (j.heartbeatAt && now - Date.parse(j.heartbeatAt) > stale) fail('worker_crashed', `no heartbeat for ${stale} ms: the worker hung`);
    }
  }
}
