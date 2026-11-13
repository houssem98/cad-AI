/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Clock, Download, XCircle } from 'lucide-react';

// L6 T4: the job engine's jobs (API_CONTRACTS §3), read from the store every second. Progress is the job's stage, never an estimate.
interface Job {
  id: string; type: string; input: any; state: string; result: any;
  error: { code: string; message: string } | null; createdAt: string;
}
const STAGES = ['PENDING', 'RUNNING', 'VERIFYING', 'COMPLETED'];
const LABEL: Record<string, string> = { CREATED: 'Queued', PENDING: 'Queued', RUNNING: 'Running', VERIFYING: 'Verifying', COMPLETED: 'Completed' };
const LIVE = ['CREATED', 'PENDING', 'RUNNING', 'VERIFYING'];
const TONE: Record<string, string> = {
  COMPLETED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  FAILED: 'bg-red-500/10 text-red-400 border-red-500/20',
  CANCELLED: 'bg-neutral-800 text-neutral-400 border-neutral-700',
};

const problem = async (r: Response) => (await r.json().catch(() => null))?.error?.message ?? `HTTP ${r.status}`;

export const BackgroundTasksView: React.FC = () => {
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [request, setRequest] = useState('');
  const [key, setKey] = useState(() => crypto.randomUUID()); // a repeated click on one request submits one job

  const load = async () => {
    try {
      const r = await fetch('/api/jobs');
      if (!r.ok) throw new Error(await problem(r));
      setJobs(await r.json());
      setLoadError(null);
    } catch (e) {
      setLoadError((e as Error).message);
    }
  };
  useEffect(() => {
    load();
    const t = setInterval(load, 1000);
    return () => clearInterval(t);
  }, []);

  const post = async (path: string, body: object = {}) => {
    const r = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    setActionError(r.ok ? null : await problem(r));
    await load();
    return r.ok;
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await post('/api/jobs', { type: 'text2cad', input: { request }, idempotencyKey: key })) {
      setRequest('');
      setKey(crypto.randomUUID());
    }
  };

  return (
    <div className="flex-1 h-full overflow-y-auto p-6 space-y-6 bg-[#0f0f0f] text-neutral-200">
      <div className="pb-3 border-b border-[#232323] space-y-1">
        <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-steel-400" />
          <span>Background Tasks</span>
        </h1>
        <p className="text-xs text-neutral-400">
          Each job runs in its own worker process and is kept across reloads. A job completes only with a STEP the kernel verified on re-import.
        </p>
      </div>

      <form onSubmit={submit} className="flex gap-2">
        <input
          value={request}
          onChange={(e) => setRequest(e.target.value)}
          aria-label="Text-to-CAD request"
          placeholder="Describe a part, with units…"
          className="flex-1 bg-[#1c1c1c] border border-[#323232] rounded-lg text-neutral-100 placeholder-neutral-500 text-xs px-3 py-2 focus:outline-none focus:border-steel-500/80"
        />
        <button
          type="submit"
          disabled={!request.trim()}
          className="px-3 py-2 rounded-lg text-xs font-medium bg-steel-600 text-white hover:bg-steel-500 disabled:bg-neutral-800 disabled:text-neutral-500"
        >
          Run in background
        </button>
      </form>

      {(loadError || actionError) && (
        <p role="alert" className="text-xs text-red-400">{actionError ?? `Could not read the jobs: ${loadError}`}</p>
      )}

      {jobs === null ? (
        !loadError && <p data-testid="jobs-loading" className="text-xs text-neutral-400">Loading jobs…</p>
      ) : jobs.length === 0 ? (
        <p data-testid="jobs-empty" className="text-xs text-neutral-400">No background jobs yet.</p>
      ) : (
        <ul className="space-y-3">
          {jobs.map((j) => {
            const at = STAGES.indexOf(j.state === 'CREATED' ? 'PENDING' : j.state) + 1;
            const what = j.input?.request ?? j.input?.path ?? '';
            return (
              <li key={j.id} data-testid="job" data-job-id={j.id} className="p-4 bg-[#181818] border border-[#292929] rounded-xl space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-neutral-100 truncate" title={what}>{what}</div>
                    <div className="text-[11px] text-neutral-500 font-tech">{j.type} · {new Date(j.createdAt).toLocaleTimeString()}</div>
                  </div>
                  <span data-testid="job-state" className={`px-2 py-0.5 rounded border text-[10px] font-tech font-bold ${TONE[j.state] ?? 'bg-steel-500/10 text-steel-400 border-steel-500/20'}`}>
                    {j.state}
                  </span>
                </div>

                {at > 0 ? (
                  <div role="progressbar" aria-label="Stage" aria-valuemin={1} aria-valuemax={STAGES.length} aria-valuenow={at} aria-valuetext={LABEL[j.state]} className="flex gap-1">
                    {STAGES.map((s, i) => (
                      <div key={s} className="flex-1 space-y-1">
                        <div className={`h-1.5 rounded-full ${i >= at ? 'bg-neutral-800' : j.state === 'COMPLETED' ? 'bg-emerald-500' : 'bg-steel-500'}`} />
                        <div className="text-[10px] font-tech text-neutral-500">{LABEL[s]}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={`text-xs ${j.state === 'FAILED' ? 'text-red-400' : 'text-neutral-400'}`}>
                    {j.error ? `${j.error.code}: ${j.error.message}` : 'Cancelled before it finished; it has no output.'}
                  </p>
                )}

                <div className="flex justify-end gap-2">
                  {LIVE.includes(j.state) && (
                    <button onClick={() => post(`/api/jobs/${j.id}/cancel`)} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-neutral-300 hover:text-white bg-[#232323] rounded border border-[#333]">
                      <XCircle className="w-3 h-3" />Cancel
                    </button>
                  )}
                  {j.state === 'COMPLETED' && j.result?.step && (
                    <a href={`/api/jobs/${j.id}/step`} download className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#252525] border border-steel-500/30 rounded text-xs text-steel-300">
                      <Download className="w-3 h-3" />Download STEP
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
