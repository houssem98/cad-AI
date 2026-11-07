# L3 Kernel

Phase 4 of `docs/roadmap/MECAGENT_ROADMAP.md`, "Real CAD adapter", on the kernel L2 T1 chose. Needs L2. Budget in `docs/LOOP_GRAPH.md`; rules in `docs/LOOP_CONVENTIONS.md`.

Target: `docs/roadmap/MECAGENT_ROADMAP.md#Execute a basic modeling operation.`

Deciding rule, fixed before T1 starts: T0 to T6 are ticked, `npm run gate` exits 0 with every geometry test inside it, and the human's signoff line (T7) is in the Journal.

## Tasks

- [ ] T0 Re-verify. needs: none. Run graph-lint and refresh citations L2 changed. Evidence: graph-lint exits 0.
- [ ] T1 Adapter contract. needs: T0. The interface in `docs/roadmap/MECAGENT_ROADMAP.md#Define a common CAD adapter interface:` plus a capability manifest; an operation an adapter lacks returns a typed unsupported result. One contract suite parameterized over adapters. Evidence: the suite passes against a test double, and fails against a double that claims an operation it lacks.
- [ ] T2 Geometry operations. needs: T1. New part; sketch (rectangle, circle, polyline); extrude, cut, hole, fillet, chamfer; modify a dimension; assign material; inspect (valid, volume, area, bounding box, face and edge counts, feature list). Evidence: tests: a 120 × 80 × 10 mm plate with four Ø6 through holes is a valid solid whose volume equals the analytic value within 0.01 %, bounding box within 0.001 mm, four cylindrical faces; changing thickness to 12 rebuilds to the new analytic volume.
- [ ] T3 Export round trip. needs: T2. STEP and native export, re-import and compare. Evidence: tests: export then re-import keeps volume within 0.01 % and the bounding box; a corrupted STEP is refused with an error record.
- [ ] T4 Executor and records. needs: T1. Schema validation before any kernel call; per-operation timeout and cancellation; one persisted execution record per operation with every field of `docs/roadmap/MECAGENT_ROADMAP.md#Every CAD operation must produce an execution record containing:`. No path runs model-written code (I6). Evidence: tests: invalid parameters refused before the kernel is called; an operation past its timeout is cancelled and recorded; a failed operation is recorded with its error; an operation type `script` is refused.
- [ ] T5 Headless milestone. needs: T2, T3, T4. A fixed operation sequence, no model: enclosure 120 × 80 × 40 mm, 2 mm shell, four M3 bosses, separate lid. Evidence: test: both parts valid, volumes equal the analytic values within 0.05 %, STEP round trip holds, every operation has a record.
- [ ] T6 Independent check. needs: T5. A council with the geometry, operations, records and adapters items of the attack list. Evidence: the chairman's list in the Journal, each item reproduced or rejected; `npm run gate` exits 0.
- [ ] T7 (human) Signoff. needs: T6. The human opens the T5 STEP files in any viewer. Evidence: the signoff line in the Journal.

## Journal
