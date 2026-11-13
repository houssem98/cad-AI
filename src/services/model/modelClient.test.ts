import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { cost, modelClient, MODEL } from './modelClient';

const usage = { prompt_tokens: 1000, prompt_cache_hit_tokens: 800, prompt_cache_miss_tokens: 200, completion_tokens: 100 };
const answer = { choices: [{ message: { content: '{"ok":true}', tool_calls: [{ id: 't1', function: { name: 'extrude', arguments: '{}' } }] } }], usage };
const msg = { messages: [{ role: 'user', content: 'hi' }] };

function setup(statuses: number[] = [200], body: object = answer) {
  const dir = mkdtempSync(join(tmpdir(), 'model-'));
  const calls: any[] = [];
  const fetch = (async (_url: string, init: any) => {
    calls.push(JSON.parse(init.body));
    const status = statuses[Math.min(calls.length - 1, statuses.length - 1)];
    return { ok: status < 400, status, headers: new Headers(), json: async () => body } as Response;
  }) as typeof globalThis.fetch;
  const spendFile = join(dir, 'not-yet', 'spend.json'); // a folder that does not exist until the first live call
  const client = (mode: 'replay' | 'record' | 'live', capUsd = 3) => modelClient({ mode, recordings: join(dir, 'rec'), spendFile, capUsd, key: 'k', fetch, retryDelayMs: 0 });
  return { calls, spendFile, client };
}

describe('model client', () => {
  it('prices usage at the peak rates', () => {
    expect(cost(usage)).toBeCloseTo(800 * 0.006e-6 + 200 * 0.3e-6 + 100 * 1.2e-6, 12);
  });

  it('records once, counts the spend, then replays with no network', async () => {
    const s = setup();
    const out = await s.client('record')(msg);
    expect(out.toolCalls).toEqual([{ id: 't1', name: 'extrude', arguments: '{}' }]);
    expect(s.calls[0]).toMatchObject({ model: MODEL, temperature: 0, thinking: { type: 'disabled' } });
    expect(JSON.parse(readFileSync(s.spendFile, 'utf8'))).toEqual({ usd: cost(usage), calls: 1 });
    expect(await s.client('replay')(msg)).toEqual(out);
    expect(s.calls).toHaveLength(1);
  });

  it('never calls the network in replay mode', async () => {
    const s = setup();
    await expect(s.client('replay')(msg)).rejects.toThrow(/no recorded response/);
    expect(s.calls).toHaveLength(0);
  });

  it('refuses a call once the cap is reached', async () => {
    const s = setup();
    mkdirSync(dirname(s.spendFile));
    writeFileSync(s.spendFile, JSON.stringify({ usd: 3, calls: 9 }));
    await expect(s.client('record')(msg)).rejects.toThrow(/\$3 eval cap is reached/);
    expect(s.calls).toHaveLength(0);
  });

  it('lets clients sharing one spend file call in turn, so two at the cap edge make one billed call (council C18)', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'model-'));
    const spendFile = join(dir, 'spend.json');
    writeFileSync(spendFile, JSON.stringify({ usd: 2.85, calls: 9 }));
    const billed = { prompt_tokens: 1_000_000, completion_tokens: 0 }; // $0.30 a call
    let calls = 0;
    const fetch = (async () => {
      calls++;
      await new Promise((r) => setTimeout(r, 200));
      return { ok: true, status: 200, headers: new Headers(), json: async () => ({ ...answer, usage: billed }) } as Response;
    }) as typeof globalThis.fetch;
    // Two clients share nothing but the file, as two job workers do.
    const client = () => modelClient({ mode: 'live', recordings: join(dir, 'rec'), spendFile, capUsd: 3, key: 'k', fetch, retryDelayMs: 0 });
    const out = await Promise.allSettled([client()(msg), client()(msg)]);
    expect(out.map((o) => o.status).sort()).toEqual(['fulfilled', 'rejected']);
    expect(calls).toBe(1);
    expect(JSON.parse(readFileSync(spendFile, 'utf8')).usd).toBeCloseTo(3.15, 6);
  });

  // Council D4: the turn must never outlive its holder, and a caller waiting for it can still be cancelled.
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  for (const [name, content] of [['a pid now used by another program', String(process.pid)], ['nothing', '']] as const) {
    it(`is not blocked by a lock file left behind that names ${name} (council D4)`, async () => {
      const s = setup();
      mkdirSync(dirname(s.spendFile), { recursive: true });
      writeFileSync(`${s.spendFile}.lock`, content);
      await expect(Promise.race([s.client('live')(msg).then(() => 'called'), sleep(3_000).then(() => 'still waiting')])).resolves.toBe('called');
    });
  }

  it('stops waiting for its turn when the request is cancelled (council D4)', async () => {
    const s = setup();
    let release!: () => void;
    const held = new Promise<void>((r) => { release = r; });
    const slow = (async () => { await held; return { ok: true, status: 200, headers: new Headers(), json: async () => answer } as Response; }) as typeof globalThis.fetch;
    const holder = modelClient({ mode: 'live', recordings: join(dirname(s.spendFile), 'rec'), spendFile: s.spendFile, capUsd: 3, key: 'k', fetch: slow })(msg);
    await sleep(200);
    const stop = new AbortController();
    const waiter = s.client('live')({ ...msg, signal: stop.signal });
    await sleep(200);
    stop.abort();
    await expect(Promise.race([waiter, sleep(2_000).then(() => 'still waiting')])).rejects.toThrow(/cancelled/);
    expect(s.calls).toHaveLength(0);
    release();
    await holder;
  });

  it('gives the turn to the next caller as soon as a holder is killed mid-call (council D4)', async () => {
    const s = setup();
    mkdirSync(dirname(s.spendFile), { recursive: true });
    const client = JSON.stringify(pathToFileURL(fileURLToPath(new URL('./modelClient.ts', import.meta.url))).href);
    const script = `const { modelClient } = await import(${client});
      setInterval(() => {}, 1e9);
      modelClient({ mode: 'live', recordings: ${JSON.stringify(join(dirname(s.spendFile), 'rec'))}, spendFile: ${JSON.stringify(s.spendFile)}, capUsd: 3, key: 'k',
        fetch: () => { console.log('holding'); return new Promise(() => {}); } })({ messages: [] });`;
    const child = spawn(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', script], { cwd: fileURLToPath(new URL('../../../', import.meta.url)), stdio: ['ignore', 'pipe', 'inherit'] });
    try {
      await new Promise((r) => child.stdout!.once('data', r));
      child.kill('SIGKILL');
      await new Promise((r) => child.once('exit', r));
      await expect(Promise.race([s.client('live')(msg).then(() => 'called'), sleep(3_000).then(() => 'still waiting')])).resolves.toBe('called');
    } finally {
      child.kill('SIGKILL');
    }
  });

  // Council R4: a call cut off after it was sent may already be billed, so it is counted before it is sent, at an upper bound.
  it('counts a call that is cancelled after it was sent', async () => {
    const s = setup();
    const hang = ((_u: string, init: any) => new Promise((_r, reject) => init.signal.addEventListener('abort', () => reject(new Error('aborted'))))) as typeof globalThis.fetch;
    const stop = new AbortController();
    const call = modelClient({ mode: 'live', recordings: join(dirname(s.spendFile), 'rec'), spendFile: s.spendFile, capUsd: 3, key: 'k', fetch: hang })({ ...msg, signal: stop.signal });
    await sleep(100);
    stop.abort();
    await expect(call).rejects.toThrow(/cancelled/);
    const after = JSON.parse(readFileSync(s.spendFile, 'utf8'));
    expect(after.calls).toBe(1);
    expect(after.usd).toBeGreaterThanOrEqual(800 * 1.2e-6);
  });

  it('fails a reply with no text and no tool call instead of returning an empty answer, and still counts its spend', async () => {
    const s = setup([200], { choices: [{ message: { content: null, reasoning_content: 'x'.repeat(900) }, finish_reason: 'length' }], usage });
    await expect(s.client('record')(msg)).rejects.toThrow(/no text and no tool call.*reasoning/);
    expect(JSON.parse(readFileSync(s.spendFile, 'utf8')).calls).toBe(1);
  });

  it('counts every call when two run at once', async () => {
    const s = setup();
    const c = s.client('live');
    await Promise.all([c(msg), c({ messages: [{ role: 'user', content: 'other' }] })]);
    expect(JSON.parse(readFileSync(s.spendFile, 'utf8'))).toEqual({ usd: 2 * cost(usage), calls: 2 });
  });

  it('stops a call when the request is cancelled', async () => {
    const s = setup();
    const stop = new AbortController();
    stop.abort();
    await expect(s.client('live')({ ...msg, signal: stop.signal })).rejects.toThrow(/cancelled/);
    expect(s.calls).toHaveLength(0);
  });

  it('does not retry a 4xx and retries a 5xx at most twice', async () => {
    const four = setup([400]);
    await expect(four.client('live')(msg)).rejects.toMatchObject({ code: 'model_error', status: 400 });
    expect(four.calls).toHaveLength(1);
    const five = setup([503]);
    await expect(five.client('live')(msg)).rejects.toMatchObject({ status: 503 });
    expect(five.calls).toHaveLength(3);
    const recovers = setup([502, 200]);
    expect((await recovers.client('live')(msg)).text).toBe('{"ok":true}');
    expect(recovers.calls).toHaveLength(2);
  });
});
