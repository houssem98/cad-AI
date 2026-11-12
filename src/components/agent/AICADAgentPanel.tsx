/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Bot, Check, Cpu, Download, ExternalLink, Loader2, Mic, Minimize2, Paperclip, Image as ImageIcon, Send, X } from 'lucide-react';
import { CADModelParameters, OperationHistoryRecord } from '../../types/cad';

interface AICADAgentPanelProps {
  parameters?: CADModelParameters;
  onUpdateParameters?: (newParams: Partial<CADModelParameters>) => void;
  onAddOperation: (op: OperationHistoryRecord) => void;
  onClose?: () => void;
  onFocusCAD?: () => void;
  onOpenLiveVoice?: () => void;
  isOpen?: boolean;
  onToggleOpen?: () => void;
}

// L5 T5: every request goes to the server's agent; the panel shows only what its events carry: the model's plan, each
// operation and its execution record, a question, an approval, and a final report built from records.
type AgentEvent = { type: 'plan' | 'operation' | 'record' | 'question' | 'approval' | 'done'; data: any };
interface AgentRun { id: string; document: string; said: string[]; events: AgentEvent[]; decided: string[]; export?: { artifact?: string; error?: string } }

const EXAMPLE = 'Plate 100 mm by 60 mm by 5 mm.';
const finished = (r: AgentRun) => ['done', 'question'].includes(r.events.at(-1)?.type ?? '');
const time = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

export const AICADAgentPanel: React.FC<AICADAgentPanelProps> = ({ onAddOperation, onClose, onOpenLiveVoice, isOpen = true, onToggleOpen }) => {
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const scrollBottomRef = useRef<HTMLDivElement>(null);
  const streams = useRef<EventSource[]>([]);
  const busy = runs.some((r) => !finished(r));

  useEffect(() => { scrollBottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [runs]);
  useEffect(() => () => streams.current.forEach((s) => s.close()), []);

  const update = (id: string, f: (r: AgentRun) => AgentRun) => setRuns((prev) => prev.map((r) => (r.id === id ? f(r) : r)));

  const listen = (id: string) => {
    const source = new EventSource(`/api/requests/${id}/events`);
    streams.current.push(source);
    for (const type of ['plan', 'operation', 'record', 'question', 'approval', 'done'] as const) {
      source.addEventListener(type, (m) => {
        const data = JSON.parse((m as MessageEvent).data);
        update(id, (r) => ({ ...r, events: [...r.events, { type, data }] }));
        if (type === 'record') onAddOperation({ id: data.record, time: time(), action: data.type, status: data.status, details: data.error?.message ?? 'recorded', durationMs: 0 });
        if (type === 'done') source.close();
      });
    }
  };

  const post = async (url: string, body: object) => {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const json = res.status === 204 ? null : await res.json().catch(() => null);
    if (!res.ok) throw new Error(json?.error?.message ?? `the server answered ${res.status}`);
    return json;
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend ?? inputValue).trim();
    if (!text || busy) return;
    if (!textToSend) setInputValue('');
    setError(null);
    const last = runs.at(-1);
    try {
      if (last?.events.at(-1)?.type === 'question') {
        await post(`/api/requests/${last.id}/answer`, { answer: text });
        update(last.id, (r) => ({ ...r, said: [...r.said, text] }));
      } else {
        const { id, document } = await post('/api/requests', { text });
        setRuns((prev) => [...prev, { id, document, said: [text], events: [], decided: [] }]);
        listen(id);
      }
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const decide = async (run: AgentRun, operationId: string, approved: boolean) => {
    update(run.id, (r) => ({ ...r, decided: [...r.decided, operationId] }));
    await post(`/api/requests/${run.id}/approve`, { operationId, approved }).catch((e) => setError(e.message));
  };

  const exportStep = async (run: AgentRun) => {
    try {
      const { artifact } = await post(`/api/documents/${encodeURIComponent(run.document)}/export`, {});
      update(run.id, (r) => ({ ...r, export: { artifact } }));
    } catch (e) {
      update(run.id, (r) => ({ ...r, export: { error: (e as Error).message } }));
    }
  };

  if (!isOpen || isMinimized) {
    const handleExpand = onToggleOpen || (() => setIsMinimized(false));
    return (
      <div className="w-11 bg-[#0e0e0e] border-r border-[#232323] flex flex-col items-center py-2.5 justify-between select-none flex-shrink-0 z-20">
        <div className="flex flex-col items-center gap-3">
          <button onClick={handleExpand} className="p-1.5 text-steel-400 hover:text-white bg-steel-950/60 rounded border border-steel-700/50 transition-colors cursor-pointer" title="Expand AI CAD Agent">
            <Bot className="w-4 h-4 text-steel-400" />
          </button>
          <div className="w-5 h-[1px] bg-[#232323]" />
          {onOpenLiveVoice && (
            <button onClick={onOpenLiveVoice} className="p-1.5 text-steel-400 hover:text-white hover:bg-[#1a1a1a] rounded transition-colors cursor-pointer" title="Start Live Voice">
              <Mic className="w-4 h-4" />
            </button>
          )}
          <div className="writing-vertical text-[10px] font-tech text-neutral-500 uppercase tracking-widest pt-2">AI AGENT</div>
        </div>
      </div>
    );
  }

  const handleCollapse = onToggleOpen || (() => setIsMinimized(true));

  return (
    <div className="w-[310px] lg:w-[340px] h-full bg-[#0d0d0d] border-r border-[#232323] flex flex-col flex-shrink-0 select-none z-20 transition-all">
      <div className="flex flex-wrap items-center justify-between gap-y-1.5 px-3.5 py-2.5 border-b border-[#292929] bg-[#181818]">
        <div className="flex items-center gap-2">
          <span className="whitespace-nowrap font-semibold text-neutral-100 text-xs tracking-tight">AI CAD Agent</span>
          <span className="flex items-center gap-1 whitespace-nowrap px-2 py-0.5 text-[10px] font-tech font-semibold rounded bg-steel-950/80 text-steel-400 border border-steel-800/60" title="Model: deepseek-flash, thinking off">
            <Cpu className="w-3 h-3 text-steel-400" />
            <span>deepseek-flash</span>
          </span>
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-neutral-400">
          {onOpenLiveVoice && (
            <button onClick={onOpenLiveVoice} className="flex items-center gap-1 whitespace-nowrap px-2 py-1 rounded bg-steel-600/20 hover:bg-steel-600/30 text-steel-300 border border-steel-500/40 text-[10px] font-tech font-bold transition-all shadow-sm" title="Launch Live Voice conversation with gemini-3.8-live">
              <Mic className="w-3 h-3 text-steel-400" />
              <span>Live Voice</span>
            </button>
          )}
          <button onClick={handleCollapse} className="p-1 hover:text-neutral-200 hover:bg-neutral-800 rounded transition-colors cursor-pointer" title="Collapse Panel">
            <Minimize2 className="w-3.5 h-3.5" />
          </button>
          {onClose && (
            <button onClick={onClose} className="p-1 hover:text-neutral-200 hover:bg-neutral-800 rounded transition-colors" title="Close panel">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {!runs.length && (
          <p className="text-xs text-neutral-400 leading-relaxed">
            Describe one part with its dimensions and units. The agent proposes operations, the kernel builds and inspects each one, and every step is recorded.
          </p>
        )}
        {runs.map((run) => <RequestView key={run.id} run={run} onDecide={decide} onExport={exportStep} />)}
        {busy && (
          <div className="flex items-center gap-2 text-xs text-steel-400 bg-steel-950/30 border border-steel-800/40 px-3 py-2 rounded-lg">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-steel-400" />
            <span>Running…</span>
            <button
              onClick={() => { const run = runs.find((r) => !finished(r)); if (run) post(`/api/requests/${run.id}/cancel`, {}).catch((e) => setError(e.message)); }}
              className="ml-auto px-2 py-0.5 rounded border border-neutral-700 text-neutral-300 hover:text-white hover:bg-[#232323]"
            >
              Cancel
            </button>
          </div>
        )}
        {error && <div role="alert" className="text-xs text-red-400">{error}</div>}
        <div ref={scrollBottomRef} />
      </div>

      <div className="px-3 py-1.5 border-t border-[#232323] bg-[#111111] flex flex-wrap items-center gap-1.5 text-[11px] text-neutral-300">
        <button onClick={() => handleSendMessage(EXAMPLE)} disabled={busy} className="whitespace-nowrap px-2.5 py-1 bg-[#1b1b1b] hover:bg-[#282828] border border-[#333333] rounded-full text-neutral-300 hover:text-white transition-colors cursor-pointer">
          Plate 100 × 60 × 5 mm
        </button>
      </div>

      <div className="p-3 border-t border-[#292929] bg-[#171717]">
        <div className="relative bg-[#1c1c1c] border border-[#323232] rounded-xl focus-within:border-steel-500/80 transition-colors shadow-inner">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            aria-label="Message"
            placeholder="Describe a part, with units…"
            rows={2}
            className="w-full bg-transparent text-neutral-100 placeholder-neutral-500 text-xs px-3 py-2.5 resize-none focus:outline-none"
          />
          <div className="flex items-center justify-between px-2.5 pb-2 pt-0.5">
            <div className="flex items-center gap-1 text-neutral-400">
              <button type="button" className="p-1.5 hover:text-neutral-200 hover:bg-neutral-800 rounded transition-colors" disabled title="Attach CAD drawing, STEP or PDF (not available yet)">
                <Paperclip className="w-3.5 h-3.5" />
              </button>
              <button type="button" className="p-1.5 hover:text-neutral-200 hover:bg-neutral-800 rounded transition-colors" disabled title="Attach reference image or scan (not available yet)">
                <ImageIcon className="w-3.5 h-3.5" />
              </button>
            </div>
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputValue.trim() || busy}
              aria-label="Send"
              className={`p-2 rounded-lg transition-colors flex items-center justify-center cursor-pointer ${
                inputValue.trim() && !busy ? 'bg-steel-600 text-white hover:bg-steel-500 shadow-md ' : 'bg-neutral-800 text-neutral-600 cursor-not-allowed'
              }`}
              title="Send to the agent"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

function RequestView({ run, onDecide, onExport }: { run: AgentRun; onDecide: (r: AgentRun, op: string, ok: boolean) => void; onExport: (r: AgentRun) => void }) {
  const records = new Map(run.events.filter((e) => e.type === 'record').map((e) => [e.data.call, e.data]));
  const done = run.events.find((e) => e.type === 'done')?.data;
  return (
    <div data-testid="agent-request" className="space-y-2">
      {run.said.map((s, i) => (
        <div key={i} className="bg-[#232323] text-neutral-200 text-xs leading-relaxed px-3.5 py-2.5 rounded-2xl rounded-tr-sm border border-[#3a3a3a] whitespace-pre-line">{s}</div>
      ))}
      <div className="bg-[#1c1c1c] text-neutral-200 text-xs leading-relaxed px-3.5 py-2.5 rounded-2xl rounded-tl-sm border border-[#2f2f2f] space-y-1.5">
        {run.events.map((e, i) => {
          if (e.type === 'plan')
            return (
              <div key={i} data-testid="plan" className="text-neutral-300">
                {e.data.text && <p className="whitespace-pre-line"><span className="text-neutral-500">Model's plan, not a record: </span>{e.data.text}</p>}
                <p className="text-[11px] text-neutral-500 font-tech">Proposed: {e.data.calls.map((c: any) => c.name).join(', ')}</p>
              </div>
            );
          if (e.type === 'operation') {
            const r = records.get(e.data.call);
            return (
              <div key={i} data-testid={r ? 'record' : 'operation'} className="font-tech text-[11px]">
                <span className="text-neutral-300">{e.data.type}</span>{' · '}
                <span className={r ? (r.status === 'succeeded' ? 'text-emerald-400' : 'text-red-400') : 'text-steel-400'}>{r ? r.status : 'running'}</span>
                {r?.error?.message && <span className="text-red-400"> · {r.error.message}</span>}
                {r?.inspection?.valid && <span className="text-neutral-500"> · {+r.inspection.volume_mm3.toFixed(3)} mm3</span>}
              </div>
            );
          }
          if (e.type === 'approval') {
            const open = !run.decided.includes(e.data.operation);
            return (
              <div key={i} className="p-2 rounded-lg border border-steel-500/40 bg-[#1d1d1d] space-y-1.5">
                <p>Approve {e.data.type} {e.data.operation}? It changes the part.</p>
                {open && (
                  <div className="flex gap-2">
                    <button onClick={() => onDecide(run, e.data.operation, true)} className="flex items-center gap-1 px-2.5 py-1 bg-steel-600 hover:bg-steel-500 text-white rounded text-xs"><Check className="w-3 h-3" />Approve</button>
                    <button onClick={() => onDecide(run, e.data.operation, false)} className="flex items-center gap-1 px-2.5 py-1 bg-[#232323] border border-neutral-700 text-neutral-300 rounded text-xs"><X className="w-3 h-3" />Deny</button>
                  </div>
                )}
              </div>
            );
          }
          if (e.type === 'question') return <p key={i} className="text-steel-300">{e.data.question}</p>;
          return null;
        })}
        {done && (
          <div className="pt-1 space-y-1.5">
            <p data-testid="report" data-status={done.status} className={done.status === 'succeeded' ? 'text-neutral-100' : done.status === 'cancelled' ? 'text-neutral-400' : 'text-red-400'}>{done.report.text}</p>
            {done.status === 'succeeded' && (
              <div className="flex flex-wrap items-center gap-2">
                <a href={`/?part=${encodeURIComponent(done.document)}`} className="inline-flex items-center gap-1 px-2.5 py-1 bg-steel-600 hover:bg-steel-500 text-white rounded text-xs"><ExternalLink className="w-3 h-3" />Open part</a>
                {run.export?.artifact ? (
                  <a href={`/api/artifacts/${run.export.artifact}`} className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#252525] border border-steel-500/30 rounded text-xs text-steel-300"><Download className="w-3 h-3" />Download STEP</a>
                ) : (
                  <button onClick={() => onExport(run)} className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#252525] border border-steel-500/30 rounded text-xs text-steel-300"><Download className="w-3 h-3" />Export STEP</button>
                )}
                {run.export?.error && <span className="text-red-400 text-[11px]">{run.export.error}</span>}
              </div>
            )}
          </div>
        )}
        <details className="pt-1">
          <summary className="text-[11px] text-neutral-500 cursor-pointer">Trace</summary>
          <pre data-testid="trace" className="mt-1 max-h-48 overflow-auto text-[10px] text-neutral-400 whitespace-pre-wrap break-all">
            {run.events.map((e) => JSON.stringify({ type: e.type, data: e.data })).join('\n')}
          </pre>
        </details>
      </div>
    </div>
  );
}
