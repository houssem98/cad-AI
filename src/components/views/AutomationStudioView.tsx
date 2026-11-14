/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Play, Workflow } from 'lucide-react';

interface Param { name: string; unit: string; default?: number }
interface SavedWorkflow { id: string; name: string; version: number; params: Param[]; steps: { id: string; type: string }[]; error?: string }
interface StepResult { id: string; type: string; status: string; error: string | null }
interface Run { status: string; error: string | null; document: string; steps: StepResult[] }

const BADGE: Record<string, string> = {
  succeeded: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10',
  failed: 'text-red-400 border-red-500/40 bg-red-500/10',
  cancelled: 'text-amber-400 border-amber-500/40 bg-amber-500/10',
};

async function json(r: Response) {
  const body = await r.json().catch(() => null);
  if (!r.ok) throw new Error(body?.error?.message ?? `HTTP ${r.status}`);
  return body;
}

// L7 T8: saved workflows (typed operation sequences) replayed through the server's executor. Each step shows the status of its
// execution record, never a claim of its own.
export const AutomationStudioView: React.FC = () => {
  const [list, setList] = useState<SavedWorkflow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [args, setArgs] = useState<Record<string, string>>({});
  const [document, setDocument] = useState('');
  const [running, setRunning] = useState(false);
  const [run, setRun] = useState<Run | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  const choose = (w: SavedWorkflow) => {
    setSelected(w.id);
    setArgs(Object.fromEntries(w.params.map((p) => [p.name, p.default === undefined ? '' : String(p.default)])));
    setDocument(`${w.id}-${Date.now().toString(36)}`);
    setRun(null);
    setRunError(null);
  };

  useEffect(() => {
    fetch('/api/workflows').then(json)
      .then((ws: SavedWorkflow[]) => { setList(ws); const first = ws.find((w) => !w.error); if (first) choose(first); })
      .catch((e: Error) => setLoadError(e.message));
  }, []);

  const wf = list?.find((w) => w.id === selected);

  const start = async () => {
    if (!wf) return;
    setRunning(true);
    setRun(null);
    setRunError(null);
    try {
      const values = Object.fromEntries(Object.entries(args).filter(([, v]) => v.trim() !== '').map(([k, v]) => [k, Number(v)]));
      setRun(await json(await fetch(`/api/workflows/${encodeURIComponent(wf.id)}/replay`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ args: values, document }),
      })));
    } catch (e) {
      setRunError((e as Error).message);
    } finally {
      setRunning(false);
    }
  };

  const steps: StepResult[] = run?.steps ?? wf?.steps.map((s) => ({ id: s.id, type: s.type, status: 'not run', error: null })) ?? [];

  return (
    <div className="flex-1 h-full overflow-y-auto p-6 space-y-6 bg-graphite-0f text-neutral-200">
      <div className="pb-3 border-b border-graphite-23">
        <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <Workflow className="w-5 h-5 text-steel-400" />
          <span>Automation Studio</span>
        </h1>
        <p className="text-xs text-neutral-400 mt-1">
          Saved workflows are typed operation sequences replayed through the CAD kernel. Each step shows its execution record's status.
        </p>
      </div>

      {loadError ? (
        <p data-testid="workflows-error" role="alert" className="text-xs text-red-400">Could not load workflows: {loadError}</p>
      ) : list === null ? (
        <p data-testid="workflows-loading" className="text-xs text-neutral-400">Loading workflows…</p>
      ) : list.length === 0 ? (
        <p data-testid="workflows-empty" className="text-xs text-neutral-400">No saved workflows yet. A workflow is saved through POST /api/workflows.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[16rem_1fr] gap-4">
          <ul className="space-y-2">
            {list.map((w) => (
              <li key={w.id}>
                {w.error ? (
                  <p data-testid="workflow-unreadable" className="p-3 rounded-lg border border-red-500/40 bg-graphite-18 text-xs text-red-300">
                    <span className="block font-tech">{w.id}</span>
                    <span className="block">Unreadable: {w.error}</span>
                  </p>
                ) : (
                <button data-testid="workflow" onClick={() => choose(w)} aria-pressed={w.id === selected}
                  className={`w-full text-left p-3 rounded-lg border text-xs ${w.id === selected ? 'border-steel-400 bg-graphite-1d' : 'border-graphite-29 bg-graphite-18'}`}>
                  <span className="block font-semibold text-neutral-100">{w.name}</span>
                  <span className="block font-tech text-neutral-400">{w.id} · version {w.version} · {w.steps.length} steps</span>
                </button>
                )}
              </li>
            ))}
          </ul>

          {wf && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-end gap-3">
                {wf.params.map((p) => (
                  <label key={p.name} className="text-xs text-neutral-400 flex flex-col gap-1">
                    {p.name} ({p.unit})
                    <input type="number" value={args[p.name] ?? ''} onChange={(e) => setArgs({ ...args, [p.name]: e.target.value })}
                      className="w-28 px-2 py-1 rounded bg-graphite-13 border border-graphite-31 text-neutral-100 font-tech" />
                  </label>
                ))}
                <label className="text-xs text-neutral-400 flex flex-col gap-1">
                  Document
                  <input type="text" value={document} onChange={(e) => setDocument(e.target.value)}
                    className="w-44 px-2 py-1 rounded bg-graphite-13 border border-graphite-31 text-neutral-100 font-tech" />
                </label>
                <button onClick={start} disabled={running} aria-label="Run workflow"
                  className="flex items-center gap-2 px-4 py-2 bg-steel-600 hover:bg-steel-500 disabled:opacity-60 text-white rounded-lg text-xs font-semibold">
                  <Play className="w-3.5 h-3.5" />
                  <span>{running ? 'Running…' : 'Run workflow'}</span>
                </button>
              </div>

              {runError && <p role="alert" className="text-xs text-red-400">The run could not start: {runError}</p>}
              {run && (
                <p data-testid="run-status" className="text-xs text-neutral-300">
                  Run on {run.document}: {run.status}{run.error ? ` (${run.error})` : ''}
                </p>
              )}

              <ol className="space-y-2">
                {steps.map((s, i) => (
                  <li key={s.id} data-testid="workflow-step" className="p-3 rounded-lg border border-graphite-29 bg-graphite-18 text-xs">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-tech text-neutral-200">{i + 1}. {s.type} <span className="text-neutral-400">({s.id})</span></span>
                      <span data-testid="step-status" className={`px-2 py-0.5 rounded border font-tech ${BADGE[s.status] ?? 'text-neutral-400 border-graphite-3e'}`}>{s.status}</span>
                    </div>
                    {s.error && <p className="mt-1.5 text-red-300 font-tech">{s.error}</p>}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
