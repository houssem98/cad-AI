import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

// docs/cad-agent/architecture/API_CONTRACTS.md §4: DeepSeek's OpenAI-compatible chat completions over fetch, spend summed against a cap.
const ENDPOINT = 'https://api.deepseek.com/chat/completions';
export const MODEL = 'deepseek-flash';
// Peak prices per token (api-docs.deepseek.com/quick_start/pricing, read 2026-11-12); off-peak is half, so spend is never undercounted.
const PRICE = { hit: 0.006e-6, miss: 0.3e-6, out: 1.2e-6 };

export interface Usage { prompt_tokens: number; completion_tokens: number; prompt_cache_hit_tokens?: number; prompt_cache_miss_tokens?: number }
export interface ToolCall { id: string; name: string; arguments: string }
export interface Completion { text: string; toolCalls: ToolCall[]; usage: Usage }
export interface Request { messages: object[]; tools?: object[]; temperature?: number; json?: boolean; maxTokens?: number; signal?: AbortSignal }
export type Complete = (r: Request) => Promise<Completion>;

export class ModelError extends Error {
  readonly code = 'model_error';
  constructor(message: string, readonly status?: number) {
    super(message);
  }
}

export interface ClientOptions {
  // replay: recorded responses only, never the network (every test); record: call live for a request with no recording and keep it.
  mode: 'replay' | 'record' | 'live';
  recordings: string;
  spendFile: string;
  capUsd: number;
  key?: string;
  fetch?: typeof fetch;
  retryDelayMs?: number;
}

export const cost = (u: Usage) => {
  const hit = u.prompt_cache_hit_tokens ?? 0;
  return hit * PRICE.hit + (u.prompt_cache_miss_tokens ?? u.prompt_tokens - hit) * PRICE.miss + u.completion_tokens * PRICE.out;
};

const spent = (file: string) => (existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : { usd: 0, calls: 0 });

function parse(res: any): Completion {
  const m = res?.choices?.[0]?.message;
  if (!m || !res.usage) throw new ModelError('the model answered with no message');
  const toolCalls = (m.tool_calls ?? []).map((t: any) => ({ id: t.id, name: t.function?.name, arguments: t.function?.arguments ?? '' }));
  // An empty reply is a failed call, not an answer: a thinking model can spend max_tokens on reasoning_content and return content null.
  if (!String(m.content ?? '').trim() && !toolCalls.length)
    throw new ModelError(`the model returned no text and no tool call (finish_reason ${res.choices[0].finish_reason}${m.reasoning_content ? `, ${m.reasoning_content.length} chars of reasoning` : ''})`);
  return { text: m.content ?? '', toolCalls, usage: res.usage };
}

export function modelClient(o: ClientOptions): Complete {
  const http = o.fetch ?? fetch;
  async function call(body: object, signal?: AbortSignal) {
    if (!o.key) throw new ModelError('DEEPSEEK_API_KEY is not set');
    for (let attempt = 0; ; attempt++) {
      let res: Response;
      try {
        res = await http(ENDPOINT, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${o.key}` },
          body: JSON.stringify(body), signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(60_000)]) : AbortSignal.timeout(60_000) });
      } catch (e) {
        throw new ModelError(signal?.aborted ? 'cancelled by the user' : `no answer from the model: ${(e as Error).name}`);
      }
      if (res.ok) return res.json();
      if (res.status < 500 || attempt === 2) throw new ModelError(`the model API answered ${res.status}`, res.status);
      const wait = Number(res.headers.get('retry-after')) * 1000 || (o.retryDelayMs ?? 1000) * 2 ** attempt;
      await new Promise((r) => setTimeout(r, Math.min(wait, 30_000)));
    }
  }

  return async ({ messages, tools, temperature = 0, json = false, maxTokens = 800, signal }) => {
    if (signal?.aborted) throw new ModelError('cancelled by the user');
    const body = { model: MODEL, messages, ...(tools && { tools }), temperature, max_tokens: maxTokens,
      thinking: { type: 'disabled' }, ...(json && { response_format: { type: 'json_object' } }) };
    const file = join(o.recordings, `${createHash('sha256').update(JSON.stringify(body)).digest('hex').slice(0, 16)}.json`);
    if (o.mode !== 'live' && existsSync(file)) return parse(JSON.parse(readFileSync(file, 'utf8')).response);
    if (o.mode === 'replay') throw new ModelError(`no recorded response ${file}`);
    mkdirSync(dirname(o.spendFile), { recursive: true }); // before the call: a billed call must always be counted
    return turn(o.spendFile, signal, async () => {
      const before = spent(o.spendFile);
      if (before.usd >= o.capUsd) throw new ModelError(`the $${o.capUsd} eval cap is reached ($${before.usd.toFixed(4)} spent)`);
      // Counted before it is sent, at an upper bound (a token covers at least one byte), so a call cut off after the provider
      // billed it is never missed; a usage answer then replaces the bound with the real cost (council R4).
      const bound = Buffer.byteLength(JSON.stringify(body)) * PRICE.miss + maxTokens * PRICE.out;
      writeFileSync(o.spendFile, JSON.stringify({ usd: before.usd + bound, calls: before.calls + 1 }) + '\n');
      const res = await call(body, signal);
      if (res?.usage) writeFileSync(o.spendFile, JSON.stringify({ usd: before.usd + cost(res.usage), calls: before.calls + 1 }) + '\n');
      const out = parse(res);
      if (o.mode === 'record') {
        mkdirSync(o.recordings, { recursive: true });
        writeFileSync(file, JSON.stringify({ request: body, response: res }, null, 1) + '\n');
      }
      return out;
    });
  };
}

// Live calls from every process sharing a spend file take turns, so each cap check sees every call before it: parallel job
// workers cannot all pass the check at once (council C18). The turn is an exclusive SQLite lock, which the system releases
// when its holder exits or is killed, so no lock outlives its holder and none is taken over. A holder's call ends within its
// timeouts; a caller waiting for the turn stops when its request is cancelled (council D4).
async function turn<T>(spendFile: string, signal: AbortSignal | undefined, f: () => Promise<T>): Promise<T> {
  const lock = new DatabaseSync(`${spendFile}.lock.db`);
  try {
    for (;;) {
      try { lock.exec('BEGIN EXCLUSIVE'); break; } catch (e) { if ((e as { errcode?: number }).errcode !== 5) throw e; }
      if (signal?.aborted) throw new ModelError('cancelled by the user');
      await new Promise((r) => setTimeout(r, 50));
    }
    try { return await f(); } finally { lock.exec('ROLLBACK'); }
  } finally {
    lock.close();
  }
}
