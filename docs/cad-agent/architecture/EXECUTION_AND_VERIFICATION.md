# Execution and Verification

L2 T2, written 2026-11-10. The controlled execution layer: schema validation, approval policy, timeouts and records. Rules: `docs/LOOP_CONVENTIONS.md#I3 No kernel evidence, no geometry claim.` and `docs/LOOP_CONVENTIONS.md#I6 Typed operations only.` Research: rows 1, 4, 9 and 14 of `docs/cad-agent/research/PRODUCT_FEATURE_MATRIX.md`.

## Responsibility

The executor is the only caller of adapters. It decides whether an operation may run, runs it with limits, inspects the result and writes one record per operation.

## Execution lifecycle (per operation)

```
received → validated → [awaiting_approval] → running → inspecting → succeeded
    │          │               │                │            └──────→ failed (verification)
    └→ failed  └→ unsupported  └→ cancelled     ├→ failed (kernel_error)
       (schema)   (manifest)      (denied)      ├→ failed (timeout)
                                                └→ cancelled
```

1. **Validate.** JSON Schema, then units to mm, then preconditions against the current document revision. Nothing reaches the adapter before this passes.
2. **Capability.** Manifest check; unsupported ends here.
3. **Approval.** Consequential types (delete feature, overwrite file, close without save) need an approval event unless auto-accept is on (row 14; P20).
4. **Run.** Per-operation timeout, 30 s default, set per type; cancel kills the worker call and the worker restarts (P21).
5. **Inspect.** Adapter inspect after every operation; the record stores valid solid, volume, bounding box and counts.
6. **Verify.** Compare with expected values when the plan states them (dimensions, hole counts); a mismatch fails the operation.
7. **Record.** Persist the record, then emit the event.

## Execution record

Fields from `docs/roadmap/MECAGENT_ROADMAP.md#Every CAD operation must produce an execution record containing:`, as stored (`docs/cad-agent/architecture/DATABASE_DESIGN.md`):

| Field | Content |
|---|---|
| requested operation | the validated envelope |
| target document | document id and revision before and after |
| actual CAD command | the adapter call and its normalised parameters in mm |
| execution result | status, timings, engine message |
| validation result | schema and precondition outcome, then inspection and verification outcome |
| error details | typed code, message, engine output |
| artifact references | ids of exported files with their sha256 |

Records are append-only. The UI and the agent's final report read only records (P3).

## Verification rules

- A part exists only when inspect says valid solid (I3).
- An export counts only when its re-import matches volume within 0.01 % and the bounding box within 0.001 mm (P10).
- A viewport render is a preview, never evidence.
- A STEP rebuild counts when volume is within 0.1 % and the bounding box matches; anything else is unsupported (P11).

## Errors

`validation_failed`, `unsupported`, `approval_denied`, `timeout`, `cancelled`, `kernel_error`, `verification_failed`, `worker_crashed`.

## Tests (L3 T4)

Invalid parameters refused before the kernel is called; an operation past its timeout ends `timeout` with a record; cancel ends `cancelled`; every operation of the L3 T5 milestone has a record; no code path evaluates model text.
