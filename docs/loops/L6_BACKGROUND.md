# L6 Background

Phase 6 of `docs/roadmap/MECAGENT_ROADMAP.md`, "Background CAD task engine". Needs L5. Budget in `docs/LOOP_GRAPH.md`; rules in `docs/LOOP_CONVENTIONS.md`.

Target: `docs/roadmap/MECAGENT_ROADMAP.md#Every completed task must have a verified output artifact.`

Deciding rule, fixed before T1 starts: T0 to T5 are ticked, `npm run gate` exits 0, and the human's signoff line (T6) is in the Journal.

## Tasks

- [ ] T0 Re-verify. needs: none. Run graph-lint. Evidence: graph-lint exits 0.
- [ ] T1 Job engine. needs: T0. States from `docs/roadmap/MECAGENT_ROADMAP.md#Define job states:` persisted in SQLite; workers in a separate process. Evidence: tests: a worker killed mid-job leaves the job FAILED or resumed, never stuck RUNNING; a duplicate submission with the same idempotency key runs once; cancel reaches CANCELLED and stops the worker; a reconnecting client sees the same status.
- [ ] T2 Text-to-CAD job. needs: T1. The L5 agent as a job; COMPLETED only with a verified STEP and its records. Evidence: test: a job whose artifact fails verification ends FAILED.
- [ ] T3 STEP-to-CAD. needs: T1. Import a STEP file, inspect it, rebuild prismatic parts (planar faces, cylindrical holes) as an editable feature sequence; anything else is reported UNSUPPORTED. Evidence: evals/step2cad/ with at least 10 fixtures: rebuilt volume within 0.1 % and the same bounding box; a freeform fixture returns unsupported.
- [ ] T4 Tasks dashboard. needs: T1. List, progress, cancel, download. Evidence: e2e: submit, watch progress, cancel one, download another.
- [ ] T5 Independent check. needs: T2, T3, T4. A council with the jobs and geometry items of the attack list. Evidence: the chairman's list in the Journal, each item reproduced or rejected; `npm run gate` exits 0.
- [ ] T6 (human) Signoff. needs: T5. Evidence: the signoff line in the Journal.

## Journal
