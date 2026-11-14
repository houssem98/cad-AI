import { createHash } from 'node:crypto';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Local documents searched by keyword (BM25). An answer quotes stored text with its source and nothing else. This module holds
// no executor, tool loop or model client, so nothing a document says can start an operation.
export interface Chunk { id: string; source: string; lines: [number, number]; text: string }
export interface Hit extends Chunk { score: number }
export interface Answer { text: string; citations: string[] }

const MAX_CHARS = 800;
const STOP = new Set('the and or of to in on for is are be by with as at it this that from how what do does can an'.split(' '));
const words = (s: string) => (s.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((w) => w.length > 1 && !STOP.has(w));

// Paragraphs (split at blank lines, and at MAX_CHARS), each with its 1-based line range in the source.
export function chunk(source: string, text: string): Chunk[] {
  const out: Chunk[] = [];
  let start = -1, buf: string[] = [];
  const flush = (end: number) => {
    if (buf.length) out.push({ id: `${source}#${out.length}`, source, lines: [start + 1, end], text: buf.join('\n') });
    buf = [];
    start = -1;
  };
  const lines = text.split(/\r?\n/);
  lines.forEach((line, i) => {
    if (!line.trim()) return flush(i);
    if (start < 0) start = i;
    buf.push(line);
    if (buf.join('\n').length >= MAX_CHARS) flush(i + 1);
  });
  flush(lines.length);
  return out;
}

export class KnowledgeBase {
  constructor(private dir: string) {
    mkdirSync(dir, { recursive: true });
  }

  // Ingesting a source again replaces its chunks.
  ingest(source: string, text: string): Chunk[] {
    if (!/^[A-Za-z0-9_-][A-Za-z0-9._-]*$/.test(source)) throw new Error(`source ${source}: letters, digits, ., - and _ only`);
    const chunks = chunk(source, text);
    writeFileSync(join(this.dir, `${source}.json`), JSON.stringify({ source, sha256: createHash('sha256').update(text).digest('hex'), chunks }));
    return chunks;
  }

  sources(): { source: string; chunks: number }[] {
    return readdirSync(this.dir).filter((f) => f.endsWith('.json')).sort()
      .map((f) => JSON.parse(readFileSync(join(this.dir, f), 'utf8'))).map((d) => ({ source: d.source, chunks: d.chunks.length }));
  }

  search(query: string, k = 3): Hit[] {
    const chunks: Chunk[] = readdirSync(this.dir).filter((f) => f.endsWith('.json'))
      .flatMap((f) => JSON.parse(readFileSync(join(this.dir, f), 'utf8')).chunks);
    const docs = chunks.map((c) => words(c.text));
    const avg = docs.reduce((s, d) => s + d.length, 0) / (docs.length || 1);
    const idf = new Map([...new Set(words(query))].map((t) => {
      const df = docs.filter((d) => d.includes(t)).length;
      return [t, Math.log(1 + (docs.length - df + 0.5) / (df + 0.5))];
    }));
    return chunks.map((c, i) => {
      let score = 0;
      for (const [t, w] of idf) {
        const f = docs[i].filter((x) => x === t).length;
        if (f) score += (w * f * 2.2) / (f + 1.2 * (0.25 + (0.75 * docs[i].length) / avg));
      }
      return { ...c, score };
    }).filter((h) => h.score > 0).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)).slice(0, k);
  }

  ask(question: string, k = 2): Answer {
    const hits = this.search(question, k);
    if (!hits.length) return { text: 'No local document answers this.', citations: [] };
    const text = hits.map((h) => `${h.text.split('\n').map((l) => `> ${l}`).join('\n')}\n[${h.id}, lines ${h.lines[0]}-${h.lines[1]}]`).join('\n\n');
    return { text, citations: hits.map((h) => h.id) };
  }
}
