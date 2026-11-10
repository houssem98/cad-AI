# Execution and Verification

L2 T2, written 2026-11-10. The controlled execution layer: schema validation, approval policy, timeouts and records. Rules: `docs/LOOP_CONVENTIONS.md#I3 No kernel evidence, no geometry claim.` and `docs/LOOP_CONVENTIONS.md#I6 Typed operations only.` Research: rows 1, 4, 9 and 14 of `docs/cad-agent/research/PRODUCT_FEATURE_MATRIX.md`.

## Responsibility

The executor is the only caller of adapters. It decides whether an operation may run, runs it with limits, inspects the result and writes one record per operation.

## Execution lifecycle (per operation)

```
pending → validated → [awaiting_approval] → running → inspecting → succeeded
   │          │                │               │            │
   │          └→ unsupported   └→ cancelled    └────────────┴→ failed (kernel_error, timeout, verification_failed)
   │             (manifest)       (approval_denied)              or cancelled (user); then Restore
   └→ failed (validation_failed, precondition_failed)
```

Every status in the diagram is a value of the schema's status enum.

1. **Validate.** The server assigns the operation id and writes the proposal to the operations table as pending, then runs the proposal check, the JSON Schema, units to mm, then preconditions against the current document revision. Nothing reaches the adapter before this passes; a refusal ends failed with a record.
2. **Capability.** Manifest check; unsupported ends here, with a record.
3. **Approval.** A consequential type needs an approval event unless the chat's auto-accept setting is on (row 14; P20). Consequential means it changes or removes something that existed before this request: modify_dimension today, and any delete, overwrite or close type when one is added. Auto-accept never covers delete, overwrite or close. The other types only add geometry, which Restore removes; export always writes a new artifact and never overwrites a file; import opens a new document. A denial ends cancelled with `approval_denied`. The record stores the decision: approved, denied or auto.
4. **Run.** Preconditions and the document revision are checked again just before the call, because the approval wait can be long. One deadline covers run, inspect and verify together: 30 s by default, 120 s for import and export. Cancel or a passed deadline kills the worker, which restarts (P21).
5. **Inspect.** Adapter inspect after every operation, inside the same deadline; the record stores valid solid, volume, bounding box and counts.
6. **Verify.** Compare with expected values when the plan states them (dimensions, hole counts); a mismatch fails the operation.
7. **Restore.** After any end but succeeded from running or inspecting, the document is reopened from its checkpoint (the native file saved after the last succeeded operation) and inspected again, so revision and geometry match the checkpoint. A failed restore marks the document unknown, and nothing runs on it until the user reopens it. The kernel worker also loads the checkpoint after every restart; the SolidWorks adapter reopens its last saved file (tested in L9).
8. **Record.** The operations row moves to running before the adapter call (write-ahead). When the operation ends, the record is appended with revision before and after and the Restore inspection, then the event is emitted. If that write fails, the operation ends `storage_error`, the request ends failed, and the executor accepts no further operation until a write succeeds. On server start, an operation left in running or inspecting is restored and recorded as `worker_crashed`.

## Execution record

Fields from `docs/roadmap/MECAGENT_ROADMAP.md#Every CAD operation must produce an execution record containing:`, as stored (`docs/cad-agent/architecture/DATABASE_DESIGN.md`):

| Field | Content |
|---|---|
| requested operation | the validated envelope |
| target document | document id and revision before and after |
| actual CAD command | the adapter call and its normalised parameters in mm |
| execution result | status, timings, engine message |
| validation result | schema and precondition outcome, then inspection and verification outcome |
| error details | typed code, message, engine output (the stderr tail on `worker_crashed`) |
| artifact references | ids of exported files with their sha256 |
| approval | whether it was required, and the decision: approved, denied or auto |

Every proposal gets an operations row and a record, refused ones included (`validation_failed`, `precondition_failed`, `unsupported`, `approval_denied`). Records are append-only. The UI and the agent's final report read only records (P3).

## Verification rules

- A part exists only when inspect says valid solid (I3).
- An export counts only when its re-import matches volume within 0.01 % and the bounding box within 0.001 mm (P10).
- A viewport render is a preview, never evidence.
- A STEP rebuild counts when volume is within 0.1 % and the bounding box matches; anything else is unsupported (P11).

## Errors

The one list is in `docs/cad-agent/architecture/SYSTEM_ARCHITECTURE.md`; this layer emits every code on it except `model_error`.

## Tests (L3 T4)

Invalid parameters refused before the kernel is called; a refused proposal has a record; an operation past its deadline, in run or in inspect, ends `timeout` with a record; cancel ends `cancelled`; after either, revision and inspection equal the checkpoint; an operation left running at server start is restored and recorded; every operation of the L3 T5 milestone has a record; no code path evaluates model text.
