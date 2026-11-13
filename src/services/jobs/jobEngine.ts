import { execFile, spawn, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { CadStore } from '../cad/cadStore';

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
  startMs?: number; // a worker that has not started its job after this long is hung; 60 s by default
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
// The change and its event commit together, so no reader sees a state its events do not show.
export function move(db: DatabaseSync, id: string, to: JobState, from: JobState[], set: Record<string, string | number | null> = {}) {
  const cols = Object.keys(set);
  db.exec('BEGIN IMMEDIATE');
  try {
    const r = db.prepare(`UPDATE jobs SET state = ?${cols.map((c) => `, ${c} = ?`).join('')} WHERE id = ? AND state IN (${from.map(() => '?').join(', ')})`)
      .run(to, ...cols.map((c) => set[c]), id, ...from);
    if (r.changes) db.prepare('INSERT INTO job_events (job_id, state, at, data_json) VALUES (?, ?, ?, ?)').run(id, to, iso(), set.error_json ?? set.result_json ?? null);
    db.exec('COMMIT');
    return r.changes > 0;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

const alive = (pid: number | null) => { if (!pid) return false; try { process.kill(pid, 0); return true; } catch { return false; } };
// The whole tree: a job's worker starts its own kernel process, which must not outlive it. Off Windows the worker leads its own
// process group (council C17).
const stop = (pid: number | null) => {
  if (!pid) return;
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
  else try { process.kill(-pid, 'SIGKILL'); } catch { /* already gone */ }
};
// Whether a stored pid still runs this job's worker: its command line names the job. After a reboot or a long outage the system
// may have given the pid to another program, which must never be killed (council C3). Any doubt answers no.
const runs = (pid: number, id: string) => new Promise<boolean>((resolve) => {
  const [cmd, args] = process.platform === 'win32'
    ? ['powershell', ['-NoProfile', '-Command', `(Get-CimInstance Win32_Process -Filter "ProcessId=${pid}").CommandLine`]]
    : ['ps', ['-o', 'args=', '-p', String(pid)]];
  execFile(cmd, args, { windowsHide: true }, (_e, out) => resolve(String(out ?? '').includes('jobWorker') && String(out).includes(id)));
});
// A stopped worker leaves the operation it was running unfinished in the job's own store. Its record is closed with the job's
// ending; the document keeps its stored revision, since the change never committed (council C5).
const closeOut = (dir: string, code: string, message: string) => {
  if (!existsSync(join(dir, 'cad.db'))) return;
  const store = new CadStore(join(dir, 'cad.db'));
  try {
    for (const op of store.unfinished()) {
      const now = iso(), rev = store.document(op.docId)?.revision ?? 0, status = code === 'cancelled' ? 'cancelled' : 'failed';
      store.commit(op, status, { revisionBefore: rev, revisionAfter: rev, command: null, result: { status, result: null, started: now, ended: now },
        validation: {}, approval: { required: false, decision: null }, error: { code, message }, artifacts: [], started: now, ended: now });
    }
  } finally {
    store.close();
  }
};
const row = (r: any): Job => ({
  id: r.id, type: r.type, input: JSON.parse(r.input_json), key: r.idem_key, state: r.state, pid: r.pid,
  result: r.result_json ? JSON.parse(r.result_json) : null, error: r.error_json ? JSON.parse(r.error_json) : null,
  createdAt: r.created_at, startedAt: r.started_at, heartbeatAt: r.heartbeat_at, finishedAt: r.finished_at,
});

export class JobEngine {
  private timer?: ReturnType<typeof setInterval>;
  private ours = new Map<string, boolean>(); // job id → whether its stored pid is its worker; known for workers spawned here
  private asking = new Set<string>();
  private constructor(private db: DatabaseSync, private o: JobOptions) {}
  private dir = (id: string) => join(dirname(this.o.dbPath), 'jobs', id);

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
    mkdirSync(this.dir(id), { recursive: true });
    const log = openSync(join(this.dir(id), 'worker.log'), 'a'); // what a crashing worker prints is kept (council C22)
    const child = spawn(process.execPath, ['--import', 'tsx', WORKER, this.o.dbPath, id, this.o.handlers],
      { cwd: CAD_ROOT, stdio: ['ignore', log, log], windowsHide: true, detached: process.platform !== 'win32' });
    closeSync(log);
    child.unref(); // a worker outlives a server restart; the watchdog decides what happens to its job
    this.ours.set(id, true);
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
    if (job && move(this.db, id, 'CANCELLED', LIVE, { finished_at: iso() })) this.kill(job, 'cancelled', 'the job was cancelled while this operation ran');
    return this.get(id);
  }

  close(stopWorkers = false) {
    if (!this.db.isOpen) return;
    clearInterval(this.timer);
    if (stopWorkers) for (const j of this.list()) if (LIVE.includes(j.state) && this.ours.get(j.id)) stop(j.pid);
    this.db.close();
  }

  // Stops the job's worker when it is provably the job's, then closes the records it left open.
  private kill(j: Job, code: string, message: string) {
    const after = () => { try { closeOut(this.dir(j.id), code, message); } catch (e) { console.error('job close-out', j.id, e); } };
    if (this.ours.get(j.id)) { stop(j.pid); after(); }
    else if (!this.ours.has(j.id) && alive(j.pid)) runs(j.pid!, j.id).then((mine) => { if (mine) stop(j.pid); after(); });
    else after();
  }

  // A pid not known to be the job's worker is asked about once, off the watchdog's path; the job is decided on the next pass.
  private ask(j: Job) {
    if (this.asking.has(j.id)) return;
    this.asking.add(j.id);
    runs(j.pid!, j.id).then((mine) => {
      this.ours.set(j.id, mine);
      this.asking.delete(j.id);
      if (this.db.isOpen) this.watchdog();
    });
  }

  private watchdog() {
    const now = Date.now(), stale = this.o.staleMs ?? 10_000, start = this.o.startMs ?? 60_000;
    for (const j of this.list().filter((j) => LIVE.includes(j.state))) {
      const fail = (code: string, message: string) => {
        if (move(this.db, j.id, 'FAILED', LIVE, { finished_at: iso(), error_json: JSON.stringify({ code, message }) })) this.kill(j, code, message);
      };
      const max = this.o.maxMs?.[j.type] ?? 600_000;
      if (!alive(j.pid)) {
        if (j.state !== 'CREATED' || now - Date.parse(j.createdAt) > stale) {
          let said = '';
          try { said = readFileSync(join(this.dir(j.id), 'worker.log'), 'utf8').trim().slice(-500); } catch { /* no log */ }
          fail('worker_crashed', `the worker process is gone${said ? `; it printed: ${said}` : ''}`);
        }
        continue;
      }
      const overdue = j.startedAt && now - Date.parse(j.startedAt) > max;
      const silent = j.heartbeatAt ? now - Date.parse(j.heartbeatAt) > stale : now - Date.parse(j.createdAt) > start;
      if (!overdue && !silent) continue;
      if (!this.ours.has(j.id)) this.ask(j);
      else if (!this.ours.get(j.id)) fail('worker_crashed', 'the worker process is gone; its pid now runs another program');
      else if (overdue) fail('timeout', `the job ran longer than its maximum of ${max} ms`);
      else fail('worker_crashed', j.heartbeatAt ? `no heartbeat for ${stale} ms: the worker hung` : `the worker did not start the job within ${start} ms`);
    }
  }
}
