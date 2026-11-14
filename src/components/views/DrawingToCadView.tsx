/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { FileInput, Play } from 'lucide-react';

type Result =
  | { kind: 'part'; report: { text: string } }
  | { kind: 'asks'; question: string }
  | { kind: 'unsupported'; message: string }
  | { kind: 'failed' | 'cancelled'; message: string };

const LINE: Record<Result['kind'], string> = { part: 'text-emerald-300', asks: 'text-amber-300', unsupported: 'text-neutral-300', failed: 'text-red-300', cancelled: 'text-neutral-300' };

// L7 T10: a drawing goes to the server's drawing2cad; the part stands only when the kernel measures the drawing's own numbers.
export const DrawingToCadView: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [document, setDocument] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pick = (f: File | undefined) => {
    setFile(f ?? null);
    setResult(null);
    setError(null);
    if (f) setDocument(`${f.name.replace(/\.[^.]*$/, '').replace(/[^A-Za-z0-9_-]/g, '-')}-${Date.now().toString(36)}`);
  };

  const build = async () => {
    if (!file) return;
    setRunning(true);
    setResult(null);
    setError(null);
    try {
      let bin = '';
      for (const b of new Uint8Array(await file.arrayBuffer())) bin += String.fromCharCode(b);
      const r = await fetch('/api/drawings/read', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: file.name, base64: btoa(bin), document }) });
      const body = await r.json().catch(() => null);
      if (!r.ok) throw new Error(body?.error?.message ?? `HTTP ${r.status}`);
      setResult(body);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRunning(false);
    }
  };

  const text = (r: Result) => (r.kind === 'part' ? `Built and verified: ${r.report.text}` : r.kind === 'asks' ? `Question: ${r.question}`
    : r.kind === 'unsupported' ? `Unsupported: ${r.message}` : `Failed: ${r.message}`);

  return (
    <div className="flex-1 h-full overflow-y-auto p-6 space-y-6 bg-graphite-0f text-neutral-200">
      <div className="pb-3 border-b border-graphite-23">
        <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <FileInput className="w-5 h-5 text-steel-400" />
          <span>Drawing to CAD</span>
        </h1>
        <p className="text-xs text-neutral-400 mt-1">
          Upload a DXF drawing of a rectangular plate with through holes, in this app's drawing format. The agent builds it, and the
          part stands only when the kernel measures the drawing's own numbers. Other drawings, PDFs and images are refused as unsupported.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs text-neutral-400 flex flex-col gap-1">
          Drawing file
          <input type="file" accept=".dxf,.svg,.pdf,.png,.jpg,.jpeg" onChange={(e) => pick(e.target.files?.[0])}
            className="text-xs text-neutral-300 file:mr-2 file:px-2 file:py-1 file:rounded file:border-0 file:bg-steel-600 file:text-white" />
        </label>
        <label className="text-xs text-neutral-400 flex flex-col gap-1">
          Document
          <input type="text" value={document} onChange={(e) => setDocument(e.target.value)}
            className="w-52 px-2 py-1 rounded bg-graphite-13 border border-graphite-31 text-neutral-100 font-tech" />
        </label>
        <button onClick={build} disabled={!file || running} aria-label="Build from drawing"
          className="flex items-center gap-2 px-4 py-2 bg-steel-600 hover:bg-steel-500 disabled:opacity-60 text-white rounded-lg text-xs font-semibold">
          <Play className="w-3.5 h-3.5" />
          <span>{running ? 'Building…' : 'Build from drawing'}</span>
        </button>
      </div>

      {error && <p role="alert" className="text-xs text-red-400">The drawing could not be sent: {error}</p>}
      {running && <p className="text-xs text-neutral-400">The agent is building the part and the kernel is checking it against the drawing…</p>}
      {result && (
        <p data-testid="drawing-result" data-kind={result.kind} className={`p-3 rounded-lg border border-graphite-29 bg-graphite-18 text-xs ${LINE[result.kind]}`}>
          {text(result)}
        </p>
      )}
    </div>
  );
};
