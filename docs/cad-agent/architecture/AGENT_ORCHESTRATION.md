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

- A job is COMPLETED only with a verified artifact and its records (P9). The handler runs while RUNNING. Its result names the STEP as `step`, with path, sha256, bytes, and `record`, the export operation whose re-import check passed. The worker then moves to VERIFYING, reads the file back and compares its sha256 with the recorded one. Only a handler verdict of verified plus a matching file gives COMPLETED; otherwise the job is FAILED `verification_failed` (L6 council C6, C11, C20). The download serves the file only while its sha256 still matches (C16).
- Workers run in a separate process and heartbeat into SQLite every 2 s; what a worker prints goes to `data/jobs/<id>/worker.log`. A watchdog runs at server start and every 5 s after. A job whose worker is gone is FAILED with `worker_crashed`, and the error ends with the log's last lines. A RUNNING job without a heartbeat for 10 s, or a job not started within 60 s, is FAILED with `worker_crashed`. A job past its maximum duration (10 min by default, set per job type) is FAILED with `timeout`. Before a worker is killed, its pid must be shown to be that job's worker: either the engine spawned it and has not seen it exit, or the process's command line names `jobWorker` and the job id. A pid that now runs another program is never killed, and its job is FAILED with `worker_crashed` (L6 council C3, C8, D2). When that command-line check fails or takes over 5 s, nothing is decided about the worker, and it is checked again on the next pass (D6). Off Windows a worker leads its own process group, so stopping it stops its kernel too (C17). A state change and its event commit in one transaction, and so do a new job and its CREATED event (D18). Opening the job store or a job's `cad.db` retries an I/O error for up to 5 s, because a process killed with it open can keep its `-shm` mapped for a few seconds (D3). A store error in one watchdog pass is logged, and the next pass tries again (D7). Nothing is resumed and there is no automatic retry; the user re-runs a failed job as a new submission (C9).
- Jobs call the same executor and approval rules. A job cannot wait for a user, and its executor is opened with no approver (`cad-AI/src/services/jobs/handlers.ts#return Executor.open({ dbPath: join(ctx.dir, 'cad.db'), dataDir: ctx.dir, workerArgs: ['--adapter', 'kernel'] });`). The executor therefore denies a consequential operation (`cad-AI/src/services/cad/executor.ts#if (!approve) return Promise.resolve('denied');`). Its record is `cancelled` with `approval_denied`, the agent's report lists it as unresolved, and the job ends FAILED `verification_failed`, with the denied operation in `result.unresolved`. The chat's auto-accept does not reach jobs (L6 council C9).
- At most 2 jobs are live at once (`maxWorkers`), since each runs a worker and a kernel. A new submission past that is refused with 409, and the dashboard shows the reason (L6 council C21).
- Submissions carry an idempotency key. A duplicate with the same type and input returns the existing job; the same key with another request is refused. The insert decides, so two servers on one store cannot both run a job (L6 council C14).
- Cancel sets CANCELLED and kills the worker and its kernel. The operation the worker was running is closed in the job's store with a `cancelled` record; a timeout or a crash closes it `failed` with that code. The document keeps its stored revision, because the change never committed (L6 council C5, C7).
- Progress is the job's state and its events, read from the store. The tasks dashboard polls GET /api/jobs every second (`cad-AI/src/components/views/BackgroundTasksView.tsx#const t = setInterval(load, 1000);`), so a reconnecting client sees the same status (P18). Jobs have no SSE stream (L6 council C9).
- Outputs have no expiry: no column records one, and a job's files stay in `data/jobs/<id>/` until removed by hand. Expiry waits until the human promotes it into parity (L6 council C9).

**Job types.** `text2cad` (input `request`, L6 T2) runs the agent of `cad-AI/src/services/agent/text2cad.ts` and is COMPLETED only when the part is complete (nothing unresolved) and its STEP export passed re-import. `step2cad` (input `path`, L6 T3) imports a STEP file, asks the kernel for a plan (`cad-AI/worker/step2cad.py`), runs it as editable features in a new document, and is COMPLETED only when the rebuilt solid has the imported volume within 0.1 %, its bounding box within 0.001 mm, and a symmetric difference with the imported solid, measured by the kernel's `compare`, of at most 1e-6 mm times the imported surface area and never more than 1e-3 mm3 (council C1: a moved or mirrored feature keeps volume and box; D5: on a large part, a skin scaled by area let a missing small hole pass), and its STEP export passed re-import. The job's result keeps the whole plan and every input of that verdict: area, limit, difference and both bounding boxes (D16). The plan covers prismatic parts: planar faces, and holes (concave cylinders closing a full turn) on principal axes, which become circle sketches and cuts; the solid with its holes filled is cut into slabs square to one principal axis, and each run of one outline over consecutive slabs becomes an offset sketch and an extrude (inner outlines, a cut, placed before any extrude standing wholly inside it, so a pin in a pocket survives). A part rotated about the axis it is extruded along is still such a prism and is rebuilt; a part tilted so that no principal axis runs along its edges is not (D19). Anything else, including arcs in a section (a slot's round ends), freeform faces and tilted parts, ends FAILED with `unsupported` and the kernel's reason. Handlers: `cad-AI/src/services/jobs/handlers.ts`. Eval: `scripts/eval-step2cad.mjs` over `evals/step2cad/`.

**Tests (L6 T1).** Worker killed mid-job is FAILED or resumed, never stuck RUNNING; a hung worker under a live server is FAILED within 15 s; a job past its maximum duration ends `timeout`; a duplicate key runs once; cancel reaches CANCELLED and stops the worker; a reconnecting client sees the same status.

## What we deliberately do not copy

The reference also runs model-written code in a separate runner (`docs/cad-agent/research/SIDECAR_PROTOCOL.md`). We do not: I6 forbids it, and typed operations give the same safety (validate, approve, refuse on a changed document) with less risk.
