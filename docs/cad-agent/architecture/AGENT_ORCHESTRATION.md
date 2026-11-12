# Agent Orchestration

L2 T2, written 2026-11-10. How a request becomes verified geometry, and how background jobs run. The loop follows `docs/roadmap/MECAGENT_ROADMAP.md#Agent execution loop:`. Research: rows 1, 4, 7, 9, 10 and 14 of `docs/cad-agent/research/PRODUCT_FEATURE_MATRIX.md`.

## Responsibility

Turn natural language into typed operations, run them through the executor, and report only what records prove. The orchestrator never writes or runs code (I6); macros and automations are stored operation sequences (row 9; P16).

## Agent state machine

```
OBSERVE → UNDERSTAND → PLAN → VALIDATE → [AWAIT_APPROVAL] → EXECUTE → INSPECT → VERIFY → REPORT
              │                    │                               │          │
              └→ ASK (missing      └→ refusal fed back             └──────────┴→ RECOVER (max 2 replans) → REPORT failed
                 or conflicting       to the model, then PLAN
                 dimension)
any state → CANCELLED on user cancel
```

| State | Does | Leaves to |
|---|---|---|
| OBSERVE | Reads the active document kind (part, assembly, drawing, empty, unsupported) and its last inspect record | UNDERSTAND |
| UNDERSTAND | Model call: request to typed engineering spec; units made explicit | PLAN, or ASK when a needed dimension is missing or contradictory (P8; I12) |
| ASK | Emits a question event; waits for the answer | UNDERSTAND |
| PLAN | Model call with tools that map one to one onto operation types | VALIDATE |
| VALIDATE | Proposal check, schema plus preconditions per operation; a refusal is recorded and goes back to the model as a tool error | AWAIT_APPROVAL, EXECUTE, or PLAN |
| AWAIT_APPROVAL | Consequential operations, as defined in `docs/cad-agent/architecture/EXECUTION_AND_VERIFICATION.md`, wait for the user unless the chat's auto-accept is on, which never covers delete, overwrite or close (row 14; P20) | EXECUTE, or REPORT on denial |
| EXECUTE | Executor runs one operation at a time | INSPECT |
| INSPECT | Adapter inspect after every operation | VERIFY |
| VERIFY | Compares inspect output with the spec (dimensions, counts, valid solid) | next operation, RECOVER or REPORT |
| RECOVER | Replans from the failed record, at most twice | EXECUTE, or REPORT failed |
| REPORT | Final message built from records only (P3); progress list closes with each step's result (P2) | done |

**Interface.** `runRequest(requestId)` drives the machine; each transition is an event on the request's SSE stream and a row in the store, so a reload resumes the view.

**Errors.** Model errors end the request as failed with the error on the request row; no partial success text. Only validation refusals go back to PLAN; an unsupported operation is reported as unsupported, never retried as something else.

**Tests (L5).** On recorded model responses: "make a bracket" asks for dimensions; inch input converts to mm exactly; a bad tool call is refused and fed back; an approval-gated operation does not run before approval; an injected kernel failure ends failed with no success text.

## Job engine (background tasks)

**Responsibility.** Durable jobs for text-to-CAD without an open CAD application, STEP-to-CAD and drawing work (rows 4, 5, 7, 8, 10; P9, P17, P18).

**States.** From `docs/roadmap/MECAGENT_ROADMAP.md#Define job states:`.

```
CREATED → PENDING → RUNNING → VERIFYING → COMPLETED
                       │           └────→ FAILED
                       ├────────────────→ FAILED
any non-final → CANCELLED
```

- A job is COMPLETED only with a verified artifact and its records (P9).
- Workers run in a separate process and heartbeat into SQLite every 2 s. A watchdog runs at server start and every 5 s after: any RUNNING job without a heartbeat for 10 s is marked FAILED with `worker_crashed`, or resumed when its last record is a clean operation boundary (P18). A job past its maximum duration (10 min by default, set per job type) is FAILED with `timeout`. There is no automatic retry; the user re-runs a failed job as a new submission.
- Jobs call the same executor and approval rules. A job cannot wait for a user, so a consequential operation ends the job FAILED with `approval_denied` unless the chat's auto-accept covers it.
- Submissions carry an idempotency key; a duplicate returns the existing job.
- Cancel sets CANCELLED and kills the worker; the record says cancelled.
- Progress goes out as SSE events from the store, so a reconnecting client sees the same status (P18).
- Outputs keep an expiry date column, unused until the human promotes expiry into parity.

**Job types.** `text2cad` (input `request`, L6 T2) runs the agent of `cad-AI/src/services/agent/text2cad.ts` and is COMPLETED only when the part is complete (nothing unresolved) and its STEP export passed re-import. `step2cad` (input `path`, L6 T3) imports a STEP file, asks the kernel for a plan (`cad-AI/worker/step2cad.py`), runs it as editable features in a new document, and is COMPLETED only when the rebuilt solid has the imported volume within 0.1 % and its bounding box within 0.001 mm and its STEP export passed re-import. The plan covers prismatic parts: planar faces, and holes (concave cylinders closing a full turn) on principal axes, which become circle sketches and cuts; the solid with its holes filled is cut into slabs square to one principal axis, and each run of one outline over consecutive slabs becomes an offset sketch and an extrude (inner outlines, a cut). Anything else, including arcs in a section (a slot's round ends) and freeform faces, ends FAILED with `unsupported` and the kernel's reason. Handlers: `cad-AI/src/services/jobs/handlers.ts`. Eval: `scripts/eval-step2cad.mjs` over `evals/step2cad/`.

**Tests (L6 T1).** Worker killed mid-job is FAILED or resumed, never stuck RUNNING; a hung worker under a live server is FAILED within 15 s; a job past its maximum duration ends `timeout`; a duplicate key runs once; cancel reaches CANCELLED and stops the worker; a reconnecting client sees the same status.

## What we deliberately do not copy

The reference also runs model-written code in a separate runner (`docs/cad-agent/research/SIDECAR_PROTOCOL.md`). We do not: I6 forbids it, and typed operations give the same safety (validate, approve, refuse on a changed document) with less risk.
