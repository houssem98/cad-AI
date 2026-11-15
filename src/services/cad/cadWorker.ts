import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';

const WORKER = fileURLToPath(new URL('../../../worker/main.py', import.meta.url));

export class WorkerError extends Error {
  constructor(public code: 'timeout' | 'cancelled' | 'worker_crashed', message: string) {
    super(message);
  }
}

// One request at a time over the stdio protocol; a timeout, a cancel or a crash restarts the process.
export class CadWorker {
  private proc!: ChildProcessWithoutNullStreams;
  private onLine: ((line: string) => void) | null = null;
  private onExit: (() => void) | null = null;
  private stderrTail = '';
  private alive = false;

  constructor(private args: string[] = []) {
    this.start();
  }

  private start() {
    const proc = spawn(process.env.CAD_PYTHON ?? 'python', [WORKER, ...this.args], { env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
    this.proc = proc;
    this.alive = true;
    this.stderrTail = '';
    proc.stdin.on('error', () => {}); // a write to a worker that has stopped surfaces as its exit
    proc.stderr.on('data', (d) => { if (proc === this.proc) this.stderrTail = (this.stderrTail + d).slice(-4096); });
    createInterface({ input: proc.stdout }).on('line', (line) => { if (proc === this.proc) this.onLine?.(line); });
    proc.on('exit', () => { if (proc === this.proc) { this.alive = false; this.onExit?.(); } });
    // A Python that cannot be started (council X3) is a crashed worker, not an unhandled error that stops the server.
    proc.on('error', (e) => { if (proc === this.proc) { this.stderrTail = `the kernel worker could not start: ${e.message}`; this.alive = false; this.onExit?.(); } });
  }

  restart() {
    this.onLine = this.onExit = null;
    this.kill();
    this.start();
  }

  close() {
    this.onLine = this.onExit = null;
    this.kill();
  }

  private kill() {
    if (this.proc.pid !== undefined) this.proc.kill(); // a process that never started has no pid, and killing it throws
  }

  request(msg: object, timeoutMs = 30_000, signal?: AbortSignal): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.alive) {
        const tail = this.stderrTail;
        this.start();
        return reject(new WorkerError('worker_crashed', `the worker had stopped: ${tail}`));
      }
      const end =() => { clearTimeout(timer); signal?.removeEventListener('abort', onAbort); this.onLine = this.onExit = null; };
      const stop = (code: WorkerError['code'], message: string) => { end(); this.restart(); reject(new WorkerError(code, message)); };
      const onAbort = () => stop('cancelled', 'cancelled by the user');
      const timer = setTimeout(() => stop('timeout', `no answer within ${Math.round(timeoutMs)} ms`), Math.max(0, timeoutMs));
      if (signal?.aborted) return onAbort();
      signal?.addEventListener('abort', onAbort, { once: true });
      this.onLine = (line) => {
        end();
        try { resolve(JSON.parse(line)); } catch { this.restart(); reject(new WorkerError('worker_crashed', `not a protocol line: ${line.slice(0, 200)}`)); }
      };
      this.onExit = () => { const tail = this.stderrTail; end(); this.start(); reject(new WorkerError('worker_crashed', tail)); };
      this.proc.stdin.write(JSON.stringify(msg) + '\n');
    });
  }
}
