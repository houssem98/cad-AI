/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { BookOpen, Search } from 'lucide-react';

interface Source { source: string; chunks: number }
interface Answer { text: string; citations: string[] }

async function json(r: Response) {
  const body = await r.json().catch(() => null);
  if (!r.ok) throw new Error(body?.error?.message ?? `HTTP ${r.status}`);
  return body;
}

// L7 T9: local documents searched by keyword. An answer is quoted text from the stored documents with the chunk it came from;
// nothing here can run an operation.
export const KnowledgeHubView: React.FC = () => {
  const [sources, setSources] = useState<Source[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [askError, setAskError] = useState<string | null>(null);

  const load = () => fetch('/api/knowledge').then(json).then(setSources).catch((e: Error) => setLoadError(e.message));
  useEffect(() => { load(); }, []);

  const add = async (file: File | undefined) => {
    if (!file) return;
    setAddError(null);
    try {
      await json(await fetch('/api/knowledge', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ source: file.name, text: await file.text() }) }));
      await load();
    } catch (e) {
      setAddError((e as Error).message);
    }
  };

  const ask = async () => {
    setAsking(true);
    setAnswer(null);
    setAskError(null);
    try {
      setAnswer(await json(await fetch('/api/knowledge/ask', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question }) })));
    } catch (e) {
      setAskError((e as Error).message);
    } finally {
      setAsking(false);
    }
  };

  return (
    <div className="flex-1 h-full overflow-y-auto p-6 space-y-6 bg-graphite-0f text-neutral-200">
      <div className="pb-3 border-b border-graphite-23">
        <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-steel-400" />
          <span>Knowledge Hub</span>
        </h1>
        <p className="text-xs text-neutral-400 mt-1">
          Your local documents, searched by keyword. Answers quote the stored text and cite the passage they came from.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[18rem_1fr] gap-4">
        <section className="space-y-3">
          <label className="block text-xs text-neutral-400">
            Add a local document
            <input type="file" accept=".txt,.md,text/plain,text/markdown" onChange={(e) => { add(e.target.files?.[0]); e.target.value = ''; }}
              className="mt-1 block w-full text-xs text-neutral-300 file:mr-2 file:px-2 file:py-1 file:rounded file:border-0 file:bg-steel-600 file:text-white" />
          </label>
          {addError && <p role="alert" className="text-xs text-red-400">Could not add the document: {addError}</p>}
          {loadError ? (
            <p data-testid="sources-error" role="alert" className="text-xs text-red-400">Could not load the library: {loadError}</p>
          ) : sources === null ? (
            <p data-testid="sources-loading" className="text-xs text-neutral-400">Loading the library…</p>
          ) : sources.length === 0 ? (
            <p data-testid="sources-empty" className="text-xs text-neutral-400">No documents yet. Add a text or Markdown file to search it.</p>
          ) : (
            <ul className="space-y-1.5">
              {sources.map((s) => (
                <li key={s.source} data-testid="source" className="px-3 py-2 rounded-lg border border-graphite-29 bg-graphite-18 text-xs flex justify-between gap-2">
                  <span className="font-tech text-neutral-100 truncate">{s.source}</span>
                  <span className="text-neutral-400 shrink-0">{s.chunks} chunks</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex gap-2">
            <label className="flex-1 text-xs text-neutral-400">
              Question
              <input type="text" value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && question.trim()) ask(); }}
                className="mt-1 w-full px-2 py-1.5 rounded bg-graphite-13 border border-graphite-31 text-neutral-100" />
            </label>
            <button onClick={ask} disabled={asking || !question.trim()} aria-label="Ask"
              className="self-end flex items-center gap-1.5 px-4 py-2 bg-steel-600 hover:bg-steel-500 disabled:opacity-60 text-white rounded-lg text-xs font-semibold">
              <Search className="w-3.5 h-3.5" />
              <span>{asking ? 'Searching…' : 'Ask'}</span>
            </button>
          </div>
          {askError && <p role="alert" className="text-xs text-red-400">The search failed: {askError}</p>}
          {answer && (
            <div className="space-y-2">
              <pre data-testid="answer" className="whitespace-pre-wrap p-3 rounded-lg border border-graphite-29 bg-graphite-13 text-xs text-neutral-200 font-tech">{answer.text}</pre>
              {answer.citations.length > 0 && (
                <p className="text-xs text-neutral-400">
                  Sources: {answer.citations.map((c) => <span key={c} data-testid="citation" className="mr-2 font-tech text-steel-300">{c}</span>)}
                </p>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
