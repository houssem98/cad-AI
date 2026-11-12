import schema from '../../../schema/cad-operation.schema.json' with { type: 'json' };
import type { Executor } from '../cad/executor';
import type { Complete, ToolCall } from '../model/modelClient';

// L5 T3, after the roadmap's agent execution loop: the model proposes, the operation schema validates,
// the executor asks for approval when required, runs, inspects and records, and the outcome goes back to the model (I6).
const defs = schema.$defs as Record<string, any>;
const inline = (n: any): any =>
  n?.$ref ? inline(defs[n.$ref.replace('#/$defs/', '')])
    : Array.isArray(n) ? n.map(inline)
      : n && typeof n === 'object' ? Object.fromEntries(Object.entries(n).map(([k, v]) => [k, inline(v)])) : n;

// The agent's tools are the schema as L5 signed it off: a sketch offset (added for STEP-to-CAD, L6 T3) is not offered, which
// also keeps every recorded request byte for byte the same (human decision, L6 T3).
const AGENT_PARAMS = (params: any) => {
  const { offset, ...properties } = params.properties;
  return offset ? { ...params, properties } : params;
};

// One tool per operation type, its parameters the schema's own params for that type.
export const TOOLS = schema.properties.type.enum.map((name) => ({
  type: 'function',
  function: { name, parameters: { type: 'object', additionalProperties: false, required: ['id', 'params'],
    properties: { id: { type: 'string', description: 'a new id for this operation' }, params: AGENT_PARAMS(inline(defs.params[name])) } } },
}));

export const TOOL_PROMPT = `You build one part in a CAD kernel by calling tools. Each tool is one operation; the kernel's inspection after it comes back to you.
Lengths are {"value": <number>, "unit": "mm" | "cm" | "m" | "in"}. Sketches lie on a plane through the origin: "top" is XY, "front" is XZ, "right" is YZ.
extrude and cut take a sketch id. Holes are drilled along Z from the top of the part at XY positions. Fillet and chamfer edges are named "<feature id>:edge:<n>":
call inspect first, which lists the solid's edges with their name, type, centre and direction, and take the names from that list.
A hexagon's across-flats size is the distance between two opposite sides; its corners lie across_flats / √3 from its centre.
A document starts with new_part. Give every operation a new id. If an operation is refused or fails, read its error and correct it.
When the request is done, reply with one line and call no tool.`;

// A failed operation, or a "done" that verify rejects, is a failure; the model replans after each, and the third ends the request.
export const MAX_REPLANS = 2;
export interface Outcome { status: string; error: any; inspection: any; edges?: any[] }
export interface Step { call: ToolCall; outcome: Outcome; operationId: string }
export interface LoopResult {
  status: 'done' | 'failed' | 'cancelled' | 'step_limit'; text?: string; steps: Step[]; failures: number;
  problem?: string; problemFrom?: 'record' | 'kernel'; // the last failed operation's record, or the kernel's objection to a done
}
export interface LoopContext {
  complete: Complete; executor: Executor; document: string; requestId: string; signal?: AbortSignal; maxTurns?: number;
  verify?: () => Promise<string | null>; // the kernel's objection to a "done", or null
  onEvent?: (type: 'plan' | 'operation' | 'record', data: object) => void; // the live progress the chat panel streams
}

// Unparsable arguments still go to the executor, so its schema refuses them and the refusal is recorded like any other.
async function run(call: ToolCall, ctx: LoopContext): Promise<Step> {
  let args: any = null;
  try { args = JSON.parse(call.arguments || '{}'); } catch { /* refused below as params null */ }
  const proposal = { id: args?.id ?? '', target: { document: ctx.document }, type: call.name, params: args?.params ?? null,
    preconditions: [], status: 'pending', result: null, verification: null, error: null };
  const out = await ctx.executor.execute(proposal, { requestId: ctx.requestId, signal: ctx.signal });
  return { call, operationId: out.operationId,
    outcome: { status: out.status, error: out.record?.errorDetails ?? out.error ?? null, inspection: out.record?.validationResult?.inspection ?? null,
      ...(call.name === 'inspect' && { edges: out.record?.executionResult?.result?.edges }) } }; // the record keeps the adapter's answer under result
}

export async function runToolLoop(task: string, ctx: LoopContext): Promise<LoopResult> {
  // The document's name stays out of the conversation (the loop targets it), so a request replays the same for any document.
  const exists = ctx.executor.store.document(ctx.document) ? 'The document exists' : 'The document does not exist yet';
  const messages: any[] = [{ role: 'system', content: TOOL_PROMPT }, { role: 'user', content: `${exists}.\n${task}` }];
  const steps: Step[] = [];
  let failures = 0;
  const end = (status: LoopResult['status'], more: Partial<LoopResult> = {}): LoopResult => ({ status, steps, failures, ...more });
  for (let turn = 0; turn < (ctx.maxTurns ?? 20); turn++) {
    if (ctx.signal?.aborted) return end('cancelled');
    let reply;
    try {
      reply = await ctx.complete({ messages, tools: TOOLS, maxTokens: 800, signal: ctx.signal });
    } catch (e) {
      if (ctx.signal?.aborted) return end('cancelled');
      throw e;
    }
    if (ctx.signal?.aborted) return end('cancelled'); // a cancel during the call: nothing it proposed runs
    if (!reply.toolCalls.length) {
      const problem = (await ctx.verify?.()) ?? null;
      if (!problem) return end('done', { text: reply.text });
      if (++failures > MAX_REPLANS) return end('failed', { text: reply.text, problem, problemFrom: 'kernel' });
      messages.push({ role: 'assistant', content: reply.text }, { role: 'user', content: `The kernel says the request is not done: ${problem}. Continue.` });
      continue;
    }
    ctx.onEvent?.('plan', { text: reply.text, calls: reply.toolCalls.map((t) => ({ name: t.name, arguments: t.arguments })) });
    messages.push({ role: 'assistant', content: reply.text || null,
      tool_calls: reply.toolCalls.map((t) => ({ id: t.id, type: 'function', function: { name: t.name, arguments: t.arguments } })) });
    for (const call of reply.toolCalls) {
      ctx.onEvent?.('operation', { call: call.id, type: call.name, arguments: call.arguments });
      const step = await run(call, ctx);
      steps.push(step);
      ctx.onEvent?.('record', { call: call.id, record: step.operationId, type: call.name, ...step.outcome });
      // No row ids or times: what the model sees must replay byte for byte.
      messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(step.outcome) });
      if (step.outcome.status !== 'succeeded' && ++failures > MAX_REPLANS)
        return end(ctx.signal?.aborted ? 'cancelled' : 'failed', { problem: step.outcome.error?.message ?? step.outcome.status, problemFrom: 'record' });
    }
  }
  return end('step_limit');
}
