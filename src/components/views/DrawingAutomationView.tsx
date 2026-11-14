/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { FileSpreadsheet } from 'lucide-react';

// L7 T10: the kernel's drawing of a document (three orthographic views and an isometric, dimensioned from its own inspection),
// shown as SVG and downloadable as SVG, DXF and PDF.
export const DrawingAutomationView: React.FC = () => {
  const [document, setDocument] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [shown, setShown] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const make = async () => {
    setLoading(true);
    setError(null);
    setPreview(null);
    try {
      const r = await fetch(`/api/documents/${encodeURIComponent(document)}/drawing.svg`);
      if (!r.ok) {
        const body = await r.json().catch(() => null);
        throw new Error(body?.error?.message ?? `HTTP ${r.status}`);
      }
      setPreview(URL.createObjectURL(await r.blob()));
      setShown(document);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const link = (fmt: string) => `/api/documents/${encodeURIComponent(shown ?? '')}/drawing.${fmt}`;

  return (
    <div className="flex-1 h-full overflow-y-auto p-6 space-y-6 bg-graphite-0f text-neutral-200">
      <div className="pb-3 border-b border-graphite-23">
        <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-steel-400" />
          <span>Drawing Automation</span>
        </h1>
        <p className="text-xs text-neutral-400 mt-1">
          Three orthographic views and an isometric of a document's part, from the kernel's hidden-line removal, dimensioned with the
          kernel's own measurements: overall size and the diameter of each hole along Z.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs text-neutral-400 flex flex-col gap-1">
          Document
          <input type="text" value={document} onChange={(e) => setDocument(e.target.value)}
            className="w-52 px-2 py-1 rounded bg-graphite-13 border border-graphite-31 text-neutral-100 font-tech" />
        </label>
        <button onClick={make} disabled={!document.trim() || loading} aria-label="Make drawing"
          className="px-4 py-2 bg-steel-600 hover:bg-steel-500 disabled:opacity-60 text-white rounded-lg text-xs font-semibold">
          {loading ? 'Drawing…' : 'Make drawing'}
        </button>
      </div>

      {error && <p role="alert" className="text-xs text-red-400">No drawing: {error}</p>}
      {preview && shown && (
        <div className="space-y-3">
          <div className="flex gap-3 text-xs">
            {['svg', 'dxf', 'pdf'].map((fmt) => (
              <a key={fmt} href={link(fmt)} download={`${shown}.${fmt}`} className="px-3 py-1.5 rounded border border-graphite-31 text-steel-300 hover:bg-graphite-1d">
                Download {fmt.toUpperCase()}
              </a>
            ))}
          </div>
          <img data-testid="drawing-preview" src={preview} alt={`Drawing of ${shown}`} className="w-full max-w-4xl bg-white rounded-lg p-4" />
        </div>
      )}
    </div>
  );
};
