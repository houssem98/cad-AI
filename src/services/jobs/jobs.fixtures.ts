import { appendFileSync } from 'node:fs';

// Job types for the engine's tests only: they exercise states, heartbeats and limits without the CAD kernel.
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const handlers = {
  quick: async (input: { ms?: number }) => { await sleep(input.ms ?? 50); return { verified: true, result: { ok: true } }; },
  unverified: async () => ({ verified: false, result: { why: 'the artifact did not match' } }),
  slow: async () => { await sleep(120_000); return { verified: true, result: {} }; }, // heartbeats keep going
  hang: async () => { for (;;); }, // blocks the event loop, so no heartbeat is sent
  count: async (input: { file: string }) => { appendFileSync(input.file, 'ran\n'); await sleep(200); return { verified: true, result: {} }; },
  crash: async () => { process.stderr.write('fixture crash: out of memory\n'); process.exit(1); }, // dies outside the worker's try
};
