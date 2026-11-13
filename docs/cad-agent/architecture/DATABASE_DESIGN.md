# Database Design

L2 T2, written 2026-11-10. One SQLite file, opened only by the storage module on the server (L2 T1 decision). Supabase Postgres is the upgrade path; the schema uses plain SQL types so it ports. Research: rows 1, 9, 10, 11 and 15 of `docs/cad-agent/research/PRODUCT_FEATURE_MATRIX.md`.

## Responsibility

Durable state for requests, operations, records, jobs, artifacts, automations and knowledge, so that a restart or reconnect loses nothing (P18).

## Tables

| Table | Key columns | Notes |
|---|---|---|
| documents | id, kind (part, assembly, drawing), adapter, revision, checkpoint, state (ok, unknown), created_at | revision increments on every succeeded operation; checkpoint is the path of what the adapter saved after it, used by Restore |
| requests | id, chat_id, text, state (agent state machine), spec_json, error_json, created_at, finished_at | one per user request; error_json holds a model or storage error |
| events | id, request_id or job_id, seq, type, payload_json, created_at | the SSE stream, replayed on reconnect |
| operations | row_id (server uuid), op_id (the envelope's id), request_id, document_id, seq, envelope_json, status, command_json | every proposal, written before validation; status moves before each adapter call (write-ahead), and the CAD command is written when it is sent, so a record closed after a crash, cancel or timeout still names it (L6 council D17) |
| records | id, operation_row_id, document_id, revision_before, revision_after, command_json, result_json, validation_json, approval_json, error_json, artifacts_json, started_at, ended_at | append-only; fields per `docs/cad-agent/architecture/EXECUTION_AND_VERIFICATION.md`; written in one transaction with the document change and the status (`cad-AI/src/services/cad/cadStore.ts`) |
| artifacts | id, kind (step, brep, gltf, svg, pdf, dxf), path, sha256, bytes, created_at | files live in a data folder beside the database; the sha256 is computed by the executor, not taken from the worker; each record lists its artifacts' id and sha256 in records.artifacts_json; artifacts do not expire, and no column records an expiry (L6 council C9, R10) |
| jobs | id, type, input_json, idem_key unique, state, pid, result_json, error_json, created_at, started_at, heartbeat_at, finished_at | in their own store, `data/jobs.db`, not this one (L6 T1); states per `docs/roadmap/MECAGENT_ROADMAP.md#Define job states:` (L6 council R10) |
| job_events | id, job_id, state, at, data_json | every state change of a job, written in one transaction with it (L6 council D18) |
| chats | id, title, auto_accept (default off), created_at, archived_at | history panel (P23); auto_accept is the approval setting |
| workflows | id, name, version, params_schema_json, operations_json, created_at | automations; operation sequences only (P16; I6) |
| knowledge_docs, knowledge_chunks | id, path, sha256 / id, doc_id, text, embedding | L7 T5; chunks are data, never instructions (P19) |

## Rules

- WAL mode; one writer (the server); workers write only their job's heartbeat and records through the server's protocol, never the file directly.
- Migrations are numbered SQL files, applied at start, tested on an empty and a previous-version database.
- No secret is stored (I10). No user file content enters the database; only paths and hashes.

## Errors

A failed write ends the operation with `storage_error` and the request fails; the error goes to requests.error_json if that write works, and to the server log in any case. The executor then answers every later proposal `storage_error` until the server restarts with working storage, and the server never reports success for an unpersisted record.

## Tests

- Migration up from empty and from the prior version.
- Restart: a RUNNING job without a heartbeat becomes FAILED, and nothing is resumed (L6 T1, council D12); an operation left running or inspecting is restored and recorded (L3 T4).
- Replay: events for a request replay in seq order after reconnect.
- Duplicate idempotency key returns the same job.
