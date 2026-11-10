# CAD Adapters

L2 T2, written 2026-11-10. One contract, many CAD back ends, per `docs/roadmap/MECAGENT_ROADMAP.md#Define a common CAD adapter interface:`. Research: rows 1, 2, 3, 5 and 6 of `docs/cad-agent/research/PRODUCT_FEATURE_MATRIX.md`, and the SolidWorks API surface in `docs/cad-agent/research/SIDECAR_PROTOCOL.md` (public API names only).

## Responsibility

Run typed operations against a real CAD engine and report what that engine says. An adapter never claims an operation it cannot do.

## Interface

| Method | Operation types it serves |
|---|---|
| connect(), disconnect(), health() | session lifecycle (row 14; P22) |
| capabilities() | returns the manifest below |
| get_active_document(), get_document_metadata() | document kind: part, assembly, drawing, empty, unsupported (row 2; P5) |
| inspect_feature_tree(), inspect_geometry() | inspect: valid solid, volume, area, bounding box, face and edge counts, feature list (row 3; P6) |
| create_part(), create_sketch(), create_feature(), modify_feature() | new_part, sketch_*, extrude, cut, hole, fillet, chamfer, modify_dimension (rows 1, 3, 4; P1, P7) |
| apply_material() | assign_material (row 6; P13) |
| create_assembly(), create_drawing() | L7 operations (rows 6, 8) |
| export_document(), import_document() | export, import: STEP and native (rows 4, 5; P10, P11) |
| validate_geometry() | used by VERIFY |

Every operation method (create, modify, apply, export, import, inspect and validate_geometry) takes an operation envelope (`docs/cad-agent/architecture/API_CONTRACTS.md`) and returns `{ status, result, verification, error }`. The session methods (connect, disconnect, health, capabilities, get_active_document, get_document_metadata) take none and change nothing.

## Capability manifest

```json
{ "adapter": "kernel", "version": "1", "operations": { "extrude": "supported", "mate": "unsupported", ... },
  "documents": ["part"], "exports": ["step"] }
```

There is no units entry: the executor converts to mm before any adapter call, so adapters see mm only.

The executor checks the manifest before calling. An operation type marked unsupported or missing from the manifest, a document kind not listed, or an export format not listed returns `unsupported` without touching the engine (I12). The adapter also returns `unsupported` itself when called with an operation it lacks. A manifest may mark an entry supported only when the contract suite has a passing case for it: the L3 T1 suite fails a manifest that claims an operation, document kind or export with no passing case, and it calls each adapter directly with an operation it lacks. A type outside the schema's enum (today L7's mate) is `validation_failed` until it is added. An unsupported operation is reported, never replanned into another type.

## Adapters

| Adapter | Loop | Engine | Notes |
|---|---|---|---|
| kernel | L3 | build123d on OpenCascade in the Python worker | Native format BREP; STEP export and import; headless, so it runs in the gate |
| solidworks | L9 | our own .NET sidecar over the same wire protocol, using public SolidWorks API documentation | Needs a licence (L9 T0); finds the running session, classifies the active document, saves native files and STEP (P4) |
| test double | L3 T1 | in-memory | For the contract suite only |

Feature creation calls for SolidWorks come from the public API documentation, not the reference (`docs/cad-agent/research/TECHNICAL_UNKNOWNS.md`, U6 and U7).

## Errors

Codes from the one list in `docs/cad-agent/architecture/SYSTEM_ARCHITECTURE.md`. Adapters return `unsupported`, `kernel_error` (engine message kept verbatim in the record) and `precondition_failed` (wrong document kind, missing feature, unknown identifier, document changed since planning); `timeout` and `cancelled` are set by the executor, which kills the worker.

## Tests

- Contract suite (L3 T1): same cases against every adapter; every supported manifest entry has a passing case; an operation the adapter lacks returns `unsupported`.
- Geometry (L3 T2): the 120 × 80 × 10 mm plate with four Ø6 holes matches its analytic volume within 0.01 %.
- Round trip (L3 T3): STEP export then import keeps volume within 0.01 % and the bounding box; a corrupted STEP is refused with an error record.
