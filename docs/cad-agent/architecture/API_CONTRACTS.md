# API Contracts

L2 T2, written 2026-11-10. Three contracts: the operation protocol (server to adapter), the HTTP API (UI to server) and the model-client interface (server to DeepSeek). L2 T3 turns the first into code, starting from cad-AI's typed IR (`cad-AI/src/services/cad/cadOperationIR.ts#export interface CADOperationPlan`).

## 1. Operation protocol

**Responsibility.** The only way anything changes geometry. One JSON Schema file is the single source (`cad-AI/schema/cad-operation.schema.json`). Our two validators, `validateOperation` in TypeScript and `validate_operation` in Python, read it and also apply `$defs.params[type]` to `params`. A stock JSON Schema validator does not apply that rule, so only these two gate operations; the L9 sidecar receives envelopes the server has already validated. Model output first passes the proposal check (`validateProposal`, `validate_proposal`): status pending, and result, verification and error null.

**Operation envelope.** Every operation carries the fields of `docs/roadmap/MECAGENT_ROADMAP.md#Every CAD action must have:`.

| Field | Type | Rule |
|---|---|---|
| id | string | required; the server assigns a uuid when it accepts a proposal, replacing any id the model sent, so ids are unique (primary key of the operations table) |
| target | object: document id, optional feature or entity ref | required; a missing target is refused |
| type | enum of operation types | required; an unknown type is refused |
| params | object, schema per type | required; every length has an explicit unit |
| preconditions | array of checks (document kind, feature exists, document revision), each with a value | required, may be empty; the executor always adds its own document revision check |
| status | pending, validated, awaiting_approval, running, inspecting, succeeded, failed, cancelled, unsupported | set by the executor only; a proposal must be pending |
| result | object or null | set by the executor |
| verification | object or null: valid, volume_mm3, bbox_mm (min and max x, y, z), counts (solids, faces, edges), all four required | set by inspection only (I3) |
| error | null, or code, message and optional details; the code is one of the list in `docs/cad-agent/architecture/SYSTEM_ARCHITECTURE.md` | set by the executor |

The schema forbids extra fields (`additionalProperties: false`). Lengths are `{ value, unit }` with unit in mm, cm, m, in, and a value that is finite and greater than zero; sketch coordinates (point x and y) take the same form with any finite value; angles in deg. The executor converts to mm before any kernel call.

**Operation types (first set, L3 T2).** new_part, sketch_rectangle, sketch_circle, sketch_polyline, extrude, cut, hole, fillet, chamfer, modify_dimension, assign_material, inspect, export, import. L7 adds create_assembly, mate, create_drawing. Each maps to one adapter method (`docs/cad-agent/architecture/CAD_ADAPTERS.md`).

**String parameters.** sketch, edges, parameter, material, target feature and entity, and artifact are identifiers or names. Adapters resolve them by lookup in the document or the artifact store and never parse or evaluate them; an unknown identifier is `precondition_failed`.

**Errors.** `validation_failed` names the JSON pointer of each bad field. Tests (L2 T3): a valid operation passes; a missing target, an unknown type, a missing unit and an extra field are each refused. L2 T4 added the council's cases to the shared file `cad-AI/schema/operation-cases.json`, which both suites run: key names inherited by every JavaScript object refused; a type that is not a string refused without an exception; zero, negative and infinite lengths refused; a precondition without a value, an unknown error code and an incomplete verification refused; a proposal that is not pending refused.

## 2. Worker wire protocol

stdin and stdout, one JSON object per line, UTF-8. Request: `{ "kind": "op", "operation": <envelope> }` or `{ "kind": "cancel", "id": ... }` (only for an operation queued but not started; it gets a result line with status cancelled) or `{ "kind": "health" }`. Response: `{ "kind": "result", "id", "status", "result", "verification", "error" }` or `{ "kind": "progress", "id", "message" }`. The result line is the worker's report; the executor alone writes the envelope's status and verification from it. A running operation is cancelled or timed out by killing the worker, never by a message, because a worker inside a kernel call reads no input. The worker routes all library output to stderr, so stdout carries protocol lines only. stderr is never parsed as protocol; on `worker_crashed` the executor keeps its last 4 KB as engine output in the record. A line that is not valid JSON ends the worker with `worker_crashed`.

## 3. HTTP API (UI to server)

| Method and path | Body | Returns |
|---|---|---|
| POST /api/requests | text, attachment ids, model options | request id |
| GET /api/requests/:id/events | none | Server-Sent Events: plan, operation, record, question, approval, done |
| POST /api/requests/:id/answer | answer to a question | 204 |
| POST /api/requests/:id/approve | operation id, approved true or false | 204 |
| POST /api/requests/:id/cancel | none | 204 |
| POST /api/jobs | type, input, idempotency key | job id (same key returns the same id) |
| GET /api/jobs, GET /api/jobs/:id | none | job list or job with status and artifacts |
| POST /api/jobs/:id/cancel | none | 204 |
| GET /api/artifacts/:id | none | file download |
| GET /api/documents/:id/inspect | none | feature tree and geometry from the last record |

Every response error body is `{ "error": { "code", "message", "details" } }` with the typed codes. These are our own routes; none mirrors the reference's channel names (I7). They replace the timer-driven routes the audit lists (`docs/cad-agent/CAD_AI_TRUTH_AUDIT.md`).

**Why events, not polling.** Row 1 shows a live progress list and row 10 live task status; a reconnecting client replays events from the store, so P18's "a reconnecting window sees the same status" holds.

## 4. Model client

One module, one function: `complete({ messages, tools, temperature }) → { text, toolCalls, usage }`. Implementation: DeepSeek's OpenAI-compatible chat completions endpoint over fetch. Usage tokens are summed per loop against the $10 eval cap; the client refuses calls once the cap is reached. Tests run on recorded responses, never live, except the L5 holdout run.

**Errors.** `model_error` with the HTTP status; a timeout of 60 s; no retry on 4xx, at most two retries on 5xx.
