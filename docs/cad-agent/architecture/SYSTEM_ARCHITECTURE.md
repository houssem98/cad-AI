# System Architecture

L2 T2, written 2026-11-10 against the L2 T1 stack decision (`docs/loops/L2_ARCHITECTURE.md`). Research inputs: `docs/cad-agent/research/PRODUCT_FEATURE_MATRIX.md` (rows cited as "row N"), `docs/cad-agent/research/PARITY_SPEC.md` (claims cited as "P N") and `docs/cad-agent/research/TECHNICAL_UNKNOWNS.md`. Every design here is our own; the reference's internals are not copied (`docs/LOOP_CONVENTIONS.md#I7 Clean room.`).

## Stack

| Layer | Choice | Why |
|---|---|---|
| App | cad-AI: React 19, TypeScript, Vite, Express (`cad-AI/server.ts#app.post('/api/chat'`) | Existing codebase, changed in place (I13) |
| Kernel | build123d on OpenCascade, Python 3.12 worker | Free, headless, STEP-native, so geometry tests run in the gate (I3) |
| Model | DeepSeek through its OpenAI-compatible HTTP API, plain fetch, key in DEEPSEEK_API_KEY | Human's choice; one model-client module keeps providers swappable |
| Store | One SQLite file behind one storage module | No running service in the gate; Supabase is the upgrade path |
| Tests | Vitest, Playwright, pytest | Covers TypeScript, UI and worker |

## Processes

```
React UI ──HTTP + SSE──▶ Express server ──stdio JSON lines──▶ Kernel worker (Python, build123d)
                          │  agent orchestrator                     one process per job slot
                          │  executor + records
                          │  job engine (L6)  ──▶ SQLite file
                          └──HTTPS──▶ DeepSeek API
                          └──stdio JSON (L9)──▶ SolidWorks sidecar (.NET, our own)
```

- **UI.** Chat, viewport, feature tree, properties, tasks and history panels (P23, owner L4/T2). It renders only what execution records hold (I12). The viewport is always labelled a preview (`docs/LOOP_CONVENTIONS.md#I3 No kernel evidence, no geometry claim.`).
- **Server.** Owns the agent loop, schema validation, the executor, records and jobs. The model never reaches a kernel directly (`docs/LOOP_CONVENTIONS.md#I6 Typed operations only.`).
- **Kernel worker.** A separate Python process the server spawns and talks to over stdin and stdout, one JSON object per line. A crash or hang kills the worker, never the server. This answers our side of U5 (how a handler reaches the CAD side) with our own design.
- **SolidWorks sidecar (L9).** Same protocol and adapter contract as the kernel worker, so the agent cannot tell them apart except by the capability manifest (rows 1 and 2; U6).

## Subsystems

| Subsystem | Responsibility | Doc |
|---|---|---|
| Operation protocol | One JSON Schema shared by TypeScript and Python; every operation carries the fields of `docs/roadmap/MECAGENT_ROADMAP.md#Every CAD action must have:` | `docs/cad-agent/architecture/API_CONTRACTS.md` |
| Agent orchestrator | Request to spec to plan to operations, with approval, verification and recovery | `docs/cad-agent/architecture/AGENT_ORCHESTRATION.md` |
| Adapters | Kernel and SolidWorks behind one contract with a capability manifest | `docs/cad-agent/architecture/CAD_ADAPTERS.md` |
| Executor and records | Validate, run with timeout and cancel, inspect, persist a record | `docs/cad-agent/architecture/EXECUTION_AND_VERIFICATION.md` |
| Store | Requests, operations, records, jobs, artifacts, workflows, knowledge | `docs/cad-agent/architecture/DATABASE_DESIGN.md` |
| Job engine | Durable background jobs (rows 7 and 10) | `docs/cad-agent/architecture/AGENT_ORCHESTRATION.md` |

## Cross-cutting rules

- **No kernel evidence, no geometry claim.** Success text is built from records, never from model output (P1, P3).
- **Honest limits.** An adapter that lacks an operation returns a typed unsupported result; a missing dimension becomes a question (`docs/LOOP_CONVENTIONS.md#I12 Honest limits.`; P8).
- **Secrets.** DEEPSEEK_API_KEY lives in the server environment only; it never reaches the UI, logs, records or bundles (`docs/LOOP_CONVENTIONS.md#I10 Secrets (model API keys, the reference account) never enter the repo, logs, reports or a bundle.`).
- **No user file leaves the machine without consent.** Only request text and spec data go to the model API; attached files stay local unless the user sends them.

## Errors

Every boundary returns a typed error, never a thrown string: `validation_failed`, `unsupported`, `timeout`, `cancelled`, `kernel_error`, `worker_crashed`, `model_error`, `approval_denied`. The UI maps each to a distinct error state (P23).

## Tests

- Unit: schema, executor, agent steps on recorded model responses (Vitest, pytest).
- Geometry: kernel worker against analytic values (pytest; L3 T2).
- End to end: UI states and flows (Playwright; L4 T2).
- Evals: text-to-CAD holdout, $10 model spend cap per loop (L5 T1).
