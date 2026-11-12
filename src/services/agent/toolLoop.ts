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

// One tool per operation type, its parameters the schema's own params for that type.
export const TOOLS = schema.properties.type.enum.map((name) => ({
  type: 'function',
  function: { name, parameters: { type: 'object', additionalProperties: false, required: ['id', 'params'],
    properties: { id: { type: 'string', description: 'a new id for this operation' }, params: inline(defs.params[name]) } } },
}));

export const TOOL_PROMPT = `You build one part in a CAD kernel by calling tools. Each tool is one operation; the kernel's inspection after it comes back to you.
Lengths are {"value": <number>, "unit": "mm" | "cm" | "m" | "in"}. Sketches lie on a plane through the origin: "top" is XY, "front" is XZ, "right" is YZ.
extrude and cut take a sketch id. Holes are drilled along Z from the top of the part at XY positions. Fillet and chamfer edges are named "<feature id>:edge:<n>".
A document starts with new_part. Give every operation a new id. If an operation is refused or fails, read its error and correct it.
When the request is done, reply with one line and call no tool.`;

export interface Outcome { status: string; error: any; inspection: any }
export interface Step { call: ToolCall; outcome: Outcome }
export interface LoopResult { status: 'done' | 'step_limit'; text?: string; steps: Step[] }
export interface LoopContext { complete: Complete; executor: Executor; document: string; requestId: string; signal?: AbortSignal; maxTurns?: number }

// Unparsable arguments still go to the executor, so its schema refuses them and the refusal is recorded like any other.
async function run(call: ToolCall, ctx: LoopContext): Promise<Outcome> {
  let args: any = null;
  try { args = JSON.parse(call.arguments || '{}'); } catch { /* refused below as params null */ }
  const proposal = { id: args?.id ?? '', target: { document: ctx.document }, type: call.name, params: args?.params ?? null,
    preconditions: [], status: 'pending', result: null, verification: null, error: null };
  const out = await ctx.executor.execute(proposal, { requestId: ctx.requestId, signal: ctx.signal });
  return { status: out.status, error: out.record?.errorDetails ?? out.error ?? null, inspection: out.record?.validationResult?.inspection ?? null };
}

export async function runToolLoop(task: string, ctx: LoopContext): Promise<LoopResult> {
  const exists = ctx.executor.store.document(ctx.document) ? 'exists' : 'does not exist yet';
  const messages: any[] = [{ role: 'system', content: TOOL_PROMPT }, { role: 'user', content: `Document "${ctx.document}" ${exists}.\n${task}` }];
  const steps: Step[] = [];
  for (let turn = 0; turn < (ctx.maxTurns ?? 20); turn++) {
    const reply = await ctx.complete({ messages, tools: TOOLS, maxTokens: 800 });
    if (!reply.toolCalls.length) return { status: 'done', text: reply.text, steps };
    messages.push({ role: 'assistant', content: reply.text || null,
      tool_calls: reply.toolCalls.map((t) => ({ id: t.id, type: 'function', function: { name: t.name, arguments: t.arguments } })) });
    for (const call of reply.toolCalls) {
      const outcome = await run(call, ctx);
      steps.push({ call, outcome });
      // No row ids or times: what the model sees must replay byte for byte.
      messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(outcome) });
    }
  }
  return { status: 'step_limit', steps };
}
