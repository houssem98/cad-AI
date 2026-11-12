import { pathToFileURL } from 'node:url';
import { iso, move, openJobDb } from './jobEngine';

// One job, in its own process: node --import tsx jobWorker.ts <db> <job id> <handlers module>. It heartbeats every 2 s and
// reports through guarded state changes, so it cannot overwrite a job the server already cancelled or failed.
const [dbPath, id, handlersPath] = process.argv.slice(2);
const db = openJobDb(dbPath);
const job = db.prepare('SELECT type, input_json FROM jobs WHERE id = ?').get(id) as { type: string; input_json: string } | undefined;
if (!job || !move(db, id, 'RUNNING', ['PENDING'], { pid: process.pid, started_at: iso(), heartbeat_at: iso() })) process.exit(0);

const beat = setInterval(() => db.prepare("UPDATE jobs SET heartbeat_at = ? WHERE id = ? AND state IN ('RUNNING', 'VERIFYING')").run(iso(), id), 2_000);
try {
  const { handlers } = await import(pathToFileURL(handlersPath).href);
  const out = await handlers[job.type](JSON.parse(job.input_json));
  move(db, id, 'VERIFYING', ['RUNNING']);
  if (out?.verified) move(db, id, 'COMPLETED', ['VERIFYING'], { finished_at: iso(), result_json: JSON.stringify(out.result ?? null) });
  else move(db, id, 'FAILED', ['VERIFYING'], { finished_at: iso(), result_json: JSON.stringify(out?.result ?? null),
    error_json: JSON.stringify({ code: 'verification_failed', message: 'the job finished, but its output did not pass verification' }) });
} catch (e) {
  move(db, id, 'FAILED', ['RUNNING', 'VERIFYING'], { finished_at: iso(), error_json: JSON.stringify({ code: 'job_error', message: String((e as Error)?.message ?? e) }) });
}
clearInterval(beat);
db.close();
process.exit(0);
